// ============================================================
// Axon — Platform API: Study Plans, Tasks, Sessions
// Extracted from platformApi.ts (zero functional changes)
// ============================================================

import { apiCall } from '@/app/lib/api';
import type { UUID } from '@/app/types/platform';

const request = apiCall;

// ============================================================
// STUDY PLANS
// ============================================================

export interface StudyPlanRecord {
  id: string;
  student_id?: string;
  name: string;
  course_id?: string | null;
  status: 'active' | 'completed' | 'archived';
  completion_date?: string | null;
  weekly_hours?: number[] | null;
  metadata?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

export async function getStudyPlans(
  courseId?: string,
  status?: string
): Promise<StudyPlanRecord[]> {
  const params = new URLSearchParams();
  if (courseId) params.set('course_id', courseId);
  if (status) params.set('status', status);
  const qs = params.toString() ? `?${params}` : '';
  const result = await request<{ items: StudyPlanRecord[] } | StudyPlanRecord[]>(`/study-plans${qs}`);
  if (Array.isArray(result)) return result;
  return (result as any)?.items || [];
}

export async function getStudyPlan(planId: string): Promise<StudyPlanRecord> {
  return request<StudyPlanRecord>(`/study-plans/${planId}`);
}

export async function createStudyPlan(
  data: {
    name: string;
    course_id?: string;
    status?: string;
    completion_date?: string;
    weekly_hours?: number[];
    metadata?: Record<string, any>;
  }
): Promise<StudyPlanRecord> {
  return request<StudyPlanRecord>('/study-plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateStudyPlan(
  planId: string,
  data: {
    name?: string;
    status?: string;
    completion_date?: string | null;
    weekly_hours?: number[] | null;
    metadata?: Record<string, any> | null;
  }
): Promise<StudyPlanRecord> {
  return request<StudyPlanRecord>(`/study-plans/${planId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteStudyPlan(planId: string): Promise<void> {
  return request(`/study-plans/${planId}`, { method: 'DELETE' });
}

// ============================================================
// STUDY PLAN TASKS
// ============================================================

export interface StudyPlanTaskRecord {
  id: string;
  study_plan_id: string;
  item_type: string;
  item_id: string;
  status: 'pending' | 'completed' | 'skipped';
  order_index: number;
  completed_at?: string | null;
  original_method?: string | null;
  scheduled_date?: string | null;
  estimated_minutes?: number | null;
  metadata?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

export async function getStudyPlanTasks(
  studyPlanId: string
): Promise<StudyPlanTaskRecord[]> {
  const result = await request<{ items: StudyPlanTaskRecord[] } | StudyPlanTaskRecord[]>(
    `/study-plan-tasks?study_plan_id=${studyPlanId}`
  );
  if (Array.isArray(result)) return result;
  return (result as any)?.items || [];
}

export async function createStudyPlanTask(
  data: {
    study_plan_id: string;
    item_type: string;
    item_id: string;
    status?: string;
    order_index?: number;
    original_method?: string;
    scheduled_date?: string;
    estimated_minutes?: number;
  }
): Promise<StudyPlanTaskRecord> {
  return request<StudyPlanTaskRecord>('/study-plan-tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateStudyPlanTask(
  taskId: string,
  data: {
    status?: string;
    order_index?: number;
    completed_at?: string | null;
    scheduled_date?: string | null;
    estimated_minutes?: number;
    metadata?: Record<string, any> | null;
  }
): Promise<StudyPlanTaskRecord> {
  return request<StudyPlanTaskRecord>(`/study-plan-tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteStudyPlanTask(taskId: string): Promise<void> {
  return request(`/study-plan-tasks/${taskId}`, { method: 'DELETE' });
}

// ── Batch update tasks ─────────────────────────────────────────

export interface BatchUpdateTasksPayload {
  study_plan_id: string;
  updates: Array<{
    id: string;
    scheduled_date?: string;
    estimated_minutes?: number;
    order_index?: number;
    status?: string;
    metadata?: Record<string, any>;
  }>;
}

export interface BatchUpdateTasksResult {
  succeeded: number;
  failed: number;
  total: number;
}

export async function batchUpdateTasks(
  payload: BatchUpdateTasksPayload
): Promise<BatchUpdateTasksResult> {
  return request<BatchUpdateTasksResult>('/study-plan-tasks/batch', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// ── Reorder ───────────────────────────────────────────────────

export async function reorderItems(
  table: string,
  items: { id: string; order_index: number }[]
): Promise<void> {
  return request('/reorder', {
    method: 'PUT',
    body: JSON.stringify({ table, items }),
  });
}

// ============================================================
// STUDY SESSIONS
// ============================================================

export interface StudySessionRecord {
  id: string;
  student_id?: string;
  course_id?: string | null;
  session_type: 'flashcard' | 'quiz' | 'reading' | 'mixed';
  completed_at?: string | null;
  total_reviews: number;
  correct_reviews: number;
  created_at: string;
}

export async function createStudySession(
  data: { session_type: string; course_id?: string }
): Promise<StudySessionRecord> {
  return request<StudySessionRecord>('/study-sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateStudySession(
  sessionId: string,
  data: { completed_at?: string; total_reviews?: number; correct_reviews?: number }
): Promise<StudySessionRecord> {
  return request<StudySessionRecord>(`/study-sessions/${sessionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getStudySessions(
  options?: { course_id?: string; session_type?: string }
): Promise<StudySessionRecord[]> {
  const params = new URLSearchParams();
  if (options?.course_id) params.set('course_id', options.course_id);
  if (options?.session_type) params.set('session_type', options.session_type);
  const qs = params.toString() ? `?${params}` : '';
  const result = await request<{ items: StudySessionRecord[] } | StudySessionRecord[]>(
    `/study-sessions${qs}`
  );
  if (Array.isArray(result)) return result;
  return (result as any)?.items || [];
}
