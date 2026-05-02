// ============================================================
// Tests — ArrowTypePicker contract + behavior tests
//
// Cycle 61 extraction: this radiogroup was lifted out of
// AddNodeEdgeModal.tsx (lines 548-612 of the cycle-60 source).
//
// Coverage:
//   - Module export shape (named function, props interface)
//   - Source-shape contracts (preserve byte-identical SVG paths,
//     CSS class state, roving tabindex, key bindings, focus call)
//   - Pure replicated cycling logic (next/prev wrap-around)
//   - Static option order (triangle → diamond → circle → vee)
//
// Pattern: source-based contract checks + replicated pure logic.
// No React rendering (consistent with the rest of the suite).
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Source inspection ───────────────────────────────────────

const COMPONENT_PATH = resolve(__dirname, '..', 'ArrowTypePicker.tsx');
const source = readFileSync(COMPONENT_PATH, 'utf-8');

// ── Module contract ─────────────────────────────────────────

describe('ArrowTypePicker: module contract', () => {
  it('exports a named function ArrowTypePicker', () => {
    expect(source).toMatch(/export\s+function\s+ArrowTypePicker\s*\(/);
  });

  it('exports the ArrowTypePickerProps interface', () => {
    expect(source).toMatch(/export\s+interface\s+ArrowTypePickerProps/);
  });

  it('has no default export (named export only)', () => {
    expect(source).not.toMatch(/export\s+default/);
  });

  it('imports EdgeArrowType from the canonical types module', () => {
    expect(source).toContain("import type { EdgeArrowType } from '@/app/types/mindmap'");
  });
});

// ── Props interface ─────────────────────────────────────────

describe('ArrowTypePicker: props interface', () => {
  it('declares value: EdgeArrowType', () => {
    expect(source).toContain('value: EdgeArrowType');
  });

  it('declares onChange callback typed (next: EdgeArrowType) => void', () => {
    expect(source).toMatch(/onChange:\s*\(next:\s*EdgeArrowType\)\s*=>\s*void/);
  });

  it('declares groupLabel and fieldLabel strings', () => {
    expect(source).toContain('groupLabel: string');
    expect(source).toContain('fieldLabel: string');
  });

  it('declares optionLabels with all four type keys', () => {
    expect(source).toContain('optionLabels:');
    expect(source).toMatch(/triangle:\s*string/);
    expect(source).toMatch(/diamond:\s*string/);
    expect(source).toMatch(/circle:\s*string/);
    expect(source).toMatch(/vee:\s*string/);
  });
});

// ── Static option order ─────────────────────────────────────

describe('ArrowTypePicker: option order is preserved', () => {
  it('declares the four arrow types in cycling order', () => {
    expect(source).toContain("['triangle', 'diamond', 'circle', 'vee']");
  });

  it('cycling tuple is `as const` (preserves literal type)', () => {
    expect(source).toMatch(/\['triangle',\s*'diamond',\s*'circle',\s*'vee'\]\s*as\s*const/);
  });

  it('cycling tuple is module-level (stable identity across renders)', () => {
    // The const ARROW_TYPES is declared OUTSIDE the component body
    // so it doesn't get re-allocated on every render.
    const arrowTypesIdx = source.indexOf('const ARROW_TYPES');
    const componentIdx = source.indexOf('export function ArrowTypePicker');
    expect(arrowTypesIdx).toBeGreaterThan(0);
    expect(arrowTypesIdx).toBeLessThan(componentIdx);
  });

  it('renders options in triangle → diamond → circle → vee order', () => {
    // Inside the JSX options array literal — preserves visual order.
    expect(source).toMatch(/type:\s*'triangle'\s*as\s*const[\s\S]*?type:\s*'diamond'\s*as\s*const[\s\S]*?type:\s*'circle'\s*as\s*const[\s\S]*?type:\s*'vee'\s*as\s*const/);
  });
});

// ── ARIA / radiogroup contract ──────────────────────────────

describe('ArrowTypePicker: ARIA + radiogroup contract', () => {
  it('uses role="radiogroup" on the keyboard handler container', () => {
    expect(source).toContain('role="radiogroup"');
  });

  it('exposes group label via aria-label={groupLabel}', () => {
    expect(source).toContain('aria-label={groupLabel}');
  });

  it('renders each option as role="radio" with aria-checked and aria-label', () => {
    expect(source).toContain('role="radio"');
    expect(source).toContain('aria-checked={value === type}');
    expect(source).toContain('aria-label={label}');
  });

  it('field label is rendered as a real <label> for visual hierarchy', () => {
    expect(source).toMatch(/<label[\s\S]*?>\s*\{fieldLabel\}\s*<\/label>/);
  });

  it('roving tabindex: only the active button is in the tab order', () => {
    expect(source).toMatch(/tabIndex=\{value === type \? 0 : -1\}/);
  });
});

// ── Keyboard navigation contract ────────────────────────────

describe('ArrowTypePicker: keyboard navigation contract', () => {
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
    expect(source).toContain('e.currentTarget.children[(idx + 1) % types.length] as HTMLElement)?.focus()');
    expect(source).toContain('e.currentTarget.children[(idx - 1 + types.length) % types.length] as HTMLElement)?.focus()');
  });

  it('forward step uses (idx + 1) % types.length (wraps last → first)', () => {
    expect(source).toContain('types[(idx + 1) % types.length]');
  });

  it('backward step uses (idx - 1 + types.length) % types.length (wraps first → last)', () => {
    expect(source).toContain('types[(idx - 1 + types.length) % types.length]');
  });

  it('keyboard handler is attached to the radiogroup div (direct parent of buttons)', () => {
    // CRITICAL: the focus pattern e.currentTarget.children[idx] requires
    // the radiogroup div to remain the *direct* parent of the four buttons.
    // No wrapper / fragment can be inserted without breaking focus.
    const radiogroupOpenIdx = source.indexOf('role="radiogroup"');
    const onKeyDownIdx = source.indexOf('onKeyDown', radiogroupOpenIdx);
    const optionsMapIdx = source.indexOf('options.map', onKeyDownIdx);
    expect(onKeyDownIdx).toBeGreaterThan(radiogroupOpenIdx);
    expect(optionsMapIdx).toBeGreaterThan(onKeyDownIdx);
    // No <Fragment> / <> intervening between the radiogroup div and the .map().
    const slice = source.slice(radiogroupOpenIdx, optionsMapIdx);
    expect(slice).not.toContain('<Fragment>');
    expect(slice).not.toContain('<>');
  });
});

// ── SVG preview byte-identity ───────────────────────────────

describe('ArrowTypePicker: SVG previews are byte-identical to original inline source', () => {
  it('shared baseline line: x1=0 y1=7 x2=18 y2=7', () => {
    expect(source).toContain('<line x1="0" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="1.5" />');
  });

  it('triangle polygon points', () => {
    expect(source).toContain('<polygon points="18,3 28,7 18,11" fill="currentColor" />');
  });

  it('diamond polygon points', () => {
    expect(source).toContain('<polygon points="18,7 23,3 28,7 23,11" fill="currentColor" />');
  });

  it('circle: cx=23 cy=7 r=4', () => {
    expect(source).toContain('<circle cx="23" cy="7" r="4" fill="currentColor" />');
  });

  it('vee: open polyline with strokeWidth=2 and rounded join', () => {
    expect(source).toContain('<polyline points="18,3 28,7 18,11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />');
  });

  it('SVG container size: 28x14 with viewBox 0 0 28 14', () => {
    expect(source).toContain('width="28" height="14" viewBox="0 0 28 14"');
  });
});

// ── CSS classes per state ───────────────────────────────────

describe('ArrowTypePicker: per-state CSS classes are preserved', () => {
  it('active option uses border-ax-primary-500 + bg-ax-primary-50 + text-ax-primary-500 + font-medium', () => {
    expect(source).toContain('border-ax-primary-500 bg-ax-primary-50 text-ax-primary-500 font-medium');
  });

  it('inactive option uses border-gray-200 + text-gray-500 + hover:border-gray-300', () => {
    expect(source).toContain('border-gray-200 text-gray-500 hover:border-gray-300');
  });

  it('button base classes: flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-lg', () => {
    expect(source).toContain('flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-lg border text-[10px] transition-colors');
  });

  it('radiogroup container uses flex gap-1.5', () => {
    expect(source).toContain('className="flex gap-1.5"');
  });
});

// ── Replicated cycling logic ────────────────────────────────

describe('ArrowTypePicker: cycling (roving radio) — replicated logic', () => {
  const TYPES = ['triangle', 'diamond', 'circle', 'vee'] as const;
  type ArrowType = typeof TYPES[number];

  function next(current: ArrowType): ArrowType {
    const idx = TYPES.indexOf(current);
    return TYPES[(idx + 1) % TYPES.length];
  }
  function prev(current: ArrowType): ArrowType {
    const idx = TYPES.indexOf(current);
    return TYPES[(idx - 1 + TYPES.length) % TYPES.length];
  }

  it('next from triangle is diamond', () => { expect(next('triangle')).toBe('diamond'); });
  it('next from diamond is circle', () => { expect(next('diamond')).toBe('circle'); });
  it('next from circle is vee', () => { expect(next('circle')).toBe('vee'); });
  it('next from vee wraps to triangle', () => { expect(next('vee')).toBe('triangle'); });

  it('prev from triangle wraps to vee', () => { expect(prev('triangle')).toBe('vee'); });
  it('prev from diamond is triangle', () => { expect(prev('diamond')).toBe('triangle'); });
  it('prev from circle is diamond', () => { expect(prev('circle')).toBe('diamond'); });
  it('prev from vee is circle', () => { expect(prev('vee')).toBe('circle'); });

  it('a full forward cycle returns to the starting type', () => {
    expect(next(next(next(next('triangle'))))).toBe('triangle');
  });

  it('a full backward cycle returns to the starting type', () => {
    expect(prev(prev(prev(prev('triangle'))))).toBe('triangle');
  });
});

// ── onChange invocation pattern ─────────────────────────────

describe('ArrowTypePicker: onChange invocation', () => {
  it('button onClick calls onChange(type)', () => {
    expect(source).toContain('onClick={() => onChange(type)}');
  });

  it('arrow key handler calls onChange before moving focus', () => {
    // Both branches: onChange first (sync state), then focus (DOM).
    const handler = source.slice(
      source.indexOf('onKeyDown'),
      source.indexOf('options.map'),
    );
    // forward branch: onChange + focus
    const forwardOnChangeIdx = handler.indexOf('onChange(types[(idx + 1) % types.length])');
    const forwardFocusIdx = handler.indexOf('focus()', forwardOnChangeIdx);
    expect(forwardOnChangeIdx).toBeGreaterThan(0);
    expect(forwardFocusIdx).toBeGreaterThan(forwardOnChangeIdx);
    // backward branch: same ordering
    const backOnChangeIdx = handler.indexOf('onChange(types[(idx - 1 + types.length) % types.length])');
    const backFocusIdx = handler.indexOf('focus()', backOnChangeIdx);
    expect(backOnChangeIdx).toBeGreaterThan(0);
    expect(backFocusIdx).toBeGreaterThan(backOnChangeIdx);
  });
});

// ── Idx lookup uses the value prop ──────────────────────────

describe('ArrowTypePicker: index lookup', () => {
  it('uses types.indexOf(value) to locate current option', () => {
    expect(source).toContain('const idx = types.indexOf(value)');
  });

  it('binds value comparison for active state (className + tabIndex + aria-checked)', () => {
    // Three places use `value === type`: tabIndex, className ternary, aria-checked.
    const matches = source.match(/value === type/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(3);
  });
});
