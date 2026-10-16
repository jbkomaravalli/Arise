export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSession {
  user: AuthUser;
}

export interface SignUpResult {
  session: AuthSession | null;
  /** True when the backend requires email confirmation before sign-in. */
  needsEmailVerification: boolean;
  displayName?: string | null;
}

export interface AuthServiceCaps {
  /** True only when a real email provider is configured (Supabase). */
  emailDelivery: boolean;
  /** True in local mode: password change with current password, no email. */
  localPasswordReset: boolean;
}

export interface AuthService {
  readonly mode: 'local' | 'supabase';
  readonly capabilities: AuthServiceCaps;

  getSession(): Promise<AuthSession | null>;
  signUp(input: {
    email: string;
    password: string;
    displayName?: string;
  }): Promise<SignUpResult>;
  signIn(input: { email: string; password: string }): Promise<AuthSession>;
  signOut(): Promise<void>;

  /** Sends a recovery email when the backend supports it. */
  sendPasswordReset(email: string): Promise<{ delivered: boolean; message: string }>;

  /** Supabase: set a new password from an active (recovery) session. */
  updatePassword(input: { newPassword: string }): Promise<void>;

  /** Local mode only: change password with the current password. */
  changeLocalPassword(input: {
    email: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<void>;

  onAuthChange(callback: (session: AuthSession | null) => void): () => void;
}
