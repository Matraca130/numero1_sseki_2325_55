/**
 * Plan generation logic for StudyOrganizerWizard.
 * Builds AI payloads, tries AI distribution, falls back to scheduling pipeline.
 */

import type { StudyPlan, StudyPlanTask } from '@/app/context/AppContext';
import { getAxonToday } from '@/app/utils/constants';
import { aiDistributeTasks } from '@/app/services/aiService';
import type { StudentProfilePayload, PlanContextPayload } from '@/app/services/aiService';
import { classifyDifficulty, runSchedulingPipeline } from '@/app/lib/scheduling-intelligence';
import type { ScheduleDay } from '@/app/lib/scheduling-intelligence';
import type { TopicDifficultyData } from '@/app/types/student';
import type { TopicMasteryInfo } from '@/app/hooks/useTopicMastery';
import type { StudySessionRecord, DailyActivityRecord, StudentStatsRecord } from '@/app/services/platformApi';
import { mapSessionHistoryForAI } from '@/app/utils/session-history-mapper';
import { getSubjectColor, getSubjectName } from './helpers';

interface GeneratePlanParams {
  selectedSubjects: string[];
  selectedMethods: string[];
  selectedTopics: { courseId: string; courseName: string; sectionTitle: string; topicTitle: string; topicId: string }[];
  completionDate: string;
  weeklyHours: number[];
  topicMastery: Map<string, TopicMasteryInfo>;
  difficultyMap: Map<string, number>;
  getTimeEstimate: (methodId: string) => { estimatedMinutes: number };
  courses: any[];
  existingPlanCount: number;
  // G1: Real student data for AI profile
  sessionHistory?: StudySessionRecord[];
  dailyActivity?: DailyActivityRecord[];
  stats?: StudentStatsRecord | null;
  // G2: Full difficulty data for scheduling pipeline
  studyIntelligenceTopics?: TopicDifficultyData[];
}

interface GeneratePlanResult {
  plan: StudyPlan;
  aiPowered: boolean;
}

/** Build schedule days from date range and weekly hours allocation. */
function buildScheduleDays(
  start: Date,
  end: Date,
  weeklyHours: number[],
): Array<{ date: Date; availableMinutes: number }> {
  const days: Array<{ date: Date; availableMinutes: number }> = [];
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    const hoursIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const availableMinutes = weeklyHours[hoursIdx] * 60;
    if (availableMinutes > 0) {
      days.push({ date: new Date(current), availableMinutes });
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/** Convert ScheduleDay[] from the pipeline into StudyPlanTask[]. */
function flattenDaysToTasks(days: ScheduleDay[], courses: any[]): StudyPlanTask[] {
  let taskIndex = 0;
  const tasks: StudyPlanTask[] = [];
  for (const day of days) {
    for (const task of day.tasks) {
      tasks.push({
        id: `task-${taskIndex++}`,
        date: new Date(day.date),
        title: task.topicTitle,
        subject: task.courseName,
        subjectColor: getSubjectColor(task.courseId, courses),
        method: task.method,
        estimatedMinutes: task.estimatedMinutes,
        completed: false,
        topicId: task.topicId,
      });
    }
  }
  return tasks;
}

export async function generateStudyPlan(params: GeneratePlanParams): Promise<GeneratePlanResult> {
  const {
    selectedSubjects, selectedMethods, selectedTopics, completionDate, weeklyHours,
    topicMastery, difficultyMap, getTimeEstimate, courses, existingPlanCount,
    sessionHistory, dailyActivity, stats, studyIntelligenceTopics,
  } = params;

  const today = getAxonToday();
  const endDate = new Date(completionDate);
  let aiPowered = false;

  // Build AI payloads
  const planContext: PlanContextPayload = {
    tasks: selectedTopics.flatMap(topic =>
      selectedMethods.map(method => ({
        topicId: topic.topicId, topicTitle: topic.topicTitle, method,
        estimatedMinutes: getTimeEstimate(method).estimatedMinutes,
        completed: false, scheduledDate: '',
      }))
    ),
    completionDate,
    weeklyHours,
  };

  const profile: StudentProfilePayload = {
    topicMastery: Object.fromEntries(
      selectedTopics.map(t => {
        const m = topicMastery.get(t.topicId);
        const difficulty = difficultyMap.get(t.topicId);
        return [t.topicId, {
          masteryPercent: m?.masteryPercent ?? 0, pKnow: m?.pKnow ?? null,
          needsReview: m?.needsReview ?? false, totalAttempts: m?.totalAttempts ?? 0,
          priorityScore: m?.priorityScore ?? 50,
          ...(difficulty !== undefined && { difficultyEstimate: difficulty }),
          ...(classifyDifficulty(difficulty ?? null) !== 'medium' && { difficultyTier: classifyDifficulty(difficulty ?? null) }),
        }];
      })
    ),
    sessionHistory: sessionHistory ? mapSessionHistoryForAI(sessionHistory) : [],
    dailyActivity: dailyActivity
      ? dailyActivity.map(d => ({
          date: d.activity_date,
          studyMinutes: Math.round(d.time_spent_seconds / 60),
          sessionsCount: d.sessions_count,
        }))
      : [],
    stats: stats
      ? {
          totalStudyMinutes: Math.round(stats.total_time_seconds / 60),
          totalSessions: stats.total_sessions ?? 0,
          currentStreak: stats.current_streak,
          avgMinutesPerSession: stats.total_sessions
            ? Math.round(stats.total_time_seconds / 60 / stats.total_sessions)
            : null,
        }
      : { totalStudyMinutes: 0, totalSessions: 0, currentStreak: 0, avgMinutesPerSession: null },
    studyMethods: selectedMethods,
  };

  // Try AI distribution
  let aiDistribution: { topicId: string; method: string; scheduledDate: string; estimatedMinutes: number; reason: string }[] | null = null;
  try {
    const result = await aiDistributeTasks(profile, planContext);
    if (result?._meta?.aiPowered && result.distribution?.length) {
      aiDistribution = result.distribution;
      aiPowered = true;
    }
  } catch { /* graceful degradation */ }

  // Build tasks
  let tasks: StudyPlanTask[];

  if (aiDistribution) {
    let taskIndex = 0;
    tasks = aiDistribution.map((item) => ({
      id: `task-${taskIndex++}`,
      date: new Date(item.scheduledDate),
      title: selectedTopics.find(t => t.topicId === item.topicId)?.topicTitle || item.topicId,
      subject: selectedTopics.find(t => t.topicId === item.topicId)?.courseName || '',
      subjectColor: getSubjectColor(selectedTopics.find(t => t.topicId === item.topicId)?.courseId || '', courses),
      method: item.method,
      estimatedMinutes: item.estimatedMinutes,
      completed: false,
      topicId: item.topicId,
    }));
  } else {
    // ── Intelligent fallback: scheduling pipeline ──────────────
    // Uses prerequisite ordering, cognitive load balancing, and
    // adaptive interleaving instead of simple 2:1 priority interleave.
    const fullDifficultyMap = new Map<string, TopicDifficultyData>();
    if (studyIntelligenceTopics) {
      for (const t of studyIntelligenceTopics) fullDifficultyMap.set(t.id, t);
    }

    const scheduleDays = buildScheduleDays(today, endDate, weeklyHours);
    const rawTasks = selectedTopics.flatMap(topic =>
      selectedMethods.map(method => ({
        topicId: topic.topicId,
        topicTitle: topic.topicTitle,
        method,
        estimatedMinutes: getTimeEstimate(method).estimatedMinutes,
        courseId: topic.courseId,
        courseName: topic.courseName,
        sectionTitle: topic.sectionTitle,
      }))
    );
    const masteryMap = new Map(
      selectedTopics.map(t => [t.topicId, topicMastery.get(t.topicId)?.masteryPercent ?? 0])
    );

    if (scheduleDays.length > 0) {
      const days = runSchedulingPipeline(rawTasks, fullDifficultyMap, scheduleDays, masteryMap);
      tasks = flattenDaysToTasks(days, courses);
    } else {
      // Edge case: no available days — assign all tasks to end date
      let taskIndex = 0;
      tasks = rawTasks.map(item => ({
        id: `task-${taskIndex++}`,
        date: new Date(endDate),
        title: item.topicTitle,
        subject: item.courseName,
        subjectColor: getSubjectColor(item.courseId, courses),
        method: item.method,
        estimatedMinutes: item.estimatedMinutes,
        completed: false,
        topicId: item.topicId,
      }));
    }
  }

  const plan: StudyPlan = {
    id: `plan-${Date.now()}`,
    name: `Plan de Estudio ${existingPlanCount + 1}`,
    subjects: selectedSubjects.map(id => ({ id, name: getSubjectName(id, courses), color: getSubjectColor(id, courses) })),
    methods: selectedMethods, selectedTopics, completionDate: endDate, weeklyHours, tasks,
    createdAt: getAxonToday(),
    totalEstimatedHours: Math.round(tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0) / 60),
  };

  return { plan, aiPowered };
}
