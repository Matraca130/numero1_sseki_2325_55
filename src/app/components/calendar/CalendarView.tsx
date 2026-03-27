// ============================================================
// Axon — CalendarView component
//
// [S-1A] Calendar v2 — Main calendar view built on react-day-picker.
// Uses useCalendarEvents, useCalendarUI, and useHeatmap hooks.
// Responsive: month grid on desktop, WeekView on mobile.
// Deep-link support via useSearchParams (ADR-03).
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DayPicker, Day, useDayPicker } from 'react-day-picker';
import type { DayContentProps, RowProps } from 'react-day-picker';
import { getUnixTime } from 'date-fns';
import 'react-day-picker/dist/style.css';
import { CalendarSkeleton } from './CalendarSkeleton';
import { DayCell } from './DayCell';
import { CellEvents } from './EventBadge';
const ExamDetailsPanel = React.lazy(() =>
  import('./ExamDetailsPanel').then(m => ({ default: m.ExamDetailsPanel })),
);
const ExamForm = React.lazy(() =>
  import('./ExamForm').then(m => ({ default: m.ExamForm })),
);
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  format,
  isSameDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSwipeable } from 'react-swipeable';

import { useCalendarEvents } from '@/app/hooks/useCalendarEvents';
import type { CalendarEvent } from '@/app/hooks/useCalendarEvents';
import { useCalendarUI } from '@/app/hooks/useCalendarUI';
import { useHeatmap } from '@/app/hooks/useHeatmap';
import type { HeatmapLevel } from '@/app/lib/calendar-constants';
import { useMediaQuery } from '@/app/hooks/useMediaQuery';
import { useFinalsWeek, toISOWeekKey } from '@/app/hooks/useFinalsWeek';
import {
  ZINDEX,
  EVENT_COLORS,
  HEATMAP_CLASSES,
  type EventType,
} from '@/app/lib/calendar-constants';
import { cn } from '@/app/components/ui/utils';
import { Button } from '@/app/components/ui/button';
import { WeekView } from './WeekView';
import { formatDateISO } from '@/app/lib/calendar-utils';

// ── Component ──────────────────────────────────────────────

export function CalendarView() {
  const isDesktop = useMediaQuery(768);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  const {
    viewMode,
    setViewMode,
    selectedDate,
    setSelectedDate,
    examId,
    openExam,
    closeExam,
  } = useCalendarUI();

  // Compute date range for the displayed month
  const rangeFrom = useMemo(
    () => startOfMonth(selectedDate),
    [selectedDate],
  );
  const rangeTo = useMemo(
    () => endOfMonth(selectedDate),
    [selectedDate],
  );

  const { events, heatmap, isLoading, error } = useCalendarEvents({
    from: rangeFrom,
    to: rangeTo,
  });

  const { heatmapMap, currentStreak } = useHeatmap(heatmap);
  const finalsWeeks = useFinalsWeek(events);

  // ── FIX 2: Pre-index events in Map ──────────────────────

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const evt of events) {
      const key = evt.date;
      const arr = map.get(key) ?? [];
      arr.push(evt);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  // ── Navigation (FIX 5: functional updaters, no stale closure) ──

  const goToPrevMonth = useCallback(() => {
    setSelectedDate(prev => subMonths(prev, 1));
  }, [setSelectedDate]);

  const goToNextMonth = useCallback(() => {
    setSelectedDate(prev => addMonths(prev, 1));
  }, [setSelectedDate]);

  const handleDaySelect = useCallback(
    (date: Date) => {
      setSelectedDate(date);
    },
    [setSelectedDate],
  );

  const handleEventClick = useCallback(
    (eventId: string) => {
      triggerRef.current = document.activeElement as HTMLButtonElement;
      openExam(eventId);
    },
    [openExam],
  );

  // ── Deep link: auto-open panel when examId is in URL ────

  useEffect(() => {
    if (examId && panelRef.current) {
      panelRef.current.focus();
    }
  }, [examId]);

  // ── Focus management: return focus to trigger on close ──

  const handleClosePanel = useCallback(() => {
    closeExam();
    // Return focus to the element that triggered the open
    requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }, [closeExam]);

  // ── Swipe gestures (mobile only) ───────────────────────

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => { if (!isDesktop) goToNextMonth(); },
    onSwipedRight: () => { if (!isDesktop) goToPrevMonth(); },
    trackMouse: false,
    preventScrollOnSwipe: true,
  });

  // ── Custom Row renderer for finals week highlighting ────

  const FinalsWeekRow = useMemo(() => {
    const RowComponent = (props: RowProps) => {
      const { styles, classNames } = useDayPicker();

      const isFinalsRow = props.dates.some(date => {
        const isoStr = formatDateISO(date);
        const weekKey = toISOWeekKey(isoStr);
        return finalsWeeks.has(weekKey);
      });

      return (
        <tr
          className={cn(
            classNames.row,
            isFinalsRow && 'bg-red-50 ring-1 ring-red-200 dark:bg-red-950/20 dark:ring-red-800',
          )}
          style={styles.row}
        >
          {props.dates.map(date => (
            <td
              key={getUnixTime(date)}
              className={classNames.cell}
              style={styles.cell}
              role="presentation"
            >
              <Day displayMonth={props.displayMonth} date={date} />
            </td>
          ))}
        </tr>
      );
    };
    RowComponent.displayName = 'FinalsWeekRow';
    return RowComponent;
  }, [finalsWeeks]);

  // ── FIX 1: Custom DayContent using real DayCell ─────────

  const renderDayContent = useCallback(
    (props: DayContentProps) => {
      const date = props.date;
      const iso = formatDateISO(date);
      const dayEvents = eventsByDate.get(iso) ?? [];
      const heatmapDay = heatmapMap.get(iso);

      return (
        <DayCell
          date={date}
          events={dayEvents}
          heatmapLevel={(heatmapDay?.level ?? 0) as HeatmapLevel}
          isStreakDay={heatmapDay?.streakDay ?? false}
          isSelected={isSameDay(date, selectedDate)}
          onSelect={() => handleDaySelect(date)}
        >
          <CellEvents
            events={dayEvents}
            onEventTap={(evt) => handleEventClick(evt.id)}
            onOverflowTap={() => handleDaySelect(date)}
          />
        </DayCell>
      );
    },
    [eventsByDate, heatmapMap, selectedDate, handleEventClick, handleDaySelect],
  );

  // ── Render ──────────────────────────────────────────────

  return (
    <ErrorBoundary variant="section">
      <div className="flex flex-col gap-4" aria-busy={isLoading}>
        {/* Header: month navigation + view toggle + streak */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevMonth}
              aria-label="Mes anterior"
              className="min-h-[44px] min-w-[44px]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <h2
              aria-live="polite"
              className="text-lg min-w-[160px] text-center capitalize"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {format(selectedDate, 'MMMM yyyy', { locale: es })}
            </h2>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNextMonth}
              aria-label="Mes siguiente"
              className="min-h-[44px] min-w-[44px]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {/* Streak indicator */}
            {currentStreak > 0 && (
              <span
                className="flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-900/30 px-3 py-1 text-sm text-green-700 dark:text-green-400"
                aria-label={`Racha de ${currentStreak} dias`}
              >
                <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
                {currentStreak}d
              </span>
            )}

            {/* View mode toggle (only on desktop) */}
            {isDesktop && (
              <div className="flex rounded-lg border dark:border-gray-700" role="group" aria-label="Modo de vista">
                {(['month', 'week'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    className={cn(
                      'px-3 py-1.5 text-sm capitalize transition-colors',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500',
                      viewMode === mode
                        ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-medium'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800',
                    )}
                    onClick={() => setViewMode(mode)}
                    aria-pressed={viewMode === mode}
                  >
                    {mode === 'month' ? 'Mes' : 'Semana'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FIX 6: Error state */}
        {error && !isLoading && (
          <div className="p-6 text-center text-red-600 dark:text-red-400" role="alert">
            <p>Error cargando datos del calendario.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-teal-600 dark:text-teal-400 underline hover:text-teal-800 dark:hover:text-teal-300"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && <CalendarSkeleton />}

        {/* Calendar body */}
        {!isLoading && !error && (
          <>
            {viewMode === 'week' && isDesktop ? (
              <WeekView
                events={events}
                selectedDate={selectedDate}
                onDaySelect={handleDaySelect}
                isDesktop={isDesktop}
              />
            ) : (
              <div {...swipeHandlers}>
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={date => date && handleDaySelect(date)}
                  month={selectedDate}
                  onMonthChange={setSelectedDate}
                  locale={es}
                  weekStartsOn={1}
                  showOutsideDays
                  components={{
                    DayContent: renderDayContent,
                    Row: FinalsWeekRow,
                  }}
                  classNames={{
                    months: 'flex flex-col',
                    month: 'space-y-2',
                    caption: 'hidden', // We use our own header
                    nav: 'hidden',     // We use our own nav
                    table: 'w-full border-collapse',
                    head_row: 'flex',
                    head_cell:
                      'flex-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2',
                    row: 'flex w-full',
                    cell: cn(
                      'flex-1 relative p-0.5 text-center',
                      'focus-within:z-20',
                    ),
                    day: cn(
                      'w-full min-h-[60px] rounded-lg p-1',
                      'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                      'focus:outline-none focus:ring-2 focus:ring-teal-400',
                      !isDesktop && 'min-h-[72px]',
                    ),
                    day_selected:
                      'bg-teal-50 dark:bg-teal-900/30 ring-1 ring-teal-300 dark:ring-teal-700',
                    day_today: 'font-bold',
                    day_outside: 'opacity-40',
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* FIX 3: ExamDetailsPanel integration (lazy loaded) */}
        <React.Suspense fallback={null}>
          <ExamDetailsPanel
            examId={examId}
            events={events}
            onClose={handleClosePanel}
            onEdit={(id) => setEditingExamId(id)}
          />
        </React.Suspense>

        {/* ExamForm — lazy loaded, shown when editing */}
        {editingExamId !== null && (
          <React.Suspense fallback={null}>
            <ExamForm
              exam={events.find(e => e.id === editingExamId) ?? null}
              onClose={() => setEditingExamId(null)}
            />
          </React.Suspense>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default CalendarView;
