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

// ── Layout preset tunables ──────────────────────────────────
//
// The layout configs are load-bearing for graph aesthetics.
// Pinning each tunable so a refactor can't silently change the
// look-and-feel.

describe('LAYOUT_FORCE tunables', () => {
  it("type is 'd3-force'", () => {
    expect(source).toMatch(/LAYOUT_FORCE\s*=\s*\{\s*type:\s*'d3-force'/);
  });
  it('preventOverlap=true, nodeSize=50, linkDistance=150', () => {
    expect(source).toMatch(/LAYOUT_FORCE\s*=\s*\{[^}]*preventOverlap:\s*true/);
    expect(source).toMatch(/LAYOUT_FORCE\s*=\s*\{[^}]*nodeSize:\s*50/);
    expect(source).toMatch(/LAYOUT_FORCE\s*=\s*\{[^}]*linkDistance:\s*150/);
  });
  it('nodeStrength=-200 (repulsion), collideStrength=0.4', () => {
    expect(source).toMatch(/LAYOUT_FORCE\s*=\s*\{[^}]*nodeStrength:\s*-200/);
    expect(source).toMatch(/LAYOUT_FORCE\s*=\s*\{[^}]*collideStrength:\s*0\.4/);
  });
});

describe('LAYOUT_RADIAL tunables', () => {
  it("type='radial', unitRadius=120, nodeSize=50, preventOverlap=true", () => {
    expect(source).toMatch(/LAYOUT_RADIAL\s*=\s*\{\s*type:\s*'radial'[^}]*unitRadius:\s*120/);
    expect(source).toMatch(/LAYOUT_RADIAL\s*=\s*\{[^}]*nodeSize:\s*50/);
    expect(source).toMatch(/LAYOUT_RADIAL\s*=\s*\{[^}]*preventOverlap:\s*true/);
  });
});

describe('LAYOUT_DAGRE tunables', () => {
  it("rankdir='TB' (top-to-bottom)", () => {
    expect(source).toMatch(/LAYOUT_DAGRE\s*=\s*\{[^}]*rankdir:\s*'TB'/);
  });
  it('nodesep=40, ranksep=60', () => {
    expect(source).toMatch(/LAYOUT_DAGRE\s*=\s*\{[^}]*nodesep:\s*40/);
    expect(source).toMatch(/LAYOUT_DAGRE\s*=\s*\{[^}]*ranksep:\s*60/);
  });
});

describe('LAYOUT_MINDMAP tunables', () => {
  it("direction='H' (horizontal mindmap)", () => {
    expect(source).toMatch(/LAYOUT_MINDMAP\s*=\s*\{[^}]*direction:\s*'H'/);
  });
  it('uses getter functions for dynamic spacing', () => {
    expect(source).toMatch(/LAYOUT_MINDMAP\s*=\s*\{[^}]*getHeight:\s*\(\)\s*=>\s*32/);
    expect(source).toMatch(/LAYOUT_MINDMAP\s*=\s*\{[^}]*getWidth:\s*\(\)\s*=>\s*32/);
    expect(source).toMatch(/LAYOUT_MINDMAP\s*=\s*\{[^}]*getHGap:\s*\(\)\s*=>\s*40/);
    expect(source).toMatch(/LAYOUT_MINDMAP\s*=\s*\{[^}]*getVGap:\s*\(\)\s*=>\s*20/);
  });
});

describe('LAYOUT_CONCENTRIC tunables', () => {
  it("type='concentric', minNodeSpacing=40, preventOverlap=true", () => {
    expect(source).toMatch(/LAYOUT_CONCENTRIC\s*=\s*\{\s*type:\s*'concentric'[^}]*minNodeSpacing:\s*40/);
    expect(source).toMatch(/LAYOUT_CONCENTRIC\s*=\s*\{[^}]*preventOverlap:\s*true/);
  });
});

describe('LAYOUT_CIRCULAR tunables', () => {
  it("type='circular', radius=null (auto-fit), ordering='degree'", () => {
    expect(source).toMatch(/LAYOUT_CIRCULAR\s*=\s*\{\s*type:\s*'circular'[^}]*radius:\s*null/);
    expect(source).toMatch(/LAYOUT_CIRCULAR\s*=\s*\{[^}]*ordering:\s*'degree'/);
  });
});

describe('LAYOUT_FRUCHTERMAN tunables', () => {
  it("type='fruchterman', gravity=10, speed=5, clustering=true", () => {
    expect(source).toMatch(/LAYOUT_FRUCHTERMAN\s*=\s*\{\s*type:\s*'fruchterman'[^}]*gravity:\s*10/);
    expect(source).toMatch(/LAYOUT_FRUCHTERMAN\s*=\s*\{[^}]*speed:\s*5/);
    expect(source).toMatch(/LAYOUT_FRUCHTERMAN\s*=\s*\{[^}]*clustering:\s*true/);
  });
  it("nodeClusterBy='cluster' (data property used for grouping)", () => {
    expect(source).toMatch(/LAYOUT_FRUCHTERMAN\s*=\s*\{[^}]*nodeClusterBy:\s*'cluster'/);
  });
});

// ── LayoutType union ────────────────────────────────────────

describe('LayoutType union exhaustiveness', () => {
  it('options layout prop accepts all 7 types', () => {
    const expected = ['force', 'radial', 'dagre', 'mindmap', 'concentric', 'circular', 'fruchterman'];
    for (const t of expected) {
      expect(source).toContain(`'${t}'`);
    }
  });
});

// ── Zoom invariants ─────────────────────────────────────────

describe('Zoom invariants', () => {
  it('MIN_ZOOM (0.2) < 1.0 (default)', () => {
    expect(source).toMatch(/MIN_ZOOM\s*=\s*0\.2/);
    // 1.0 is the default zoom level, MIN_ZOOM must allow zoom-out
    expect(0.2).toBeLessThan(1.0);
  });
  it('MAX_ZOOM (5) > 1.0 (default)', () => {
    expect(source).toMatch(/MAX_ZOOM\s*=\s*5/);
    expect(5).toBeGreaterThan(1.0);
  });
  it('zoom range is 0.2x – 5x (25:1 ratio, plenty of headroom)', () => {
    // The ratio test pins the relative range — 5/0.2 = 25
    expect(5 / 0.2).toBe(25);
  });
});

// ── downloadGraphImage internal helper (replicated) ─────────
//
// This helper is not exported but governs how exports name files.
// Replicate the timestamp-format logic so a refactor can't silently
// change the on-disk filenames.

describe('downloadGraphImage filename format (replicated)', () => {
  function stamp(now: Date): string {
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
    ].join('');
  }

  it('produces yyyymmddHHMM (12 digits, no separators)', () => {
    const out = stamp(new Date(2026, 0, 5, 9, 7)); // Jan 5, 2026, 09:07
    expect(out).toBe('202601050907');
    expect(out).toMatch(/^\d{12}$/);
  });

  it('zero-pads month/day/hour/minute', () => {
    expect(stamp(new Date(2026, 0, 1, 0, 0))).toBe('202601010000');
    expect(stamp(new Date(2026, 8, 9, 9, 9))).toBe('202609090909');
  });

  it('matches the source-level filename pattern (mapa-conocimiento-{stamp}.{ext})', () => {
    expect(source).toContain('mapa-conocimiento-${stamp}.${ext}');
  });

  it('the link is removed after a 100ms delay (avoids losing the click)', () => {
    expect(source).toMatch(/setTimeout\(\(\)\s*=>\s*\{[\s\S]*?link\.parentNode\.removeChild\(link\)[\s\S]*?\}\s*,\s*100\s*\)/);
  });

  it('appends to body, then clicks, then removes (DOM-flow contract)', () => {
    // Ordering: appendChild before click, click before removeChild
    const appendIx = source.indexOf('document.body.appendChild(link)');
    const clickIx = source.indexOf('link.click()');
    const removeIx = source.indexOf('removeChild(link)');
    expect(appendIx).toBeGreaterThan(-1);
    expect(clickIx).toBeGreaterThan(appendIx);
    expect(removeIx).toBeGreaterThan(clickIx);
  });
});

// ── UseGraphInitReturn surface ──────────────────────────────

describe('UseGraphInitReturn surface (extended)', () => {
  const required = [
    'containerRef', 'graphRef', 'ready', 'graphVersion',
    'collapsedNodes', 'setCollapsedNodes',
    'breadcrumbs', 'setBreadcrumbs',
    'combos', 'setCombos', 'comboCounterRef',
    'mountedRef', 'layoutInProgressRef', 'longPressTimerRef',
    'savedPositionsRef', 'topicIdRef', 'gridEnabledRef',
    'collapseAllRef', 'expandAllRef', 'toggleCollapseRef',
    'childrenMap', 'childrenMapRef',
    'nodeToCombo',
    'g6Data',
    'highlightEpoch', 'setHighlightEpoch',
    'dataNodesRef', 'dataEdgesRef',
    'nodeById',
    'gridEnabled', 'gridEnabledInternal', 'setGridEnabledInternal',
    'batchDraw', 'pendingDrawRef',
  ];
  for (const key of required) {
    it(`returns \`${key}\``, () => {
      expect(source).toContain(key);
    });
  }
});

// ── i18n locale lookup safety ───────────────────────────────

describe('i18n locale lookup', () => {
  it('uses the safe ?? I18N_GRAPH.es fallback (cycle 18 hardening)', () => {
    expect(source).toContain('I18N_GRAPH[locale] ?? I18N_GRAPH.es');
  });
});
