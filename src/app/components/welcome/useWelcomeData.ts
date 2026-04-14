// ============================================================
// useWelcomeData — aggregates all real-data hooks for WelcomeView.
// Every metric exposed comes from a real backend API:
//   - XP: useGamificationProfile
//   - Streak: useStreakStatus
//   - Badges: profileData.badges_earned
//   - Study time: StudentDataContext
//   - Level: getLevelInfo(totalXP)
//   - Recent activity: useXPHistory
//   - Cards due: useStudyQueue
//   - Daily goal: profileData.xp.daily_goal_minutes
//   - Course progress: studentData.courseProgress + BKT via content tree
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { useAuth } from '@/app/context/AuthContext';
import {
  useGamificationProfile,
  useStreakStatus,
  useDailyCheckIn,
  useXPHistory,
  useStudyQueue,
} from '@/app/hooks/useGamification';
import { getLevelInfo } from '@/app/utils/gamification-helpers';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { useCourseMastery } from '@/app/hooks/useCourseMastery';
import { useRecentSessions } from '@/app/hooks/useRecentSessions';
import { WELCOME_COURSE_BASES, COURSE_PROGRESS_MAP } from '@/app/components/welcome/welcomeData';
import type { CourseProgress } from '@/app/types/student';
import { getGreeting, type TimeFilter } from './welcomeTokens';
import { useFilteredStats } from './useFilteredStats';

export function useWelcomeData(timeFilter: TimeFilter) {
  const {
    profile,
    stats,
    courseProgress,
    isConnected,
    loading: studentLoading,
  } = useStudentDataContext();
  const { bktStates } = useStudentDataContext() as any;
  const { tree } = useContentTree();
  const courseMastery = useCourseMastery(tree, bktStates ?? []);
  const { data: recentSessions } = useRecentSessions(10);
  const { selectedInstitution, user } = useAuth();
  const institutionId = selectedInstitution?.id;

  // ── Real data hooks ─────────────────────────────────────────
  const { data: profileData } = useGamificationProfile(institutionId);
  const { data: streak } = useStreakStatus(institutionId);
  const { data: xpHistoryResp, isLoading: xpHistoryLoading } = useXPHistory(institutionId);
  const { data: studyQueue } = useStudyQueue();
  const isLoadingActivity = xpHistoryLoading;
  const checkInMutation = useDailyCheckIn(institutionId);
  const [didCheckIn, setDidCheckIn] = useState(false);

  // Auto daily check-in
  useEffect(() => {
    if (!didCheckIn && !studentLoading && institutionId) {
      setDidCheckIn(true);
      checkInMutation.mutate(undefined, { onError: () => {} });
    }
  }, [studentLoading, institutionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived (all from real APIs) ────────────────────────────
  const studentName = user?.full_name ?? user?.name ?? profile?.name ?? 'Estudiante';
  const totalXP = profileData?.xp?.total ?? 0;
  const xpToday = profileData?.xp?.today ?? 0;
  const streakDays = streak?.current_streak ?? stats?.currentStreak ?? 0;
  const badgesEarned = profileData?.badges_earned ?? 0;
  const dailyGoalMinutes = profileData?.xp?.daily_goal_minutes ?? 60;
  const cardsDue = studyQueue?.meta?.total_due ?? 0;
  const cardsNew = studyQueue?.meta?.total_new ?? 0;
  const studiedToday = streak?.studied_today ?? false;
  const atRisk = streak?.streak_at_risk ?? false;
  const xpHistory = xpHistoryResp?.items ?? [];
  const levelInfo = getLevelInfo(totalXP);
  const greeting = getGreeting(studentName);
  const filtered = useFilteredStats(timeFilter, stats, profileData);

  // ── Course data: merge static bases with real data ────────
  const courseProgressMap = useMemo(() => {
    const map = new Map<string, CourseProgress>();
    for (const cp of courseProgress) {
      map.set(cp.courseId, cp);
      map.set(cp.courseName.toLowerCase(), cp);
    }
    return map;
  }, [courseProgress]);

  const getCourseProgress = useCallback(
    (baseId: string, baseTitle: string) => {
      const mappedId = COURSE_PROGRESS_MAP[baseId] || baseId;
      const cp = courseProgressMap.get(mappedId) || courseProgressMap.get(baseTitle.toLowerCase());
      if (cp) return { progress: cp.masteryPercent, completed: cp.lessonsCompleted, total: cp.lessonsTotal };

      const bktInfo = courseMastery.get(mappedId);
      if (bktInfo) {
        return {
          progress: bktInfo.mastery,
          completed: bktInfo.topicsWithBkt,
          total: bktInfo.topicsTotal,
        };
      }
      const titleLower = baseTitle.toLowerCase();
      for (const [, info] of courseMastery) {
        if (
          info.courseName.toLowerCase().includes(titleLower) ||
          titleLower.includes(info.courseName.toLowerCase())
        ) {
          return {
            progress: info.mastery,
            completed: info.topicsWithBkt,
            total: info.topicsTotal,
          };
        }
      }
      return { progress: 0, completed: 0, total: 0 };
    },
    [courseProgressMap, courseMastery],
  );

  const courseData = useMemo(
    () =>
      WELCOME_COURSE_BASES.map((base) => ({
        ...base,
        ...getCourseProgress(base.id, base.title),
      })),
    [getCourseProgress],
  );

  return {
    // identity
    studentName,
    greeting,
    // gamification
    totalXP,
    xpToday,
    streakDays,
    badgesEarned,
    dailyGoalMinutes,
    cardsDue,
    cardsNew,
    studiedToday,
    atRisk,
    levelInfo,
    xpHistory,
    // context
    stats,
    filtered,
    isConnected,
    isLoadingActivity,
    studentLoading,
    recentSessions: recentSessions ?? [],
    // courses
    courseData,
  };
}
