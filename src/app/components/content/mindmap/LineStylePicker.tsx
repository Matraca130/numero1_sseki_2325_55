// ============================================================
// Axon — LineStylePicker
//
// Roving-tabindex radiogroup for selecting the line-style of an
// edge (solid / dashed / dotted). Extracted from AddNodeEdgeModal
// (cycle #62) — sister pattern to cycle 61's ArrowTypePicker.
//
// Behavior preserved verbatim from the original inline body:
//   - 3 line styles in this order: solid → dashed → dotted
//   - ArrowRight / ArrowDown → next (wraps to first)
//   - ArrowLeft / ArrowUp → prev (wraps to last)
//   - preventDefault on arrow keys (avoids page scroll)
//   - Focus moves to the newly-selected button via
//     `e.currentTarget.children[idx]?.focus()` — this REQUIRES
//     the radiogroup div to remain the direct parent of the
//     three <button> radios (no fragment / wrapper insertion).
//   - Roving tabindex: only the active option is in the tab order.
//   - aria-checked + aria-label per option.
//   - SVG line previews per style with byte-identical
//     strokeDasharray ('4,3' dashed, '1,3' dotted, undefined solid).
// ============================================================

import type { EdgeLineStyle } from '@/app/types/mindmap';

// ── Types ───────────────────────────────────────────────────

export interface LineStylePickerProps {
  value: EdgeLineStyle;
  onChange: (next: EdgeLineStyle) => void;
  /** aria-label for the surrounding radiogroup. */
  groupLabel: string;
  /** Visible field-label rendered above the picker. */
  fieldLabel: string;
  /** Per-option i18n labels (used as aria-label per radio). */
  optionLabels: {
    solid: string;
    dashed: string;
    dotted: string;
  };
}

// Stable (module-level) tuple so identity doesn't churn on re-render.
const LINE_STYLES = ['solid', 'dashed', 'dotted'] as const;

// ── Component ───────────────────────────────────────────────

export function LineStylePicker({
  value,
  onChange,
  groupLabel,
  fieldLabel,
  optionLabels,
}: LineStylePickerProps): JSX.Element {
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
          const styles = LINE_STYLES;
          const idx = styles.indexOf(value);
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            onChange(styles[(idx + 1) % styles.length]);
            (e.currentTarget.children[(idx + 1) % styles.length] as HTMLElement)?.focus();
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            onChange(styles[(idx - 1 + styles.length) % styles.length]);
            (e.currentTarget.children[(idx - 1 + styles.length) % styles.length] as HTMLElement)?.focus();
          }
        }}
      >
        {LINE_STYLES.map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => onChange(style)}
            tabIndex={value === style ? 0 : -1}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-xs transition-colors ${
              value === style
                ? 'border-ax-primary-500 bg-ax-primary-50 text-ax-primary-500 font-medium'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
            role="radio"
            aria-checked={value === style}
            aria-label={style === 'solid' ? optionLabels.solid : style === 'dashed' ? optionLabels.dashed : optionLabels.dotted}
          >
            <svg width="24" height="2" className="flex-shrink-0">
              <line
                x1="0" y1="1" x2="24" y2="1"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={style === 'dashed' ? '4,3' : style === 'dotted' ? '1,3' : undefined}
              />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
