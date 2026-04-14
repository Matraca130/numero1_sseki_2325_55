// ============================================================
// Axon — Calendar Types (canonical single source of truth)
//
// Canonical shapes for the student calendar domain. Consumed
// by useCalendarEvents() and all calendar/* components. The
// producer is GET /calendar/data (Supabase Edge Function).
// ============================================================

/** A scheduled exam/event returned by GET /calendar/data (DB-backed). */
export interface CalendarEvent {
  id: string;
  student_id: string;
  course_id: string;
  institution_id: string;
  title: string;
  /** ISO date string YYYY-MM-DD */
  date: string;
  time: string | null;
  location: string | null;
  is_final: boolean;
  exam_type: string;
  created_at: string;
  updated_at: string;
}

/** Daily study-minutes entry for the calendar heatmap overlay. */
export interface HeatmapEntry {
  /** ISO date string YYYY-MM-DD */
  date: string;
  /** Total study minutes for this day */
  minutes: number;
}

/** A scheduled student task (study plan / reminder) shown on the calendar. */
export interface CalendarTask {
  id: string;
  student_id: string;
  title: string;
  scheduled_date: string;
  status: string;
}

/** Unified payload returned by GET /calendar/data?from=&to=&types=all. */
export interface CalendarData {
  events: CalendarEvent[];
  heatmap: HeatmapEntry[];
  tasks: CalendarTask[];
}
