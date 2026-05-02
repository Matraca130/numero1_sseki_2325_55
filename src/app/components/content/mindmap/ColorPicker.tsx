// ============================================================
// Axon — ColorPicker
//
// Compound component for picking an edge color. Extracted from
// AddNodeEdgeModal (cycle #63) — sister pattern to cycle 61's
// ArrowTypePicker and cycle 62's LineStylePicker.
//
// Compound shape (two render points, one logical module):
//   - <ColorPicker.Input>     native <input type="color"> with label
//                             — lives inside the row alongside
//                             <LineStylePicker> in the host.
//   - <ColorPicker.Swatches>  6-swatch quick-pick row
//                             — lives BELOW the row in the host.
//
// The host owns the design-system import and forwards the
// 6-color palette as a prop, so this component stays decoupled
// from `@/app/design-system`.
//
// Behavior preserved verbatim from the original inline body:
//   - Color input id="custom-edge-color", htmlFor pairing for a11y
//   - 6 swatches in this exact order (passed in by host):
//     [primary[500], semantic.error, '#f97316', '#8b5cf6',
//      '#06b6d4', '#64748b']
//   - Active-swatch comparison: value === c (closure captures c
//     from .map iteration — NOT palette[i])
//   - Active swatch: extra classes 'border-gray-800 scale-110'
//   - Inactive swatch: 'border-transparent'
//   - Each swatch is a <button type="button"> with aria-label
//     produced via ariaLabel(c) callback
// ============================================================

// ── Types ───────────────────────────────────────────────────

export interface ColorPickerInputProps {
  value: string;
  onChange: (next: string) => void;
  /** Visible field-label rendered above the color input. */
  fieldLabel: string;
  /** title attribute on the color input (hover tooltip). */
  inputTitle: string;
}

export interface ColorPickerSwatchesProps {
  value: string;
  onChange: (next: string) => void;
  /** Inline label rendered before the swatches ("Quick:" / "Rápido:"). */
  quickLabel: string;
  /** Per-swatch aria-label callback receiving the hex color. */
  ariaLabel: (color: string) => string;
  /** 6-color palette (host owns the design-system source). */
  palette: readonly string[];
}

// ── Sub-components ──────────────────────────────────────────

function ColorPickerInput({
  value,
  onChange,
  fieldLabel,
  inputTitle,
}: ColorPickerInputProps): JSX.Element {
  return (
    <div>
      <label htmlFor="custom-edge-color" className="block text-xs font-medium text-gray-600 mb-1">
        {fieldLabel}
      </label>
      <div className="relative">
        <input
          id="custom-edge-color"
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-[38px] rounded-lg border border-gray-200 cursor-pointer p-0.5"
          title={inputTitle}
        />
      </div>
    </div>
  );
}

function ColorPickerSwatches({
  value,
  onChange,
  quickLabel,
  ariaLabel,
  palette,
}: ColorPickerSwatchesProps): JSX.Element {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-gray-500 mr-1">{quickLabel}</span>
      {palette.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`w-8 h-8 sm:w-5 sm:h-5 rounded-full border-2 transition-transform hover:scale-110 ${
            value === c ? 'border-gray-800 scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: c }}
          aria-label={ariaLabel(c)}
        />
      ))}
    </div>
  );
}

// ── Compound export ─────────────────────────────────────────

export const ColorPicker = {
  Input: ColorPickerInput,
  Swatches: ColorPickerSwatches,
};
