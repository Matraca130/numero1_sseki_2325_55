// ============================================================
// MasteryRing -- Shared SVG mastery ring with completion state
//
// Consolidated from:
//   - ProgressRing.tsx  (simple pct 0-100, Tailwind color class)
//   - FlashcardDeckList.tsx inline MasteryRing (value 0-1, hex, checkmark)
//
// This is the SUPERSET: supports both APIs.
//   - value: 0-1 (preferred) OR pct: 0-100 (compat)
//   - color: hex string (preferred) OR Tailwind class via colorClass
//   - Shows CheckCircle2 icon when value >= 1 (100%)
//
// STANDALONE: depends on react, motion/react, lucide-react.
//
// PHASE 6: Default color changed from '#14b8a6' to MASTERY_HEX_SCALE[0]
//   (slate = mastery 0, imported from mastery-colors.ts)
// ============================================================

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { MASTERY_HEX_SCALE } from './mastery-colors';

export interface MasteryRingProps {
  /** Mastery value 0-1 (takes priority over pct) */
  value?: number;
  /** Mastery percentage 0-100 (compat with old ProgressRing API) */
  pct?: number;
  /** Ring diameter in px */
  size?: number;
  /** Stroke width in px */
  stroke?: number;
  /** Hex color for the ring. Defaults to slate (mastery 0). */
  color?: string;
  /** Tailwind text-color class (compat with old ProgressRing API, e.g. 'text-teal-500') */
  colorClass?: string;
}

export function MasteryRing({
  value,
  pct,
  size = 44,
  stroke = 3.5,
  color = MASTERY_HEX_SCALE[0],
  colorClass,
}: MasteryRingProps) {
  const shouldReduce = useReducedMotion();

  // Normalize to 0-1
  const normalized = value !== undefined ? value : pct !== undefined ? pct / 100 : 0;
  const clamped = Math.max(0, Math.min(1, normalized));

  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;

  // Use Tailwind class via currentColor if provided, otherwise inline hex
  const strokeColor = colorClass ? 'currentColor' : clamped >= 1 ? '#10b981' : color;

  return (
    <div className={`relative ${colorClass || ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e4e4e7"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={
            shouldReduce
              ? { strokeDashoffset: circ * (1 - clamped) }
              : { strokeDashoffset: circ }
          }
          animate={{ strokeDashoffset: circ * (1 - clamped) }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {clamped >= 1 ? (
          <motion.div
            initial={shouldReduce ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.8 }}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </motion.div>
        ) : (
          <span className="text-[10px] text-zinc-600" style={{ fontWeight: 700 }}>
            {Math.round(clamped * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
