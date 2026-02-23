// ============================================================
// Axon — Summaries API Service (Professor Content CRUD)
//
// Uses apiCall() from lib/api.ts — handles Authorization + X-Access-Token.
// ALL routes are FLAT with query params (per backend spec).
//
// Response conventions (after apiCall unwraps { data: ... }):
//   CRUD factory lists: { items: [...], total, limit, offset }
//   Single objects: { ... }
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────────

export interface PaginatedList<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface Summary {
  id: string;
  topic_id: string;
  title: string | null;
  content_markdown: string | null;
  status: 'draft' | 'published' | 'rejected';
  order_index: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Chunk {
  id: string;
  summary_id: string;
  content: string;
  order_index: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SummaryKeyword {
  id: string;
  summary_id: string;
  name: string;
  definition: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Subtopic {
  id: string;
  keyword_id: string;
  name: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Video {
  id: string;
  summary_id: string;
  title: string;
  url: string;
  platform: string | null;
  duration_seconds: number | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// ── Summaries ─────────────────────────────────────────────

export async function getSummaries(topicId: string): Promise<PaginatedList<Summary>> {
  return apiCall<PaginatedList<Summary>>(`/summaries?topic_id=${topicId}`);
}

export async function getSummary(id: string): Promise<Summary> {
  return apiCall<Summary>(`/summaries/${id}`);
}

export async function createSummary(data: {
  topic_id: string;
  title?: string;
  content_markdown?: string;
  status?: 'draft' | 'published';
  order_index?: number;
}): Promise<Summary> {
  return apiCall<Summary>('/summaries', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSummary(id: string, data: {
  title?: string;
  content_markdown?: string;
  status?: 'draft' | 'published' | 'rejected';
  order_index?: number;
  is_active?: boolean;
}): Promise<Summary> {
  return apiCall<Summary>(`/summaries/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSummary(id: string): Promise<any> {
  return apiCall(`/summaries/${id}`, { method: 'DELETE' });
}

export async function restoreSummary(id: string): Promise<Summary> {
  return apiCall<Summary>(`/summaries/${id}/restore`, { method: 'PUT' });
}

// ── Chunks ────────────────────────────────────────────────

export async function getChunks(summaryId: string): Promise<PaginatedList<Chunk>> {
  return apiCall<PaginatedList<Chunk>>(`/chunks?summary_id=${summaryId}`);
}

export async function createChunk(data: {
  summary_id: string;
  content: string;
  order_index?: number;
  metadata?: Record<string, any>;
}): Promise<Chunk> {
  return apiCall<Chunk>('/chunks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateChunk(id: string, data: {
  content?: string;
  order_index?: number;
  metadata?: Record<string, any>;
}): Promise<Chunk> {
  return apiCall<Chunk>(`/chunks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteChunk(id: string): Promise<any> {
  return apiCall(`/chunks/${id}`, { method: 'DELETE' });
}

// ── Keywords ──────────────────────────────────────────────

export async function getKeywords(summaryId: string): Promise<PaginatedList<SummaryKeyword>> {
  return apiCall<PaginatedList<SummaryKeyword>>(`/keywords?summary_id=${summaryId}`);
}

export async function createKeyword(data: {
  summary_id: string;
  name: string;
  definition?: string;
  priority?: number;
}): Promise<SummaryKeyword> {
  return apiCall<SummaryKeyword>('/keywords', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateKeyword(id: string, data: {
  name?: string;
  definition?: string;
  priority?: number;
  is_active?: boolean;
}): Promise<SummaryKeyword> {
  return apiCall<SummaryKeyword>(`/keywords/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteKeyword(id: string): Promise<any> {
  return apiCall(`/keywords/${id}`, { method: 'DELETE' });
}

export async function restoreKeyword(id: string): Promise<SummaryKeyword> {
  return apiCall<SummaryKeyword>(`/keywords/${id}/restore`, { method: 'PUT' });
}

// ── Subtopics ─────────────────────────────────────────────

export async function getSubtopics(keywordId: string): Promise<PaginatedList<Subtopic>> {
  return apiCall<PaginatedList<Subtopic>>(`/subtopics?keyword_id=${keywordId}`);
}

export async function createSubtopic(data: {
  keyword_id: string;
  name: string;
  order_index?: number;
}): Promise<Subtopic> {
  return apiCall<Subtopic>('/subtopics', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSubtopic(id: string, data: {
  name?: string;
  order_index?: number;
  is_active?: boolean;
}): Promise<Subtopic> {
  return apiCall<Subtopic>(`/subtopics/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSubtopic(id: string): Promise<any> {
  return apiCall(`/subtopics/${id}`, { method: 'DELETE' });
}

// ── Videos ────────────────────────────────────────────────

export async function getVideos(summaryId: string): Promise<PaginatedList<Video>> {
  return apiCall<PaginatedList<Video>>(`/videos?summary_id=${summaryId}`);
}

export async function createVideo(data: {
  summary_id: string;
  title: string;
  url: string;
  platform?: string;
  duration_seconds?: number;
  order_index?: number;
}): Promise<Video> {
  return apiCall<Video>('/videos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateVideo(id: string, data: {
  title?: string;
  url?: string;
  platform?: string;
  duration_seconds?: number;
  order_index?: number;
  is_active?: boolean;
}): Promise<Video> {
  return apiCall<Video>(`/videos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteVideo(id: string): Promise<any> {
  return apiCall(`/videos/${id}`, { method: 'DELETE' });
}

// ── Reorder ───────────────────────────────────────────────

export type ReorderTable = 'summaries' | 'chunks' | 'subtopics' | 'videos';

export async function reorder(
  table: ReorderTable,
  items: { id: string; order_index: number }[]
): Promise<any> {
  return apiCall('/reorder', {
    method: 'PUT',
    body: JSON.stringify({ table, items }),
  });
}
