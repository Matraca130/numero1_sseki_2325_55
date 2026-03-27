// ============================================================
// Axon — Calendar Utility Helpers
//
// [S-2 Perf] Deduplicated helpers extracted from CalendarView
// and WeekView. Import from here instead of defining inline.
// ============================================================

import { EVENT_COLORS, type EventType } from '@/app/lib/calendar-constants';

/** Format a Date to YYYY-MM-DD string */
export function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Get event color classes by type, falling back to 'exam' */
export function getEventColor(type: string) {
  return EVENT_COLORS[type as EventType] ?? EVENT_COLORS.exam;
}

/** Get today at midnight (local timezone) */
export function getTodayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
