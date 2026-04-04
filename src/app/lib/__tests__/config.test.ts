// ============================================================
// Tests for config.ts — Environment configuration
//
// Verifies:
//   - Supabase URL constant
//   - Anonymous key constant
//   - API base URL
//   - Environment detection
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  supabaseUrl,
  supabaseAnonKey,
  apiBaseUrl,
  environment,
} from '@/app/lib/config';

describe('config constants', () => {
  it('exports supabaseUrl as a string', () => {
    expect(typeof supabaseUrl).toBe('string');
    expect(supabaseUrl).toMatch(/^https:\/\//);
  });

  it('exports supabaseAnonKey as a JWT-like string', () => {
    expect(typeof supabaseAnonKey).toBe('string');
    // JWT tokens have 3 parts separated by dots
    expect(supabaseAnonKey.split('.').length).toBe(3);
  });

  it('exports apiBaseUrl pointing to supabase functions endpoint', () => {
    expect(typeof apiBaseUrl).toBe('string');
    expect(apiBaseUrl).toContain(supabaseUrl.replace('https://', ''));
    expect(apiBaseUrl).toContain('/functions/v1/');
  });

  it('exports environment as a string', () => {
    expect(typeof environment).toBe('string');
    expect(['development', 'production', 'staging']).toContain(environment);
  });

  it('supabaseUrl and apiBaseUrl are consistent', () => {
    // apiBaseUrl should be based on supabaseUrl
    expect(apiBaseUrl).toContain(supabaseUrl.replace(/\/$/, ''));
  });

  it('constants are non-empty strings', () => {
    expect(supabaseUrl.length).toBeGreaterThan(0);
    expect(supabaseAnonKey.length).toBeGreaterThan(0);
    expect(apiBaseUrl.length).toBeGreaterThan(0);
    expect(environment.length).toBeGreaterThan(0);
  });
});
