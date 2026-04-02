// ============================================================
// Axon — Student API: Content (Summaries + Keywords)
// Extracted from studentApi.ts (zero functional changes)
// ============================================================

import { apiCall } from '@/app/lib/api';
import type { StudySummary } from '@/app/types/student';

// ══════════════════ STUDY SUMMARIES ══════════════════

export async function getStudySummary(
  _studentId: string,
  _courseId: string,
  topicId: string
): Promise<StudySummary | null> {
  try {
    const raw = await apiCall<any>(`/summaries?topic_id=${topicId}`);
    const items = Array.isArray(raw) ? raw : raw?.items || [];
    if (items.length === 0) return null;
    return items[0] as StudySummary;
  } catch {
    return null;
  }
}

export async function getAllSummaries(_studentId?: string): Promise<StudySummary[]> {
  return [];
}

export async function getCourseSummaries(
  _courseId: string,
  _studentId?: string
): Promise<StudySummary[]> {
  return [];
}

export async function saveStudySummary(
  _studentId: string,
  _courseId: string,
  _topicId: string,
  data: Partial<StudySummary>
): Promise<StudySummary> {
  return data as StudySummary;
}

export async function deleteStudySummary(
  _studentId: string,
  _courseId: string,
  _topicId: string
): Promise<void> {}

// ═════════════════════ KEYWORDS ═════════════════════

export async function getKeywords(
  _courseId: string,
  _studentId?: string
): Promise<any> {
  return { keywords: {} };
}

export async function saveKeywords(
  _courseId: string,
  _topicId: string,
  _keywords: Record<string, any>,
  _studentId?: string
): Promise<any> {
  return { saved: true };
}

export async function saveCourseKeywords(
  _courseId: string,
  _keywords: Record<string, any>,
  _studentId?: string
): Promise<any> {
  return { saved: true };
}
