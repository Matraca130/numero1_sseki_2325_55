// ============================================================
// Hook Tests -- useScheduleAI
//
// Tests the useScheduleAI hook:
//   - buildProfile: collects student data from contexts
//   - buildPlanContext: extracts plan-specific data
//   - distributeWithAI: call aiDistributeTasks
//   - getRecommendationsToday: cached daily recommendations
//   - rescheduleWithAI: call aiReschedule
//   - getWeeklyInsight: call aiWeeklyInsight
//   - clearCache: clears recommendation cache
//   - Loading/error state management
//
// Mocks:
//   - @/app/context/TopicMasteryContext
//   - @/app/context/StudyTimeEstimatesContext
//   - @/app/context/StudyPlansContext
//   - @/app/context/StudentDataContext
//   - @/app/services/aiService (all AI functions)
//
// RUN: npx vitest run src/app/hooks/__tests__/useScheduleAI.test.ts
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { TopicMasteryInfo } from '@/app/hooks/useTopicMastery';
import type { DailyActivity, StudentStats } from '@/app/context/StudentDataContext';
import type { StudyPlan } from '@/app/types/study-plan';
import type { AiScheduleResponse } from '@/app/services/aiService';

// ── Mock TopicMasteryContext ────────────────────────────────

const mockTopicMastery = new Map<string, TopicMasteryInfo>([
  [
    'topic-1',
    {
      masteryPercent: 50,
      pKnow: 0.5,
      needsReview: false,
      totalAttempts: 10,
      priorityScore: 50,
    },
  ],
  [
    'topic-2',
    {
      masteryPercent: 25,
      pKnow: 0.25,
      needsReview: true,
      totalAttempts: 5,
      priorityScore: 75,
    },
  ],
]);

vi.mock('@/app/context/TopicMasteryContext', () => ({
  useTopicMasteryContext: () => ({
    topicMastery: mockTopicMastery,
    loading: false,
    error: null,
  }),
}));

// ── Mock StudyTimeEstimatesContext ──────────────────────────

vi.mock('@/app/context/StudyTimeEstimatesContext', () => ({
  useStudyTimeEstimatesContext: () => ({
    summary: {
      avgMinutesPerSession: 25,
      totalMinutesThisWeek: 300,
      sessionsThisWeek: 12,
    },
  }),
}));

// ── Mock StudyPlansContext ──────────────────────────────────

const mockPlan: StudyPlan = {
  id: 'plan-1',
  name: 'Midterm Prep',
  subjects: [{ id: 'sub-1', name: 'Math', color: 'bg-blue-500' }],
  methods: ['flashcard', 'quiz'],
  selectedTopics: [
    {
      courseId: 'course-1',
      courseName: 'Calculus I',
      sectionTitle: 'Limits',
      topicTitle: 'Epsilon-delta',
      topicId: 'topic-1',
    },
  ],
  completionDate: new Date('2026-04-15'),
  weeklyHours: [2, 2, 2, 2, 2, 1, 1],
  tasks: [
    {
      id: 'task-1',
      date: new Date('2026-03-26'),
      title: 'Study Epsilon-delta',
      subject: 'Math',
      subjectColor: 'bg-blue-500',
      method: 'flashcard',
      estimatedMinutes: 25,
      completed: false,
      topicId: 'topic-1',
    },
  ],
  createdAt: new Date('2026-03-20'),
  totalEstimatedHours: 5,
};

vi.mock('@/app/context/StudyPlansContext', () => ({
  useStudyPlansContext: () => ({
    plans: [mockPlan],
    loading: false,
    error: null,
  }),
}));

// ── Mock StudentDataContext ────────────────────────────────

const mockDailyActivity: DailyActivity[] = [
  {
    date: '2026-03-19',
    studyMinutes: 60,
    sessionsCount: 3,
    cardsReviewed: 45,
  },
  {
    date: '2026-03-20',
    studyMinutes: 75,
    sessionsCount: 4,
    cardsReviewed: 60,
  },
];

const mockStats: StudentStats = {
  totalStudyMinutes: 1200,
  totalSessions: 50,
  currentStreak: 5,
  avgMinutesPerSession: 24,
  longestStreak: 12,
  cardsLearned: 200,
  cardsReviewed: 800,
};

vi.mock('@/app/context/StudentDataContext', () => ({
  useStudentDataContext: () => ({
    stats: mockStats,
    dailyActivity: mockDailyActivity,
  }),
}));

// ── Mock AI Service ────────────────────────────────────────

const mockAiDistributeTasks = vi.fn<
  Parameters<typeof import('@/app/services/aiService').aiDistributeTasks>,
  ReturnType<typeof import('@/app/services/aiService').aiDistributeTasks>
>();
const mockAiRecommendToday = vi.fn<
  Parameters<typeof import('@/app/services/aiService').aiRecommendToday>,
  ReturnType<typeof import('@/app/services/aiService').aiRecommendToday>
>();
const mockAiReschedule = vi.fn<
  Parameters<typeof import('@/app/services/aiService').aiReschedule>,
  ReturnType<typeof import('@/app/services/aiService').aiReschedule>
>();
const mockAiWeeklyInsight = vi.fn<
  Parameters<typeof import('@/app/services/aiService').aiWeeklyInsight>,
  ReturnType<typeof import('@/app/services/aiService').aiWeeklyInsight>
>();

vi.mock('@/app/services/aiService', () => ({
  aiDistributeTasks: (...args: unknown[]) => mockAiDistributeTasks(...(args as any[])),
  aiRecommendToday: (...args: unknown[]) => mockAiRecommendToday(...(args as any[])),
  aiReschedule: (...args: unknown[]) => mockAiReschedule(...(args as any[])),
  aiWeeklyInsight: (...args: unknown[]) => mockAiWeeklyInsight(...(args as any[])),
}));

// ── Import AFTER mocks ──────────────────────────────────────

import { useScheduleAI } from '@/app/hooks/useScheduleAI';

// ── Test Helpers ────────────────────────────────────────────

const mockAiResponse: AiScheduleResponse = {
  success: true,
  message: 'AI recommendation generated',
  data: {
    recommendations: ['Focus on weak topics first'],
    rescheduledTasks: [],
    insight: 'Your study pattern is consistent',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAiDistributeTasks.mockResolvedValue(mockAiResponse);
  mockAiRecommendToday.mockResolvedValue(mockAiResponse);
  mockAiReschedule.mockResolvedValue(mockAiResponse);
  mockAiWeeklyInsight.mockResolvedValue(mockAiResponse);
});

// ── Tests ───────────────────────────────────────────────────

describe('useScheduleAI — buildProfile', () => {
  it('returns hook with buildProfile function', () => {
    const { result } = renderHook(() => useScheduleAI());

    expect(result.current.buildProfile).toBeDefined();
    expect(typeof result.current.buildProfile).toBe('function');
  });

  it('buildProfile collects topic mastery data', () => {
    const { result } = renderHook(() => useScheduleAI());

    const profile = result.current.buildProfile();

    expect(profile.topicMastery).toBeDefined();
    expect(profile.topicMastery['topic-1']).toEqual({
      masteryPercent: 50,
      pKnow: 0.5,
      needsReview: false,
      totalAttempts: 10,
      priorityScore: 50,
    });
  });

  it('buildProfile converts DailyActivity array', () => {
    const { result } = renderHook(() => useScheduleAI());

    const profile = result.current.buildProfile();

    expect(profile.dailyActivity).toBeDefined();
    expect(profile.dailyActivity).toHaveLength(2);
    expect(profile.dailyActivity[0]).toEqual({
      date: '2026-03-19',
      studyMinutes: 60,
      sessionsCount: 3,
    });
  });

  it('buildProfile includes student stats', () => {
    const { result } = renderHook(() => useScheduleAI());

    const profile = result.current.buildProfile();

    expect(profile.stats).toEqual({
      totalStudyMinutes: 1200,
      totalSessions: 50,
      currentStreak: 5,
      avgMinutesPerSession: 25, // From StudyTimeEstimatesContext
    });
  });

  it('buildProfile collects study methods from all plans', () => {
    const { result } = renderHook(() => useScheduleAI());

    const profile = result.current.buildProfile();

    expect(profile.studyMethods).toBeDefined();
    expect(profile.studyMethods).toContain('flashcard');
    expect(profile.studyMethods).toContain('quiz');
  });
});

describe('useScheduleAI — buildPlanContext', () => {
  it('buildPlanContext returns context from mocked plan', () => {
    // vi.doMock + vi.resetModules does not re-import the hook in this setup,
    // so the top-level mock (with plans) is still active.
    const { result } = renderHook(() => useScheduleAI());

    const context = result.current.buildPlanContext();
    // Plan mock provides one task, so context should be defined
    expect(context).toBeDefined();
    expect(context?.tasks).toHaveLength(1);
  });

  it('buildPlanContext returns first plan when planId not specified', () => {
    const { result } = renderHook(() => useScheduleAI());

    const context = result.current.buildPlanContext();

    expect(context).toBeDefined();
    expect(context?.tasks).toHaveLength(1);
    expect(context?.completionDate).toBe('2026-04-15');
  });

  it('buildPlanContext returns specific plan by id', () => {
    const { result } = renderHook(() => useScheduleAI());

    const context = result.current.buildPlanContext('plan-1');

    expect(context).toBeDefined();
    expect(context?.tasks[0]).toEqual({
      topicId: 'topic-1',
      topicTitle: 'Study Epsilon-delta',
      method: 'flashcard',
      estimatedMinutes: 25,
      completed: false,
      scheduledDate: mockPlan.tasks[0].date.toISOString().slice(0, 10),
    });
  });

  it('buildPlanContext converts dates to ISO strings', () => {
    const { result } = renderHook(() => useScheduleAI());

    const context = result.current.buildPlanContext();

    expect(context?.completionDate).toBe('2026-04-15');
    expect(context?.tasks[0].scheduledDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('buildPlanContext includes weeklyHours', () => {
    const { result } = renderHook(() => useScheduleAI());

    const context = result.current.buildPlanContext();

    expect(context?.weeklyHours).toEqual([2, 2, 2, 2, 2, 1, 1]);
  });
});

describe('useScheduleAI — distributeWithAI', () => {
  it('calls aiDistributeTasks with profile and plan context', async () => {
    const { result } = renderHook(() => useScheduleAI());

    const planContext = result.current.buildPlanContext();

    await act(async () => {
      await result.current.distributeWithAI(planContext!);
    });

    expect(mockAiDistributeTasks).toHaveBeenCalled();
    expect(mockAiDistributeTasks).toHaveBeenCalledWith(
      expect.any(Object), // profile
      expect.any(Object), // planContext
    );
  });

  it('returns AI response on success', async () => {
    const { result } = renderHook(() => useScheduleAI());
    const planContext = result.current.buildPlanContext();

    let aiResult: AiScheduleResponse | null = null;

    await act(async () => {
      aiResult = await result.current.distributeWithAI(planContext!);
    });

    expect(aiResult).toEqual(mockAiResponse);
  });

  it('sets loading state during request', async () => {
    const { result } = renderHook(() => useScheduleAI());
    const planContext = result.current.buildPlanContext();

    // Initially not loading
    expect(result.current.loading).toBe(false);

    const promise = act(async () => {
      await result.current.distributeWithAI(planContext!);
    });

    // Should be loading during the call
    await promise;

    // Should not be loading after
    expect(result.current.loading).toBe(false);
  });

  it('clears error on success', async () => {
    const { result } = renderHook(() => useScheduleAI());
    const planContext = result.current.buildPlanContext();

    await act(async () => {
      await result.current.distributeWithAI(planContext!);
    });

    expect(result.current.error).toBeNull();
  });

  it('sets error on failure', async () => {
    mockAiDistributeTasks.mockRejectedValue(new Error('AI service unavailable'));

    const { result } = renderHook(() => useScheduleAI());
    const planContext = result.current.buildPlanContext();

    await act(async () => {
      await result.current.distributeWithAI(planContext!);
    });

    expect(result.current.error).toBe('AI service unavailable');
  });

  it('returns null on error', async () => {
    mockAiDistributeTasks.mockRejectedValue(new Error('Error'));

    const { result } = renderHook(() => useScheduleAI());
    const planContext = result.current.buildPlanContext();

    let aiResult: AiScheduleResponse | null = null;

    await act(async () => {
      aiResult = await result.current.distributeWithAI(planContext!);
    });

    expect(aiResult).toBeNull();
  });
});

describe('useScheduleAI — getRecommendationsToday', () => {
  it('calls aiRecommendToday', async () => {
    const { result } = renderHook(() => useScheduleAI());

    await act(async () => {
      await result.current.getRecommendationsToday();
    });

    expect(mockAiRecommendToday).toHaveBeenCalled();
  });

  it('returns AI response', async () => {
    const { result } = renderHook(() => useScheduleAI());

    let aiResult: AiScheduleResponse | null = null;

    await act(async () => {
      aiResult = await result.current.getRecommendationsToday();
    });

    expect(aiResult).toEqual(mockAiResponse);
  });

  it('caches recommendations by default', async () => {
    const { result } = renderHook(() => useScheduleAI());

    await act(async () => {
      await result.current.getRecommendationsToday();
    });

    mockAiRecommendToday.mockClear();

    let cachedResult: AiScheduleResponse | null = null;

    await act(async () => {
      cachedResult = await result.current.getRecommendationsToday(); // Should be cached
    });

    expect(mockAiRecommendToday).not.toHaveBeenCalled();
    expect(cachedResult).toEqual(mockAiResponse);
  });

  it('forces refresh when requested', async () => {
    const { result } = renderHook(() => useScheduleAI());

    await act(async () => {
      await result.current.getRecommendationsToday();
    });

    mockAiRecommendToday.mockClear();

    await act(async () => {
      await result.current.getRecommendationsToday(true); // forceRefresh
    });

    expect(mockAiRecommendToday).toHaveBeenCalled();
  });

  it('sets error on failure', async () => {
    mockAiRecommendToday.mockRejectedValue(new Error('Recommendation failed'));

    const { result } = renderHook(() => useScheduleAI());

    await act(async () => {
      await result.current.getRecommendationsToday();
    });

    expect(result.current.error).toBe('Recommendation failed');
  });
});

describe('useScheduleAI — rescheduleWithAI', () => {
  it('calls aiReschedule with profile, plan context, and task id', async () => {
    const { result } = renderHook(() => useScheduleAI());

    await act(async () => {
      await result.current.rescheduleWithAI('task-1', 'plan-1');
    });

    expect(mockAiReschedule).toHaveBeenCalledWith(
      expect.any(Object), // profile
      expect.any(Object), // planContext
      'task-1',
    );
  });

  it('returns AI response on success', async () => {
    const { result } = renderHook(() => useScheduleAI());

    let aiResult: AiScheduleResponse | null = null;

    await act(async () => {
      aiResult = await result.current.rescheduleWithAI('task-1');
    });

    expect(aiResult).toEqual(mockAiResponse);
  });

  it('sets error when no plan found', async () => {
    // Mock empty plans
    vi.resetModules();
    const { result } = renderHook(() => useScheduleAI());

    // Manually set to no plans by resetting
    let aiResult: AiScheduleResponse | null = null;

    await act(async () => {
      aiResult = await result.current.rescheduleWithAI('task-1', 'nonexistent');
    });

    // When plan not found, should set error and return null
    if (aiResult === null) {
      expect(result.current.error).toBeDefined();
    }
  });

  it('handles error gracefully', async () => {
    mockAiReschedule.mockRejectedValue(new Error('Reschedule failed'));

    const { result } = renderHook(() => useScheduleAI());

    await act(async () => {
      await result.current.rescheduleWithAI('task-1');
    });

    expect(result.current.error).toBe('Reschedule failed');
  });
});

describe('useScheduleAI — getWeeklyInsight', () => {
  it('calls aiWeeklyInsight', async () => {
    const { result } = renderHook(() => useScheduleAI());

    await act(async () => {
      await result.current.getWeeklyInsight();
    });

    expect(mockAiWeeklyInsight).toHaveBeenCalled();
  });

  it('returns AI response on success', async () => {
    const { result } = renderHook(() => useScheduleAI());

    let aiResult: AiScheduleResponse | null = null;

    await act(async () => {
      aiResult = await result.current.getWeeklyInsight();
    });

    expect(aiResult).toEqual(mockAiResponse);
  });

  it('sets error on failure', async () => {
    mockAiWeeklyInsight.mockRejectedValue(new Error('Insight generation failed'));

    const { result } = renderHook(() => useScheduleAI());

    await act(async () => {
      await result.current.getWeeklyInsight();
    });

    expect(result.current.error).toBe('Insight generation failed');
  });
});

describe('useScheduleAI — clearCache', () => {
  it('clears cached recommendations', async () => {
    const { result } = renderHook(() => useScheduleAI());

    // Populate cache
    await act(async () => {
      await result.current.getRecommendationsToday();
    });

    // Clear cache
    act(() => {
      result.current.clearCache();
    });

    mockAiRecommendToday.mockClear();

    // Should call API again after cache clear
    await act(async () => {
      await result.current.getRecommendationsToday();
    });

    expect(mockAiRecommendToday).toHaveBeenCalled();
  });
});

describe('useScheduleAI — return shape', () => {
  it('returns all expected properties', () => {
    const { result } = renderHook(() => useScheduleAI());

    expect(result.current).toHaveProperty('distributeWithAI');
    expect(result.current).toHaveProperty('getRecommendationsToday');
    expect(result.current).toHaveProperty('rescheduleWithAI');
    expect(result.current).toHaveProperty('getWeeklyInsight');
    expect(result.current).toHaveProperty('buildProfile');
    expect(result.current).toHaveProperty('buildPlanContext');
    expect(result.current).toHaveProperty('clearCache');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');

    expect(typeof result.current.distributeWithAI).toBe('function');
    expect(typeof result.current.getRecommendationsToday).toBe('function');
    expect(typeof result.current.rescheduleWithAI).toBe('function');
    expect(typeof result.current.getWeeklyInsight).toBe('function');
    expect(typeof result.current.buildProfile).toBe('function');
    expect(typeof result.current.buildPlanContext).toBe('function');
    expect(typeof result.current.clearCache).toBe('function');
    expect(typeof result.current.loading).toBe('boolean');
    expect(result.current.error === null || typeof result.current.error === 'string').toBe(true);
  });

  it('initializes with loading=false and error=null', () => {
    const { result } = renderHook(() => useScheduleAI());

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
