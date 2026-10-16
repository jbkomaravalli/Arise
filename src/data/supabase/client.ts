import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function looksReal(value?: string): value is string {
  return (
    typeof value === 'string' &&
    value.length > 12 &&
    !value.includes('your-') &&
    !value.includes('replace')
  );
}

/**
 * Supabase is enabled only when both a URL and an anon/publishable key are
 * configured. Those are the only credentials that may reach the browser; all
 * privileged operations happen in PostgreSQL behind Row Level Security.
 */
export const isSupabaseConfigured = looksReal(url) && looksReal(anonKey);

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  if (!cached) {
    cached = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return cached;
}

export const SUPABASE_URL = url;
