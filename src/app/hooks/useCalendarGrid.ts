// ============================================================
// useCalendarGrid — Shared monthly calendar grid computation
//
// Centralizes the ~20 lines of calendar derivation duplicated
// in KnowledgeHeatmapView and MasteryDashboardView:
//   monthStart, daysInMonth, prevMonthDays, today, capitalizedMonth,
//   plus navigation handlers (goNextMonth, goPrevMonth, goToToday).
//
// USAGE:
//   const {
//     currentDate, daysOfWeek, prevMonthDays, daysInMonth,
//     today, isCurrentMonth, capitalizedMonth,
//     goNextMonth, goPrevMonth, goToToday,
//   } = useCalendarGrid({
//     onMonthChange: () => setSelectedDay(null),  // optional
//   });
//
// The hook owns `currentDate` state (initialized to AXON_TODAY).
// Consumers use `currentDate` in their own useMemo deps (e.g. activityMap).
//
// Navigation handlers use the updater pattern (prev => ...) to avoid
// stale closures on rapid clicks (P1 fix preserved).
// ============================================================

import { useState, useCallback, useRef } from 'react';
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  format,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { getAxonToday } from '@/app/utils/constants';

// ── Constants ─────────────────────────────────────────────

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

// ── Types ───────────────────────────────────────────────

export interface UseCalendarGridOptions {
  /**
   * Called after each month navigation (next/prev/today).
   * Use case: KnowledgeHeatmapView resets selectedDay to null.
   * MasteryDashboardView passes nothing.
   */
  onMonthChange?: () => void;
}

export interface CalendarGridData {
  /** Current month being viewed. Use in your own useMemo deps. */
  currentDate: Date;

  /** Localized day-of-week headers: ['Dom', 'Lun', ...] */
  daysOfWeek: readonly string[];

  /** Filler day numbers from the previous month (e.g. [28, 29, 30]). */
  prevMonthDays: number[];

  /** Total number of days in the current month (e.g. 28, 30, 31). */
  daysInMonth: number;

  /** Day-of-month for today, or -1 if currentDate is not the current month. */
  today: number;

  /** Whether the viewed month matches today's month+year. */
  isCurrentMonth: boolean;

  /** Capitalized month+year label, e.g. "Febrero 2026". */
  capitalizedMonth: string;

  /** Navigate to next month. Uses updater pattern (stale-closure safe). */
  goNextMonth: () => void;

  /** Navigate to previous month. Uses updater pattern (stale-closure safe). */
  goPrevMonth: () => void;

  /** Jump to today's month. */
  goToToday: () => void;
}

// ── Hook ────────────────────────────────────────────────

export function useCalendarGrid(options?: UseCalendarGridOptions): CalendarGridData {
  const [currentDate, setCurrentDate] = useState(getAxonToday());

  // Store callback in ref so nav handlers are stable across renders
  // (avoids re-creating handlers when consumer passes inline arrow fn).
  const onMonthChangeRef = useRef(options?.onMonthChange);
  onMonthChangeRef.current = options?.onMonthChange;

  // ── Derived values (O(1) computations, no memoization needed) ──

  const monthStart = startOfMonth(currentDate);
  const totalDaysInMonth = endOfMonth(currentDate).getDate();
  const firstDayOfWeek = monthStart.getDay(); // 0 = Sunday
  const daysInPrevMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    0,
  ).getDate();

  const prevMonthDays = Array.from(
    { length: firstDayOfWeek },
    (_, i) => daysInPrevMonth - firstDayOfWeek + 1 + i,
  );

  const axonToday = getAxonToday();
  const isCurrentMonth =
    currentDate.getMonth() === axonToday.getMonth() &&
    currentDate.getFullYear() === axonToday.getFullYear();
  const today = isCurrentMonth ? axonToday.getDate() : -1;

  // Capitalized month label (e.g. "Febrero 2026")
  const raw = format(currentDate, 'MMMM yyyy', { locale: es });
  const capitalizedMonth = raw.charAt(0).toUpperCase() + raw.slice(1);

  // ── Navigation handlers (stable refs via useRef pattern) ──

  const goNextMonth = useCallback(() => {
    setCurrentDate(prev => addMonths(prev, 1));
    onMonthChangeRef.current?.();
  }, []);

  const goPrevMonth = useCallback(() => {
    setCurrentDate(prev => subMonths(prev, 1));
    onMonthChangeRef.current?.();
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(getAxonToday());
    onMonthChangeRef.current?.();
  }, []);

  return {
    currentDate,
    daysOfWeek: DAYS_OF_WEEK,
    prevMonthDays,
    daysInMonth: totalDaysInMonth,
    today,
    isCurrentMonth,
    capitalizedMonth,
    goNextMonth,
    goPrevMonth,
    goToToday,
  };
}
