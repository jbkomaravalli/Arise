import type { AuthService } from './auth';
import { localAuth } from './local/localAuth';
import { LocalRepository } from './local/localRepository';
import { dataMode } from './supabase/client';
import { supabaseAuth } from './supabase/supabaseAuth';
import { SupabaseRepository } from './supabase/supabaseRepository';
import type { Repository } from './repository';

export * from './repository';
export type { AuthService, AuthServiceCaps, AuthSession, AuthUser, SignUpResult } from './auth';

/**
 * Data-layer factory.
 *
 * Production requires Supabase. Local storage is available only when explicitly
 * enabled in a development build with VITE_ENABLE_LOCAL_MODE=true.
 */
export { dataMode };

export const authService: AuthService = dataMode === 'local' ? localAuth : supabaseAuth;

export function createRepository(userId: string, email: string): Repository {
  return dataMode === 'local'
    ? new LocalRepository(userId, email)
    : new SupabaseRepository(userId, email);
}
