// ============================================================
// Axon — MasteryBar
//
// Visual indicator for block-level mastery. Renders a colored
// bar (rounded-full) whose color maps to the Delta Mastery Scale
// defined in the design system (colors.mastery).
//
// Levels:
//   Por descubrir (gray)  — level < 0.5
//   Emergente     (red)   — 0.5 ≤ level < 0.85
//   En progreso   (amber) — 0.85 ≤ level < 1.0
//   Consolidado   (green) — level = 1.0
//   Maestría      (blue)  — level > 1.0
// ============================================================

import { colors } from '@/app/design-system';

// ── Types ────────────────────────────────────────────────────

interface MasteryBarProps {
  level: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

// ── Mastery color tokens (light & dark) ─────────────────────

export interface MasteryColorSet {
  bg: string;
  border: string;
  text: string;
  label: string;
}

export const MASTERY_LIGHT: Record<string, MasteryColorSet> = {
  gray:   { bg: "#f4f4f5", border: "#a1a1aa", text: "#52525b", label: "Por descubrir" },
  red:    { bg: "#fef2f2", border: "#ef4444", text: "#b91c1c", label: "Emergente" },
  yellow: { bg: "#fffbeb", border: "#f59e0b", text: "#92400e", label: "En progreso" },
  green:  { bg: "#f0fdf4", border: "#10b981", text: "#065f46", label: "Consolidado" },
  blue:   { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8", label: "Maestría" },
};

export const MASTERY_DARK: Record<string, MasteryColorSet> = {
  gray:   { bg: "#27272a", border: "#71717a", text: "#a1a1aa", label: "Por descubrir" },
  red:    { bg: "#2a1215", border: "#ef4444", text: "#fca5a5", label: "Emergente" },
  yellow: { bg: "#2a2010", border: "#f59e0b", text: "#fcd34d", label: "En progreso" },
  green:  { bg: "#0f2a1d", border: "#10b981", text: "#6ee7b7", label: "Consolidado" },
  blue:   { bg: "#0f1a2e", border: "#3b82f6", text: "#93c5fd", label: "Maestría" },
};

/**
 * Returns the mastery color set for a given level and theme.
 * Matches the prototype's getMasteryStyle() (PROTOTYPE.jsx:35-42).
 */
export function getMasteryStyle(level: number, dark: boolean): MasteryColorSet {
  const m = dark ? MASTERY_DARK : MASTERY_LIGHT;
  if (level >= 1.1) return m.blue;
  if (level >= 1.0) return m.green;
  if (level >= 0.85) return m.yellow;
  if (level >= 0.5) return m.red;
  return m.gray;
}

// ── Helpers ──────────────────────────────────────────────────

interface MasteryInfo {
  color: string;
  label: string;
}

export function getMasteryInfo(level: number): MasteryInfo {
  if (level > 1.0) return { color: colors.mastery.maestria, label: 'Maestría' };
  if (level === 1.0) return { color: colors.mastery.consolidado, label: 'Consolidado' };
  if (level >= 0.85) return { color: colors.mastery.enProgreso, label: 'En progreso' };
  if (level >= 0.5) return { color: colors.mastery.emergente, label: 'Emergente' };
  return { color: colors.mastery.descubrir, label: 'Por descubrir' };
}

// ── Component ────────────────────────────────────────────────

export function MasteryBar({ level, showLabel = false, size = 'sm' }: MasteryBarProps) {
  const { color, label } = getMasteryInfo(level);
  const heightClass = size === 'sm' ? 'h-1' : 'h-1.5';

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-full rounded-full ${heightClass}`}
        style={{
          backgroundColor: color,
          transition: 'background-color 300ms ease',
        }}
      />
      {showLabel && (
        <span
          className="whitespace-nowrap font-sans"
          style={{
            color,
            fontSize: '0.75rem',
            lineHeight: '1rem',
            transition: 'color 300ms ease',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
