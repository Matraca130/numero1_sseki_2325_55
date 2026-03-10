// ============================================================
// Axon — Date Utilities
//
// M4-FIX: Extracted from error-utils.ts to fix SRP violation.
// formatDateCompact is date formatting, NOT error handling.
//
// Uses native Intl (no date-fns dependency) for the quiz domain.
// For components that need date-fns features (relative dates, etc.),
// use page-helpers.ts instead.
// ============================================================

/**
 * Formats an ISO date string for compact display.
 * Name is intentionally NOT `formatDate` to avoid collision with
 * the date-fns-based version in page-helpers.ts.
 */
export function formatDateCompact(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
