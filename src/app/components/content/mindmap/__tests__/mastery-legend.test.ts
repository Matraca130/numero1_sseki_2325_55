// ============================================================
// Tests — Mastery Legend (color thresholds + completeness)
//
// Verifies that mastery color thresholds in graphHelpers match
// the legend data, and that all mastery levels are represented.
// ============================================================

import { describe, it, expect } from 'vitest';
import { getNodeFill, getNodeStroke } from '../graphHelpers';
import {
  MASTERY_HEX,
  MASTERY_HEX_LIGHT,
} from '@/app/types/mindmap';
import {
  getMasteryColor,
  getSafeMasteryColor,
  getMasteryLabel,
} from '@/app/lib/mastery-helpers';
import type { MasteryColor } from '@/app/lib/mastery-helpers';

// ── All mastery colors ──────────────────────────────────────

const ALL_MASTERY_COLORS: MasteryColor[] = ['green', 'yellow', 'red', 'gray'];

// ── Threshold consistency ───────────────────────────────────

describe('Mastery color thresholds', () => {
  it('green = mastery >= 0.80', () => {
    expect(getMasteryColor(0.80)).toBe('green');
    expect(getMasteryColor(0.99)).toBe('green');
    expect(getMasteryColor(1.00)).toBe('green');
  });

  it('yellow = mastery >= 0.50 and < 0.80', () => {
    expect(getMasteryColor(0.50)).toBe('yellow');
    expect(getMasteryColor(0.79)).toBe('yellow');
  });

  it('red = mastery < 0.50', () => {
    expect(getMasteryColor(0.49)).toBe('red');
    expect(getMasteryColor(0.00)).toBe('red');
  });

  it('gray = safe mastery for negative values (no data)', () => {
    expect(getSafeMasteryColor(-1)).toBe('gray');
    expect(getSafeMasteryColor(-0.5)).toBe('gray');
  });

  it('safe mastery delegates to getMasteryColor for non-negative', () => {
    expect(getSafeMasteryColor(0.85)).toBe('green');
    expect(getSafeMasteryColor(0.60)).toBe('yellow');
    expect(getSafeMasteryColor(0.30)).toBe('red');
  });
});

// ── graphHelpers color consistency ──────────────────────────

describe('graphHelpers color map matches MASTERY_HEX constants', () => {
  it('getNodeFill returns MASTERY_HEX_LIGHT values', () => {
    for (const color of ALL_MASTERY_COLORS) {
      expect(getNodeFill(color)).toBe(MASTERY_HEX_LIGHT[color]);
    }
  });

  it('getNodeStroke returns MASTERY_HEX values', () => {
    for (const color of ALL_MASTERY_COLORS) {
      expect(getNodeStroke(color)).toBe(MASTERY_HEX[color]);
    }
  });
});

// ── MASTERY_HEX completeness ────────────────────────────────

describe('MASTERY_HEX completeness', () => {
  it('MASTERY_HEX has entries for all 4 mastery colors', () => {
    for (const color of ALL_MASTERY_COLORS) {
      expect(MASTERY_HEX[color]).toBeDefined();
      expect(MASTERY_HEX[color]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('MASTERY_HEX_LIGHT has entries for all 4 mastery colors', () => {
    for (const color of ALL_MASTERY_COLORS) {
      expect(MASTERY_HEX_LIGHT[color]).toBeDefined();
      expect(MASTERY_HEX_LIGHT[color]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('fill and stroke colors differ for each mastery level', () => {
    for (const color of ALL_MASTERY_COLORS) {
      expect(MASTERY_HEX[color]).not.toBe(MASTERY_HEX_LIGHT[color]);
    }
  });
});

// ── Legend labels completeness ───────────────────────────────

describe('Legend labels completeness', () => {
  it('getMasteryLabel returns a label for every mastery color (es)', () => {
    for (const color of ALL_MASTERY_COLORS) {
      const label = getMasteryLabel(color, 'es');
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('getMasteryLabel returns a label for every mastery color (pt)', () => {
    for (const color of ALL_MASTERY_COLORS) {
      const label = getMasteryLabel(color, 'pt');
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('Spanish labels are distinct from each other', () => {
    const labels = ALL_MASTERY_COLORS.map(c => getMasteryLabel(c, 'es'));
    expect(new Set(labels).size).toBe(4);
  });

  it('Portuguese labels are distinct from each other', () => {
    const labels = ALL_MASTERY_COLORS.map(c => getMasteryLabel(c, 'pt'));
    expect(new Set(labels).size).toBe(4);
  });
});

// ── Legend data matches graphHelpers ─────────────────────────

describe('Legend data matches graphHelpers colors', () => {
  it('legend hex values used as fill match getNodeFill output', () => {
    const legendData = ALL_MASTERY_COLORS.map(color => ({
      color,
      fill: MASTERY_HEX_LIGHT[color],
      stroke: MASTERY_HEX[color],
    }));

    for (const entry of legendData) {
      expect(getNodeFill(entry.color)).toBe(entry.fill);
      expect(getNodeStroke(entry.color)).toBe(entry.stroke);
    }
  });

  it('every MASTERY_HEX value is a visible color (not transparent or white)', () => {
    for (const color of ALL_MASTERY_COLORS) {
      const hex = MASTERY_HEX[color];
      expect(hex).not.toBe('#ffffff');
      expect(hex).not.toBe('#000000');
    }
  });
});
