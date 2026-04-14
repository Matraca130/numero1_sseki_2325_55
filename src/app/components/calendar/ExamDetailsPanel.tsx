// ============================================================
// Axon — ExamDetailsPanel
//
// [S-2] Calendar v2 — Side panel / bottom drawer for exam details.
//
// Desktop (>=768px): shadcn Sheet (right panel)
// Mobile (<768px):   shadcn Drawer (bottom sheet)
//
// Receives examId from useCalendarUI, looks up event data from
// useCalendarEvents. Countdown badge with color coding:
//   green >14d, amber 7-14d, red <7d
//
// Focus management via calendar-focus.ts createFocusManager().
// ============================================================

import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { X, MapPin, Clock, BookOpen, GraduationCap } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

import { useMediaQuery } from '@/app/hooks/useMediaQuery';
import { createFocusManager } from '@/app/lib/calendar-focus';
import type { CalendarEvent } from '@/app/types/calendar';
import { EVENT_COLORS, type EventType } from '@/app/lib/calendar-constants';
import { cn } from '@/app/components/ui/utils';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/app/components/ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/app/components/ui/drawer';
import { Button } from '@/app/components/ui/button';

// ── Types ───────────────────────────────────────────────────

export interface ExamDetailsPanelProps {
  /** The exam ID to display (null = closed) */
  examId: string | null;
  /** All calendar events (to look up the exam) */
  events: CalendarEvent[];
  /** Close handler (removes examId from URL) */
  onClose: () => void;
  /** Edit handler — opens the form for this exam */
  onEdit?: (examId: string) => void;
}

// ── Countdown helpers ──────────────────────────────────────

function getCountdownDays(dateStr: string): number {
  const examDate = parseISO(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return differenceInDays(examDate, today);
}

function getCountdownColor(days: number): string {
  if (days > 14) return 'bg-green-100 text-green-800';
  if (days >= 7) return 'bg-amber-100 text-amber-800';
  return 'bg-red-100 text-red-800';
}

function getCountdownText(days: number): string {
  if (days < 0) return 'Finalizado';
  if (days === 0) return 'Hoy';
  if (days === 1) return '1 dia';
  return `${days} dias`;
}

// ── Shared Content ─────────────────────────────────────────

function PanelContent({
  exam,
  onEdit,
}: {
  exam: CalendarEvent;
  onEdit?: (id: string) => void;
}) {
  const days = getCountdownDays(exam.date);
  const colorClasses = EVENT_COLORS[exam.exam_type as EventType] ?? EVENT_COLORS.written;

  const formattedDate = useMemo(() => {
    try {
      return format(parseISO(exam.date), "EEEE d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return exam.date;
    }
  }, [exam.date]);

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {/* Countdown badge */}
        <div className="flex items-center gap-2">
          <span
            className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 font-medium', getCountdownColor(days))}
            style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}
          >
            {getCountdownText(days)}
          </span>
          <span
            className={cn('inline-flex items-center rounded-full px-2.5 py-0.5', colorClasses.bg, colorClasses.text)}
            style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}
          >
            {exam.exam_type}
          </span>
          {exam.is_final && (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 bg-purple-100 text-purple-800"
              style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}
            >
              Final
            </span>
          )}
        </div>

        {/* Details grid */}
        <div className="space-y-3">
          {/* Date */}
          <div className="flex items-start gap-3">
            <Clock className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium" style={{ fontSize: 'clamp(0.813rem, 2vw, 0.875rem)' }}>
                {formattedDate}
              </p>
              {exam.time && (
                <p className="text-muted-foreground" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.813rem)' }}>
                  {exam.time}
                </p>
              )}
            </div>
          </div>

          {/* Location */}
          {exam.location && (
            <div className="flex items-start gap-3">
              <MapPin className="size-4 text-muted-foreground mt-0.5 shrink-0" />
              <p style={{ fontSize: 'clamp(0.813rem, 2vw, 0.875rem)' }}>{exam.location}</p>
            </div>
          )}

          {/* Course */}
          <div className="flex items-start gap-3">
            <BookOpen className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <p style={{ fontSize: 'clamp(0.813rem, 2vw, 0.875rem)' }}>
              Curso: {exam.course_id}
            </p>
          </div>

          {/* Type */}
          <div className="flex items-start gap-3">
            <GraduationCap className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <p style={{ fontSize: 'clamp(0.813rem, 2vw, 0.875rem)' }}>
              Tipo: {exam.exam_type} {exam.is_final ? '(final)' : '(parcial)'}
            </p>
          </div>
        </div>
      </div>

      {/* CRITICAL: sticky footer for mobile */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t p-4 pb-[env(safe-area-inset-bottom)]">
        <Button
          className="w-full rounded-full min-h-[44px]"
          onClick={() => onEdit?.(exam.id)}
        >
          Editar examen
        </Button>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────

export function ExamDetailsPanel({
  examId,
  events,
  onClose,
  onEdit,
}: ExamDetailsPanelProps) {
  const isDesktop = useMediaQuery(768);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [focusManager] = useState(() => createFocusManager());

  const exam = useMemo(
    () => (examId ? events.find((e) => e.id === examId) ?? null : null),
    [examId, events],
  );

  const isOpen = examId !== null && exam !== null;

  // Focus management: focus close button on open, restore on close
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        focusManager.onClose();
        onClose();
      }
    },
    [focusManager, onClose],
  );

  useEffect(() => {
    if (isOpen && !isDesktop) {
      focusManager.onOpen(closeButtonRef);
    }
  }, [isOpen, isDesktop, focusManager]);

  if (!exam) {
    return null;
  }

  // ── Desktop: Sheet ─────────────────────────────────────
  if (isDesktop) {
    return (
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent side="right" className="w-[400px] sm:max-w-[400px] p-0 flex flex-col">
          <SheetHeader className="p-4 pb-2 pr-12">
            <SheetTitle
              className="font-semibold"
              style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}
            >
              {exam.title}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Detalles del examen {exam.title}
            </SheetDescription>
          </SheetHeader>
          <PanelContent exam={exam} onEdit={onEdit} />
        </SheetContent>
      </Sheet>
    );
  }

  // ── Mobile: Drawer ─────────────────────────────────────
  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85dvh] flex flex-col">
        <DrawerHeader className="pb-2 pr-12 relative">
          <DrawerTitle
            className="font-semibold"
            style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}
          >
            {exam.title}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Detalles del examen {exam.title}
          </DrawerDescription>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </DrawerHeader>
        <PanelContent exam={exam} onEdit={onEdit} />
      </DrawerContent>
    </Drawer>
  );
}
