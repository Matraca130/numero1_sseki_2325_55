// ============================================================
// Axon -- Tests for PlatformDataContext (PlatformDataProvider + usePlatformData)
//
// Covers:
//   1. usePlatformData() outside PlatformDataProvider returns defaults
//   2. Initial loading: loading=true until auth resolves
//   3. No institutionId -> loading=false, no fetch
//   4. Fetches all data slices on mount when institutionId present
//   5. Promise.allSettled resilience: partial failures yield partial data
//   6. fetchAll catch: sets error state
//   7. refreshInstitution() reloads institution only
//   8. refreshMembers() reloads members only
//   9. refreshPlans() reloads plans only
//  10. refreshStats() reloads dashboardStats only
//  11. refreshSubscription() reloads subscription only
//  12. refreshCourses() reloads courses only
//  13. refresh() reloads ALL slices
//  14. Individual refresh with no institutionId is a no-op
//  15. inviteMember() calls API + appends to members
//  16. removeMember() calls API + removes from members
//  17. toggleMember() calls API + updates is_active
//  18. changeRole() calls API + updates role
//  19. Mutation error propagates (inviteMember)
//  20. Institution change resets data and re-fetches
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

// -- Test data fixtures -------------------------------------------------

const INST_ID = 'inst-001';

const MOCK_INSTITUTION = {
  id: INST_ID,
  name: 'Universidad Axon',
  slug: 'univ-axon',
  logo_url: null,
  owner_id: 'user-001',
  is_active: true,
  settings: {},
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-06-01T00:00:00Z',
};

const MOCK_STATS = {
  institutionName: 'Universidad Axon',
  hasInstitution: true,
  totalMembers: 5,
  totalPlans: 2,
  activeStudents: 3,
  inactiveMembers: 1,
  membersByRole: { owner: 1, admin: 1, professor: 1, student: 2 },
  subscription: null,
};

const MOCK_MEMBER_A = {
  id: 'mem-001',
  user_id: 'user-001',
  institution_id: INST_ID,
  role: 'professor' as const,
  institution_plan_id: null,
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-06-01T00:00:00Z',
  name: 'Maria Garcia',
  email: 'maria@axon.edu',
  avatar_url: null,
  plan: null,
};

const MOCK_MEMBER_B = {
  id: 'mem-002',
  user_id: 'user-002',
  institution_id: INST_ID,
  role: 'student' as const,
  institution_plan_id: 'plan-001',
  is_active: true,
  created_at: '2025-02-01T00:00:00Z',
  updated_at: '2025-06-01T00:00:00Z',
  name: 'Carlos Lopez',
  email: 'carlos@axon.edu',
  avatar_url: null,
  plan: { id: 'plan-001', name: 'Basic', description: null, price_cents: 0, billing_cycle: 'monthly' },
};

const MOCK_PLAN = {
  id: 'plan-001',
  institution_id: INST_ID,
  name: 'Basic',
  description: null,
  price_cents: 0,
  billing_cycle: 'monthly',
  is_default: true,
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-06-01T00:00:00Z',
};

const MOCK_SUBSCRIPTION = {
  id: 'sub-001',
  institution_id: INST_ID,
  plan_id: 'pp-001',
  status: 'active' as const,
  current_period_start: '2025-01-01T00:00:00Z',
  current_period_end: '2026-01-01T00:00:00Z',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-06-01T00:00:00Z',
};

const MOCK_COURSE = {
  id: 'course-001',
  institution_id: INST_ID,
  name: 'Algebra',
  description: 'Intro to algebra',
  color: '#14b8a6',
  sort_order: 1,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-06-01T00:00:00Z',
};

// -- Mock AuthContext ----------------------------------------------------

let mockActiveMembership: { institution_id: string } | null = {
  institution_id: INST_ID,
};
let mockAuthStatus: string = 'authenticated';

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({
    activeMembership: mockActiveMembership,
    status: mockAuthStatus,
  }),
}));

// -- Mock platformApi ----------------------------------------------------

const mockGetInstitution = vi.fn();
const mockGetInstitutionDashboardStats = vi.fn();
const mockGetMembers = vi.fn();
const mockGetInstitutionPlans = vi.fn();
const mockGetInstitutionSubscription = vi.fn();
const mockGetCourses = vi.fn();
const mockCreateMember = vi.fn();
const mockDeleteMember = vi.fn();
const mockToggleMemberActive = vi.fn();
const mockChangeMemberRole = vi.fn();

vi.mock('@/app/services/platformApi', () => ({
  getInstitution: (...args: unknown[]) => mockGetInstitution(...args),
  getInstitutionDashboardStats: (...args: unknown[]) => mockGetInstitutionDashboardStats(...args),
  getMembers: (...args: unknown[]) => mockGetMembers(...args),
  getInstitutionPlans: (...args: unknown[]) => mockGetInstitutionPlans(...args),
  getInstitutionSubscription: (...args: unknown[]) => mockGetInstitutionSubscription(...args),
  getCourses: (...args: unknown[]) => mockGetCourses(...args),
  createMember: (...args: unknown[]) => mockCreateMember(...args),
  deleteMember: (...args: unknown[]) => mockDeleteMember(...args),
  toggleMemberActive: (...args: unknown[]) => mockToggleMemberActive(...args),
  changeMemberRole: (...args: unknown[]) => mockChangeMemberRole(...args),
}));

// -- Import AFTER mocks ------------------------------------------------

import { PlatformDataProvider, usePlatformData } from '../PlatformDataContext';

// -- Helpers ------------------------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  return <PlatformDataProvider>{children}</PlatformDataProvider>;
}

function setupDefaultApiMocks() {
  mockGetInstitution.mockResolvedValue(MOCK_INSTITUTION);
  mockGetInstitutionDashboardStats.mockResolvedValue(MOCK_STATS);
  mockGetMembers.mockResolvedValue([MOCK_MEMBER_A, MOCK_MEMBER_B]);
  mockGetInstitutionPlans.mockResolvedValue([MOCK_PLAN]);
  mockGetInstitutionSubscription.mockResolvedValue(MOCK_SUBSCRIPTION);
  mockGetCourses.mockResolvedValue([MOCK_COURSE]);
}

// -- Test suite ---------------------------------------------------------

describe('PlatformDataContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveMembership = { institution_id: INST_ID };
    mockAuthStatus = 'authenticated';
    setupDefaultApiMocks();
  });

  // ── Test 1: usePlatformData outside provider returns defaults ──

  it('usePlatformData() outside PlatformDataProvider returns default values', () => {
    const { result } = renderHook(() => usePlatformData());

    expect(result.current.institution).toBeNull();
    expect(result.current.dashboardStats).toBeNull();
    expect(result.current.members).toEqual([]);
    expect(result.current.plans).toEqual([]);
    expect(result.current.subscription).toBeNull();
    expect(result.current.courses).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.institutionId).toBeNull();
  });

  // ── Test 2: Loading state while auth is loading ───────────────

  it('stays loading while auth status is loading', async () => {
    mockAuthStatus = 'loading';

    const { result } = renderHook(() => usePlatformData(), { wrapper });

    // Should not call any API while auth is loading
    expect(mockGetInstitution).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);
  });

  // ── Test 3: No institutionId -> loading=false, no fetch ───────

  it('sets loading=false without fetching when no institutionId', async () => {
    mockActiveMembership = null;

    const { result } = renderHook(() => usePlatformData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetInstitution).not.toHaveBeenCalled();
    expect(result.current.institution).toBeNull();
    expect(result.current.institutionId).toBeNull();
  });

  // ── Test 4: Fetches all data slices on mount ──────────────────

  it('fetches all 6 data slices when institutionId is present', async () => {
    const { result } = renderHook(() => usePlatformData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetInstitution).toHaveBeenCalledWith(INST_ID);
    expect(mockGetInstitutionDashboardStats).toHaveBeenCalledWith(INST_ID);
    expect(mockGetMembers).toHaveBeenCalledWith(INST_ID);
    expect(mockGetInstitutionPlans).toHaveBeenCalledWith(INST_ID, true);
    expect(mockGetInstitutionSubscription).toHaveBeenCalledWith(INST_ID);
    expect(mockGetCourses).toHaveBeenCalledWith(INST_ID);

    expect(result.current.institution).toEqual(MOCK_INSTITUTION);
    expect(result.current.dashboardStats).toEqual(MOCK_STATS);
    expect(result.current.members).toEqual([MOCK_MEMBER_A, MOCK_MEMBER_B]);
    expect(result.current.plans).toEqual([MOCK_PLAN]);
    expect(result.current.subscription).toEqual(MOCK_SUBSCRIPTION);
    expect(result.current.courses).toEqual([MOCK_COURSE]);
    expect(result.current.error).toBeNull();
    expect(result.current.institutionId).toBe(INST_ID);
  });

  // ── Test 5: Promise.allSettled resilience ─────────────────────

  it('handles partial failures via Promise.allSettled (failed slices get defaults)', async () => {
    mockGetInstitution.mockRejectedValue(new Error('Network error'));
    mockGetMembers.mockRejectedValue(new Error('Server error'));
    // Other mocks still resolve successfully

    const { result } = renderHook(() => usePlatformData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Failed slices get defaults
    expect(result.current.institution).toBeNull();
    expect(result.current.members).toEqual([]);

    // Successful slices are populated
    expect(result.current.dashboardStats).toEqual(MOCK_STATS);
    expect(result.current.plans).toEqual([MOCK_PLAN]);
    expect(result.current.subscription).toEqual(MOCK_SUBSCRIPTION);
    expect(result.current.courses).toEqual([MOCK_COURSE]);

    // No global error since Promise.allSettled does not throw
    expect(result.current.error).toBeNull();
  });

  // ── Test 6: fetchAll catch sets error state ───────────────────

  it('sets error state when fetchAll throws unexpectedly', async () => {
    // Force Promise.allSettled itself to throw (e.g., by making setData throw)
    // In practice the outer catch is for truly unexpected errors.
    // Simulate by making all API calls throw in a way that triggers catch
    const originalAllSettled = Promise.allSettled;
    vi.spyOn(Promise, 'allSettled').mockImplementationOnce(() => {
      throw new Error('Unexpected failure');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => usePlatformData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Unexpected failure');

    consoleSpy.mockRestore();
    Promise.allSettled = originalAllSettled;
  });

  // ── Test 7: refreshInstitution() ──────────────────────────────

  it('refreshInstitution() reloads only institution data', async () => {
    const { result } = renderHook(() => usePlatformData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updatedInst = { ...MOCK_INSTITUTION, name: 'Axon Updated' };
    mockGetInstitution.mockResolvedValue(updatedInst);

    await act(async () => {
      await result.current.refreshInstitution();
    });

    expect(result.current.institution?.name).toBe('Axon Updated');
    // Other slices unchanged
    expect(result.current.members).toEqual([MOCK_MEMBER_A, MOCK_MEMBER_B]);
  });

  // ── Test 8: refreshMembers() ──────────────────────────────────

  it('refreshMembers() reloads only members data', async () => {
    const { result } = renderHook(() => usePlatformData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockGetMembers.mockResolvedValue([MOCK_MEMBER_A]);

    await act(async () => {
      await result.current.refreshMembers();
    });

    expect(result.current.members).toEqual([MOCK_MEMBER_A]);
    // Other slices unchanged
    expect(result.current.institution).toEqual(MOCK_INSTITUTION);
  });

  // ── Test 9: refreshPlans() ────────────────────────────────────

  it('refreshPlans() reloads only plans data', async () => {
    const { result } = renderHook(() => usePlatformData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newPlan = { ...MOCK_PLAN, id: 'plan-002', name: 'Premium' };
    mockGetInstitutionPlans.mockResolvedValue([MOCK_PLAN, newPlan]);

    await act(async () => {
      await result.current.refreshPlans();
    });

    expect(result.current.plans).toHaveLength(2);
    expect(result.current.plans[1].name).toBe('Premium');
  });

  // ── Test 10: refreshStats() ───────────────────────────────────

  it('refreshStats() reloads only dashboardStats', async () => {
    const { result } = renderHook(() => usePlatformData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updatedStats = { ...MOCK_STATS, totalMembers: 10 };
    mockGetInstitutionDashboardStats.mockResolvedValue(updatedStats);

    await act(async () => {
      await result.current.refreshStats();
    });

    expect(result.current.dashboardStats?.totalMembers).toBe(10);
  });

  // ── Test 11: refreshSubscription() ────────────────────────────

  it('refreshSubscription() reloads only subscription', async () => {
    const { result } = renderHook(() => usePlatformData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updatedSub = { ...MOCK_SUBSCRIPTION, status: 'canceled' as const };
    mockGetInstitutionSubscription.mockResolvedValue(updatedSub);

    await act(async () => {
      await result.current.refreshSubscription();
    });

    expect(result.current.subscription?.status).toBe('canceled');
  });

  // ── Test 12: refreshCourses() ─────────────────────────────────

  it('refreshCourses() reloads only courses', async () => {
    const { result } = renderHook(() => usePlatformData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newCourse = { ...MOCK_COURSE, id: 'course-002', name: 'Calculus' };
    mockGetCourses.mockResolvedValue([MOCK_COURSE, newCourse]);

    await act(async () => {
      await result.current.refreshCourses();
    });

    expect(result.current.courses).toHaveLength(2);
    expect(result.current.courses[1].name).toBe('Calculus');
  });

  // ── Test 13: refresh() reloads ALL slices ─────────────────────

  it('refresh() re-fetches all 6 slices', async () => {
    const { result } = renderHook(() => usePlatformData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear call counts
    vi.clearAllMocks();
    setupDefaultApiMocks();

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetInstitution).toHaveBeenCalledTimes(1);
    expect(mockGetInstitutionDashboardStats).toHaveBeenCalledTimes(1);
    expect(mockGetMembers).toHaveBeenCalledTimes(1);
    expect(mockGetInstitutionPlans).toHaveBeenCalledTimes(1);
    expect(mockGetInstitutionSubscription).toHaveBeenCalledTimes(1);
    expect(mockGetCourses).toHaveBeenCalledTimes(1);
  });

  // ── Test 14: Individual refresh with no institutionId ─────────

  it('individual refresh functions are no-ops when no institutionId', async () => {
    mockActiveMembership = null;

    const { result } = renderHook(() => usePlatformData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    vi.clearAllMocks();

    await act(async () => {
      await result.current.refreshInstitution();
      await result.current.refreshMembers();
      await result.current.refreshPlans();
      await result.current.refreshStats();
      await result.current.refreshSubscription();
      await result.current.refreshCourses();
    });

    expect(mockGetInstitution).not.toHaveBeenCalled();
    expect(mockGetMembers).not.toHaveBeenCalled();
    expect(mockGetInstitutionPlans).not.toHaveBeenCalled();
    expect(mockGetInstitutionDashboardStats).not.toHaveBeenCalled();
    expect(mockGetInstitutionSubscription).not.toHaveBeenCalled();
    expect(mockGetCourses).not.toHaveBeenCalled();
  });

  // ── Test 15: inviteMember() ───────────────────────────────────

  it('inviteMember() calls API and appends new member to state', async () => {
    const { result } = renderHook(() => usePlatformData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newMember = {
      ...MOCK_MEMBER_B,
      id: 'mem-003',
      user_id: 'user-003',
      name: 'Ana Torres',
      email: 'ana@axon.edu',
    };
    mockCreateMember.mockResolvedValue(newMember);

    const payload = {
      email: 'ana@axon.edu',
      name: 'Ana Torres',
      institution_id: INST_ID,
      role: 'student' as const,
    };

    let returned: unknown;
    await act(async () => {
      returned = await result.current.inviteMember(payload);
    });

    expect(mockCreateMember).toHaveBeenCalledWith(payload);
    expect(returned).toEqual(newMember);
    expect(result.current.members).toHaveLength(3);
    expect(result.current.members[2].name).toBe('Ana Torres');
  });

  // ── Test 16: removeMember() ───────────────────────────────────

  it('removeMember() calls API and removes member from state', async () => {
    const { result } = renderHook(() => usePlatformData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockDeleteMember.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.removeMember('mem-002');
    });

    expect(mockDeleteMember).toHaveBeenCalledWith('mem-002');
    expect(result.current.members).toHaveLength(1);
    expect(result.current.members[0].id).toBe('mem-001');
  });

  // ── Test 17: toggleMember() ───────────────────────────────────

  it('toggleMember() calls API and updates is_active in state', async () => {
    const { result } = renderHook(() => usePlatformData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockToggleMemberActive.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.toggleMember('mem-002', false);
    });

    expect(mockToggleMemberActive).toHaveBeenCalledWith('mem-002', false);
    const member = result.current.members.find(m => m.id === 'mem-002');
    expect(member?.is_active).toBe(false);
  });

  // ── Test 18: changeRole() ─────────────────────────────────────

  it('changeRole() calls API and updates role in state', async () => {
    const { result } = renderHook(() => usePlatformData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockChangeMemberRole.mockResolvedValue(undefined);

    await act(async () => {
      await result.current.changeRole('mem-002', 'professor');
    });

    expect(mockChangeMemberRole).toHaveBeenCalledWith('mem-002', 'professor');
    const member = result.current.members.find(m => m.id === 'mem-002');
    expect(member?.role).toBe('professor');
  });

  // ── Test 19: Mutation error propagates ────────────────────────

  it('inviteMember() propagates API errors', async () => {
    const { result } = renderHook(() => usePlatformData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockCreateMember.mockRejectedValue(new Error('Email already exists'));

    const payload = {
      email: 'duplicate@axon.edu',
      institution_id: INST_ID,
      role: 'student' as const,
    };

    await expect(
      act(async () => {
        await result.current.inviteMember(payload);
      }),
    ).rejects.toThrow('Email already exists');

    // Members unchanged
    expect(result.current.members).toHaveLength(2);
  });

  // ── Test 20: Institution change resets data ───────────────────

  it('resets data and re-fetches when institutionId changes', async () => {
    const { result, rerender } = renderHook(() => usePlatformData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.institution?.name).toBe('Universidad Axon');

    // Change institution
    const newInstId = 'inst-002';
    const newInstitution = { ...MOCK_INSTITUTION, id: newInstId, name: 'Colegio Beta' };
    mockGetInstitution.mockResolvedValue(newInstitution);
    mockGetInstitutionDashboardStats.mockResolvedValue({ ...MOCK_STATS, institutionName: 'Colegio Beta' });
    mockGetMembers.mockResolvedValue([]);
    mockGetInstitutionPlans.mockResolvedValue([]);
    mockGetInstitutionSubscription.mockResolvedValue(null);
    mockGetCourses.mockResolvedValue([]);

    mockActiveMembership = { institution_id: newInstId };
    rerender();

    await waitFor(() => {
      expect(result.current.institution?.name).toBe('Colegio Beta');
    });

    expect(result.current.institutionId).toBe(newInstId);
    expect(result.current.members).toEqual([]);
    expect(result.current.courses).toEqual([]);
  });

  // ── Test 21: Individual refresh error is silently caught ──────

  it('refreshInstitution() silently catches errors without setting global error', async () => {
    const { result } = renderHook(() => usePlatformData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetInstitution.mockRejectedValue(new Error('Network timeout'));

    await act(async () => {
      await result.current.refreshInstitution();
    });

    // Institution should remain unchanged (old value)
    expect(result.current.institution).toEqual(MOCK_INSTITUTION);
    // No global error set
    expect(result.current.error).toBeNull();

    consoleSpy.mockRestore();
  });

  // ── Test 22: removeMember error propagates ────────────────────

  it('removeMember() propagates API errors and does not modify state', async () => {
    const { result } = renderHook(() => usePlatformData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockDeleteMember.mockRejectedValue(new Error('Forbidden'));

    await expect(
      act(async () => {
        await result.current.removeMember('mem-002');
      }),
    ).rejects.toThrow('Forbidden');

    // Members unchanged
    expect(result.current.members).toHaveLength(2);
  });
});
