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
import { extractItems } from './api-helpers';

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

// ── Streaming API call (SSE) ────────────────────────────
// Used for progressive chat responses. Yields parsed JSON
// chunks from Server-Sent Events (data: lines).

/** Default streaming timeout — 30s to accommodate AI generation */
const STREAM_TIMEOUT_MS = 30_000;

export async function* apiCallStream<T = any>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {}
): AsyncGenerator<T, void, undefined> {
  const { timeoutMs = STREAM_TIMEOUT_MS, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
    'Authorization': `Bearer ${ANON_KEY}`,
    ...((fetchOptions.headers as Record<string, string>) || {}),
  };
  if (_accessToken) {
    headers['X-Access-Token'] = _accessToken;
  }

  const url = `${API_BASE}${path}`;
  if (import.meta.env.DEV) {
    console.log(`[API] STREAM POST ${path}`);
  }

  const controller = new AbortController();
  if (fetchOptions.signal) {
    fetchOptions.signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      let msg: string;
      try {
        msg = JSON.parse(text)?.error || `API Error ${res.status}`;
      } catch {
        msg = `API Error ${res.status}`;
      }
      throw new Error(msg);
    }

    if (!res.body) {
      throw new Error('Response body is null — streaming not supported');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep the last (possibly incomplete) line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue; // skip empty/comment lines
        if (trimmed.startsWith('data: ')) {
          const payload = trimmed.slice(6);
          if (payload === '[DONE]') return;
          try {
            yield JSON.parse(payload) as T;
          } catch {
            if (import.meta.env.DEV) {
              console.warn(`[API] SSE parse error:`, payload.substring(0, 200));
            }
          }
        }
      }
    }

    // Process any remaining data in buffer
    if (buffer.trim().startsWith('data: ')) {
      const payload = buffer.trim().slice(6);
      if (payload && payload !== '[DONE]') {
        try {
          yield JSON.parse(payload) as T;
        } catch { /* ignore trailing parse errors */ }
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Stream timeout after ${timeoutMs}ms: POST ${path}`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Keyword helpers ─────────────────────────────────────
// Used by FlashcardsManager, FlashcardFormModal, FlashcardBulkImport,
// useQuestionForm, and CaptureViewDialog to guarantee a "General"
// keyword exists for a given summary before attaching content to it.

interface KeywordRow {
  id: string;
  name: string;
  summary_id: string;
  [key: string]: unknown;
}

/**
 * Ensures a "General" keyword exists for the given summary.
 * Returns the keyword ID (existing or newly created).
 *
 * Uses flat query-param routes per Axon convention (rule 2).
 * keyword_id is REQUIRED for quiz-questions and flashcards (rule 5).
 */
export async function ensureGeneralKeyword(summaryId: string): Promise<string> {
  // 1. Fetch existing keywords for this summary
  const res = await apiCall<KeywordRow[] | { items: KeywordRow[] }>(
    `/keywords?summary_id=${encodeURIComponent(summaryId)}`
  );
  const keywords = extractItems<KeywordRow>(res);

  // 2. Look for an existing "General" keyword (case-insensitive)
  const general = keywords.find(
    (k) => k.name.toLowerCase() === 'general'
  );
  if (general) return general.id;

  // 3. None found — create one
  const created = await apiCall<KeywordRow>('/keywords', {
    method: 'POST',
    body: JSON.stringify({
      summary_id: summaryId,
      name: 'General',
    }),
  });

  return created.id;
}
