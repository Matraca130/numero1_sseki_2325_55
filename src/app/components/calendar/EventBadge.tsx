// ============================================================
// Axon — EventBadge component
//
// [S-1B] Calendar v2 — Badge for calendar events inside DayCell.
//
// Features:
// - Desktop: colored badge with event title
// - Mobile: min-h-[44px] touch target (WCAG)
// - Overflow: "+N" badge when >1 event on mobile
// - Tap on overflow → callback to open bottom sheet
// - Colors from EVENT_COLORS (static Tailwind classes)
// ============================================================

import { EVENT_COLORS } from '@/app/lib/calendar-constants';
import type { EventType } from '@/app/lib/calendar-constants';
import type { CalendarEvent } from '@/app/hooks/useCalendarEvents';
import { useMediaQuery } from '@/app/hooks/useMediaQuery';

// ── Props ───────────────────────────────────────────────────

export interface EventBadgeProps {
  /** The event to display */
  event: CalendarEvent;
  /** Callback when user taps badge (opens detail panel / bottom sheet) */
  onTap?: (event: CalendarEvent) => void;
}

export interface EventBadgeOverflowProps {
  /** Total number of events in the cell */
  totalEvents: number;
  /** Callback when user taps the overflow badge */
  onTap?: () => void;
}

// ── Helpers ─────────────────────────────────────────────────

function getColorClasses(examType: string) {
  const key = examType as EventType;
  return EVENT_COLORS[key] ?? EVENT_COLORS.exam;
}

// ── Single Event Badge ──────────────────────────────────────

export function EventBadge({ event, onTap }: EventBadgeProps) {
  const isDesktop = useMediaQuery(768);
  const colors = getColorClasses(event.exam_type);

  return (
    <button
      type="button"
      onClick={() => onTap?.(event)}
      className={[
        'w-full text-left rounded border truncate',
        'transition-colors transition-transform duration-100',
        'active:scale-95 active:opacity-80',
        colors.bg,
        colors.text,
        colors.border,
        isDesktop
          ? 'px-1 py-0.5 text-[10px] leading-tight'
          : 'min-h-[44px] px-2 py-2 text-xs leading-snug flex items-center',
      ].join(' ')}
      title={event.title}
    >
      <span className="truncate">{event.title}</span>
    </button>
  );
}

// ── Overflow Badge ("+N") ───────────────────────────────────

export function EventBadgeOverflow({ totalEvents, onTap }: EventBadgeOverflowProps) {
  const hiddenCount = totalEvents - 1;
  if (hiddenCount <= 0) return null;

  return (
    <button
      type="button"
      onClick={() => onTap?.()}
      className={[
        'w-full text-center rounded border',
        'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600',
        'min-h-[44px] px-2 py-2 text-xs leading-snug flex items-center justify-center',
        'transition-colors transition-transform duration-100 hover:bg-gray-200 dark:hover:bg-gray-700',
        'active:scale-95 active:opacity-80',
      ].join(' ')}
      aria-label={`${hiddenCount} evento${hiddenCount > 1 ? 's' : ''} adicional${hiddenCount > 1 ? 'es' : ''}`}
    >
      +{hiddenCount}
    </button>
  );
}

// ── Cell Events Renderer ────────────────────────────────────
// Convenience component that handles the mobile overflow logic.

export interface CellEventsProps {
  events: CalendarEvent[];
  onEventTap?: (event: CalendarEvent) => void;
  onOverflowTap?: () => void;
}

export function CellEvents({ events, onEventTap, onOverflowTap }: CellEventsProps) {
  const isDesktop = useMediaQuery(768);

  if (events.length === 0) return null;

  // Desktop: show all badges
  if (isDesktop) {
    return (
      <>
        {events.map((event) => (
          <EventBadge key={event.id} event={event} onTap={onEventTap} />
        ))}
      </>
    );
  }

  // Mobile: show first event + overflow badge if >1
  return (
    <>
      <EventBadge event={events[0]} onTap={onEventTap} />
      {events.length > 1 && (
        <EventBadgeOverflow
          totalEvents={events.length}
          onTap={onOverflowTap}
        />
      )}
    </>
  );
}

export default EventBadge;
