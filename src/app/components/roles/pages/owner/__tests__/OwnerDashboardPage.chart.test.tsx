// ============================================================
// OwnerDashboardPage — ChartErrorBoundary integration tests
//
// Verifies that the RoleDistributionChart (internal component):
//   1. Renders the PieChart when membersByRole has data
//   2. Shows "Sin datos de miembros" when membersByRole is empty
//   3. Shows fallback "Grafico no disponible" when recharts throws
// ============================================================

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock recharts ──────────────────────────────────────────
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Tooltip: ({ content }: any) => null,
}));

// ── Mock motion/react ──────────────────────────────────────
vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div {...props} ref={ref}>{children}</div>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ── Mock design system ─────────────────────────────────────
vi.mock('@/app/design-system', () => ({
  headingStyle: {},
  bodyStyle: {},
  components: {
    chartCard: { base: '' },
    kpiCard: {
      iconBg: '',
      trend: { up: '', down: '' },
    },
    icon: { default: { bg: '', text: '' } },
  },
  colors: { chart: { flashcards: '#14b8a6', videos: '#06b6d4' } },
  kpiCardClasses: () => '',
  iconBadgeClasses: () => '',
}));

// ── Mock shared page-helpers ───────────────────────────────
vi.mock('@/app/components/shared/page-helpers', () => ({
  getInitials: (name: string) => name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2) ?? '?',
  formatDate: (iso: string) => iso ?? '\u2014',
  formatRelative: (iso: string) => 'hace 2 dias',
}));

// ── Mock KPICard ───────────────────────────────────────────
vi.mock('@/app/components/shared/KPICard', () => ({
  KPICard: ({ label, value }: any) => <div data-testid="kpi-card">{label}: {value}</div>,
  TrendBadge: ({ label }: any) => <span>{label}</span>,
}));

// ── Mock Skeleton ──────────────────────────────────────────
vi.mock('@/app/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div className={className} data-testid="skeleton" />,
}));

// ── Mock Table components ──────────────────────────────────
vi.mock('@/app/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableCell: ({ children }: any) => <td>{children}</td>,
}));

// ── Mock Avatar components ─────────────────────────────────
vi.mock('@/app/components/ui/avatar', () => ({
  Avatar: ({ children }: any) => <div>{children}</div>,
  AvatarFallback: ({ children }: any) => <span>{children}</span>,
}));

// ── Mock contexts ──────────────────────────────────────────
const mockUsePlatformData = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/app/context/PlatformDataContext', () => ({
  usePlatformData: () => mockUsePlatformData(),
}));

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// ── Import component under test ────────────────────────────
import { OwnerDashboardPage } from '../OwnerDashboardPage';
import { ChartErrorBoundary } from '@/app/components/shared/ChartErrorBoundary';

// ── Default mock data ──────────────────────────────────────
const DEFAULT_PLATFORM_DATA = {
  institution: { id: 'inst-1', name: 'Test University' },
  dashboardStats: {
    totalMembers: 50,
    activeStudents: 35,
    inactiveMembers: 5,
    totalPlans: 3,
    membersByRole: {
      owner: 2,
      admin: 3,
      professor: 10,
      student: 35,
    },
    subscription: {
      id: 'sub-1',
      status: 'active',
      plan: { name: 'Pro', slug: 'pro' },
    },
  },
  members: [
    {
      id: 'm1',
      name: 'Juan Perez',
      email: 'juan@test.com',
      role: 'student',
      is_active: true,
      created_at: '2025-12-01T00:00:00Z',
      plan: { name: 'Pro' },
    },
  ],
  subscription: { plan: { name: 'Pro' } },
  loading: false,
  error: null,
  refresh: vi.fn(),
};

const DEFAULT_AUTH = {
  activeMembership: {
    institution: { name: 'Test University' },
  },
};

// ── A component that always throws during render ───────────
function ThrowingChart() {
  throw new Error('Recharts insertBefore crash');
  return null; // eslint-disable-line no-unreachable
}

// ── Tests ──────────────────────────────────────────────────

describe('OwnerDashboardPage — RoleDistributionChart integration', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUsePlatformData.mockReturnValue(DEFAULT_PLATFORM_DATA);
    mockUseAuth.mockReturnValue(DEFAULT_AUTH);
  });

  it('renders the PieChart when membersByRole has data', () => {
    render(<OwnerDashboardPage />);

    // The role distribution chart section should be visible
    expect(screen.getByText('Distribucion por rol')).toBeInTheDocument();

    // The pie chart should render via our mock
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();

    // Legend entries should appear
    expect(screen.getByText('Estudiantes')).toBeInTheDocument();
    expect(screen.getByText('Profesores')).toBeInTheDocument();
    expect(screen.getByText('Administradores')).toBeInTheDocument();
    expect(screen.getByText('Propietarios')).toBeInTheDocument();
  });

  it('shows "Sin datos de miembros" when membersByRole is empty', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      dashboardStats: {
        ...DEFAULT_PLATFORM_DATA.dashboardStats,
        membersByRole: {},
      },
    });

    render(<OwnerDashboardPage />);

    expect(screen.getByText('Sin datos de miembros')).toBeInTheDocument();
    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
  });

  it('shows "Sin datos de miembros" when all roles have zero members', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      dashboardStats: {
        ...DEFAULT_PLATFORM_DATA.dashboardStats,
        membersByRole: { owner: 0, admin: 0, professor: 0, student: 0 },
      },
    });

    render(<OwnerDashboardPage />);

    expect(screen.getByText('Sin datos de miembros')).toBeInTheDocument();
    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
  });

  it('shows fallback when PieChart crashes (ChartErrorBoundary catches)', () => {
    // Test ChartErrorBoundary directly with the same height as in the component
    render(
      <ChartErrorBoundary height="100%">
        <ThrowingChart />
      </ChartErrorBoundary>,
    );

    expect(screen.getByText('Grafico no disponible')).toBeInTheDocument();
    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
  });

  it('shows loading skeleton when data is loading', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      loading: true,
    });

    render(<OwnerDashboardPage />);

    expect(screen.getByLabelText('Cargando dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Distribucion por rol')).not.toBeInTheDocument();
  });

  it('shows error state when context has an error', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      loading: false,
      error: 'Failed to load',
    });

    render(<OwnerDashboardPage />);

    expect(screen.getByText('Error al cargar el dashboard')).toBeInTheDocument();
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });
});
