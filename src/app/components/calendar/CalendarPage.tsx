// ============================================================
// Axon — CalendarPage
//
// Page wrapper for Calendar v2. Renders CountdownWidget (when
// upcoming exams exist) above CalendarView. Lazy-loaded via
// calendar-student-routes.ts.
// ============================================================

import React, { Suspense, useMemo } from 'react';
import { startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';
import { CalendarView } from './CalendarView';
import { CountdownWidget } from './CountdownWidget';
import { CalendarSkeleton } from './CalendarSkeleton';
import { useCalendarEvents } from '@/app/hooks/useCalendarEvents';

export function CalendarPage() {
  // Fetch a 3-month window for the countdown widget
  const now = useMemo(() => new Date(), []);
  const from = useMemo(() => startOfMonth(now), [now]);
  const to = useMemo(() => endOfMonth(addMonths(now, 2)), [now]);

  const { events } = useCalendarEvents({ from, to });

  // Show countdown only if there are upcoming exam events
  const hasUpcomingExams = events.some(
    e => e.is_final && new Date(e.date) >= now,
  );

  return (
    <ErrorBoundary>
      <div className="p-4 lg:p-6 space-y-4 max-w-5xl mx-auto">
        {hasUpcomingExams && (
          <CountdownWidget events={events} />
        )}
        <Suspense fallback={<CalendarSkeleton />}>
          <CalendarView />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
