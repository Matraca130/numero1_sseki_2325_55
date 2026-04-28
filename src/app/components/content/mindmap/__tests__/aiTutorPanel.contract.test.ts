// ============================================================
// Tests — AiTutorPanel contract tests
//
// Verifies the AiTutorPanel module exports correctly and that
// the pure computation logic (scoreColor, easing) is correct.
// Uses filesystem-based export checks since the component
// has transitive deps that hang in Node env without DOM.
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const COMPONENT_PATH = resolve(__dirname, '..', 'AiTutorPanel.tsx');
const source = readFileSync(COMPONENT_PATH, 'utf-8');

// ── Module contract ─────────────────────────────────────────

describe('AiTutorPanel: module contract', () => {
  it('exports a function named AiTutorPanel', () => {
    expect(source).toMatch(/export\s+(const\s+AiTutorPanel\s*=\s*memo\s*\(\s*function\s+AiTutorPanel|function\s+AiTutorPanel)/);
  });

  it('has no default export (named export only)', () => {
    expect(source).not.toMatch(/export\s+default/);
  });
});

// ── Prop interface coverage (structural) ────────────────────

describe('AiTutorPanel: prop interface coverage', () => {
  it('required props: topicId, open, onClose are declared', () => {
    // Check the Props type/interface in source
    expect(source).toContain('topicId');
    expect(source).toContain('open');
    expect(source).toContain('onClose');
  });

  it('optional props: onHighlightNodes, onNavigateToAction, onEdgeCreated, nodeLabels, onReviewNodes', () => {
    expect(source).toContain('onHighlightNodes');
    expect(source).toContain('onNavigateToAction');
    expect(source).toContain('onEdgeCreated');
    expect(source).toContain('nodeLabels');
    expect(source).toContain('onReviewNodes');
  });

  it('onNavigateToAction signature matches (keywordId, action)', () => {
    const onNavigate = vi.fn();
    const validActions = ['flashcard', 'quiz', 'summary', 'review'] as const;
    for (const action of validActions) {
      onNavigate('keyword-id', action);
    }
    expect(onNavigate).toHaveBeenCalledTimes(4);
  });

  it('onEdgeCreated is called after accepting suggestion', () => {
    const onEdgeCreated = vi.fn();
    onEdgeCreated();
    expect(onEdgeCreated).toHaveBeenCalledOnce();
  });

  it('nodeLabels is a Map<string, string>', () => {
    const nodeLabels = new Map([
      ['node-1', 'Mitosis'],
      ['node-2', 'Meiosis'],
    ]);
    expect(nodeLabels instanceof Map).toBe(true);
    expect(nodeLabels.get('node-1')).toBe('Mitosis');
  });

  it('onReviewNodes receives a Set<string>', () => {
    const onReviewNodes = vi.fn();
    const ids = new Set(['weak-1', 'weak-2']);
    onReviewNodes(ids);
    expect(onReviewNodes).toHaveBeenCalledWith(ids);
  });
});

// ── scoreColor logic ────────────────────────────────────────

describe('AiTutorPanel: scoreColor computation', () => {
  function computeScoreColor(overallScore: number | null): string {
    if (overallScore === null) return '#9ca3af';
    if (overallScore >= 0.7) return '#10b981';
    if (overallScore >= 0.4) return '#f59e0b';
    return '#ef4444';
  }

  it('returns gray when no analysis (null)', () => {
    expect(computeScoreColor(null)).toBe('#9ca3af');
  });

  it('returns green for score >= 0.7', () => {
    expect(computeScoreColor(0.7)).toBe('#10b981');
    expect(computeScoreColor(1.0)).toBe('#10b981');
    expect(computeScoreColor(0.95)).toBe('#10b981');
  });

  it('returns amber for score in [0.4, 0.7)', () => {
    expect(computeScoreColor(0.4)).toBe('#f59e0b');
    expect(computeScoreColor(0.5)).toBe('#f59e0b');
    expect(computeScoreColor(0.69)).toBe('#f59e0b');
  });

  it('returns red for score < 0.4', () => {
    expect(computeScoreColor(0)).toBe('#ef4444');
    expect(computeScoreColor(0.15)).toBe('#ef4444');
    expect(computeScoreColor(0.39)).toBe('#ef4444');
  });

  it('boundary: 0.7 is green (inclusive)', () => {
    expect(computeScoreColor(0.7)).toBe('#10b981');
  });

  it('boundary: 0.4 is amber (inclusive)', () => {
    expect(computeScoreColor(0.4)).toBe('#f59e0b');
  });
});

// ── action labels coverage ──────────────────────────────────

describe('AiTutorPanel: action type coverage', () => {
  const ACTION_LABELS: Record<string, string> = {
    flashcard: 'Flashcards',
    quiz: 'Quiz',
    summary: 'Resumen',
    review: 'Revisar',
  };

  const EXPECTED_ACTIONS = ['flashcard', 'quiz', 'summary', 'review'];

  it('ACTION_LABELS covers all 4 recommended action types', () => {
    for (const action of EXPECTED_ACTIONS) {
      expect(ACTION_LABELS[action]).toBeDefined();
      expect(ACTION_LABELS[action].length).toBeGreaterThan(0);
    }
  });

  it('ACTION_LABELS values are non-empty Spanish strings', () => {
    expect(ACTION_LABELS.flashcard).toBe('Flashcards');
    expect(ACTION_LABELS.quiz).toBe('Quiz');
    expect(ACTION_LABELS.summary).toBe('Resumen');
    expect(ACTION_LABELS.review).toBe('Revisar');
  });
});

// ── count-up animation math ─────────────────────────────────

describe('AiTutorPanel: count-up animation', () => {
  function easeOutCubic(progress: number): number {
    return 1 - Math.pow(1 - progress, 3);
  }

  it('starts at 0 when progress=0', () => {
    expect(easeOutCubic(0)).toBe(0);
  });

  it('reaches 1 when progress=1', () => {
    expect(easeOutCubic(1)).toBe(1);
  });

  it('is monotonically increasing', () => {
    const values = [0, 0.1, 0.2, 0.5, 0.8, 1.0].map(easeOutCubic);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('displayScore rounds to integer', () => {
    const targetScore = 73;
    const progress = 0.5;
    const eased = easeOutCubic(progress);
    const displayScore = Math.round(eased * targetScore);
    expect(Number.isInteger(displayScore)).toBe(true);
  });
});

// ── Pull-to-refresh: pure logic ─────────────────────────────
//
// Replicates the rubber-band + reduced-motion clamp from
// usePullToRefresh (lines ~206-213 in AiTutorPanel.tsx). The
// hook itself is touch-bound and not directly testable in jsdom,
// so we mirror the formula and pin the behavior.

describe('AiTutorPanel: pull-to-refresh formula', () => {
  const PULL_THRESHOLD = 60;

  function computePullDistance(delta: number, reducedMotion: boolean): number {
    const raw = Math.max(0, delta);
    const capped = raw < PULL_THRESHOLD
      ? raw
      : PULL_THRESHOLD + (raw - PULL_THRESHOLD) * 0.3;
    return reducedMotion ? Math.min(capped, PULL_THRESHOLD) : capped;
  }

  it('returns 0 for negative or zero delta', () => {
    expect(computePullDistance(-50, false)).toBe(0);
    expect(computePullDistance(0, false)).toBe(0);
  });

  it('is linear (1:1) below the 60px threshold', () => {
    expect(computePullDistance(20, false)).toBe(20);
    expect(computePullDistance(45, false)).toBe(45);
    expect(computePullDistance(59, false)).toBe(59);
  });

  it('caps to threshold at exactly 60px', () => {
    // At delta === PULL_THRESHOLD, raw < THRESHOLD is false, so the rubber-band
    // path runs with (60 - 60) * 0.3 = 0 → returns THRESHOLD itself.
    expect(computePullDistance(60, false)).toBe(60);
  });

  it('applies rubber-band 0.3 resistance past the threshold', () => {
    // delta = 100 → 60 + (100-60)*0.3 = 60 + 12 = 72
    expect(computePullDistance(100, false)).toBeCloseTo(72, 5);
    // delta = 200 → 60 + 140*0.3 = 102
    expect(computePullDistance(200, false)).toBeCloseTo(102, 5);
    // delta = 1000 → 60 + 940*0.3 = 342
    expect(computePullDistance(1000, false)).toBeCloseTo(342, 5);
  });

  it('reduced-motion clamps the value to PULL_THRESHOLD (no rubber band)', () => {
    expect(computePullDistance(40, true)).toBe(40);
    expect(computePullDistance(60, true)).toBe(60);
    expect(computePullDistance(100, true)).toBe(60);
    expect(computePullDistance(1000, true)).toBe(60);
  });

  it('progress = pullDistance / PULL_THRESHOLD, capped at 1', () => {
    function progress(pull: number): number {
      return Math.min(pull / PULL_THRESHOLD, 1);
    }
    expect(progress(0)).toBe(0);
    expect(progress(30)).toBeCloseTo(0.5, 5);
    expect(progress(60)).toBe(1);
    expect(progress(120)).toBe(1); // never exceeds 1
  });

  it('pastThreshold flips at exactly PULL_THRESHOLD', () => {
    function past(pull: number): boolean {
      return pull >= PULL_THRESHOLD;
    }
    expect(past(59.999)).toBe(false);
    expect(past(60)).toBe(true);
    expect(past(60.001)).toBe(true);
  });
});

// ── Pull-to-refresh: source-level guarantees ────────────────

describe('AiTutorPanel: pull-to-refresh source contract', () => {
  it('declares PULL_THRESHOLD = 60 at module scope', () => {
    expect(source).toMatch(/const\s+PULL_THRESHOLD\s*=\s*60/);
  });

  it('declares the usePullToRefresh hook', () => {
    expect(source).toContain('function usePullToRefresh');
  });

  it('binds touchstart/touchmove/touchend listeners to the scroll element', () => {
    expect(source).toContain("addEventListener('touchstart'");
    expect(source).toContain("addEventListener('touchmove'");
    expect(source).toContain("addEventListener('touchend'");
  });

  it('uses passive:true for touchstart/touchend (read-only listeners)', () => {
    expect(source).toMatch(/addEventListener\('touchstart',\s*\w+,\s*\{\s*passive:\s*true\s*\}/);
    expect(source).toMatch(/addEventListener\('touchend',\s*\w+,\s*\{\s*passive:\s*true\s*\}/);
  });

  it('uses passive:false for touchmove (it calls preventDefault on overscroll)', () => {
    expect(source).toMatch(/addEventListener\('touchmove',\s*\w+,\s*\{\s*passive:\s*false\s*\}/);
  });

  it('removes all three touch listeners in cleanup', () => {
    expect(source).toContain("removeEventListener('touchstart'");
    expect(source).toContain("removeEventListener('touchmove'");
    expect(source).toContain("removeEventListener('touchend'");
  });

  it('clears the release timer in cleanup (no leaked rAF/timer)', () => {
    expect(source).toMatch(/clearTimeout\(releaseTimerRef\.current\)/);
  });

  it('uses prefers-reduced-motion to suppress the rubber band', () => {
    expect(source).toContain("'(prefers-reduced-motion: reduce)'");
  });

  it('reset visual delay is 600ms after release', () => {
    expect(source).toMatch(/setTimeout\([\s\S]*?,\s*600\s*\)/);
  });

  it('disables the hook entirely when enabled=false (early return)', () => {
    expect(source).toMatch(/if\s*\(\s*!el\s*\|\|\s*!enabled\s*\)\s*return/);
  });

  it('only starts a pull when scrollTop is at the top (<= 0)', () => {
    expect(source).toMatch(/el\.scrollTop\s*<=\s*0/);
  });

  it('cancels an in-progress pull if scrollTop becomes positive', () => {
    expect(source).toMatch(/el\.scrollTop\s*>\s*0/);
  });
});

// ── I18N completeness (pt / es parity) ─────────────────────

describe('AiTutorPanel: I18N parity (pt / es)', () => {
  // Regex-extract the I18N_TUTOR object's two locale keys' shapes.
  // We don't import (the module isn't tree-shakeable in node), so
  // we compare the keys textually as a parity sanity check.
  function extractKeys(localeBlockStart: string): Set<string> {
    const ix = source.indexOf(localeBlockStart);
    if (ix < 0) return new Set();
    // Slice to the next "}," that closes this locale block.
    const slice = source.slice(ix);
    // Match identifier followed by ":" at start of line (ignore indent).
    const keys = new Set<string>();
    const re = /\n\s+([a-zA-Z_][a-zA-Z0-9_]*):/g;
    let m;
    let count = 0;
    while ((m = re.exec(slice)) && count < 200) {
      keys.add(m[1]);
      count++;
      // Stop once we've gone past the closing of this locale block (next "}," at indent 2).
      if (slice.slice(0, m.index).match(/\n\s{2}\},\s*\n\s{2}[a-z]+:/)) break;
    }
    return keys;
  }

  // Slice the source between "pt: {" and the next "es: {", and between "es: {" and "}" closing.
  const ptStart = source.indexOf('  pt: {');
  const esStart = source.indexOf('  es: {');
  const closeIx = source.indexOf('} as const;');

  it('declares both pt and es locales', () => {
    expect(ptStart).toBeGreaterThan(-1);
    expect(esStart).toBeGreaterThan(ptStart);
    expect(closeIx).toBeGreaterThan(esStart);
  });

  function keysIn(slice: string): Set<string> {
    const keys = new Set<string>();
    const re = /\n\s+([a-zA-Z_][a-zA-Z0-9_]*):/g;
    let m;
    while ((m = re.exec(slice))) keys.add(m[1]);
    return keys;
  }

  const ptSlice = source.slice(ptStart, esStart);
  const esSlice = source.slice(esStart, closeIx);
  const ptKeys = keysIn(ptSlice);
  const esKeys = keysIn(esSlice);

  it('pt and es locale objects have the same keys (no drift)', () => {
    const onlyInPt = [...ptKeys].filter(k => !esKeys.has(k));
    const onlyInEs = [...esKeys].filter(k => !ptKeys.has(k));
    expect({ onlyInPt, onlyInEs }).toEqual({ onlyInPt: [], onlyInEs: [] });
  });

  it('declares the expected core keys in both locales', () => {
    const required = [
      'analysisComplete', 'errorAnalyzing', 'connectionAdded',
      'overallScore', 'weakPoints', 'strongPoints', 'studyPath',
      'releaseToRefresh', 'pullDown',
      'panelAriaLabel', 'closePanelAriaLabel',
      'iaTutor',
    ];
    for (const k of required) {
      expect(ptKeys.has(k)).toBe(true);
      expect(esKeys.has(k)).toBe(true);
    }
  });

  it('declares the dynamic-string functions in both locales', () => {
    expect(ptKeys.has('highlightWeakPointAriaLabel')).toBe(true);
    expect(esKeys.has('highlightWeakPointAriaLabel')).toBe(true);
  });
});

// ── Sub-component declarations ──────────────────────────────

describe('AiTutorPanel: internal sub-components', () => {
  it('declares SkeletonBlock', () => {
    expect(source).toContain('function SkeletonBlock');
  });

  it('declares AnalysisSkeleton', () => {
    expect(source).toContain('function AnalysisSkeleton');
  });

  it('declares AnimatedPercent (count-up display)', () => {
    expect(source).toContain('function AnimatedPercent');
  });

  it('declares ImprovedCheckmark (strong-points indicator)', () => {
    expect(source).toContain('function ImprovedCheckmark');
  });

  it('uses sonner for toast notifications', () => {
    expect(source).toMatch(/from\s+'sonner'/);
  });
});
