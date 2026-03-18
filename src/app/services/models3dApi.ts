// ============================================================
// Axon — 3D Models API Service
//
// Endpoints:
//   Models:  GET/POST/PUT/DELETE /models-3d
//   Batch:   GET /models-3d/batch?topic_ids=a,b,c  (H2 optimization)
//   Pins:    GET/POST/PUT/DELETE /model-3d-pins
//   Notes:   GET/POST/PUT/DELETE /model-3d-notes (student private)
//   Layers:  GET/POST/PUT/DELETE /model-layers
//   Parts:   GET/POST/PUT/DELETE /model-parts
//
// Uses apiCall() from lib/api.ts (handles Auth headers).
// Response shape: { data: { items: [...], total, limit, offset } }
// apiCall() unwraps .data → we get { items, total, limit, offset }.
// ============================================================

import { apiCall } from '@/app/lib/api';
import { realRequest, ApiError } from '@/app/services/apiConfig';
import { logger } from '@/app/lib/logger';

// ── Types (canonical definitions in types/model3d.ts) ─────
import type { Model3D, Model3DPin, Model3DNote, ModelLayer, ModelPart, PaginatedResponse } from '@/app/types/model3d';
export type { Model3D, Model3DPin, Model3DNote, ModelLayer, ModelPart, PaginatedResponse };

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
  pin_type?: 'point' | 'line' | 'area';
  normal?: { x: number; y: number; z: number };
  title?: string;
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
  pin_type?: 'point' | 'line' | 'area';
  geometry?: { x: number; y: number; z: number };
  normal?: { x: number; y: number; z: number };
  title?: string;
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

// ── Model Layers ──────────────────────────────────────────

export async function getModelLayers(modelId: string): Promise<PaginatedResponse<ModelLayer>> {
  return apiCall<PaginatedResponse<ModelLayer>>(`/model-layers?model_id=${modelId}`);
}

export async function createModelLayer(data: {
  model_id: string;
  name: string;
  color_hex?: string;
  order_index?: number;
}): Promise<ModelLayer> {
  return apiCall<ModelLayer>('/model-layers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateModelLayer(id: string, data: {
  name?: string;
  color_hex?: string;
  order_index?: number;
}): Promise<ModelLayer> {
  return apiCall<ModelLayer>(`/model-layers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteModelLayer(id: string): Promise<void> {
  return apiCall(`/model-layers/${id}`, { method: 'DELETE' });
}

// ── Model Parts ───────────────────────────────────────────

export async function getModelParts(modelId: string): Promise<PaginatedResponse<ModelPart>> {
  return apiCall<PaginatedResponse<ModelPart>>(`/model-parts?model_id=${modelId}`);
}

export async function createModelPart(data: {
  model_id: string;
  name: string;
  layer_group?: string;
  file_url?: string;
  color_hex?: string;
  opacity_default?: number;
  is_visible_default?: boolean;
  order_index?: number;
}): Promise<ModelPart> {
  return apiCall<ModelPart>('/model-parts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateModelPart(id: string, data: {
  name?: string;
  layer_group?: string;
  file_url?: string;
  color_hex?: string;
  opacity_default?: number;
  is_visible_default?: boolean;
  order_index?: number;
}): Promise<ModelPart> {
  return apiCall<ModelPart>(`/model-parts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteModelPart(id: string): Promise<void> {
  return apiCall(`/model-parts/${id}`, { method: 'DELETE' });
}

// ════════════════════════════════════════════════════════════
// ── Batch Fetch: getModels3DBatch (H2 audit fix) ──────────
//
// PROBLEM:
//   ThreeDView fetches models for EVERY topic in the content tree
//   individually (N requests for N topics). With 100 topics = 100
//   parallel requests → saturates network, hits rate limits.
//
// SOLUTION (3-tier):
//   1. In-memory cache (5 min TTL) — instant for repeat visits
//   2. Batch endpoint GET /models-3d/batch?topic_ids=a,b,c
//      → 1 request instead of N (backend PR#39 in axon-backend)
//   3. Throttled fallback — if batch 404s, falls back to
//      per-topic calls with max 6 concurrent (browser limit)
// ════════════════════════════════════════════════════════════

// ── In-memory cache ───────────────────────────────────────

interface CacheEntry {
  data: Model3D[];
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const _modelsCache = new Map<string, CacheEntry>();

function getCached(topicId: string): Model3D[] | null {
  const entry = _modelsCache.get(topicId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    _modelsCache.delete(topicId);
    return null;
  }
  return entry.data;
}

function setCache(topicId: string, models: Model3D[]): void {
  _modelsCache.set(topicId, { data: models, timestamp: Date.now() });
}

/** Clear the in-memory models cache (e.g., after professor uploads a new model) */
export function invalidateModelsCache(): void {
  _modelsCache.clear();
}

// ── Throttled concurrent execution ────────────────────────

async function throttledAll<T>(
  tasks: (() => Promise<T>)[],
  maxConcurrent: number,
  signal?: AbortSignal,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    while (nextIndex < tasks.length) {
      if (signal?.aborted) return;
      const idx = nextIndex++;
      try {
        const value = await tasks[idx]();
        results[idx] = { status: 'fulfilled', value };
      } catch (reason) {
        results[idx] = { status: 'rejected', reason };
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(maxConcurrent, tasks.length) },
    () => runNext(),
  );
  await Promise.all(workers);
  return results;
}

// ── Batch endpoint ────────────────────────────────────────

/** Flag: set to true once the batch endpoint returns 404 to avoid retrying */
let _batchEndpointUnavailable = false;
/** Timestamp when the flag was set — resets after BATCH_UNAVAIL_TTL_MS */
let _batchDisabledAt = 0;
/** TTL for the batch-unavailable flag: retry after 10 minutes */
const BATCH_UNAVAIL_TTL_MS = 10 * 60 * 1000;

/**
 * Batch-fetch models for multiple topics in a single request.
 *
 * Strategy:
 *   1. Return cached results instantly for topics already in cache
 *   2. Try batch endpoint for remaining topic IDs (1 request)
 *   3. If batch 404s → fall back to throttled per-topic calls (max 6)
 *
 * @param topicIds - Array of topic UUIDs to fetch models for
 * @param signal   - Optional AbortSignal for cancellation
 * @returns Map of topicId → Model3D[] (empty array if no models for that topic)
 */
export async function getModels3DBatch(
  topicIds: string[],
  signal?: AbortSignal,
): Promise<Record<string, Model3D[]>> {
  const result: Record<string, Model3D[]> = {};
  const uncached: string[] = [];

  // 1. Check cache
  for (const id of topicIds) {
    const cached = getCached(id);
    if (cached !== null) {
      result[id] = cached;
    } else {
      uncached.push(id);
    }
  }

  if (uncached.length === 0) {
    logger.debug('Models3D', `Batch: ${topicIds.length} topics all from cache`);
    return result;
  }

  // 2. Try batch endpoint (unless previously 404'd)
  if (_batchEndpointUnavailable && Date.now() - _batchDisabledAt > BATCH_UNAVAIL_TTL_MS) {
    _batchEndpointUnavailable = false;
    logger.debug('Models3D', 'Batch unavailable TTL expired, retrying batch endpoint');
  }
  if (!_batchEndpointUnavailable && uncached.length > 1) {
    try {
      const qs = uncached.join(',');
      const batchResult = await realRequest<Record<string, Model3D[]>>(
        `/models-3d/batch?topic_ids=${qs}`,
      );

      // batchResult shape: { [topicId]: Model3D[] }
      for (const tid of uncached) {
        const models = batchResult[tid] || [];
        result[tid] = models;
        setCache(tid, models);
      }

      logger.debug('Models3D', `Batch endpoint: ${uncached.length} topics in 1 request`);
      return result;
    } catch (err: unknown) {
      // 3DP-3: Type-safe error detection via instanceof ApiError
      // realRequest() throws ApiError with .status, so we can check
      // the actual HTTP status instead of fragile string matching.
      const is404or405 = err instanceof ApiError && (err.status === 404 || err.status === 405);
      if (is404or405) {
        // Batch endpoint not deployed yet — fall back for this TTL window
        _batchEndpointUnavailable = true;
        _batchDisabledAt = Date.now();
        logger.info('Models3D', 'Batch endpoint not available, using throttled fallback');
      } else {
        // Other error (network, 500) — still fall back but don't mark permanently
        logger.warn('Models3D', 'Batch endpoint error, falling back to per-topic:', err);
      }
    }
  }

  // 3. Throttled fallback: max 6 concurrent (matches browser HTTP/2 connection limit)
  if (signal?.aborted) return result;

  const MAX_CONCURRENT = 6;
  const tasks = uncached.map((topicId) => async () => {
    const paginated = await getModels3D(topicId);
    return { topicId, items: paginated?.items || [] };
  });

  const settled = await throttledAll(tasks, MAX_CONCURRENT, signal);

  for (const entry of settled) {
    if (entry.status === 'fulfilled') {
      const { topicId, items } = entry.value;
      result[topicId] = items;
      setCache(topicId, items);
    }
  }

  logger.debug('Models3D',
    `Throttled fallback: ${uncached.length} topics, ${MAX_CONCURRENT} concurrent`);

  return result;
}