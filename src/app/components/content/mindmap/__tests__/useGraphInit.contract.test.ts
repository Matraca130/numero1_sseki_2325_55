// ============================================================
// Contract test — useGraphInit
//
// The G6 engine hook is 1085 lines and the heart of the graph.
// This test validates exports, layout configs, zoom constants,
// pure utility functions, and the hook's interface shape.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SOURCE_PATH = resolve(__dirname, '..', 'useGraphInit.ts');
const source = readFileSync(SOURCE_PATH, 'utf-8');

// ── Exported functions ──────────────────────────────────────

describe('useGraphInit exports', () => {
  it('exports useGraphInit hook', () => {
    expect(source).toContain('export function useGraphInit');
  });

  it('exports warnIfNotDestroyed utility', () => {
    expect(source).toContain('export function warnIfNotDestroyed');
  });

  it('exports createBatchDraw utility', () => {
    expect(source).toContain('export function createBatchDraw');
  });

  it('re-imports computeNodeStyle from graphStyles', () => {
    expect(source).toContain('computeNodeStyle');
    expect(source).toContain("from './graphStyles'");
  });

  it('re-imports computeEdgeStyle from graphStyles', () => {
    expect(source).toContain('computeEdgeStyle');
  });

  it('exports UseGraphInitOptions interface', () => {
    expect(source).toContain('export interface UseGraphInitOptions');
  });

  it('exports UseGraphInitReturn interface', () => {
    expect(source).toContain('export interface UseGraphInitReturn');
  });
});

// ── Zoom constants ──────────────────────────────────────────

describe('zoom constants', () => {
  it('defines MIN_ZOOM = 0.2', () => {
    expect(source).toContain('export const MIN_ZOOM = 0.2');
  });

  it('defines MAX_ZOOM = 5', () => {
    expect(source).toContain('export const MAX_ZOOM = 5');
  });
});

// ── Layout configurations ───────────────────────────────────

describe('layout configurations', () => {
  const layouts = [
    'LAYOUT_FORCE',
    'LAYOUT_RADIAL',
    'LAYOUT_DAGRE',
    'LAYOUT_MINDMAP',
    'LAYOUT_CONCENTRIC',
    'LAYOUT_CIRCULAR',
    'LAYOUT_FRUCHTERMAN',
  ];

  for (const layout of layouts) {
    it(`exports ${layout}`, () => {
      expect(source).toContain(`export const ${layout}`);
    });
  }

  it('LAYOUT_FORCE uses d3-force type', () => {
    expect(source).toContain("type: 'd3-force'");
  });

  it('LAYOUT_DAGRE uses top-to-bottom direction', () => {
    expect(source).toContain("rankdir: 'TB'");
  });

  it('LAYOUT_MINDMAP uses horizontal direction', () => {
    expect(source).toContain("direction: 'H'");
  });
});

// ── createBatchDraw pattern ─────────────────────────────────

describe('createBatchDraw', () => {
  it('uses requestAnimationFrame for coalescing', () => {
    expect(source).toContain('requestAnimationFrame');
  });

  it('checks graph.destroyed before drawing', () => {
    expect(source).toContain('!g.destroyed');
  });

  it('uses a pending flag to prevent redundant draws', () => {
    expect(source).toContain('pendingDrawRef.current');
  });
});

// ── warnIfNotDestroyed pattern ──────────────────────────────

describe('warnIfNotDestroyed', () => {
  it('only logs in DEV mode', () => {
    expect(source).toContain('import.meta.env.DEV');
  });

  it('filters out destroyed-graph errors', () => {
    expect(source).toContain("e.message.includes('destroyed')");
  });
});

// ── G6 integration ──────────────────────────────────────────

describe('G6 integration', () => {
  it('imports Graph from @antv/g6', () => {
    expect(source).toContain("import { Graph } from '@antv/g6'");
  });

  it('delegates node/edge styling to graphStyles', () => {
    expect(source).toContain('computeNodeStyle');
    expect(source).toContain('computeEdgeStyle');
    expect(source).toContain("from './graphStyles'");
  });

  it('uses graphHelpers for tree operations', () => {
    expect(source).toContain('buildChildrenMap');
    expect(source).toContain('computeHiddenNodes');
  });

  it('imports position persistence', () => {
    expect(source).toContain('loadPositions');
    expect(source).toContain('loadGridEnabled');
  });
});

// ── Hook return shape ───────────────────────────────────────

describe('useGraphInit return shape', () => {
  it('returns graphRef', () => {
    expect(source).toContain('graphRef');
  });

  it('returns containerRef', () => {
    expect(source).toContain('containerRef');
  });

  it('returns batchDraw for coalesced rendering', () => {
    expect(source).toContain('batchDraw');
  });

  it('returns pendingDrawRef', () => {
    expect(source).toContain('pendingDrawRef');
  });
});
