// ============================================================
// Axon — storageHelpers
//
// Tiny try/catch wrappers around Web Storage (localStorage by
// default; pass sessionStorage for session-scoped callers) to
// remove the boilerplate scattered across:
//   - useNodeColors.ts
//   - useNodePositions.ts (positions, combos, topic index)
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
//   - safeRemoveItem swallows errors silently (mirrors the
//     existing `try { localStorage.removeItem(k); } catch {}`
//     pattern that ships in every consumer today).
//
// We intentionally do NOT add safeGetItem/safeSetItem (non-JSON
// pair). The only mindmap callers that read/write a non-JSON
// scalar are loadGridEnabled / saveGridEnabled in
// useNodePositions.ts — two single-line sites that store '1'/'0'.
// Doubling the helper API for those two sites isn't worth it;
// they remain inline (preserved as part of this cycle's "no
// behavior change" mandate).
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
