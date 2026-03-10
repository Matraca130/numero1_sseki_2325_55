// ============================================================
// Axon — Error Utilities (canonical source)
//
// Centralizes error extraction used across quiz domain components.
// Eliminates duplicated copies found in the audit (H6-2, H6-3).
//
// M4-FIX: formatDateCompact moved to date-utils.ts (SRP fix).
// Re-exported here for backwards compatibility.
//
// IMPORT:
//   import { getErrorMsg } from '@/app/lib/error-utils';
//   import { ApiError } from '@/app/lib/error-utils';
//   import { formatDateCompact } from '@/app/lib/date-utils'; // NEW canonical
// ============================================================

// ── ApiError ──────────────────────────────────────────────
// Thrown by apiCall() when the backend returns a non-2xx status.
// Allows structured error detection:
//   catch (err) { if (err instanceof ApiError && err.status === 404) ... }

export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP status code from the backend response */
    public readonly status: number,
    /** API path that failed (e.g., '/quizzes') */
    public readonly path: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── getErrorMsg ───────────────────────────────────────────
// Extracts a human-readable message from an unknown catch value.
// If the error is an ApiError, includes the HTTP status for debugging.

export function getErrorMsg(err: unknown): string {
  if (err instanceof ApiError) {
    return `[${err.status}] ${err.message}`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

// ── formatDateCompact (re-export for backwards compat) ────
// M4-FIX: Canonical definition moved to date-utils.ts
export { formatDateCompact } from '@/app/lib/date-utils';
