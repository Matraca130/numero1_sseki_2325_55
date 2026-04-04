/**
 * Plan generation logic for StudyOrganizerWizard.
 * Builds AI payloads, tries AI distribution, falls back to algorithmic.
 */

import type { StudyPlan, StudyPlanTask } from '@/app/context/AppContext';
import { getAxonToday } from '@/app/utils/constants';
import { aiDistributeTasks } from '@/app/services/aiService';
import type { StudentProfilePayload, PlanContextPayload } from '@/app/services/aiService';
import { adjustTimeByDifficulty, classifyDifficulty } from '@/app/lib/scheduling-intelligence';
import type { TopicMasteryInfo } from '@/app/hooks/useTopicMastery';
import type { WizardCourse } from './helpers';
import { getSubjectColor, getSubjectName } from './helpers';

/** Maximum time (ms) to wait for AI distribution before falling back to algorithmic. */
const AI_TIMEOUT_MS = 20_000;

interface GeneratePlanParams {
  selectedSubjects: string[];
  selectedMethods: string[];
  selectedTopics: { courseId: string; courseName: string; sectionTitle: string; topicTitle: string; topicId: string }[];
  completionDate: string;
  weeklyHours: number[];
  topicMastery: Map<string, TopicMasteryInfo>;
  difficultyMap: Map<string, number>;
  getTimeEstimate: (methodId: string) => { estimatedMinutes: number };
  courses: WizardCourse[];
  existingPlanCount: number;
}

interface GeneratePlanResult {
  plan: StudyPlan;
  aiPowered: boolean;
}

export async function generateStudyPlan(params: GeneratePlanParams): Promise<GeneratePlanResult> {
  const { selectedSubjects, selectedMethods, selectedTopics, completionDate, weeklyHours, topicMastery, difficultyMap, getTimeEstimate, courses, existingPlanCount } = params;

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
    sessionHistory: [], dailyActivity: [],
    stats: { totalStudyMinutes: 0, totalSessions: 0, currentStreak: 0, avgMinutesPerSession: null },
    studyMethods: selectedMethods,
  };

  // Try AI distribution with timeout
  let aiDistribution: { topicId: string; method: string; scheduledDate: string; estimatedMinutes: number; reason: string }[] | null = null;
  try {
    const aiPromise = aiDistributeTasks(profile, planContext);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), AI_TIMEOUT_MS));
    const result = await Promise.race([aiPromise, timeoutPromise]);
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
    tasks = [];
    let currentDay = new Date(today);
    let taskIndex = 0;

    const sortedTopics = [...selectedTopics].sort((a, b) => {
      const prioA = topicMastery.get(a.topicId)?.priorityScore ?? 50;
      const prioB = topicMastery.get(b.topicId)?.priorityScore ?? 50;
      return prioB - prioA;
    });

    const getAdjustedMinutes = (topicId: string, baseMinutes: number): number => {
      const difficulty = difficultyMap.get(topicId) ?? null;
      const masteryPercent = topicMastery.get(topicId)?.masteryPercent ?? 0;
      return adjustTimeByDifficulty(baseMinutes, difficulty, masteryPercent);
    };

    const allItems: { topicTitle: string; courseName: string; courseId: string; topicId: string; method: string; minutes: number }[] = [];
    for (const topic of sortedTopics) {
      for (const methodId of selectedMethods) {
        allItems.push({
          topicTitle: topic.topicTitle, courseName: topic.courseName, courseId: topic.courseId, topicId: topic.topicId, method: methodId,
          minutes: getAdjustedMinutes(topic.topicId, getTimeEstimate(methodId).estimatedMinutes),
        });
      }
    }

    const highPriority = allItems.filter(item => (topicMastery.get(item.topicId)?.priorityScore ?? 50) >= 60);
    const normalPriority = allItems.filter(item => (topicMastery.get(item.topicId)?.priorityScore ?? 50) < 60);
    const interleaved: typeof allItems = [];
    let hi = 0, lo = 0;
    while (hi < highPriority.length || lo < normalPriority.length) {
      if (hi < highPriority.length) interleaved.push(highPriority[hi++]);
      if (hi < highPriority.length) interleaved.push(highPriority[hi++]);
      if (lo < normalPriority.length) interleaved.push(normalPriority[lo++]);
    }

    let itemIdx = 0;
    while (currentDay <= endDate && itemIdx < interleaved.length) {
      const dayOfWeek = currentDay.getDay();
      const hoursIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const availableMinutes = weeklyHours[hoursIdx] * 60;
      if (availableMinutes > 0) {
        let usedMinutes = 0;
        while (usedMinutes < availableMinutes && itemIdx < interleaved.length) {
          const item = interleaved[itemIdx];
          if (usedMinutes + item.minutes <= availableMinutes + 10) {
            tasks.push({
              id: `task-${taskIndex++}`, date: new Date(currentDay), title: item.topicTitle,
              subject: item.courseName, subjectColor: getSubjectColor(item.courseId, courses),
              method: item.method, estimatedMinutes: item.minutes, completed: false, topicId: item.topicId,
            });
            usedMinutes += item.minutes; itemIdx++;
          } else break;
        }
      }
      currentDay.setDate(currentDay.getDate() + 1);
    }

    // Spread overflow tasks across last available days instead of dumping all on endDate
    if (itemIdx < interleaved.length) {
      const remainingItems = interleaved.slice(itemIdx);
      const lastDays: Date[] = [];
      const scanDate = new Date(endDate);
      while (lastDays.length < Math.min(3, remainingItems.length) && scanDate >= today) {
        const dow = scanDate.getDay();
        const hi = dow === 0 ? 6 : dow - 1;
        if (weeklyHours[hi] > 0) lastDays.unshift(new Date(scanDate));
        scanDate.setDate(scanDate.getDate() - 1);
      }
      if (lastDays.length === 0) lastDays.push(new Date(endDate));
      remainingItems.forEach((item, i) => {
        const dayForItem = lastDays[i % lastDays.length];
        tasks.push({
          id: `task-${taskIndex++}`, date: new Date(dayForItem), title: item.topicTitle,
          subject: item.courseName, subjectColor: getSubjectColor(item.courseId, courses),
          method: item.method, estimatedMinutes: item.minutes, completed: false, topicId: item.topicId,
        });
      });
    }
  }

  const plan: StudyPlan = {
    id: `plan-${Date.now()}`,
    name: `Plan de Estudio ${existingPlanCount + 1}`,
    subjects: selectedSubjects.map(id => ({ id, name: getSubjectName(id, courses), color: getSubjectColor(id, courses) })),
    methods: selectedMethods, selectedTopics, completionDate: endDate, weeklyHours, tasks,
    createdAt: getAxonToday(),
    totalEstimatedHours: Math.round(tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0) / 60),
    // When only one subject is selected, attach course_id for backend filtering
    ...(selectedSubjects.length === 1 && { courseId: selectedSubjects[0] }),
  };

  return { plan, aiPowered };
}
