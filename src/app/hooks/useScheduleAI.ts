// ============================================================
// Axon — useScheduleAI hook
//
// Collects student profile data from contexts (TopicMastery,
// StudyTimeEstimates, StudyPlans, StudentData) and exposes
// four AI-powered schedule actions:
//   1. distributeWithAI   — intelligently distribute tasks
//   2. getRecommendationsToday — daily study recommendations
//   3. rescheduleWithAI   — reschedule after task completion
//   4. getWeeklyInsight   — weekly progress analysis
//
// Each action builds a StudentProfilePayload from live context
// data and delegates to the AI service layer (as-schedule.ts).
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { useTopicMasteryContext } from '@/app/context/TopicMasteryContext';
import { useStudyTimeEstimatesContext } from '@/app/context/StudyTimeEstimatesContext';
import { useStudyPlansContext } from '@/app/context/StudyPlansContext';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import {
  aiDistributeTasks,
  aiRecommendToday,
  aiReschedule,
  aiWeeklyInsight,
  type StudentProfilePayload,
  type PlanContextPayload,
  type AiScheduleResponse,
} from '@/app/services/aiService';

// ── Hook ────────────────────────────────────────────────────

export function useScheduleAI() {
  const { topicMastery } = useTopicMasteryContext();
  const { summary: timeSummary } = useStudyTimeEstimatesContext();
  const { plans } = useStudyPlansContext();
  const { stats, dailyActivity } = useStudentDataContext();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache daily recommendations for the session to avoid redundant calls
  const recommendationsCache = useRef<AiScheduleResponse | null>(null);

  // ── Build student profile from contexts ───────────────────

  const buildProfile = useCallback((): StudentProfilePayload => {
    // Convert topicMastery Map<string, TopicMasteryInfo> to Record
    const masteryRecord: StudentProfilePayload['topicMastery'] = {};
    topicMastery.forEach((info, topicId) => {
      masteryRecord[topicId] = {
        masteryPercent: info.masteryPercent,
        pKnow: info.pKnow,
        needsReview: info.needsReview,
        totalAttempts: info.totalAttempts,
        priorityScore: info.priorityScore,
      };
    });

    // Convert DailyActivity[] to the payload shape
    // DailyActivity has: date, studyMinutes, sessionsCount, cardsReviewed, retentionPercent?
    const dailyActivityPayload: StudentProfilePayload['dailyActivity'] =
      (dailyActivity ?? []).map((d) => ({
        date: d.date ?? '',
        studyMinutes: d.studyMinutes ?? 0,
        sessionsCount: d.sessionsCount ?? 0,
      }));

    // Build stats payload from StudentStats
    // StudentStats has: totalStudyMinutes, totalSessions, currentStreak, etc.
    const statsPayload: StudentProfilePayload['stats'] = {
      totalStudyMinutes: stats?.totalStudyMinutes ?? 0,
      totalSessions: stats?.totalSessions ?? 0,
      currentStreak: stats?.currentStreak ?? 0,
      avgMinutesPerSession: timeSummary.avgMinutesPerSession,
    };

    // Collect unique study methods across all plans
    const allMethods = new Set<string>();
    plans.forEach((p) => p.methods.forEach((m) => allMethods.add(m)));

    return {
      topicMastery: masteryRecord,
      sessionHistory: [], // Sessions not held in context; kept empty for now
      dailyActivity: dailyActivityPayload,
      stats: statsPayload,
      studyMethods: Array.from(allMethods),
    };
  }, [topicMastery, dailyActivity, stats, timeSummary, plans]);

  // ── Build plan context for a specific plan ────────────────

  const buildPlanContext = useCallback(
    (planId?: string): PlanContextPayload | undefined => {
      const plan = planId ? plans.find((p) => p.id === planId) : plans[0];
      if (!plan) return undefined;

      return {
        tasks: plan.tasks.map((t) => ({
          topicId: t.topicId ?? '',
          topicTitle: t.title,
          method: t.method,
          estimatedMinutes: t.estimatedMinutes,
          completed: t.completed,
          scheduledDate:
            t.date instanceof Date
              ? t.date.toISOString().slice(0, 10)
              : String(t.date),
        })),
        completionDate:
          plan.completionDate instanceof Date
            ? plan.completionDate.toISOString().slice(0, 10)
            : String(plan.completionDate),
        weeklyHours: plan.weeklyHours,
      };
    },
    [plans],
  );

  // ── Public API ────────────────────────────────────────────

  /** Distribute tasks across the plan calendar using AI */
  const distributeWithAI = useCallback(
    async (planContext: PlanContextPayload): Promise<AiScheduleResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await aiDistributeTasks(buildProfile(), planContext);
        return result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'AI distribution failed';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [buildProfile],
  );

  /** Get personalized study recommendations for today */
  const getRecommendationsToday = useCallback(
    async (forceRefresh = false): Promise<AiScheduleResponse | null> => {
      if (recommendationsCache.current && !forceRefresh) {
        return recommendationsCache.current;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await aiRecommendToday(buildProfile());
        recommendationsCache.current = result;
        return result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'AI recommendation failed';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [buildProfile],
  );

  /** Reschedule remaining tasks after a task is completed */
  const rescheduleWithAI = useCallback(
    async (
      completedTaskId: string,
      planId?: string,
    ): Promise<AiScheduleResponse | null> => {
      const planContext = buildPlanContext(planId);
      if (!planContext) {
        setError('No study plan found for rescheduling');
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        return await aiReschedule(buildProfile(), planContext, completedTaskId);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'AI reschedule failed';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [buildProfile, buildPlanContext],
  );

  /** Generate a weekly progress insight and analysis */
  const getWeeklyInsight = useCallback(async (): Promise<AiScheduleResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      return await aiWeeklyInsight(buildProfile());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI insight failed';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [buildProfile]);

  /** Clear cached recommendations (e.g., after plan changes) */
  const clearCache = useCallback(() => {
    recommendationsCache.current = null;
  }, []);

  return {
    distributeWithAI,
    getRecommendationsToday,
    rescheduleWithAI,
    getWeeklyInsight,
    buildProfile,
    buildPlanContext,
    clearCache,
    loading,
    error,
  };
}
