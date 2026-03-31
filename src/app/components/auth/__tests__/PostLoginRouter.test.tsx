/**
 * PostLoginRouter.test.tsx — Tests for post-login routing logic
 *
 * Coverage: role-based routing, institution selection, edge cases
 * Mocks: useAuth (AuthContext)
 * Deps: MemoryRouter for navigation assertions
 *
 * Run: npx vitest run src/app/components/auth/__tests__/PostLoginRouter.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { PostLoginRouter } from '../PostLoginRouter';
import { createMockAuthValue, createMockInstitution } from '@/test/test-utils';

// ── Mock useAuth ──────────────────────────────────────────
let mockAuth: ReturnType<typeof createMockAuthValue>;

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

// ── Helpers ───────────────────────────────────────────────

/** Render PostLoginRouter inside a router with sentinel routes to detect navigation */
function renderRouter(initialEntries = ['/post-login']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/post-login" element={<PostLoginRouter />} />
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        <Route path="/select-org" element={<div data-testid="select-org-page">Select Org</div>} />
        <Route path="/owner" element={<div data-testid="owner-page">Owner</div>} />
        <Route path="/admin" element={<div data-testid="admin-page">Admin</div>} />
        <Route path="/professor" element={<div data-testid="professor-page">Professor</div>} />
        <Route path="/student" element={<div data-testid="student-page">Student</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────

describe('PostLoginRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Unauthenticated ──
  it('redirects to /login when unauthenticated', () => {
    mockAuth = createMockAuthValue({
      user: null,
      selectedInstitution: null,
      institutions: [],
    });
    // Override status since createMockAuthValue derives it from user
    mockAuth.status = 'unauthenticated';

    renderRouter();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  // ── No memberships ──
  it('redirects to /login when authenticated but no institutions/memberships', () => {
    mockAuth = createMockAuthValue({
      institutions: [],
      selectedInstitution: null,
    });
    mockAuth.status = 'authenticated';
    mockAuth.institutions = [];
    mockAuth.memberships = [];

    renderRouter();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  // ── Selected institution routes by role ──
  it.each([
    ['owner', 'owner-page'],
    ['admin', 'admin-page'],
    ['professor', 'professor-page'],
    ['student', 'student-page'],
  ] as const)('routes to /%s when selectedInstitution has role=%s', (role, testId) => {
    mockAuth = createMockAuthValue({
      role,
      selectedInstitution: createMockInstitution({ role }),
      institutions: [createMockInstitution({ role })],
    });
    mockAuth.status = 'authenticated';

    renderRouter();
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  // ── Single institution auto-select ──
  it('auto-selects single institution and routes by its role', () => {
    const inst = createMockInstitution({ role: 'professor' });
    mockAuth = createMockAuthValue({
      selectedInstitution: null,
      institutions: [inst],
    });
    mockAuth.status = 'authenticated';
    mockAuth.activeMembership = null;

    renderRouter();
    expect(screen.getByTestId('professor-page')).toBeInTheDocument();
  });

  // ── Multiple institutions → org picker ──
  it('redirects to /select-org when multiple institutions and none selected', () => {
    const inst1 = createMockInstitution({ id: 'inst-1', role: 'student' });
    const inst2 = createMockInstitution({ id: 'inst-2', role: 'professor' });
    mockAuth = createMockAuthValue({
      selectedInstitution: null,
      institutions: [inst1, inst2],
    });
    mockAuth.status = 'authenticated';
    mockAuth.activeMembership = null;

    renderRouter();
    expect(screen.getByTestId('select-org-page')).toBeInTheDocument();
  });

  // ── Unknown role defaults to student ──
  it('defaults to /student for unknown role', () => {
    mockAuth = createMockAuthValue({
      role: 'student',
      selectedInstitution: createMockInstitution({ role: 'student' }),
      institutions: [createMockInstitution({ role: 'student' })],
    });
    mockAuth.status = 'authenticated';
    // Simulate unknown role by overriding
    mockAuth.role = 'unknown_role' as any;
    // But the component reads selectedInstitution.role too, which falls back
    (mockAuth.selectedInstitution as any).role = 'unknown_role';

    renderRouter();
    expect(screen.getByTestId('student-page')).toBeInTheDocument();
  });

  // ── Auth error with no institutions triggers logout ──
  it('calls logout when authenticated with authError and no institutions', async () => {
    const logoutFn = vi.fn().mockResolvedValue(undefined);
    mockAuth = createMockAuthValue({
      institutions: [],
      selectedInstitution: null,
      authError: 'Failed to load institutions',
    });
    mockAuth.status = 'authenticated';
    mockAuth.institutions = [];
    mockAuth.memberships = [];
    mockAuth.logout = logoutFn;

    renderRouter();

    await waitFor(() => {
      expect(logoutFn).toHaveBeenCalled();
    });
  });

  // ── loggingOut + authError: logout is called and navigates to /login ──
  // Commit 7ae7e85: logout must happen in useEffect (not during render).
  // The component sets loggingOut=true → renders null → logout resolves → navigates to /login.
  it('navigates to /login after logout completes on authError path', async () => {
    let resolveLogout!: () => void;
    const logoutPromise = new Promise<void>((r) => { resolveLogout = r; });
    const logoutFn = vi.fn().mockReturnValue(logoutPromise);

    mockAuth = createMockAuthValue({
      institutions: [],
      selectedInstitution: null,
      authError: 'Failed to load institutions',
    });
    mockAuth.status = 'authenticated';
    mockAuth.institutions = [];
    mockAuth.memberships = [];
    mockAuth.logout = logoutFn;

    renderRouter();

    // useEffect fires logout
    await waitFor(() => {
      expect(logoutFn).toHaveBeenCalled();
    });

    // Resolve the logout promise → navigate('/login')
    await act(async () => {
      resolveLogout();
    });

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  // ── activeMembership fallback ──
  it('routes by activeMembership.role when selectedInstitution is null', () => {
    mockAuth = createMockAuthValue({
      selectedInstitution: null,
      institutions: [createMockInstitution({ role: 'admin' })],
    });
    mockAuth.status = 'authenticated';
    mockAuth.activeMembership = { role: 'admin', id: 'mem-1' } as any;

    renderRouter();
    expect(screen.getByTestId('admin-page')).toBeInTheDocument();
  });
});
