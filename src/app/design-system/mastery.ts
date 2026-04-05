// ============================================================
// Axon — Design System: Mastery Tokens & Helpers
//
// Canonical 5-level Delta Mastery Scale visual tokens.
// Extracted from MasteryBar.tsx so the design-system barrel
// never imports from a component file (avoids cross-chunk
// circular initialization issues with Vite code-splitting).
//
// Levels:
//   Por descubrir (gray)  — delta < 0.5
//   Emergente     (red)   — 0.5 ≤ delta < 0.85
//   En progreso   (amber) — 0.85 ≤ delta < 1.0
//   Consolidado   (green) — delta = 1.0
//   Maestría      (blue)  — delta > 1.0
// ============================================================

import { colors } from './colors';

// ── Types ────────────────────────────────────────────────────

export interface MasteryColorSet {
  bg: string;
  border: string;
  text: string;
  label: string;
}

// ── Mastery color tokens (light & dark) ─────────────────────

export const MASTERY_LIGHT: Record<string, MasteryColorSet> = {
  gray:   { bg: "#f4f4f5", border: colors.mastery.descubrir,   text: "#52525b", label: "Por descubrir" },
  red:    { bg: "#fef2f2", border: colors.mastery.emergente,   text: "#b91c1c", label: "Emergente" },
  yellow: { bg: "#fffbeb", border: colors.mastery.enProgreso,  text: "#92400e", label: "En progreso" },
  green:  { bg: "#f0fdf4", border: colors.mastery.consolidado, text: "#065f46", label: "Consolidado" },
  blue:   { bg: "#eff6ff", border: colors.mastery.maestria,    text: "#1d4ed8", label: "Maestría" },
};

export const MASTERY_DARK: Record<string, MasteryColorSet> = {
  gray:   { bg: "#27272a", border: colors.mastery.descubrir,   text: "#a1a1aa", label: "Por descubrir" },
  red:    { bg: "#2a1215", border: colors.mastery.emergente,   text: "#fca5a5", label: "Emergente" },
  yellow: { bg: "#2a2010", border: colors.mastery.enProgreso,  text: "#fcd34d", label: "En progreso" },
  green:  { bg: "#0f2a1d", border: colors.mastery.consolidado, text: "#6ee7b7", label: "Consolidado" },
  blue:   { bg: "#0f1a2e", border: colors.mastery.maestria,    text: "#93c5fd", label: "Maestría" },
};

/**
 * Returns the mastery color set for a given level and theme.
 */
export function getMasteryStyle(level: number, dark: boolean): MasteryColorSet {
  const m = dark ? MASTERY_DARK : MASTERY_LIGHT;
  if (level >= 1.1) return m.blue;
  if (level >= 1.0) return m.green;
  if (level >= 0.85) return m.yellow;
  if (level >= 0.5) return m.red;
  return m.gray;
}

/**
 * Returns a simple { color, label } for a mastery level.
 */
export function getMasteryInfo(level: number): { color: string; label: string } {
  if (level > 1.0) return { color: colors.mastery.maestria, label: 'Maestría' };
  if (level === 1.0) return { color: colors.mastery.consolidado, label: 'Consolidado' };
  if (level >= 0.85) return { color: colors.mastery.enProgreso, label: 'En progreso' };
  if (level >= 0.5) return { color: colors.mastery.emergente, label: 'Emergente' };
  return { color: colors.mastery.descubrir, label: 'Por descubrir' };
}
