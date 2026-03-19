// ============================================================
// Axon — Presentation Mode
//
// Full-screen overlay for navigating knowledge graph nodes
// one-by-one with arrow keys. Shows keyword name, definition,
// mastery level, and position index.
//
// Keyboard: Left/Right arrows, Escape to exit.
// Mobile: On-screen arrow buttons.
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusTrap } from './useFocusTrap';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { MapNode, MapEdge } from '@/app/types/mindmap';
import { MASTERY_HEX, MASTERY_HEX_LIGHT } from '@/app/types/mindmap';
import { colors } from '@/app/design-system';
import {
  presentationFontSize as fs,
  masteryLabel,
  masteryPercent,
  topologicalSort,
  slideVariants,
} from './presentationHelpers';
import type { SlideDir } from './presentationHelpers';

// ── Types ───────────────────────────────────────────────────

interface PresentationModeProps {
  nodes: MapNode[];
  edges: MapEdge[];
  initialIndex?: number;
  onExit: () => void;
  onNodeFocus?: (nodeId: string) => void;
}

// ── Component ───────────────────────────────────────────────

export function PresentationMode({
  nodes, edges, initialIndex = 0, onExit, onNodeFocus,
}: PresentationModeProps) {
  const sorted = useMemo(() => topologicalSort(nodes, edges), [nodes, edges]);
  const total = sorted.length;

  const [index, setIndex] = useState(() => Math.max(0, Math.min(initialIndex, total - 1)));
  const [direction, setDirection] = useState<SlideDir>('right');
  const overlayRef = useFocusTrap<HTMLDivElement>(total > 0);

  // Stabilize onExit via ref to avoid stale closure in handleKeyDown
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  // Lock body scroll while presentation is open
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  // Clamp index when sorted list changes (e.g. nodes added/removed during presentation)
  useEffect(() => {
    if (total > 0) setIndex(i => Math.min(i, total - 1));
  }, [total]);

  const current = sorted[index] as MapNode | undefined;

  // Focus is handled by useFocusTrap — no separate focus call needed

  // eslint-disable-next-line react-hooks/exhaustive-deps — depend on ID, not object reference
  const currentId = current?.id;
  useEffect(() => {
    if (currentId && onNodeFocus) onNodeFocus(currentId);
  }, [currentId, onNodeFocus]);

  const goNext = useCallback(() => {
    setDirection('right');
    setIndex(i => Math.min(i + 1, total - 1));
  }, [total]);

  const goPrev = useCallback(() => {
    setDirection('left');
    setIndex(i => Math.max(i - 1, 0));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': e.preventDefault(); goNext(); break;
      case 'ArrowLeft': case 'ArrowUp': e.preventDefault(); goPrev(); break;
      case 'Escape': e.preventDefault(); onExitRef.current(); break;
    }
  }, [goNext, goPrev]);

  // Swipe gesture support for mobile navigation
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;
    // Require: horizontal swipe > 50px, mostly horizontal, under 500ms
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 500) {
      if (dx < 0) goNext(); else goPrev();
    }
  }, [goNext, goPrev]);

  if (total === 0 || !current) return null;

  const progressPct = ((index + 1) / total) * 100;
  const mc = current.masteryColor;

  return (
    <motion.div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center outline-none"
      style={{ backgroundColor: 'rgba(27,59,54,0.92)' }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label={`Modo presentaci\u00f3n \u2014 ${index + 1} de ${total}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Close button */}
      <button
        onClick={onExit}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 p-3 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all duration-150 z-10"
        aria-label="Salir del modo presentaci\u00f3n (Escape)"
      >
        <X className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Node index */}
      <div
        className="absolute top-4 left-4 sm:top-6 sm:left-6 text-white/50 font-sans font-medium"
        style={{ fontSize: fs.index }}
      >
        {index + 1} de {total}
      </div>

      {/* Navigation arrows */}
      <button
        onClick={goPrev}
        disabled={index === 0}
        className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all duration-150 disabled:opacity-20 disabled:cursor-default z-10"
        aria-label="Concepto anterior"
      >
        <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
      </button>
      <button
        onClick={goNext}
        disabled={index === total - 1}
        className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all duration-150 disabled:opacity-20 disabled:cursor-default z-10"
        aria-label="Siguiente concepto"
      >
        <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
      </button>

      {/* SR-only live region — announces slide content on change */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {current.label} — {masteryLabel(mc)} {masteryPercent(current.mastery)}.
        {current.definition ? ` ${current.definition}` : ' Sin definición disponible.'}
      </div>

      {/* Card with slide animation */}
      <div className="w-full max-w-lg px-4 sm:px-0">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="rounded-2xl shadow-2xl p-6 sm:p-8"
            style={{ backgroundColor: MASTERY_HEX_LIGHT[mc] }}
          >
            {/* Mastery header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: MASTERY_HEX[mc] }} aria-hidden="true" />
              <span className="font-sans font-medium" style={{ fontSize: fs.mastery, color: MASTERY_HEX[mc] }}>
                {masteryLabel(mc)}
              </span>
              <span className="font-sans text-gray-400 ml-auto" style={{ fontSize: fs.mastery }}>
                {masteryPercent(current.mastery)}
              </span>
            </div>

            {/* Mastery progress strip */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full mb-5 overflow-hidden" role="progressbar" aria-label="Nivel de dominio" aria-valuenow={current.mastery >= 0 ? Math.round(current.mastery * 100) : 0} aria-valuemin={0} aria-valuemax={100}>
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: MASTERY_HEX[mc] }}
                initial={{ width: 0 }}
                animate={{ width: current.mastery >= 0 ? `${Math.round(current.mastery * 100)}%` : '0%' }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>

            {/* Node type badge */}
            {current.type !== 'keyword' && (
              <span className="inline-block px-2 py-0.5 rounded-full font-sans font-medium mb-3" style={{ fontSize: fs.mastery, backgroundColor: colors.primary[50], color: colors.primary[500] }}>
                {current.type === 'topic' ? 'Tema' : 'Subtema'}
              </span>
            )}

            {/* Keyword name */}
            <h2 className="text-gray-900 mb-3 leading-tight" style={{ fontFamily: 'Georgia, serif', fontSize: fs.label, fontWeight: 600 }}>
              {current.label}
            </h2>

            {/* Definition */}
            {current.definition ? (
              <p className="text-gray-600 leading-relaxed font-sans" style={{ fontSize: fs.definition }}>
                {current.definition}
              </p>
            ) : (
              <p className="text-gray-400 italic font-sans" style={{ fontSize: fs.definition }}>
                Sin definici{'\u00f3'}n disponible
              </p>
            )}

            {/* Annotation */}
            {current.annotation && (
              <p className="mt-3 italic font-sans" style={{ fontSize: fs.mastery, color: colors.primary[500] }}>
                &ldquo;{current.annotation}&rdquo;
              </p>
            )}

            {/* Study resource counts */}
            {(current.flashcardCount || current.quizCount) ? (
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100 font-sans text-gray-400" style={{ fontSize: fs.mastery }}>
                {current.flashcardCount ? <span>{current.flashcardCount} tarjetas</span> : null}
                {current.quizCount ? <span>{current.quizCount} preguntas</span> : null}
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10" role="progressbar" aria-label={`Progreso de presentación: ${index + 1} de ${total}`} aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={total}>
        <motion.div className="h-full" style={{ backgroundColor: colors.primary[500] }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.3, ease: 'easeOut' }} />
      </div>

      {/* Bottom hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/30 font-sans text-center" style={{ fontSize: fs.mastery }}>
        <span className="hidden sm:inline">Flechas izquierda/derecha para navegar &middot; Escape para salir</span>
        <span className="sm:hidden">Toca las flechas para navegar</span>
      </div>
    </motion.div>
  );
}
