// ============================================================
// Axon — API Configuration Bridge (MINIMAL — C7 cleanup)
//
// After C7 consolidation, this file only provides:
//   1. ApiError class (used for instanceof checks)
//   2. Re-exports from lib/api.ts for backward compat
//
// All request logic lives in @/app/lib/api.ts (apiCall).
// New code should import directly from '@/app/lib/api'.
// ============================================================

import { API_BASE, ANON_KEY, apiCall, getAccessToken } from '@/app/lib/api';

// ── Re-exports for backward compatibility ─────────────────

export const API_BASE_URL = API_BASE;
export const REAL_BACKEND_URL = API_BASE;
export const FIGMA_BACKEND_URL = API_BASE;
export const publicAnonKey = ANON_KEY;

// ── Auth tokens ─────────────────────────────────────

const TOKEN_KEY = 'axon_access_token';

export function getRealToken(): string | null {
  return getAccessToken() || localStorage.getItem(TOKEN_KEY);
}

export function getAnonKey(): string {
  return ANON_KEY;
}

// ── Error class (kept here for instanceof checks) ─────────

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

// ── Deprecated request helpers ──────────────────────────
// These are thin wrappers around apiCall for backward compat.
// New code should use apiCall() directly from '@/app/lib/api'.

/** @deprecated Use apiCall() from '@/app/lib/api' instead */
export const realRequest = apiCall;

/** @deprecated Use apiCall() from '@/app/lib/api' instead */
export const figmaRequest = apiCall;
