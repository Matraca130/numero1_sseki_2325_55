// ============================================================
// Axon — Unified Color Palette (D-07 AUDIT FIX)
//
// SINGLE SOURCE OF TRUTH for the Axon Medical Academy palette.
// Previously duplicated in 7+ files with inconsistencies
// (e.g. amberBg was '#fef9ee' in design-kit but '#fef3c7'
// in TopicSessionGrid).
//
// Import anywhere:
//   import { axon, tint } from '@/app/lib/palette';
//
// Rules:
//   - NEVER re-declare these colors locally.
//   - If you need a new color, ADD IT HERE.
//   - design-kit.tsx values are canonical (kept in sync).
// ============================================================

/** Core Axon brand palette — dark teal family */
export const axon = {
  darkTeal:      '#1B3B36',
  tealAccent:    '#2a8c7a',
  hoverTeal:     '#244e47',
  darkPanel:     '#1a2e2a',
  pageBg:        '#F0F2F5',
  cardBg:        '#FFFFFF',
  progressStart: '#2dd4a8',
  progressEnd:   '#0d9488',
  progressLabel: '#5cbdaa',
  sidebarText:   '#8fbfb3',
  sidebarSub:    '#6db5a5',
} as const;

/** Derived tints — light variants of Axon palette */
export const tint = {
  // Teal tints (mastered / active states)
  tealBg:        '#e8f5f1',
  tealBorder:    '#b3ddd2',
  tealSoft:      '#d1f0e7',
  // Amber tints (in-progress — canonical from design-kit)
  amberBg:       '#fef9ee',
  amberBorder:   '#fde68a',
  amberText:     '#b45309',
  amberIcon:     '#d97706',
  // Success (completion)
  successBg:     '#d1fae5',
  successBorder: '#6ee7b7',
  successText:   '#047857',
  successAccent: '#10b981',
  // Neutral
  neutralBg:     '#f8f9fa',
  neutralBorder: '#e5e7eb',
  neutralText:   '#9ca3af',
  subtitleText:  '#6b7280',
} as const;

/**
 * Layout constants — page dimensions.
 * A4 paper: 210mm × 297mm (794px × 1123px at 96 DPI).
 * Used as max-width for StudyHub containers to give
 * a familiar document-like reading experience.
 */
export const layout = {
  /** A4 width as CSS value — use in Tailwind: max-w-[210mm] */
  a4Width: '210mm',
  /** A4 width in pixels (at 96 DPI) */
  a4WidthPx: 794,
  /** A4 height as CSS value */
  a4Height: '297mm',
} as const;
