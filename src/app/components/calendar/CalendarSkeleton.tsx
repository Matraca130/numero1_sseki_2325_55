// ============================================================
// Axon — CalendarSkeleton
//
// [A-03] Calendar v2 — Loading skeleton for the calendar view.
// Displays a 7-column grid with animated pulse cells matching
// the real calendar's aspect ratio (5-6 rows x 7 columns).
//
// Shown while isLoading=true from useCalendarEvents.
// Responsive: collapses to smaller cells on mobile.
// ============================================================

import { cn } from '@/app/components/ui/utils';
import { useMediaQuery } from '@/app/hooks/useMediaQuery';

// ── Day labels ──────────────────────────────────────────────

const DAY_LABELS_DESKTOP = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAY_LABELS_MOBILE = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// ── Skeleton Cell ───────────────────────────────────────────

function SkeletonCell({ isDesktop }: { isDesktop: boolean }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700',
        isDesktop ? 'aspect-[4/3]' : 'aspect-square',
      )}
    >
      {/* Simulated day number */}
      <div className="p-1.5">
        <div className="h-3 w-4 rounded bg-gray-300 dark:bg-gray-600" />
      </div>

      {/* Simulated event badges (desktop only) */}
      {isDesktop && (
        <div className="flex flex-col gap-1 px-1.5">
          <div className="h-2 w-3/4 rounded bg-gray-300 dark:bg-gray-600" />
          <div className="h-2 w-1/2 rounded bg-gray-300 dark:bg-gray-600" />
        </div>
      )}
    </div>
  );
}

// ── Header Skeleton ─────────────────────────────────────────

function HeaderSkeleton({ isDesktop }: { isDesktop: boolean }) {
  const labels = isDesktop ? DAY_LABELS_DESKTOP : DAY_LABELS_MOBILE;

  return (
    <div className="mb-4 flex items-center justify-between">
      {/* Month/Year placeholder */}
      <div className="h-6 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />

      {/* Navigation buttons placeholder */}
      <div className="flex gap-2">
        <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────

const SKELETON_ROWS = 5;
const SKELETON_COLS = 7;

export function CalendarSkeleton() {
  const isDesktop = useMediaQuery(768);

  const labels = isDesktop ? DAY_LABELS_DESKTOP : DAY_LABELS_MOBILE;

  return (
    <div
      className="w-full"
      role="status"
      aria-label="Cargando calendario"
    >
      {/* Header skeleton */}
      <HeaderSkeleton isDesktop={isDesktop} />

      {/* Day-of-week labels */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {labels.map((label) => (
          <div
            key={label}
            className="animate-pulse py-1 text-center"
          >
            <div className="mx-auto h-3 w-6 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>

      {/* Calendar grid: 5 rows x 7 columns */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: SKELETON_ROWS * SKELETON_COLS }, (_, i) => (
          <SkeletonCell key={i} isDesktop={isDesktop} />
        ))}
      </div>

      {/* Screen reader text */}
      <span className="sr-only">Cargando calendario...</span>
    </div>
  );
}

export default CalendarSkeleton;
