// ============================================================
// Axon — Tests for RequireAuth route guard
//
// RequireAuth checks AuthContext status:
//   - loading   -> spinner with "Restaurando sesion..."
//   - unauth    -> Navigate to /login
//   - authed    -> render child routes (Outlet)
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { AuthStatus } from '@/app/context/AuthContext';

// ── Mock heavy dependencies to avoid side-effects ──────────
vi.mock('@/app/components/shared/AxonLogo', () => ({
  AxonLogo: () => <div data-testid="axon-logo" />,
}));

vi.mock('lucide-react', () => ({
  Loader2: (props: Record<string, unknown>) => (
    <svg data-testid="loader-icon" {...props} />
  ),
}));

// ── Mock useAuth — overridden per test via mockReturnValue ──
const mockUseAuth = vi.fn();

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// ── Import component AFTER mocks are set up ────────────────
import { RequireAuth } from '../RequireAuth';

// ── Helpers ────────────────────────────────────────────────

function renderWithRouter(initialEntries: string[] = ['/protected']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route element={<RequireAuth />}>
          <Route
            path="/protected"
            element={<div data-testid="child-outlet">Protected Content</div>}
          />
        </Route>
        <Route
          path="/login"
          element={<div data-testid="login-page">Login Page</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

// ── Tests ──────────────────────────────────────────────────

describe('RequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state with "Restaurando sesion..." when status is loading', () => {
    mockUseAuth.mockReturnValue({ status: 'loading' as AuthStatus });

    renderWithRouter();

    expect(screen.getByText('Restaurando sesion...')).toBeInTheDocument();
    expect(screen.getByTestId('axon-logo')).toBeInTheDocument();
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('child-outlet')).not.toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('redirects to /login when status is unauthenticated', () => {
    mockUseAuth.mockReturnValue({ status: 'unauthenticated' as AuthStatus });

    renderWithRouter();

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('child-outlet')).not.toBeInTheDocument();
    expect(screen.queryByText('Restaurando sesion...')).not.toBeInTheDocument();
  });

  it('renders child routes (Outlet) when status is authenticated', () => {
    mockUseAuth.mockReturnValue({ status: 'authenticated' as AuthStatus });

    renderWithRouter();

    expect(screen.getByTestId('child-outlet')).toBeInTheDocument();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    expect(screen.queryByText('Restaurando sesion...')).not.toBeInTheDocument();
  });
});
