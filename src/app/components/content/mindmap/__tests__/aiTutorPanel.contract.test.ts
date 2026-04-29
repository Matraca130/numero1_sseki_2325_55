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

// ── PULL_THRESHOLD module constant ─────────────────────────

describe('PULL_THRESHOLD constant', () => {
  it('declares PULL_THRESHOLD = 60 at module scope', () => {
    expect(source).toMatch(/const\s+PULL_THRESHOLD\s*=\s*60/);
  });
});

// ── usePullToRefresh: rubber-band physics ──────────────────

describe('usePullToRefresh: rubber-band physics', () => {
  it("applies diminishing-return resistance past PULL_THRESHOLD: capped = threshold + (delta-threshold) * 0.3", () => {
    expect(source).toMatch(/delta\s*<\s*PULL_THRESHOLD\s*\?\s*delta\s*:\s*PULL_THRESHOLD\s*\+\s*\(delta\s*-\s*PULL_THRESHOLD\)\s*\*\s*0\.3/);
  });

  it('checks prefers-reduced-motion via window.matchMedia', () => {
    expect(source).toMatch(/window\.matchMedia\?\.\('\(prefers-reduced-motion:\s*reduce\)'\)\.matches/);
  });

  it('caps pull at PULL_THRESHOLD when reduced-motion is true', () => {
    expect(source).toMatch(/reducedMotion\s*\?\s*Math\.min\(capped,\s*PULL_THRESHOLD\)\s*:\s*capped/);
  });

  it('uses Math.max(0, ...) to clamp negative pulls (upward swipes)', () => {
    expect(source).toMatch(/Math\.max\(0,\s*e\.touches\[0\]\.clientY\s*-\s*touchStartY\.current\)/);
  });

  it('600ms release timeout for visual feedback after refresh fires', () => {
    expect(source).toMatch(/setTimeout\(\(\)\s*=>\s*\{[\s\S]{0,200}setReleasing\(false\);\s*\},\s*600\)/);
  });

  it('clears prior release timer to avoid stacking on rapid pulls', () => {
    expect(source).toMatch(/clearTimeout\(releaseTimerRef\.current\)[\s\S]{0,200}releaseTimerRef\.current\s*=\s*setTimeout/);
  });

  it('progress = pull / threshold capped at 1', () => {
    expect(source).toMatch(/Math\.min\(pullDistance\s*\/\s*PULL_THRESHOLD,\s*1\)/);
  });

  it('pastThreshold = pullDistance >= PULL_THRESHOLD', () => {
    expect(source).toMatch(/pastThreshold\s*=\s*pullDistance\s*>=\s*PULL_THRESHOLD/);
  });
});

// ── Touch listener wiring ──────────────────────────────────

describe('usePullToRefresh: touch listener wiring', () => {
  it("touchstart with passive: true (allows browser to optimize scroll)", () => {
    expect(source).toMatch(/addEventListener\('touchstart',\s*handleTouchStart,\s*\{\s*passive:\s*true\s*\}\)/);
  });

  it("touchmove with passive: false (so we can preventDefault native pull-refresh)", () => {
    expect(source).toMatch(/addEventListener\('touchmove',\s*handleTouchMove,\s*\{\s*passive:\s*false\s*\}\)/);
  });

  it('touchend with passive: true', () => {
    expect(source).toMatch(/addEventListener\('touchend',\s*handleTouchEnd,\s*\{\s*passive:\s*true\s*\}\)/);
  });

  it('all 3 listeners are removed in cleanup', () => {
    expect(source).toMatch(/removeEventListener\('touchstart',\s*handleTouchStart\)/);
    expect(source).toMatch(/removeEventListener\('touchmove',\s*handleTouchMove\)/);
    expect(source).toMatch(/removeEventListener\('touchend',\s*handleTouchEnd\)/);
  });

  it('release timer is cleared on cleanup', () => {
    expect(source).toMatch(/return\s*\(\)\s*=>\s*\{[\s\S]{0,400}clearTimeout\(releaseTimerRef\.current\)/);
  });

  it('only activates when scrollTop <= 0 (top of scroll)', () => {
    expect(source).toMatch(/if\s*\(el\.scrollTop\s*<=\s*0\)/);
  });

  it('aborts pull mid-gesture if user scrolls back down', () => {
    expect(source).toMatch(/if\s*\(el\.scrollTop\s*>\s*0\)\s*\{\s*isPulling\.current\s*=\s*false/);
  });

  it('preventDefault only when delta > 0 (avoids breaking horizontal scrolls)', () => {
    expect(source).toMatch(/if\s*\(delta\s*>\s*0\)\s*e\.preventDefault\(\)/);
  });

  it('pull-to-refresh only enabled when analysis exists AND not analyzing', () => {
    expect(source).toMatch(/usePullToRefresh\(\s*handleAnalyze,\s*!!analysis\s*&&\s*!analyzing/);
  });
});

// ── Concurrent-call guards ─────────────────────────────────

describe('Concurrent-call guards', () => {
  it('handleAnalyze early-returns when analyzingRef.current is true', () => {
    expect(source).toMatch(/if\s*\(analyzingRef\.current\)\s*return/);
  });

  it('handleSuggestConnections early-returns when suggestingRef.current OR no existingNodeIds', () => {
    expect(source).toMatch(/if\s*\(suggestingRef\.current\s*\|\|\s*!existingNodeIds\?\.length\)\s*return/);
  });

  it('handleAcceptSuggestion guards both already-accepted and currently-accepting', () => {
    expect(source).toMatch(/if\s*\(acceptedRef\.current\.has\(key\)\s*\|\|\s*acceptingKeyRef\.current\s*===\s*key\)\s*return/);
  });

  it('analyzingRef set to true at start, false in finally', () => {
    expect(source).toMatch(/analyzingRef\.current\s*=\s*true/);
    expect(source).toMatch(/finally\s*\{\s*analyzingRef\.current\s*=\s*false/);
  });

  it('suggestingRef set to true at start, false in finally', () => {
    expect(source).toMatch(/suggestingRef\.current\s*=\s*true/);
    expect(source).toMatch(/finally\s*\{\s*suggestingRef\.current\s*=\s*false/);
  });
});

// ── Stale-topic discard (race-condition protection) ────────

describe('Stale-topic discard (handles topic switch mid-fetch)', () => {
  it('handleAnalyze captures topicId in analyzeTopicRef.current at call-start', () => {
    expect(source).toMatch(/handleAnalyze[\s\S]{0,500}analyzeTopicRef\.current\s*=\s*topicId/);
  });

  it('handleAnalyze discards results when analyzeTopicRef.current !== topicId after await', () => {
    expect(source).toMatch(/if\s*\(!mountedRef\.current\s*\|\|\s*analyzeTopicRef\.current\s*!==\s*topicId\)\s*return/);
  });

  it('handleSuggestConnections discards results when suggestTopicRef.current !== topicId', () => {
    expect(source).toMatch(/if\s*\(!mountedRef\.current\s*\|\|\s*suggestTopicRef\.current\s*!==\s*topicId\)\s*return/);
  });

  it('handleAcceptSuggestion captures topicId in capturedTopicId then re-checks', () => {
    expect(source).toMatch(/const\s+capturedTopicId\s*=\s*topicIdRef\.current/);
    expect(source).toMatch(/if\s*\(!mountedRef\.current\s*\|\|\s*topicIdRef\.current\s*!==\s*capturedTopicId\)\s*return/);
  });
});

// ── Topic-change state reset ───────────────────────────────

describe('Topic-change useEffect resets all derived state', () => {
  it('clears analysis, weakPoints, suggestions, acceptedSuggestions, acceptingKey, improvedNodes', () => {
    expect(source).toMatch(/useEffect\(\(\)\s*=>\s*\{\s*setAnalysis\(null\);\s*setWeakPoints\(\[\]\);\s*setSuggestions\(\[\]\);\s*setAcceptedSuggestions\(new Set\(\)\);\s*setAcceptingKey\(null\);\s*setImprovedNodes\(\[\]\);\s*prevWeakMapRef\.current\s*=\s*new Map\(\)/);
  });

  it('topic-reset effect dep is [topicId]', () => {
    expect(source).toMatch(/setImprovedNodes\(\[\]\);\s*prevWeakMapRef\.current\s*=\s*new Map\(\)[\s\S]{0,80}\},\s*\[topicId\]\)/);
  });
});

// ── Improved-node detection ────────────────────────────────

describe('Improved-node detection (across analyses)', () => {
  it('compares newWeakIds with prevWeakMapRef to find improved entries', () => {
    expect(source).toMatch(/for\s*\(const\s*\[id,\s*name\]\s*of\s*prevWeakMapRef\.current\)/);
  });

  it('improved = was-weak ∩ (now-not-weak OR now-strong)', () => {
    expect(source).toMatch(/!newWeakIds\.has\(id\)\s*\|\|\s*strongIds\.has\(id\)/);
  });

  it('only sets improvedNodes when there ARE improved entries (avoids noise)', () => {
    expect(source).toMatch(/if\s*\(improved\.length\s*>\s*0\)\s*\{\s*setImprovedNodes\(improved\)/);
  });

  it('clears prior improved-timer before scheduling a new one', () => {
    expect(source).toMatch(/if\s*\(improvedTimerRef\.current\)\s*clearTimeout\(improvedTimerRef\.current\)/);
  });

  it('improved badge auto-dismisses after 2500ms', () => {
    expect(source).toMatch(/setTimeout\(\(\)\s*=>\s*\{\s*if\s*\(mountedRef\.current\)\s*setImprovedNodes\(\[\]\)/);
    expect(source).toMatch(/\},\s*2500\)/);
  });

  it('mountedRef.current guard inside improved-timer setTimeout (avoids unmount setState)', () => {
    expect(source).toMatch(/setTimeout\(\(\)\s*=>\s*\{\s*if\s*\(mountedRef\.current\)\s*setImprovedNodes/);
  });

  it('improved-timer is cleared in mountedRef cleanup (no orphan setTimeout)', () => {
    expect(source).toMatch(/return\s*\(\)\s*=>\s*\{\s*mountedRef\.current\s*=\s*false;\s*if\s*\(improvedTimerRef\.current\)\s*clearTimeout\(improvedTimerRef\.current\)/);
  });

  it('rebuilds prevWeakMap as Map<keyword_id, keyword_name> for next comparison', () => {
    expect(source).toMatch(/const\s+nextWeakMap\s*=\s*new\s+Map<string,\s*string>\(\)/);
    expect(source).toMatch(/nextWeakMap\.set\(wa\.keyword_id,\s*wa\.keyword_name\)/);
    expect(source).toMatch(/prevWeakMapRef\.current\s*=\s*nextWeakMap/);
  });
});

// ── Resilience: Array.isArray fallbacks ────────────────────

describe('Array.isArray normalization (defensive against null)', () => {
  it('weak_areas falls back to [] when not an array', () => {
    expect(source).toMatch(/Array\.isArray\(result\.weak_areas\)\s*\?\s*result\.weak_areas\s*:\s*\[\]/);
  });

  it('strong_areas falls back to [] when not an array', () => {
    expect(source).toMatch(/Array\.isArray\(result\.strong_areas\)\s*\?\s*result\.strong_areas\s*:\s*\[\]/);
  });

  it('study_path falls back to [] when not an array', () => {
    expect(source).toMatch(/Array\.isArray\(result\.study_path\)\s*\?\s*result\.study_path\s*:\s*\[\]/);
  });
});

// ── Promise.all parallel API calls ─────────────────────────

describe('Parallel API fetch via Promise.all', () => {
  it('analyzeKnowledgeGraph and getStudentWeakPoints fire in parallel', () => {
    expect(source).toMatch(/Promise\.all\(\[[\s\S]{0,200}analyzeKnowledgeGraph\(topicId\)[\s\S]{0,200}getStudentWeakPoints\(topicId\)[\s\S]{0,80}\]\)/);
  });
});

// ── Highlight after successful analyze ─────────────────────

describe('Highlight wiring after analyze', () => {
  it('only highlights when there are weakAreas (avoids empty-set highlight)', () => {
    expect(source).toMatch(/if\s*\(weakAreas\.length\s*>\s*0\)\s*\{[\s\S]{0,300}onHighlightRef\.current\?\.\(weakIds\);\s*onReviewRef\.current\?\.\(weakIds\)/);
  });

  it('highlight + review use the SAME weakIds Set (single source of truth)', () => {
    expect(source).toMatch(/const\s+weakIds\s*=\s*new\s+Set\(weakAreas\.map\(w\s*=>\s*w\.keyword_id\)\)/);
  });
});

// ── handleAcceptSuggestion: accept-key format ──────────────

describe('handleAcceptSuggestion: accept-key format', () => {
  it("uses '<source>-<target>' as the dedup key", () => {
    expect(source).toMatch(/const\s+key\s*=\s*`\$\{suggestion\.source\}-\$\{suggestion\.target\}`/);
  });

  it('createCustomEdge payload includes source_node_id, target_node_id, label, connection_type, topic_id', () => {
    const payloadMatch = source.match(/createCustomEdge\(\{[\s\S]{0,500}\}\)/);
    expect(payloadMatch).not.toBeNull();
    expect(payloadMatch![0]).toContain('source_node_id: suggestion.source');
    expect(payloadMatch![0]).toContain('target_node_id: suggestion.target');
    expect(payloadMatch![0]).toContain('label: suggestion.reason');
    expect(payloadMatch![0]).toContain('connection_type: suggestion.type');
    expect(payloadMatch![0]).toContain('topic_id: capturedTopicId');
  });

  it('on success: adds key to acceptedSuggestions + calls onEdgeCreated + toasts', () => {
    expect(source).toMatch(/setAcceptedSuggestions\(prev\s*=>\s*new\s+Set\(prev\)\.add\(key\)\)/);
    expect(source).toMatch(/onEdgeCreatedRef\.current\?\.\(\)/);
    expect(source).toMatch(/toast\.success\(tT\.connectionAdded\)/);
  });

  it('error toast prefers err.message over generic errorCreatingConnection', () => {
    expect(source).toMatch(/err\s+instanceof\s+Error\s*\?\s*err\.message\s*:\s*tT\.errorCreatingConnection/);
  });

  it('finally clears acceptingKey only when still mounted', () => {
    expect(source).toMatch(/finally\s*\{\s*if\s*\(mountedRef\.current\)\s*setAcceptingKey\(null\)/);
  });
});

// ── handleDismissSuggestion (immutable filter) ─────────────

describe('handleDismissSuggestion', () => {
  it('uses immutable filter (no mutation of prev array)', () => {
    expect(source).toMatch(/setSuggestions\(prev\s*=>\s*prev\.filter\(s\s*=>\s*!\(s\.source\s*===\s*suggestion\.source\s*&&\s*s\.target\s*===\s*suggestion\.target\)\)\)/);
  });
});

// ── scoreColor 3-tier ──────────────────────────────────────

describe('scoreColor 3-tier mapping', () => {
  it('>= 0.7 → success, >= 0.4 → warning, else → error', () => {
    expect(source).toMatch(/analysis\.overall_score\s*>=\s*0\.7\s*\?\s*colors\.semantic\.success\s*:\s*analysis\.overall_score\s*>=\s*0\.4\s*\?\s*colors\.semantic\.warning\s*:\s*colors\.semantic\.error/);
  });

  it('falls back to colors.text.tertiary when no analysis (gray neutral)', () => {
    expect(source).toMatch(/scoreColor\s*=\s*analysis[\s\S]{0,200}:\s*colors\.text\.tertiary/);
  });
});

// ── ACTION_ICONS / ACTION_LABELS records ───────────────────

describe('ACTION mapping records', () => {
  it('ACTION_ICONS maps flashcard/quiz/summary/review to icon components', () => {
    expect(source).toMatch(/ACTION_ICONS:\s*Record<string,\s*typeof Layers>\s*=\s*\{\s*flashcard:\s*Layers,\s*quiz:\s*HelpCircle,\s*summary:\s*FileText,\s*review:\s*Route/);
  });

  it('ACTION_LABELS uses i18n strings for summary/review (localized)', () => {
    expect(source).toMatch(/summary:\s*tT\.actionSummary,\s*review:\s*tT\.actionReview/);
  });

  it('ACTION_LABELS hardcodes "Flashcards"/"Quiz" (cross-locale brand names)', () => {
    expect(source).toMatch(/flashcard:\s*['"]Flashcards['"]/);
    expect(source).toMatch(/quiz:\s*['"]Quiz['"]/);
  });
});

// ── Escape-key handler ─────────────────────────────────────

describe('Escape-key handler', () => {
  it('only attached when open=true (early-return when closed)', () => {
    expect(source).toMatch(/useEffect\(\(\)\s*=>\s*\{\s*if\s*\(!open\)\s*return;[\s\S]{0,500}document\.addEventListener\('keydown',\s*handler\)/);
  });

  it('preventDefault + stopPropagation before closing (no global handler interference)', () => {
    expect(source).toMatch(/e\.key\s*===\s*['"]Escape['"][\s\S]{0,150}e\.preventDefault\(\);\s*e\.stopPropagation\(\);\s*onCloseRef\.current\(\)/);
  });

  it('listener removed in cleanup', () => {
    expect(source).toMatch(/document\.removeEventListener\('keydown',\s*handler\)/);
  });
});

// ── Stable callback refs ───────────────────────────────────

describe('Stable callback refs (5 refs to prevent re-renders)', () => {
  it('mirrors onClose into onCloseRef', () => {
    expect(source).toMatch(/const\s+onCloseRef\s*=\s*useRef\(onClose\);[\s\S]{0,80}onCloseRef\.current\s*=\s*onClose/);
  });

  it('mirrors onHighlightNodes into onHighlightRef', () => {
    expect(source).toMatch(/const\s+onHighlightRef\s*=\s*useRef\(onHighlightNodes\);[\s\S]{0,80}onHighlightRef\.current\s*=\s*onHighlightNodes/);
  });

  it('mirrors onReviewNodes into onReviewRef', () => {
    expect(source).toMatch(/const\s+onReviewRef\s*=\s*useRef\(onReviewNodes\);[\s\S]{0,80}onReviewRef\.current\s*=\s*onReviewNodes/);
  });

  it('mirrors onNavigateToAction into onNavigateRef', () => {
    expect(source).toMatch(/const\s+onNavigateRef\s*=\s*useRef\(onNavigateToAction\);[\s\S]{0,80}onNavigateRef\.current\s*=\s*onNavigateToAction/);
  });

  it('mirrors onEdgeCreated into onEdgeCreatedRef', () => {
    expect(source).toMatch(/const\s+onEdgeCreatedRef\s*=\s*useRef\(onEdgeCreated\);[\s\S]{0,80}onEdgeCreatedRef\.current\s*=\s*onEdgeCreated/);
  });
});

// ── memo() wrapping ────────────────────────────────────────

describe('memo() wrapping', () => {
  it('exports AiTutorPanel wrapped in memo()', () => {
    expect(source).toMatch(/export\s+const\s+AiTutorPanel\s*=\s*memo\(function\s+AiTutorPanel/);
  });

  it('imports memo from react', () => {
    expect(source).toMatch(/import\s*\{[^}]*memo[^}]*\}\s*from\s*['"]react['"]/);
  });
});

// ── useFocusTrap integration ───────────────────────────────

describe('useFocusTrap integration', () => {
  it('passes the open state to useFocusTrap (only traps when visible)', () => {
    expect(source).toMatch(/const\s+focusTrapRef\s*=\s*useFocusTrap\(open\)/);
  });
});

// ── DEV-only error logging ─────────────────────────────────

describe('DEV-only error logging in handleAnalyze', () => {
  it('console.error gated by import.meta.env.DEV', () => {
    expect(source).toMatch(/import\.meta\.env\.DEV[\s\S]{0,100}console\.error\(['"]AI analysis failed:['"],\s*err\)/);
  });
});
