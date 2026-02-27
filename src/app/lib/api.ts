// ============================================================
// Axon — API Call Wrapper (hardcoded values)
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
// ============================================================

export const API_BASE = 'https://xdnciktarvxyhkrokbng.supabase.co/functions/v1/make-server-6569f786';
export const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkbmNpa3RhcnZ4eWhrcm9rYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM4NjAsImV4cCI6MjA4Njc4OTg2MH0._nCGOiOh1bMWvqtQ62d368LlYj5xPI6e7pcsdjDEiYQ';

// ── Access token management ───────────────────────────────

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

// ── API call ──────────────────────────────────────────────

export async function apiCall<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(!(options?.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    'Authorization': `Bearer ${ANON_KEY}`,
    ...((options.headers as Record<string, string>) || {}),
  };
  if (_accessToken) {
    headers['X-Access-Token'] = _accessToken;
  }

  const url = `${API_BASE}${path}`;
  console.log(`[API] ${options.method || 'GET'} ${path}`);

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    console.error(`[API] Non-JSON response from ${path}:`, text.substring(0, 300));
    throw new Error(`Invalid response from server (${res.status})`);
  }

  if (!res.ok) {
    const msg = json?.error || `API Error ${res.status}`;
    console.error(`[API] Error ${res.status} at ${path}: ${msg}`);
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