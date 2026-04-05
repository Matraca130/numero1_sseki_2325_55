// ============================================================
// Axon — MasteryBar
//
// Visual indicator for block-level mastery. Renders a colored
// bar (rounded-full) whose color maps to the Delta Mastery Scale
// defined in the design system (design-system/mastery.ts).
//
// Levels:
//   Por descubrir (gray)  — delta < 0.5
//   Emergente     (red)   — 0.5 ≤ delta < 0.85
//   En progreso   (amber) — 0.85 ≤ delta < 1.0
//   Consolidado   (green) — delta = 1.0
//   Maestría      (blue)  — delta > 1.0
// ============================================================

// All mastery tokens and helpers now live in design-system/mastery.ts.
// This file re-exports them for backward compatibility, and defines
// only the MasteryBar React component.
import {
  getMasteryInfo,
  getMasteryStyle,
  MASTERY_LIGHT,
  MASTERY_DARK,
} from '@/app/design-system/mastery';
import type { MasteryColorSet } from '@/app/design-system/mastery';

// Re-export for any consumers still importing from this file
export { getMasteryInfo, getMasteryStyle, MASTERY_LIGHT, MASTERY_DARK };
export type { MasteryColorSet };

// ── Types ────────────────────────────────────────────────────

interface MasteryBarProps {
  level: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

// ── Component ────────────────────────────────────────────────

export function MasteryBar({ level, showLabel = false, size = 'sm' }: MasteryBarProps) {
  const { color, label } = getMasteryInfo(level);
  const heightClass = size === 'sm' ? 'h-1' : 'h-1.5';

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-full rounded-full ${heightClass}`}
        role="meter"
        aria-label={`Dominio: ${label}`}
        aria-valuenow={Math.max(0, Math.min(Math.round(level * 100), 100))}
        aria-valuemin={0}
        aria-valuemax={100}
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
