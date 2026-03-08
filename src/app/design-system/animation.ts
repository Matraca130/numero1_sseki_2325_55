/**
 * @module @axon/design-system/animation
 * @version 1.0.0
 *
 * Presets de animacion para Motion (ex Framer Motion):
 * transiciones de pagina, entrada de cards, progress bars,
 * sidebar toggle y dropdowns.
 *
 * Standalone:  import { animation } from '@/app/design-system/animation';
 * Barrel:      import { animation } from '@/app/design-system';
 */

// ─────────────────────────────────────────────
// ANIMATION TOKENS
// ─────────────────────────────────────────────

export const animation = {
  pageTransition: {
    initial:  { opacity: 0, y: 10 },
    animate:  { opacity: 1, y: 0 },
    duration: 0.2,
  },
  cardEntrance: {
    initial:  { opacity: 0, y: 10 },
    animate:  { opacity: 1, y: 0 },
    staggerDelay: 0.1,
  },
  progressBar: {
    initial:  { width: 0 },
    duration: 1,
  },
  sidebar: {
    initial: { width: 260 },
    collapsed: { width: 0 },
  },
  dropdown: {
    initial:  { opacity: 0, y: 8, scale: 0.96 },
    animate:  { opacity: 1, y: 0, scale: 1 },
    exit:     { opacity: 0, y: 8, scale: 0.96 },
    duration: 0.15,
    ease:     'easeOut',
  },

  // ── Tokens used by FadeIn.tsx / useMotionPresets ──────────
  // Values sourced from axonoficialll (canonical Axon)
  fadeUp: {
    initial:      { opacity: 0, y: 12 },
    animate:      { opacity: 1, y: 0 },
    duration:     0.35,
    staggerDelay: 0.06,
  },
  cardHover: {
    whileHover: { y: -4, transition: { duration: 0.2 } },
  },
  springPop: {
    initial:  { scale: 0, opacity: 0 },
    animate:  { scale: 1, opacity: 1 },
    spring:   { type: 'spring', stiffness: 300, damping: 20 },
  },
} as const;
