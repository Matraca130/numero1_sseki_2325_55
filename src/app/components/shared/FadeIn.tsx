// ============================================================
// Axon — FadeIn Animation Wrapper + Motion Presets
//
// IMPORT: import { FadeIn, STAGGER_DELAY } from '@/app/components/shared/FadeIn';
// IMPORT: import { useMotionPresets } from '@/app/components/shared/FadeIn';
//
// Usage:
//   <FadeIn>content</FadeIn>
//   <FadeIn delay={0.1}>staggered content</FadeIn>
//   <FadeIn direction="left">slide from left</FadeIn>
//
// useMotionPresets() returns { fadeUp, cardHover, springPop }
// — all values read from animation.ts (single source of truth).
// — respects prefers-reduced-motion automatically.
//
// Previously duplicated in OwnerDashboardPage and OwnerMembersPage.
// ============================================================

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { animation } from '@/app/design-system';

// ── Directional offsets (read canonical y from animation.ts) ─────────

const Y_OFFSET = animation.fadeUp.initial.y;   // 12

const OFFSET: Record<string, { x: number; y: number }> = {
  up:    { x: 0,   y: Y_OFFSET },
  down:  { x: 0,   y: -Y_OFFSET },
  left:  { x: Y_OFFSET,  y: 0 },
  right: { x: -Y_OFFSET, y: 0 },
  none:  { x: 0,   y: 0 },
};

// ── Stagger constant (canonical from animation.ts) ───────────────────

export const STAGGER_DELAY = animation.fadeUp.staggerDelay;  // 0.06

// ── FadeIn component ─────────────────────────────────────────────────

interface FadeInProps {
  children: React.ReactNode;
  /** Delay in seconds (default: 0) */
  delay?: number;
  /** Direction to animate from (default: 'up') */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /** Animation duration in seconds (default: from animation.ts) */
  duration?: number;
  /** Extra className on wrapper div */
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  direction = 'up',
  duration = animation.fadeUp.duration,
  className = '',
}: FadeInProps) {
  const shouldReduce = useReducedMotion();
  const offset = OFFSET[direction];

  return (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0, x: offset.x, y: offset.y }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── useMotionPresets hook ────────────────────────────────────────────
//
// Returns pre-built motion props that read from animation.ts tokens.
// Automatically disables all animation when prefers-reduced-motion is on.
//
// Usage:
//   const { fadeUp, cardHover, springPop } = useMotionPresets();
//   <motion.div {...fadeUp(0.1)} whileHover={cardHover}>
//   <motion.span {...springPop(0.3)}>

export function useMotionPresets() {
  const shouldReduce = useReducedMotion();

  const fadeUp = (delay: number = 0) =>
    shouldReduce
      ? {}
      : {
          initial: animation.fadeUp.initial,
          animate: animation.fadeUp.animate,
          transition: { duration: animation.fadeUp.duration, delay, ease: 'easeOut' as const },
        };

  const cardHover = shouldReduce ? undefined : animation.cardHover.whileHover;

  const springPop = (delay: number = 0) =>
    shouldReduce
      ? {}
      : {
          initial: animation.springPop.initial,
          animate: animation.springPop.animate,
          transition: { ...animation.springPop.spring, delay },
        };

  return { fadeUp, cardHover, springPop } as const;
}
