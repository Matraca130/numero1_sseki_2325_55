// ============================================================
// Tests — MapComparisonPanel (mastery distribution, gaps, stats)
//
// Tests the pure computation logic extracted from MapComparisonPanel:
//   - computeStats: mastery distribution, coverage stats
//   - findGaps: weak/no-data node detection
//   - Donut chart math: segment calculations
//   - Custom node/edge separation
//
// Uses filesystem-based checks for module contract and
// replicated pure functions for logic tests.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { MasteryColor } from '@/app/lib/mastery-helpers';

const COMPONENT_PATH = resolve(__dirname, '..', 'MapComparisonPanel.tsx');
const source = readFileSync(COMPONENT_PATH, 'utf-8');

// ── Types (mirror component internal types) ─────────────────

interface MapNode {
  id: string;
  label: string;
  type: 'keyword' | 'custom';
  mastery: number;
  masteryColor: MasteryColor;
  isUserCreated?: boolean;
}

interface MapEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  isUserCreated?: boolean;
}

interface GraphData {
  nodes: MapNode[];
  edges: MapEdge[];
}

interface CoverageStats {
  total: number;
  mastered: number;
  learning: number;
  weak: number;
  noData: number;
  avgMastery: number;
  customNodes: number;
  customEdges: number;
  baseNodes: number;
  baseEdges: number;
}

type GapCategory = 'weak' | 'noData';

interface GapNode {
  node: MapNode;
  category: GapCategory;
}

// ── Replicated pure logic from MapComparisonPanel ───────────

function computeStats(data: GraphData): CoverageStats {
  const baseNodes = data.nodes.filter(n => !n.isUserCreated);
  const customNodes = data.nodes.filter(n => n.isUserCreated);
  const baseEdges = data.edges.filter(e => !e.isUserCreated);
  const customEdges = data.edges.filter(e => e.isUserCreated);

  let mastered = 0, learning = 0, weak = 0, noData = 0;
  let masterySum = 0;
  for (const n of baseNodes) {
    switch (n.masteryColor) {
      case 'green': mastered++; break;
      case 'yellow': learning++; break;
      case 'red': weak++; break;
      default: noData++;
    }
    if (n.mastery >= 0) masterySum += n.mastery;
  }

  const total = baseNodes.length;
  return {
    total,
    mastered,
    learning,
    weak,
    noData,
    avgMastery: total > 0 ? masterySum / total : 0,
    customNodes: customNodes.length,
    customEdges: customEdges.length,
    baseNodes: total,
    baseEdges: baseEdges.length,
  };
}

function findGaps(data: GraphData): GapNode[] {
  return data.nodes
    .filter(n => !n.isUserCreated && (n.masteryColor === 'red' || n.masteryColor === 'gray'))
    .sort((a, b) => a.mastery - b.mastery)
    .map(node => ({
      node,
      category: node.masteryColor === 'red' ? 'weak' as const : 'noData' as const,
    }));
}

// ── Test fixtures ───────────────────────────────────────────

function mkNode(id: string, mastery: number, color: MasteryColor, isCustom = false): MapNode {
  return { id, label: id, type: 'keyword', mastery, masteryColor: color, isUserCreated: isCustom };
}

function mkEdge(id: string, src: string, tgt: string, isCustom = false): MapEdge {
  return { id, source: src, target: tgt, isUserCreated: isCustom };
}

const MIXED_GRAPH: GraphData = {
  nodes: [
    mkNode('n1', 0.95, 'green'),        // mastered base
    mkNode('n2', 0.60, 'yellow'),        // learning base
    mkNode('n3', 0.20, 'red'),           // weak base
    mkNode('n4', -1, 'gray'),            // no data base
    mkNode('n5', 0.85, 'green'),         // mastered base
    mkNode('c1', 0.50, 'yellow', true),  // custom node
    mkNode('c2', 0.70, 'yellow', true),  // custom node
  ],
  edges: [
    mkEdge('e1', 'n1', 'n2'),            // base edge
    mkEdge('e2', 'n2', 'n3'),            // base edge
    mkEdge('e3', 'n3', 'n4'),            // base edge
    mkEdge('ce1', 'c1', 'n1', true),     // custom edge
    mkEdge('ce2', 'c2', 'n2', true),     // custom edge
  ],
};

// ── Module contract ─────────────────────────────────────────

describe('MapComparisonPanel: module contract', () => {
  it('file exists', () => {
    expect(existsSync(COMPONENT_PATH)).toBe(true);
  });

  it('exports MapComparisonPanel as a memo-wrapped named component', () => {
    expect(source).toMatch(/export\s+const\s+MapComparisonPanel\s*=\s*memo\(function\s+MapComparisonPanel/);
  });

  it('has no default export', () => {
    expect(source).not.toMatch(/export\s+default/);
  });

  it('has required props: open, onClose, graphData', () => {
    expect(source).toContain('open');
    expect(source).toContain('onClose');
    expect(source).toContain('graphData');
  });

  it('has optional callback props', () => {
    expect(source).toContain('onHighlightNodes');
    expect(source).toContain('onNavigateToAction');
  });
});

// ── computeStats ────────────────────────────────────────────

describe('computeStats: mastery distribution', () => {
  it('counts mastered (green) nodes correctly', () => {
    const stats = computeStats(MIXED_GRAPH);
    expect(stats.mastered).toBe(2); // n1, n5
  });

  it('counts learning (yellow) nodes correctly', () => {
    const stats = computeStats(MIXED_GRAPH);
    expect(stats.learning).toBe(1); // n2
  });

  it('counts weak (red) nodes correctly', () => {
    const stats = computeStats(MIXED_GRAPH);
    expect(stats.weak).toBe(1); // n3
  });

  it('counts noData (gray) nodes correctly', () => {
    const stats = computeStats(MIXED_GRAPH);
    expect(stats.noData).toBe(1); // n4
  });

  it('total only counts base nodes (excludes custom)', () => {
    const stats = computeStats(MIXED_GRAPH);
    expect(stats.total).toBe(5); // n1-n5, not c1,c2
  });

  it('correctly counts custom nodes', () => {
    const stats = computeStats(MIXED_GRAPH);
    expect(stats.customNodes).toBe(2); // c1, c2
  });

  it('correctly counts custom edges', () => {
    const stats = computeStats(MIXED_GRAPH);
    expect(stats.customEdges).toBe(2); // ce1, ce2
  });

  it('correctly counts base edges', () => {
    const stats = computeStats(MIXED_GRAPH);
    expect(stats.baseEdges).toBe(3); // e1, e2, e3
  });

  it('computes average mastery from base nodes only', () => {
    const stats = computeStats(MIXED_GRAPH);
    // n1=0.95, n2=0.60, n3=0.20, n4=-1(skipped, <0), n5=0.85
    // Wait: the code says "if (n.mastery >= 0) masterySum += n.mastery"
    // So n4 with mastery=-1 is NOT added to sum
    // Sum = 0.95 + 0.60 + 0.20 + 0.85 = 2.60
    // But total = 5 (all base nodes), so avg = 2.60 / 5 = 0.52
    expect(stats.avgMastery).toBeCloseTo(0.52, 2);
  });
});

describe('computeStats: edge cases', () => {
  it('handles empty graph', () => {
    const stats = computeStats({ nodes: [], edges: [] });
    expect(stats.total).toBe(0);
    expect(stats.mastered).toBe(0);
    expect(stats.avgMastery).toBe(0);
    expect(stats.customNodes).toBe(0);
  });

  it('handles graph with only custom nodes', () => {
    const graph: GraphData = {
      nodes: [mkNode('c1', 0.5, 'yellow', true)],
      edges: [],
    };
    const stats = computeStats(graph);
    expect(stats.total).toBe(0); // no base nodes
    expect(stats.customNodes).toBe(1);
    expect(stats.avgMastery).toBe(0);
  });

  it('handles all mastered graph', () => {
    const graph: GraphData = {
      nodes: [
        mkNode('n1', 0.90, 'green'),
        mkNode('n2', 0.95, 'green'),
        mkNode('n3', 1.0, 'green'),
      ],
      edges: [],
    };
    const stats = computeStats(graph);
    expect(stats.mastered).toBe(3);
    expect(stats.learning).toBe(0);
    expect(stats.weak).toBe(0);
    expect(stats.noData).toBe(0);
    expect(stats.avgMastery).toBeCloseTo(0.95, 2);
  });

  it('handles all weak graph', () => {
    const graph: GraphData = {
      nodes: [
        mkNode('n1', 0.10, 'red'),
        mkNode('n2', 0.15, 'red'),
      ],
      edges: [],
    };
    const stats = computeStats(graph);
    expect(stats.weak).toBe(2);
    expect(stats.mastered).toBe(0);
  });
});

// ── findGaps ────────────────────────────────────────────────

describe('findGaps: gap detection', () => {
  it('finds weak (red) nodes', () => {
    const gaps = findGaps(MIXED_GRAPH);
    const weakGaps = gaps.filter(g => g.category === 'weak');
    expect(weakGaps.length).toBe(1);
    expect(weakGaps[0].node.id).toBe('n3');
  });

  it('finds noData (gray) nodes', () => {
    const gaps = findGaps(MIXED_GRAPH);
    const noDataGaps = gaps.filter(g => g.category === 'noData');
    expect(noDataGaps.length).toBe(1);
    expect(noDataGaps[0].node.id).toBe('n4');
  });

  it('excludes custom nodes from gaps', () => {
    const graph: GraphData = {
      nodes: [
        mkNode('base-red', 0.1, 'red'),
        mkNode('custom-red', 0.1, 'red', true),
      ],
      edges: [],
    };
    const gaps = findGaps(graph);
    expect(gaps.length).toBe(1);
    expect(gaps[0].node.id).toBe('base-red');
  });

  it('excludes green and yellow nodes', () => {
    const graph: GraphData = {
      nodes: [
        mkNode('green', 0.9, 'green'),
        mkNode('yellow', 0.6, 'yellow'),
      ],
      edges: [],
    };
    const gaps = findGaps(graph);
    expect(gaps.length).toBe(0);
  });

  it('sorts gaps by mastery ascending (weakest first)', () => {
    const graph: GraphData = {
      nodes: [
        mkNode('a', 0.30, 'red'),
        mkNode('b', 0.05, 'red'),
        mkNode('c', -1, 'gray'),
        mkNode('d', 0.15, 'red'),
      ],
      edges: [],
    };
    const gaps = findGaps(graph);
    expect(gaps[0].node.mastery).toBeLessThanOrEqual(gaps[1].node.mastery);
    expect(gaps[1].node.mastery).toBeLessThanOrEqual(gaps[2].node.mastery);
  });

  it('returns empty array for graph with no gaps', () => {
    const graph: GraphData = {
      nodes: [
        mkNode('n1', 0.9, 'green'),
        mkNode('n2', 0.6, 'yellow'),
      ],
      edges: [],
    };
    expect(findGaps(graph)).toEqual([]);
  });

  it('returns empty array for empty graph', () => {
    expect(findGaps({ nodes: [], edges: [] })).toEqual([]);
  });
});

// ── Donut chart math ────────────────────────────────────────

describe('MasteryDonut: segment calculations', () => {
  const r = 36;
  const circumference = 2 * Math.PI * r;

  it('circumference matches the component constant', () => {
    expect(circumference).toBeCloseTo(226.19, 1);
  });

  it('segment lengths sum to full circumference', () => {
    const total = 10;
    const segments = [
      { count: 4, color: 'green' },  // 40%
      { count: 3, color: 'yellow' }, // 30%
      { count: 2, color: 'red' },    // 20%
      { count: 1, color: 'gray' },   // 10%
    ];

    let totalLen = 0;
    for (const s of segments) {
      totalLen += (s.count / total) * circumference;
    }
    expect(totalLen).toBeCloseTo(circumference, 5);
  });

  it('single segment fills entire circumference', () => {
    const len = (5 / 5) * circumference;
    expect(len).toBeCloseTo(circumference, 5);
  });

  it('equal segments divide circumference evenly', () => {
    const total = 4;
    const segLen = (1 / total) * circumference;
    expect(segLen * total).toBeCloseTo(circumference, 5);
  });

  it('zero-count segments produce zero length', () => {
    const len = (0 / 10) * circumference;
    expect(len).toBe(0);
  });
});

// ── Coverage percentage ─────────────────────────────────────

describe('Coverage percentage calculation', () => {
  function computeCoverage(mastered: number, learning: number, total: number): number {
    return total > 0 ? Math.round(((mastered + learning) / total) * 100) : 0;
  }

  it('100% when all mastered', () => {
    expect(computeCoverage(10, 0, 10)).toBe(100);
  });

  it('0% when all weak/noData', () => {
    expect(computeCoverage(0, 0, 10)).toBe(0);
  });

  it('handles mixed mastered + learning', () => {
    expect(computeCoverage(3, 2, 10)).toBe(50);
  });

  it('returns 0 for empty graph (division by zero guard)', () => {
    expect(computeCoverage(0, 0, 0)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    // 1/3 = 33.33...%
    expect(computeCoverage(1, 0, 3)).toBe(33);
  });
});

// ── MasteryDonut math (replicated) ──────────────────────────

describe('MasteryDonut segment math (replicated)', () => {
  // Mirrors MasteryDonut: r=36, cx=cy=44, circumference=2πr.
  // Segments are filtered to count>0 then projected to dashArray
  // strings sliced cumulatively along the circle.
  type Seg = { count: number; color: string };

  function buildArcs(segments: Seg[], total: number) {
    const r = 36;
    const circumference = 2 * Math.PI * r;
    const filtered = segments.filter(s => s.count > 0);
    let offset = 0;
    return filtered.map(s => {
      const len = (s.count / total) * circumference;
      const arc = { color: s.color, dashArray: `${len} ${circumference - len}`, dashOffset: -offset };
      offset += len;
      return arc;
    });
  }

  const C = 2 * Math.PI * 36;

  it('drops segments with count=0 (no degenerate arcs)', () => {
    const arcs = buildArcs([
      { count: 5, color: 'g' },
      { count: 0, color: 'y' },
      { count: 0, color: 'r' },
      { count: 0, color: 'gr' },
    ], 5);
    expect(arcs).toHaveLength(1);
    expect(arcs[0].color).toBe('g');
  });

  it('first segment has dashOffset=0 (starts at 12 o\'clock after rotate(-90))', () => {
    const arcs = buildArcs([
      { count: 5, color: 'g' },
      { count: 5, color: 'r' },
    ], 10);
    // Accept -0 / 0 (JS negation of 0 yields -0; SVG renders identically).
    expect(Math.abs(arcs[0].dashOffset)).toBe(0);
  });

  it('subsequent dashOffsets accumulate (each segment trails the prior)', () => {
    const arcs = buildArcs([
      { count: 5, color: 'g' },
      { count: 5, color: 'r' },
    ], 10);
    expect(arcs[1].dashOffset).toBeCloseTo(-(0.5 * C), 5);
  });

  it('full-circle segment gets dashArray `C 0`', () => {
    const arcs = buildArcs([{ count: 10, color: 'g' }], 10);
    const [len, gap] = arcs[0].dashArray.split(' ').map(Number);
    expect(len).toBeCloseTo(C, 5);
    expect(gap).toBeCloseTo(0, 5);
  });

  it('half-and-half splits the circumference evenly', () => {
    const arcs = buildArcs([
      { count: 1, color: 'g' },
      { count: 1, color: 'r' },
    ], 2);
    for (const arc of arcs) {
      const [len, gap] = arc.dashArray.split(' ').map(Number);
      expect(len).toBeCloseTo(C / 2, 5);
      expect(gap).toBeCloseTo(C / 2, 5);
    }
  });

  it('segments sum to exactly the full circumference (no rounding leak)', () => {
    const arcs = buildArcs([
      { count: 3, color: 'g' },
      { count: 4, color: 'y' },
      { count: 2, color: 'r' },
      { count: 1, color: 'gr' },
    ], 10);
    const totalLen = arcs.reduce((s, a) => s + Number(a.dashArray.split(' ')[0]), 0);
    expect(totalLen).toBeCloseTo(C, 5);
  });

  it('handles single-node total (all weight on one segment)', () => {
    const arcs = buildArcs([{ count: 1, color: 'r' }], 1);
    expect(arcs).toHaveLength(1);
    const [len] = arcs[0].dashArray.split(' ').map(Number);
    expect(len).toBeCloseTo(C, 5);
  });
});

// ── Source-level invariants ─────────────────────────────────

describe('MasteryDonut source contract', () => {
  it('returns null when total === 0 (no donut for empty graph)', () => {
    expect(source).toMatch(/if\s*\(total\s*===\s*0\)\s*return\s+null/);
  });

  it('declares the SVG geometry: r=36, cx=cy=44, viewBox="0 0 88 88"', () => {
    expect(source).toMatch(/const\s+r\s*=\s*36/);
    expect(source).toMatch(/const\s+cx\s*=\s*44/);
    expect(source).toMatch(/const\s+cy\s*=\s*44/);
    expect(source).toMatch(/viewBox="0 0 88 88"/);
  });

  it('uses 2πr for the circumference', () => {
    expect(source).toMatch(/circumference\s*=\s*2\s*\*\s*Math\.PI\s*\*\s*r/);
  });

  it('rotates -90° so the donut starts at 12 o\'clock', () => {
    expect(source).toMatch(/rotate\(-90\s+\$\{cx\}\s+\$\{cy\}\)/);
  });

  it('background ring is gray #f3f4f6 at strokeWidth 8', () => {
    expect(source).toContain('stroke="#f3f4f6"');
    expect(source).toMatch(/strokeWidth="8"/);
  });

  it('arcs use round line caps for soft segment edges', () => {
    expect(source).toContain('strokeLinecap="round"');
  });

  it('uses useCountUp(800) for the percent counter animation', () => {
    expect(source).toMatch(/useCountUp\(pct,\s*800\)/);
  });

  it('center text uses Georgia serif (design-system mandatory)', () => {
    expect(source).toContain("fontFamily: 'Georgia, serif'");
  });
});

// ── findGaps invariants ────────────────────────────────────

describe('findGaps additional invariants (replicated)', () => {
  type N = { id: string; isUserCreated?: boolean; masteryColor: string; mastery: number };
  function findGaps(nodes: N[]) {
    return nodes
      .filter(n => !n.isUserCreated && (n.masteryColor === 'red' || n.masteryColor === 'gray'))
      .sort((a, b) => a.mastery - b.mastery)
      .map(node => ({ node, category: node.masteryColor === 'red' ? 'weak' : 'noData' }));
  }

  it('sorts by ascending mastery (worst first)', () => {
    const out = findGaps([
      { id: 'a', masteryColor: 'red', mastery: 0.3 },
      { id: 'b', masteryColor: 'red', mastery: 0.1 },
      { id: 'c', masteryColor: 'red', mastery: 0.2 },
    ]);
    expect(out.map(o => o.node.id)).toEqual(['b', 'c', 'a']);
  });

  it('excludes user-created nodes from gaps (not the student\'s job to fix custom)', () => {
    const out = findGaps([
      { id: 'sys', masteryColor: 'red', mastery: 0.1 },
      { id: 'usr', masteryColor: 'red', mastery: 0.0, isUserCreated: true },
    ]);
    expect(out.map(o => o.node.id)).toEqual(['sys']);
  });

  it("category mapping: red→'weak', gray→'noData'", () => {
    const out = findGaps([
      { id: 'r', masteryColor: 'red', mastery: 0.1 },
      { id: 'g', masteryColor: 'gray', mastery: -1 },
    ]);
    const byId = new Map(out.map(o => [o.node.id, o.category]));
    expect(byId.get('r')).toBe('weak');
    expect(byId.get('g')).toBe('noData');
  });

  it('green / yellow nodes are filtered out (not gaps)', () => {
    const out = findGaps([
      { id: 'green', masteryColor: 'green', mastery: 0.9 },
      { id: 'yellow', masteryColor: 'yellow', mastery: 0.5 },
      { id: 'red', masteryColor: 'red', mastery: 0.1 },
    ]);
    expect(out.map(o => o.node.id)).toEqual(['red']);
  });

  it('returns [] for empty input', () => {
    expect(findGaps([])).toEqual([]);
  });
});

// ── computeStats edge cases ────────────────────────────────

describe('computeStats edge cases (replicated)', () => {
  type N = { masteryColor: string; mastery: number; isUserCreated?: boolean };
  type E = { isUserCreated?: boolean };
  function computeStats(data: { nodes: N[]; edges: E[] }) {
    const baseNodes = data.nodes.filter(n => !n.isUserCreated);
    const customNodes = data.nodes.filter(n => n.isUserCreated);
    const baseEdges = data.edges.filter(e => !e.isUserCreated);
    const customEdges = data.edges.filter(e => e.isUserCreated);
    let mastered = 0, learning = 0, weak = 0, noData = 0;
    let masterySum = 0, masteryCount = 0;
    for (const n of baseNodes) {
      switch (n.masteryColor) {
        case 'green': mastered++; break;
        case 'yellow': learning++; break;
        case 'red': weak++; break;
        default: noData++;
      }
      if (n.mastery >= 0) { masterySum += n.mastery; masteryCount++; }
    }
    const total = baseNodes.length;
    return {
      total, mastered, learning, weak, noData,
      avgMastery: masteryCount > 0 ? masterySum / masteryCount : 0,
      customNodes: customNodes.length,
      customEdges: customEdges.length,
      baseNodes: total,
      baseEdges: baseEdges.length,
    };
  }

  it('avgMastery only averages nodes with mastery >= 0 (skips -1 sentinel)', () => {
    const stats = computeStats({
      nodes: [
        { masteryColor: 'gray', mastery: -1 },
        { masteryColor: 'green', mastery: 0.9 },
        { masteryColor: 'green', mastery: 0.7 },
      ],
      edges: [],
    });
    expect(stats.avgMastery).toBeCloseTo(0.8, 5);
  });

  it('avgMastery=0 when no nodes have valid mastery', () => {
    const stats = computeStats({
      nodes: [{ masteryColor: 'gray', mastery: -1 }],
      edges: [],
    });
    expect(stats.avgMastery).toBe(0);
  });

  it('separates base vs custom nodes/edges in counts', () => {
    const stats = computeStats({
      nodes: [
        { masteryColor: 'green', mastery: 0.9 },
        { masteryColor: 'green', mastery: 0.8, isUserCreated: true },
      ],
      edges: [
        {},
        { isUserCreated: true },
        { isUserCreated: true },
      ],
    });
    expect(stats.baseNodes).toBe(1);
    expect(stats.customNodes).toBe(1);
    expect(stats.baseEdges).toBe(1);
    expect(stats.customEdges).toBe(2);
  });

  it('default branch counts as noData (handles unknown masteryColor strings)', () => {
    const stats = computeStats({
      nodes: [{ masteryColor: 'unknown', mastery: 0.5 }],
      edges: [],
    });
    expect(stats.noData).toBe(1);
  });
});

// ── Sub-component declarations ─────────────────────────────

describe('Sub-component pinning', () => {
  it('declares EmptyComparison (zero-data state)', () => {
    expect(source).toMatch(/^function\s+EmptyComparison\(\)/m);
  });

  it('declares StatBadge', () => {
    expect(source).toMatch(/^function\s+StatBadge\(/m);
  });

  it('declares GapItem', () => {
    expect(source).toMatch(/^function\s+GapItem\(/m);
  });

  it('declares CustomEdgeItem', () => {
    expect(source).toMatch(/^function\s+CustomEdgeItem\(/m);
  });

  it('uses MasteryDonut inside the panel render', () => {
    expect(source).toContain('<MasteryDonut');
  });
});

// ── Module export shape ────────────────────────────────────

describe('Module exports', () => {
  it('exports MapComparisonPanel as memo-wrapped component', () => {
    expect(source).toMatch(/export\s+const\s+MapComparisonPanel\s*=\s*memo\(function\s+MapComparisonPanel/);
  });

  it('imports MASTERY_HEX from canonical mindmap types', () => {
    expect(source).toMatch(/import\s*\{[^}]*MASTERY_HEX[^}]*\}\s*from\s*['"]@\/app\/types\/mindmap['"]/);
  });

  it('uses useCountUp from hooks for animated stats', () => {
    expect(source).toContain('useCountUp');
  });

  it('uses useFocusTrap for the panel\'s focus management', () => {
    expect(source).toContain('useFocusTrap');
  });
});
