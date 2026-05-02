// ============================================================
// Axon — ArrowTypePicker
//
// Roving-tabindex radiogroup for selecting the arrow head shape
// of a directed edge. Extracted from AddNodeEdgeModal (cycle #61).
//
// Behavior preserved verbatim from the original inline body:
//   - 4 arrow types in this order: triangle → diamond → circle → vee
//   - ArrowRight / ArrowDown → next (wraps to first)
//   - ArrowLeft / ArrowUp → prev (wraps to last)
//   - preventDefault on arrow keys (avoids page scroll)
//   - Focus moves to the newly-selected button via
//     `e.currentTarget.children[idx]?.focus()` — this REQUIRES
//     the radiogroup div to remain the direct parent of the
//     four <button> radios (no fragment / wrapper insertion).
//   - Roving tabindex: only the active option is in the tab order.
//   - aria-checked + aria-label per option.
//   - SVG previews per type (triangle / diamond / circle / vee)
//     with byte-identical paths and stroke specs.
// ============================================================

import type { EdgeArrowType } from '@/app/types/mindmap';

// ── Types ───────────────────────────────────────────────────

export interface ArrowTypePickerProps {
  value: EdgeArrowType;
  onChange: (next: EdgeArrowType) => void;
  /** aria-label for the surrounding radiogroup. */
  groupLabel: string;
  /** Visible field-label rendered above the picker. */
  fieldLabel: string;
  /** Per-option i18n labels (used as aria-label and visible caption). */
  optionLabels: {
    triangle: string;
    diamond: string;
    circle: string;
    vee: string;
  };
}

// Stable (module-level) tuple so identity doesn't churn on re-render.
const ARROW_TYPES = ['triangle', 'diamond', 'circle', 'vee'] as const;

// ── Component ───────────────────────────────────────────────

export function ArrowTypePicker({
  value,
  onChange,
  groupLabel,
  fieldLabel,
  optionLabels,
}: ArrowTypePickerProps): JSX.Element {
  const options = [
    { type: 'triangle' as const, label: optionLabels.triangle },
    { type: 'diamond' as const, label: optionLabels.diamond },
    { type: 'circle' as const, label: optionLabels.circle },
    { type: 'vee' as const, label: optionLabels.vee },
  ];

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {fieldLabel}
      </label>
      <div
        className="flex gap-1.5"
        role="radiogroup"
        aria-label={groupLabel}
        onKeyDown={(e) => {
          const types = ARROW_TYPES;
          const idx = types.indexOf(value);
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            onChange(types[(idx + 1) % types.length]);
            (e.currentTarget.children[(idx + 1) % types.length] as HTMLElement)?.focus();
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            onChange(types[(idx - 1 + types.length) % types.length]);
            (e.currentTarget.children[(idx - 1 + types.length) % types.length] as HTMLElement)?.focus();
          }
        }}
      >
        {options.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            tabIndex={value === type ? 0 : -1}
            className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-lg border text-[10px] transition-colors ${
              value === type
                ? 'border-ax-primary-500 bg-ax-primary-50 text-ax-primary-500 font-medium'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
            role="radio"
            aria-checked={value === type}
            aria-label={label}
          >
            <svg width="28" height="14" viewBox="0 0 28 14" className="flex-shrink-0">
              <line x1="0" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="1.5" />
              {type === 'triangle' && (
                <polygon points="18,3 28,7 18,11" fill="currentColor" />
              )}
              {type === 'diamond' && (
                <polygon points="18,7 23,3 28,7 23,11" fill="currentColor" />
              )}
              {type === 'circle' && (
                <circle cx="23" cy="7" r="4" fill="currentColor" />
              )}
              {type === 'vee' && (
                <polyline points="18,3 28,7 18,11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              )}
            </svg>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
