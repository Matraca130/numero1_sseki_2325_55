// ============================================================
// Axon — Week & Month View Components for StudyPlanDashboard
//
// Thin barrel preserving the original public API
// (`WeekView`, `MonthView`, type `TaskWithPlan`). The actual
// implementation lives in `./weekMonth/`, split by component:
//   - types.ts                shared types, icons, labels, headers
//   - CompactMethodPill.tsx   method badge (icon + label)
//   - CompactTaskCard.tsx     one task row (shared week + month)
//   - WeekSummaryBar.tsx      week totals + mini ring
//   - WeekDayRow.tsx          one day row in the week strip
//   - WeekView.tsx            7-day vertical strip
//   - MonthStatsBanner.tsx    month totals grid
//   - MonthView.tsx           calendar grid + selected day panel
//   - useWeekDragDrop.ts      drag-drop state + optimistic moves
// ============================================================

export type { TaskWithPlan } from './weekMonth/types';
export type { WeekViewProps } from './weekMonth/WeekView';
export type { MonthViewProps } from './weekMonth/MonthView';
export { WeekView } from './weekMonth/WeekView';
export { MonthView } from './weekMonth/MonthView';
