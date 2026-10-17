import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const localModeRequested = import.meta.env.VITE_ENABLE_LOCAL_MODE === 'true';

function isUsableUrl(value?: string): value is string {
  if (!value || /your-|replace|placeholder|example/i.test(value)) return false;
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === 'https:' ||
        (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

function isPublicKey(value?: string): value is string {
  if (!value || /your-|replace|placeholder|example|sb_secret_/i.test(value)) {
    return false;
  }
  if (value.startsWith('sb_publishable_')) return value.length >= 24;

  const parts = value.split('.');
  if (parts.length === 3) {
    try {
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = JSON.parse(atob(payload));
      return decoded.role === 'anon';
    } catch {
      return false;
    }
  }
  return false;
}

export function resolveDataMode(
  configured: boolean,
  isDevelopment: boolean,
  localModeEnabled: boolean,
): 'supabase' | 'local' | 'unconfigured' {
  if (isDevelopment && localModeEnabled) return 'local';
  if (configured) return 'supabase';
  return 'unconfigured';
}

export function getSupabaseConfigurationError(): string | null {
  if (!isUsableUrl(url) || !isPublicKey(anonKey)) {
    return 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to valid public project credentials, then rebuild and redeploy.';
  }
  return null;
}

/**
 * Supabase is enabled only when both a URL and an anon/publishable key are
 * configured. Those are the only credentials that may reach the browser; all
 * privileged operations happen in PostgreSQL behind Row Level Security.
 */
export const isSupabaseConfigured = isUsableUrl(url) && isPublicKey(anonKey);
export const dataMode = resolveDataMode(
  isSupabaseConfigured,
  import.meta.env.DEV || import.meta.env.MODE === 'test',
  localModeRequested || import.meta.env.MODE === 'test',
);

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  const configurationError = getSupabaseConfigurationError();
  if (configurationError) throw new Error(configurationError);
  if (!cached) {
    cached = createClient(url!.trim(), anonKey!.trim(), {
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
