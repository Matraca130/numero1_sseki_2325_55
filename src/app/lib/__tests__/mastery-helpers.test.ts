/**
 * src/app/lib/__tests__/mastery-helpers.test.ts — 20 tests
 * Tests for mastery color/label/Tailwind utilities.
 * Pure functions, zero DOM dependency.
 *
 * Thresholds (from source):
 *   green  >= 0.80 (Dominado)
 *   yellow >= 0.50 (Aprendiendo)
 *   red    <  0.50 (Debil)
 *   gray   = -1 sentinel (Sin datos)
 *
 * Run: npx vitest run src/app/lib/__tests__/mastery-helpers.test.ts
 */
import { describe, it, expect } from 'vitest';
import {
  getMasteryColor,
  getSafeMasteryColor,
  getMasteryLabel,
  getKeywordMastery,
  getMasteryTailwind,
} from '../mastery-helpers';
import type { BktState, MasteryColor } from '../mastery-helpers';

describe('mastery-helpers', () => {
  // ═══ getMasteryColor ═══
  describe('getMasteryColor', () => {
    it('green for pKnow >= 0.80', () => {
      expect(getMasteryColor(0.80)).toBe('green');
      expect(getMasteryColor(0.95)).toBe('green');
      expect(getMasteryColor(1.0)).toBe('green');
    });

    it('yellow for 0.50 <= pKnow < 0.80', () => {
      expect(getMasteryColor(0.50)).toBe('yellow');
      expect(getMasteryColor(0.79)).toBe('yellow');
    });

    it('red for pKnow < 0.50', () => {
      expect(getMasteryColor(0.0)).toBe('red');
      expect(getMasteryColor(0.49)).toBe('red');
    });

    it('boundary: 0.7999 is yellow, 0.80 is green', () => {
      expect(getMasteryColor(0.7999)).toBe('yellow');
      expect(getMasteryColor(0.80)).toBe('green');
    });

    it('boundary: 0.4999 is red, 0.50 is yellow', () => {
      expect(getMasteryColor(0.4999)).toBe('red');
      expect(getMasteryColor(0.50)).toBe('yellow');
    });
  });

  // ═══ getSafeMasteryColor (M-6 FIX) ═══
  describe('getSafeMasteryColor', () => {
    it('returns gray for -1 sentinel (no data)', () => {
      expect(getSafeMasteryColor(-1)).toBe('gray');
    });

    it('returns gray for any negative value', () => {
      expect(getSafeMasteryColor(-0.5)).toBe('gray');
    });

    it('delegates to getMasteryColor for non-negative values', () => {
      expect(getSafeMasteryColor(0.9)).toBe('green');
      expect(getSafeMasteryColor(0.6)).toBe('yellow');
      expect(getSafeMasteryColor(0.2)).toBe('red');
    });

    it('handles 0 as red (NOT gray — 0 is valid data)', () => {
      expect(getSafeMasteryColor(0)).toBe('red');
    });
  });

  // ═══ getMasteryLabel ═══
  describe('getMasteryLabel', () => {
    it('green → Dominado', () => expect(getMasteryLabel('green')).toBe('Dominado'));
    it('yellow → Aprendiendo', () => expect(getMasteryLabel('yellow')).toBe('Aprendiendo'));
    it('red → Debil', () => expect(getMasteryLabel('red')).toBe('Debil'));
    it('gray → Sin datos', () => expect(getMasteryLabel('gray')).toBe('Sin datos'));
  });

  // ═══ getKeywordMastery ═══
  describe('getKeywordMastery', () => {
    const makeBkt = (pKnow: number): BktState => ({
      subtopic_id: `sub-${pKnow}`,
      p_know: pKnow,
      total_attempts: 5,
    });

    it('returns -1 for empty array (no data sentinel)', () => {
      expect(getKeywordMastery([])).toBe(-1);
    });

    it('returns pKnow for single subtopic', () => {
      expect(getKeywordMastery([makeBkt(0.75)])).toBeCloseTo(0.75);
    });

    it('returns average of multiple subtopics', () => {
      // (0.8 + 0.6 + 0.4) / 3 = 0.6
      const bkts = [makeBkt(0.8), makeBkt(0.6), makeBkt(0.4)];
      expect(getKeywordMastery(bkts)).toBeCloseTo(0.6);
    });

    it('handles all zeros', () => {
      expect(getKeywordMastery([makeBkt(0), makeBkt(0)])).toBe(0);
    });

    it('handles all ones', () => {
      expect(getKeywordMastery([makeBkt(1), makeBkt(1)])).toBe(1);
    });
  });

  // ═══ getMasteryTailwind ═══
  describe('getMasteryTailwind', () => {
    const allColors: MasteryColor[] = ['green', 'yellow', 'red', 'gray'];

    it('returns all 5 required keys for every color', () => {
      for (const color of allColors) {
        const result = getMasteryTailwind(color);
        expect(result).toHaveProperty('bg');
        expect(result).toHaveProperty('text');
        expect(result).toHaveProperty('ring');
        expect(result).toHaveProperty('bgLight');
        expect(result).toHaveProperty('textDark');
      }
    });

    it('green uses emerald-500 classes', () => {
      const r = getMasteryTailwind('green');
      expect(r.bg).toContain('emerald');
      expect(r.text).toContain('emerald');
    });

    it('yellow uses amber-500 classes', () => {
      expect(getMasteryTailwind('yellow').bg).toContain('amber');
    });

    it('red uses red-500 classes', () => {
      expect(getMasteryTailwind('red').bg).toContain('red');
    });

    it('gray uses zinc classes', () => {
      expect(getMasteryTailwind('gray').bg).toContain('zinc');
    });
  });
});
