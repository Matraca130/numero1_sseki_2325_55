// ============================================================
// Axon — storageHelpers
//
// Tiny try/catch wrappers around Web Storage (localStorage by
// default; pass sessionStorage for session-scoped callers) to
// remove the boilerplate scattered across:
//   - useNodeColors.ts
//   - useNodePositions.ts (positions, combos, topic index, grid)
//   - useMapUIState.ts (onboarding flag)
//   - useFullscreen.ts (fullscreen flag, sessionStorage)
//   - KnowledgeGraph.tsx (mobile hint flag, sessionStorage)
//   - StickyNote.tsx
//   - changeHistoryHelpers.ts (sessionStorage)
//
// Contract notes:
//   - safeGetJSON returns the parsed value (typed `unknown`) or
//     null on missing/error. Caller is responsible for shape
//     validation — these helpers are dumb wrappers.
//   - safeSetJSON returns true on success, false on any failure
//     (QuotaExceededError, disabled storage, JSON.stringify on
//     a circular value, etc.).
//   - safeGetItem / safeSetItem are the non-JSON scalar pair —
//     plain strings (e.g. '1'/'0' flags). Same try/catch shape
//     as the JSON pair. Added in cycle 59 once 10 scalar callsites
//     materialized across useNodePositions / useMapUIState /
//     useFullscreen / KnowledgeGraph (cycle-57 reopen rule:
//     3+ callsites triggers extraction).
//   - safeRemoveItem swallows errors silently (mirrors the
//     existing `try { localStorage.removeItem(k); } catch {}`
//     pattern that ships in every consumer today).
// ============================================================

/**
 * Read a JSON-encoded value from Web Storage.
 *
 * Returns the parsed value (typed `unknown`) or `null` if the key
 * is absent, the storage is unavailable, or the payload is not
 * valid JSON. Caller MUST validate the shape.
 *
 * @param key      Storage key.
 * @param storage  Storage instance (defaults to `localStorage`).
 *                 Pass `sessionStorage` for session-scoped reads.
 */
export function safeGetJSON(key: string, storage: Storage = localStorage): unknown | null {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Write a JSON-encoded value to Web Storage.
 *
 * Silently swallows QuotaExceededError, disabled-storage errors
 * (Safari private mode, SecurityError) and JSON.stringify
 * failures. Returns `true` on success, `false` on any failure.
 *
 * @param key      Storage key.
 * @param value    Any JSON-serializable value.
 * @param storage  Storage instance (defaults to `localStorage`).
 */
export function safeSetJSON(key: string, value: unknown, storage: Storage = localStorage): boolean {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a raw string value from Web Storage.
 *
 * Returns the raw string value (no JSON parsing) or `null` if the
 * key is absent or the storage is unavailable / throws. For JSON
 * payloads use `safeGetJSON` instead.
 *
 * @param key      Storage key.
 * @param storage  Storage instance (defaults to `localStorage`).
 */
export function safeGetItem(key: string, storage: Storage = localStorage): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Write a raw string value to Web Storage.
 *
 * Silently swallows QuotaExceededError and disabled-storage errors
 * (Safari private mode, SecurityError). Returns `true` on success,
 * `false` on any failure. For JSON payloads use `safeSetJSON`.
 *
 * @param key      Storage key.
 * @param value    Raw string value (must already be a string).
 * @param storage  Storage instance (defaults to `localStorage`).
 */
export function safeSetItem(key: string, value: string, storage: Storage = localStorage): boolean {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove a key from Web Storage.
 *
 * Silently swallows errors (e.g. disabled storage, blocked
 * SecurityError). Mirrors the existing inline pattern; never
 * throws.
 *
 * @param key      Storage key.
 * @param storage  Storage instance (defaults to `localStorage`).
 */
export function safeRemoveItem(key: string, storage: Storage = localStorage): void {
  try {
    storage.removeItem(key);
  } catch {
    // silently ignore (storage disabled / SecurityError)
  }
}
