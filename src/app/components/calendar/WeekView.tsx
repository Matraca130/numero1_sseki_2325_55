// ============================================================
// Axon — WeekView component
//
// [S-1A] Calendar v2 — Independent 7-column week view.
// Horizontal scroll with snap on mobile.
// Accepts events, selectedDate, and onDaySelect as props.
//
// This is a SEPARATE file from CalendarView (per manifest).
// ============================================================

import React, { useMemo } from 'react';
import {
  startOfWeek,
  addDays,
  isSameDay,
  format,
  isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';

import type { CalendarEvent } from '@/app/hooks/useCalendarEvents';
import { cn } from '@/app/components/ui/utils';
import { formatDateISO, getEventColor } from '@/app/lib/calendar-utils';

// ── Types ──────────────────────────────────────────────────

export interface WeekViewProps {
  /** All events for the current range */
  events: CalendarEvent[];
  /** Currently selected date */
  selectedDate: Date;
  /** Callback when a day column is selected */
  onDaySelect: (date: Date) => void;
  /** Callback when an event inside a day is clicked */
  onEventClick?: (eventId: string) => void;
  /** Whether the viewport is desktop-sized (>=768px), passed from parent */
  isDesktop?: boolean;
}

// ── Component ──────────────────────────────────────────────

export function WeekView({ events, selectedDate, onDaySelect, onEventClick, isDesktop }: WeekViewProps) {
  // Compute the 7 days of the week containing selectedDate
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  // Group events by ISO date for quick lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const evt of events) {
      const existing = map.get(evt.date) ?? [];
      existing.push(evt);
      map.set(evt.date, existing);
    }
    return map;
  }, [events]);

  return (
    <div
      role="grid"
      aria-label="Vista semanal del calendario"
    >
      {/* Header row with day names */}
      <div
        className="hidden md:grid md:grid-cols-7 md:gap-1 md:mb-1"
        role="row"
      >
        {weekDays.map(day => (
          <div
            key={`header-${formatDateISO(day)}`}
            role="columnheader"
            className="text-center text-xs font-medium uppercase tracking-wide text-gray-500"
          >
            {format(day, 'EEE', { locale: es })}
          </div>
        ))}
      </div>

      {/* Data row with day cells */}
      <div
        className={cn(
          'flex gap-1 overflow-x-auto pb-2',
          // Mobile: horizontal scroll with snap
          'snap-x snap-mandatory',
          // Desktop: no scroll needed, equal columns
          'md:grid md:grid-cols-7 md:overflow-x-visible md:snap-none',
        )}
        role="row"
      >
      {weekDays.map(day => {
        const iso = formatDateISO(day);
        const dayEvents = eventsByDate.get(iso) ?? [];
        const selected = isSameDay(day, selectedDate);
        const today = isToday(day);

        return (
          <button
            key={iso}
            type="button"
            className={cn(
              // Base column styles
              'flex min-w-[120px] flex-shrink-0 flex-col rounded-xl border p-2',
              'snap-start transition-all',
              'focus:outline-none focus:ring-2 focus:ring-teal-400',
              'min-h-[44px] active:scale-[0.98]',
              // Desktop: full width in grid
              'md:min-w-0',
              // States
              selected && 'border-teal-400 bg-teal-50',
              !selected && 'border-gray-200 bg-white hover:border-gray-300',
              today && !selected && 'border-teal-200',
            )}
            onClick={() => onDaySelect(day)}
            aria-selected={selected}
            aria-current={today ? 'date' : undefined}
            role="gridcell"
          >
            {/* Day header */}
            <div className="mb-1 text-center">
              <div
                className={cn(
                  'text-xs uppercase tracking-wide',
                  selected ? 'text-teal-700 font-medium' : 'text-gray-500',
                )}
              >
                {format(day, 'EEE', { locale: es })}
              </div>
              <div
                className={cn(
                  'text-lg font-semibold',
                  selected && 'text-teal-700',
                  today && !selected && 'text-teal-600',
                )}
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {day.getDate()}
              </div>
            </div>

            {/* Events list */}
            {dayEvents.length > 0 && (
              <div className="mt-auto flex flex-col gap-1">
                {dayEvents.map(evt => {
                  const colors = getEventColor(evt.exam_type);
                  return (
                    <button
                      key={evt.id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEventClick?.(evt.id); }}
                      aria-label={evt.title}
                      className={cn(
                        'truncate rounded px-1.5 py-0.5 text-[11px] leading-tight',
                        'min-h-[44px] cursor-pointer active:scale-[0.98]',
                        colors.bg,
                        colors.text,
                      )}
                      title={evt.title}
                    >
                      {evt.time && (
                        <span className="mr-1 font-medium">
                          {evt.time.slice(0, 5)}
                        </span>
                      )}
                      {evt.title}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Empty state for days with no events */}
            {dayEvents.length === 0 && (
              <div className="mt-auto text-center text-xs text-gray-300">
                &mdash;
              </div>
            )}
          </button>
        );
      })}
      </div>
    </div>
  );
}

export default WeekView;
