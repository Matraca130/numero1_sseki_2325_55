// ============================================================
// Axon — API Call Wrapper
//
// Header convention (per backend spec):
//   Authorization: Bearer <ANON_KEY>  — ALWAYS (Supabase gateway, FIXED)
//   X-Access-Token: <user_jwt>        — when user is authenticated
//
// NEVER put the user JWT in Authorization. It ALWAYS goes in X-Access-Token.
//
// Response convention:
//   Success: { "data": ... }
//   Error:   { "error": "descriptive message" }
//
// PERF-AUDIT:
//   - GET request deduplication (same path in-flight → reuse promise)
//   - Request timeout (15s default) via AbortController
//   - Conditional logging (DEV only)
//
// SINGLE SOURCE OF TRUTH: Credentials come from @/app/lib/supabase.ts
// ============================================================

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/app/lib/supabase';

export const API_BASE = `${SUPABASE_URL}/functions/v1/server`;
export const ANON_KEY = SUPABASE_ANON_KEY;

/** Default request timeout in milliseconds */
const DEFAULT_TIMEOUT_MS = 15_000;

// ── Access token management ─────────────────────────────

let _accessToken: string | null = null;

export function setAccessToken(t: string | null) {
  _accessToken = t;
  // Sync to localStorage for backward compat (apiConfig.ts getRealToken)
  if (t) {
    localStorage.setItem('axon_access_token', t);
  } else {
    localStorage.removeItem('axon_access_token');
  }
}

export function getAccessToken(): string | null {
  return _accessToken;
}

// ── GET request deduplication ───────────────────────────
// For identical GET requests in-flight, reuse the same promise.
// Prevents N components mounting simultaneously from triggering
// N identical network requests.

const _inflightGets = new Map<string, Promise<any>>();

// ── API call ──────────────────────────────────────────

export async function apiCall<T = any>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  const method = (fetchOptions.method || 'GET').toUpperCase();
  const isGet = method === 'GET';

  // Dedup: for GETs, reuse in-flight promise for the same path
  if (isGet) {
    const existing = _inflightGets.get(path);
    if (existing) {
      if (import.meta.env.DEV) console.log(`[API] Dedup: reusing in-flight GET ${path}`);
      return existing as Promise<T>;
    }
  }

  const doFetch = async (): Promise<T> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
      ...((fetchOptions.headers as Record<string, string>) || {}),
    };
    if (_accessToken) {
      headers['X-Access-Token'] = _accessToken;
    }

    const url = `${API_BASE}${path}`;
    if (import.meta.env.DEV) {
      console.log(`[API] ${method} ${path}`);
    }

    // Timeout via AbortController
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    if (timeoutMs > 0) {
      controller = new AbortController();
      if (fetchOptions.signal) {
        fetchOptions.signal.addEventListener('abort', () => controller!.abort());
      }
      timeoutId = setTimeout(() => controller!.abort(), timeoutMs);
    }

    try {
      const res = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller?.signal || fetchOptions.signal,
      });

      const text = await res.text();

      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        if (import.meta.env.DEV) {
          console.error(`[API] Non-JSON response from ${path}:`, text.substring(0, 300));
        }
        throw new Error(`Invalid response from server (${res.status})`);
      }

      if (!res.ok) {
        const msg = json?.error || `API Error ${res.status}`;
        if (import.meta.env.DEV) {
          console.error(`[API] Error ${res.status} at ${path}: ${msg}`);
        }
        throw new Error(msg);
      }

      // Unwrap { data: ... } envelope
      if (json && typeof json === 'object' && 'data' in json) {
        return json.data as T;
      }

      // If there's an error on 2xx (shouldn't happen, but defensive)
      if (json?.error) {
        throw new Error(json.error);
      }

      return json as T;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError' && timeoutMs > 0) {
        throw new Error(`Request timeout after ${timeoutMs}ms: ${method} ${path}`);
      }
      throw err;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  const promise = doFetch().finally(() => {
    // Clean up dedup map
    if (isGet) _inflightGets.delete(path);
  });

  // Register for dedup
  if (isGet) {
    _inflightGets.set(path, promise);
  }

  return promise;
}