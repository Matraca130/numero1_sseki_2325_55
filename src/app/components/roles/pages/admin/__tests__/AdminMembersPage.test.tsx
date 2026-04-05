// ============================================================
// AdminMembersPage — Component tests
//
// Tests rendering and basic functionality of the admin
// members management placeholder page with admin context.
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';

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
import { AdminMembersPage } from '../AdminMembersPage';
import { renderWithAuth } from '@/test/test-utils';

// ── Test suite ─────────────────────────────────────────────

describe('AdminMembersPage', () => {
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
    renderWithAuth(<AdminMembersPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText('Gestión de Miembros')).toBeInTheDocument();
  });

  it('displays the correct page title', () => {
    renderWithAuth(<AdminMembersPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText('Gestión de Miembros')).toBeInTheDocument();
  });

  it('displays the page description', () => {
    renderWithAuth(<AdminMembersPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(
      screen.getByText(/Administra profesores y estudiantes/)
    ).toBeInTheDocument();
  });

  it('renders member management features', () => {
    renderWithAuth(<AdminMembersPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(
      screen.getByText('Lista de miembros (filtrada por admin scope)')
    ).toBeInTheDocument();
    expect(screen.getByText('Invitar nuevos miembros')).toBeInTheDocument();
    expect(screen.getByText('Editar roles')).toBeInTheDocument();
    expect(screen.getByText('Activar/desactivar')).toBeInTheDocument();
    expect(screen.getByText('Asignar a cursos')).toBeInTheDocument();
  });

  // ── Content Verification ───────────────────────────────

  it('displays all planned member management features', () => {
    renderWithAuth(<AdminMembersPage />, {
      authOverrides: defaultAuthOverrides,
    });

    const features = [
      'Lista de miembros (filtrada por admin scope)',
      'Invitar nuevos miembros',
      'Editar roles',
      'Activar/desactivar',
      'Asignar a cursos',
    ];

    features.forEach((feature) => {
      expect(screen.getByText(feature)).toBeInTheDocument();
    });
  });

  it('displays backend route references for member operations', () => {
    renderWithAuth(<AdminMembersPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText('GET /server/members')).toBeInTheDocument();
    expect(screen.getByText('POST /server/members')).toBeInTheDocument();
    expect(screen.getByText('PUT /server/members/:userId')).toBeInTheDocument();
    expect(
      screen.getByText('GET /server/admin-scopes/my')
    ).toBeInTheDocument();
  });

  // ── Context Display ────────────────────────────────────

  it('shows admin user information in context card', () => {
    renderWithAuth(<AdminMembersPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
  });

  it('displays institution name in context card', () => {
    renderWithAuth(<AdminMembersPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText('Test University')).toBeInTheDocument();
  });

  it('displays admin role in context card', () => {
    renderWithAuth(<AdminMembersPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  // ── Scope Filtering Information ────────────────────────

  it('indicates scope-based member filtering in description', () => {
    renderWithAuth(<AdminMembersPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText(/filtrada por admin scope/)).toBeInTheDocument();
  });

  it('shows admin-specific operations in features', () => {
    renderWithAuth(<AdminMembersPage />, {
      authOverrides: defaultAuthOverrides,
    });
    const editRolesElement = screen.getByText('Editar roles');
    const toggleElement = screen.getByText('Activar/desactivar');
    expect(editRolesElement).toBeInTheDocument();
    expect(toggleElement).toBeInTheDocument();
  });

  // ── Auth Verification ─────────────────────────────────

  it('renders with admin role context', () => {
    const { authValue } = renderWithAuth(<AdminMembersPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(authValue.role).toBe('admin');
  });

  it('renders icon for page identification', () => {
    const { container } = renderWithAuth(<AdminMembersPage />, {
      authOverrides: defaultAuthOverrides,
    });
    // Check for icon container with blue coloring
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
    renderWithAuth(<AdminMembersPage />);
    expect(screen.getByText('Other Admin')).toBeInTheDocument();
    expect(screen.getByText('other-admin@test.com')).toBeInTheDocument();
  });

  it('maintains proper layout and styling', () => {
    const { container } = renderWithAuth(<AdminMembersPage />, {
      authOverrides: defaultAuthOverrides,
    });
    const mainContainer = container.querySelector('[class*="max-w-4xl"]');
    expect(mainContainer).toBeInTheDocument();
  });

  // ── CRUD Operations Visibility ────────────────────────

  it('displays CRUD operation routes in backend references', () => {
    renderWithAuth(<AdminMembersPage />, {
      authOverrides: defaultAuthOverrides,
    });
    // Should show GET (read), POST (create), PUT (update)
    const getRoute = screen.getByText(/GET \/server\/members/);
    const postRoute = screen.getByText(/POST \/server\/members/);
    const putRoute = screen.getByText(/PUT \/server\/members/);
    expect(getRoute).toBeInTheDocument();
    expect(postRoute).toBeInTheDocument();
    expect(putRoute).toBeInTheDocument();
  });
});
