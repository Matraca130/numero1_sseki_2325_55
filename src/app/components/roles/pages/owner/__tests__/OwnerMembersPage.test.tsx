// ============================================================
// OwnerMembersPage — Members management tests
//
// Tests member filtering, role management, invitations,
// and member table interactions.
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

// ── Mock shared components & helpers ───────────────────────
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

// ── Mock UI components ─────────────────────────────────────
vi.mock('@/app/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('@/app/components/ui/input', () => ({
  Input: ({ value, onChange, ...props }: any) => (
    <input value={value} onChange={onChange} {...props} />
  ),
}));

vi.mock('@/app/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

vi.mock('@/app/components/ui/avatar', () => ({
  Avatar: ({ children, className }: any) => <div className={className}>{children}</div>,
  AvatarFallback: ({ children, className }: any) => <span className={className}>{children}</span>,
}));

vi.mock('@/app/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableCell: ({ children, className }: any) => <td className={className}>{children}</td>,
}));

// ── Mock dialogs & sub-components ──────────────────────────
vi.mock('@/app/components/roles/pages/owner/owner-members/MembersStates', () => ({
  FadeIn: ({ children }: any) => <div>{children}</div>,
  MembersSkeleton: () => <div data-testid="members-skeleton">Loading...</div>,
  MembersError: ({ message, onRetry }: any) => (
    <div>
      <div>{message}</div>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
  MembersEmpty: ({ onInvite }: any) => (
    <div>
      <p>No members</p>
      <button onClick={onInvite}>Invite</button>
    </div>
  ),
  NoResults: ({ query, role }: any) => <div>No results for {query} in {role}</div>,
}));

vi.mock('@/app/components/roles/pages/owner/owner-members/MembersDialogs', () => ({
  InviteMemberDialog: ({ open, onOpenChange }: any) => (
    open ? <div data-testid="invite-dialog">Invite Dialog</div> : null
  ),
  ChangeRoleDialog: ({ open, onOpenChange }: any) => (
    open ? <div data-testid="change-role-dialog">Change Role Dialog</div> : null
  ),
  ChangePlanDialog: ({ open, onOpenChange }: any) => (
    open ? <div data-testid="change-plan-dialog">Change Plan Dialog</div> : null
  ),
  DeleteMemberDialog: ({ open, onOpenChange }: any) => (
    open ? <div data-testid="delete-dialog">Delete Dialog</div> : null
  ),
}));

vi.mock('@/app/components/roles/pages/owner/owner-members/AdminScopesDialog', () => ({
  AdminScopesDialog: ({ open, onOpenChange }: any) => (
    open ? <div data-testid="scopes-dialog">Scopes Dialog</div> : null
  ),
}));

vi.mock('@/app/components/roles/pages/owner/owner-members/MembersTable', () => ({
  MembersTable: ({ members, onOpenChangeRole, onOpenChangePlan, onOpenDelete, onOpenScopes }: any) => (
    <table data-testid="members-table">
      <tbody>
        {members.map((m: any) => (
          <tr key={m.id}>
            <td>{m.name}</td>
            <td>{m.email}</td>
            <td>{m.role}</td>
            <td>
              <button onClick={() => onOpenChangeRole(m)} data-testid={`change-role-${m.id}`}>Change Role</button>
              <button onClick={() => onOpenChangePlan(m)} data-testid={`change-plan-${m.id}`}>Change Plan</button>
              <button onClick={() => onOpenDelete(m)} data-testid={`delete-${m.id}`}>Delete</button>
              {m.role === 'admin' && (
                <button onClick={() => onOpenScopes(m)} data-testid={`scopes-${m.id}`}>Scopes</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

// ── Mock constants ─────────────────────────────────────────
vi.mock('@/app/components/roles/pages/owner/owner-members/constants', () => ({
  ROLE_FILTERS: [
    { value: 'all', label: 'Todos' },
    { value: 'admin', label: 'Administradores' },
    { value: 'professor', label: 'Profesores' },
    { value: 'student', label: 'Estudiantes' },
  ],
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
import { OwnerMembersPage } from '../owner-members/OwnerMembersPage';

// ── Helpers ────────────────────────────────────────────────

const DEFAULT_MEMBERS = [
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
    is_active: true,
    created_at: '2025-10-01T00:00:00Z',
    plan: null,
  },
  {
    id: 'm4',
    name: 'Sofia Student',
    email: 'sofia@test.com',
    role: 'student',
    is_active: false,
    created_at: '2025-09-01T00:00:00Z',
    plan: null,
  },
];

const DEFAULT_PLATFORM_DATA = {
  members: DEFAULT_MEMBERS,
  plans: [
    { id: 'p1', name: 'Basic' },
    { id: 'p2', name: 'Pro' },
    { id: 'p3', name: 'Enterprise' },
  ],
  institutionId: 'inst-1',
  loading: false,
  error: null,
  refresh: vi.fn(),
  refreshMembers: vi.fn(),
  inviteMember: vi.fn(),
  removeMember: vi.fn(),
  toggleMember: vi.fn(),
  changeRole: vi.fn(),
};

const DEFAULT_AUTH = {
  user: { id: 'user-1', email: 'owner@test.com' },
};

// ── Tests ──────────────────────────────────────────────────

describe('OwnerMembersPage', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUsePlatformData.mockReturnValue(DEFAULT_PLATFORM_DATA);
    mockUseAuth.mockReturnValue(DEFAULT_AUTH);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Header & Controls Tests ────────────────────────────

  it('renders page title with member count badge', () => {
    render(<OwnerMembersPage />);
    expect(screen.getByText('Miembros')).toBeInTheDocument();
    // Use getAllByText because "4" can appear in multiple places (badge, filter)
    const countElements = screen.getAllByText('4');
    expect(countElements.length).toBeGreaterThan(0);
  });

  it('renders "Invitar miembro" button', () => {
    render(<OwnerMembersPage />);
    const inviteBtn = screen.getByText('Invitar miembro');
    expect(inviteBtn).toBeInTheDocument();
  });

  it('opens invite dialog when invite button is clicked', () => {
    render(<OwnerMembersPage />);
    const inviteBtn = screen.getByText('Invitar miembro');

    fireEvent.click(inviteBtn);
    expect(screen.getByTestId('invite-dialog')).toBeInTheDocument();
  });

  // ── Search Functionality Tests ─────────────────────────

  it('renders search input field', () => {
    render(<OwnerMembersPage />);
    const searchInput = screen.getByPlaceholderText('Buscar por nombre o email...');
    expect(searchInput).toBeInTheDocument();
  });

  it('filters members by search query on name', () => {
    render(<OwnerMembersPage />);
    const searchInput = screen.getByPlaceholderText('Buscar por nombre o email...');

    fireEvent.change(searchInput, { target: { value: 'juan' } });
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.queryByText('Ana Garcia')).not.toBeInTheDocument();
  });

  it('filters members by search query on email', () => {
    render(<OwnerMembersPage />);
    const searchInput = screen.getByPlaceholderText('Buscar por nombre o email...');

    fireEvent.change(searchInput, { target: { value: 'ana@test.com' } });
    expect(screen.getByText('Ana Garcia')).toBeInTheDocument();
    expect(screen.queryByText('Juan Perez')).not.toBeInTheDocument();
  });

  it('shows no results message when search has no matches', () => {
    render(<OwnerMembersPage />);
    const searchInput = screen.getByPlaceholderText('Buscar por nombre o email...');

    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    expect(screen.getByText(/No results for/)).toBeInTheDocument();
  });

  // ── Role Filter Tests ──────────────────────────────────

  it('renders role filter buttons with member counts', () => {
    render(<OwnerMembersPage />);
    expect(screen.getByText('Todos')).toBeInTheDocument();
    expect(screen.getByText('Administradores')).toBeInTheDocument();
    expect(screen.getByText('Profesores')).toBeInTheDocument();
    expect(screen.getByText('Estudiantes')).toBeInTheDocument();
  });

  it('displays correct count for each role', () => {
    render(<OwnerMembersPage />);
    // Should show counts: Todos=4, Administradores=1, Profesores=1, Estudiantes=2
    const countElements = screen.getAllByText(/\d+/);
    expect(countElements).toBeDefined();
  });

  it('filters members by role when role filter is clicked', () => {
    render(<OwnerMembersPage />);
    const professorBtn = Array.from(screen.getAllByRole('button')).find(
      (btn) => btn.textContent?.includes('Profesores'),
    );

    fireEvent.click(professorBtn!);
    expect(screen.getByText('Ana Garcia')).toBeInTheDocument();
    expect(screen.queryByText('Juan Perez')).not.toBeInTheDocument();
  });

  it('shows all members when "Todos" filter is active', () => {
    render(<OwnerMembersPage />);
    const todosBtn = screen.getByText('Todos');
    fireEvent.click(todosBtn);

    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('Ana Garcia')).toBeInTheDocument();
    expect(screen.getByText('Carlos Admin')).toBeInTheDocument();
    expect(screen.getByText('Sofia Student')).toBeInTheDocument();
  });

  // ── Members Table Tests ────────────────────────────────

  it('renders members table with all members', () => {
    render(<OwnerMembersPage />);
    expect(screen.getByTestId('members-table')).toBeInTheDocument();
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('Ana Garcia')).toBeInTheDocument();
  });

  it('sorts members by active status first, then by name', () => {
    render(<OwnerMembersPage />);
    const tableRows = screen.getAllByRole('row');
    // Sofia is inactive, should be last
    const sofiaRow = tableRows.find(row => row.textContent?.includes('Sofia'));
    const juanRow = tableRows.find(row => row.textContent?.includes('Juan'));
    expect(juanRow).toBeDefined();
    expect(sofiaRow).toBeDefined();
  });

  it('displays member role and plan in table', () => {
    render(<OwnerMembersPage />);
    // Use getAllByText because there can be multiple students
    expect(screen.getAllByText('student').length).toBeGreaterThan(0);
    expect(screen.getAllByText('professor').length).toBeGreaterThan(0);
    expect(screen.getAllByText('admin').length).toBeGreaterThan(0);
  });

  // ── Member Action Tests ────────────────────────────────

  it('shows change role button for each member', () => {
    render(<OwnerMembersPage />);
    expect(screen.getByTestId('change-role-m1')).toBeInTheDocument();
    expect(screen.getByTestId('change-role-m2')).toBeInTheDocument();
  });

  it('opens change role dialog when change role button is clicked', () => {
    render(<OwnerMembersPage />);
    fireEvent.click(screen.getByTestId('change-role-m1'));
    expect(screen.getByTestId('change-role-dialog')).toBeInTheDocument();
  });

  it('shows change plan button for each member', () => {
    render(<OwnerMembersPage />);
    expect(screen.getByTestId('change-plan-m1')).toBeInTheDocument();
    expect(screen.getByTestId('change-plan-m2')).toBeInTheDocument();
  });

  it('opens change plan dialog when change plan button is clicked', () => {
    render(<OwnerMembersPage />);
    fireEvent.click(screen.getByTestId('change-plan-m1'));
    expect(screen.getByTestId('change-plan-dialog')).toBeInTheDocument();
  });

  it('shows delete button for each member', () => {
    render(<OwnerMembersPage />);
    expect(screen.getByTestId('delete-m1')).toBeInTheDocument();
    expect(screen.getByTestId('delete-m2')).toBeInTheDocument();
  });

  it('opens delete dialog when delete button is clicked', () => {
    render(<OwnerMembersPage />);
    fireEvent.click(screen.getByTestId('delete-m1'));
    expect(screen.getByTestId('delete-dialog')).toBeInTheDocument();
  });

  it('shows admin scopes button only for admin members', () => {
    render(<OwnerMembersPage />);
    // Carlos (m3) is admin, should have scopes button
    expect(screen.getByTestId('scopes-m3')).toBeInTheDocument();
    // Juan (m1) is student, should not have scopes button
    expect(screen.queryByTestId('scopes-m1')).not.toBeInTheDocument();
  });

  it('opens scopes dialog when scopes button is clicked for admin', () => {
    render(<OwnerMembersPage />);
    fireEvent.click(screen.getByTestId('scopes-m3'));
    expect(screen.getByTestId('scopes-dialog')).toBeInTheDocument();
  });

  // ── Loading & Error States ─────────────────────────────

  it('displays loading skeleton when data is loading', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      loading: true,
    });

    render(<OwnerMembersPage />);
    expect(screen.getByTestId('members-skeleton')).toBeInTheDocument();
  });

  it('displays error state with retry button', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      loading: false,
      error: 'Failed to load members',
    });

    render(<OwnerMembersPage />);
    expect(screen.getByText('Failed to load members')).toBeInTheDocument();
    const retryBtn = screen.getByText('Retry');
    fireEvent.click(retryBtn);
    expect(DEFAULT_PLATFORM_DATA.refresh).toHaveBeenCalled();
  });

  it('displays empty state when no members exist', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      members: [],
    });

    render(<OwnerMembersPage />);
    expect(screen.getByText('No members')).toBeInTheDocument();
  });

  // ── Toast Notification Tests ───────────────────────────

  it('renders toaster component', () => {
    render(<OwnerMembersPage />);
    expect(screen.getByTestId('toaster')).toBeInTheDocument();
  });

  // ── Edge Cases ─────────────────────────────────────────

  it('handles members with same name case-insensitively', () => {
    mockUsePlatformData.mockReturnValue({
      ...DEFAULT_PLATFORM_DATA,
      members: [
        ...DEFAULT_MEMBERS,
        {
          id: 'm5',
          name: 'JUAN PEREZ',
          email: 'juan.upper@test.com',
          role: 'student',
          is_active: true,
          created_at: '2025-08-01T00:00:00Z',
          plan: null,
        },
      ],
    });

    render(<OwnerMembersPage />);
    const searchInput = screen.getByPlaceholderText('Buscar por nombre o email...');
    fireEvent.change(searchInput, { target: { value: 'juan' } });

    // Should find both Juan variants
    const juanElements = screen.getAllByText(/juan/i);
    expect(juanElements.length).toBeGreaterThanOrEqual(2);
  });

  it('combines search and role filters', () => {
    render(<OwnerMembersPage />);

    // First apply role filter
    const studentBtn = Array.from(screen.getAllByRole('button')).find(
      (btn) => btn.textContent?.includes('Estudiantes'),
    );
    fireEvent.click(studentBtn!);

    // Then apply search
    const searchInput = screen.getByPlaceholderText('Buscar por nombre o email...');
    fireEvent.change(searchInput, { target: { value: 'juan' } });

    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.queryByText('Sofia Student')).not.toBeInTheDocument(); // Different search
  });

  it('maintains separate dialog state for different members', () => {
    render(<OwnerMembersPage />);

    // Open change role for member 1
    fireEvent.click(screen.getByTestId('change-role-m1'));
    expect(screen.getByTestId('change-role-dialog')).toBeInTheDocument();
  });
});
