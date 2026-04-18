// ============================================================
// Axon — API Configuration (bridge to @/app/lib/api.ts)
//
// This file provides backward-compat exports for services
// like platformApi.ts, studentApi.ts, aiService.ts that import
// REAL_BACKEND_URL, figmaRequest, realRequest, etc.
//
// All actual logic is now in @/app/lib/api.ts.
// ============================================================

import { API_BASE, ANON_KEY, apiCall, getAccessToken } from '@/app/lib/api';
import { logger } from '@/app/lib/logger';

// ── Backend URLs ──────────────────────────────────────

export const API_BASE_URL = API_BASE;
export const publicAnonKey = ANON_KEY;

// ── Auth tokens ───────────────────────────────────────

export function getRealToken(): string | null {
  return getAccessToken();
}

export function getAnonKey(): string {
  return ANON_KEY;
}

// ── Error class ───────────────────────────────────────

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

// ── Request helpers ─────────────────────────────────────

// PERF-S2: In-flight request deduplication for GET requests.
// If the same GET URL is already in-flight, reuse the existing promise
// instead of firing a duplicate HTTP request. This eliminates redundant
// network calls when multiple components mount simultaneously and
// fetch the same data (e.g., 4 useStudyPlans instances).
const inflightGets = new Map<string, Promise<any>>();

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ANON_KEY}`,
  };
  const token = getRealToken();
  if (token) {
    headers['X-Access-Token'] = token;
  }
  return headers;
}

/**
 * Request to the backend. Unwraps { data: ... }.
 * Uses Authorization: Bearer <ANON_KEY> + X-Access-Token: <user_jwt>.
 * PERF-S2: GET requests are deduplicated — concurrent identical GETs share one fetch.
 */
export async function realRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const method = options?.method || 'GET';
  logger.debug('API', `${method} ${path}`);

  // PERF-S2: Only deduplicate GET requests (safe to share — idempotent)
  const isGet = method === 'GET';
  if (isGet) {
    const inflight = inflightGets.get(url);
    if (inflight) {
      logger.debug('API', `Dedup: reusing in-flight GET ${path}`);
      return inflight as Promise<T>;
    }
  }

  const fetchPromise = (async (): Promise<T> => {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...buildHeaders(),
        ...((options?.headers as Record<string, string>) || {}),
      },
    });

    const text = await res.text();
    let body: any;
    try {
      body = JSON.parse(text);
    } catch {
      console.error(`[API] Non-JSON response from ${path}:`, text.substring(0, 300));
      throw new ApiError(`Failed to parse response from ${path}`, 'PARSE_ERROR', res.status);
    }

    if (!res.ok) {
      const msg = body?.error || `API error ${res.status} at ${path}`;
      console.error(`[API] Error ${res.status}: ${msg}`);
      throw new ApiError(msg, 'API_ERROR', res.status);
    }

    if (body && typeof body === 'object' && 'data' in body) {
      return body.data as T;
    }

    if (body?.error) {
      throw new ApiError(body.error, 'API_ERROR', res.status);
    }

    return body as T;
  })();

  // PERF-S2: Register the in-flight promise and clean up when done
  if (isGet) {
    inflightGets.set(url, fetchPromise);
    fetchPromise.finally(() => {
      inflightGets.delete(url);
    });
  }

  return fetchPromise;
}

/**
 * Request for AI/Figma-only endpoints (no user JWT).
 * Uses Authorization: Bearer <ANON_KEY> only.
 */
export async function figmaRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${path}`;
  logger.debug('FigmaAPI', `${options?.method || 'GET'} ${path}`);

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
      ...((options?.headers as Record<string, string>) || {}),
    },
  });

  const text = await res.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ApiError(`Failed to parse response from ${path}`, 'PARSE_ERROR', res.status);
  }

  if (!res.ok) {
    throw new ApiError(
      body?.error || `API error ${res.status} at ${path}`,
      'FIGMA_ERROR',
      res.status
    );
  }

  if (body && typeof body === 'object' && 'data' in body) {
    return body.data as T;
  }

  return body as T;
}