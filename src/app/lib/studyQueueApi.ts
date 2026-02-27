// ============================================================
// Axon — Study Queue API Helper
//
// GET /study-queue?course_id=xxx&limit=20
// Backend algorithm: NeedScore = overdue(40%) + mastery(30%)
//                    + fragility(20%) + novelty(10%)
// Combines FSRS (card-level) + BKT (subtopic-level).
//
// Uses apiCall() from lib/api.ts (handles Auth headers).
// ============================================================

import { apiCall } from './api';

// ── Types ─────────────────────────────────────────────────

export interface StudyQueueItem {
  flashcard_id: string;
  summary_id: string;
  keyword_id: string;
  subtopic_id: string | null;
  front: string;
  back: string;
  front_image_url: string | null;
  back_image_url: string | null;
  need_score: number;
  retention: number;
  mastery_color: 'green' | 'yellow' | 'red' | 'gray';
  p_know: number;
  fsrs_state: 'new' | 'learning' | 'review' | 'relearning';
  due_at: string | null;
  stability: number;
  difficulty: number;
  is_new: boolean;
}

export interface StudyQueueMeta {
  total_due: number;
  total_new: number;
  total_in_queue: number;
  returned: number;
  limit: number;
  include_future: boolean;
  course_id: string | null;
  generated_at: string;
  algorithm: string;
  weights: {
    overdueWeight: number;
    masteryWeight: number;
    fragilityWeight: number;
    noveltyWeight: number;
    graceDays: number;
  };
}

export interface StudyQueueResponse {
  queue: StudyQueueItem[];
  meta: StudyQueueMeta;
}

export interface StudyQueueParams {
  course_id?: string;
  limit?: number;
  include_future?: boolean;
}

// ── API call ──────────────────────────────────────────────

export async function getStudyQueue(params: StudyQueueParams = {}): Promise<StudyQueueResponse> {
  const searchParams = new URLSearchParams();
  if (params.course_id) searchParams.set('course_id', params.course_id);
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.include_future) searchParams.set('include_future', '1');

  const qs = searchParams.toString();
  return apiCall<StudyQueueResponse>(`/study-queue${qs ? `?${qs}` : ''}`);
}
