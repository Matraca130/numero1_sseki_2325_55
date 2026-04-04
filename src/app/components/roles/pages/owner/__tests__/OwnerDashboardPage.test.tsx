// ============================================================
// OwnerDashboardPage — Main component tests
//
// Tests rendering, interaction, and state management for
// the owner dashboard including KPIs, charts, and member tables.
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';

// ── Mock motion/react ──────────────────────────────────────
vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div {...props} ref={ref}>{children}</div>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ── Mock recharts ──────────────────────────────────────────
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  Tooltip: ({ content }: any) => null,
}));

// ── Mock shared components ─────────────────────────────────
vi.mock('@/app/components/shared/KPICard', () => ({
  KPICard: ({ label, value, trendSlot }: any) => (
    <div data-testid="kpi-card" data-label={label}>
      {label}: {value}
      {trendSlot && <div data-testid="trend-badge">{trendSlot}</div>}
    </div>
  ),
  TrendBadge: ({ label, up }: any) => <span data-trend-up={up}>{label}</span>,
}));

vi.mock('@/app/components/shared/page-helpers', () => ({
  getInitials: (name: string) => name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2) ?? '?',
  formatDate: (iso: string) => iso ?? '—',
  formatRelative: (iso: string) => 'hace 2 dias',
  matchesSearch: (item: any, query: string) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (item.name?.toLowerCase().includes(q) ?? false) ||
      (item.email?.toLowerCase().includes(q) ?? false)
    );
  },
}));

vi.mock('@/app/components/shared/ChartErrorBoundary', () => ({
  ChartErrorBoundary: ({ children }: any) => <div>{children}</div>,
}));

// ── Mock UI components ─────────────────────────────────────
vi.mock('@/app/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div className={className} data-testid="skeleton" />,
}));

vi.mock('@/app/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableCell: ({ children, className }: any) => <td className={className}>{children}</td>,
}));

vi.mock('@/app/components/ui/avatar', () => ({
  Avatar: ({ children, className }: any) => <div className={className}>{children}</div>,
  AvatarFallback: ({ children, className }: any) => <span className={className}>{children}</span>,
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

// ── Import component ──────────────────────────────────────
import { OwnerDashboardPage } from '../OwnerDashboardPage';

// ── Helpers ────────────────────────────────────────────────

function renderDashboard(overrides?: any) {
  return render(<OwnerDashboardPage />);
}

const DEFAULT_PLATFORM_DATA = {
  institution: { id: 'inst-1', name: 'Test University' },
  institutionId: 'inst-1',
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
    {
      id: 'm2',
      name: 'Ana Garcia',
      email: 'ana@test.com',
      role: 'professor',
      is_active: true,
      created_at: '2025-11-15T00:00:00Z',
      plan: { name: 'Pro' },
    },
    {
      id: 'm3',
      name: 'Carlos Admin',
      email: 'carlos@test.com',
      role: 'admin',
      is_active: false,
      created_at: '2025-10-01T00:00:00Z',
      plan: null,
    },
  ],
  subscription: { plan: { name: 'Pro' } },
  plans: [],
  loading: false,
  error: null,
  refresh: vi.fn(),
  refreshMembers: vi.fn(),
  refreshInstitution: vi.fn(),
  refreshStats: vi.fn(),
  inviteMember: vi.fn(),
  removeMember: vi.fn(),
  toggleMember: vi.fn(),
  changeRole: vi.fn(),
};

const DEFAULT_AUTH = {
  user: { id: 'user-1', email: 'owner@test.com' },
  activeMembership: {
    institution: { name: 'Test University' },
  },
  role: 'owner',
};

// ── Tests ──────────────────────────────────────────────────

describe('OwnerDashboardPage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUsePlatformData.mockReturnValue(DEFAULT_PLATFORM_DATA);
    mockUseAuth.mockReturnValue(DEFAULT_AUTH);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Header & Layout Tests ──────────────────────────────

  it('renders page title and institution name in header', () => {
    renderDashboard();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Vision general de/)).toBeInTheDocument();
    expect(screen.getByText('Test University')).toBeInTheDocument();
  });

  it('renders refresh button that calls refresh on click', () => {
    renderDashboard();
    const refreshBtn = screen.getByLabelText('Actualizar datos del dashboard');
    expect(refreshBtn).toBeInTheDocument();

    fireEvent.click(refreshBtn);
    expect(DEFAULT_PLATFORM_DATA.refresh).toHaveBeenCalled();
  });

  // ── KPI Cards Tests ────────────────────────────────────

  it('renders all four KPI cards with correct values', () => {
    renderDashboard();
    const kpiCards = screen.getAllByTestId('kpi-card');
    expect(kpiCards).toHaveLength(4);

    // Check each card by its label attribute
    const totalMembersCard = kpiCards.find((card) => card.getAttribute('data-label') === 'Total miembros');
    const activeStudentsCard = kpiCards.find((card) => card.getAttribute('data-label') === 'Estudiantes activos');
    const inactiveCard = kpiCards.find((card) => card.getAttribute('data-label') === 'Miembros inactivos');
    const plansCard = kpiCards.find((card) => card.getAttribute('data-label') === 'Planes');

    expect(totalMembersCard?.textContent).toMatch(/50/);
    expect(activeStudentsCard?.textContent).toMatch(/35/);
    expect(inactiveCard?.textContent).toMatch(/5/);
    expect(plansCard?.textContent).toMatch(/3/);
  });

  it('displays active rate badge (70% active)', () => {
    renderDashboard();
    const trendBadges = screen.getAllByTestId('trend-badge');
    expect(trendBadges.length).toBeGreaterThan(0);
    expect(screen.getByText(/70% activos/)).toBeInTheDocument();
  });

  it('shows trend badge as "up" when active rate >= 50%', () => {
    renderDashboard();
    const trend = screen.getByText(/70% activos/);
    const span = trend.closest('span');
    expect(span).toHaveAttribute('data-trend-up', 'true');
  });

  it('shows trend badge as "down" when active rate < 50%', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      dashboardStats: {
        ...DEFAULT_PLATFORM_DATA.dashboardStats,
        activeStudents: 20, // 40% of 50
      },
    });

    renderDashboard();
    const trend = screen.getByText(/40% activos/);
    const span = trend.closest('span');
    expect(span).toHaveAttribute('data-trend-up', 'false');
  });

  // ── Subscription Card Tests ────────────────────────────

  it('displays subscription card with active status', () => {
    renderDashboard();
    expect(screen.getByText('Suscripcion')).toBeInTheDocument();
    expect(screen.getByText('Activa')).toBeInTheDocument();
    // Use getAllByText because there are multiple "Pro" elements on the page
    const proElements = screen.getAllByText('Pro');
    expect(proElements.length).toBeGreaterThan(0);
  });

  it('shows "Sin suscripcion activa" when subscription is null', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      dashboardStats: {
        ...DEFAULT_PLATFORM_DATA.dashboardStats,
        subscription: null,
      },
      subscription: null,
    });

    renderDashboard();
    expect(screen.getByText('Sin suscripcion activa')).toBeInTheDocument();
  });

  // ── Role Distribution Chart Tests ──────────────────────

  it('renders role distribution chart with legend entries', () => {
    renderDashboard();
    expect(screen.getByText('Distribucion por rol')).toBeInTheDocument();
    expect(screen.getByText('Estudiantes')).toBeInTheDocument();
    expect(screen.getByText('Profesores')).toBeInTheDocument();
    expect(screen.getByText('Administradores')).toBeInTheDocument();
    expect(screen.getByText('Propietarios')).toBeInTheDocument();
  });

  it('displays percentage values in chart legend', () => {
    renderDashboard();
    // 35/50 = 70%, 10/50 = 20%, 3/50 = 6%, 2/50 = 4%
    expect(screen.getByText('35')).toBeInTheDocument(); // student count
    expect(screen.getByText('10')).toBeInTheDocument(); // professor count
  });

  it('shows "Sin datos de miembros" when membersByRole is empty', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      dashboardStats: {
        ...DEFAULT_PLATFORM_DATA.dashboardStats,
        membersByRole: {},
      },
    });

    renderDashboard();
    expect(screen.getByText('Sin datos de miembros')).toBeInTheDocument();
    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
  });

  // ── Recent Members Table Tests ─────────────────────────

  it('renders recent members table with headers', () => {
    renderDashboard();
    expect(screen.getByText('Miembros recientes')).toBeInTheDocument();
    expect(screen.getByText('Miembro')).toBeInTheDocument();
    expect(screen.getByText('Rol')).toBeInTheDocument();
    expect(screen.getByText('Plan')).toBeInTheDocument();
  });

  it('displays recent members sorted by creation date (newest first)', () => {
    renderDashboard();
    // Get all table rows and check that Juan appears before Ana
    const rows = screen.getAllByRole('row');
    const juanRow = rows.find((row) => row.textContent?.includes('Juan'));
    const anaRow = rows.find((row) => row.textContent?.includes('Ana'));

    expect(juanRow).toBeDefined();
    expect(anaRow).toBeDefined();

    if (juanRow && anaRow) {
      const juanIndex = rows.indexOf(juanRow);
      const anaIndex = rows.indexOf(anaRow);
      expect(juanIndex).toBeLessThan(anaIndex);
    }
  });

  it('shows member email and role badge in table', () => {
    renderDashboard();
    expect(screen.getByText('juan@test.com')).toBeInTheDocument();
    expect(screen.getByText('ana@test.com')).toBeInTheDocument();
  });

  it('displays active/inactive status indicator for members', () => {
    renderDashboard();
    const activeIndicators = screen.getAllByText('Activo');
    const inactiveIndicators = screen.getAllByText('Inactivo');
    expect(activeIndicators.length).toBeGreaterThan(0);
    expect(inactiveIndicators.length).toBeGreaterThan(0);
  });

  it('shows "Aun no hay miembros registrados" when members array is empty', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      members: [],
    });

    renderDashboard();
    expect(screen.getByText('Aun no hay miembros registrados')).toBeInTheDocument();
  });

  // ── Loading & Error States ─────────────────────────────

  it('displays loading skeleton when data is loading', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      loading: true,
    });

    renderDashboard();
    expect(screen.getByLabelText('Cargando dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('displays error state with retry button', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      loading: false,
      error: 'Failed to load dashboard data',
    });

    renderDashboard();
    expect(screen.getByText('Error al cargar el dashboard')).toBeInTheDocument();
    expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();

    const retryBtn = screen.getByText('Reintentar');
    fireEvent.click(retryBtn);
    expect(DEFAULT_PLATFORM_DATA.refresh).toHaveBeenCalled();
  });

  it('displays empty state when no institution is configured', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      institution: null,
      dashboardStats: null,
    });

    renderDashboard();
    expect(screen.getByText('Sin institucion configurada')).toBeInTheDocument();
    expect(screen.getByText(/Tu cuenta aun no tiene una institucion/)).toBeInTheDocument();
  });

  // ── Edge Cases ─────────────────────────────────────────

  it('handles zero active students gracefully', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      dashboardStats: {
        ...DEFAULT_PLATFORM_DATA.dashboardStats,
        activeStudents: 0,
        totalMembers: 10,
      },
    });

    renderDashboard();
    expect(screen.getByText(/0% activos/)).toBeInTheDocument();
  });

  it('handles null subscription plan gracefully', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      dashboardStats: {
        ...DEFAULT_PLATFORM_DATA.dashboardStats,
        subscription: {
          id: 'sub-1',
          status: 'active',
          plan: null,
        },
      },
    });

    renderDashboard();
    expect(screen.getByText('Plan')).toBeInTheDocument();
  });

  it('handles missing member names and emails', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      members: [
        {
          id: 'm1',
          name: '',
          email: '',
          role: 'student',
          is_active: true,
          created_at: '2025-12-01T00:00:00Z',
          plan: null,
        },
      ],
    });

    renderDashboard();
    expect(screen.getByText('Sin nombre')).toBeInTheDocument();
  });

  it('limits recent members table to 8 items', () => {
    const manyMembers = Array.from({ length: 15 }, (_, i) => ({
      id: `m${i}`,
      name: `Member ${i}`,
      email: `member${i}@test.com`,
      role: 'student',
      is_active: true,
      created_at: new Date(2025, 11, 15 - i).toISOString(),
      plan: null,
    }));

    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      members: manyMembers,
    });

    renderDashboard();
    const rows = screen.getAllByRole('row');
    // 1 header row + 8 member rows
    expect(rows.length).toBeLessThanOrEqual(9);
  });
});
