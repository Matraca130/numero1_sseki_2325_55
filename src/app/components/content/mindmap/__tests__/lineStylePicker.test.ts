// ============================================================
// Tests — LineStylePicker contract + behavior tests
//
// Cycle 62 extraction: this radiogroup was lifted out of
// AddNodeEdgeModal.tsx (lines 565-614 of the cycle-61 source).
//
// Sister test suite to arrowTypePicker.test.ts (cycle 61).
//
// Coverage:
//   - Module export shape (named function, props interface)
//   - Source-shape contracts (preserve byte-identical SVG specs,
//     CSS class state, roving tabindex, key bindings, focus call)
//   - Pure replicated cycling logic (next/prev wrap-around, 3-cycle)
//   - Static option order (solid → dashed → dotted)
//
// Pattern: source-based contract checks + replicated pure logic.
// No React rendering (consistent with the rest of the suite).
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Source inspection ───────────────────────────────────────

const COMPONENT_PATH = resolve(__dirname, '..', 'LineStylePicker.tsx');
const source = readFileSync(COMPONENT_PATH, 'utf-8');

// ── Module contract ─────────────────────────────────────────

describe('LineStylePicker: module contract', () => {
  it('exports a named function LineStylePicker', () => {
    expect(source).toMatch(/export\s+function\s+LineStylePicker\s*\(/);
  });

  it('exports the LineStylePickerProps interface', () => {
    expect(source).toMatch(/export\s+interface\s+LineStylePickerProps/);
  });

  it('has no default export (named export only)', () => {
    expect(source).not.toMatch(/export\s+default/);
  });

  it('imports EdgeLineStyle from the canonical types module', () => {
    expect(source).toContain("import type { EdgeLineStyle } from '@/app/types/mindmap'");
  });

  it('does not redeclare EdgeLineStyle locally (single source of truth)', () => {
    // The type lives in @/app/types/mindmap; the component must import,
    // not duplicate it (mirrors ArrowTypePicker's discipline).
    expect(source).not.toMatch(/export\s+type\s+EdgeLineStyle\s*=/);
  });
});

// ── Props interface ─────────────────────────────────────────

describe('LineStylePicker: props interface', () => {
  it('declares value: EdgeLineStyle', () => {
    expect(source).toContain('value: EdgeLineStyle');
  });

  it('declares onChange callback typed (next: EdgeLineStyle) => void', () => {
    expect(source).toMatch(/onChange:\s*\(next:\s*EdgeLineStyle\)\s*=>\s*void/);
  });

  it('declares groupLabel and fieldLabel strings', () => {
    expect(source).toContain('groupLabel: string');
    expect(source).toContain('fieldLabel: string');
  });

  it('declares optionLabels with all three style keys', () => {
    expect(source).toContain('optionLabels:');
    expect(source).toMatch(/solid:\s*string/);
    expect(source).toMatch(/dashed:\s*string/);
    expect(source).toMatch(/dotted:\s*string/);
  });
});

// ── Static option order ─────────────────────────────────────

describe('LineStylePicker: option order is preserved', () => {
  it('declares the three line styles in cycling order', () => {
    expect(source).toContain("['solid', 'dashed', 'dotted']");
  });

  it('cycling tuple is `as const` (preserves literal type)', () => {
    expect(source).toMatch(/\['solid',\s*'dashed',\s*'dotted'\]\s*as\s*const/);
  });

  it('cycling tuple is module-level (stable identity across renders)', () => {
    // The const LINE_STYLES is declared OUTSIDE the component body
    // so it doesn't get re-allocated on every render.
    const lineStylesIdx = source.indexOf('const LINE_STYLES');
    const componentIdx = source.indexOf('export function LineStylePicker');
    expect(lineStylesIdx).toBeGreaterThan(0);
    expect(lineStylesIdx).toBeLessThan(componentIdx);
  });

  it('renders options in solid → dashed → dotted order via LINE_STYLES.map', () => {
    // The .map() iterates the module-level tuple, so visual order
    // tracks declaration order.
    expect(source).toMatch(/LINE_STYLES\.map\(/);
  });
});

// ── ARIA / radiogroup contract ──────────────────────────────

describe('LineStylePicker: ARIA + radiogroup contract', () => {
  it('uses role="radiogroup" on the keyboard handler container', () => {
    expect(source).toContain('role="radiogroup"');
  });

  it('exposes group label via aria-label={groupLabel}', () => {
    expect(source).toContain('aria-label={groupLabel}');
  });

  it('renders each option as role="radio" with aria-checked', () => {
    expect(source).toContain('role="radio"');
    expect(source).toContain('aria-checked={value === style}');
  });

  it('per-option aria-label maps to the i18n optionLabels record', () => {
    expect(source).toContain(
      "aria-label={style === 'solid' ? optionLabels.solid : style === 'dashed' ? optionLabels.dashed : optionLabels.dotted}",
    );
  });

  it('field label is rendered as a real <label> for visual hierarchy', () => {
    expect(source).toMatch(/<label[\s\S]*?>\s*\{fieldLabel\}\s*<\/label>/);
  });

  it('roving tabindex: only the active button is in the tab order', () => {
    expect(source).toMatch(/tabIndex=\{value === style \? 0 : -1\}/);
  });
});

// ── Keyboard navigation contract ────────────────────────────

describe('LineStylePicker: keyboard navigation contract', () => {
  it('responds to ArrowRight / ArrowDown (forward traversal)', () => {
    expect(source).toContain("e.key === 'ArrowRight' || e.key === 'ArrowDown'");
  });

  it('responds to ArrowLeft / ArrowUp (backward traversal)', () => {
    expect(source).toContain("e.key === 'ArrowLeft' || e.key === 'ArrowUp'");
  });

  it('preventDefault is called on arrow keys (avoids page scroll)', () => {
    const matches = source.match(/e\.preventDefault\(\)/g);
    expect(matches).not.toBeNull();
    // Once per direction (forward + backward).
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });

  it('focus follows selection via e.currentTarget.children[idx]?.focus()', () => {
    expect(source).toContain('e.currentTarget.children[(idx + 1) % styles.length] as HTMLElement)?.focus()');
    expect(source).toContain('e.currentTarget.children[(idx - 1 + styles.length) % styles.length] as HTMLElement)?.focus()');
  });

  it('forward step uses (idx + 1) % styles.length (wraps last → first)', () => {
    expect(source).toContain('styles[(idx + 1) % styles.length]');
  });

  it('backward step uses (idx - 1 + styles.length) % styles.length (wraps first → last)', () => {
    expect(source).toContain('styles[(idx - 1 + styles.length) % styles.length]');
  });

  it('keyboard handler is attached to the radiogroup div (direct parent of buttons)', () => {
    // CRITICAL: the focus pattern e.currentTarget.children[idx] requires
    // the radiogroup div to remain the *direct* parent of the three buttons.
    // No wrapper / fragment can be inserted without breaking focus.
    const radiogroupOpenIdx = source.indexOf('role="radiogroup"');
    const onKeyDownIdx = source.indexOf('onKeyDown', radiogroupOpenIdx);
    const optionsMapIdx = source.indexOf('LINE_STYLES.map', onKeyDownIdx);
    expect(onKeyDownIdx).toBeGreaterThan(radiogroupOpenIdx);
    expect(optionsMapIdx).toBeGreaterThan(onKeyDownIdx);
    // No <Fragment> / <> intervening between the radiogroup div and the .map().
    const slice = source.slice(radiogroupOpenIdx, optionsMapIdx);
    expect(slice).not.toContain('<Fragment>');
    expect(slice).not.toContain('<>');
  });
});

// ── SVG preview byte-identity ───────────────────────────────

describe('LineStylePicker: SVG previews are byte-identical to original inline source', () => {
  it('SVG container size: width=24 height=2', () => {
    expect(source).toContain('<svg width="24" height="2" className="flex-shrink-0">');
  });

  it('baseline line geometry: x1=0 y1=1 x2=24 y2=1', () => {
    expect(source).toContain('x1="0" y1="1" x2="24" y2="1"');
  });

  it('stroke is currentColor with strokeWidth=2', () => {
    expect(source).toContain('stroke="currentColor"');
    expect(source).toContain('strokeWidth="2"');
  });

  it('strokeDasharray is "4,3" for dashed', () => {
    expect(source).toContain("style === 'dashed' ? '4,3'");
  });

  it('strokeDasharray is "1,3" for dotted', () => {
    expect(source).toContain("style === 'dotted' ? '1,3'");
  });

  it('strokeDasharray is undefined for solid (no array → continuous line)', () => {
    expect(source).toMatch(/style === 'dashed' \? '4,3' : style === 'dotted' \? '1,3' : undefined/);
  });
});

// ── CSS classes per state ───────────────────────────────────

describe('LineStylePicker: per-state CSS classes are preserved', () => {
  it('active option uses border-ax-primary-500 + bg-ax-primary-50 + text-ax-primary-500 + font-medium', () => {
    expect(source).toContain('border-ax-primary-500 bg-ax-primary-50 text-ax-primary-500 font-medium');
  });

  it('inactive option uses border-gray-200 + text-gray-500 + hover:border-gray-300', () => {
    expect(source).toContain('border-gray-200 text-gray-500 hover:border-gray-300');
  });

  it('button base classes: flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-xs', () => {
    expect(source).toContain('flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-xs transition-colors');
  });

  it('radiogroup container uses flex gap-1.5', () => {
    expect(source).toContain('className="flex gap-1.5"');
  });

  it('field label uses block text-xs font-medium text-gray-600 mb-1', () => {
    expect(source).toContain('className="block text-xs font-medium text-gray-600 mb-1"');
  });
});

// ── Replicated cycling logic ────────────────────────────────

describe('LineStylePicker: cycling (roving radio) — replicated logic', () => {
  const STYLES = ['solid', 'dashed', 'dotted'] as const;
  type LineStyle = typeof STYLES[number];

  function next(current: LineStyle): LineStyle {
    const idx = STYLES.indexOf(current);
    return STYLES[(idx + 1) % STYLES.length];
  }
  function prev(current: LineStyle): LineStyle {
    const idx = STYLES.indexOf(current);
    return STYLES[(idx - 1 + STYLES.length) % STYLES.length];
  }

  it('next from solid is dashed', () => { expect(next('solid')).toBe('dashed'); });
  it('next from dashed is dotted', () => { expect(next('dashed')).toBe('dotted'); });
  it('next from dotted wraps to solid', () => { expect(next('dotted')).toBe('solid'); });

  it('prev from solid wraps to dotted', () => { expect(prev('solid')).toBe('dotted'); });
  it('prev from dashed is solid', () => { expect(prev('dashed')).toBe('solid'); });
  it('prev from dotted is dashed', () => { expect(prev('dotted')).toBe('dashed'); });

  it('a full forward cycle returns to the starting style', () => {
    expect(next(next(next('solid')))).toBe('solid');
  });

  it('a full backward cycle returns to the starting style', () => {
    expect(prev(prev(prev('solid')))).toBe('solid');
  });

  it('forward and backward are inverses (single step)', () => {
    expect(prev(next('solid'))).toBe('solid');
    expect(prev(next('dashed'))).toBe('dashed');
    expect(prev(next('dotted'))).toBe('dotted');
  });

  it('two forward steps from any style traverses two distinct intermediates', () => {
    // solid → dashed → dotted
    expect(next(next('solid'))).toBe('dotted');
    // dashed → dotted → solid
    expect(next(next('dashed'))).toBe('solid');
    // dotted → solid → dashed
    expect(next(next('dotted'))).toBe('dashed');
  });
});

// ── onChange invocation pattern ─────────────────────────────

describe('LineStylePicker: onChange invocation', () => {
  it('button onClick calls onChange(style)', () => {
    expect(source).toContain('onClick={() => onChange(style)}');
  });

  it('arrow key handler calls onChange before moving focus', () => {
    // Both branches: onChange first (sync state), then focus (DOM).
    const handler = source.slice(
      source.indexOf('onKeyDown'),
      source.indexOf('LINE_STYLES.map'),
    );
    // forward branch: onChange + focus
    const forwardOnChangeIdx = handler.indexOf('onChange(styles[(idx + 1) % styles.length])');
    const forwardFocusIdx = handler.indexOf('focus()', forwardOnChangeIdx);
    expect(forwardOnChangeIdx).toBeGreaterThan(0);
    expect(forwardFocusIdx).toBeGreaterThan(forwardOnChangeIdx);
    // backward branch: same ordering
    const backOnChangeIdx = handler.indexOf('onChange(styles[(idx - 1 + styles.length) % styles.length])');
    const backFocusIdx = handler.indexOf('focus()', backOnChangeIdx);
    expect(backOnChangeIdx).toBeGreaterThan(0);
    expect(backFocusIdx).toBeGreaterThan(backOnChangeIdx);
  });
});

// ── Idx lookup uses the value prop ──────────────────────────

describe('LineStylePicker: index lookup', () => {
  it('uses styles.indexOf(value) to locate current option', () => {
    expect(source).toContain('const idx = styles.indexOf(value)');
  });

  it('binds value comparison for active state (className + tabIndex + aria-checked)', () => {
    // Three places use `value === style`: tabIndex, className ternary, aria-checked.
    const matches = source.match(/value === style/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(3);
  });
});
