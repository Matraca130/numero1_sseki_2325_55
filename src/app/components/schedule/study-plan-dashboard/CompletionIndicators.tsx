/**
 * CompletionIndicators — Visual components for task cards.
 * CompletionCircle (SVG ring), MethodTag, DurationPill.
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock } from 'lucide-react';
import clsx from 'clsx';
import { METHOD_ICONS, METHOD_LABELS, METHOD_COLORS, METHOD_PILL, type MethodPillStyle } from '@/app/utils/studyMethodStyles';
import { gradients } from '@/app/design-system';

/**
 * Figma-accurate variant of METHOD_PILL used by task cards.
 * Identical to the shared METHOD_PILL except:
 *   - quiz.bg uses the methodQuiz gradient (instead of solid hex)
 *   - adds iconStroke (derived from text) for explicit icon coloring
 * Built by extending the shared palette — no duplicated hex literals.
 */
type MethodTagFigmaStyle = MethodPillStyle & { iconStroke: string };

const withIconStroke = (style: MethodPillStyle): MethodTagFigmaStyle => ({
  ...style,
  iconStroke: style.text,
});

export const METHOD_TAG_FIGMA: Record<string, MethodTagFigmaStyle> = {
  flashcard: withIconStroke(METHOD_PILL.flashcard),
  quiz: { ...withIconStroke(METHOD_PILL.quiz), bg: gradients.methodQuiz.css },
  video: withIconStroke(METHOD_PILL.video),
  resumo: withIconStroke(METHOD_PILL.resumo),
  '3d': withIconStroke(METHOD_PILL['3d']),
};

export function CompletionCircle({ completed, onClick }: { completed: boolean; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      className="relative shrink-0 w-[28px] h-[28px] flex items-center justify-center rounded-full"
      aria-label={completed ? 'Marcar incompleto' : 'Marcar completo'}
    >
      <svg viewBox="0 0 22 22" width="22" height="22" fill="none">
        <motion.circle
          cx="11" cy="11" r="9.5"
          stroke={completed ? '#34D399' : '#DFE2E8'}
          strokeWidth="1.5"
          fill={completed ? '#34D399' : 'none'}
          initial={false}
          animate={{ stroke: completed ? '#34D399' : '#DFE2E8', fill: completed ? '#34D399' : 'none' }}
          transition={{ duration: 0.25 }}
        />
        <AnimatePresence>
          {completed && (
            <motion.path
              d="M7 11L10 14L15 8"
              stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              exit={{ pathLength: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>
      </svg>
    </motion.button>
  );
}

export function MethodTag({ method }: { method: string }) {
  const key = method?.toLowerCase?.() ?? '';
  const style = METHOD_TAG_FIGMA[key];
  const icon = METHOD_ICONS[key] || METHOD_ICONS[method];

  if (!style) {
    return (
      <span className={clsx('text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 shrink-0', METHOD_COLORS[method] || 'bg-gray-100 text-gray-600 border-gray-200')}>
        {icon}
        <span>{METHOD_LABELS[method] || method}</span>
      </span>
    );
  }

  const isGradient = style.bg.startsWith('linear');
  return (
    <span
      className="text-[10px] px-2.5 py-0.5 rounded-full border font-medium flex items-center gap-1.5 shrink-0 relative"
      style={{ background: isGradient ? style.bg : style.bg, borderColor: style.border, color: style.text }}
    >
      <span style={{ color: style.iconStroke, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span>{METHOD_LABELS[method] || method}</span>
    </span>
  );
}

export function DurationPill({ minutes, completed }: { minutes: number; completed: boolean }) {
  return (
    <div className={clsx(
      'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium',
      completed ? 'bg-[rgba(248,249,251,0.8)] opacity-60' : 'bg-[#f5f6f8]',
    )}>
      <Clock size={10} className={completed ? 'text-[#c0c6d0]' : 'text-[#9ba3b2]'} />
      <span className={clsx('font-medium', completed ? 'line-through text-[#c0c6d0]' : 'text-[#9ba3b2]')}>
        {minutes}m
      </span>
    </div>
  );
}
