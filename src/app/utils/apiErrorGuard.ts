// ============================================================
// Axon — API Error Guard Utilities
//
// Bridges the type mismatch between:
//   - ApiError (from apiConfig.ts) — has .status, .code properties
//   - Error (from lib/api.ts apiCall) — plain Error with message
//
// Usage:
//   import { isApiError, isApiErrorWithStatus } from '@/app/utils/apiErrorGuard';
//
//   catch (err) {
//     if (isApiErrorWithStatus(err, 404)) return null;
//     if (isApiError(err)) console.error(err.code, err.status);
//   }
// ============================================================

/**
 * Shape of ApiError from apiConfig.ts.
 * We don't import the class to avoid coupling — we duck-type it.
 */
interface ApiErrorShape {
  name: string;
  message: string;
  code: string;
  status: number;
}

/**
 * Type guard: checks if an unknown error is an ApiError (from apiConfig.ts).
 * Uses duck-typing to avoid import coupling.
 */
export function isApiError(err: unknown): err is ApiErrorShape {
  return (
    err != null &&
    typeof err === 'object' &&
    'status' in err &&
    typeof (err as any).status === 'number' &&
    'code' in err &&
    typeof (err as any).code === 'string' &&
    err instanceof Error
  );
}

/**
 * Checks if an error (ApiError or plain Error) corresponds to a specific HTTP status.
 *
 * Works with BOTH error types:
 *   - ApiError: checks .status property directly
 *   - Plain Error: checks if .message contains the status code string
 *
 * This is the recommended way to check error status in catch blocks,
 * regardless of which request helper (apiCall vs realRequest) threw.
 */
export function isApiErrorWithStatus(err: unknown, status: number): boolean {
  if (err == null || typeof err !== 'object') return false;

  // ApiError from apiConfig.ts → has .status
  if ('status' in err && (err as any).status === status) return true;

  // Plain Error from lib/api.ts apiCall → message contains status
  if (err instanceof Error && err.message?.includes(`${status}`)) return true;

  return false;
}

/**
 * Extracts the HTTP status from an error, if available.
 * Returns undefined if the error doesn't contain status info.
 */
export function getErrorStatus(err: unknown): number | undefined {
  if (err == null || typeof err !== 'object') return undefined;

  // ApiError → direct .status
  if ('status' in err && typeof (err as any).status === 'number') {
    return (err as any).status;
  }

  // Plain Error → parse from message
  if (err instanceof Error) {
    const match = err.message?.match(/\b(4\d{2}|5\d{2})\b/);
    if (match) return parseInt(match[1], 10);
  }

  return undefined;
}
