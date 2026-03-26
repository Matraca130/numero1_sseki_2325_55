// ============================================================
// Axon — Tests for RequireRole route guard
//
// RequireRole checks AuthContext membership/institution:
//   - No activeMembership AND no selectedInstitution -> Navigate to /
//   - Role not in allowed list                       -> Navigate to /select-org
//   - Role matches                                   -> render Outlet
//
// Priority: selectedInstitution.role > activeMembership.role
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';

// ── Mock useAuth — overridden per test via mockReturnValue ──
const mockUseAuth = vi.fn();

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// ── Import component AFTER mocks are set up ────────────────
import { RequireRole } from '../RequireRole';

// ── Helpers ────────────────────────────────────────────────

function renderWithRouter(
  roles: string[],
  initialEntries: string[] = ['/dashboard'],
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route element={<RequireRole roles={roles} />}>
          <Route
            path="/dashboard"
            element={<div data-testid="child-outlet">Dashboard</div>}
          />
        </Route>
        <Route
          path="/"
          element={<div data-testid="root-page">Root Page</div>}
        />
        <Route
          path="/select-org"
          element={<div data-testid="select-org-page">Select Org</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

// ── Tests ──────────────────────────────────────────────────

describe('RequireRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to / when neither activeMembership nor selectedInstitution exist', () => {
    mockUseAuth.mockReturnValue({
      activeMembership: null,
      selectedInstitution: null,
    });

    renderWithRouter(['admin']);

    expect(screen.getByTestId('root-page')).toBeInTheDocument();
    expect(screen.queryByTestId('child-outlet')).not.toBeInTheDocument();
    expect(screen.queryByTestId('select-org-page')).not.toBeInTheDocument();
  });

  it('redirects to /select-org when role does not match allowed roles', () => {
    mockUseAuth.mockReturnValue({
      activeMembership: { role: 'student' },
      selectedInstitution: null,
    });

    renderWithRouter(['admin', 'owner']);

    expect(screen.getByTestId('select-org-page')).toBeInTheDocument();
    expect(screen.queryByTestId('child-outlet')).not.toBeInTheDocument();
    expect(screen.queryByTestId('root-page')).not.toBeInTheDocument();
  });

  it('renders child routes (Outlet) when role matches allowed roles', () => {
    mockUseAuth.mockReturnValue({
      activeMembership: { role: 'admin' },
      selectedInstitution: null,
    });

    renderWithRouter(['admin', 'owner']);

    expect(screen.getByTestId('child-outlet')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('root-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('select-org-page')).not.toBeInTheDocument();
  });

  it('prefers selectedInstitution.role over activeMembership.role', () => {
    mockUseAuth.mockReturnValue({
      activeMembership: { role: 'student' },
      selectedInstitution: { role: 'professor' },
    });

    renderWithRouter(['professor']);

    expect(screen.getByTestId('child-outlet')).toBeInTheDocument();
    expect(screen.queryByTestId('select-org-page')).not.toBeInTheDocument();
  });

  it('falls back to activeMembership.role when selectedInstitution has no role', () => {
    mockUseAuth.mockReturnValue({
      activeMembership: { role: 'owner' },
      selectedInstitution: { role: undefined },
    });

    renderWithRouter(['owner']);

    expect(screen.getByTestId('child-outlet')).toBeInTheDocument();
    expect(screen.queryByTestId('select-org-page')).not.toBeInTheDocument();
  });

  it('redirects to /select-org when activeRole exists but is not in allowed list', () => {
    mockUseAuth.mockReturnValue({
      activeMembership: null,
      selectedInstitution: { role: 'student' },
    });

    renderWithRouter(['admin']);

    expect(screen.getByTestId('select-org-page')).toBeInTheDocument();
    expect(screen.queryByTestId('child-outlet')).not.toBeInTheDocument();
  });
});
