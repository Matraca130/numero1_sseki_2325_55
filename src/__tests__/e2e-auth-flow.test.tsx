// ============================================================
// E2E Integration Tests -- Authentication Flow
//
// Tests the FULL auth journey end-to-end:
//   1. Unauthenticated user sees login page
//   2. Login with credentials -> success -> redirect by role
//   3. Multiple institutions -> SelectRolePage -> pick one -> redirect
//   4. Single institution -> auto-select -> redirect to dashboard
//   5. Auth guard: unauthenticated -> redirect to /login
//   6. Role guard: student on /owner route -> redirect
//   7. Logout: state cleared -> back to login
//   8. Session restore: page refresh -> session restored from localStorage
//
// Components under test:
//   - AuthProvider (AuthContext)
//   - LoginPage
//   - PostLoginRouter
//   - SelectRolePage
//   - RequireAuth
//   - RequireRole
//
// RUN: npx vitest run src/__tests__/e2e-auth-flow.test.tsx
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import React from 'react';
import type { ReactNode } from 'react';

// ── Test data fixtures ──────────────────────────────────────

const MOCK_TOKEN = 'test-jwt-token-abc123';

const MOCK_PROFILE = {
  id: 'user-001',
  email: 'maria@axon.edu',
  full_name: 'Maria Garcia',
  name: 'Maria Garcia',
  avatar_url: null,
  is_super_admin: false,
  platform_role: 'user',
  is_active: true,
};

const MOCK_STUDENT_INST = {
  id: 'inst-001',
  name: 'Universidad Axon',
  slug: 'univ-axon',
  logo_url: null,
  membership_id: 'mem-001',
  role: 'student',
  is_active: true,
  settings: {},
  plan_id: null,
};

const MOCK_PROF_INST = {
  id: 'inst-002',
  name: 'Hospital Central',
  slug: 'hosp-central',
  logo_url: null,
  membership_id: 'mem-002',
  role: 'professor',
  is_active: true,
  settings: {},
  plan_id: null,
};

// ── Mock motion/react ────────────────────────────────────────
// Use simple string element names instead of Proxy to avoid
// infinite module resolution loops in vitest.
vi.mock('motion/react', () => ({
  __esModule: true,
  motion: {
    div: 'div',
    button: 'button',
    span: 'span',
    p: 'p',
    h1: 'h1',
    h2: 'h2',
    a: 'a',
    section: 'section',
    form: 'form',
    input: 'input',
    label: 'label',
    img: 'img',
    li: 'li',
    ul: 'ul',
  },
  AnimatePresence: ({ children }: { children: any }) => children,
}));

// ── Mock lucide-react ────────────────────────────────────────
// Explicit named exports for all icons used by auth components.
// Using Proxy causes infinite resolution loops in vitest when
// combined with real component imports. The factory must use
// require('react') since vi.mock is hoisted above imports.
vi.mock('lucide-react', () => {
  const R = require('react');
  const stub = (props: Record<string, unknown>) =>
    R.createElement('span', { 'data-testid': 'icon-stub', ...props });
  return {
    __esModule: true,
    Eye: stub,
    EyeOff: stub,
    LogIn: stub,
    UserPlus: stub,
    Loader2: stub,
    AlertCircle: stub,
    CheckCircle2: stub,
    Crown: stub,
    Shield: stub,
    GraduationCap: stub,
    BookOpen: stub,
    ChevronRight: stub,
    LogOut: stub,
  };
});

// ── Mock sonner ──────────────────────────────────────────────
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  Toaster: () => null,
}));

// ── Mock AxonLogo ────────────────────────────────────────────
vi.mock('@/app/components/shared/AxonLogo', () => ({
  AxonLogo: () => require('react').createElement('div', { 'data-testid': 'axon-logo' }, 'AxonLogo'),
}));

// ── Mock supabase ────────────────────────────────────────────

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

// ── Mock api ─────────────────────────────────────────────────

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

// ── Import components AFTER mocks ────────────────────────────

import { AuthProvider, useAuth } from '@/app/context/AuthContext';
import { RequireAuth } from '@/app/components/auth/RequireAuth';
import { RequireRole } from '@/app/components/auth/RequireRole';
import { PostLoginRouter } from '@/app/components/auth/PostLoginRouter';
import { SelectRolePage } from '@/app/components/auth/SelectRolePage';
import { LoginPage } from '@/app/components/auth/LoginPage';

// ── Helpers ──────────────────────────────────────────────────

function setupDefaultMocks() {
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

function setupApiRoutes(
  profile: typeof MOCK_PROFILE | null = MOCK_PROFILE,
  institutions: Array<typeof MOCK_STUDENT_INST> = [MOCK_STUDENT_INST],
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

/** Setup for an already-authenticated session (session restore on mount) */
function setupAuthenticatedSession(
  institutions: Array<typeof MOCK_STUDENT_INST> = [MOCK_STUDENT_INST],
) {
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: MOCK_TOKEN } },
    error: null,
  });
  setupApiRoutes(MOCK_PROFILE, institutions);
}

/** Render a full app-like routing tree with AuthProvider */
function renderApp(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Post-login decision point */}
          <Route path="/" element={<PostLoginRouter />} />

          {/* Select org page */}
          <Route path="/select-org" element={<SelectRolePage />} />

          {/* Protected routes behind RequireAuth */}
          <Route element={<RequireAuth />}>
            {/* Student routes */}
            <Route element={<RequireRole roles={['student']} />}>
              <Route path="/student" element={<div data-testid="student-dashboard">Student Dashboard</div>} />
            </Route>

            {/* Professor routes */}
            <Route element={<RequireRole roles={['professor']} />}>
              <Route path="/professor" element={<div data-testid="professor-dashboard">Professor Dashboard</div>} />
            </Route>

            {/* Owner routes */}
            <Route element={<RequireRole roles={['owner']} />}>
              <Route path="/owner" element={<div data-testid="owner-dashboard">Owner Dashboard</div>} />
            </Route>

            {/* Admin routes */}
            <Route element={<RequireRole roles={['admin']} />}>
              <Route path="/admin" element={<div data-testid="admin-dashboard">Admin Dashboard</div>} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

/** Wrapper for renderHook tests that need AuthProvider + MemoryRouter */
function hookWrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

// ── Test Suite ───────────────────────────────────────────────

describe('E2E Auth Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setupDefaultMocks();
    setupApiRoutes();
    // Suppress expected console logs/errors from auth flow
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Unauthenticated user sees login page ────────────────

  it('unauthenticated user landing on / is redirected to /login', async () => {
    renderApp(['/']);

    await waitFor(() => {
      expect(screen.getByText('Bienvenido de vuelta')).toBeInTheDocument();
    });
  });

  // ── 2. Login with credentials -> success -> redirect ──────

  it('user enters credentials, login succeeds, and is redirected to student dashboard', async () => {
    setupApiRoutes(MOCK_PROFILE, [MOCK_STUDENT_INST]);

    renderApp(['/login']);

    await waitFor(() => {
      expect(screen.getByText('Bienvenido de vuelta')).toBeInTheDocument();
    });

    // Fill in the login form
    const emailInput = screen.getByPlaceholderText('tu@email.com');
    const passwordInput = screen.getByPlaceholderText('Tu contraseña');
    const submitButton = screen.getByRole('button', { name: /Iniciar sesión/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'maria@axon.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);
    });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'maria@axon.edu',
      password: 'password123',
    });

    // After successful login with 1 student institution, should reach student dashboard
    await waitFor(() => {
      expect(screen.getByTestId('student-dashboard')).toBeInTheDocument();
    });
  });

  // ── 3. Login failure shows error message ───────────────────

  it('login with bad credentials shows error message on login page', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    });

    renderApp(['/login']);

    await waitFor(() => {
      expect(screen.getByText('Bienvenido de vuelta')).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText('tu@email.com');
    const passwordInput = screen.getByPlaceholderText('Tu contraseña');
    const submitButton = screen.getByRole('button', { name: /Iniciar sesión/i });

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: 'bad@axon.edu' } });
      fireEvent.change(passwordInput, { target: { value: 'wrong' } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument();
    });

    // User stays on login page
    expect(screen.getByText('Bienvenido de vuelta')).toBeInTheDocument();
  });

  // ── 4. Multiple institutions -> SelectRolePage -> pick one ─

  it('user with multiple institutions sees SelectRolePage and picks professor', async () => {
    setupAuthenticatedSession([MOCK_STUDENT_INST, MOCK_PROF_INST]);

    renderApp(['/']);

    // PostLoginRouter -> multiple institutions, no selection -> /select-org
    await waitFor(() => {
      expect(screen.getByText(/Selecciona la institución/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Universidad Axon')).toBeInTheDocument();
    expect(screen.getByText('Hospital Central')).toBeInTheDocument();

    // Click on the professor institution (Hospital Central)
    const hospitalButton = screen.getByText('Hospital Central').closest('button');
    expect(hospitalButton).not.toBeNull();

    await act(async () => {
      fireEvent.click(hospitalButton!);
    });

    await waitFor(() => {
      expect(screen.getByTestId('professor-dashboard')).toBeInTheDocument();
    });
  });

  // ── 5. Single institution -> auto-select -> redirect ───────

  it('user with single student institution is auto-redirected to student dashboard', async () => {
    setupAuthenticatedSession([MOCK_STUDENT_INST]);

    renderApp(['/']);

    await waitFor(() => {
      expect(screen.getByTestId('student-dashboard')).toBeInTheDocument();
    });
  });

  // ── 6. Single professor institution -> professor dashboard ─

  it('user with single professor institution is auto-redirected to professor dashboard', async () => {
    setupAuthenticatedSession([MOCK_PROF_INST]);

    renderApp(['/']);

    await waitFor(() => {
      expect(screen.getByTestId('professor-dashboard')).toBeInTheDocument();
    });
  });

  // ── 7. Auth guard: unauthenticated -> /login ───────────────

  it('unauthenticated user accessing /student is redirected to /login', async () => {
    renderApp(['/student']);

    await waitFor(() => {
      expect(screen.getByText('Bienvenido de vuelta')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('student-dashboard')).not.toBeInTheDocument();
  });

  // ── 8. Role guard: student trying /owner route -> redirect ─

  it('student user accessing /owner route is redirected away from owner dashboard', async () => {
    setupAuthenticatedSession([MOCK_STUDENT_INST]);

    renderApp(['/owner']);

    // RequireAuth passes, RequireRole for ['owner'] fails for student role
    // -> /select-org, which with 1 membership auto-redirects to /student
    await waitFor(() => {
      expect(screen.getByTestId('student-dashboard')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('owner-dashboard')).not.toBeInTheDocument();
  });

  // ── 9. Logout flow: state cleared -> back to login ─────────

  it('logout clears all auth state and localStorage', async () => {
    setupAuthenticatedSession([MOCK_STUDENT_INST]);

    const { result } = renderHook(() => useAuth(), { wrapper: hookWrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toBe('authenticated');
    expect(result.current.user?.email).toBe('maria@axon.edu');
    expect(result.current.selectedInstitution?.id).toBe('inst-001');
    expect(localStorage.getItem('axon_active_membership')).not.toBeNull();

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.institutions).toHaveLength(0);
    expect(result.current.selectedInstitution).toBeNull();
    expect(result.current.status).toBe('unauthenticated');
    expect(result.current.role).toBeNull();
    expect(mockSignOut).toHaveBeenCalled();

    // localStorage cleaned
    expect(localStorage.getItem('axon_active_membership')).toBeNull();
    expect(localStorage.getItem('axon_access_token')).toBeNull();
    expect(localStorage.getItem('axon_user')).toBeNull();
    expect(localStorage.getItem('axon_memberships')).toBeNull();
  });

  // ── 10. Session restore from supabase on mount ─────────────

  it('session is restored from supabase getSession on mount', async () => {
    setupAuthenticatedSession([MOCK_STUDENT_INST]);

    const { result } = renderHook(() => useAuth(), { wrapper: hookWrapper });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toBe('authenticated');
    expect(result.current.user?.email).toBe('maria@axon.edu');
    expect(result.current.user?.name).toBe('Maria Garcia');
    expect(result.current.institutions).toHaveLength(1);
    expect(result.current.selectedInstitution?.id).toBe('inst-001');
    expect(result.current.role).toBe('student');

    expect(mockApiCall).toHaveBeenCalledWith('/me');
    expect(mockApiCall).toHaveBeenCalledWith('/institutions');
    expect(mockSetAccessToken).toHaveBeenCalledWith(MOCK_TOKEN);
  });

  // ── 11. Session restore with localStorage membership ───────

  it('restores selected institution from localStorage when multiple institutions exist', async () => {
    localStorage.setItem(
      'axon_active_membership',
      JSON.stringify({ id: 'mem-002', institution_id: 'inst-002', role: 'professor' }),
    );

    setupAuthenticatedSession([MOCK_STUDENT_INST, MOCK_PROF_INST]);

    const { result } = renderHook(() => useAuth(), { wrapper: hookWrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.selectedInstitution?.id).toBe('inst-002');
    expect(result.current.role).toBe('professor');
    expect(result.current.institutions).toHaveLength(2);
  });

  // ── 12. RequireAuth shows loading spinner ──────────────────

  it('shows loading spinner while session is being restored', () => {
    // getSession never resolves to keep loading state
    mockGetSession.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/student']}>
        <AuthProvider>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route path="/student" element={<div data-testid="student-dashboard">Student Dashboard</div>} />
            </Route>
            <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Restaurando sesion...')).toBeInTheDocument();
    expect(screen.getByTestId('axon-logo')).toBeInTheDocument();
    expect(screen.queryByTestId('student-dashboard')).not.toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  // ── 13. Authenticated user on /login is redirected away ────

  it('authenticated user visiting /login is redirected to their dashboard', async () => {
    setupAuthenticatedSession([MOCK_STUDENT_INST]);

    renderApp(['/login']);

    // LoginPage detects authenticated + institutions > 0 -> Navigate to /
    // PostLoginRouter -> 1 institution -> /student
    await waitFor(() => {
      expect(screen.getByTestId('student-dashboard')).toBeInTheDocument();
    });

    expect(screen.queryByText('Bienvenido de vuelta')).not.toBeInTheDocument();
  });

  // ── 14. SelectRolePage with 0 memberships -> /login ────────

  it('SelectRolePage redirects to /login when user has no memberships', async () => {
    setupAuthenticatedSession([]);

    renderApp(['/select-org']);

    await waitFor(() => {
      expect(screen.getByText('Bienvenido de vuelta')).toBeInTheDocument();
    });
  });

  // ── 15. Full login-to-logout round trip via useAuth hook ───

  it('full round trip: login -> verify state -> logout -> verify cleared', async () => {
    setupApiRoutes(MOCK_PROFILE, [MOCK_STUDENT_INST]);

    const { result } = renderHook(() => useAuth(), { wrapper: hookWrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toBe('unauthenticated');

    // Login
    let loginResult: { success: boolean; error?: string } | undefined;
    await act(async () => {
      loginResult = await result.current.login('maria@axon.edu', 'password123');
    });

    expect(loginResult?.success).toBe(true);
    expect(result.current.status).toBe('authenticated');
    expect(result.current.user?.email).toBe('maria@axon.edu');
    expect(result.current.selectedInstitution?.role).toBe('student');
    expect(result.current.role).toBe('student');
    expect(mockSetAccessToken).toHaveBeenCalledWith(MOCK_TOKEN);

    // Logout
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.status).toBe('unauthenticated');
    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.institutions).toHaveLength(0);
    expect(result.current.selectedInstitution).toBeNull();
    expect(result.current.role).toBeNull();
    expect(localStorage.getItem('axon_active_membership')).toBeNull();
  });
});
