// ============================================================
// Performance Tests -- Mindmap / Knowledge Graph at 500+ nodes
//
// Validates that core graph operations scale linearly (O(N+E))
// and do not regress to O(N^2). Thresholds are generous enough
// to pass on any modern machine but tight enough to catch
// quadratic regressions.
//
// Run:
//   npx vitest run src/app/components/content/mindmap/__tests__/performance-500-nodes.test.ts
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  getNodeFill,
  getNodeStroke,
  getEdgeColor,
  escHtml,
  buildChildrenMap,
  computeHiddenNodes,
} from '../graphHelpers';
import type { MapNode, MapEdge, GraphData } from '@/app/types/mindmap';
import { CONNECTION_TYPES, MASTERY_HEX_LIGHT, MASTERY_HEX } from '@/app/types/mindmap';
import type { MasteryColor } from '@/app/lib/mastery-helpers';

// ── Graph generators ──────────────────────────────────────────

const MASTERY_COLORS: MasteryColor[] = ['green', 'yellow', 'red', 'gray'];
const NODE_TYPES: MapNode['type'][] = ['keyword', 'topic', 'subtopic'];
const CONNECTION_KEYS = CONNECTION_TYPES.map(ct => ct.key);

function makeNode(i: number): MapNode {
  return {
    id: `n${i}`,
    label: `Node ${i} - Medical Keyword`,
    definition: `Definition for node ${i} with <html> & "special" chars`,
    type: NODE_TYPES[i % NODE_TYPES.length],
    mastery: i % 5 === 0 ? -1 : (i % 100) / 100,
    masteryColor: MASTERY_COLORS[i % MASTERY_COLORS.length],
    summaryId: `summary-${i % 50}`,
    topicId: `topic-${i % 10}`,
    flashcardCount: i % 20,
    quizCount: i % 10,
  };
}

/**
 * Generate a graph with N nodes and realistic edge density.
 * Creates a tree backbone (N-1 edges) plus random cross-links
 * to reach ~2.5 edges per node on average.
 */
function generateGraph(nodeCount: number): GraphData {
  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];
  let edgeId = 0;

  for (let i = 0; i < nodeCount; i++) {
    nodes.push(makeNode(i));
  }

  // Tree backbone: every node connects to its parent (i -> floor(i/3))
  // This gives a branching factor of ~3
  for (let i = 1; i < nodeCount; i++) {
    const parent = Math.floor((i - 1) / 3);
    edges.push({
      id: `e${edgeId++}`,
      source: `n${parent}`,
      target: `n${i}`,
      connectionType: CONNECTION_KEYS[i % CONNECTION_KEYS.length],
      label: `rel-${i}`,
    });
  }

  // Add cross-links to increase density to ~2.5 edges/node
  // Use deterministic "random" based on index for reproducibility
  const targetExtraEdges = Math.floor(nodeCount * 1.5);
  for (let k = 0; k < targetExtraEdges; k++) {
    const src = (k * 7 + 3) % nodeCount;
    const tgt = (k * 13 + 11) % nodeCount;
    if (src !== tgt) {
      edges.push({
        id: `e${edgeId++}`,
        source: `n${src}`,
        target: `n${tgt}`,
        connectionType: CONNECTION_KEYS[k % CONNECTION_KEYS.length],
      });
    }
  }

  return { nodes, edges };
}

/**
 * Generate a deep tree (chain) of given depth with branching factor 2.
 * Used for collapse/expand tests.
 */
function generateDeepTree(depth: number): GraphData {
  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];
  let nextId = 0;

  function addLevel(parentId: number, currentDepth: number): void {
    if (currentDepth >= depth) return;
    for (let b = 0; b < 2; b++) {
      const childId = ++nextId;
      nodes.push(makeNode(childId));
      edges.push({
        id: `e-${parentId}-${childId}`,
        source: `n${parentId}`,
        target: `n${childId}`,
      });
      addLevel(childId, currentDepth + 1);
    }
  }

  nodes.push(makeNode(0));
  addLevel(0, 0);
  return { nodes, edges };
}

/**
 * Replicated BFS logic from useLocalGraph (pure function version).
 */
function extractLocalGraph(
  fullGraph: GraphData,
  focalNodeId: string,
  depth: number = 1,
): GraphData | null {
  if (fullGraph.nodes.length === 0) return null;
  if (!fullGraph.nodes.some(n => n.id === focalNodeId)) return null;

  const nodeIds = new Set<string>();
  const queue: { id: string; d: number }[] = [{ id: focalNodeId, d: 0 }];
  let queueHead = 0;
  nodeIds.add(focalNodeId);

  const adj = new Map<string, string[]>();
  for (const edge of fullGraph.edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    if (!adj.has(edge.target)) adj.set(edge.target, []);
    adj.get(edge.source)!.push(edge.target);
    adj.get(edge.target)!.push(edge.source);
  }

  while (queueHead < queue.length) {
    const { id, d } = queue[queueHead++];
    if (d >= depth) continue;
    const neighbors = adj.get(id) || [];
    for (const n of neighbors) {
      if (!nodeIds.has(n)) {
        nodeIds.add(n);
        queue.push({ id: n, d: d + 1 });
      }
    }
  }

  const nodes = fullGraph.nodes.filter(n => nodeIds.has(n.id));
  const edges = fullGraph.edges.filter(
    e => nodeIds.has(e.source) && nodeIds.has(e.target),
  );

  return { nodes, edges };
}

/**
 * Replicated LRU cache logic from useGraphData.ts (pure, no React).
 */
class LRUCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  constructor(
    private maxEntries: number,
    private ttlMs: number,
  ) {}

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    // LRU: move to end
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key: string, data: T): void {
    this.cache.delete(key);
    if (this.cache.size >= this.maxEntries) {
      const lru = this.cache.keys().next().value;
      if (lru) this.cache.delete(lru);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get size(): number {
    return this.cache.size;
  }
}

// ── Helper: measure execution time ────────────────────────────

function timeMs(fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

// ── Pre-generate graphs (shared across tests) ────────────────

const graph500 = generateGraph(500);
const graph1000 = generateGraph(1000);
const graph2000 = generateGraph(2000);

// ============================================================
// 1. Graph data generation
// ============================================================

describe('Graph data generation', () => {
  it('generates 500+ nodes with realistic edge density', () => {
    expect(graph500.nodes.length).toBe(500);
    // ~2.5 edges per node on average
    const edgesPerNode = graph500.edges.length / graph500.nodes.length;
    expect(edgesPerNode).toBeGreaterThan(1.5);
    expect(edgesPerNode).toBeLessThan(4.0);
  });

  it('generates 1000 nodes', () => {
    expect(graph1000.nodes.length).toBe(1000);
  });

  it('generates 2000 nodes', () => {
    expect(graph2000.nodes.length).toBe(2000);
  });

  it('nodes have all required fields populated', () => {
    const node = graph500.nodes[42];
    expect(node.id).toBeDefined();
    expect(node.label).toBeDefined();
    expect(node.type).toBeDefined();
    expect(typeof node.mastery).toBe('number');
    expect(MASTERY_COLORS).toContain(node.masteryColor);
  });

  it('edges reference valid node IDs', () => {
    const nodeIds = new Set(graph500.nodes.map(n => n.id));
    for (const edge of graph500.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });
});

// ============================================================
// 2. buildChildrenMap performance
// ============================================================

describe('buildChildrenMap performance', () => {
  it('processes 500-node graph edges within 50ms', () => {
    const elapsed = timeMs(() => {
      buildChildrenMap(graph500.edges);
    });
    expect(elapsed).toBeLessThan(50);
  });

  it('processes 1000-node graph edges within 50ms', () => {
    const elapsed = timeMs(() => {
      buildChildrenMap(graph1000.edges);
    });
    expect(elapsed).toBeLessThan(50);
  });

  it('processes 2000-node graph edges within 50ms', () => {
    const elapsed = timeMs(() => {
      buildChildrenMap(graph2000.edges);
    });
    expect(elapsed).toBeLessThan(50);
  });

  it('scales linearly (2000 nodes is not 4x slower than 500 nodes)', () => {
    // Warm up — JIT, allocator, branch predictor
    for (let i = 0; i < 3; i++) {
      buildChildrenMap(graph500.edges);
      buildChildrenMap(graph2000.edges);
    }

    // Take MIN of N runs instead of median: minimum represents the
    // baseline cost without GC/scheduler interruptions. Median was
    // too noisy when the suite ran in parallel and CPU was saturated.
    const runs500: number[] = [];
    const runs2000: number[] = [];
    for (let i = 0; i < 10; i++) {
      runs500.push(timeMs(() => buildChildrenMap(graph500.edges)));
      runs2000.push(timeMs(() => buildChildrenMap(graph2000.edges)));
    }
    const min500 = Math.min(...runs500);
    const min2000 = Math.min(...runs2000);

    // Below 0.1ms the ratio is dominated by timer resolution. Skip the
    // ratio assertion in that case — the absolute-time tests above
    // already guard against catastrophic regressions.
    if (min500 < 0.1) return;

    // 2000 has 4x nodes/edges; linear should be ~4x, quadratic ~16x.
    // Allow up to 10x for residual jitter, but catch O(N^2).
    const ratio = min2000 / min500;
    expect(ratio).toBeLessThan(10);
  });

  it('returns correct structure', () => {
    const cm = buildChildrenMap(graph500.edges);
    expect(cm).toBeInstanceOf(Map);
    // Every source in edges should have an entry
    const sources = new Set(graph500.edges.map(e => e.source));
    for (const src of sources) {
      expect(cm.has(src)).toBe(true);
    }
  });
});

// ============================================================
// 3. computeHiddenNodes performance
// ============================================================

describe('computeHiddenNodes performance', () => {
  it('computes hidden nodes for 500 nodes with 100 collapsed within 50ms', () => {
    // Collapse the first 100 nodes that have children
    const cm = buildChildrenMap(graph500.edges);
    const collapsable = [...cm.keys()].slice(0, 100);
    const collapsed = new Set(collapsable);

    const elapsed = timeMs(() => {
      computeHiddenNodes(graph500.nodes, graph500.edges, collapsed, cm);
    });
    expect(elapsed).toBeLessThan(50);
  });

  it('returns a Set of hidden node IDs', () => {
    // Use a pure tree (no cross-links) so collapsing root reliably hides descendants
    const tree = generateDeepTree(6);
    const cm = buildChildrenMap(tree.edges);
    const collapsed = new Set(['n0']); // collapse root
    const hidden = computeHiddenNodes(tree.nodes, tree.edges, collapsed, cm);
    expect(hidden).toBeInstanceOf(Set);
    // Root is collapsed so all descendants should be hidden
    expect(hidden.size).toBeGreaterThan(0);
    // Root itself should NOT be hidden
    expect(hidden.has('n0')).toBe(false);
  });

  it('returns empty set when nothing is collapsed', () => {
    const hidden = computeHiddenNodes(graph500.nodes, graph500.edges, new Set());
    expect(hidden.size).toBe(0);
  });
});

// ============================================================
// 4. getNodeFill / getNodeStroke batch
// ============================================================

describe('getNodeFill / getNodeStroke batch performance', () => {
  it('calls getNodeFill for 500 nodes within 10ms', () => {
    const elapsed = timeMs(() => {
      for (const node of graph500.nodes) {
        getNodeFill(node.masteryColor);
      }
    });
    expect(elapsed).toBeLessThan(10);
  });

  it('calls getNodeStroke for 500 nodes within 10ms', () => {
    const elapsed = timeMs(() => {
      for (const node of graph500.nodes) {
        getNodeStroke(node.masteryColor);
      }
    });
    expect(elapsed).toBeLessThan(10);
  });

  it('returns valid hex colors', () => {
    for (const color of MASTERY_COLORS) {
      const fill = getNodeFill(color);
      const stroke = getNodeStroke(color);
      expect(fill).toMatch(/^#[0-9a-f]{6}$/i);
      expect(stroke).toMatch(/^#[0-9a-f]{6}$/i);
      expect(fill).toBe(MASTERY_HEX_LIGHT[color]);
      expect(stroke).toBe(MASTERY_HEX[color]);
    }
  });
});

// ============================================================
// 5. escHtml batch
// ============================================================

describe('escHtml batch performance', () => {
  const htmlStrings = Array.from({ length: 500 }, (_, i) =>
    `Node <b>${i}</b> has "mastery" & it's <100% done`,
  );

  it('escapes 500 strings within 10ms', () => {
    const elapsed = timeMs(() => {
      for (const s of htmlStrings) {
        escHtml(s);
      }
    });
    expect(elapsed).toBeLessThan(10);
  });

  it('correctly escapes all special characters', () => {
    const result = escHtml('<a href="x">&\'test\'</a>');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).not.toContain('"');
    expect(result).toContain('&amp;');
    expect(result).toContain('&#39;');
  });
});

// ============================================================
// 6. useLocalGraph BFS (pure function version)
// ============================================================

describe('BFS traversal (useLocalGraph logic) performance', () => {
  it('BFS depth=2 on 500-node graph completes within 50ms', () => {
    const elapsed = timeMs(() => {
      extractLocalGraph(graph500, 'n0', 2);
    });
    expect(elapsed).toBeLessThan(50);
  });

  it('BFS depth=1 returns focal node + direct neighbors only', () => {
    const result = extractLocalGraph(graph500, 'n0', 1)!;
    expect(result).not.toBeNull();
    // n0 should be included
    expect(result.nodes.some(n => n.id === 'n0')).toBe(true);
    // Should not include the entire graph
    expect(result.nodes.length).toBeLessThan(graph500.nodes.length);
    expect(result.nodes.length).toBeGreaterThan(1);
  });

  it('BFS depth=2 includes 2-hop neighborhood', () => {
    const result = extractLocalGraph(graph500, 'n0', 2)!;
    expect(result).not.toBeNull();
    // Depth 2 should include more nodes than depth 1
    const depth1 = extractLocalGraph(graph500, 'n0', 1)!;
    expect(result.nodes.length).toBeGreaterThanOrEqual(depth1.nodes.length);
  });

  it('BFS on disconnected node returns only that node', () => {
    // Add an isolated node
    const graphWithIsolated: GraphData = {
      nodes: [...graph500.nodes, makeNode(9999)],
      edges: [...graph500.edges],
    };
    const result = extractLocalGraph(graphWithIsolated, 'n9999', 2)!;
    expect(result.nodes.length).toBe(1);
    expect(result.edges.length).toBe(0);
  });
});

// ============================================================
// 7. LRU cache operations
// ============================================================

describe('LRU cache performance', () => {
  it('1000 get/set operations within 100ms', () => {
    const lru = new LRUCache<GraphData>(20, 5 * 60 * 1000);

    const elapsed = timeMs(() => {
      for (let i = 0; i < 1000; i++) {
        const key = `topic-${i % 30}`;
        lru.set(key, graph500);
        lru.get(key);
      }
    });
    expect(elapsed).toBeLessThan(100);
  });

  it('respects max entries (evicts LRU)', () => {
    const lru = new LRUCache<string>(5, 60_000);
    for (let i = 0; i < 10; i++) {
      lru.set(`k${i}`, `v${i}`);
    }
    // Only 5 entries should remain
    expect(lru.size).toBe(5);
    // Earliest entries should be evicted
    expect(lru.get('k0')).toBeNull();
    expect(lru.get('k1')).toBeNull();
    // Latest entries should remain
    expect(lru.get('k9')).toBe('v9');
  });

  it('moves accessed entries to end (LRU order)', () => {
    const lru = new LRUCache<string>(3, 60_000);
    lru.set('a', '1');
    lru.set('b', '2');
    lru.set('c', '3');
    // Access 'a' to make it most-recently-used
    lru.get('a');
    // Add a new entry -- should evict 'b' (now least-recently-used)
    lru.set('d', '4');
    expect(lru.get('b')).toBeNull();
    expect(lru.get('a')).toBe('1');
    expect(lru.get('c')).toBe('3');
  });

  it('expires entries after TTL', () => {
    // Use a tiny TTL and manipulate via Date.now
    const originalNow = Date.now;
    let fakeTime = 1000000;
    Date.now = () => fakeTime;

    try {
      const lru = new LRUCache<string>(10, 100); // 100ms TTL
      lru.set('key', 'value');
      expect(lru.get('key')).toBe('value');

      // Advance time past TTL
      fakeTime += 200;
      expect(lru.get('key')).toBeNull();
    } finally {
      Date.now = originalNow;
    }
  });
});

// ============================================================
// 8. Graph data transform (MapNode/MapEdge -> G6 format)
// ============================================================

describe('Graph data transform performance', () => {
  /**
   * Simulates the transformation done in buildGraphData (mindmapApi.ts):
   * mastery map + connections -> MapNode[] + MapEdge[]
   */
  function transformToG6(nodes: MapNode[], edges: MapEdge[]): { g6Nodes: object[]; g6Edges: object[] } {
    const g6Nodes = nodes.map(node => ({
      id: node.id,
      data: {
        label: node.label,
        type: node.type,
        fill: getNodeFill(node.masteryColor),
        stroke: getNodeStroke(node.masteryColor),
        mastery: node.mastery,
        definition: node.definition ? escHtml(node.definition) : undefined,
      },
    }));

    const g6Edges = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: {
        label: edge.label,
        color: getEdgeColor(edge.connectionType),
        connectionType: edge.connectionType,
      },
    }));

    return { g6Nodes, g6Edges };
  }

  it('transforms 500 nodes + ~1200 edges to G6 format within 100ms', () => {
    expect(graph500.edges.length).toBeGreaterThan(500);

    const elapsed = timeMs(() => {
      transformToG6(graph500.nodes, graph500.edges);
    });
    expect(elapsed).toBeLessThan(100);
  });

  it('produces correct number of G6 nodes and edges', () => {
    const { g6Nodes, g6Edges } = transformToG6(graph500.nodes, graph500.edges);
    expect(g6Nodes.length).toBe(graph500.nodes.length);
    expect(g6Edges.length).toBe(graph500.edges.length);
  });

  it('G6 nodes have fill and stroke colors', () => {
    const { g6Nodes } = transformToG6(graph500.nodes.slice(0, 5), graph500.edges.slice(0, 5));
    for (const node of g6Nodes) {
      const data = (node as { data: { fill: string; stroke: string } }).data;
      expect(data.fill).toMatch(/^#[0-9a-f]{6}$/i);
      expect(data.stroke).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

// ============================================================
// 9. Memory usage
// ============================================================

describe('Memory usage', () => {
  it('500-node graph data serializes to less than 5MB', () => {
    const json = JSON.stringify(graph500);
    const sizeBytes = new Blob([json]).size;
    const sizeMB = sizeBytes / (1024 * 1024);
    expect(sizeMB).toBeLessThan(5);
  });

  it('2000-node graph data serializes to less than 20MB', () => {
    const json = JSON.stringify(graph2000);
    const sizeBytes = new Blob([json]).size;
    const sizeMB = sizeBytes / (1024 * 1024);
    expect(sizeMB).toBeLessThan(20);
  });
});

// ============================================================
// 10. Collapse/expand cycle
// ============================================================

describe('Collapse/expand cycle performance', () => {
  it('10 rapid collapse/expand on deep tree within 200ms', () => {
    // Generate a tree with depth 8 (2^8 - 1 = 255 nodes)
    const tree = generateDeepTree(8);
    expect(tree.nodes.length).toBeGreaterThan(100);

    const cm = buildChildrenMap(tree.edges);
    // Pick nodes at different depths to collapse/expand
    const nodesWithChildren = [...cm.keys()].slice(0, 10);

    const elapsed = timeMs(() => {
      for (let cycle = 0; cycle < 10; cycle++) {
        // Collapse
        const collapsed = new Set(nodesWithChildren);
        computeHiddenNodes(tree.nodes, tree.edges, collapsed, cm);
        // Expand (empty set)
        computeHiddenNodes(tree.nodes, tree.edges, new Set(), cm);
      }
    });
    expect(elapsed).toBeLessThan(200);
  });

  it('collapse root hides most nodes, expand shows all', () => {
    const tree = generateDeepTree(6);
    const cm = buildChildrenMap(tree.edges);

    // Collapse root
    const hidden = computeHiddenNodes(tree.nodes, tree.edges, new Set(['n0']), cm);
    // Most nodes (all descendants) should be hidden
    expect(hidden.size).toBeGreaterThan(tree.nodes.length * 0.5);
    expect(hidden.has('n0')).toBe(false);

    // Expand all
    const visible = computeHiddenNodes(tree.nodes, tree.edges, new Set(), cm);
    expect(visible.size).toBe(0);
  });

  it('collapsing a leaf node hides nothing', () => {
    const tree = generateDeepTree(4);
    const cm = buildChildrenMap(tree.edges);
    // Find a leaf (node with no children in the map)
    const allIds = new Set(tree.nodes.map(n => n.id));
    const parents = new Set(cm.keys());
    const leaves = [...allIds].filter(id => !parents.has(id));
    expect(leaves.length).toBeGreaterThan(0);

    const hidden = computeHiddenNodes(tree.nodes, tree.edges, new Set([leaves[0]]), cm);
    // Collapsing a leaf should hide nothing (it has no children)
    expect(hidden.size).toBe(0);
  });
});

// ============================================================
// Bonus: getEdgeColor batch
// ============================================================

describe('getEdgeColor batch performance', () => {
  it('resolves edge colors for 500+ edges within 10ms', () => {
    const elapsed = timeMs(() => {
      for (const edge of graph500.edges) {
        getEdgeColor(edge.connectionType);
      }
    });
    expect(elapsed).toBeLessThan(10);
  });
});
