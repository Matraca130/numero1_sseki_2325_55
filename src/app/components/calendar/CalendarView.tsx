// ============================================================
// Axon — CalendarView component
//
// [S-1A] Calendar v2 — Main calendar view built on react-day-picker.
// Uses useCalendarEvents, useCalendarUI, and useHeatmap hooks.
// Responsive: month grid on desktop, WeekView on mobile.
// Deep-link support via useSearchParams (ADR-03).
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { DayPicker, Day, useDayPicker } from 'react-day-picker';
import type { DayContentProps, RowProps } from 'react-day-picker';
import { getUnixTime } from 'date-fns';
import 'react-day-picker/dist/style.css';
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

import { useCalendarEvents } from '@/app/hooks/useCalendarEvents';
import type { CalendarEvent } from '@/app/hooks/useCalendarEvents';
import { useCalendarUI } from '@/app/hooks/useCalendarUI';
import { useHeatmap } from '@/app/hooks/useHeatmap';
import type { HeatmapDay } from '@/app/hooks/useHeatmap';
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

// ── Placeholder types for components created by other agents ──
// DayCell and EventBadge will be created by S-1B/S-1C.
// These placeholder types ensure this file compiles before those exist.

type DayCellProps = {
  date: Date;
  events: CalendarEvent[];
  heatmapDay: HeatmapDay | undefined;
  isMobile: boolean;
  isSelected: boolean;
  onSelect: (date: Date) => void;
  onEventClick: (id: string) => void;
};

// Try importing DayCell if it exists; fall back to inline placeholder
let DayCell: React.ComponentType<DayCellProps> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('./DayCell');
  DayCell = mod.DayCell ?? mod.default ?? null;
} catch {
  // DayCell not yet created by S-1B — will use default DayContent
}

// ── Helpers ────────────────────────────────────────────────

function getEventsForDate(
  events: CalendarEvent[],
  date: Date,
): CalendarEvent[] {
  const iso = formatISO(date);
  return events.filter(e => e.date === iso);
}

function formatISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getEventColor(type: string) {
  return EVENT_COLORS[type as EventType] ?? EVENT_COLORS.exam;
}

// ── Component ──────────────────────────────────────────────

export function CalendarView() {
  const isDesktop = useMediaQuery(768);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

  const { events, heatmap, isLoading } = useCalendarEvents({
    from: rangeFrom,
    to: rangeTo,
  });

  const { heatmapMap, currentStreak } = useHeatmap(heatmap);
  const finalsWeeks = useFinalsWeek(events);

  // ── Navigation ──────────────────────────────────────────

  const goToPrevMonth = useCallback(() => {
    setSelectedDate(subMonths(selectedDate, 1));
  }, [selectedDate, setSelectedDate]);

  const goToNextMonth = useCallback(() => {
    setSelectedDate(addMonths(selectedDate, 1));
  }, [selectedDate, setSelectedDate]);

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

  // ── Custom Row renderer for finals week highlighting ────

  const FinalsWeekRow = useMemo(() => {
    const RowComponent = (props: RowProps) => {
      const { styles, classNames } = useDayPicker();

      const isFinalsRow = props.dates.some(date => {
        const isoStr = formatISO(date);
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

  // ── Custom DayContent renderer ──────────────────────────

  const renderDayContent = useCallback(
    (props: DayContentProps) => {
      const date = props.date;
      const dayEvents = getEventsForDate(events, date);
      const heatmapDay = heatmapMap.get(formatISO(date));
      const heatmapLevel = heatmapDay?.level ?? 0;
      const isSelected = isSameDay(date, selectedDate);
      const maxBadges = isDesktop ? 3 : 1;
      const visibleEvents = dayEvents.slice(0, maxBadges);
      const overflowCount = dayEvents.length - maxBadges;

      return (
        <div className="relative flex h-full w-full flex-col items-center">
          {/* Heatmap overlay */}
          {heatmapLevel > 0 && (
            <div
              className={cn(
                'absolute inset-0 rounded-md pointer-events-none opacity-40',
                HEATMAP_CLASSES[heatmapLevel],
              )}
              style={{ zIndex: ZINDEX.overlay }}
              aria-hidden="true"
            />
          )}

          {/* Streak dot */}
          {heatmapDay?.streakDay && (
            <div
              className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-green-500"
              style={{ zIndex: ZINDEX.streak }}
              aria-hidden="true"
            />
          )}

          {/* Day number */}
          <span
            className={cn(
              'relative text-sm',
              isSelected && 'font-bold text-teal-600',
            )}
            style={{ zIndex: ZINDEX.streak + 1 }}
          >
            {date.getDate()}
          </span>

          {/* Event badges */}
          {dayEvents.length > 0 && (
            <div
              className="relative mt-0.5 flex flex-col gap-0.5 w-full px-0.5"
              style={{ zIndex: ZINDEX.streak + 1 }}
            >
              {visibleEvents.map(evt => {
                const colors = getEventColor(evt.exam_type);
                return (
                  <button
                    key={evt.id}
                    type="button"
                    className={cn(
                      'truncate rounded px-1 text-[10px] leading-tight min-h-[20px]',
                      colors.bg,
                      colors.text,
                      'hover:opacity-80 cursor-pointer',
                      !isDesktop && 'min-h-[44px] text-xs',
                    )}
                    onClick={e => {
                      e.stopPropagation();
                      handleEventClick(evt.id);
                    }}
                    aria-label={`${evt.title} - ${evt.exam_type}`}
                  >
                    {evt.title}
                  </button>
                );
              })}
              {overflowCount > 0 && (
                <button
                  type="button"
                  className={cn(
                    'rounded bg-gray-100 text-gray-600 px-1 text-[10px] leading-tight',
                    !isDesktop && 'min-h-[44px] text-xs',
                  )}
                  onClick={e => {
                    e.stopPropagation();
                    handleDaySelect(date);
                  }}
                  aria-label={`${overflowCount} eventos mas`}
                >
                  +{overflowCount}
                </button>
              )}
            </div>
          )}
        </div>
      );
    },
    [events, heatmapMap, selectedDate, isDesktop, handleEventClick, handleDaySelect],
  );

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
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
              className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-sm text-green-700"
              aria-label={`Racha de ${currentStreak} dias`}
            >
              <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
              {currentStreak}d
            </span>
          )}

          {/* View mode toggle (only on desktop) */}
          {isDesktop && (
            <div className="flex rounded-lg border" role="group" aria-label="Modo de vista">
              {(['month', 'week'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  className={cn(
                    'px-3 py-1.5 text-sm capitalize transition-colors',
                    viewMode === mode
                      ? 'bg-teal-50 text-teal-700 font-medium'
                      : 'text-gray-500 hover:bg-gray-50',
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

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12" aria-busy="true">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          <span className="sr-only">Cargando calendario...</span>
        </div>
      )}

      {/* Calendar body */}
      {!isLoading && (
        <>
          {viewMode === 'week' && isDesktop ? (
            <WeekView
              events={events}
              selectedDate={selectedDate}
              onDaySelect={handleDaySelect}
            />
          ) : (
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
                  'flex-1 text-center text-xs font-medium text-gray-500 py-2',
                row: 'flex w-full',
                cell: cn(
                  'flex-1 relative p-0.5 text-center',
                  'focus-within:z-20',
                ),
                day: cn(
                  'w-full min-h-[60px] rounded-lg p-1',
                  'hover:bg-gray-50 transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-teal-400',
                  !isDesktop && 'min-h-[72px]',
                ),
                day_selected:
                  'bg-teal-50 ring-1 ring-teal-300',
                day_today: 'font-bold',
                day_outside: 'opacity-40',
              }}
            />
          )}
        </>
      )}

      {/* Exam detail panel anchor (for deep-link focus management) */}
      {examId && (
        <div
          ref={panelRef}
          tabIndex={-1}
          aria-label="Panel de detalle de examen"
          className="outline-none"
        >
          {/*
            ExamDetailsPanel will be rendered here by S-2.
            It reads examId from useCalendarUI / useSearchParams.
            The panel component (Sheet on desktop, Drawer on mobile)
            will be imported and integrated in S-2.
          */}
          <div className="sr-only">
            Examen seleccionado: {examId}
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarView;
