// ============================================================
// Axon — Platform API: Content (Courses, Summaries, Keywords)
// Extracted from platformApi.ts (zero functional changes)
// NOTE: Semester/Section/Topic CRUD is in contentTreeApi.ts
// ============================================================

import { apiCall } from '@/app/lib/api';
import { extractItems } from '@/app/lib/api-helpers';
import type {
  UUID,
  Course,
  Summary,
  SummaryStatus,
  Keyword,
} from '@/app/types/platform';

const request = apiCall;

// ============================================================
// CONTENT — Courses
// ============================================================

export async function getCourses(institutionId?: UUID): Promise<Course[]> {
  const qs = institutionId ? `?institution_id=${institutionId}` : '';
  const result = await request(`/courses${qs}`);
  return extractItems<Course>(result);
}

export async function createCourse(data: {
  name: string;
  institution_id: UUID;
  description?: string;
  color?: string;
}): Promise<Course> {
  return request<Course>('/courses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCourse(courseId: UUID, data: Partial<Course>): Promise<Course> {
  return request<Course>(`/courses/${courseId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCourse(courseId: UUID): Promise<void> {
  return request(`/courses/${courseId}`, { method: 'DELETE' });
}

// ============================================================
// CONTENT — Summaries (professor-authored)
// ============================================================

export async function getTopicSummaries(topicId: UUID): Promise<Summary[]> {
  const result = await request(`/summaries?topic_id=${topicId}`);
  return extractItems<Summary>(result);
}

export async function createSummary(topicId: UUID, data: {
  institution_id?: UUID;
  title?: string;
  content_markdown: string;
  status?: SummaryStatus;
}): Promise<Summary> {
  return request<Summary>('/summaries', {
    method: 'POST',
    body: JSON.stringify({ ...data, topic_id: topicId }),
  });
}

export async function updateSummary(summaryId: UUID, data: Partial<Summary>): Promise<Summary> {
  return request<Summary>(`/summaries/${summaryId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSummary(summaryId: UUID): Promise<void> {
  return request(`/summaries/${summaryId}`, { method: 'DELETE' });
}

// ============================================================
// CONTENT — Keywords
// ============================================================

export async function getKeywords(institutionId?: UUID): Promise<Keyword[]> {
  const qs = institutionId ? `?institution_id=${institutionId}` : '';
  const result = await request(`/keywords${qs}`);
  return extractItems<Keyword>(result);
}

export async function createKeyword(data: {
  institution_id: UUID;
  term: string;
  definition?: string;
  priority?: number;
}): Promise<Keyword> {
  return request<Keyword>('/keywords', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateKeyword(keywordId: UUID, data: Partial<Keyword>): Promise<Keyword> {
  return request<Keyword>(`/keywords/${keywordId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteKeyword(keywordId: UUID): Promise<void> {
  return request(`/keywords/${keywordId}`, { method: 'DELETE' });
}
