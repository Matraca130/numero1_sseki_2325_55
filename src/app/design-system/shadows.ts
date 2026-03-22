/**
 * @module @axon/design-system/shadows
 * @version 1.0.0
 *
 * Niveles de sombra: cards, hovers, charts, dropdowns, tooltips.
 * Sin glassmorphism — siempre sombras suaves y solidas.
 *
 * Standalone:  import { shadows } from '@/app/design-system/shadows';
 * Barrel:      import { shadows } from '@/app/design-system';
 */

// ─────────────────────────────────────────────
// SHADOW TOKENS
// ─────────────────────────────────────────────

export const shadows = {
  /** Resting card — warm, barely visible (premium ivory-tinted) */
  card:        'shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]',
  /** Hover state — subtle lift with warm spread */
  cardHover:   'shadow-[0_4px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]',
  /** Elevated card — KPI, chart containers */
  cardElevated: 'shadow-[0_2px_8px_rgba(0,0,0,0.04),0_0_1px_rgba(0,0,0,0.04)]',
  /** Chart wrappers */
  chart:       'shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
  /** High-prominence: performance cards, hero sections */
  performance: 'shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)]',
  /** Floating elements: dropdowns, popovers */
  dropdown:    'shadow-[0_12px_36px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.06)]',
  /** Tooltips */
  tooltip:     'shadow-[0_4px_12px_rgba(0,0,0,0.1)]',
  /** Modal overlay */
  modal:       'shadow-[0_20px_60px_rgba(0,0,0,0.15),0_8px_20px_rgba(0,0,0,0.08)]',
} as const;
