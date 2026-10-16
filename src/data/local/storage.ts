/**
 * Local-mode persistence: localStorage with defensive fallbacks.
 *
 * Local mode exists so ARISE is fully usable and testable without cloud
 * credentials. Production deployments use the Supabase repository instead —
 * see `docs/SETUP.md`.
 */

const memory = new Map<string, string>();
let storageAvailable: boolean | null = null;

/** Clears the in-memory fallback (used by tests that reset localStorage). */
export function resetStorageMemory(): void {
  memory.clear();
}

function backing(): Storage | null {
  if (storageAvailable !== null) return storageAvailable ? window.localStorage : null;
  try {
    const probe = '__arise_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  return storageAvailable ? window.localStorage : null;
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = backing()?.getItem(key) ?? memory.get(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  try {
    backing()?.setItem(key, raw);
  } catch {
    // Quota or privacy mode — the in-memory copy still serves this session.
  }
}

export function removeKey(key: string): void {
  memory.delete(key);
  try {
    backing()?.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function storageKeys(): string[] {
  const keys = new Set<string>(memory.keys());
  const store = backing();
  if (store) {
    for (let i = 0; i < store.length; i += 1) {
      const k = store.key(i);
      if (k) keys.add(k);
    }
  }
  return [...keys];
}

export const KEYS = {
  users: 'arise:users',
  session: 'arise:session',
  data: (userId: string) => `arise:data:${userId}`,
} as const;
