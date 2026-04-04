// ============================================================
// Axon — CountdownWidget component
//
// [S-3] Calendar v2 — Upcoming exams countdown list.
// Reuses data from useCalendarEvents (React Query cache).
// Shows up to 5 upcoming exam_events sorted by date ASC.
// Days-remaining badge with traffic-light colors.
// ============================================================

import React, { useMemo, useState } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import { AnimatePresence } from 'motion/react';

import type { CalendarEvent } from '@/app/hooks/useCalendarEvents';
import { EVENT_COLORS, type EventType } from '@/app/lib/calendar-constants';
import { cn } from '@/app/components/ui/utils';
import { ExamPrepPanel } from './ExamPrepPanel';

// ── Constants ──────────────────────────────────────────────

const MAX_VISIBLE_ITEMS = 5;

// ── Helpers ────────────────────────────────────────────────

function getDaysRemaining(eventDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return differenceInCalendarDays(parseISO(eventDate), today);
}

function getDaysBadgeClasses(days: number): string {
  if (days < 7) {
    return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
  }
  if (days <= 14) {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  }
  return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
}

function formatEventDate(dateStr: string): string {
  return format(parseISO(dateStr), "d 'de' MMMM", { locale: es });
}

// ── Props ──────────────────────────────────────────────────

export interface CountdownWidgetProps {
  events: CalendarEvent[];
  onEventClick?: (eventId: string) => void;
}

// ── Component ──────────────────────────────────────────────

export function CountdownWidget({ events, onEventClick }: CountdownWidgetProps) {
  const [showAll, setShowAll] = useState(false);
  const [selectedExam, setSelectedExam] = useState<CalendarEvent | null>(null);

  // Filter future exam events and sort by date ASC
  const upcomingExams = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString().slice(0, 10);

    return events
      .filter(e => e.date >= todayISO && e.exam_type)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events]);

  const visibleExams = showAll
    ? upcomingExams
    : upcomingExams.slice(0, MAX_VISIBLE_ITEMS);

  const hasMore = upcomingExams.length > MAX_VISIBLE_ITEMS;

  if (upcomingExams.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h3
          className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Proximos examenes
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No hay examenes programados.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-teal-500" aria-hidden="true" />
        <h3
          className="text-sm font-semibold text-gray-700 dark:text-gray-300"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Proximos examenes
        </h3>
      </div>

      <ul className="flex flex-col gap-2" role="list">
        {visibleExams.map(exam => {
          const daysRemaining = getDaysRemaining(exam.date);
          const colors = EVENT_COLORS[exam.exam_type as EventType] ?? EVENT_COLORS.exam;
          const badgeClasses = getDaysBadgeClasses(daysRemaining);

          return (
            <li key={exam.id}>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-3 py-2',
                  'min-h-[44px] text-left transition-colors',
                  'hover:bg-gray-50 dark:hover:bg-gray-800',
                  'focus:outline-none focus:ring-2 focus:ring-teal-400',
                  'active:scale-[0.98] active:opacity-80',
                )}
                onClick={() => {
                  setSelectedExam(exam);
                  onEventClick?.(exam.id);
                }}
                aria-label={`${exam.title}, ${daysRemaining} dias restantes`}
              >
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn('h-2 w-2 shrink-0 rounded-full', colors.dot)}
                      aria-hidden="true"
                    />
                    <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {exam.title}
                    </span>
                    {exam.is_final && (
                      <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-600 dark:bg-red-900/40 dark:text-red-300">
                        Final
                      </span>
                    )}
                  </div>
                  <span className="pl-4 text-xs text-gray-500 dark:text-gray-400">
                    {formatEventDate(exam.date)}
                  </span>
                </div>

                {/* Days remaining badge with pulse animation for urgent exams */}
                <span
                  className={cn(
                    'ml-2 shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums',
                    badgeClasses,
                    daysRemaining < 3 && 'animate-pulse',
                  )}
                >
                  {daysRemaining === 0 ? 'Hoy' : `${daysRemaining}d`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {hasMore && !showAll && (
        <button
          type="button"
          className={cn(
            'mt-2 w-full rounded-md py-2 text-center text-sm font-medium min-h-[44px]',
            'text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/20',
            'focus:outline-none focus:ring-2 focus:ring-teal-400',
            'active:scale-[0.98] active:opacity-80',
          )}
          onClick={() => setShowAll(true)}
        >
          Ver todos ({upcomingExams.length})
        </button>
      )}

      {showAll && hasMore && (
        <button
          type="button"
          className={cn(
            'mt-2 w-full rounded-md py-2 text-center text-sm font-medium min-h-[44px]',
            'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800',
            'focus:outline-none focus:ring-2 focus:ring-teal-400',
            'active:scale-[0.98] active:opacity-80',
          )}
          onClick={() => setShowAll(false)}
        >
          Mostrar menos
        </button>
      )}

      {/* Exam Prep Panel (inline, shown when an exam is selected) */}
      <AnimatePresence>
        {selectedExam && (
          <div className="mt-3">
            <ExamPrepPanel
              examId={selectedExam.id}
              examTitle={selectedExam.title}
              examDate={selectedExam.date}
              onClose={() => setSelectedExam(null)}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CountdownWidget;
