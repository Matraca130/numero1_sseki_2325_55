// ============================================================
// Axon — API Helpers
//
// Shared utilities for API response handling. Extracted from
// 17 duplicate inline definitions across the codebase.
//
// The backend CRUD factories return either:
//   - T[]                      (direct array)
//   - { items: T[], count: n } (paginated wrapper)
//
// `extractItems` normalizes both shapes into a plain T[].
// `formatDuration` converts seconds to a human-readable m:ss string.
// ============================================================

/**
 * Extract an array of items from an API response that may be
 * either a raw `T[]` or a `{ items: T[] }` wrapper.
 *
 * @example
 *   const keywords = extractItems<SummaryKeyword>(await api.getKeywords(id));
 */
export function extractItems<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result;
  if (
    result != null &&
    typeof result === 'object' &&
    Array.isArray((result as Record<string, unknown>).items)
  ) {
    return (result as Record<string, unknown>).items as T[];
  }
  return [];
}

/**
 * Format a duration in seconds as `m:ss`.
 *
 * @param seconds  Total seconds (may be null / fractional)
 * @param fallback String returned when seconds is null / ≤ 0
 *                 Defaults to `'--:--'`; VideoPlayer passes `''`.
 *
 * @example
 *   formatDuration(125);        // "2:05"
 *   formatDuration(null);       // "--:--"
 *   formatDuration(null, '');   // ""
 */
export function formatDuration(
  seconds: number | null,
  fallback = '--:--',
): string {
  if (!seconds || seconds <= 0) return fallback;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}