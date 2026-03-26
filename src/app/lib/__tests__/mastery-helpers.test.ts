// ============================================================
// Tests for mastery-helpers.ts — Delta Mastery Scale
//
// All functions under test are pure (no side effects, no DOM,
// no network). No mocks needed.
// ============================================================

import {
  getKeywordMastery,
  getDominationThreshold,
  getDeltaColor,
  getDeltaColorClasses,
  getDeltaColorLabel,
  getKeywordDeltaColor,
  getKeywordDeltaColorSafe,
  type BktState,
  type DeltaColorLevel,
} from '@/app/lib/mastery-helpers';

// ── Helper to build minimal BktState ────────────────────────

function bkt(p_know: number): BktState {
  return { subtopic_id: 'sub-1', p_know, total_attempts: 1 };
}

// ── getKeywordMastery ───────────────────────────────────────

describe('getKeywordMastery', () => {
  it('returns -1 for empty array', () => {
    expect(getKeywordMastery([])).toBe(-1);
  });

  it('returns the average p_know for 2 BktStates', () => {
    const states: BktState[] = [bkt(0.6), bkt(0.8)];
    expect(getKeywordMastery(states)).toBeCloseTo(0.7, 10);
  });

  it('returns exact p_know for a single BktState', () => {
    expect(getKeywordMastery([bkt(0.42)])).toBeCloseTo(0.42, 10);
  });
});

// ── getDominationThreshold ──────────────────────────────────

describe('getDominationThreshold', () => {
  it('returns 0.70 for clinicalPriority 0.0', () => {
    expect(getDominationThreshold(0.0)).toBeCloseTo(0.70, 10);
  });

  it('returns 0.80 for clinicalPriority 0.5', () => {
    expect(getDominationThreshold(0.5)).toBeCloseTo(0.80, 10);
  });

  it('returns 0.90 for clinicalPriority 1.0', () => {
    expect(getDominationThreshold(1.0)).toBeCloseTo(0.90, 10);
  });
});

// ── getDeltaColor ───────────────────────────────────────────

describe('getDeltaColor', () => {
  // The function computes delta = displayMastery / threshold,
  // rounded to 2 decimals. We use threshold = 1.0 so delta = mastery.

  it('returns gray for delta < 0.50', () => {
    expect(getDeltaColor(0.49, 1.0)).toBe('gray');
  });

  it('returns red for delta >= 0.50', () => {
    expect(getDeltaColor(0.50, 1.0)).toBe('red');
  });

  it('returns yellow for delta >= 0.85', () => {
    expect(getDeltaColor(0.85, 1.0)).toBe('yellow');
  });

  it('returns green for delta >= 1.00', () => {
    expect(getDeltaColor(1.00, 1.0)).toBe('green');
  });

  it('returns blue for delta >= 1.10', () => {
    expect(getDeltaColor(1.10, 1.0)).toBe('blue');
  });

  // Boundary tests
  // NOTE: getDeltaColor rounds delta to 2 decimals, so 0.499 rounds
  // to 0.50 (which is >= 0.50 → red). We must use values that stay
  // below the threshold even after Math.round(x*100)/100.
  describe('boundary values', () => {
    it('0.494 / 1.0 → gray (rounds to 0.49, below 0.50)', () => {
      expect(getDeltaColor(0.494, 1.0)).toBe('gray');
    });

    it('0.499 / 1.0 → red (rounds to 0.50, hits threshold)', () => {
      expect(getDeltaColor(0.499, 1.0)).toBe('red');
    });

    it('0.50 / 1.0 → red (exactly 0.50)', () => {
      expect(getDeltaColor(0.50, 1.0)).toBe('red');
    });

    it('0.844 / 1.0 → red (rounds to 0.84, below 0.85)', () => {
      expect(getDeltaColor(0.844, 1.0)).toBe('red');
    });

    it('0.849 / 1.0 → yellow (rounds to 0.85, hits threshold)', () => {
      expect(getDeltaColor(0.849, 1.0)).toBe('yellow');
    });

    it('0.85 / 1.0 → yellow (exactly 0.85)', () => {
      expect(getDeltaColor(0.85, 1.0)).toBe('yellow');
    });

    it('0.994 / 1.0 → yellow (rounds to 0.99, below 1.00)', () => {
      expect(getDeltaColor(0.994, 1.0)).toBe('yellow');
    });

    it('0.999 / 1.0 → green (rounds to 1.00, hits threshold)', () => {
      expect(getDeltaColor(0.999, 1.0)).toBe('green');
    });

    it('1.00 / 1.0 → green (exactly 1.00)', () => {
      expect(getDeltaColor(1.00, 1.0)).toBe('green');
    });

    it('1.094 / 1.0 → green (rounds to 1.09, below 1.10)', () => {
      expect(getDeltaColor(1.094, 1.0)).toBe('green');
    });

    it('1.099 / 1.0 → blue (rounds to 1.10, hits threshold)', () => {
      expect(getDeltaColor(1.099, 1.0)).toBe('blue');
    });

    it('1.10 / 1.0 → blue (exactly 1.10)', () => {
      expect(getDeltaColor(1.10, 1.0)).toBe('blue');
    });
  });

  it('returns gray when threshold is 0 (division by zero guard)', () => {
    expect(getDeltaColor(0.5, 0)).toBe('gray');
  });
});

// ── getDeltaColorClasses ────────────────────────────────────

describe('getDeltaColorClasses', () => {
  const levels: DeltaColorLevel[] = ['gray', 'red', 'yellow', 'green', 'blue'];
  const requiredKeys = ['bg', 'text', 'border', 'dot', 'bgLight', 'hoverBg', 'ring', 'hex'];

  for (const level of levels) {
    it(`returns object with all required keys for "${level}"`, () => {
      const classes = getDeltaColorClasses(level);
      for (const key of requiredKeys) {
        expect(classes).toHaveProperty(key);
        expect(typeof (classes as Record<string, string>)[key]).toBe('string');
      }
    });
  }

  it('gray hex is #a1a1aa', () => {
    expect(getDeltaColorClasses('gray').hex).toBe('#a1a1aa');
  });

  it('red hex is #ef4444', () => {
    expect(getDeltaColorClasses('red').hex).toBe('#ef4444');
  });

  it('yellow hex is #f59e0b', () => {
    expect(getDeltaColorClasses('yellow').hex).toBe('#f59e0b');
  });

  it('green hex is #10b981', () => {
    expect(getDeltaColorClasses('green').hex).toBe('#10b981');
  });

  it('blue hex is #3b82f6', () => {
    expect(getDeltaColorClasses('blue').hex).toBe('#3b82f6');
  });
});

// ── getDeltaColorLabel ──────────────────────────────────────

describe('getDeltaColorLabel', () => {
  it('gray → "Por descubrir"', () => {
    expect(getDeltaColorLabel('gray')).toBe('Por descubrir');
  });

  it('red → "Emergente"', () => {
    expect(getDeltaColorLabel('red')).toBe('Emergente');
  });

  it('yellow → "En progreso"', () => {
    expect(getDeltaColorLabel('yellow')).toBe('En progreso');
  });

  it('green → "Consolidado"', () => {
    expect(getDeltaColorLabel('green')).toBe('Consolidado');
  });

  it('blue → "Maestr\u00eda"', () => {
    expect(getDeltaColorLabel('blue')).toBe('Maestr\u00eda');
  });
});

// ── getKeywordDeltaColor ────────────────────────────────────

describe('getKeywordDeltaColor', () => {
  // Priority 1 (low) → clinicalPriority 0.0 → threshold 0.70
  it('priority 1: mastery 0.77 / threshold 0.70 → delta 1.10 → blue', () => {
    expect(getKeywordDeltaColor(0.77, 1)).toBe('blue');
  });

  // Priority 2 (medium) → clinicalPriority 0.5 → threshold 0.80
  it('priority 2: mastery 0.80 / threshold 0.80 → delta 1.00 → green', () => {
    expect(getKeywordDeltaColor(0.80, 2)).toBe('green');
  });

  // Priority 3 (high) → clinicalPriority 1.0 → threshold 0.90
  it('priority 3: mastery 0.45 / threshold 0.90 → delta 0.50 → red', () => {
    expect(getKeywordDeltaColor(0.45, 3)).toBe('red');
  });

  it('defaults to priority 1 when not specified', () => {
    // mastery 0.35 / threshold 0.70 = delta 0.50 → red
    expect(getKeywordDeltaColor(0.35)).toBe('red');
  });
});

// ── getKeywordDeltaColorSafe ────────────────────────────────

describe('getKeywordDeltaColorSafe', () => {
  it('returns gray for null mastery', () => {
    expect(getKeywordDeltaColorSafe(null)).toBe('gray');
  });

  it('returns gray for -1 mastery (no data sentinel)', () => {
    expect(getKeywordDeltaColorSafe(-1)).toBe('gray');
  });

  it('returns gray for any negative mastery', () => {
    expect(getKeywordDeltaColorSafe(-0.5)).toBe('gray');
  });

  it('delegates to getKeywordDeltaColor for valid mastery', () => {
    // mastery 0.77 / priority 1 → threshold 0.70 → delta 1.10 → blue
    expect(getKeywordDeltaColorSafe(0.77, 1)).toBe('blue');
  });

  it('delegates to getKeywordDeltaColor with priority 3', () => {
    // mastery 0.80 / priority 3 → threshold 0.90 → delta ~0.89 → yellow
    expect(getKeywordDeltaColorSafe(0.80, 3)).toBe('yellow');
  });
});
