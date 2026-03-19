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

  const res = await apiCall<AiScheduleResponse>('/ai/schedule-agent', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return res;
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
