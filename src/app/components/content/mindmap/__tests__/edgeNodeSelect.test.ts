// ============================================================
// Tests — EdgeNodeSelect contract + behavior tests
//
// Cycle 64 extraction: the source/target node <select> blocks
// were lifted out of AddNodeEdgeModal.tsx (lines 460-498 of the
// cycle-63 source) into a compound component
// (EdgeNodeSelect.Source + EdgeNodeSelect.Target).
//
// Sister test suite to colorPicker.test.ts (cycle 63),
// lineStylePicker.test.ts (cycle 62), arrowTypePicker.test.ts
// (cycle 61).
//
// Coverage:
//   - Module export shape (compound object with .Source + .Target)
//   - Source variant: forwardRef wiring, no excludeId, no filter
//   - Target variant: no ref, optional excludeId, .filter() on
//     options BEFORE .map()
//   - Shared source-shape contracts: identical <select>/<label>
//     classNames, htmlFor pairing via inputId prop, yoursSuffix
//     literal-space prefix on user-created options
//   - Replicated logic: filter behavior, isUserCreated suffix
//
// Pattern: source-based contract checks + replicated pure logic.
// No React rendering (consistent with the rest of the suite).
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Source inspection ───────────────────────────────────────

const COMPONENT_PATH = resolve(__dirname, '..', 'EdgeNodeSelect.tsx');
const source = readFileSync(COMPONENT_PATH, 'utf-8');

// Helper slices — keeps regex/contains assertions scoped to the
// right sub-component body.
const SOURCE_BLOCK = (() => {
  const start = source.indexOf('export const EdgeNodeSelectSource');
  const end = source.indexOf('export function EdgeNodeSelectTarget');
  return source.slice(start, end);
})();

const TARGET_BLOCK = (() => {
  const start = source.indexOf('export function EdgeNodeSelectTarget');
  const end = source.indexOf('// ── Compound export');
  return source.slice(start, end);
})();

// ── Module contract ─────────────────────────────────────────

describe('EdgeNodeSelect: module contract', () => {
  it('exports a compound EdgeNodeSelect object with Source + Target', () => {
    expect(source).toMatch(/export\s+const\s+EdgeNodeSelect\s*=/);
    expect(source).toContain('Source: EdgeNodeSelectSource');
    expect(source).toContain('Target: EdgeNodeSelectTarget');
  });

  it('exports the EdgeNodeSelectInputProps interface', () => {
    expect(source).toMatch(/export\s+interface\s+EdgeNodeSelectInputProps/);
  });

  it('exports the EdgeNodeSelectTargetProps interface', () => {
    expect(source).toMatch(/export\s+interface\s+EdgeNodeSelectTargetProps/);
  });

  it('exports the EdgeNodeSelectOption interface', () => {
    expect(source).toMatch(/export\s+interface\s+EdgeNodeSelectOption/);
  });

  it('has no default export (named export only)', () => {
    expect(source).not.toMatch(/export\s+default/);
  });

  it('imports forwardRef from react (Source variant requires it)', () => {
    expect(source).toMatch(/import\s*\{[^}]*forwardRef[^}]*\}\s*from\s*['"]react['"]/);
  });

  it('does NOT merge Source + Target into a single function (compound shape preserved)', () => {
    // Critical: a flat <EdgeNodeSelect /> would force the asymmetric ref
    // forwarding into a discriminator prop, which would erase the type-level
    // safety the compound shape provides.
    expect(source).not.toMatch(/function\s+EdgeNodeSelect\s*\(/);
    expect(source).not.toMatch(/export\s+function\s+EdgeNodeSelect\s*\(/);
  });
});

// ── Props interface — Input (shared base) ───────────────────

describe('EdgeNodeSelect: EdgeNodeSelectInputProps interface', () => {
  const block = source.slice(
    source.indexOf('export interface EdgeNodeSelectInputProps'),
    source.indexOf('export interface EdgeNodeSelectTargetProps'),
  );

  it('declares value: string', () => {
    expect(block).toMatch(/value:\s*string/);
  });

  it('declares onChange callback typed (next: string) => void', () => {
    expect(block).toMatch(/onChange:\s*\(next:\s*string\)\s*=>\s*void/);
  });

  it('declares options as readonly EdgeNodeSelectOption[]', () => {
    expect(block).toMatch(/options:\s*readonly\s+EdgeNodeSelectOption\[\]/);
  });

  it('declares fieldLabel: string', () => {
    expect(block).toMatch(/fieldLabel:\s*string/);
  });

  it('declares placeholder: string', () => {
    expect(block).toMatch(/placeholder:\s*string/);
  });

  it('declares yoursSuffix: string', () => {
    expect(block).toMatch(/yoursSuffix:\s*string/);
  });

  it('declares inputId: string', () => {
    expect(block).toMatch(/inputId:\s*string/);
  });
});

// ── Props interface — Target (extends base + excludeId) ─────

describe('EdgeNodeSelect: EdgeNodeSelectTargetProps interface', () => {
  const block = source.slice(source.indexOf('export interface EdgeNodeSelectTargetProps'));

  it('extends EdgeNodeSelectInputProps (shared base shape)', () => {
    expect(block).toMatch(/extends\s+EdgeNodeSelectInputProps/);
  });

  it('declares optional excludeId: string', () => {
    expect(block).toMatch(/excludeId\?:\s*string/);
  });
});

// ── Option interface ────────────────────────────────────────

describe('EdgeNodeSelect: EdgeNodeSelectOption interface', () => {
  const block = source.slice(
    source.indexOf('export interface EdgeNodeSelectOption'),
    source.indexOf('export interface EdgeNodeSelectInputProps'),
  );

  it('declares id: string', () => {
    expect(block).toMatch(/id:\s*string/);
  });

  it('declares label: string', () => {
    expect(block).toMatch(/label:\s*string/);
  });

  it('declares optional isUserCreated: boolean', () => {
    expect(block).toMatch(/isUserCreated\?:\s*boolean/);
  });
});

// ── Source variant — source-shape contracts ────────────────

describe('EdgeNodeSelect.Source: source shape preserved byte-identically', () => {
  it('uses forwardRef<HTMLSelectElement, EdgeNodeSelectInputProps>', () => {
    expect(source).toMatch(
      /forwardRef<HTMLSelectElement,\s*EdgeNodeSelectInputProps>/,
    );
  });

  it('forwardRef wraps a named function (devtools displayName preserved)', () => {
    expect(source).toMatch(/function\s+EdgeNodeSelectSource\s*\(/);
  });

  it('Source body has ref={ref} on the <select>', () => {
    expect(SOURCE_BLOCK).toContain('ref={ref}');
  });

  it('Source <select> classNames preserved verbatim', () => {
    expect(SOURCE_BLOCK).toContain(
      'className="w-full px-3 py-2 text-base sm:text-sm border border-gray-200 rounded-xl outline-none bg-white font-sans focus:ring-2 focus:ring-ax-primary-500/20 focus:border-ax-primary-500"',
    );
  });

  it('Source <label> classNames preserved verbatim', () => {
    expect(SOURCE_BLOCK).toContain(
      'className="block text-xs font-medium text-gray-600 mb-1"',
    );
  });

  it('Source label htmlFor pairs with the inputId prop', () => {
    expect(SOURCE_BLOCK).toContain('htmlFor={inputId}');
  });

  it('Source <select> id binds to the inputId prop', () => {
    expect(SOURCE_BLOCK).toContain('id={inputId}');
  });

  it('Source first option is the empty placeholder', () => {
    expect(SOURCE_BLOCK).toContain('<option value="">{placeholder}</option>');
  });

  it('Source iterates options.map without filtering (no excludeId, no .filter)', () => {
    expect(SOURCE_BLOCK).toContain('options.map((n) =>');
    expect(SOURCE_BLOCK).not.toContain('.filter(');
    expect(SOURCE_BLOCK).not.toContain('excludeId');
  });

  it('Source per-option label uses the literal-space yoursSuffix prefix', () => {
    // Critical: the original was `${n.label}${n.isUserCreated ? ` ${t.yours}` : ''}`
    // — note the leading SPACE inside the template (between ` and ${...}).
    expect(SOURCE_BLOCK).toContain(
      "{n.label}{n.isUserCreated ? ` ${yoursSuffix}` : ''}",
    );
  });

  it('Source per-option uses key={n.id} for stable React reconciliation', () => {
    expect(SOURCE_BLOCK).toContain('key={n.id}');
  });

  it('Source onChange dispatches via e.target.value', () => {
    expect(SOURCE_BLOCK).toContain('onChange={(e) => onChange(e.target.value)}');
  });

  it('Source value binding: value={value}', () => {
    expect(SOURCE_BLOCK).toContain('value={value}');
  });

  it('Source wraps the label+select pair in a <div>', () => {
    expect(SOURCE_BLOCK).toMatch(/return\s*\(\s*<div>/);
  });

  it('Source renders fieldLabel inside the <label>', () => {
    expect(SOURCE_BLOCK).toMatch(/<label[\s\S]*?>\s*\{fieldLabel\}\s*<\/label>/);
  });
});

// ── Target variant — source-shape contracts ────────────────

describe('EdgeNodeSelect.Target: source shape preserved byte-identically', () => {
  it('Target is a plain function declaration (NOT forwardRef-wrapped)', () => {
    expect(TARGET_BLOCK).toMatch(/function\s+EdgeNodeSelectTarget\s*\(/);
    expect(TARGET_BLOCK).not.toContain('forwardRef');
  });

  it('Target body does NOT contain ref={ — asymmetry preserved', () => {
    // Critical: only Source forwards a ref. Accidental ref wiring on Target
    // would mean any host passing a ref={...} prop would silently become a
    // typecheck error (TargetProps has no ref).
    expect(TARGET_BLOCK).not.toContain('ref={');
  });

  it('Target <select> classNames preserved verbatim (matches Source)', () => {
    expect(TARGET_BLOCK).toContain(
      'className="w-full px-3 py-2 text-base sm:text-sm border border-gray-200 rounded-xl outline-none bg-white font-sans focus:ring-2 focus:ring-ax-primary-500/20 focus:border-ax-primary-500"',
    );
  });

  it('Target <label> classNames preserved verbatim (matches Source)', () => {
    expect(TARGET_BLOCK).toContain(
      'className="block text-xs font-medium text-gray-600 mb-1"',
    );
  });

  it('Target label htmlFor pairs with the inputId prop', () => {
    expect(TARGET_BLOCK).toContain('htmlFor={inputId}');
  });

  it('Target <select> id binds to the inputId prop', () => {
    expect(TARGET_BLOCK).toContain('id={inputId}');
  });

  it('Target first option is the empty placeholder', () => {
    expect(TARGET_BLOCK).toContain('<option value="">{placeholder}</option>');
  });

  it('Target filters options BEFORE mapping (filter then map order)', () => {
    // Critical order: .filter().map(). Reversing would render then drop,
    // wasting JSX. The original was `sortedNodes.filter(...).map(...)`.
    expect(TARGET_BLOCK).toMatch(/options\s*\.filter\([\s\S]*?\)\s*\.map\(/);
  });

  it('Target filter excludes options whose id matches excludeId', () => {
    expect(TARGET_BLOCK).toContain('.filter((n) => n.id !== excludeId)');
  });

  it('Target per-option label uses the literal-space yoursSuffix prefix', () => {
    expect(TARGET_BLOCK).toContain(
      "{n.label}{n.isUserCreated ? ` ${yoursSuffix}` : ''}",
    );
  });

  it('Target per-option uses key={n.id} for stable React reconciliation', () => {
    expect(TARGET_BLOCK).toContain('key={n.id}');
  });

  it('Target onChange dispatches via e.target.value', () => {
    expect(TARGET_BLOCK).toContain('onChange={(e) => onChange(e.target.value)}');
  });

  it('Target value binding: value={value}', () => {
    expect(TARGET_BLOCK).toContain('value={value}');
  });

  it('Target wraps the label+select pair in a <div>', () => {
    expect(TARGET_BLOCK).toMatch(/return\s*\(\s*<div>/);
  });

  it('Target return signature is JSX.Element', () => {
    expect(TARGET_BLOCK).toMatch(/\):\s*JSX\.Element/);
  });
});

// ── Replicated logic — Target filter ────────────────────────

describe('EdgeNodeSelect.Target: filter logic — replicated', () => {
  function applyFilter<T extends { id: string }>(
    options: T[],
    excludeId: string | undefined,
  ): T[] {
    return options.filter((n) => n.id !== excludeId);
  }

  it('excludes the option whose id matches excludeId', () => {
    const opts = [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
      { id: 'c', label: 'Gamma' },
    ];
    expect(applyFilter(opts, 'b').map((n) => n.id)).toEqual(['a', 'c']);
  });

  it('returns all options when excludeId is undefined (no source picked)', () => {
    const opts = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
    // Key behavior: `n.id !== undefined` is always true for string ids, so
    // every entry survives. This matches the host's "no source yet" branch.
    expect(applyFilter(opts, undefined)).toHaveLength(2);
  });

  it('returns all options when excludeId is empty string (placeholder selected)', () => {
    const opts = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }];
    // String ids are never '' (the empty option is the placeholder, not a node),
    // so the filter is a no-op. This matches the host expectation.
    expect(applyFilter(opts, '')).toHaveLength(2);
  });

  it('returns empty array when excludeId matches the only option', () => {
    expect(applyFilter([{ id: 'only', label: 'Only' }], 'only')).toEqual([]);
  });

  it('preserves option order (filter is order-stable)', () => {
    const opts = [
      { id: 'z', label: 'Zulu' },
      { id: 'a', label: 'Alpha' },
      { id: 'm', label: 'Mike' },
    ];
    expect(applyFilter(opts, 'a').map((n) => n.id)).toEqual(['z', 'm']);
  });

  it('case-sensitive id match (uppercase ID is distinct from lowercase)', () => {
    const opts = [
      { id: 'Aorta', label: 'Aorta' },
      { id: 'aorta', label: 'aorta' },
    ];
    expect(applyFilter(opts, 'aorta').map((n) => n.id)).toEqual(['Aorta']);
  });
});

// ── Replicated logic — yoursSuffix label ────────────────────

describe('EdgeNodeSelect: option label with yoursSuffix — replicated logic', () => {
  // Replicates: `${n.label}${n.isUserCreated ? ` ${yoursSuffix}` : ''}`
  function optionLabel(
    n: { label: string; isUserCreated?: boolean },
    yoursSuffix: string,
  ): string {
    return `${n.label}${n.isUserCreated ? ` ${yoursSuffix}` : ''}`;
  }

  it('appends ` (seu)` for user-created (pt yoursSuffix)', () => {
    expect(optionLabel({ label: 'Aorta', isUserCreated: true }, '(seu)')).toBe(
      'Aorta (seu)',
    );
  });

  it('appends ` (tuyo)` for user-created (es yoursSuffix)', () => {
    expect(optionLabel({ label: 'Mitocondria', isUserCreated: true }, '(tuyo)')).toBe(
      'Mitocondria (tuyo)',
    );
  });

  it('plain label when isUserCreated is false', () => {
    expect(optionLabel({ label: 'Aorta', isUserCreated: false }, '(seu)')).toBe('Aorta');
  });

  it('plain label when isUserCreated is undefined (default node)', () => {
    expect(optionLabel({ label: 'Aorta' }, '(seu)')).toBe('Aorta');
  });

  it('preserves the literal-space prefix on the suffix (not glued to label)', () => {
    // Subtle: the template is ` ${yoursSuffix}` (space-then-token). The
    // suffix prop must NOT include a leading space — the host owns the
    // space. Verify by feeding a no-space suffix.
    expect(optionLabel({ label: 'Aorta', isUserCreated: true }, 'mine')).toBe(
      'Aorta mine',
    );
  });

  it('does not collapse internal whitespace inside the label', () => {
    expect(
      optionLabel({ label: 'A long label', isUserCreated: true }, '(seu)'),
    ).toBe('A long label (seu)');
  });
});

// ── Replicated logic — onChange dispatch ────────────────────

describe('EdgeNodeSelect: onChange dispatch — replicated logic', () => {
  it('forwards e.target.value verbatim (matches host setEdgeSource/Target)', () => {
    let captured = '';
    const onChange = (next: string) => {
      captured = next;
    };
    const handler = (e: { target: { value: string } }) => onChange(e.target.value);
    handler({ target: { value: 'node-42' } });
    expect(captured).toBe('node-42');
  });

  it('placeholder selection forwards empty string', () => {
    let captured = 'sentinel';
    const onChange = (next: string) => {
      captured = next;
    };
    const handler = (e: { target: { value: string } }) => onChange(e.target.value);
    handler({ target: { value: '' } });
    expect(captured).toBe('');
  });

  it('multiple selections each forward their own id', () => {
    const captured: string[] = [];
    const onChange = (next: string) => {
      captured.push(next);
    };
    const handler = (e: { target: { value: string } }) => onChange(e.target.value);
    handler({ target: { value: 'a' } });
    handler({ target: { value: 'b' } });
    handler({ target: { value: 'c' } });
    expect(captured).toEqual(['a', 'b', 'c']);
  });
});

// ── Compound shape consistency ──────────────────────────────

describe('EdgeNodeSelect: compound shape', () => {
  it('Source is exported as a const (forwardRef returns an exotic component)', () => {
    expect(source).toMatch(/export\s+const\s+EdgeNodeSelectSource\s*=\s*forwardRef/);
  });

  it('Target is exported as a function declaration', () => {
    expect(source).toMatch(/export\s+function\s+EdgeNodeSelectTarget\s*\(/);
  });

  it('compound object literal binds Source then Target in declaration order', () => {
    const compound = source.slice(source.indexOf('export const EdgeNodeSelect ='));
    const sourceIdx = compound.indexOf('Source: EdgeNodeSelectSource');
    const targetIdx = compound.indexOf('Target: EdgeNodeSelectTarget');
    expect(sourceIdx).toBeGreaterThan(0);
    expect(targetIdx).toBeGreaterThan(sourceIdx);
  });

  it('compound shape exposes Source + Target sub-components only (no extras)', () => {
    const compound = source.slice(
      source.indexOf('export const EdgeNodeSelect ='),
      source.length,
    );
    // Two keys, no third leaking in.
    const keyMatches = compound.match(/^\s*(Source|Target):/gm);
    expect(keyMatches).not.toBeNull();
    expect(keyMatches).toHaveLength(2);
  });

  it('Source body lives between Source export and Target export markers', () => {
    expect(SOURCE_BLOCK.length).toBeGreaterThan(0);
    expect(SOURCE_BLOCK).toContain('EdgeNodeSelectSource');
  });

  it('Target body lives between Target export and Compound export markers', () => {
    expect(TARGET_BLOCK.length).toBeGreaterThan(0);
    expect(TARGET_BLOCK).toContain('EdgeNodeSelectTarget');
  });
});

// ── Decoupling guards ───────────────────────────────────────

describe('EdgeNodeSelect: decoupling from host concerns', () => {
  it('does NOT import from @/app/design-system (no design tokens needed)', () => {
    expect(source).not.toMatch(/import[^;]+from\s+['"]@\/app\/design-system['"]/);
  });

  it('does NOT import the host AddNodeEdgeModal (avoids circular import)', () => {
    // Header comment may MENTION the host as the extraction origin; what we
    // forbid is an actual import statement.
    expect(source).not.toMatch(/import[^;]+from\s+['"][^'"]*AddNodeEdgeModal['"]/);
  });

  it('does NOT import sibling pickers (component is self-contained)', () => {
    expect(source).not.toContain("from './ArrowTypePicker'");
    expect(source).not.toContain("from './LineStylePicker'");
    expect(source).not.toContain("from './ColorPicker'");
  });

  it('does NOT reference t. (i18n token namespace) — host owns translation', () => {
    // Critical: copy passes through props (fieldLabel, placeholder, yoursSuffix).
    // Any `t.something` reference would tie this to the host's I18N shape.
    expect(source).not.toMatch(/\bt\.(yours|edgeSourceField|edgeTargetField|selectPlaceholder)\b/);
  });

  it('does NOT hardcode "edgeSource" string literal (filter uses excludeId prop)', () => {
    // Critical: pre-extraction the inline filter was `n.id !== edgeSource`.
    // After extraction it must be `n.id !== excludeId`. A leftover edgeSource
    // reference would break re-use for any other dropdown pair.
    expect(source).not.toContain('!== edgeSource');
  });

  it('does NOT hardcode the custom-edge-source/-target ids (uses inputId prop)', () => {
    expect(source).not.toContain('"custom-edge-source"');
    expect(source).not.toContain('"custom-edge-target"');
  });
});
