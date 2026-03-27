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

// ── Helpers ──────────────────────────────────────────────────

interface MasteryInfo {
  color: string;
  label: string;
}

function getMasteryInfo(level: number): MasteryInfo {
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
