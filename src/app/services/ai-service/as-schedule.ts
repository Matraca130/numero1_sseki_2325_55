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

// ── Narrowing helpers ────────────────────────────────────
// Safe accessors for Claude's loosely-typed JSON responses.

function asArray(val: unknown): unknown[] {
  return Array.isArray(val) ? val : [];
}

function asRecord(val: unknown): Record<string, unknown> {
  return (val && typeof val === 'object' && !Array.isArray(val))
    ? (val as Record<string, unknown>)
    : {};
}

function str(val: unknown): string {
  return typeof val === 'string' ? val : '';
}

function num(val: unknown, fallback: number): number {
  return typeof val === 'number' ? val : fallback;
}

function strArray(val: unknown): string[] {
  return Array.isArray(val) ? val.filter((v): v is string => typeof v === 'string') : [];
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
    const recs = asArray(claude.recommendations ?? claude.todayRecommendations);
    base.todayRecommendations = recs.map((r) => {
      const rec = asRecord(r);
      return {
        topicId: str(rec.topicId),
        topicTitle: str(rec.topicTitle ?? rec.topicName),
        method: str(rec.method ?? rec.taskType),
        reason: str(rec.reason),
        priority: num(rec.priority, 3),
      };
    });
  } else if (action === 'distribute') {
    const sched = asArray(claude.schedule ?? claude.distribution);
    const flat: AiDistribution[] = [];
    for (const item of sched) {
      const entry = asRecord(item);
      if (entry.blocks) {
        for (const block of asArray(entry.blocks)) {
          const b = asRecord(block);
          flat.push({
            topicId: str(b.topicId),
            method: str(b.method ?? b.taskType),
            scheduledDate: str(entry.day),
            estimatedMinutes: num(b.duration_min ?? b.estimatedMinutes, 30),
            reason: str(b.reason),
          });
        }
      } else {
        flat.push({
          topicId: str(entry.topicId),
          method: str(entry.method ?? entry.taskType),
          scheduledDate: str(entry.scheduledDate ?? entry.day),
          estimatedMinutes: num(entry.estimatedMinutes ?? entry.duration_min, 30),
          reason: str(entry.reason),
        });
      }
    }
    base.distribution = flat;
  } else if (action === 'reschedule') {
    const sched = asArray(claude.updatedSchedule ?? claude.rescheduledTasks);
    const flat: AiRescheduledTask[] = [];
    for (const item of sched) {
      const entry = asRecord(item);
      if (entry.blocks) {
        for (const block of asArray(entry.blocks)) {
          const b = asRecord(block);
          flat.push({
            taskId: str(b.taskId ?? b.topicId),
            newDate: str(entry.day),
            newEstimatedMinutes: num(b.duration_min ?? b.newEstimatedMinutes, 30),
            reason: str(b.reason),
          });
        }
      } else {
        flat.push({
          taskId: str(entry.taskId ?? entry.topicId),
          newDate: str(entry.newDate ?? entry.day),
          newEstimatedMinutes: num(entry.newEstimatedMinutes ?? entry.duration_min, 30),
          reason: str(entry.reason),
        });
      }
    }
    base.rescheduledTasks = flat;
  } else if (action === 'weekly-insight') {
    const focusItems = asArray(claude.recommendedFocus);
    const mappedFocus = focusItems.map((f) => {
      if (typeof f === 'string') return f;
      const rec = asRecord(f);
      return `${str(rec.topicName)}: ${str(rec.reason)}`;
    });
    base.insight = {
      summary: str(claude.weekSummary ?? claude.summary),
      strengths: strArray(claude.strengths),
      weaknesses: strArray(claude.weaknesses),
      recommendations: mappedFocus.length > 0 ? mappedFocus : strArray(claude.recommendations),
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
