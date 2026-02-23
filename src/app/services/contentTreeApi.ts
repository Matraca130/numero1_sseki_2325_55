// ============================================================
// Axon — Content Tree API Service
//
// Endpoints per backend spec:
//   GET  /content-tree?institution_id=xxx   → nested tree
//   CRUD /courses, /semesters, /sections, /topics
//   PUT  /reorder                           → batch reorder
//
// Uses apiCall() from lib/api.ts (handles Authorization + X-Access-Token)
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────────

export interface TreeTopic {
  id: string;
  name: string;
  order_index?: number;
}

export interface TreeSection {
  id: string;
  name: string;
  order_index?: number;
  topics: TreeTopic[];
}

export interface TreeSemester {
  id: string;
  name: string;
  order_index?: number;
  sections: TreeSection[];
}

export interface TreeCourse {
  id: string;
  name: string;
  description?: string;
  order_index?: number;
  semesters: TreeSemester[];
}

export interface ContentTree {
  courses: TreeCourse[];
}

// ── Content Tree (full nested read) ───────────────────────
// IMPORTANT: GET /content-tree returns { "data": [...] } — the array
// of courses IS .data directly, NOT wrapped in { courses: [] }.
// apiCall() unwraps the envelope, so we get TreeCourse[] back.

export async function getContentTree(institutionId: string): Promise<TreeCourse[]> {
  return apiCall<TreeCourse[]>(`/content-tree?institution_id=${institutionId}`);
}

// ── Courses ───────────────────────────────────────────────

export async function createCourse(data: {
  institution_id: string;
  name: string;
  description?: string;
  order_index?: number;
}) {
  return apiCall<TreeCourse>('/courses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCourse(id: string, data: {
  name?: string;
  description?: string;
  order_index?: number;
  is_active?: boolean;
}) {
  return apiCall<TreeCourse>(`/courses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCourse(id: string) {
  return apiCall(`/courses/${id}`, { method: 'DELETE' });
}

// ── Semesters ─────────────────────────────────────────────

export async function createSemester(data: {
  course_id: string;
  name: string;
  order_index?: number;
}) {
  return apiCall<TreeSemester>('/semesters', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSemester(id: string, data: {
  name?: string;
  order_index?: number;
  is_active?: boolean;
}) {
  return apiCall<TreeSemester>(`/semesters/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSemester(id: string) {
  return apiCall(`/semesters/${id}`, { method: 'DELETE' });
}

// ── Sections ──────────────────────────────────────────────

export async function createSection(data: {
  semester_id: string;
  name: string;
  order_index?: number;
}) {
  return apiCall<TreeSection>('/sections', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSection(id: string, data: {
  name?: string;
  order_index?: number;
  is_active?: boolean;
}) {
  return apiCall<TreeSection>(`/sections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSection(id: string) {
  return apiCall(`/sections/${id}`, { method: 'DELETE' });
}

// ── Topics ────────────────────────────────────────────────

export async function createTopic(data: {
  section_id: string;
  name: string;
  order_index?: number;
}) {
  return apiCall<TreeTopic>('/topics', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTopic(id: string, data: {
  name?: string;
  order_index?: number;
  is_active?: boolean;
}) {
  return apiCall<TreeTopic>(`/topics/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTopic(id: string) {
  return apiCall(`/topics/${id}`, { method: 'DELETE' });
}

// ── Reorder ───────────────────────────────────────────────

export type ReorderTable = 'courses' | 'semesters' | 'sections' | 'topics';

export async function reorder(table: ReorderTable, items: { id: string; order_index: number }[]) {
  return apiCall('/reorder', {
    method: 'PUT',
    body: JSON.stringify({ table, items }),
  });
}