// ============================================================
// Axon — useCalendarUI hook
//
// [A-02] Calendar v2 — UI state management for the calendar.
// Manages view mode, selected date, and exam panel open/close.
//
// Uses React Router's useSearchParams for examId so that
// deep-linking works (ADR-03: ?examId=xxx opens the panel).
// ============================================================

import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

// ── Types ───────────────────────────────────────────────────

export type CalendarViewMode = 'month' | 'week' | 'agenda';

export interface UseCalendarUIReturn {
  /** Current view mode */
  viewMode: CalendarViewMode;
  /** Set view mode */
  setViewMode: (mode: CalendarViewMode) => void;
  /** Currently selected date */
  selectedDate: Date;
  /** Set the selected date */
  setSelectedDate: (date: Date) => void;
  /** Currently open exam ID (from URL search params), or null */
  examId: string | null;
  /** Open the exam detail panel (updates URL) */
  openExam: (id: string) => void;
  /** Close the exam detail panel (removes examId from URL) */
  closeExam: () => void;
}

// ── Hook ────────────────────────────────────────────────────

export function useCalendarUI(): UseCalendarUIReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  const examId = useMemo(
    () => searchParams.get('examId'),
    [searchParams],
  );

  const openExam = useCallback(
    (id: string) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('examId', id);
        return next;
      });
    },
    [setSearchParams],
  );

  const closeExam = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('examId');
      return next;
    });
  }, [setSearchParams]);

  return {
    viewMode,
    setViewMode,
    selectedDate,
    setSelectedDate,
    examId,
    openExam,
    closeExam,
  };
}
