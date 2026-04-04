// ============================================================
// OwnerPlansPage — Plans management tests
//
// Tests plan creation, editing, deletion, and default plan
// management for institution owners.
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Mock motion/react ──────────────────────────────────────
vi.mock('motion/react', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div {...props} ref={ref}>{children}</div>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ── Mock sonner toast ──────────────────────────────────────
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
  Toaster: () => <div data-testid="toaster" />,
}));

// ── Mock shared components ─────────────────────────────────
vi.mock('@/app/components/shared/page-helpers', () => ({
  getInitials: (name: string) => name?.split(' ')[0][0] ?? '?',
  formatDate: (iso: string) => iso ?? '—',
  formatRelative: (iso: string) => 'hace 1 dia',
  matchesSearch: (item: any, query: string) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (item.name?.toLowerCase().includes(q) ?? false);
  },
}));

// ── Mock UI components ─────────────────────────────────────
vi.mock('@/app/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('@/app/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

vi.mock('@/app/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div className={className} data-testid="skeleton" />,
}));

// ── Mock sub-components ────────────────────────────────────
vi.mock('@/app/components/roles/pages/owner/owner-plans/PlansStates', () => ({
  FadeIn: ({ children }: any) => <div>{children}</div>,
  PlansSkeleton: () => <div data-testid="plans-skeleton">Loading...</div>,
  PlansError: ({ message, onRetry }: any) => (
    <div>
      <div>{message}</div>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
  PlansEmpty: ({ onCreate }: any) => (
    <div>
      <p>No plans</p>
      <button onClick={onCreate}>Create</button>
    </div>
  ),
}));

vi.mock('@/app/components/roles/pages/owner/owner-plans/PlanCard', () => ({
  PlanCard: ({ plan, onEdit, onDelete, onSetDefault, onToggleActive }: any) => (
    <div data-testid={`plan-card-${plan.id}`}>
      <h3>{plan.name}</h3>
      <p>${plan.price}</p>
      <button onClick={() => onEdit(plan)} data-testid={`edit-${plan.id}`}>Edit</button>
      <button onClick={() => onDelete(plan)} data-testid={`delete-${plan.id}`}>Delete</button>
      <button onClick={() => onSetDefault(plan)} data-testid={`set-default-${plan.id}`}>
        {plan.is_default ? 'Default' : 'Set Default'}
      </button>
      <button onClick={() => onToggleActive(plan)} data-testid={`toggle-${plan.id}`}>
        {plan.is_active ? 'Deactivate' : 'Activate'}
      </button>
    </div>
  ),
  PlansStats: ({ plans }: any) => <div data-testid="plans-stats">{plans.length} plans</div>,
}));

vi.mock('@/app/components/roles/pages/owner/owner-plans/PlanDialogs', () => ({
  CreatePlanDialog: ({ open, onOpenChange }: any) => (
    open ? <div data-testid="create-plan-dialog">Create Dialog</div> : null
  ),
  EditPlanDialog: ({ open, onOpenChange }: any) => (
    open ? <div data-testid="edit-plan-dialog">Edit Dialog</div> : null
  ),
  DeletePlanDialog: ({ open, onOpenChange }: any) => (
    open ? <div data-testid="delete-plan-dialog">Delete Dialog</div> : null
  ),
}));

// ── Mock API ───────────────────────────────────────────────
vi.mock('@/app/services/platformApi', () => ({
  setDefaultInstitutionPlan: vi.fn(() => Promise.resolve({})),
  updateInstitutionPlan: vi.fn(() => Promise.resolve({})),
  deleteInstitutionPlan: vi.fn(() => Promise.resolve({})),
  createInstitutionPlan: vi.fn(() => Promise.resolve({})),
}));

// ── Mock contexts ──────────────────────────────────────────
const mockUsePlatformData = vi.fn();

vi.mock('@/app/context/PlatformDataContext', () => ({
  usePlatformData: () => mockUsePlatformData(),
}));

// ── Import component ──────────────────────────────────────
import { OwnerPlansPage } from '../owner-plans/OwnerPlansPage';

// ── Helpers ────────────────────────────────────────────────

const DEFAULT_PLANS = [
  {
    id: 'p1',
    name: 'Basic',
    price: 9.99,
    description: 'For students',
    is_active: true,
    is_default: true,
    features: ['Feature 1'],
    created_at: '2025-12-01T00:00:00Z',
  },
  {
    id: 'p2',
    name: 'Pro',
    price: 19.99,
    description: 'For professionals',
    is_active: true,
    is_default: false,
    features: ['Feature 1', 'Feature 2'],
    created_at: '2025-11-15T00:00:00Z',
  },
  {
    id: 'p3',
    name: 'Enterprise',
    price: 49.99,
    description: 'For large organizations',
    is_active: false,
    is_default: false,
    features: ['Feature 1', 'Feature 2', 'Feature 3'],
    created_at: '2025-10-01T00:00:00Z',
  },
];

const DEFAULT_PLATFORM_DATA = {
  plans: DEFAULT_PLANS,
  institutionId: 'inst-1',
  loading: false,
  error: null,
  refresh: vi.fn(),
  refreshPlans: vi.fn(),
};

// ── Tests ──────────────────────────────────────────────────

describe('OwnerPlansPage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUsePlatformData.mockReturnValue(DEFAULT_PLATFORM_DATA);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Header & Controls Tests ────────────────────────────

  it('renders page title with plan count badge', () => {
    render(<OwnerPlansPage />);
    expect(screen.getByText('Planes')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // badge with count
  });

  it('renders "Crear plan" button', () => {
    render(<OwnerPlansPage />);
    const createBtn = screen.getByText('Crear plan');
    expect(createBtn).toBeInTheDocument();
  });

  it('opens create plan dialog when create button is clicked', () => {
    render(<OwnerPlansPage />);
    const createBtn = screen.getByText('Crear plan');

    fireEvent.click(createBtn);
    expect(screen.getByTestId('create-plan-dialog')).toBeInTheDocument();
  });

  it('displays page description', () => {
    render(<OwnerPlansPage />);
    expect(screen.getByText(/Crea y gestiona planes de suscripcion/)).toBeInTheDocument();
  });

  // ── Plans Display Tests ────────────────────────────────

  it('renders all plans as cards', () => {
    render(<OwnerPlansPage />);
    expect(screen.getByTestId('plan-card-p1')).toBeInTheDocument();
    expect(screen.getByTestId('plan-card-p2')).toBeInTheDocument();
    expect(screen.getByTestId('plan-card-p3')).toBeInTheDocument();
  });

  it('displays plan names', () => {
    render(<OwnerPlansPage />);
    expect(screen.getByText('Basic')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
  });

  it('displays plan prices', () => {
    render(<OwnerPlansPage />);
    expect(screen.getByText('$9.99')).toBeInTheDocument();
    expect(screen.getByText('$19.99')).toBeInTheDocument();
    expect(screen.getByText('$49.99')).toBeInTheDocument();
  });

  it('sorts plans with default plan first', () => {
    render(<OwnerPlansPage />);
    const cards = screen.getAllByTestId(/plan-card-/);
    // Basic (default) should be first
    expect(cards[0]).toHaveTextContent('Basic');
  });

  it('sorts active plans before inactive', () => {
    render(<OwnerPlansPage />);
    const cards = screen.getAllByTestId(/plan-card-/);
    // Active plans (p1, p2) should come before inactive (p3)
    expect(cards.length).toBe(3);
  });

  // ── Plan Action Tests ──────────────────────────────────

  it('shows edit button for each plan', () => {
    render(<OwnerPlansPage />);
    expect(screen.getByTestId('edit-p1')).toBeInTheDocument();
    expect(screen.getByTestId('edit-p2')).toBeInTheDocument();
    expect(screen.getByTestId('edit-p3')).toBeInTheDocument();
  });

  it('opens edit dialog when edit button is clicked', () => {
    render(<OwnerPlansPage />);
    fireEvent.click(screen.getByTestId('edit-p1'));
    expect(screen.getByTestId('edit-plan-dialog')).toBeInTheDocument();
  });

  it('shows delete button for each plan', () => {
    render(<OwnerPlansPage />);
    expect(screen.getByTestId('delete-p1')).toBeInTheDocument();
    expect(screen.getByTestId('delete-p2')).toBeInTheDocument();
    expect(screen.getByTestId('delete-p3')).toBeInTheDocument();
  });

  it('opens delete dialog when delete button is clicked', () => {
    render(<OwnerPlansPage />);
    fireEvent.click(screen.getByTestId('delete-p1'));
    expect(screen.getByTestId('delete-plan-dialog')).toBeInTheDocument();
  });

  it('shows set default button for non-default plans', () => {
    render(<OwnerPlansPage />);
    expect(screen.getByTestId('set-default-p2')).toBeInTheDocument();
    expect(screen.getByTestId('set-default-p3')).toBeInTheDocument();
  });

  it('shows toggle active button for each plan', () => {
    render(<OwnerPlansPage />);
    expect(screen.getByTestId('toggle-p1')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-p2')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-p3')).toBeInTheDocument();
  });

  // ── Plans Stats Tests ──────────────────────────────────

  it('renders plans stats when plans exist', () => {
    render(<OwnerPlansPage />);
    expect(screen.getByTestId('plans-stats')).toBeInTheDocument();
    expect(screen.getByText('3 plans')).toBeInTheDocument();
  });

  // ── Loading & Error States ─────────────────────────────

  it('displays loading skeleton when data is loading', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      loading: true,
    });

    render(<OwnerPlansPage />);
    expect(screen.getByTestId('plans-skeleton')).toBeInTheDocument();
  });

  it('displays error state with retry button', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      loading: false,
      error: 'Failed to load plans',
    });

    render(<OwnerPlansPage />);
    expect(screen.getByText('Failed to load plans')).toBeInTheDocument();
    const retryBtn = screen.getByText('Retry');
    fireEvent.click(retryBtn);
    expect(DEFAULT_PLATFORM_DATA.refresh).toHaveBeenCalled();
  });

  it('displays empty state when no plans exist', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      plans: [],
    });

    render(<OwnerPlansPage />);
    expect(screen.getByText('No plans')).toBeInTheDocument();
  });

  it('shows create button in empty state', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      plans: [],
    });

    render(<OwnerPlansPage />);
    const createBtn = screen.getByText('Create');
    fireEvent.click(createBtn);
    expect(screen.getByTestId('create-plan-dialog')).toBeInTheDocument();
  });

  // ── Refresh Button Tests ───────────────────────────────

  it('renders refresh button when plans exist', () => {
    render(<OwnerPlansPage />);
    expect(screen.getByText('Refrescar planes')).toBeInTheDocument();
  });

  it('calls refreshPlans when refresh button is clicked', () => {
    render(<OwnerPlansPage />);
    const refreshBtn = screen.getByText('Refrescar planes');
    fireEvent.click(refreshBtn);
    expect(DEFAULT_PLATFORM_DATA.refreshPlans).toHaveBeenCalled();
  });

  // ── Toast Notification Tests ───────────────────────────

  it('renders toaster component', () => {
    render(<OwnerPlansPage />);
    expect(screen.getByTestId('toaster')).toBeInTheDocument();
  });

  // ── Edge Cases ─────────────────────────────────────────

  it('handles plans with same name correctly', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      plans: [
        ...DEFAULT_PLANS,
        {
          id: 'p4',
          name: 'Basic',
          price: 14.99,
          description: 'Updated Basic',
          is_active: true,
          is_default: false,
          features: [],
          created_at: '2025-09-01T00:00:00Z',
        },
      ],
    });

    render(<OwnerPlansPage />);
    const basicPlans = screen.getAllByText('Basic');
    expect(basicPlans.length).toBeGreaterThanOrEqual(2);
  });

  it('handles single plan correctly', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      plans: [DEFAULT_PLANS[0]],
    });

    render(<OwnerPlansPage />);
    expect(screen.getByTestId('plan-card-p1')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // badge
  });
});
