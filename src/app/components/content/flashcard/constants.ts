// ============================================================
// Flashcard Module \u2014 Shared Constants
//
// Single source of truth for repeated values across the module.
// Import from: '@/app/components/content/flashcard/constants'
// ============================================================

/** Accessible focus ring class used on interactive elements */
export const focusRing =
  'focus-visible:ring-2 focus-visible:ring-[#2a8c7a] focus-visible:outline-none';

/** Responsive grid for card thumbnails (used in DeckScreen flat + grouped views) */
export const CARD_GRID_CLASSES =
  'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3';

/** Accent colors for card groups (keyword/summary clusters) */
export const GROUP_COLORS = [
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#ef4444', // red
  '#06b6d4', // cyan
  '#84cc16', // lime
] as const;
