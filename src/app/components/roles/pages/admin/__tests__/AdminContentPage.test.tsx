// ============================================================
// AdminContentPage — Component tests
//
// Tests rendering and basic functionality of the admin
// content management placeholder page with admin context.
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
import { AdminContentPage } from '../AdminContentPage';
import { renderWithAuth } from '@/test/test-utils';

// ── Test suite ─────────────────────────────────────────────

describe('AdminContentPage', () => {
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
    renderWithAuth(<AdminContentPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText('Gestión de Contenido')).toBeInTheDocument();
  });

  it('displays the correct page title', () => {
    renderWithAuth(<AdminContentPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText('Gestión de Contenido')).toBeInTheDocument();
  });

  it('displays the page description with approval focus', () => {
    renderWithAuth(<AdminContentPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(
      screen.getByText(/Revisa y aprueba contenido creado por profesores/)
    ).toBeInTheDocument();
  });

  it('renders content management features', () => {
    renderWithAuth(<AdminContentPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(
      screen.getByText('Flashcards pendientes de aprobacion')
    ).toBeInTheDocument();
    expect(screen.getByText('Quizzes en revision')).toBeInTheDocument();
    expect(screen.getByText('Contenido de lectura')).toBeInTheDocument();
    expect(screen.getByText('Bulk approve/reject')).toBeInTheDocument();
    expect(screen.getByText('Historial de cambios')).toBeInTheDocument();
  });

  // ── Content Verification ───────────────────────────────

  it('displays all content management features', () => {
    renderWithAuth(<AdminContentPage />, {
      authOverrides: defaultAuthOverrides,
    });

    const features = [
      'Flashcards pendientes de aprobacion',
      'Quizzes en revision',
      'Contenido de lectura',
      'Bulk approve/reject',
      'Historial de cambios',
    ];

    features.forEach((feature) => {
      expect(screen.getByText(feature)).toBeInTheDocument();
    });
  });

  it('displays backend route references for content operations', () => {
    renderWithAuth(<AdminContentPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText('GET /server/content/:courseId')).toBeInTheDocument();
    expect(screen.getByText('PUT /server/content/:courseId/:key')).toBeInTheDocument();
  });

  // ── Content Type Specific Tests ────────────────────────

  it('mentions flashcards as approval-required content', () => {
    renderWithAuth(<AdminContentPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(
      screen.getByText('Flashcards pendientes de aprobacion')
    ).toBeInTheDocument();
  });

  it('mentions quizzes in the revision workflow', () => {
    renderWithAuth(<AdminContentPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText('Quizzes en revision')).toBeInTheDocument();
  });

  it('mentions bulk operations capability', () => {
    renderWithAuth(<AdminContentPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText('Bulk approve/reject')).toBeInTheDocument();
  });

  // ── Context Display ────────────────────────────────────

  it('shows admin user information in context card', () => {
    renderWithAuth(<AdminContentPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
  });

  it('displays institution name in context card', () => {
    renderWithAuth(<AdminContentPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText('Test University')).toBeInTheDocument();
  });

  it('displays admin role in context card', () => {
    renderWithAuth(<AdminContentPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  // ── Auth Verification ─────────────────────────────────

  it('renders with admin role context', () => {
    const { authValue } = renderWithAuth(<AdminContentPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(authValue.role).toBe('admin');
  });

  it('renders icon for page identification', () => {
    const { container } = renderWithAuth(<AdminContentPage />, {
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
        email: 'content-admin@test.com',
        name: 'Content Admin',
      },
      role: 'admin',
      activeMembership: {
        institution: { name: 'Test University' },
        role: 'admin',
      },
    });
    renderWithAuth(<AdminContentPage />);
    expect(screen.getByText('Content Admin')).toBeInTheDocument();
    expect(screen.getByText('content-admin@test.com')).toBeInTheDocument();
  });

  it('maintains proper layout and styling', () => {
    const { container } = renderWithAuth(<AdminContentPage />, {
      authOverrides: defaultAuthOverrides,
    });
    const mainContainer = container.querySelector('[class*="max-w-4xl"]');
    expect(mainContainer).toBeInTheDocument();
  });

  // ── Approval Workflow Indication ───────────────────────

  it('indicates approval workflow in features', () => {
    renderWithAuth(<AdminContentPage />, {
      authOverrides: defaultAuthOverrides,
    });
    // Check for approval-related terms
    expect(screen.getByText(/aprobacion/)).toBeInTheDocument();
    expect(screen.getByText(/revision/)).toBeInTheDocument();
    expect(screen.getByText(/approve/)).toBeInTheDocument();
  });

  it('shows history tracking capability', () => {
    renderWithAuth(<AdminContentPage />, {
      authOverrides: defaultAuthOverrides,
    });
    expect(screen.getByText('Historial de cambios')).toBeInTheDocument();
  });
});
