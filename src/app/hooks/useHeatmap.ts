// ============================================================
// Axon — useHeatmap hook
//
// [A-02] Calendar v2 — Pure derived logic for heatmap display.
// Accepts heatmap entries from useCalendarEvents and computes
// HeatmapDay[] with level (0-4) and label text.
//
// NO fetch — this hook is pure computation only.
//
// Streak logic follows G-02 decision:
//   "Day completed" = >= 30 minutes of study accumulated.
// ============================================================

import { useMemo } from 'react';
import {
  HEATMAP_LABELS,
  STREAK_THRESHOLD_MINUTES,
  type HeatmapLevel,
} from '@/app/lib/calendar-constants';
import type { HeatmapEntry } from './useCalendarEvents';

// ── Types ───────────────────────────────────────────────────

export interface HeatmapDay {
  /** ISO date string YYYY-MM-DD */
  date: string;
  /** Total study minutes for this day */
  minutes: number;
  /** Intensity level 0-4 */
  level: HeatmapLevel;
  /** Human-readable label for accessibility */
  label: string;
  /** Whether this day counts as "completed" for streak (>= 30 min) */
  streakDay: boolean;
}

export interface UseHeatmapReturn {
  /** Map of ISO date string to HeatmapDay data */
  heatmapMap: Map<string, HeatmapDay>;
  /** Ordered array of HeatmapDay entries */
  days: HeatmapDay[];
  /** Current streak count (consecutive completed days ending today or yesterday) */
  currentStreak: number;
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Maps study minutes to a heatmap intensity level (0-4).
 *
 * Thresholds:
 *   0 min       → level 0 (no activity)
 *   1-14 min    → level 1 (light)
 *   15-29 min   → level 2 (moderate)
 *   30-59 min   → level 3 (high)
 *   60+ min     → level 4 (max)
 */
function minutesToLevel(minutes: number): HeatmapLevel {
  if (minutes <= 0) return 0;
  if (minutes < 15) return 1;
  if (minutes < 30) return 2;
  if (minutes < 60) return 3;
  return 4;
}

/**
 * Calculates the current streak: consecutive days with >= STREAK_THRESHOLD_MINUTES
 * of study, counting backwards from today (or yesterday if today has no activity yet).
 */
function calculateStreak(completedDates: Set<string>): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const checkDate = new Date(today);

  // If today is not completed yet, start checking from yesterday
  const todayStr = formatDateISO(checkDate);
  if (!completedDates.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Count consecutive completed days backwards
  while (completedDates.has(formatDateISO(checkDate))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ── Hook ────────────────────────────────────────────────────

export function useHeatmap(entries: HeatmapEntry[]): UseHeatmapReturn {
  return useMemo(() => {
    const days: HeatmapDay[] = entries.map(entry => {
      const level = minutesToLevel(entry.minutes);
      return {
        date: entry.date,
        minutes: entry.minutes,
        level,
        label: HEATMAP_LABELS[level],
        streakDay: entry.minutes >= STREAK_THRESHOLD_MINUTES,
      };
    });

    const heatmapMap = new Map<string, HeatmapDay>();
    const completedDates = new Set<string>();

    for (const day of days) {
      heatmapMap.set(day.date, day);
      if (day.streakDay) {
        completedDates.add(day.date);
      }
    }

    const currentStreak = calculateStreak(completedDates);

    return { heatmapMap, days, currentStreak };
  }, [entries]);
}
