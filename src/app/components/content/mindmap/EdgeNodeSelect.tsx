// ============================================================
// Axon — EdgeNodeSelect
//
// Compound component for picking source/target nodes when
// creating a custom edge. Extracted from AddNodeEdgeModal
// (cycle #64) — fourth extraction series sister to cycles
// 61 (ArrowTypePicker), 62 (LineStylePicker), 63 (ColorPicker).
//
// Compound shape (two near-identical selects, asymmetric API):
//   - <EdgeNodeSelect.Source>  forwardRef<HTMLSelectElement>;
//                              the host owns edgeSourceRef so that
//                              focus on tab change still works.
//   - <EdgeNodeSelect.Target>  no ref; accepts an optional
//                              `excludeId` prop that filters out
//                              the currently-selected source from
//                              the rendered options.
//
// Behavior preserved verbatim from the original inline body:
//   - <select className="w-full px-3 py-2 text-base sm:text-sm
//                        border border-gray-200 rounded-xl outline-none
//                        bg-white font-sans focus:ring-2
//                        focus:ring-ax-primary-500/20
//                        focus:border-ax-primary-500">
//   - First option: <option value="">{placeholder}</option>
//   - Per-option: {n.label}{n.isUserCreated ? ` ${yoursSuffix}` : ''}
//                 (literal SPACE before the suffix)
//   - Source variant: ref={edgeSourceRef}, no filter
//   - Target variant: .filter((n) => n.id !== excludeId) BEFORE .map()
//   - Label: <label htmlFor={inputId}
//             className="block text-xs font-medium text-gray-600 mb-1">
//   - Wrapping <div> around each label+select pair (the host's
//     parent <form className="space-y-3"> handles vertical spacing)
// ============================================================

import { forwardRef } from 'react';

// ── Types ───────────────────────────────────────────────────

export interface EdgeNodeSelectOption {
  id: string;
  label: string;
  isUserCreated?: boolean;
}

export interface EdgeNodeSelectInputProps {
  /** Selected option id (controlled). */
  value: string;
  onChange: (next: string) => void;
  /** Sorted full list of selectable nodes. */
  options: readonly EdgeNodeSelectOption[];
  /** i18n: field label rendered in <label>. */
  fieldLabel: string;
  /** i18n: placeholder shown as the empty <option>. */
  placeholder: string;
  /** i18n: appended suffix on user-created options (already prefixed with space). */
  yoursSuffix: string;
  /** DOM id used for the <select> + <label htmlFor> pairing. */
  inputId: string;
}

export interface EdgeNodeSelectTargetProps extends EdgeNodeSelectInputProps {
  /** If provided, this option id is excluded from the rendered list. */
  excludeId?: string;
}

// ── Sub-components ──────────────────────────────────────────

export const EdgeNodeSelectSource = forwardRef<HTMLSelectElement, EdgeNodeSelectInputProps>(
  function EdgeNodeSelectSource(
    { value, onChange, options, fieldLabel, placeholder, yoursSuffix, inputId },
    ref,
  ) {
    return (
      <div>
        <label htmlFor={inputId} className="block text-xs font-medium text-gray-600 mb-1">
          {fieldLabel}
        </label>
        <select
          ref={ref}
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-base sm:text-sm border border-gray-200 rounded-xl outline-none bg-white font-sans focus:ring-2 focus:ring-ax-primary-500/20 focus:border-ax-primary-500"
        >
          <option value="">{placeholder}</option>
          {options.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label}{n.isUserCreated ? ` ${yoursSuffix}` : ''}
            </option>
          ))}
        </select>
      </div>
    );
  },
);

export function EdgeNodeSelectTarget({
  value,
  onChange,
  options,
  fieldLabel,
  placeholder,
  yoursSuffix,
  inputId,
  excludeId,
}: EdgeNodeSelectTargetProps): JSX.Element {
  return (
    <div>
      <label htmlFor={inputId} className="block text-xs font-medium text-gray-600 mb-1">
        {fieldLabel}
      </label>
      <select
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-base sm:text-sm border border-gray-200 rounded-xl outline-none bg-white font-sans focus:ring-2 focus:ring-ax-primary-500/20 focus:border-ax-primary-500"
      >
        <option value="">{placeholder}</option>
        {options
          .filter((n) => n.id !== excludeId)
          .map((n) => (
            <option key={n.id} value={n.id}>
              {n.label}{n.isUserCreated ? ` ${yoursSuffix}` : ''}
            </option>
          ))}
      </select>
    </div>
  );
}

// ── Compound export ─────────────────────────────────────────

export const EdgeNodeSelect = {
  Source: EdgeNodeSelectSource,
  Target: EdgeNodeSelectTarget,
};
