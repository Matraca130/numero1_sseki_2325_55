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
// SCALABILITY (v4.4.1):
//   - Request timeout (15s default) via AbortController
//   - GET request deduplication (same URL in-flight → reuse promise)
//   - Conditional logging (DEV only)
// ============================================================

export const API_BASE = 'https://xdnciktarvxyhkrokbng.supabase.co/functions/v1/server';
export const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkbmNpa3RhcnZ4eWhrcm9rYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM4NjAsImV4cCI6MjA4Njc4OTg2MH0._nCGOiOh1bMWvqtQ62d368LlYj5xPI6e7pcsdjDEiYQ';

/** Default request timeout in milliseconds */
const DEFAULT_TIMEOUT_MS = 15_000;

// ── Access token management ───────────────────────────────

let _accessToken: string | null = null;

export function setAccessToken(t: string | null) {
  _accessToken = t;
  if (t) {
    localStorage.setItem('axon_access_token', t);
  } else {
    localStorage.removeItem('axon_access_token');
  }
}

export function getAccessToken(): string | null {
  return _accessToken;
}

// ── GET request deduplication ─────────────────────────────
// For identical GET requests in-flight, reuse the same promise.
// This prevents N components mounting simultaneously from
// triggering N identical network requests.

const _inflightGets = new Map<string, Promise<any>>();

// ── API call ──────────────────────────────────────────────

export interface ApiCallOptions extends RequestInit {
  /** Timeout in ms. Defaults to 15000. Set 0 to disable. */
  timeoutMs?: number;
  /** Skip GET deduplication for this call */
  skipDedup?: boolean;
}

export async function apiCall<T = any>(
  path: string,
  options: ApiCallOptions = {}
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, skipDedup = false, ...fetchOptions } = options;
  const method = (fetchOptions.method || 'GET').toUpperCase();
  const isGet = method === 'GET';

  // Dedup: for GETs, reuse in-flight promise for the same path
  if (isGet && !skipDedup) {
    const existing = _inflightGets.get(path);
    if (existing) return existing as Promise<T>;
  }

  const doFetch = async (): Promise<T> => {
    const headers: Record<string, string> = {
      ...(!(fetchOptions?.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
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
      // Merge with caller's signal if provided
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

      if (json?.error) {
        throw new Error(json.error);
      }

      return json as T;
    } catch (err: any) {
      if (err.name === 'AbortError' && timeoutMs > 0) {
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
  if (isGet && !skipDedup) {
    _inflightGets.set(path, promise);
  }

  return promise;
}

// ── ensureGeneralKeyword ──────────────────────────────────
// Idempotent: only ONE "General" keyword per summary. Never duplicates.

export async function ensureGeneralKeyword(summaryId: string) {
  const result = await apiCall<any>("/keywords?summary_id=" + summaryId);
  const items = result?.items || result || [];
  const existing = items.find(
    (kw: any) => (kw.name === "General" || kw.term === "General") && kw.is_active !== false
  );
  if (existing) return existing;
  const created = await apiCall<any>("/keywords", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      summary_id: summaryId,
      name: "General",
      definition: "Contenido general del resumen",
      priority: 1,
    }),
  });
  return created;
}