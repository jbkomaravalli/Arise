import type { AuthSession, AuthService, SignUpResult } from '../auth';
import { KEYS, readJson, removeKey, writeJson } from './storage';

/**
 * Local-mode authentication.
 *
 * Passwords are never stored in plaintext: they are salted and hashed with
 * PBKDF2-SHA256 (WebCrypto). This exists only for credential-less local
 * development — production authentication is Supabase Auth, which handles
 * verification emails, recovery links and secure storage server-side.
 */

interface StoredUser {
  id: string;
  email: string;
  salt: string;
  hash: string;
  iterations: number;
  createdAt: string;
}

type UserStore = Record<string, StoredUser>;

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

const ITERATIONS = 120_000;

async function subtleHash(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return toHex(new Uint8Array(bits));
}

/** Fallback for environments without WebCrypto (jsdom) — local mode only. */
function fallbackHash(password: string, salt: string, iterations: number): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const seed = `${salt}|${password}|${iterations}`;
  for (let round = 0; round < Math.min(iterations, 5000); round += 1) {
    for (let i = 0; i < seed.length; i += 1) {
      h1 ^= seed.charCodeAt(i) + round;
      h1 = Math.imul(h1, 16777619) >>> 0;
      h2 = (Math.imul(h2 ^ h1, 2246822519) + i) >>> 0;
    }
  }
  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

async function hashPassword(password: string, saltHex?: string, iterations = ITERATIONS) {
  const salt = saltHex ? fromHex(saltHex) : randomBytes(16);
  const saltOut = saltHex ?? toHex(salt);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const hash = await subtleHash(password, salt, iterations);
      return { salt: saltOut, hash, iterations };
    } catch {
      /* fall through */
    }
  }
  return { salt: saltOut, hash: fallbackHash(password, saltOut, iterations), iterations };
}

async function verifyPassword(password: string, user: StoredUser): Promise<boolean> {
  const derived = await hashPassword(password, user.salt, user.iterations);
  return derived.hash === user.hash;
}

function newUserId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export const localAuth: AuthService = {
  mode: 'local',
  capabilities: { emailDelivery: false, localPasswordReset: true },

  async getSession(): Promise<AuthSession | null> {
    const session = readJson<{ userId: string; email: string; expiresAt: number } | null>(
      KEYS.session,
      null,
    );
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      removeKey(KEYS.session);
      return null;
    }
    return { user: { id: session.userId, email: session.email } };
  },

  async signUp({ email, password, displayName }): Promise<SignUpResult> {
    const key = normalize(email);
    const users = readJson<UserStore>(KEYS.users, {});
    if (users[key]) {
      throw new Error('An account with this email already exists. Try signing in instead.');
    }
    const { salt, hash, iterations } = await hashPassword(password);
    const user: StoredUser = {
      id: newUserId(),
      email: key,
      salt,
      hash,
      iterations,
      createdAt: new Date().toISOString(),
    };
    users[key] = user;
    writeJson(KEYS.users, users);
    writeJson(KEYS.session, {
      userId: user.id,
      email: user.email,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    return {
      session: { user: { id: user.id, email: user.email } },
      needsEmailVerification: false,
      displayName: displayName ?? null,
    };
  },

  async signIn({ email, password }): Promise<AuthSession> {
    const key = normalize(email);
    const users = readJson<UserStore>(KEYS.users, {});
    const user = users[key];
    if (!user) throw new Error('No account found for this email.');
    const ok = await verifyPassword(password, user);
    if (!ok) throw new Error('Incorrect password.');
    writeJson(KEYS.session, {
      userId: user.id,
      email: user.email,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    return { user: { id: user.id, email: user.email } };
  },

  async signOut(): Promise<void> {
    removeKey(KEYS.session);
  },

  async sendPasswordReset(): Promise<{ delivered: boolean; message: string }> {
    return {
      delivered: false,
      message:
        'Email delivery needs Supabase configuration. In local mode you can reset your password on this page using your current password.',
    };
  },

  async changeLocalPassword({ email, currentPassword, newPassword }): Promise<void> {
    const key = normalize(email);
    const users = readJson<UserStore>(KEYS.users, {});
    const user = users[key];
    if (!user) throw new Error('No account found for this email.');
    const ok = await verifyPassword(currentPassword, user);
    if (!ok) throw new Error('Current password is incorrect.');
    const next = await hashPassword(newPassword);
    users[key] = { ...user, ...next };
    writeJson(KEYS.users, users);
  },

  async updatePassword({ newPassword }): Promise<void> {
    const session = readJson<{ userId: string; email: string } | null>(KEYS.session, null);
    if (!session) throw new Error('Your recovery session has expired. Request a new link.');
    const users = readJson<UserStore>(KEYS.users, {});
    const user = Object.values(users).find((u) => u.id === session.userId);
    if (!user) throw new Error('Account not found.');
    const next = await hashPassword(newPassword);
    users[user.email] = { ...user, ...next };
    writeJson(KEYS.users, users);
  },

  onAuthChange(callback: (session: AuthSession | null) => void): () => void {
    const handler = (event: StorageEvent) => {
      if (event.key === KEYS.session) {
        void localAuth.getSession().then(callback);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  },
};
