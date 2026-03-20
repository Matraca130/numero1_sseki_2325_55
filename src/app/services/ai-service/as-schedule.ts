// ============================================================
// Axon — AI Schedule Agent Service
//
// Backend: POST /ai/schedule-agent
// Actions: distribute | recommend-today | reschedule | weekly-insight
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────────

export interface StudentProfilePayload {
  topicMastery: Record<string, {
    masteryPercent: number;
    pKnow: number | null;
    needsReview: boolean;
    totalAttempts: number;
    priorityScore: number;
  }>;
  sessionHistory: {
    sessionType: string;
    durationMinutes: number;
    createdAt: string;
    topicId?: string;
  }[];
  dailyActivity: {
    date: string;
    studyMinutes: number;
    sessionsCount: number;
  }[];
  stats: {
    totalStudyMinutes: number;
    totalSessions: number;
    currentStreak: number;
    avgMinutesPerSession: number | null;
  };
  studyMethods: string[];
}

export interface PlanContextPayload {
  tasks: {
    topicId: string;
    topicTitle: string;
    method: string;
    estimatedMinutes: number;
    completed: boolean;
    scheduledDate: string;
  }[];
  completionDate: string;
  weeklyHours: number[];
}

export interface AiDistribution {
  topicId: string;
  method: string;
  scheduledDate: string;
  estimatedMinutes: number;
  reason: string;
}

export interface AiRecommendation {
  topicId: string;
  topicTitle: string;
  method: string;
  reason: string;
  priority: number;
}

export interface AiRescheduledTask {
  taskId: string;
  newDate: string;
  newEstimatedMinutes: number;
  reason: string;
}

export interface AiInsight {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface AiScheduleMeta {
  model: string;
  tokensUsed: number;
  confidence: string;
  aiPowered: boolean;
}

export interface AiScheduleResponse {
  distribution?: AiDistribution[];
  todayRecommendations?: AiRecommendation[];
  rescheduledTasks?: AiRescheduledTask[];
  insight?: AiInsight;
  _meta: AiScheduleMeta;
}

// ── Normalizer ────────────────────────────────────────────
// The backend wraps Claude's JSON in { result, _meta }.
// Claude's field names vary between runs, so we normalize
// them into our typed AiScheduleResponse interface.

function normalizeClaudeResponse(
  action: string,
  claude: Record<string, unknown>,
  meta: AiScheduleMeta,
): AiScheduleResponse {
  const base: AiScheduleResponse = { _meta: meta };

  if (action === 'recommend-today') {
    const recs = (claude.recommendations ?? claude.todayRecommendations ?? []) as any[];
    base.todayRecommendations = recs.map((r: any) => ({
      topicId: r.topicId ?? '',
      topicTitle: r.topicTitle ?? r.topicName ?? '',
      method: r.method ?? r.taskType ?? '',
      reason: r.reason ?? '',
      priority: r.priority ?? 3,
    }));
  } else if (action === 'distribute') {
    const sched = (claude.schedule ?? claude.distribution ?? []) as any[];
    const flat: AiDistribution[] = [];
    for (const item of sched) {
      if (item.blocks) {
        for (const block of item.blocks as any[]) {
          flat.push({
            topicId: block.topicId ?? '',
            method: block.method ?? block.taskType ?? '',
            scheduledDate: item.day ?? '',
            estimatedMinutes: block.duration_min ?? block.estimatedMinutes ?? 30,
            reason: block.reason ?? '',
          });
        }
      } else {
        flat.push({
          topicId: item.topicId ?? '',
          method: item.method ?? item.taskType ?? '',
          scheduledDate: item.scheduledDate ?? item.day ?? '',
          estimatedMinutes: item.estimatedMinutes ?? item.duration_min ?? 30,
          reason: item.reason ?? '',
        });
      }
    }
    base.distribution = flat;
  } else if (action === 'reschedule') {
    const sched = (claude.updatedSchedule ?? claude.rescheduledTasks ?? []) as any[];
    const flat: AiRescheduledTask[] = [];
    for (const item of sched) {
      if (item.blocks) {
        for (const block of item.blocks as any[]) {
          flat.push({
            taskId: block.taskId ?? block.topicId ?? '',
            newDate: item.day ?? '',
            newEstimatedMinutes: block.duration_min ?? block.newEstimatedMinutes ?? 30,
            reason: block.reason ?? '',
          });
        }
      } else {
        flat.push({
          taskId: item.taskId ?? item.topicId ?? '',
          newDate: item.newDate ?? item.day ?? '',
          newEstimatedMinutes: item.newEstimatedMinutes ?? item.duration_min ?? 30,
          reason: item.reason ?? '',
        });
      }
    }
    base.rescheduledTasks = flat;
  } else if (action === 'weekly-insight') {
    const insight = claude as any;
    base.insight = {
      summary: insight.weekSummary ?? insight.summary ?? '',
      strengths: insight.strengths ?? [],
      weaknesses: insight.weaknesses ?? [],
      recommendations: insight.recommendedFocus?.map?.((f: any) =>
        typeof f === 'string' ? f : `${f.topicName}: ${f.reason}`
      ) ?? insight.recommendations ?? [],
    };
  }

  return base;
}

// ── API Functions ─────────────────────────────────────────

async function callScheduleAgent(
  action: 'distribute' | 'recommend-today' | 'reschedule' | 'weekly-insight',
  studentProfile: StudentProfilePayload,
  planContext?: PlanContextPayload,
  completedTaskId?: string,
): Promise<AiScheduleResponse> {
  const body: Record<string, unknown> = { action, studentProfile };
  if (planContext) body.planContext = planContext;
  if (completedTaskId) body.completedTaskId = completedTaskId;

  const raw = await apiCall<{ result: Record<string, unknown> | null; _meta: AiScheduleMeta }>(
    '/ai/schedule-agent',
    { method: 'POST', body: JSON.stringify(body) },
  );

  // Backend wraps Claude's JSON in { result, _meta }
  // We normalize Claude's varied field names into our typed interface
  const claude = raw.result ?? {};
  const meta = raw._meta ?? { model: '', tokensUsed: 0, confidence: '', aiPowered: false };

  return normalizeClaudeResponse(action, claude, meta);
}

/** Generate intelligent task distribution for a study plan */
export async function aiDistributeTasks(
  profile: StudentProfilePayload,
  planContext: PlanContextPayload,
): Promise<AiScheduleResponse> {
  return callScheduleAgent('distribute', profile, planContext);
}

/** Get personalized daily study recommendations */
export async function aiRecommendToday(
  profile: StudentProfilePayload,
): Promise<AiScheduleResponse> {
  return callScheduleAgent('recommend-today', profile);
}

/** Intelligently reschedule remaining tasks after completion */
export async function aiReschedule(
  profile: StudentProfilePayload,
  planContext: PlanContextPayload,
  completedTaskId: string,
): Promise<AiScheduleResponse> {
  return callScheduleAgent('reschedule', profile, planContext, completedTaskId);
}

/** Generate weekly progress insight and analysis */
export async function aiWeeklyInsight(
  profile: StudentProfilePayload,
): Promise<AiScheduleResponse> {
  return callScheduleAgent('weekly-insight', profile);
}
