// ============================================================
// Axon — 3D Models API Service
//
// Endpoints:
//   Models:  GET/POST/PUT/DELETE /models-3d
//   Pins:    GET/POST/PUT/DELETE /model-3d-pins
//   Notes:   GET/POST/PUT/DELETE /model-3d-notes (student private)
//
// Uses apiCall() from lib/api.ts (handles Auth headers).
// Response shape: { data: { items: [...], total, limit, offset } }
// apiCall() unwraps .data → we get { items, total, limit, offset }.
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────────

export interface Model3D {
  id: string;
  topic_id: string;
  title: string;
  file_url: string;
  file_format?: string;
  thumbnail_url?: string;
  file_size_bytes?: number;
  order_index?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Model3DPin {
  id: string;
  model_id: string;
  keyword_id?: string;
  pin_type?: 'annotation' | 'label' | 'link';
  geometry: { x: number; y: number; z: number };
  normal?: { x: number; y: number; z: number };
  label?: string;
  color?: string;
  description?: string;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Model3DNote {
  id: string;
  model_id: string;
  geometry?: { x: number; y: number; z: number };
  note: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// ── Models 3D ─────────────────────────────────────────────

export async function getModels3D(topicId: string): Promise<PaginatedResponse<Model3D>> {
  return apiCall<PaginatedResponse<Model3D>>(`/models-3d?topic_id=${topicId}`);
}

export async function getModel3DById(id: string): Promise<Model3D> {
  return apiCall<Model3D>(`/models-3d/${id}`);
}

export async function createModel3D(data: {
  topic_id: string;
  title: string;
  file_url: string;
  file_format?: string;
  thumbnail_url?: string;
  file_size_bytes?: number;
  order_index?: number;
}): Promise<Model3D> {
  return apiCall<Model3D>('/models-3d', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateModel3D(id: string, data: {
  title?: string;
  file_url?: string;
  file_format?: string;
  thumbnail_url?: string;
  file_size_bytes?: number;
  order_index?: number;
  is_active?: boolean;
}): Promise<Model3D> {
  return apiCall<Model3D>(`/models-3d/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteModel3D(id: string): Promise<void> {
  return apiCall(`/models-3d/${id}`, { method: 'DELETE' });
}

export async function restoreModel3D(id: string): Promise<Model3D> {
  return apiCall<Model3D>(`/models-3d/${id}/restore`, { method: 'PUT' });
}

// ── Model 3D Pins ─────────────────────────────────────────

export async function getModel3DPins(modelId: string, keywordId?: string): Promise<PaginatedResponse<Model3DPin>> {
  let path = `/model-3d-pins?model_id=${modelId}`;
  if (keywordId) path += `&keyword_id=${keywordId}`;
  return apiCall<PaginatedResponse<Model3DPin>>(path);
}

export async function createModel3DPin(data: {
  model_id: string;
  geometry: { x: number; y: number; z: number };
  keyword_id?: string;
  pin_type?: 'annotation' | 'label' | 'link';
  normal?: { x: number; y: number; z: number };
  label?: string;
  color?: string;
  description?: string;
  order_index?: number;
}): Promise<Model3DPin> {
  return apiCall<Model3DPin>('/model-3d-pins', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateModel3DPin(id: string, data: {
  keyword_id?: string;
  pin_type?: 'annotation' | 'label' | 'link';
  geometry?: { x: number; y: number; z: number };
  normal?: { x: number; y: number; z: number };
  label?: string;
  color?: string;
  description?: string;
  order_index?: number;
}): Promise<Model3DPin> {
  return apiCall<Model3DPin>(`/model-3d-pins/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteModel3DPin(id: string): Promise<void> {
  return apiCall(`/model-3d-pins/${id}`, { method: 'DELETE' });
}

// ── Model 3D Notes (Student) ──────────────────────────────

export async function getModel3DNotes(modelId: string): Promise<PaginatedResponse<Model3DNote>> {
  return apiCall<PaginatedResponse<Model3DNote>>(`/model-3d-notes?model_id=${modelId}`);
}

export async function createModel3DNote(data: {
  model_id: string;
  geometry?: { x: number; y: number; z: number };
  note: string;
}): Promise<Model3DNote> {
  return apiCall<Model3DNote>('/model-3d-notes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateModel3DNote(id: string, data: {
  geometry?: { x: number; y: number; z: number };
  note?: string;
}): Promise<Model3DNote> {
  return apiCall<Model3DNote>(`/model-3d-notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteModel3DNote(id: string): Promise<void> {
  return apiCall(`/model-3d-notes/${id}`, { method: 'DELETE' });
}

export async function restoreModel3DNote(id: string): Promise<Model3DNote> {
  return apiCall<Model3DNote>(`/model-3d-notes/${id}/restore`, { method: 'PUT' });
}
