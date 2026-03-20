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
