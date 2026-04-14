// ============================================================
// Axon — useFinalsWeek hook
//
// [S-3] Calendar v2 — Derives finals week Set from events.
// Pure hook — no fetch, operates on data passed in.
//
// Returns a Set<string> of ISO week identifiers (YYYY-WNN)
// that contain >= 2 exam_events with is_final = true.
// ============================================================

import { useMemo } from 'react';
import { parseISO, getISOWeek, getISOWeekYear } from 'date-fns';

import type { CalendarEvent } from '@/app/types/calendar';

// ── Helpers ────────────────────────────────────────────────

/**
 * Returns an ISO week string in the format "YYYY-WNN".
 * Uses ISO 8601 week numbering (getISOWeek / getISOWeekYear).
 */
function toISOWeekKey(dateStr: string): string {
  const date = parseISO(dateStr);
  const weekYear = getISOWeekYear(date);
  const weekNum = getISOWeek(date);
  return `${weekYear}-W${String(weekNum).padStart(2, '0')}`;
}

// ── Hook ───────────────────────────────────────────────────

/**
 * Accepts an array of CalendarEvent[] and returns a Set of
 * ISO week keys (YYYY-WNN) that have 2 or more finals.
 *
 * Usage:
 * ```ts
 * const finalsWeeks = useFinalsWeek(events);
 * if (finalsWeeks.has('2026-W15')) { ... }
 * ```
 */
export function useFinalsWeek(events: CalendarEvent[]): Set<string> {
  return useMemo(() => {
    // Filter out events with invalid/missing dates
    const validEvents = events.filter(e =>
      e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date)
    );

    // Count finals per ISO week
    const weekCounts = new Map<string, number>();

    for (const event of validEvents) {
      if (!event.is_final) continue;
      const weekKey = toISOWeekKey(event.date);
      weekCounts.set(weekKey, (weekCounts.get(weekKey) ?? 0) + 1);
    }

    // Only keep weeks with >= 2 finals
    const result = new Set<string>();
    for (const [weekKey, count] of weekCounts) {
      if (count >= 2) {
        result.add(weekKey);
      }
    }

    return result;
  }, [events]);
}

// Export the helper for use in CalendarView
export { toISOWeekKey };
