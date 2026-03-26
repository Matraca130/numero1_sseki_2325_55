// ============================================================
// Axon — Shared Supabase Mock
//
// Mock for @/app/lib/supabase that replaces the real Supabase
// client with vi.fn() stubs for auth methods.
//
// Usage in test files:
//   vi.mock('@/app/lib/supabase', () => supabaseMock);
//
// Or selectively override:
//   vi.mock('@/app/lib/supabase', () => ({
//     ...supabaseMock,
//     supabase: createMockSupabaseClient({ sessionToken: 'custom-jwt' }),
//   }));
// ============================================================

interface MockSupabaseOptions {
  /** Token returned by getSession. Null means no active session. */
  sessionToken?: string | null;
}

/**
 * Create a mock Supabase client with configurable auth behavior.
 * All auth methods are vi.fn() stubs with sensible defaults.
 */
export function createMockSupabaseClient(options: MockSupabaseOptions = {}) {
  const { sessionToken = null } = options;

  const mockSession = sessionToken
    ? { access_token: sessionToken, user: { id: 'mock-user-id', email: 'test@axon.edu' } }
    : null;

  const unsubscribe = vi.fn();

  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: mockSession },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: {
          session: { access_token: sessionToken ?? 'new-session-token' },
          user: { id: 'mock-user-id', email: 'test@axon.edu' },
        },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: {
          session: { access_token: sessionToken ?? 'new-session-token' },
          user: { id: 'mock-user-id', email: 'test@axon.edu' },
        },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe } },
      }),
    },
  };
}

/**
 * Ready-to-use mock module for vi.mock('@/app/lib/supabase').
 * Includes SUPABASE_URL, SUPABASE_ANON_KEY, and a default supabase client.
 */
export const supabaseMock = {
  SUPABASE_URL: 'https://mock.supabase.co',
  SUPABASE_ANON_KEY: 'mock-anon-key',
  supabase: createMockSupabaseClient(),
};
