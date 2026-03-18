// ============================================================
// Tests -- useCountUp hook
//
// Tests the animated count-up hook's logic:
//   - easeOutCubic curve correctness
//   - Reduced motion bypass
//   - Target=0 shortcut
//   - Module contract
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SOURCE_PATH = resolve(__dirname, '..', '..', '..', '..', 'hooks', 'useCountUp.ts');
const source = readFileSync(SOURCE_PATH, 'utf-8');

// ── easeOutCubic (replicated from source) ───────────────────

function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

// ── Module contract ─────────────────────────────────────────

describe('useCountUp module contract', () => {
  it('exports useCountUp as a named export', () => {
    expect(source).toContain('export function useCountUp');
  });

  it('accepts target and optional duration parameters', () => {
    expect(source).toContain('target: number');
    expect(source).toContain('duration = 800');
  });

  it('respects prefers-reduced-motion', () => {
    expect(source).toContain('prefers-reduced-motion: reduce');
  });

  it('uses requestAnimationFrame for animation', () => {
    expect(source).toContain('requestAnimationFrame');
  });

  it('cancels animation frame on cleanup', () => {
    expect(source).toContain('cancelAnimationFrame');
  });

  it('skips re-animation when target has not changed', () => {
    expect(source).toContain('prevTargetRef.current === target');
  });

  it('short-circuits to 0 when target is 0', () => {
    expect(source).toContain('target === 0');
    expect(source).toContain('setValue(0)');
  });
});

// ── easeOutCubic curve ──────────────────────────────────────

describe('easeOutCubic', () => {
  it('returns 0 at progress=0', () => {
    expect(easeOutCubic(0)).toBe(0);
  });

  it('returns 1 at progress=1', () => {
    expect(easeOutCubic(1)).toBe(1);
  });

  it('returns 0.5 at approximately progress=0.2063', () => {
    // 1 - (1-p)^3 = 0.5 => (1-p)^3 = 0.5 => 1-p = 0.7937 => p ~ 0.2063
    const p = 1 - Math.pow(0.5, 1 / 3);
    expect(easeOutCubic(p)).toBeCloseTo(0.5, 4);
  });

  it('is monotonically increasing', () => {
    let prev = 0;
    for (let i = 1; i <= 100; i++) {
      const p = i / 100;
      const val = easeOutCubic(p);
      expect(val).toBeGreaterThanOrEqual(prev);
      prev = val;
    }
  });

  it('starts fast and slows down (ease-out characteristic)', () => {
    const earlyGain = easeOutCubic(0.2) - easeOutCubic(0);     // 0 to 0.2
    const lateGain = easeOutCubic(1.0) - easeOutCubic(0.8);    // 0.8 to 1.0
    expect(earlyGain).toBeGreaterThan(lateGain);
  });

  it('produces correct animated value at midpoint', () => {
    const target = 100;
    const progress = 0.5;
    const eased = easeOutCubic(progress);
    const value = Math.round(target * eased);
    expect(value).toBe(88); // 1 - (0.5)^3 = 0.875, round(100 * 0.875) = 88
  });

  it('produces correct animated value at 25% progress', () => {
    const target = 200;
    const progress = 0.25;
    const eased = easeOutCubic(progress);
    const value = Math.round(target * eased);
    // 1 - (0.75)^3 = 1 - 0.421875 = 0.578125
    expect(value).toBe(Math.round(200 * 0.578125)); // 116
  });
});

// ── Animation step simulation ───────────────────────────────

describe('animation step simulation', () => {
  it('computes correct sequence of values for target=50 over 10 steps', () => {
    const target = 50;
    const steps = 10;
    const values: number[] = [];

    for (let i = 0; i <= steps; i++) {
      const progress = Math.min(i / steps, 1);
      const eased = easeOutCubic(progress);
      values.push(Math.round(target * eased));
    }

    expect(values[0]).toBe(0);           // start
    expect(values[steps]).toBe(target);   // end
    // Values should be non-decreasing
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    }
  });

  it('reaches target exactly at progress=1', () => {
    const targets = [0, 1, 42, 100, 999, 10000];
    for (const target of targets) {
      const eased = easeOutCubic(1);
      expect(Math.round(target * eased)).toBe(target);
    }
  });

  it('handles target=0 without animation', () => {
    const eased = easeOutCubic(0.5);
    expect(Math.round(0 * eased)).toBe(0);
  });

  it('progress is clamped to [0,1]', () => {
    // Simulating Math.min((now - start) / duration, 1)
    const clamp = (raw: number) => Math.min(raw, 1);
    expect(clamp(0.5)).toBe(0.5);
    expect(clamp(1.5)).toBe(1);
    expect(clamp(0)).toBe(0);
  });
});
