// ============================================================
// Axon — useCalendarEvents hook
//
// [A-02] Calendar v2 — React Query fetch for calendar data.
// Single endpoint: GET /calendar/data?from=&to=&types=all
//
// Returns events, heatmap data, and tasks from a unified query.
// Uses the project's apiCall() wrapper and centralized query keys.
//
// staleTime: 5 min (calendar data changes infrequently).
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { apiCall } from '@/app/lib/api';

// ── Types ───────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  student_id: string;
  course_id: string;
  institution_id: string;
  title: string;
  date: string;          // ISO date string YYYY-MM-DD
  time: string | null;
  location: string | null;
  is_final: boolean;
  exam_type: string;
  created_at: string;
  updated_at: string;
}

export interface HeatmapEntry {
  date: string;          // ISO date string YYYY-MM-DD
  minutes: number;       // Total study minutes for this day
}

export interface CalendarTask {
  id: string;
  student_id: string;
  title: string;
  scheduled_date: string;
  status: string;
}

export interface CalendarData {
  events: CalendarEvent[];
  heatmap: HeatmapEntry[];
  tasks: CalendarTask[];
}

// ── Query Key ───────────────────────────────────────────────

export const calendarKeys = {
  data: (from: string, to: string) =>
    ['calendar-data', from, to] as const,
} as const;

// ── Fetch Function ──────────────────────────────────────────

async function fetchCalendarData(from: string, to: string): Promise<CalendarData> {
  const params = new URLSearchParams({ from, to, types: 'all' });
  const res = await apiCall<CalendarData>(
    `/calendar/data?${params.toString()}`,
  );
  return res ?? { events: [], heatmap: [], tasks: [] };
}

// ── Hook ────────────────────────────────────────────────────

export interface UseCalendarEventsOptions {
  /** Range start date */
  from: Date;
  /** Range end date */
  to: Date;
  /** Disable the query (e.g. when dates are not ready) */
  enabled?: boolean;
}

export function useCalendarEvents(options: UseCalendarEventsOptions) {
  const fromStr = format(options.from, 'yyyy-MM-dd');
  const toStr = format(options.to, 'yyyy-MM-dd');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: calendarKeys.data(fromStr, toStr),
    queryFn: () => fetchCalendarData(fromStr, toStr),
    staleTime: 5 * 60 * 1000,  // 5 minutes
    enabled: options.enabled !== false,
  });

  const events = useMemo(() => data?.events ?? [], [data?.events]);
  const heatmap = useMemo(() => data?.heatmap ?? [], [data?.heatmap]);
  const tasks = useMemo(() => data?.tasks ?? [], [data?.tasks]);

  return {
    events,
    heatmap,
    tasks,
    isLoading,
    error,
    refetch,
  };
}
