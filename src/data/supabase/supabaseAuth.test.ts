import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './supabaseAuth';

describe('Supabase auth errors', () => {
  it('explains invalid credentials without exposing backend details', () => {
    expect(authErrorMessage('Invalid login credentials')).toBe('Email or password is incorrect.');
  });

  it('explains duplicate registrations', () => {
    expect(authErrorMessage('User already registered')).toMatch(/already exists/i);
  });

  it('explains pending email confirmation', () => {
    expect(authErrorMessage('Email not confirmed')).toMatch(/confirm your email/i);
  });

  it('explains network failures', () => {
    expect(authErrorMessage('Failed to fetch')).toMatch(/could not reach Supabase/i);
  });
});