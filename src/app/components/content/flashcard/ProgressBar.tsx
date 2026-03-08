// ============================================================
// ProgressBar -- Shared animated progress bar
//
// Unified from FlashcardHero (dark mode) + FlashcardDeckList.
// STANDALONE: only depends on react + motion/react.
//
// PHASE 6: Default color changed from 'bg-teal-500' to 'bg-zinc-400'
//   (neutral generic — this is a shared primitive, not mastery-specific)
// ============================================================

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

export interface ProgressBarProps {
  /** Progress value 0-1 */
  value: number;
  /** Tailwind background class for the filled portion. Defaults to neutral gray. */
  color?: string;
  /** Extra classes on the track container */
  className?: string;
  /** Animate from 0 on mount */
  animated?: boolean;
  /** Use translucent white track (for dark / frosted-glass backgrounds) */
  dark?: boolean;
}

export function ProgressBar({
  value,
  color = 'bg-zinc-400',
  className = '',
  animated = false,
  dark = false,
}: ProgressBarProps) {
  const shouldReduce = useReducedMotion();
  return (
    <div
      className={`h-2 ${dark ? 'bg-white/10' : 'bg-zinc-200'} rounded-full overflow-hidden ${className}`}
    >
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={animated && !shouldReduce ? { width: 0 } : false}
        animate={{ width: `${Math.max(value * 100, 0)}%` }}
        transition={
          animated && !shouldReduce
            ? { duration: 1, ease: 'easeOut', delay: 0.3 }
            : { duration: shouldReduce ? 0 : 0.4 }
        }
      />
    </div>
  );
}