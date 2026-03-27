// ============================================================
// Axon — DayCell component
//
// [S-1B] Calendar v2 — Individual day cell for the calendar grid.
//
// Features:
// - Heatmap overlay (position:absolute, pointer-events:none)
// - Streak dot indicator (6px green circle)
// - [A-04] aria-label with Spanish Intl.DateTimeFormat
// - Renders children (EventBadge instances) inside the cell
// ============================================================

import { useMemo } from 'react';
import { ZINDEX, HEATMAP_CLASSES } from '@/app/lib/calendar-constants';
import type { HeatmapLevel } from '@/app/lib/calendar-constants';
import type { CalendarEvent } from '@/app/hooks/useCalendarEvents';

// ── Props ───────────────────────────────────────────────────

export interface DayCellProps {
  date: Date;
  events: CalendarEvent[];
  heatmapLevel: HeatmapLevel;
  isStreakDay: boolean;
  isSelected: boolean;
  onSelect: (date: Date) => void;
  children?: React.ReactNode;
}

// ── Spanish date formatter (singleton) ──────────────────────

const dayFormatter = new Intl.DateTimeFormat('es', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

// ── Component ───────────────────────────────────────────────

export function DayCell({
  date,
  events,
  heatmapLevel,
  isStreakDay,
  isSelected,
  onSelect,
  children,
}: DayCellProps) {
  // [A-04] aria-label: "Lunes 3 de marzo, 2 eventos"
  const ariaLabel = useMemo(() => {
    const formatted = dayFormatter.format(date);
    // Capitalize first letter
    const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    const count = events.length;
    const eventText =
      count === 0
        ? 'sin eventos'
        : count === 1
          ? '1 evento'
          : `${count} eventos`;
    return `${capitalized}, ${eventText}`;
  }, [date, events.length]);

  const heatmapClass = HEATMAP_CLASSES[heatmapLevel];

  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      aria-label={ariaLabel}
      aria-selected={isSelected}
      className={[
        'relative w-full min-h-[44px] p-1 text-left rounded-md',
        'transition-colors duration-150',
        'hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500',
        isSelected ? 'ring-2 ring-teal-500' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Day number */}
      <span className="relative z-[5] text-sm font-medium leading-none">
        {date.getDate()}
      </span>

      {/* Heatmap overlay */}
      <div
        className={`absolute inset-0 rounded-md pointer-events-none opacity-40 ${heatmapClass}`}
        style={{ zIndex: ZINDEX.overlay }}
        aria-hidden="true"
      />

      {/* Streak dot — 6px green circle */}
      {isStreakDay && (
        <div
          className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-500"
          style={{ zIndex: ZINDEX.streak }}
          aria-hidden="true"
        />
      )}

      {/* Event badges (passed as children) */}
      {children && (
        <div className="relative mt-1 flex flex-col gap-0.5" style={{ zIndex: ZINDEX.streak }}>
          {children}
        </div>
      )}
    </button>
  );
}

export default DayCell;
