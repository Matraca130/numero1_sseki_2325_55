// ============================================================
// AdminDashboardPage — Component tests
//
// Tests rendering and basic functionality of the admin
// dashboard placeholder page with admin role context.
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';

// ── Mock motion/react ──────────────────────────────────────
vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div {...props} ref={ref}>{children}</div>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ── Mock contexts ──────────────────────────────────────────
const mockUseAuth = vi.fn();

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// ── Import after mocks ────────────────────────────────────
import { AdminDashboardPage } from '../AdminDashboardPage';
import { renderWithAuth } from '@/test/test-utils';

// ── Test suite ─────────────────────────────────────────────

describe('AdminDashboardPage', () => {
  const defaultAuthOverrides = {
    user: {
      id: 'admin-user-1',
      email: 'admin@test.com',
      name: 'Admin User',
    },
    role: 'admin' as const,
  };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUseAuth.mockReturnValue({
      user: defaultAuthOverrides.user,
      role: defaultAuthOverrides.role,
      activeMembership: {
        institution: { name: 'Test University' },
        role: 'admin',
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Rendering Tests ─────────────────────────────────────

  it('renders without crashing with admin role', () => {
    renderWithAuth(<AdminDashboardPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText('Dashboard del Administrador')).toBeInTheDocument();
  });

  it('displays the correct page title', () => {
    renderWithAuth(<AdminDashboardPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText('Dashboard del Administrador')).toBeInTheDocument();
  });

  it('displays the page description', () => {
    renderWithAuth(<AdminDashboardPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(
      screen.getByText(/Vision general de la gestion/)
    ).toBeInTheDocument();
  });

  it('renders admin-specific content sections', () => {
    renderWithAuth(<AdminDashboardPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(
      screen.getByText('Resumen de miembros activos')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Contenido pendiente de aprobacion')
    ).toBeInTheDocument();
    expect(screen.getByText('Actividad reciente')).toBeInTheDocument();
    expect(screen.getByText('Alertas del sistema')).toBeInTheDocument();
    expect(screen.getByText('Metricas de uso')).toBeInTheDocument();
  });

  // ── Content Verification ───────────────────────────────

  it('displays all planned features', () => {
    renderWithAuth(<AdminDashboardPage />, {
      authOverrides: defaultAuthOverrides,
    });

    const features = [
      'Resumen de miembros activos',
      'Contenido pendiente de aprobacion',
      'Actividad reciente',
      'Alertas del sistema',
      'Metricas de uso',
    ];

    features.forEach((feature) => {
      expect(screen.getByText(feature)).toBeInTheDocument();
    });
  });

  it('displays backend route references', () => {
    renderWithAuth(<AdminDashboardPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText('GET /server/members')).toBeInTheDocument();
    expect(screen.getByText('GET /server/admin-scopes')).toBeInTheDocument();
  });

  // ── Context Display ────────────────────────────────────

  it('shows admin user information in context card', () => {
    renderWithAuth(<AdminDashboardPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
  });

  it('displays institution name in context card', () => {
    renderWithAuth(<AdminDashboardPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText('Test University')).toBeInTheDocument();
  });

  it('displays admin role in context card', () => {
    renderWithAuth(<AdminDashboardPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  // ── Auth Verification ─────────────────────────────────

  it('renders with admin role context', () => {
    const { authValue } = renderWithAuth(<AdminDashboardPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(authValue.role).toBe('admin');
  });

  it('renders icon for page identification', () => {
    const { container } = renderWithAuth(<AdminDashboardPage />, {
      authOverrides: defaultAuthOverrides,
    });
    // Check for icon container
    const iconContainer = container.querySelector('[class*="text-blue"]');
    expect(iconContainer).toBeTruthy();
  });

  // ── Multiple Admin Users ───────────────────────────────

  it('renders correctly for different admin users', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'admin-2',
        email: 'other-admin@test.com',
        name: 'Other Admin',
      },
      role: 'admin',
      activeMembership: {
        institution: { name: 'Test University' },
        role: 'admin',
      },
    });
    renderWithAuth(<AdminDashboardPage />);
    expect(screen.getByText('Other Admin')).toBeInTheDocument();
    expect(screen.getByText('other-admin@test.com')).toBeInTheDocument();
  });

  it('maintains proper layout and styling', () => {
    const { container } = renderWithAuth(<AdminDashboardPage />, {
      authOverrides: defaultAuthOverrides,
    });
    const mainContainer = container.querySelector('[class*="max-w-4xl"]');
    expect(mainContainer).toBeInTheDocument();
  });
});
