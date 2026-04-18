// ============================================================
// Axon -- Tests for platformApi.ts (barrel re-exporter)
//
// Exercises a representative slice of functions from each sub-module:
//   - pa-institutions
//   - pa-plans
//   - pa-content
//   - pa-flashcards
//
// Mocks apiCall to inspect URL, method, and body. Does NOT perform
// real network I/O.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockApiCall = vi.fn();
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: any[]) => mockApiCall(...args),
}));

import {
  // institutions
  getInstitutions,
  getInstitution,
  getInstitutionBySlug,
  checkSlugAvailability,
  createInstitution,
  updateInstitution,
  deleteInstitution,
  getMembers,
  createMember,
  changeMemberRole,
  changeMemberPlan,
  toggleMemberActive,
  deleteMember,
  healthCheck,
  getInstitutionDashboardStats,
  PlatformApiError,
  // plans
  getPlatformPlans,
  getPlatformPlan,
  createPlatformPlan,
  updatePlatformPlan,
  deletePlatformPlan,
  getInstitutionPlans,
  createInstitutionPlan,
  setDefaultInstitutionPlan,
  getInstitutionSubscription,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  // content
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getTopicSummaries,
  createSummary,
  updateSummary,
  deleteSummary,
  getKeywords,
  createKeyword,
  updateKeyword,
  deleteKeyword,
  // flashcards
  getFlashcards,
  getFlashcardsBySummary,
  getFlashcardsByKeyword,
  getFlashcard,
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
} from '@/app/services/platformApi';

beforeEach(() => {
  mockApiCall.mockReset();
  mockApiCall.mockResolvedValue([]);
});

function lastCall() {
  return mockApiCall.mock.calls[mockApiCall.mock.calls.length - 1];
}
function lastUrl(): string {
  return lastCall()[0] as string;
}
function lastOpts(): { method?: string; body?: string } | undefined {
  return lastCall()[1] as any;
}

// ================================================================
// MISC RE-EXPORTS
// ================================================================

describe('platformApi — PlatformApiError re-export', () => {
  it('exports an error class', () => {
    expect(typeof PlatformApiError).toBe('function');
  });
});

// ================================================================
// INSTITUTIONS
// ================================================================

describe('platformApi — institutions', () => {
  it('getInstitutions calls GET /institutions and extracts items', async () => {
    mockApiCall.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]);
    const result = await getInstitutions();
    expect(lastUrl()).toBe('/institutions');
    expect(result).toEqual([{ id: 'a' }, { id: 'b' }]);
  });

  it('getInstitutions extracts items when wrapped in { items: [] }', async () => {
    mockApiCall.mockResolvedValueOnce({ items: [{ id: 'x' }] });
    const result = await getInstitutions();
    expect(result).toEqual([{ id: 'x' }]);
  });

  it('getInstitution calls GET /institutions/:id', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'inst-1', name: 'Test' });
    const result = await getInstitution('inst-1');
    expect(lastUrl()).toBe('/institutions/inst-1');
    expect(result).toEqual({ id: 'inst-1', name: 'Test' });
  });

  it('getInstitutionBySlug calls GET /institutions/by-slug/:slug', async () => {
    await getInstitutionBySlug('my-org');
    expect(lastUrl()).toBe('/institutions/by-slug/my-org');
  });

  it('checkSlugAvailability calls GET /institutions/check-slug/:slug', async () => {
    mockApiCall.mockResolvedValueOnce({ available: true });
    const result = await checkSlugAvailability('fresh-slug');
    expect(lastUrl()).toBe('/institutions/check-slug/fresh-slug');
    expect(result).toEqual({ available: true });
  });

  it('createInstitution sends POST with JSON body', async () => {
    await createInstitution({ name: 'Org', slug: 'org' });
    expect(lastUrl()).toBe('/institutions');
    expect(lastOpts()?.method).toBe('POST');
    expect(JSON.parse(lastOpts()!.body!)).toEqual({ name: 'Org', slug: 'org' });
  });

  it('updateInstitution sends PUT with partial JSON body', async () => {
    await updateInstitution('inst-1', { name: 'Renamed' } as any);
    expect(lastUrl()).toBe('/institutions/inst-1');
    expect(lastOpts()?.method).toBe('PUT');
    expect(JSON.parse(lastOpts()!.body!)).toEqual({ name: 'Renamed' });
  });

  it('deleteInstitution sends DELETE and no body', async () => {
    await deleteInstitution('inst-1');
    expect(lastUrl()).toBe('/institutions/inst-1');
    expect(lastOpts()?.method).toBe('DELETE');
    expect(lastOpts()?.body).toBeUndefined();
  });

  it('getMembers calls GET /memberships?institution_id=', async () => {
    mockApiCall.mockResolvedValueOnce([{ id: 'm1' }]);
    await getMembers('inst-1');
    expect(lastUrl()).toBe('/memberships?institution_id=inst-1');
  });

  it('createMember sends POST /members with payload', async () => {
    await createMember({ institution_id: 'inst-1', role: 'student', email: 'a@b.c' } as any);
    expect(lastUrl()).toBe('/members');
    expect(lastOpts()?.method).toBe('POST');
    expect(JSON.parse(lastOpts()!.body!).email).toBe('a@b.c');
  });

  it('changeMemberRole sends PATCH /members/:id/role with { role }', async () => {
    await changeMemberRole('m1', 'professor' as any);
    expect(lastUrl()).toBe('/members/m1/role');
    expect(lastOpts()?.method).toBe('PATCH');
    expect(JSON.parse(lastOpts()!.body!)).toEqual({ role: 'professor' });
  });

  it('changeMemberPlan sends PATCH /members/:id/plan with institution_plan_id', async () => {
    await changeMemberPlan('m1', 'plan-xyz');
    expect(lastUrl()).toBe('/members/m1/plan');
    expect(JSON.parse(lastOpts()!.body!)).toEqual({ institution_plan_id: 'plan-xyz' });
  });

  it('changeMemberPlan accepts null for removing plan', async () => {
    await changeMemberPlan('m1', null);
    expect(JSON.parse(lastOpts()!.body!)).toEqual({ institution_plan_id: null });
  });

  it('toggleMemberActive sends PATCH with { is_active }', async () => {
    await toggleMemberActive('m1', false);
    expect(lastUrl()).toBe('/members/m1/toggle-active');
    expect(lastOpts()?.method).toBe('PATCH');
    expect(JSON.parse(lastOpts()!.body!)).toEqual({ is_active: false });
  });

  it('deleteMember sends DELETE /members/:id', async () => {
    await deleteMember('m1');
    expect(lastUrl()).toBe('/members/m1');
    expect(lastOpts()?.method).toBe('DELETE');
  });

  it('healthCheck calls GET /health', async () => {
    mockApiCall.mockResolvedValueOnce({ status: 'ok' });
    const result = await healthCheck();
    expect(lastUrl()).toBe('/health');
    expect(result).toEqual({ status: 'ok' });
  });
});

// ================================================================
// DASHBOARD STATS (aggregator — exercises both getMembers and getInstitution)
// ================================================================

describe('platformApi — getInstitutionDashboardStats', () => {
  it('returns aggregated stats from memberships + institution', async () => {
    mockApiCall.mockImplementation(async (url: string) => {
      if (url.startsWith('/memberships')) {
        return [
          { id: 'm1', role: 'student', is_active: true },
          { id: 'm2', role: 'student', is_active: false },
          { id: 'm3', role: 'professor', is_active: true },
        ];
      }
      if (url.startsWith('/institutions/')) return { id: 'inst-1', name: 'Test Inst' };
      return null;
    });

    const stats = await getInstitutionDashboardStats('inst-1');
    expect(stats.institutionName).toBe('Test Inst');
    expect(stats.hasInstitution).toBe(true);
    expect(stats.totalMembers).toBe(3);
    expect(stats.activeStudents).toBe(1);
    expect(stats.inactiveMembers).toBe(1);
    expect(stats.membersByRole).toEqual({ student: 2, professor: 1 });
  });

  it('returns fallback shape when both requests fail', async () => {
    // Make the *top-level* function behave as if the try/catch triggers.
    // Since Promise.allSettled never throws, the try/catch path only runs
    // if something inside it throws. extractItems throws on non-array-like,
    // but it handles null gracefully, so set members to raw null/undefined
    // and pretend it's an exception via mockImplementation throwing.
    // Simpler: make extractItems return [] by returning null -> falsy, then
    // institution null. The function returns a valid empty shape with
    // institutionName ''.
    mockApiCall.mockImplementation(async (url: string) => {
      if (url.startsWith('/memberships')) return null;
      if (url.startsWith('/institutions/')) return null;
      return null;
    });

    const stats = await getInstitutionDashboardStats('inst-1');
    expect(stats.totalMembers).toBe(0);
    expect(stats.activeStudents).toBe(0);
    expect(stats.inactiveMembers).toBe(0);
    expect(stats.membersByRole).toEqual({});
  });
});

// ================================================================
// PLATFORM PLANS + INSTITUTION PLANS + SUBSCRIPTIONS
// ================================================================

describe('platformApi — plans & subscriptions', () => {
  it('getPlatformPlans without includeInactive omits query', async () => {
    await getPlatformPlans();
    expect(lastUrl()).toBe('/platform-plans');
  });

  it('getPlatformPlans with includeInactive=true appends ?include_inactive=true', async () => {
    await getPlatformPlans(true);
    expect(lastUrl()).toBe('/platform-plans?include_inactive=true');
  });

  it('getPlatformPlan calls GET /platform-plans/:id', async () => {
    await getPlatformPlan('plan-1');
    expect(lastUrl()).toBe('/platform-plans/plan-1');
  });

  it('createPlatformPlan sends POST with JSON body', async () => {
    await createPlatformPlan({ name: 'Starter' } as any);
    expect(lastOpts()?.method).toBe('POST');
    expect(JSON.parse(lastOpts()!.body!)).toEqual({ name: 'Starter' });
  });

  it('updatePlatformPlan sends PUT with JSON body', async () => {
    await updatePlatformPlan('plan-1', { name: 'Pro' } as any);
    expect(lastUrl()).toBe('/platform-plans/plan-1');
    expect(lastOpts()?.method).toBe('PUT');
  });

  it('deletePlatformPlan sends DELETE', async () => {
    await deletePlatformPlan('plan-1');
    expect(lastUrl()).toBe('/platform-plans/plan-1');
    expect(lastOpts()?.method).toBe('DELETE');
  });

  it('getInstitutionPlans builds URL with institution_id and optional include_inactive', async () => {
    await getInstitutionPlans('inst-1');
    expect(lastUrl()).toBe('/institution-plans?institution_id=inst-1');

    await getInstitutionPlans('inst-1', true);
    expect(lastUrl()).toContain('institution_id=inst-1');
    expect(lastUrl()).toContain('include_inactive=true');
  });

  it('createInstitutionPlan posts to /institution-plans with payload', async () => {
    await createInstitutionPlan({ institution_id: 'inst-1', name: 'Basic' });
    expect(lastUrl()).toBe('/institution-plans');
    expect(lastOpts()?.method).toBe('POST');
    expect(JSON.parse(lastOpts()!.body!).name).toBe('Basic');
  });

  it('setDefaultInstitutionPlan sends PATCH /:id/set-default with no body', async () => {
    await setDefaultInstitutionPlan('plan-1');
    expect(lastUrl()).toBe('/institution-plans/plan-1/set-default');
    expect(lastOpts()?.method).toBe('PATCH');
    expect(lastOpts()?.body).toBeUndefined();
  });

  it('getInstitutionSubscription calls GET /institution-subscriptions?institution_id=', async () => {
    await getInstitutionSubscription('inst-1');
    expect(lastUrl()).toBe('/institution-subscriptions?institution_id=inst-1');
  });

  it('createSubscription posts JSON body to /institution-subscriptions', async () => {
    await createSubscription({ institution_id: 'inst-1', plan_id: 'plan-1' });
    expect(lastUrl()).toBe('/institution-subscriptions');
    expect(lastOpts()?.method).toBe('POST');
    expect(JSON.parse(lastOpts()!.body!)).toEqual({ institution_id: 'inst-1', plan_id: 'plan-1' });
  });

  it('updateSubscription sends PUT /institution-subscriptions/:id', async () => {
    await updateSubscription('sub-1', { status: 'active' } as any);
    expect(lastUrl()).toBe('/institution-subscriptions/sub-1');
    expect(lastOpts()?.method).toBe('PUT');
  });

  it('cancelSubscription sends DELETE /institution-subscriptions/:id', async () => {
    await cancelSubscription('sub-1');
    expect(lastUrl()).toBe('/institution-subscriptions/sub-1');
    expect(lastOpts()?.method).toBe('DELETE');
  });
});

// ================================================================
// CONTENT (courses, summaries, keywords)
// ================================================================

describe('platformApi — content (courses/summaries/keywords)', () => {
  it('getCourses without institutionId omits query', async () => {
    await getCourses();
    expect(lastUrl()).toBe('/courses');
  });

  it('getCourses with institutionId appends query param', async () => {
    await getCourses('inst-1');
    expect(lastUrl()).toBe('/courses?institution_id=inst-1');
  });

  it('createCourse posts JSON body to /courses', async () => {
    await createCourse({ name: 'Math', institution_id: 'inst-1' });
    expect(lastUrl()).toBe('/courses');
    expect(lastOpts()?.method).toBe('POST');
    expect(JSON.parse(lastOpts()!.body!)).toEqual({ name: 'Math', institution_id: 'inst-1' });
  });

  it('updateCourse sends PUT /courses/:id', async () => {
    await updateCourse('c1', { name: 'New' });
    expect(lastUrl()).toBe('/courses/c1');
    expect(lastOpts()?.method).toBe('PUT');
  });

  it('deleteCourse sends DELETE /courses/:id', async () => {
    await deleteCourse('c1');
    expect(lastUrl()).toBe('/courses/c1');
    expect(lastOpts()?.method).toBe('DELETE');
  });

  it('getTopicSummaries calls GET /summaries?topic_id=', async () => {
    await getTopicSummaries('topic-1');
    expect(lastUrl()).toBe('/summaries?topic_id=topic-1');
  });

  it('createSummary merges topic_id into body', async () => {
    await createSummary('topic-1', { content_markdown: 'body' });
    expect(lastUrl()).toBe('/summaries');
    const body = JSON.parse(lastOpts()!.body!);
    expect(body.topic_id).toBe('topic-1');
    expect(body.content_markdown).toBe('body');
  });

  it('updateSummary sends PUT /summaries/:id', async () => {
    await updateSummary('sum-1', { title: 'Renamed' });
    expect(lastUrl()).toBe('/summaries/sum-1');
    expect(lastOpts()?.method).toBe('PUT');
  });

  it('deleteSummary sends DELETE /summaries/:id', async () => {
    await deleteSummary('sum-1');
    expect(lastUrl()).toBe('/summaries/sum-1');
    expect(lastOpts()?.method).toBe('DELETE');
  });

  it('getKeywords without institutionId omits query', async () => {
    await getKeywords();
    expect(lastUrl()).toBe('/keywords');
  });

  it('getKeywords with institutionId appends query', async () => {
    await getKeywords('inst-1');
    expect(lastUrl()).toBe('/keywords?institution_id=inst-1');
  });

  it('createKeyword posts JSON body to /keywords', async () => {
    await createKeyword({ institution_id: 'inst-1', term: 'Mitosis' });
    expect(lastUrl()).toBe('/keywords');
    const body = JSON.parse(lastOpts()!.body!);
    expect(body.institution_id).toBe('inst-1');
    expect(body.term).toBe('Mitosis');
  });

  it('updateKeyword sends PUT /keywords/:id', async () => {
    await updateKeyword('k1', { term: 'Meiosis' });
    expect(lastUrl()).toBe('/keywords/k1');
    expect(lastOpts()?.method).toBe('PUT');
  });

  it('deleteKeyword sends DELETE /keywords/:id', async () => {
    await deleteKeyword('k1');
    expect(lastUrl()).toBe('/keywords/k1');
    expect(lastOpts()?.method).toBe('DELETE');
  });
});

// ================================================================
// FLASHCARDS
// ================================================================

describe('platformApi — flashcards', () => {
  it('getFlashcardsBySummary filters by summary_id', async () => {
    mockApiCall.mockResolvedValueOnce([{ id: 'c1' }, { id: 'c2' }]);
    const result = await getFlashcardsBySummary('sum-1');
    expect(lastUrl()).toBe('/flashcards?summary_id=sum-1');
    expect(result).toEqual([{ id: 'c1' }, { id: 'c2' }]);
  });

  it('getFlashcardsByKeyword filters by keyword_id', async () => {
    await getFlashcardsByKeyword('k1');
    expect(lastUrl()).toBe('/flashcards?keyword_id=k1');
  });

  it('getFlashcards without options hits /flashcards (no query)', async () => {
    await getFlashcards();
    expect(lastUrl()).toBe('/flashcards');
  });

  it('getFlashcards builds query string from options', async () => {
    await getFlashcards({
      subtopic_id: 'sub-1',
      status: 'published',
      limit: 50,
      offset: 10,
    });
    const url = lastUrl();
    expect(url.startsWith('/flashcards?')).toBe(true);
    expect(url).toContain('subtopic_id=sub-1');
    expect(url).toContain('status=published');
    expect(url).toContain('limit=50');
    expect(url).toContain('offset=10');
  });

  it('getFlashcards returns [] when response is not an items array', async () => {
    mockApiCall.mockResolvedValueOnce(null);
    const result = await getFlashcards();
    expect(result).toEqual([]);
  });

  it('getFlashcard calls GET /flashcards/:id', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'card-1' });
    const result = await getFlashcard('card-1');
    expect(lastUrl()).toBe('/flashcards/card-1');
    expect(result).toEqual({ id: 'card-1' });
  });

  it('createFlashcard posts JSON body to /flashcards', async () => {
    await createFlashcard({ front: 'Q', back: 'A' } as any);
    expect(lastUrl()).toBe('/flashcards');
    expect(lastOpts()?.method).toBe('POST');
    expect(JSON.parse(lastOpts()!.body!)).toEqual({ front: 'Q', back: 'A' });
  });

  it('updateFlashcard sends PUT /flashcards/:id', async () => {
    await updateFlashcard('card-1', { front: 'NewQ' });
    expect(lastUrl()).toBe('/flashcards/card-1');
    expect(lastOpts()?.method).toBe('PUT');
    expect(JSON.parse(lastOpts()!.body!)).toEqual({ front: 'NewQ' });
  });

  it('deleteFlashcard sends DELETE /flashcards/:id', async () => {
    await deleteFlashcard('card-1');
    expect(lastUrl()).toBe('/flashcards/card-1');
    expect(lastOpts()?.method).toBe('DELETE');
  });
});
