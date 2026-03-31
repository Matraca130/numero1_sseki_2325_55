// ============================================================
// Axon — HeatmapTooltip
//
// [S-2] Calendar v2 — Tooltip for heatmap day cells.
//
// Desktop: tooltip on hover (shadcn Tooltip / Radix).
// Mobile: long-press 300ms (onTouchStart/onTouchEnd).
//
// WCAG 1.4.1 compliance: always shows descriptive text label
// ("Carga: baja | media | alta | maxima"), never color alone.
// ============================================================

import { useState, useRef, useCallback, type ReactNode } from 'react';

import { useMediaQuery } from '@/app/hooks/useMediaQuery';
import { HEATMAP_LABELS, type HeatmapLevel } from '@/app/lib/calendar-constants';

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/app/components/ui/tooltip';

// ── Types ───────────────────────────────────────────────────

export interface HeatmapTooltipProps {
  /** Heatmap intensity level 0-4 */
  level: HeatmapLevel;
  /** ISO date string for the day */
  date: string;
  /** Total study minutes for this day */
  totalMinutes: number;
  /** The child element to wrap (usually a DayCell) */
  children: ReactNode;
}

// ── Load label mapping (WCAG 1.4.1) ─────────────────────

const LOAD_LABELS: Record<HeatmapLevel, string> = {
  0: 'Sin actividad',
  1: 'Carga: baja',
  2: 'Carga: media',
  3: 'Carga: alta',
  4: 'Carga: maxima',
};

// ── Tooltip content ────────────────────────────────────────

function TooltipBody({
  level,
  totalMinutes,
}: {
  level: HeatmapLevel;
  totalMinutes: number;
}) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeStr =
    hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;

  return (
    <div className="space-y-0.5">
      <p className="font-medium">{LOAD_LABELS[level]}</p>
      <p className="text-xs opacity-80">
        {totalMinutes > 0
          ? `Tiempo de estudio: ${timeStr}`
          : 'Sin tiempo registrado'}
      </p>
      <p className="text-xs opacity-60">{HEATMAP_LABELS[level]}</p>
    </div>
  );
}

// ── Mobile long-press tooltip ──────────────────────────────

function MobileTooltip({
  level,
  totalMinutes,
  children,
}: Omit<HeatmapTooltipProps, 'date'>) {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 300);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Hide after a short delay so user can read
    setTimeout(() => setIsVisible(false), 1500);
  }, []);

  const handleTouchCancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsVisible(false);
  }, []);

  return (
    <div
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {children}
      {isVisible && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 rounded-md bg-primary text-primary-foreground px-3 py-2 shadow-md animate-in fade-in-0 zoom-in-95"
          role="tooltip"
        >
          <TooltipBody level={level} totalMinutes={totalMinutes} />
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-primary" />
        </div>
      )}
      {/* WCAG 1.4.1: always provide text, not just color */}
      <span className="sr-only">{LOAD_LABELS[level]}</span>
    </div>
  );
}

// ── Desktop hover tooltip ─────────────────────────────────

function DesktopTooltip({
  level,
  totalMinutes,
  children,
}: Omit<HeatmapTooltipProps, 'date'>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="bg-gray-900 text-white border-gray-800">
        <TooltipBody level={level} totalMinutes={totalMinutes} />
      </TooltipContent>
    </Tooltip>
  );
}

// ── Main Component ─────────────────────────────────────────

export function HeatmapTooltip({
  level,
  date: _date,
  totalMinutes,
  children,
}: HeatmapTooltipProps) {
  const isDesktop = useMediaQuery(768);

  if (isDesktop) {
    return (
      <DesktopTooltip level={level} totalMinutes={totalMinutes}>
        {children}
      </DesktopTooltip>
    );
  }

  return (
    <MobileTooltip level={level} totalMinutes={totalMinutes}>
      {children}
    </MobileTooltip>
  );
}
