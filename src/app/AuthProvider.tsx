import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authService, type AuthSession, type AuthServiceCaps } from '@/data';
import { dataMode } from '@/data';

interface AuthContextValue {
  status: 'loading' | 'signedOut' | 'signedIn' | 'unverified';
  session: AuthSession | null;
  /** Set while waiting for email verification (Supabase mode only). */
  pendingVerificationEmail: string | null;
  mode: typeof dataMode;
  capabilities: AuthServiceCaps;
  signIn(input: { email: string; password: string }): Promise<void>;
  signUp(input: { email: string; password: string; displayName?: string }): Promise<void>;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<{ delivered: boolean; message: string }>;
  updatePassword(newPassword: string): Promise<void>;
  changeLocalPassword(input: {
    email: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [pendingVerificationEmail, setPending] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void authService
      .getSession()
      .then((s) => {
        if (!active) return;
        setSession(s);
        setStatus(s ? 'signedIn' : 'signedOut');
      })
      .catch(() => {
        if (active) setStatus('signedOut');
      });

    const unsubscribe = authService.onAuthChange((s) => {
      setSession(s);
      setStatus(s ? 'signedIn' : 'signedOut');
      if (s) setPending(null);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback<AuthContextValue['signIn']>(async ({ email, password }) => {
    const s = await authService.signIn({ email, password });
    setSession(s);
    setStatus('signedIn');
  }, []);

  const signUp = useCallback<AuthContextValue['signUp']>(async ({ email, password, displayName }) => {
    const result = await authService.signUp({ email, password, displayName });
    if (result.session) {
      setSession(result.session);
      setStatus('signedIn');
    } else {
      setPending(email);
      setStatus('unverified');
    }
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setSession(null);
    setStatus('signedOut');
    setPending(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      pendingVerificationEmail,
      mode: dataMode,
      capabilities: authService.capabilities,
      signIn,
      signUp,
      signOut,
      sendPasswordReset: (email) => authService.sendPasswordReset(email),
      updatePassword: (newPassword) => authService.updatePassword({ newPassword }),
      changeLocalPassword: (input) => authService.changeLocalPassword(input),
    }),
    [status, session, pendingVerificationEmail, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
