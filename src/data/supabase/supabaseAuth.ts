import type { AuthSession, AuthService, SignUpResult } from '../auth';
import { getSupabase } from './client';

function toSession(raw: { user?: { id?: string; email?: string } } | null): AuthSession | null {
  if (!raw?.user?.id) return null;
  return { user: { id: raw.user.id, email: raw.user.email ?? '' } };
}

export const supabaseAuth: AuthService = {
  mode: 'supabase',
  capabilities: { emailDelivery: true, localPasswordReset: false },

  async getSession(): Promise<AuthSession | null> {
    const { data } = await getSupabase().auth.getSession();
    return toSession(data.session);
  },

  async signUp({ email, password, displayName }): Promise<SignUpResult> {
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName ?? null } },
    });
    if (error) throw new Error(error.message);
    return {
      session: toSession(data.session),
      needsEmailVerification: data.session === null,
      displayName: displayName ?? null,
    };
  },

  async signIn({ email, password }): Promise<AuthSession> {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const session = toSession(data.session);
    if (!session) throw new Error('Sign-in did not return a session. Please try again.');
    return session;
  },

  async signOut(): Promise<void> {
    await getSupabase().auth.signOut();
  },

  async sendPasswordReset(email): Promise<{ delivered: boolean; message: string }> {
    const origin = window.location.origin;
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
    return {
      delivered: true,
      message: 'If an account exists for this email, a recovery link is on its way.',
    };
  },

  async updatePassword({ newPassword }): Promise<void> {
    const { error } = await getSupabase().auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
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
