// ============================================================
// Axon — Calendar Components Barrel Export
//
// Re-exports all calendar feature components.
// Components from other agents are commented out until their
// files exist — uncomment as they become available.
// ============================================================

// S-1C: CalendarSkeleton (loading state)
export { CalendarSkeleton } from './CalendarSkeleton';

// S-1A: CalendarView (main monthly view)
export { CalendarView } from './CalendarView';

// S-1A: WeekView (weekly view)
export { WeekView } from './WeekView';

// S-1B: DayCell (individual day cell)
export { DayCell } from './DayCell';
export type { DayCellProps } from './DayCell';

// S-1B: EventBadge (event indicator)
export { EventBadge, EventBadgeOverflow, CellEvents } from './EventBadge';
export type { EventBadgeProps, EventBadgeOverflowProps, CellEventsProps } from './EventBadge';

// S-2: ExamDetailsPanel (side panel / bottom drawer)
export { ExamDetailsPanel } from './ExamDetailsPanel';
export type { ExamDetailsPanelProps } from './ExamDetailsPanel';

// S-2: ExamForm (create / edit / delete exam)
export { ExamForm } from './ExamForm';
export type { ExamFormProps } from './ExamForm';

// S-2: HeatmapTooltip (hover / long-press tooltip)
export { HeatmapTooltip } from './HeatmapTooltip';
export type { HeatmapTooltipProps } from './HeatmapTooltip';

// S-3: CountdownWidget (upcoming exams countdown)
export { CountdownWidget } from './CountdownWidget';
export type { CountdownWidgetProps } from './CountdownWidget';
