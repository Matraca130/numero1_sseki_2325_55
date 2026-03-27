// ============================================================
// Axon — Calendar Components Barrel Export
//
// Re-exports all calendar feature components.
// Components from other agents are commented out until their
// files exist — uncomment as they become available.
// ============================================================

// S-1C: CalendarSkeleton (loading state)
export { CalendarSkeleton } from './CalendarSkeleton';

// S-1A: CalendarView (main monthly view) — uncomment when available
// export { CalendarView } from './CalendarView';

// S-1A: WeekView (weekly view) — uncomment when available
// export { WeekView } from './WeekView';

// S-1B: DayCell (individual day cell)
export { DayCell } from './DayCell';
export type { DayCellProps } from './DayCell';

// S-1B: EventBadge (event indicator)
export { EventBadge, EventBadgeOverflow, CellEvents } from './EventBadge';
export type { EventBadgeProps, EventBadgeOverflowProps, CellEventsProps } from './EventBadge';
