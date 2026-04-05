/**
 * @module @axon/design-system/mastery
 *
 * Mastery color tokens and helper functions for the Delta Mastery Scale.
 * Extracted from MasteryBar.tsx to break the circular dependency:
 *   design-system/index.ts → MasteryBar → design-system/colors → index.ts
 *
 * Now the dependency flows one way:
 *   design-system/index.ts → mastery.ts → colors.ts  (no cycle)
 *   MasteryBar.tsx → mastery.ts → colors.ts           (no cycle)
 */
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
  blue:   { bg: "#eff6ff", border: colors.mastery.maestria,    text: "#1d4ed8", label: "Maestria" },
};

export const MASTERY_DARK: Record<string, MasteryColorSet> = {
  gray:   { bg: "#27272a", border: colors.mastery.descubrir,   text: "#a1a1aa", label: "Por descubrir" },
  red:    { bg: "#2a1215", border: colors.mastery.emergente,   text: "#fca5a5", label: "Emergente" },
  yellow: { bg: "#2a2010", border: colors.mastery.enProgreso,  text: "#fcd34d", label: "En progreso" },
  green:  { bg: "#0f2a1d", border: colors.mastery.consolidado, text: "#6ee7b7", label: "Consolidado" },
  blue:   { bg: "#0f1a2e", border: colors.mastery.maestria,    text: "#93c5fd", label: "Maestria" },
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

interface MasteryInfo {
  color: string;
  label: string;
}

export function getMasteryInfo(level: number): MasteryInfo {
  if (level > 1.0) return { color: colors.mastery.maestria, label: 'Maestria' };
  if (level === 1.0) return { color: colors.mastery.consolidado, label: 'Consolidado' };
  if (level >= 0.85) return { color: colors.mastery.enProgreso, label: 'En progreso' };
  if (level >= 0.5) return { color: colors.mastery.emergente, label: 'Emergente' };
  return { color: colors.mastery.descubrir, label: 'Por descubrir' };
}
