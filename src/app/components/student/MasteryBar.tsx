// ============================================================
// Axon — MasteryBar
//
// Visual indicator for block-level mastery. Renders a colored
// bar (rounded-full) whose color maps to the Delta Mastery Scale
// defined in the design system (design-system/mastery.ts).
//
// Levels:
//   Por descubrir (gray)  — level < 0.5
//   Emergente     (red)   — 0.5 ≤ level < 0.85
//   En progreso   (amber) — 0.85 ≤ level < 1.0
//   Consolidado   (green) — level = 1.0
//   Maestria      (blue)  — level > 1.0
// ============================================================

// All mastery tokens and helpers now live in design-system/mastery.ts
// to avoid circular dependencies. Re-export for backward compatibility.
export {
  MASTERY_LIGHT,
  MASTERY_DARK,
  getMasteryStyle,
  getMasteryInfo,
} from '@/app/design-system/mastery';
export type { MasteryColorSet } from '@/app/design-system/mastery';

import { getMasteryInfo } from '@/app/design-system/mastery';

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
