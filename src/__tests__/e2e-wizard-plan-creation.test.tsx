/**
 * Integration tests: Study Plan Wizard → Generation → Reschedule
 *
 * Covers the 3 gaps identified in ADR-001:
 * - G1: sessionHistory populated in AI payloads (not empty [])
 * - G2: Scheduling pipeline used in fallback (not simple interleave)
 * - G3: End-to-end flow coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateStudyPlan } from '@/app/components/content/study-organizer-wizard/plan-generation';
import { executeReschedule } from '@/app/hooks/study-plans/reschedule-runner';
import { mapSessionHistoryForAI } from '@/app/utils/session-history-mapper';
import {
  TOPIC_IDS,
  COURSE_IDS,
  mockTopicMastery,
  mockSessionHistory,
  mockDailyActivity,
  mockStudentStats,
  mockStudyIntelligenceResponse,
  mockDifficultyMap,
} from './helpers/study-plan-fixtures';

// ── Mocks ─────────────────────────────────────────────────

vi.mock('@/app/services/aiService', () => ({
  aiDistributeTasks: vi.fn(),
  aiReschedule: vi.fn(),
}));

vi.mock('@/app/services/platformApi', () => ({
  batchUpdateTasks: vi.fn().mockResolvedValue({ succeeded: 0, failed: 0, total: 0 }),
  updateStudyPlanTask: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/app/utils/constants', () => ({
  getAxonToday: () => new Date('2026-04-04'),
  METHOD_TIME_DEFAULTS: { flashcard: 25, resumo: 35, quiz: 20, reading: 30, summary: 35 } as Record<string, number>,
  BACKEND_ITEM_TYPE_TO_METHOD: { flashcard: 'flashcards', summary: 'resumo' } as Record<string, string>,
}));

vi.mock('@/app/utils/rescheduleEngine', () => ({
  applyAiReschedule: vi.fn(),
}));

vi.mock('@/app/lib/logger', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const { aiDistributeTasks, aiReschedule } = await import('@/app/services/aiService');

// ── Helpers ───────────────────────────────────────────────

const defaultGenerateParams = () => ({
  selectedSubjects: [COURSE_IDS.medicine],
  selectedMethods: ['flashcards', 'resumo'],
  selectedTopics: [
    { courseId: COURSE_IDS.medicine, courseName: 'Medicina', sectionTitle: 'Cardiología', topicTitle: 'Anatomía del corazón', topicId: TOPIC_IDS.anatomy },
    { courseId: COURSE_IDS.medicine, courseName: 'Medicina', sectionTitle: 'Cardiología', topicTitle: 'Fisiología cardíaca', topicId: TOPIC_IDS.physiology },
    { courseId: COURSE_IDS.medicine, courseName: 'Medicina', sectionTitle: 'Cardiología', topicTitle: 'Patología vascular', topicId: TOPIC_IDS.pathology },
  ],
  completionDate: '2026-04-30',
  weeklyHours: [2, 2, 2, 2, 2, 1, 1],
  topicMastery: mockTopicMastery(),
  difficultyMap: mockDifficultyMap(),
  getTimeEstimate: (method: string) => ({
    estimatedMinutes: method === 'flashcards' ? 25 : 35,
  }),
  courses: [{ id: COURSE_IDS.medicine, name: 'Medicina' }],
  existingPlanCount: 0,
  sessionHistory: mockSessionHistory(),
  dailyActivity: mockDailyActivity(),
  stats: mockStudentStats(),
  studyIntelligenceTopics: mockStudyIntelligenceResponse().topics,
});

// ── Tests ─────────────────────────────────────────────────

describe('Study Plan Wizard → Generation → Reschedule E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── G1: Session History ───────────────────────────────

  describe('G1: Session history pipeline', () => {
    it('maps session history records correctly for AI payload', () => {
      const sessions = mockSessionHistory();
      const mapped = mapSessionHistoryForAI(sessions);

      expect(mapped.length).toBe(10);
      expect(mapped[0]).toEqual({
        sessionType: 'quiz',
        durationMinutes: expect.any(Number),
        createdAt: expect.any(String),
        topicId: undefined,
      });
      // Duration estimated from total_reviews
      expect(mapped[0].durationMinutes).toBe(Math.round(sessions[0].total_reviews * 1.5));
    });

    it('filters out sessions without completed_at', () => {
      const sessions = mockSessionHistory();
      sessions[0].completed_at = null;
      sessions[1].completed_at = undefined as any;

      const mapped = mapSessionHistoryForAI(sessions);
      expect(mapped.length).toBe(8);
    });

    it('passes real sessionHistory to AI when generating plan', async () => {
      const mockAiResult = {
        _meta: { aiPowered: true },
        distribution: [
          { topicId: TOPIC_IDS.anatomy, method: 'flashcards', scheduledDate: '2026-04-05', estimatedMinutes: 25, reason: 'high mastery' },
        ],
      };
      (aiDistributeTasks as any).mockResolvedValueOnce(mockAiResult);

      const params = defaultGenerateParams();
      await generateStudyPlan(params);

      // Verify AI was called with real session history
      const calledProfile = (aiDistributeTasks as any).mock.calls[0][0];
      expect(calledProfile.sessionHistory.length).toBeGreaterThan(0);
      expect(calledProfile.sessionHistory[0].sessionType).toBeDefined();
      expect(calledProfile.sessionHistory[0].durationMinutes).toBeGreaterThan(0);
    });

    it('passes real stats and dailyActivity to AI profile', async () => {
      (aiDistributeTasks as any).mockRejectedValueOnce(new Error('AI unavailable'));

      const params = defaultGenerateParams();
      await generateStudyPlan(params);

      const calledProfile = (aiDistributeTasks as any).mock.calls[0][0];
      expect(calledProfile.stats.totalStudyMinutes).toBe(600); // 36000s / 60
      expect(calledProfile.stats.totalSessions).toBe(25);
      expect(calledProfile.stats.currentStreak).toBe(7);
      expect(calledProfile.dailyActivity.length).toBe(10);
    });
  });

  // ── G2: Scheduling Pipeline ───────────────────────────

  describe('G2: Scheduling pipeline activation', () => {
    it('falls back to scheduling pipeline when AI fails', async () => {
      (aiDistributeTasks as any).mockRejectedValueOnce(new Error('rate limited'));

      const params = defaultGenerateParams();
      const result = await generateStudyPlan(params);

      // Should not be AI-powered
      expect(result.aiPowered).toBe(false);

      // Should have tasks (3 topics × 2 methods = 6 tasks)
      expect(result.plan.tasks.length).toBe(6);

      // Tasks should be distributed across multiple days (not all on one day)
      const uniqueDates = new Set(result.plan.tasks.map(t =>
        t.date instanceof Date ? t.date.toISOString().slice(0, 10) : ''
      ));
      expect(uniqueDates.size).toBeGreaterThan(1);
    });

    it('pipeline distributes tasks respecting daily time budgets', async () => {
      (aiDistributeTasks as any).mockRejectedValueOnce(new Error('fail'));

      const params = defaultGenerateParams();
      // Set 1 hour per day Mon-Fri
      params.weeklyHours = [1, 1, 1, 1, 1, 0, 0];
      const result = await generateStudyPlan(params);

      // Each day should have ≤ 70 min (60 + 10 tolerance)
      const tasksByDate = new Map<string, number>();
      for (const task of result.plan.tasks) {
        const dateKey = (task.date as Date).toISOString().slice(0, 10);
        tasksByDate.set(dateKey, (tasksByDate.get(dateKey) || 0) + task.estimatedMinutes);
      }

      for (const [, minutes] of tasksByDate) {
        expect(minutes).toBeLessThanOrEqual(70); // 60min budget + 10min tolerance
      }
    });

    it('pipeline uses prerequisite ordering when studyIntelligence is available', async () => {
      (aiDistributeTasks as any).mockRejectedValueOnce(new Error('fail'));

      const params = defaultGenerateParams();
      // Physiology depends on anatomy, pathology depends on both
      const result = await generateStudyPlan(params);

      // Find first occurrence of each topic
      const firstOccurrence = new Map<string, number>();
      result.plan.tasks.forEach((t, idx) => {
        if (t.topicId && !firstOccurrence.has(t.topicId)) {
          firstOccurrence.set(t.topicId, idx);
        }
      });

      // Anatomy should come before physiology (prerequisite)
      const anatomyFirst = firstOccurrence.get(TOPIC_IDS.anatomy) ?? Infinity;
      const physiologyFirst = firstOccurrence.get(TOPIC_IDS.physiology) ?? Infinity;
      const pathologyFirst = firstOccurrence.get(TOPIC_IDS.pathology) ?? Infinity;

      expect(anatomyFirst).toBeLessThan(physiologyFirst);
      expect(physiologyFirst).toBeLessThan(pathologyFirst);
    });

    it('generates correct plan structure with AI distribution', async () => {
      const mockAiResult = {
        _meta: { aiPowered: true },
        distribution: [
          { topicId: TOPIC_IDS.anatomy, method: 'flashcards', scheduledDate: '2026-04-05', estimatedMinutes: 25, reason: 'test' },
          { topicId: TOPIC_IDS.physiology, method: 'resumo', scheduledDate: '2026-04-06', estimatedMinutes: 35, reason: 'test' },
        ],
      };
      (aiDistributeTasks as any).mockResolvedValueOnce(mockAiResult);

      const params = defaultGenerateParams();
      const result = await generateStudyPlan(params);

      expect(result.aiPowered).toBe(true);
      expect(result.plan.tasks.length).toBe(2);
      expect(result.plan.tasks[0].topicId).toBe(TOPIC_IDS.anatomy);
      expect(result.plan.tasks[0].method).toBe('flashcards');
      expect(result.plan.name).toBe('Plan de Estudio 1');
    });

    it('handles edge case: no available schedule days', async () => {
      (aiDistributeTasks as any).mockRejectedValueOnce(new Error('fail'));

      const params = defaultGenerateParams();
      params.weeklyHours = [0, 0, 0, 0, 0, 0, 0]; // no hours any day
      const result = await generateStudyPlan(params);

      // Should still create tasks (assigned to end date)
      expect(result.plan.tasks.length).toBe(6);
    });
  });

  // ── G2: Reschedule Pipeline ───────────────────────────

  describe('G2: Reschedule with pipeline fallback', () => {
    const baseRescheduleParams = () => ({
      planId: 'plan-test-001',
      tasksSnapshot: [
        { id: 'bt-1', study_plan_id: 'plan-test-001', item_type: 'flashcard', item_id: TOPIC_IDS.anatomy, status: 'completed' as const, order_index: 0, scheduled_date: '2026-04-05', estimated_minutes: 25, original_method: 'flashcards' },
        { id: 'bt-2', study_plan_id: 'plan-test-001', item_type: 'summary', item_id: TOPIC_IDS.physiology, status: 'pending' as const, order_index: 1, scheduled_date: '2026-04-06', estimated_minutes: 35, original_method: 'resumo' },
        { id: 'bt-3', study_plan_id: 'plan-test-001', item_type: 'flashcard', item_id: TOPIC_IDS.pathology, status: 'pending' as const, order_index: 2, scheduled_date: '2026-04-07', estimated_minutes: 25, original_method: 'flashcards' },
      ],
      backendPlan: {
        id: 'plan-test-001',
        name: 'Test Plan',
        status: 'active' as const,
        completion_date: '2026-04-30',
        weekly_hours: [2, 2, 2, 2, 2, 1, 1],
        created_at: '2026-04-01T00:00:00Z',
      },
      topicMap: new Map([
        [TOPIC_IDS.anatomy, { topicTitle: 'Anatomía', sectionTitle: 'Cardio', courseName: 'Medicina', courseId: COURSE_IDS.medicine, courseColor: 'bg-teal-500' }],
        [TOPIC_IDS.physiology, { topicTitle: 'Fisiología', sectionTitle: 'Cardio', courseName: 'Medicina', courseId: COURSE_IDS.medicine, courseColor: 'bg-teal-500' }],
        [TOPIC_IDS.pathology, { topicTitle: 'Patología', sectionTitle: 'Cardio', courseName: 'Medicina', courseId: COURSE_IDS.medicine, courseColor: 'bg-teal-500' }],
      ]),
      topicMastery: mockTopicMastery(),
      getTimeEstimate: (method: string) => ({
        estimatedMinutes: method === 'flashcards' ? 25 : 35,
      }),
      sessionHistory: mockSessionHistory(),
    });

    it('uses pipeline fallback when AI reschedule fails', async () => {
      (aiReschedule as any).mockRejectedValueOnce(new Error('AI down'));

      const result = await executeReschedule(baseRescheduleParams());

      expect(result.source).toBe('algorithmic');
      expect(result.didReschedule).toBe(true);
      expect(result.changes.length).toBe(2); // 2 pending tasks redistributed
    });

    it('returns no changes when all tasks are completed', async () => {
      const params = baseRescheduleParams();
      params.tasksSnapshot = params.tasksSnapshot.map(t => ({
        ...t,
        status: 'completed' as const,
      }));

      const result = await executeReschedule(params);

      expect(result.didReschedule).toBe(false);
      expect(result.source).toBe('none');
    });

    it('passes real sessionHistory to AI reschedule', async () => {
      (aiReschedule as any).mockRejectedValueOnce(new Error('fail'));

      const params = baseRescheduleParams();
      await executeReschedule(params);

      // AI was called with session history
      const calledProfile = (aiReschedule as any).mock.calls[0][0];
      expect(calledProfile.sessionHistory.length).toBeGreaterThan(0);
    });
  });

  // ── G1+G3: Mapper edge cases ──────────────────────────

  describe('Session history mapper edge cases', () => {
    it('returns empty array for empty input', () => {
      expect(mapSessionHistoryForAI([])).toEqual([]);
    });

    it('estimates duration from total_reviews', () => {
      const result = mapSessionHistoryForAI([{
        id: 's1',
        session_type: 'flashcard',
        completed_at: '2026-04-01T10:00:00Z',
        total_reviews: 20,
        correct_reviews: 15,
        created_at: '2026-04-01T09:00:00Z',
      }]);

      expect(result[0].durationMinutes).toBe(30); // 20 * 1.5
    });

    it('handles zero reviews gracefully', () => {
      const result = mapSessionHistoryForAI([{
        id: 's1',
        session_type: 'quiz',
        completed_at: '2026-04-01T10:00:00Z',
        total_reviews: 0,
        correct_reviews: 0,
        created_at: '2026-04-01T09:00:00Z',
      }]);

      expect(result[0].durationMinutes).toBe(2); // (0 || 1) * 1.5 = 1.5 → round = 2
    });
  });
});
