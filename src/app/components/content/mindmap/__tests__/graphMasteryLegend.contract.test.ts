// ============================================================
// Contract test — GraphMasteryLegend
//
// Tiny presentational overlay (44 lines). Source-level contract
// test verifying exports, the four mastery tiers in correct
// visual order (red → yellow → green → gray), color-source
// (MASTERY_HEX), and a11y wrapping.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SOURCE_PATH = resolve(__dirname, '..', 'GraphMasteryLegend.tsx');
const source = readFileSync(SOURCE_PATH, 'utf-8');

// ── Module exports ──────────────────────────────────────────

describe('GraphMasteryLegend module contract', () => {
  it('exports a memoized GraphMasteryLegend component', () => {
    expect(source).toContain('export const GraphMasteryLegend = memo(');
  });

  it('exports the props interface', () => {
    expect(source).toContain('export interface GraphMasteryLegendProps');
  });

  it('takes a single `t` (i18n) prop typed as GraphI18nStrings', () => {
    expect(source).toMatch(/t:\s*GraphI18nStrings/);
  });

  it('imports MASTERY_HEX from the canonical mindmap types module', () => {
    expect(source).toContain("import { MASTERY_HEX } from '@/app/types/mindmap'");
  });

  it('imports memo from react', () => {
    expect(source).toMatch(/import\s*\{\s*memo\s*\}\s*from\s*'react'/);
  });
});

// ── Mastery tier order (red → yellow → green → gray) ────────

describe('Mastery tier rendering order', () => {
  it('renders red first (low mastery)', () => {
    const ix = source.indexOf('MASTERY_HEX.red');
    expect(ix).toBeGreaterThan(-1);
    expect(ix).toBeLessThan(source.indexOf('MASTERY_HEX.yellow'));
  });

  it('renders yellow second (mid mastery)', () => {
    expect(source.indexOf('MASTERY_HEX.yellow')).toBeLessThan(source.indexOf('MASTERY_HEX.green'));
  });

  it('renders green third (high mastery)', () => {
    expect(source.indexOf('MASTERY_HEX.green')).toBeLessThan(source.indexOf('MASTERY_HEX.gray'));
  });

  it('renders gray last (no mastery / unrated)', () => {
    expect(source).toContain('MASTERY_HEX.gray');
  });

  it('uses i18n labels for each tier (not hardcoded text)', () => {
    expect(source).toContain('t.masteryLow');
    expect(source).toContain('t.masteryMid');
    expect(source).toContain('t.masteryHigh');
    expect(source).toContain('t.masteryNone');
  });

  it('uses t.masteryLegend for the panel header + aria-label', () => {
    // Used twice: once as visible header, once as aria-label
    const matches = source.match(/t\.masteryLegend/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

// ── Accessibility ───────────────────────────────────────────

describe('Accessibility', () => {
  it('declares role="group" so AT announces it as a related set', () => {
    expect(source).toContain('role="group"');
  });

  it('exposes an aria-label sourced from i18n', () => {
    expect(source).toMatch(/aria-label=\{t\.masteryLegend\}/);
  });

  it('is pointer-events:none so it never blocks graph interaction', () => {
    expect(source).toContain('pointer-events-none');
  });
});

// ── Visual / responsive ─────────────────────────────────────

describe('Visual contract', () => {
  it('positions the legend at bottom-left (z-[4])', () => {
    expect(source).toContain('absolute bottom-2 left-2');
    expect(source).toContain('z-[4]');
  });

  it('hides on mobile (sm:block hidden)', () => {
    // tailwind: hidden + sm:block = mobile-hidden / desktop-shown
    expect(source).toContain('hidden sm:block');
  });

  it('uses Georgia serif for the header (design-system mandatory)', () => {
    expect(source).toContain("fontFamily: 'Georgia, serif'");
  });

  it('uses 10px swatches sized w-2.5 h-2.5', () => {
    const swatchMatches = source.match(/w-2\.5 h-2\.5 rounded-full/g) ?? [];
    expect(swatchMatches.length).toBe(4);
  });
});
