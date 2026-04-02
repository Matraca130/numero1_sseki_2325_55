// ============================================================
// TEST: E2E Services Layer Integration
//
// Verifies service functions across all API modules by mocking
// the core apiCall function. Covers:
//   - Platform API: content, student-data, institutions
//   - Student API: profile-stats, activity-sessions, course-progress
//   - Content Tree API: hierarchical CRUD
//   - Keyword Mastery API: topic-filtered mastery
//   - BKT API: knowledge state management
//   - Error propagation and pagination params
//
// APPROACH: Mock apiCall at the module boundary so each service
// function's URL construction, method, body, and return handling
// are exercised without touching the network.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock the core API module ───────────────────────────────
const mockApiCall = vi.fn();

vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
  setAccessToken: vi.fn(),
  getAccessToken: () => 'mock-token',
  API_BASE: 'https://mock.supabase.co/functions/v1/server',
  ANON_KEY: 'mock-key',
}));

// Mock supabase to prevent real client init
vi.mock('@/app/lib/supabase', () => ({
  SUPABASE_URL: 'https://mock.supabase.co',
  SUPABASE_ANON_KEY: 'mock-key',
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

// Mock error-utils used by pa-student-data
vi.mock('@/app/utils/getErrorMessage', () => ({
  hasHttpStatus: (err: unknown, status: number) => {
    const msg = err instanceof Error ? err.message : String(err);
    return msg.includes(String(status));
  },
}));

// Mock concurrency helper used by keywordMasteryApi
vi.mock('@/app/lib/concurrency', () => ({
  parallelWithLimit: vi.fn(async (tasks: (() => Promise<unknown>)[], _limit: number) => {
    const results: PromiseSettledResult<unknown>[] = [];
    for (const task of tasks) {
      try {
        const value = await task();
        results.push({ status: 'fulfilled', value });
      } catch (reason) {
        results.push({ status: 'rejected', reason });
      }
    }
    return results;
  }),
}));

// ── Platform API: Content ──────────────────────────────────
import {
  getCourses,
  getTopicSummaries,
  getKeywords,
  createCourse,
  updateCourse,
  deleteCourse,
} from '@/app/services/platform-api/pa-content';

// ── Platform API: Student Data ─────────────────────────────
import {
  getStudentStatsReal,
  getDailyActivities,
  getAllBktStates as paGetAllBktStates,
} from '@/app/services/platform-api/pa-student-data';

// ── Platform API: Institutions ─────────────────────────────
import {
  getInstitutions,
  getMembers,
} from '@/app/services/platform-api/pa-institutions';

// ── Student API: Profile & Stats ───────────────────────────
import {
  getProfile,
  updateProfile,
} from '@/app/services/student-api/sa-profile-stats';

// ── Student API: Activity Sessions ─────────────────────────
import {
  getDailyActivity,
} from '@/app/services/student-api/sa-activity-sessions';

// ── Student API: Course Progress ───────────────────────────
import {
  getAllCourseProgress,
} from '@/app/services/student-api/sa-course-progress';

// ── Content Tree API ───────────────────────────────────────
import {
  getContentTree,
  createCourse as treeCreateCourse,
  createTopic,
  updateCourse as treeUpdateCourse,
  deleteCourse as treeDeleteCourse,
} from '@/app/services/contentTreeApi';

// ── BKT API ────────────────────────────────────────────────
import {
  getBktStates,
  upsertBktState,
  getAllBktStates as bktGetAllBktStates,
} from '@/app/services/bktApi';

// ── Keyword Mastery API (import only the top-level functions) ──
import {
  MASTERY_THRESHOLD,
} from '@/app/services/keywordMasteryApi';

// Invalidate course progress cache between tests
import { _courseProgressCache } from '@/app/services/student-api/sa-infra';

// ── Setup ──────────────────────────────────────────────────

beforeEach(() => {
  mockApiCall.mockReset();
  _courseProgressCache.entry = null;
});

// ══════════════════════════════════════════════════════════════
// PLATFORM API — pa-content
// ══════════════════════════════════════════════════════════════

describe('Platform API: pa-content', () => {
  it('1. getCourses fetches all courses without institution filter', async () => {
    const mockCourses = [
      { id: 'c1', name: 'Biology 101' },
      { id: 'c2', name: 'Chemistry 201' },
    ];
    mockApiCall.mockResolvedValueOnce(mockCourses);

    const result = await getCourses();

    expect(mockApiCall).toHaveBeenCalledWith('/courses');
    expect(result).toEqual(mockCourses);
  });

  it('2. getCourses passes institution_id as query param', async () => {
    mockApiCall.mockResolvedValueOnce([]);

    await getCourses('inst-123');

    expect(mockApiCall).toHaveBeenCalledWith('/courses?institution_id=inst-123');
  });

  it('3. getTopicSummaries fetches summaries filtered by topic_id', async () => {
    const mockSummaries = [{ id: 's1', title: 'Photosynthesis', topic_id: 't1' }];
    mockApiCall.mockResolvedValueOnce(mockSummaries);

    const result = await getTopicSummaries('t1');

    expect(mockApiCall).toHaveBeenCalledWith('/summaries?topic_id=t1');
    expect(result).toEqual(mockSummaries);
  });

  it('4. getKeywords fetches keywords with optional institution filter', async () => {
    const mockKeywords = [{ id: 'k1', term: 'Mitosis', definition: 'Cell division' }];
    mockApiCall.mockResolvedValueOnce(mockKeywords);

    const result = await getKeywords('inst-456');

    expect(mockApiCall).toHaveBeenCalledWith('/keywords?institution_id=inst-456');
    expect(result).toEqual(mockKeywords);
  });
});

// ══════════════════════════════════════════════════════════════
// PLATFORM API — pa-student-data
// ══════════════════════════════════════════════════════════════

describe('Platform API: pa-student-data', () => {
  it('5. getStudentStatsReal returns stats on success', async () => {
    const mockStats = {
      id: 'stat-1',
      current_streak: 5,
      longest_streak: 12,
      total_reviews: 150,
      total_time_seconds: 7200,
      total_sessions: 30,
      last_study_date: '2026-03-28',
    };
    mockApiCall.mockResolvedValueOnce(mockStats);

    const result = await getStudentStatsReal();

    expect(mockApiCall).toHaveBeenCalledWith('/student-stats');
    expect(result).toEqual(mockStats);
  });

  it('6. getStudentStatsReal returns null on 404', async () => {
    const error = new Error('HTTP 404 Not Found');
    (error as any).status = 404;
    mockApiCall.mockRejectedValueOnce(error);

    const result = await getStudentStatsReal();

    expect(result).toBeNull();
  });

  it('7. getDailyActivities passes date range and pagination params', async () => {
    const mockActivities = [
      { activity_date: '2026-03-01', reviews_count: 20, correct_count: 18, time_spent_seconds: 1800, sessions_count: 2 },
    ];
    mockApiCall.mockResolvedValueOnce(mockActivities);

    const result = await getDailyActivities('2026-03-01', '2026-03-31', 50, 10);

    const calledUrl = mockApiCall.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/daily-activities?');
    expect(calledUrl).toContain('from=2026-03-01');
    expect(calledUrl).toContain('to=2026-03-31');
    expect(calledUrl).toContain('limit=50');
    expect(calledUrl).toContain('offset=10');
    expect(result).toEqual(mockActivities);
  });

  it('8. getAllBktStates (platform) passes subtopic_id and pagination', async () => {
    const mockBkt = [
      { subtopic_id: 'st1', p_know: 0.8, total_attempts: 10, correct_attempts: 8 },
    ];
    mockApiCall.mockResolvedValueOnce(mockBkt);

    const result = await paGetAllBktStates('st1', 100, 5);

    const calledUrl = mockApiCall.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/bkt-states?');
    expect(calledUrl).toContain('subtopic_id=st1');
    expect(calledUrl).toContain('limit=100');
    expect(calledUrl).toContain('offset=5');
    expect(result).toEqual(mockBkt);
  });
});

// ══════════════════════════════════════════════════════════════
// PLATFORM API — pa-institutions
// ══════════════════════════════════════════════════════════════

describe('Platform API: pa-institutions', () => {
  it('9. getInstitutions returns institution list', async () => {
    const mockInstitutions = [
      { id: 'inst-1', name: 'University Alpha', slug: 'alpha' },
      { id: 'inst-2', name: 'College Beta', slug: 'beta' },
    ];
    mockApiCall.mockResolvedValueOnce(mockInstitutions);

    const result = await getInstitutions();

    expect(mockApiCall).toHaveBeenCalledWith('/institutions');
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('University Alpha');
  });

  it('10. getMembers passes institution_id query param', async () => {
    const mockMembers = [
      { id: 'm1', role: 'student', is_active: true },
      { id: 'm2', role: 'professor', is_active: true },
    ];
    mockApiCall.mockResolvedValueOnce(mockMembers);

    const result = await getMembers('inst-1');

    expect(mockApiCall).toHaveBeenCalledWith('/memberships?institution_id=inst-1');
    expect(result).toHaveLength(2);
  });
});

// ══════════════════════════════════════════════════════════════
// ERROR HANDLING
// ══════════════════════════════════════════════════════════════

describe('Error handling: API errors propagate correctly', () => {
  it('11. service functions propagate non-404 errors from apiCall', async () => {
    const serverError = new Error('HTTP 500 Internal Server Error');
    mockApiCall.mockRejectedValueOnce(serverError);

    await expect(getStudentStatsReal()).rejects.toThrow('HTTP 500');
  });

  it('12. getCourses propagates network errors directly', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Network timeout'));

    await expect(getCourses()).rejects.toThrow('Network timeout');
  });
});

// ══════════════════════════════════════════════════════════════
// STUDENT API — sa-profile-stats
// ══════════════════════════════════════════════════════════════

describe('Student API: sa-profile-stats', () => {
  it('13. getProfile maps backend snake_case to camelCase', async () => {
    mockApiCall.mockResolvedValueOnce({
      id: 'user-1',
      full_name: 'Maria Silva',
      email: 'maria@test.com',
      avatar_url: 'https://img.test/avatar.jpg',
      created_at: '2026-01-01T00:00:00Z',
    });

    const profile = await getProfile();

    expect(mockApiCall).toHaveBeenCalledWith('/me');
    expect(profile).not.toBeNull();
    expect(profile!.name).toBe('Maria Silva');
    expect(profile!.email).toBe('maria@test.com');
    expect(profile!.avatarUrl).toBe('https://img.test/avatar.jpg');
  });

  it('14. updateProfile sends mapped payload and returns mapped profile', async () => {
    mockApiCall.mockResolvedValueOnce({
      id: 'user-1',
      full_name: 'Maria Updated',
      email: 'maria@test.com',
      avatar_url: null,
      created_at: '2026-01-01T00:00:00Z',
    });

    const result = await updateProfile({ name: 'Maria Updated' });

    expect(mockApiCall).toHaveBeenCalledWith('/me', {
      method: 'PUT',
      body: JSON.stringify({ full_name: 'Maria Updated' }),
    });
    expect(result.name).toBe('Maria Updated');
  });

  it('15. getProfile returns null on 401/404', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('401 Unauthorized'));

    const result = await getProfile();

    expect(result).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// STUDENT API — sa-activity-sessions
// ══════════════════════════════════════════════════════════════

describe('Student API: sa-activity-sessions', () => {
  it('16. getDailyActivity maps backend records to DailyActivity shape', async () => {
    mockApiCall.mockResolvedValueOnce([
      {
        activity_date: '2026-03-28',
        reviews_count: 25,
        correct_count: 20,
        time_spent_seconds: 3600,
        sessions_count: 3,
      },
    ]);

    const result = await getDailyActivity();

    expect(mockApiCall).toHaveBeenCalledWith('/daily-activities');
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-03-28');
    expect(result[0].studyMinutes).toBe(60);
    expect(result[0].cardsReviewed).toBe(25);
    expect(result[0].retentionPercent).toBe(80);
  });

  it('17. getDailyActivity returns empty array on error', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Server down'));

    const result = await getDailyActivity();

    expect(result).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════
// CONTENT TREE API
// ══════════════════════════════════════════════════════════════

describe('Content Tree API', () => {
  it('18. getContentTree returns hierarchical course data', async () => {
    const mockTree = [
      {
        id: 'c1',
        name: 'Biology',
        semesters: [
          {
            id: 'sem1',
            name: 'Semester 1',
            sections: [
              {
                id: 'sec1',
                name: 'Cell Biology',
                topics: [{ id: 't1', name: 'Mitosis' }],
              },
            ],
          },
        ],
      },
    ];
    mockApiCall.mockResolvedValueOnce(mockTree);

    const result = await getContentTree('inst-1');

    expect(mockApiCall).toHaveBeenCalledWith('/content-tree?institution_id=inst-1');
    expect(result).toHaveLength(1);
    expect(result[0].semesters[0].sections[0].topics[0].name).toBe('Mitosis');
  });

  it('19. createCourse (tree) sends POST with institution_id', async () => {
    const newCourse = { id: 'c-new', name: 'Physics', semesters: [] };
    mockApiCall.mockResolvedValueOnce(newCourse);

    const result = await treeCreateCourse({
      institution_id: 'inst-1',
      name: 'Physics',
      description: 'Introductory physics',
    });

    expect(mockApiCall).toHaveBeenCalledWith('/courses', {
      method: 'POST',
      body: JSON.stringify({
        institution_id: 'inst-1',
        name: 'Physics',
        description: 'Introductory physics',
      }),
    });
    expect(result.name).toBe('Physics');
  });

  it('20. createTopic sends POST with section_id', async () => {
    const newTopic = { id: 't-new', name: 'Thermodynamics' };
    mockApiCall.mockResolvedValueOnce(newTopic);

    await createTopic({ section_id: 'sec-1', name: 'Thermodynamics' });

    expect(mockApiCall).toHaveBeenCalledWith('/topics', {
      method: 'POST',
      body: JSON.stringify({ section_id: 'sec-1', name: 'Thermodynamics' }),
    });
  });

  it('21. updateCourse (tree) sends PUT with partial data', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'c1', name: 'Advanced Biology' });

    await treeUpdateCourse('c1', { name: 'Advanced Biology' });

    expect(mockApiCall).toHaveBeenCalledWith('/courses/c1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Advanced Biology' }),
    });
  });

  it('22. deleteCourse (tree) sends DELETE', async () => {
    mockApiCall.mockResolvedValueOnce(undefined);

    await treeDeleteCourse('c1');

    expect(mockApiCall).toHaveBeenCalledWith('/courses/c1', { method: 'DELETE' });
  });
});

// ══════════════════════════════════════════════════════════════
// BKT API
// ══════════════════════════════════════════════════════════════

describe('BKT API', () => {
  it('23. getBktStates returns student knowledge states with filters', async () => {
    const mockStates = [
      {
        id: 'bkt-1',
        student_id: 's1',
        subtopic_id: 'st1',
        p_know: 0.85,
        p_transit: 0.1,
        p_slip: 0.05,
        p_guess: 0.2,
        delta: 0.02,
        total_attempts: 15,
        correct_attempts: 12,
      },
    ];
    mockApiCall.mockResolvedValueOnce(mockStates);

    const result = await getBktStates({ subtopic_id: 'st1' });

    const calledUrl = mockApiCall.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/bkt-states?');
    expect(calledUrl).toContain('subtopic_id=st1');
    expect(result).toHaveLength(1);
    expect(result[0].p_know).toBe(0.85);
  });

  it('24. getBktStates supports batch subtopic_ids filter', async () => {
    mockApiCall.mockResolvedValueOnce([]);

    await getBktStates({ subtopic_ids: ['st1', 'st2', 'st3'], limit: 200 });

    const calledUrl = mockApiCall.mock.calls[0][0] as string;
    expect(calledUrl).toContain('subtopic_ids=st1%2Cst2%2Cst3');
    expect(calledUrl).toContain('limit=200');
  });

  it('25. upsertBktState sends POST with full BKT payload', async () => {
    const payload = {
      subtopic_id: 'st1',
      p_know: 0.9,
      p_transit: 0.1,
      p_slip: 0.05,
      p_guess: 0.2,
      delta: 0.03,
      total_attempts: 16,
      correct_attempts: 13,
      last_attempt_at: '2026-03-29T10:00:00Z',
    };
    const mockResponse = { id: 'bkt-1', student_id: 's1', ...payload };
    mockApiCall.mockResolvedValueOnce(mockResponse);

    const result = await upsertBktState(payload);

    expect(mockApiCall).toHaveBeenCalledWith('/bkt-states', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect(result.p_know).toBe(0.9);
  });

  it('26. getAllBktStates (bktApi) returns empty array on failure', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Server error'));

    const result = await bktGetAllBktStates();

    expect(result).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════
// KEYWORD MASTERY API — Constants
// ══════════════════════════════════════════════════════════════

describe('Keyword Mastery API', () => {
  it('27. MASTERY_THRESHOLD is defined at 0.75', () => {
    expect(MASTERY_THRESHOLD).toBe(0.75);
  });
});

// ══════════════════════════════════════════════════════════════
// STUDENT API — sa-course-progress (aggregation)
// ══════════════════════════════════════════════════════════════

describe('Student API: sa-course-progress', () => {
  it('28. getAllCourseProgress aggregates sessions, FSRS, and BKT data', async () => {
    // Mock the three parallel calls: sessions, fsrs-states, bkt-states
    mockApiCall
      .mockResolvedValueOnce([
        {
          id: 'sess-1',
          course_id: 'c1',
          total_reviews: 20,
          correct_reviews: 16,
          created_at: '2026-03-28T10:00:00Z',
          completed_at: '2026-03-28T10:30:00Z',
        },
      ])
      .mockResolvedValueOnce([
        { id: 'fsrs-1', state: 'review', stability: 15 },
        { id: 'fsrs-2', state: 'learning', stability: 3 },
        { id: 'fsrs-3', state: 'new', stability: 0 },
      ])
      .mockResolvedValueOnce([
        { subtopic_id: 'st1', p_know: 0.7 },
        { subtopic_id: 'st2', p_know: 0.9 },
      ])
      // Course name lookup
      .mockResolvedValueOnce({ id: 'c1', name: 'Biology 101' });

    const result = await getAllCourseProgress();

    // Should have fetched sessions, fsrs-states, bkt-states
    expect(mockApiCall).toHaveBeenCalledWith('/study-sessions?limit=200');
    expect(mockApiCall).toHaveBeenCalledWith('/fsrs-states?limit=500');
    expect(mockApiCall).toHaveBeenCalledWith('/bkt-states?limit=500');

    expect(result).toHaveLength(1);
    expect(result[0].courseId).toBe('c1');
    expect(result[0].courseName).toBe('Biology 101');
    expect(result[0].lessonsCompleted).toBe(1);
    expect(result[0].masteryPercent).toBeGreaterThanOrEqual(0);
    expect(result[0].masteryPercent).toBeLessThanOrEqual(100);
  });

  it('29. getAllCourseProgress returns empty array when no sessions', async () => {
    mockApiCall
      .mockResolvedValueOnce([])   // sessions
      .mockResolvedValueOnce([])   // fsrs
      .mockResolvedValueOnce([]);  // bkt

    const result = await getAllCourseProgress();

    expect(result).toEqual([]);
  });

  it('30. getAllCourseProgress returns empty array on complete failure', async () => {
    mockApiCall.mockRejectedValue(new Error('Total failure'));

    const result = await getAllCourseProgress();

    expect(result).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════
// PLATFORM API — pa-content CRUD
// ══════════════════════════════════════════════════════════════

describe('Platform API: pa-content CRUD operations', () => {
  it('31. createCourse sends POST with correct body', async () => {
    const courseData = { name: 'New Course', institution_id: 'inst-1', description: 'Desc', color: '#FF0000' };
    mockApiCall.mockResolvedValueOnce({ id: 'c-new', ...courseData });

    const result = await createCourse(courseData);

    expect(mockApiCall).toHaveBeenCalledWith('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
    expect(result.name).toBe('New Course');
  });

  it('32. updateCourse sends PUT with partial data', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'c1', name: 'Updated' });

    await updateCourse('c1', { name: 'Updated' });

    expect(mockApiCall).toHaveBeenCalledWith('/courses/c1', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated' }),
    });
  });

  it('33. deleteCourse sends DELETE for the given ID', async () => {
    mockApiCall.mockResolvedValueOnce(undefined);

    await deleteCourse('c1');

    expect(mockApiCall).toHaveBeenCalledWith('/courses/c1', { method: 'DELETE' });
  });
});
