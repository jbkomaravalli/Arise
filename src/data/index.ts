import type { AuthService } from './auth';
import { localAuth } from './local/localAuth';
import { LocalRepository } from './local/localRepository';
import { isSupabaseConfigured } from './supabase/client';
import { supabaseAuth } from './supabase/supabaseAuth';
import { SupabaseRepository } from './supabase/supabaseRepository';
import type { Repository } from './repository';

export * from './repository';
export type { AuthService, AuthServiceCaps, AuthSession, AuthUser, SignUpResult } from './auth';

/**
 * Data-layer factory.
 *
 * With Supabase configured, ARISE uses PostgreSQL + RLS + authoritative RPCs.
 * Without it, ARISE runs in "Local mode": accounts and records live in this
 * browser (localStorage) and the shared TypeScript progression engine runs
 * client-side. The UI always shows which mode is active.
 */
export const dataMode: 'supabase' | 'local' = isSupabaseConfigured ? 'supabase' : 'local';

export const authService: AuthService = isSupabaseConfigured ? supabaseAuth : localAuth;

export function createRepository(userId: string, email: string): Repository {
  return isSupabaseConfigured
    ? new SupabaseRepository(userId, email)
    : new LocalRepository(userId, email);
}
