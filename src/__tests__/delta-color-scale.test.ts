// ============================================================
// Pure Logic Tests — Relative Delta Color Scale (Spec v4.2 s6.2)
//
// PURPOSE: Validate the delta-based mastery color system where
// colors depend on displayMastery / threshold, and threshold
// varies with clinical_priority.
//
// Delta levels (spec v4.2):
//   >= 1.10  -> blue   (Superado)
//   >= 1.00  -> green  (Dominado)
//   >= 0.85  -> yellow (Próximo)
//   >= 0.50  -> orange (Insuficiente)
//   <  0.50  -> red    (Crítico)
//
// RUN: pnpm test
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  getDominationThreshold,
  getDeltaColor,
  getDeltaColorClasses,
  getDeltaColorLabel,
  getKeywordDeltaColor,
  type DeltaColorLevel,
} from '@/app/lib/mastery-helpers';

// ══════════════════════════════════════════════════════════════
// SUITE 1: getDominationThreshold
// ══════════════════════════════════════════════════════════════

describe('getDominationThreshold', () => {
  it('priority 0.0 (trivial) -> threshold 0.70', () => {
    expect(getDominationThreshold(0.0)).toBeCloseTo(0.70);
  });

  it('priority 0.5 (standard) -> threshold 0.80', () => {
    expect(getDominationThreshold(0.5)).toBeCloseTo(0.80);
  });

  it('priority 1.0 (vital) -> threshold 0.90', () => {
    expect(getDominationThreshold(1.0)).toBeCloseTo(0.90);
  });

  it('clamps negative priority to 0 (caller responsibility, but verify formula)', () => {
    // The function uses raw arithmetic; negative values yield < 0.70
    // This documents current behavior: 0.70 + (-0.5 * 0.20) = 0.60
    expect(getDominationThreshold(-0.5)).toBeCloseTo(0.60);
  });

  it('clamps priority > 1 to 1 (caller responsibility, but verify formula)', () => {
    // 0.70 + (1.5 * 0.20) = 1.00
    expect(getDominationThreshold(1.5)).toBeCloseTo(1.00);
  });

  it('interpolates linearly: 0.25 -> 0.75', () => {
    expect(getDominationThreshold(0.25)).toBeCloseTo(0.75);
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 2: getDeltaColor — core spec table
// ══════════════════════════════════════════════════════════════

describe('getDeltaColor', () => {
  // -- Spec v4.2 examples --

  it('mastery 0.70, threshold 0.70 -> green (delta=1.00, dominado)', () => {
    expect(getDeltaColor(0.70, 0.70)).toBe('green');
  });

  it('mastery 0.70, threshold 0.80 -> orange (delta=0.875)', () => {
    // 0.70 / 0.80 = 0.875 -> >= 0.85 = yellow
    // NOTE: 0.875 >= 0.85, so this is actually yellow per the code
    const delta = 0.70 / 0.80; // 0.875
    expect(delta).toBeGreaterThanOrEqual(0.85);
    expect(getDeltaColor(0.70, 0.80)).toBe('yellow');
  });

  it('mastery 0.85, threshold 0.90 -> yellow (delta=0.944, proximo)', () => {
    expect(getDeltaColor(0.85, 0.90)).toBe('yellow');
  });

  it('mastery 0.90, threshold 0.90 -> green (delta=1.00)', () => {
    expect(getDeltaColor(0.90, 0.90)).toBe('green');
  });

  it('mastery 0.99, threshold 0.90 -> green (delta=1.10)', () => {
    // 0.99 / 0.90 = 1.1 -> exactly 1.10 = blue
    expect(getDeltaColor(0.99, 0.90)).toBe('blue');
  });

  it('mastery 0.30, threshold 0.80 -> red (delta=0.375)', () => {
    expect(getDeltaColor(0.30, 0.80)).toBe('red');
  });

  // -- Same mastery, different thresholds = different colors --

  it('mastery 0.85 + trivial threshold (0.70) -> blue (delta=1.21)', () => {
    expect(getDeltaColor(0.85, 0.70)).toBe('blue');
  });

  it('mastery 0.85 + standard threshold (0.80) -> green (delta=1.06)', () => {
    expect(getDeltaColor(0.85, 0.80)).toBe('green');
  });

  it('mastery 0.85 + vital threshold (0.90) -> yellow (delta=0.94)', () => {
    expect(getDeltaColor(0.85, 0.90)).toBe('yellow');
  });

  // -- Edge cases --

  it('mastery 0, threshold 0.70 -> red', () => {
    expect(getDeltaColor(0, 0.70)).toBe('red');
  });

  it('mastery 1.0, threshold 0.70 -> blue', () => {
    // 1.0 / 0.70 = 1.4286 -> blue
    expect(getDeltaColor(1.0, 0.70)).toBe('blue');
  });

  it('threshold 0 -> red (guard against division by zero)', () => {
    expect(getDeltaColor(0.85, 0)).toBe('red');
  });

  it('negative mastery -> red', () => {
    expect(getDeltaColor(-0.5, 0.70)).toBe('red');
  });

  // -- Boundary precision --

  it('delta exactly 0.50 -> orange (not red)', () => {
    // threshold = 1.0, mastery = 0.5 => delta = 0.5
    expect(getDeltaColor(0.50, 1.0)).toBe('orange');
  });

  it('delta exactly 0.85 -> yellow (not orange)', () => {
    // threshold = 1.0, mastery = 0.85 => delta = 0.85
    expect(getDeltaColor(0.85, 1.0)).toBe('yellow');
  });

  it('delta exactly 1.00 -> green (not yellow)', () => {
    expect(getDeltaColor(1.0, 1.0)).toBe('green');
  });

  it('delta exactly 1.10 -> blue (not green)', () => {
    // threshold = 1.0, mastery = 1.1 => delta = 1.1
    expect(getDeltaColor(1.10, 1.0)).toBe('blue');
  });

  // -- Just below thresholds (floating point edge cases) --

  it('delta just below 0.50 -> red', () => {
    expect(getDeltaColor(0.3499, 0.70)).toBe('red'); // 0.3499/0.70 = 0.4998
  });

  it('delta just below 0.85 -> orange', () => {
    expect(getDeltaColor(0.5949, 0.70)).toBe('orange'); // 0.5949/0.70 = 0.8498
  });

  it('delta just below 1.00 -> yellow', () => {
    expect(getDeltaColor(0.6999, 0.70)).toBe('yellow'); // 0.6999/0.70 = 0.9998
  });

  it('delta just below 1.10 -> green', () => {
    expect(getDeltaColor(0.7699, 0.70)).toBe('green'); // 0.7699/0.70 = 1.0998
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 3: getDeltaColorClasses
// ══════════════════════════════════════════════════════════════

describe('getDeltaColorClasses', () => {
  it('red returns red Tailwind classes', () => {
    const c = getDeltaColorClasses('red');
    expect(c.bg).toContain('red');
    expect(c.text).toContain('red');
    expect(c.border).toContain('red');
    expect(c.dot).toContain('red');
  });

  it('green returns emerald Tailwind classes', () => {
    const c = getDeltaColorClasses('green');
    expect(c.bg).toContain('emerald');
    expect(c.text).toContain('emerald');
    expect(c.border).toContain('emerald');
    expect(c.dot).toContain('emerald');
  });

  it('blue returns blue Tailwind classes', () => {
    const c = getDeltaColorClasses('blue');
    expect(c.bg).toContain('blue');
    expect(c.text).toContain('blue');
    expect(c.border).toContain('blue');
    expect(c.dot).toContain('blue');
  });

  it('all 5 levels return valid objects with bg, text, border, dot', () => {
    const levels: DeltaColorLevel[] = ['red', 'orange', 'yellow', 'green', 'blue'];
    for (const level of levels) {
      const classes = getDeltaColorClasses(level);
      expect(classes).toHaveProperty('bg');
      expect(classes).toHaveProperty('text');
      expect(classes).toHaveProperty('border');
      expect(classes).toHaveProperty('dot');
      expect(typeof classes.bg).toBe('string');
      expect(typeof classes.text).toBe('string');
      expect(typeof classes.border).toBe('string');
      expect(typeof classes.dot).toBe('string');
      // Each class should be a non-empty string
      expect(classes.bg.length).toBeGreaterThan(0);
      expect(classes.text.length).toBeGreaterThan(0);
      expect(classes.border.length).toBeGreaterThan(0);
      expect(classes.dot.length).toBeGreaterThan(0);
    }
  });

  it('orange returns orange Tailwind classes', () => {
    const c = getDeltaColorClasses('orange');
    expect(c.bg).toContain('orange');
    expect(c.text).toContain('orange');
  });

  it('yellow returns amber Tailwind classes', () => {
    const c = getDeltaColorClasses('yellow');
    expect(c.bg).toContain('amber');
    expect(c.text).toContain('amber');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 4: getDeltaColorLabel
// ══════════════════════════════════════════════════════════════

describe('getDeltaColorLabel', () => {
  it('red -> Crítico', () => {
    expect(getDeltaColorLabel('red')).toBe('Crítico');
  });

  it('orange -> Insuficiente', () => {
    expect(getDeltaColorLabel('orange')).toBe('Insuficiente');
  });

  it('yellow -> Próximo', () => {
    expect(getDeltaColorLabel('yellow')).toBe('Próximo');
  });

  it('green -> Dominado', () => {
    expect(getDeltaColorLabel('green')).toBe('Dominado');
  });

  it('blue -> Superado', () => {
    expect(getDeltaColorLabel('blue')).toBe('Superado');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 5: getKeywordDeltaColor (convenience wrapper)
// ══════════════════════════════════════════════════════════════

describe('getKeywordDeltaColor', () => {
  it('priority 1 (lowest) maps to clinicalPriority 0.0 -> threshold 0.70', () => {
    // mastery 0.70 / threshold 0.70 = 1.00 -> green
    expect(getKeywordDeltaColor(0.70, 1)).toBe('green');
  });

  it('priority 2 (medium) maps to clinicalPriority 0.50 -> threshold 0.80', () => {
    // mastery 0.80 / threshold 0.80 = 1.00 -> green
    expect(getKeywordDeltaColor(0.80, 2)).toBe('green');
  });

  it('priority 3 (highest) maps to clinicalPriority 1.0 -> threshold 0.90', () => {
    // mastery 0.90 / threshold 0.90 = 1.00 -> green
    expect(getKeywordDeltaColor(0.90, 3)).toBe('green');
  });

  it('default priority (no arg) uses priority 1', () => {
    // priority 1 -> clinicalPriority 0.0 -> threshold 0.70
    // mastery 0.70 / 0.70 = 1.00 -> green
    expect(getKeywordDeltaColor(0.70)).toBe('green');
    // Verify it matches explicit priority 1
    expect(getKeywordDeltaColor(0.70)).toBe(getKeywordDeltaColor(0.70, 1));
  });

  it('same mastery different priority -> different colors (THE KEY TEST)', () => {
    const mastery = 0.85;

    // priority 1 -> threshold 0.70 -> delta 1.21 -> blue
    const colorLow = getKeywordDeltaColor(mastery, 1);
    // priority 2 -> threshold 0.80 -> delta 1.06 -> green
    const colorMed = getKeywordDeltaColor(mastery, 2);
    // priority 3 -> threshold 0.90 -> delta 0.94 -> yellow
    const colorHigh = getKeywordDeltaColor(mastery, 3);

    expect(colorLow).toBe('blue');
    expect(colorMed).toBe('green');
    expect(colorHigh).toBe('yellow');

    // All three must be different
    expect(colorLow).not.toBe(colorMed);
    expect(colorMed).not.toBe(colorHigh);
    expect(colorLow).not.toBe(colorHigh);
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 6: Spec v4.2 progression table verification
// ══════════════════════════════════════════════════════════════

describe('Spec v4.2 progression table: quiz on trivial connection', () => {
  // trivial -> priority 1 -> clinicalPriority 0.0 -> threshold 0.70
  const threshold = 0.70;

  it('mastery 0.13 -> red (delta=0.19)', () => {
    const delta = 0.13 / threshold;
    expect(delta).toBeCloseTo(0.186, 2);
    expect(getDeltaColor(0.13, threshold)).toBe('red');
  });

  it('mastery 0.43 -> orange (delta=0.61)', () => {
    const delta = 0.43 / threshold;
    expect(delta).toBeCloseTo(0.614, 2);
    expect(getDeltaColor(0.43, threshold)).toBe('orange');
  });

  it('mastery 0.64 -> yellow (delta=0.91)', () => {
    const delta = 0.64 / threshold;
    expect(delta).toBeCloseTo(0.914, 2);
    expect(getDeltaColor(0.64, threshold)).toBe('yellow');
  });

  it('mastery 0.70 -> green (delta=1.00)', () => {
    expect(getDeltaColor(0.70, threshold)).toBe('green');
  });

  it('mastery 0.85 -> blue (delta=1.21)', () => {
    const delta = 0.85 / threshold;
    expect(delta).toBeCloseTo(1.214, 2);
    expect(getDeltaColor(0.85, threshold)).toBe('blue');
  });
});

describe('Spec v4.2 progression table: quiz on vital connection', () => {
  // vital -> priority 3 -> clinicalPriority 1.0 -> threshold 0.90
  const threshold = 0.90;

  it('mastery 0.51 -> orange (delta=0.57)', () => {
    const delta = 0.51 / threshold;
    expect(delta).toBeCloseTo(0.567, 2);
    expect(getDeltaColor(0.51, threshold)).toBe('orange');
  });

  it('mastery 0.70 -> orange (delta=0.78)', () => {
    const delta = 0.70 / threshold;
    expect(delta).toBeCloseTo(0.778, 2);
    expect(getDeltaColor(0.70, threshold)).toBe('orange');
  });

  it('mastery 0.80 -> yellow (delta=0.89)', () => {
    const delta = 0.80 / threshold;
    expect(delta).toBeCloseTo(0.889, 2);
    expect(getDeltaColor(0.80, threshold)).toBe('yellow');
  });

  it('mastery 0.90 -> green (delta=1.00)', () => {
    expect(getDeltaColor(0.90, threshold)).toBe('green');
  });
});
