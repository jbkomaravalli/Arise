import type { AuthSession, AuthService, SignUpResult } from '../auth';
import { getSupabase } from './client';

export function authErrorMessage(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) {
    return 'Email or password is incorrect.';
  }
  if (
    normalized.includes('already registered') ||
    normalized.includes('already exists') ||
    normalized.includes('user exists')
  ) {
    return 'An account with this email already exists. Try signing in or resetting your password.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Confirm your email before signing in. Check your inbox for the verification link.';
  }
  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('network request failed') ||
    normalized.includes('fetch failed')
  ) {
    return 'Could not reach Supabase. Check your internet connection and try again.';
  }
  return message;
}

function authError(message: string): Error {
  return new Error(authErrorMessage(message));
}

async function withAuthErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw authError(error instanceof Error ? error.message : 'Network request failed');
  }
}

function toSession(raw: { user?: { id?: string; email?: string } } | null): AuthSession | null {
  if (!raw?.user?.id) return null;
  return { user: { id: raw.user.id, email: raw.user.email ?? '' } };
}

export const supabaseAuth: AuthService = {
  mode: 'supabase',
  capabilities: { emailDelivery: true, localPasswordReset: false },

  async getSession(): Promise<AuthSession | null> {
    const { data, error } = await withAuthErrors(() => getSupabase().auth.getSession());
    if (error) throw authError(error.message);
    return toSession(data.session);
  },

  async signUp({ email, password, displayName }): Promise<SignUpResult> {
    const { data, error } = await withAuthErrors(() => getSupabase().auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName ?? null } },
    }));
    if (error) throw authError(error.message);
    return {
      session: toSession(data.session),
      needsEmailVerification: data.session === null,
      displayName: displayName ?? null,
    };
  },

  async signIn({ email, password }): Promise<AuthSession> {
    const { data, error } = await withAuthErrors(() =>
      getSupabase().auth.signInWithPassword({ email, password }),
    );
    if (error) throw authError(error.message);
    const session = toSession(data.session);
    if (!session) throw new Error('Sign-in did not return a session. Please try again.');
    return session;
  },

  async signOut(): Promise<void> {
    const { error } = await withAuthErrors(() => getSupabase().auth.signOut());
    if (error) throw authError(error.message);
  },

  async sendPasswordReset(email): Promise<{ delivered: boolean; message: string }> {
    const origin = window.location.origin;
    const { error } = await withAuthErrors(() =>
      getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      }),
    );
    if (error) throw authError(error.message);
    return {
      delivered: true,
      message: 'If an account exists for this email, a recovery link is on its way.',
    };
  },

  async updatePassword({ newPassword }): Promise<void> {
    const { error } = await withAuthErrors(() =>
      getSupabase().auth.updateUser({ password: newPassword }),
    );
    if (error) throw authError(error.message);
  },

  async changeLocalPassword(): Promise<void> {
    throw new Error('Password changes with a current password only apply in local mode.');
  },

  onAuthChange(callback: (session: AuthSession | null) => void): () => void {
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
      callback(toSession(session));
    });
    return () => data.subscription.unsubscribe();
  },
};
