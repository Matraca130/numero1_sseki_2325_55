// ============================================================
// Axon -- Tests for AuthContext (AuthProvider + useAuth hook)
//
// Covers:
//   1. useAuth() outside AuthProvider throws
//   2. Initial state: loading=true on mount
//   3. Session restore with 1 institution -> auto-select
//   4. Session restore with N institutions -> selectedInstitution=null, localStorage restore
//   5. Session restore failure (no session) -> status='unauthenticated'
//   6. login() success: signInWithPassword + loadSession
//   7. login() failure: supabase error propagates
//   8. signup() success: POST /signup + auto-login
//   9. logout(): clears all state and localStorage
//  10. selectInstitution(): updates state + persists to localStorage
// ============================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

// -- Test data fixtures -------------------------------------------------

const MOCK_TOKEN = 'test-jwt-token-abc123';

const MOCK_PROFILE = {
  id: 'user-001',
  email: 'maria@axon.edu',
  full_name: 'Maria Garcia',
  avatar_url: null,
  is_super_admin: false,
  platform_role: 'user',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-06-01T00:00:00Z',
};

const MOCK_INSTITUTION_A = {
  id: 'inst-001',
  name: 'Universidad Axon',
  slug: 'univ-axon',
  logo_url: null,
  membership_id: 'mem-001',
  role: 'professor',
  is_active: true,
  settings: {},
  plan_id: null,
  created_at: '2025-01-01T00:00:00Z',
};

const MOCK_INSTITUTION_B = {
  id: 'inst-002',
  name: 'Colegio Beta',
  slug: 'col-beta',
  logo_url: null,
  membership_id: 'mem-002',
  role: 'student',
  is_active: true,
  settings: {},
  plan_id: null,
  created_at: '2025-02-01T00:00:00Z',
};

// -- Mock supabase ------------------------------------------------------

const mockGetSession = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock('@/app/lib/supabase', () => ({
  SUPABASE_URL: 'https://mock.supabase.co',
  SUPABASE_ANON_KEY: 'mock-anon-key',
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}));

// -- Mock api -----------------------------------------------------------

const mockApiCall = vi.fn();
const mockSetAccessToken = vi.fn();
const mockGetAccessToken = vi.fn();

vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
  setAccessToken: (...args: unknown[]) => mockSetAccessToken(...args),
  getAccessToken: (...args: unknown[]) => mockGetAccessToken(...args),
  API_BASE: 'https://mock.supabase.co/functions/v1/server',
  ANON_KEY: 'mock-anon-key',
}));

// -- Import AFTER mocks ------------------------------------------------

import { AuthProvider, useAuth } from '../AuthContext';

// -- Helpers ------------------------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

/** Set up default supabase mock behaviors */
function setupDefaultSupabaseMocks() {
  mockGetSession.mockResolvedValue({
    data: { session: null },
    error: null,
  });

  mockSignInWithPassword.mockResolvedValue({
    data: {
      session: { access_token: MOCK_TOKEN },
      user: { id: MOCK_PROFILE.id, email: MOCK_PROFILE.email },
    },
    error: null,
  });

  mockSignOut.mockResolvedValue({ error: null });

  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: mockUnsubscribe } },
  });
}

/** Set up apiCall to respond to /me and /institutions */
function setupApiRoutes(
  profile: typeof MOCK_PROFILE | null = MOCK_PROFILE,
  institutions: Array<typeof MOCK_INSTITUTION_A> = [MOCK_INSTITUTION_A],
) {
  mockApiCall.mockImplementation((path: string) => {
    if (path === '/me') {
      if (!profile) return Promise.reject(new Error('Profile not found'));
      return Promise.resolve(profile);
    }
    if (path === '/institutions') {
      return Promise.resolve(institutions);
    }
    return Promise.resolve(undefined);
  });
}

// -- Global fetch mock for signup tests ---------------------------------

const originalFetch = globalThis.fetch;

// -- Test suite ---------------------------------------------------------

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setupDefaultSupabaseMocks();
    setupApiRoutes();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ── Test 1: useAuth outside AuthProvider ──────────────────

  it('useAuth() outside AuthProvider throws an error', () => {
    // Suppress React error boundary console output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });

  // ── Test 2: Initial loading state ─────────────────────────

  it('starts with loading=true on mount', () => {
    // getSession never resolves to keep loading state
    mockGetSession.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.status).toBe('loading');
    expect(result.current.user).toBeNull();
  });

  // ── Test 3: Session restore with 1 institution -> auto-select ──

  it('auto-selects institution when session restores with exactly 1 institution', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: MOCK_TOKEN } },
      error: null,
    });

    setupApiRoutes(MOCK_PROFILE, [MOCK_INSTITUTION_A]);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toBe('authenticated');
    expect(result.current.user).not.toBeNull();
    expect(result.current.user?.email).toBe('maria@axon.edu');
    expect(result.current.institutions).toHaveLength(1);
    expect(result.current.selectedInstitution).not.toBeNull();
    expect(result.current.selectedInstitution?.id).toBe('inst-001');
    expect(result.current.role).toBe('professor');

    // Verify localStorage persistence
    const stored = localStorage.getItem('axon_active_membership');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored as string);
    expect(parsed.id).toBe('mem-001');
  });

  // ── Test 4: Session restore with N institutions ────────────

  it('does not auto-select when multiple institutions exist, attempts localStorage restore', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: MOCK_TOKEN } },
      error: null,
    });

    setupApiRoutes(MOCK_PROFILE, [MOCK_INSTITUTION_A, MOCK_INSTITUTION_B]);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toBe('authenticated');
    expect(result.current.institutions).toHaveLength(2);
    // No auto-select, and no localStorage match -> null
    expect(result.current.selectedInstitution).toBeNull();
    expect(result.current.role).toBeNull();
  });

  it('restores selectedInstitution from localStorage when multiple institutions exist', async () => {
    // Pre-store a membership in localStorage
    localStorage.setItem(
      'axon_active_membership',
      JSON.stringify({ id: 'mem-002', institution_id: 'inst-002', role: 'student' }),
    );

    mockGetSession.mockResolvedValue({
      data: { session: { access_token: MOCK_TOKEN } },
      error: null,
    });

    setupApiRoutes(MOCK_PROFILE, [MOCK_INSTITUTION_A, MOCK_INSTITUTION_B]);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.selectedInstitution).not.toBeNull();
    expect(result.current.selectedInstitution?.id).toBe('inst-002');
    expect(result.current.role).toBe('student');
  });

  // ── Test 5: Session restore failure (no session) ──────────

  it('sets status to unauthenticated when no session exists', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toBe('unauthenticated');
    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.institutions).toHaveLength(0);
    expect(result.current.selectedInstitution).toBeNull();
  });

  it('sets status to unauthenticated when getSession returns an error', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'Session expired' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toBe('unauthenticated');
    expect(result.current.user).toBeNull();
    // Stale localStorage keys should be cleaned up
    expect(localStorage.getItem('axon_active_membership')).toBeNull();
    expect(localStorage.getItem('axon_access_token')).toBeNull();
  });

  // ── Test 6: login() success ───────────────────────────────

  it('login() successfully authenticates and loads session', async () => {
    // Start without a session
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toBe('unauthenticated');

    // Now perform login
    let loginResult: { success: boolean; error?: string } | undefined;
    await act(async () => {
      loginResult = await result.current.login('maria@axon.edu', 'password123');
    });

    expect(loginResult?.success).toBe(true);
    expect(loginResult?.error).toBeUndefined();
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'maria@axon.edu',
      password: 'password123',
    });
    expect(result.current.user).not.toBeNull();
    expect(result.current.user?.email).toBe('maria@axon.edu');
    expect(result.current.selectedInstitution).not.toBeNull();
  });

  // ── Test 7: login() failure ───────────────────────────────

  it('login() propagates supabase auth error', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Suppress expected console.error from login
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let loginResult: { success: boolean; error?: string } | undefined;
    await act(async () => {
      loginResult = await result.current.login('bad@axon.edu', 'wrong');
    });

    expect(loginResult?.success).toBe(false);
    expect(loginResult?.error).toBe('Invalid login credentials');
    expect(result.current.user).toBeNull();
    expect(result.current.status).toBe('unauthenticated');

    consoleSpy.mockRestore();
  });

  it('login() returns error when no access token is received', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let loginResult: { success: boolean; error?: string } | undefined;
    await act(async () => {
      loginResult = await result.current.login('maria@axon.edu', 'password123');
    });

    expect(loginResult?.success).toBe(false);
    expect(loginResult?.error).toBe('No access token received');
  });

  // ── Test 8: signup() success ──────────────────────────────

  it('signup() posts to /signup and auto-logs in', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: { id: 'user-001' } })),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let signupResult: { success: boolean; error?: string } | undefined;
    await act(async () => {
      signupResult = await result.current.signup('maria@axon.edu', 'password123', 'Maria Garcia');
    });

    expect(signupResult?.success).toBe(true);

    // Verify fetch was called with correct payload
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const fetchCall = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall[0]).toContain('/signup');
    const body = JSON.parse(fetchCall[1].body);
    expect(body.email).toBe('maria@axon.edu');
    expect(body.full_name).toBe('Maria Garcia');

    // After signup, auto-login should have been called
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'maria@axon.edu',
      password: 'password123',
    });
  });

  it('signup() returns error when /signup endpoint fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      text: () => Promise.resolve(JSON.stringify({ error: 'Email already registered' })),
    }) as unknown as typeof fetch;

    // Suppress expected console.error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let signupResult: { success: boolean; error?: string } | undefined;
    await act(async () => {
      signupResult = await result.current.signup('maria@axon.edu', 'password123', 'Maria Garcia');
    });

    expect(signupResult?.success).toBe(false);
    expect(signupResult?.error).toBe('Email already registered');

    consoleSpy.mockRestore();
  });

  // ── Test 9: logout() clears everything ────────────────────

  it('logout() clears all state and localStorage', async () => {
    // Start with an active session
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: MOCK_TOKEN } },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify we are logged in
    expect(result.current.status).toBe('authenticated');
    expect(result.current.user).not.toBeNull();
    expect(localStorage.getItem('axon_active_membership')).not.toBeNull();

    // Perform logout
    await act(async () => {
      await result.current.logout();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.institutions).toHaveLength(0);
    expect(result.current.selectedInstitution).toBeNull();
    expect(result.current.authError).toBeNull();
    expect(result.current.status).toBe('unauthenticated');

    // Verify localStorage is cleaned
    expect(localStorage.getItem('axon_active_membership')).toBeNull();
    expect(localStorage.getItem('axon_access_token')).toBeNull();
    expect(localStorage.getItem('axon_user')).toBeNull();
    expect(localStorage.getItem('axon_memberships')).toBeNull();
  });

  it('logout() clears state even when supabase.signOut throws', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: MOCK_TOKEN } },
      error: null,
    });

    mockSignOut.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toBe('authenticated');

    await act(async () => {
      await result.current.logout();
    });

    // State should be cleared even on signOut failure
    expect(result.current.user).toBeNull();
    expect(result.current.status).toBe('unauthenticated');
    expect(localStorage.getItem('axon_active_membership')).toBeNull();
  });

  // ── Test 10: selectInstitution() ──────────────────────────

  it('selectInstitution() updates selectedInstitution and persists to localStorage', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: MOCK_TOKEN } },
      error: null,
    });

    setupApiRoutes(MOCK_PROFILE, [MOCK_INSTITUTION_A, MOCK_INSTITUTION_B]);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Multiple institutions -- no auto-select
    expect(result.current.selectedInstitution).toBeNull();

    // Select institution B
    act(() => {
      result.current.selectInstitution({
        id: 'inst-002',
        name: 'Colegio Beta',
        slug: 'col-beta',
        logo_url: null,
        membership_id: 'mem-002',
        role: 'student',
        is_active: true,
        settings: {},
        plan_id: null,
        created_at: '2025-02-01T00:00:00Z',
      });
    });

    expect(result.current.selectedInstitution?.id).toBe('inst-002');
    expect(result.current.role).toBe('student');

    // Verify localStorage
    const stored = localStorage.getItem('axon_active_membership');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored as string);
    expect(parsed.institution_id).toBe('inst-002');
    expect(parsed.role).toBe('student');
    expect(parsed.user_id).toBe('user-001');
  });

  // ── Backward compat aliases ──────────────────────────────

  it('provides backward-compatible memberships and activeMembership', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: MOCK_TOKEN } },
      error: null,
    });

    setupApiRoutes(MOCK_PROFILE, [MOCK_INSTITUTION_A]);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.memberships).toHaveLength(1);
    expect(result.current.memberships[0].role).toBe('professor');
    expect(result.current.memberships[0].user_id).toBe('user-001');
    expect(result.current.memberships[0].institution_id).toBe('inst-001');
    expect(result.current.activeMembership).not.toBeNull();
    expect(result.current.activeMembership?.id).toBe('mem-001');
  });
});
