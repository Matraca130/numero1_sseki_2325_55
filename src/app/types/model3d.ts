// ============================================================
// Axon — 3D Model Domain Types
//
// Canonical type definitions for the 3D domain (Agent 6).
// Extracted from services/models3dApi.ts to follow the
// types-in-types/ convention (see platform.ts, student.ts).
// ============================================================

// ── Core entities ─────────────────────────────────────────

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
  /** DB CHECK constraint: 'point' | 'line' | 'area' */
  pin_type?: 'point' | 'line' | 'area';
  geometry: { x: number; y: number; z: number };
  normal?: { x: number; y: number; z: number };
  /** DB column is "title" (not "label") */
  title?: string;
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

// ── Model Layers & Parts (DB-backed since v4.4.1) ─────────

export interface ModelLayer {
  id: string;
  model_id: string;
  name: string;
  color_hex: string | null;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface ModelPart {
  id: string;
  model_id: string;
  name: string;
  layer_group: string | null;
  file_url: string | null;
  color_hex: string | null;
  opacity_default: number | null;
  is_visible_default: boolean | null;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

// ── Generic paginated response ────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// ── UI-level composite types (used by ThreeDView) ─────────

export interface SectionWithModels {
  sectionId: string;
  sectionName: string;
  semesterName: string;
  models: { topicId: string; topicName: string; model: Model3D }[];
  totalCount: number;
}