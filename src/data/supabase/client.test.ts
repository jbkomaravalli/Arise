import { describe, expect, it } from 'vitest';
import { resolveDataMode } from './client';

describe('Supabase data mode', () => {
  it('requires Supabase when production credentials are missing', () => {
    expect(resolveDataMode(false, false, false)).toBe('unconfigured');
  });

  it('allows local mode only when explicitly enabled in development', () => {
    expect(resolveDataMode(false, true, true)).toBe('local');
    expect(resolveDataMode(false, true, false)).toBe('unconfigured');
  });

  it('never enables local mode in production', () => {
    expect(resolveDataMode(false, false, true)).toBe('unconfigured');
  });

  it('uses Supabase when configured', () => {
    expect(resolveDataMode(true, false, false)).toBe('supabase');
  });
});