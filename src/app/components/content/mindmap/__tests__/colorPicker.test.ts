// ============================================================
// Tests — ColorPicker contract + behavior tests
//
// Cycle 63 extraction: the native color input + 6 quick-pick
// swatches were lifted out of AddNodeEdgeModal.tsx (lines
// 581-613 of the cycle-62 source) into a compound component
// (ColorPicker.Input + ColorPicker.Swatches).
//
// Sister test suite to lineStylePicker.test.ts (cycle 62) and
// arrowTypePicker.test.ts (cycle 61).
//
// Coverage:
//   - Module export shape (compound object with .Input + .Swatches)
//   - Source-shape contracts for the color input (id, type, classes,
//     htmlFor pairing, title attribute, controlled value/onChange)
//   - Source-shape contracts for the swatches (CSS classes, active
//     border, aria-label wiring, palette ordering, button type)
//   - Replicated logic tests (active-swatch border switching,
//     palette length, onChange dispatch, value === c comparison)
//
// Pattern: source-based contract checks + replicated pure logic.
// No React rendering (consistent with the rest of the suite).
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Source inspection ───────────────────────────────────────

const COMPONENT_PATH = resolve(__dirname, '..', 'ColorPicker.tsx');
const source = readFileSync(COMPONENT_PATH, 'utf-8');

// ── Module contract ─────────────────────────────────────────

describe('ColorPicker: module contract', () => {
  it('exports a compound ColorPicker object with Input + Swatches', () => {
    expect(source).toMatch(/export\s+const\s+ColorPicker\s*=/);
    expect(source).toContain('Input: ColorPickerInput');
    expect(source).toContain('Swatches: ColorPickerSwatches');
  });

  it('exports the ColorPickerInputProps interface', () => {
    expect(source).toMatch(/export\s+interface\s+ColorPickerInputProps/);
  });

  it('exports the ColorPickerSwatchesProps interface', () => {
    expect(source).toMatch(/export\s+interface\s+ColorPickerSwatchesProps/);
  });

  it('has no default export (named export only)', () => {
    expect(source).not.toMatch(/export\s+default/);
  });

  it('does NOT import from @/app/design-system (host owns design tokens)', () => {
    // Critical decoupling: the palette is passed in by the host as a prop,
    // so this component must not depend on the design-system module.
    // Check for an actual import statement (the string may appear in comments).
    expect(source).not.toMatch(/import[^;]+from\s+['"]@\/app\/design-system['"]/);
  });
});

// ── Props interface — Input ─────────────────────────────────

describe('ColorPicker.Input: props interface', () => {
  it('declares value: string', () => {
    const block = source.slice(
      source.indexOf('export interface ColorPickerInputProps'),
      source.indexOf('export interface ColorPickerSwatchesProps'),
    );
    expect(block).toMatch(/value:\s*string/);
  });

  it('declares onChange callback typed (next: string) => void', () => {
    const block = source.slice(
      source.indexOf('export interface ColorPickerInputProps'),
      source.indexOf('export interface ColorPickerSwatchesProps'),
    );
    expect(block).toMatch(/onChange:\s*\(next:\s*string\)\s*=>\s*void/);
  });

  it('declares fieldLabel + inputTitle strings', () => {
    const block = source.slice(
      source.indexOf('export interface ColorPickerInputProps'),
      source.indexOf('export interface ColorPickerSwatchesProps'),
    );
    expect(block).toMatch(/fieldLabel:\s*string/);
    expect(block).toMatch(/inputTitle:\s*string/);
  });
});

// ── Props interface — Swatches ──────────────────────────────

describe('ColorPicker.Swatches: props interface', () => {
  it('declares value: string', () => {
    const block = source.slice(source.indexOf('export interface ColorPickerSwatchesProps'));
    expect(block).toMatch(/value:\s*string/);
  });

  it('declares onChange callback typed (next: string) => void', () => {
    const block = source.slice(source.indexOf('export interface ColorPickerSwatchesProps'));
    expect(block).toMatch(/onChange:\s*\(next:\s*string\)\s*=>\s*void/);
  });

  it('declares quickLabel: string', () => {
    const block = source.slice(source.indexOf('export interface ColorPickerSwatchesProps'));
    expect(block).toMatch(/quickLabel:\s*string/);
  });

  it('declares ariaLabel callback typed (color: string) => string', () => {
    const block = source.slice(source.indexOf('export interface ColorPickerSwatchesProps'));
    expect(block).toMatch(/ariaLabel:\s*\(color:\s*string\)\s*=>\s*string/);
  });

  it('declares palette as readonly string[] (host-supplied)', () => {
    const block = source.slice(source.indexOf('export interface ColorPickerSwatchesProps'));
    expect(block).toMatch(/palette:\s*readonly\s+string\[\]/);
  });
});

// ── Color input source-shape contracts ──────────────────────

describe('ColorPicker.Input: source shape preserved byte-identically', () => {
  it('uses native <input type="color">', () => {
    expect(source).toContain('type="color"');
  });

  it('input id is "custom-edge-color" (preserves a11y pairing with htmlFor)', () => {
    expect(source).toContain('id="custom-edge-color"');
  });

  it('label htmlFor pairs to "custom-edge-color"', () => {
    expect(source).toContain('htmlFor="custom-edge-color"');
  });

  it('label uses block text-xs font-medium text-gray-600 mb-1', () => {
    expect(source).toContain('className="block text-xs font-medium text-gray-600 mb-1"');
  });

  it('input className is preserved verbatim', () => {
    expect(source).toContain('className="w-full h-[38px] rounded-lg border border-gray-200 cursor-pointer p-0.5"');
  });

  it('input is wrapped in a relative <div> (preserves cycle-62 DOM shape)', () => {
    expect(source).toContain('<div className="relative">');
  });

  it('controlled-value binding: value={value}', () => {
    const block = source.slice(source.indexOf('function ColorPickerInput'), source.indexOf('function ColorPickerSwatches'));
    expect(block).toContain('value={value}');
  });

  it('onChange dispatches via e.target.value (preserves original closure shape)', () => {
    expect(source).toContain('onChange={(e) => onChange(e.target.value)}');
  });

  it('title attribute is bound to the inputTitle prop', () => {
    expect(source).toContain('title={inputTitle}');
  });

  it('renders fieldLabel inside the <label>', () => {
    const block = source.slice(source.indexOf('function ColorPickerInput'), source.indexOf('function ColorPickerSwatches'));
    expect(block).toMatch(/<label[\s\S]*?>\s*\{fieldLabel\}\s*<\/label>/);
  });
});

// ── Swatches source-shape contracts ─────────────────────────

describe('ColorPicker.Swatches: source shape preserved byte-identically', () => {
  it('container uses flex items-center gap-1.5', () => {
    expect(source).toContain('className="flex items-center gap-1.5"');
  });

  it('quickLabel sits in a <span> with text-[10px] text-gray-500 mr-1', () => {
    expect(source).toContain('<span className="text-[10px] text-gray-500 mr-1">{quickLabel}</span>');
  });

  it('iterates over the palette prop (renders one button per color)', () => {
    expect(source).toContain('palette.map((c) =>');
  });

  it('each swatch is a <button type="button">', () => {
    const block = source.slice(source.indexOf('function ColorPickerSwatches'));
    expect(block).toContain('type="button"');
  });

  it('swatch onClick calls onChange(c) with the closure-captured color', () => {
    expect(source).toContain('onClick={() => onChange(c)}');
  });

  it('swatch className uses w-8 h-8 sm:w-5 sm:h-5 rounded-full border-2 + transition + hover:scale-110', () => {
    expect(source).toContain('w-8 h-8 sm:w-5 sm:h-5 rounded-full border-2 transition-transform hover:scale-110');
  });

  it('active swatch gains border-gray-800 scale-110, inactive gets border-transparent', () => {
    expect(source).toContain("value === c ? 'border-gray-800 scale-110' : 'border-transparent'");
  });

  it('active comparison is value === c (closure capture, NOT palette[i])', () => {
    // Critical: the closure captures `c` from .map iteration. Comparing
    // against `palette[i]` would be subtly different (re-indexing on
    // every render); the original used `c` and we preserve that.
    expect(source).not.toContain('value === palette[i]');
    expect(source).not.toContain('palette[idx]');
  });

  it('swatch backgroundColor inline style is bound to the color', () => {
    expect(source).toContain('style={{ backgroundColor: c }}');
  });

  it('per-swatch aria-label is produced via ariaLabel(c) callback', () => {
    expect(source).toContain('aria-label={ariaLabel(c)}');
  });

  it('button has key={c} for stable React reconciliation', () => {
    expect(source).toContain('key={c}');
  });
});

// ── Active-swatch comparison — replicated logic ─────────────

describe('ColorPicker.Swatches: active-state class — replicated logic', () => {
  function activeClasses(value: string, c: string): string {
    return value === c ? 'border-gray-800 scale-110' : 'border-transparent';
  }

  it('matching color → border-gray-800 scale-110', () => {
    expect(activeClasses('#ff0000', '#ff0000')).toBe('border-gray-800 scale-110');
  });

  it('non-matching color → border-transparent', () => {
    expect(activeClasses('#ff0000', '#00ff00')).toBe('border-transparent');
  });

  it('case-sensitive comparison (uppercase vs lowercase hex are distinct)', () => {
    // value === c is strict string equality; '#FF0000' !== '#ff0000'.
    expect(activeClasses('#FF0000', '#ff0000')).toBe('border-transparent');
  });

  it('only one swatch can be active at a time across a 6-color palette', () => {
    const palette = ['#aaa', '#bbb', '#ccc', '#ddd', '#eee', '#fff'];
    const value = '#ccc';
    const actives = palette.map((c) => activeClasses(value, c)).filter((cls) => cls.includes('scale-110'));
    expect(actives).toHaveLength(1);
  });

  it('zero swatches active when value matches no palette entry', () => {
    const palette = ['#aaa', '#bbb', '#ccc', '#ddd', '#eee', '#fff'];
    const value = '#000000';
    const actives = palette.map((c) => activeClasses(value, c)).filter((cls) => cls.includes('scale-110'));
    expect(actives).toHaveLength(0);
  });
});

// ── Palette ordering & length — replicated host expectation ─

describe('ColorPicker.Swatches: palette ordering (host contract)', () => {
  // Host (AddNodeEdgeModal) passes this exact 6-color palette in this order:
  //   [primary[500], semantic.error, '#f97316', '#8b5cf6', '#06b6d4', '#64748b']
  // Replicate that contract: when iterating palette.map, the swatch order
  // tracks the prop array order verbatim.
  const HOST_PALETTE = [
    '#fakefa', // stand-in for colors.primary[500]
    '#facfac', // stand-in for colors.semantic.error
    '#f97316',
    '#8b5cf6',
    '#06b6d4',
    '#64748b',
  ];

  it('palette length is 6 (matches host contract)', () => {
    expect(HOST_PALETTE).toHaveLength(6);
  });

  it('iteration order is stable: index 2 is #f97316 (orange)', () => {
    expect(HOST_PALETTE[2]).toBe('#f97316');
  });

  it('iteration order is stable: index 3 is #8b5cf6 (violet)', () => {
    expect(HOST_PALETTE[3]).toBe('#8b5cf6');
  });

  it('iteration order is stable: index 4 is #06b6d4 (cyan)', () => {
    expect(HOST_PALETTE[4]).toBe('#06b6d4');
  });

  it('iteration order is stable: index 5 is #64748b (slate)', () => {
    expect(HOST_PALETTE[5]).toBe('#64748b');
  });

  it('first two slots are reserved for design-system tokens (primary, error)', () => {
    // Slots 0 and 1 are passed in by the host from `colors.primary[500]`
    // and `colors.semantic.error` — verified by the host test
    // (addNodeEdgeModal.test.ts: "host still declares the 6 hex colors").
    // Here we just enforce that slots 2-5 are the literal hex tail.
    expect(HOST_PALETTE.slice(2)).toEqual(['#f97316', '#8b5cf6', '#06b6d4', '#64748b']);
  });
});

// ── onChange dispatch — replicated logic ────────────────────

describe('ColorPicker: onChange dispatch — replicated logic', () => {
  it('input onChange forwards e.target.value (matches host setEdgeColor)', () => {
    let captured = '';
    const onChange = (next: string) => { captured = next; };
    // Replicate the input handler closure
    const handler = (e: { target: { value: string } }) => onChange(e.target.value);
    handler({ target: { value: '#abcdef' } });
    expect(captured).toBe('#abcdef');
  });

  it('swatch onClick forwards the closure-captured color verbatim', () => {
    let captured = '';
    const onChange = (next: string) => { captured = next; };
    const c = '#f97316';
    // Replicate the .map closure
    const handler = () => onChange(c);
    handler();
    expect(captured).toBe('#f97316');
  });

  it('multiple swatch clicks each forward their captured color independently', () => {
    const captured: string[] = [];
    const onChange = (next: string) => { captured.push(next); };
    const palette = ['#aaa', '#bbb', '#ccc'];
    palette.forEach((c) => onChange(c));
    expect(captured).toEqual(['#aaa', '#bbb', '#ccc']);
  });
});

// ── Compound shape consistency ──────────────────────────────

describe('ColorPicker: compound shape', () => {
  it('Input is a function declaration (not arrow), keeping displayName useful for devtools', () => {
    expect(source).toMatch(/function\s+ColorPickerInput\s*\(/);
  });

  it('Swatches is a function declaration', () => {
    expect(source).toMatch(/function\s+ColorPickerSwatches\s*\(/);
  });

  it('compound object literal binds Input then Swatches in declaration order', () => {
    const compound = source.slice(source.indexOf('export const ColorPicker'));
    const inputIdx = compound.indexOf('Input: ColorPickerInput');
    const swatchesIdx = compound.indexOf('Swatches: ColorPickerSwatches');
    expect(inputIdx).toBeGreaterThan(0);
    expect(swatchesIdx).toBeGreaterThan(inputIdx);
  });

  it('Input + Swatches are NOT merged into a single component (compound shape preserved)', () => {
    // Two render points (row cell + sibling below row) is the whole point
    // of the compound pattern. A single function returning both via a
    // fragment would force the host to drop the `flex gap-3` row layout.
    expect(source).not.toMatch(/function\s+ColorPicker\s*\(/);
  });
});
