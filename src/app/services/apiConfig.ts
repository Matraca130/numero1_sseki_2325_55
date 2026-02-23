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

// ── Backend URLs ──────────────────────────────────────────

export const API_BASE_URL = API_BASE;
export const REAL_BACKEND_URL = API_BASE;
export const FIGMA_BACKEND_URL = API_BASE;
export const publicAnonKey = ANON_KEY;

// ── Auth tokens ───────────────────────────────────────────

const TOKEN_KEY = 'axon_access_token';

export function getRealToken(): string | null {
  return getAccessToken() || localStorage.getItem(TOKEN_KEY);
}

export function getAnonKey(): string {
  return ANON_KEY;
}

// ── Error class ───────────────────────────────────────────

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

// ── Request helpers ───────────────────────────────────────

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
 */
export async function realRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${path}`;
  console.log(`[API] ${options?.method || 'GET'} ${path}`);

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
  console.log(`[FigmaAPI] ${options?.method || 'GET'} ${path}`);

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
