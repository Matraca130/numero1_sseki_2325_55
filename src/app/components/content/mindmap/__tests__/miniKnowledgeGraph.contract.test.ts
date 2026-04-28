// ============================================================
// Contract Tests — MiniKnowledgeGraph
//
// Source-based contract tests using readFileSync + string/regex
// matching to verify structural contracts without importing
// heavy dependencies (G6, etc.).
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(
  resolve(__dirname, '..', 'MiniKnowledgeGraph.tsx'),
  'utf-8',
);

describe('MiniKnowledgeGraph contract', () => {
  // ── Export ─────────────────────────────────────────────────

  it('exports MiniKnowledgeGraph as a memo-wrapped component', () => {
    expect(source).toMatch(/export\s+const\s+MiniKnowledgeGraph\s*=\s*React\.memo\(function\s+MiniKnowledgeGraph/);
  });

  // ── G6 Graph constructor ──────────────────────────────────

  it('imports Graph from @antv/g6', () => {
    expect(source).toMatch(/import\s*\{[^}]*Graph[^}]*\}\s*from\s*['"]@antv\/g6['"]/);
  });

  it('creates a G6 Graph instance', () => {
    expect(source).toContain('new Graph(');
  });

  // ── buildNodeStyle helper ─────────────────────────────────

  it('defines buildNodeStyle helper function', () => {
    expect(source).toMatch(/function\s+buildNodeStyle/);
  });

  it('buildNodeStyle uses isFocal parameter for styling', () => {
    expect(source).toContain('isFocal');
  });

  // ── Node click handler ────────────────────────────────────

  it('has click event handler for node click', () => {
    expect(source).toContain("graph.on('node:click'");
  });

  it('unsubscribes click handler on cleanup', () => {
    expect(source).toContain("graph.off('node:click'");
  });

  // ── Mastery color constants ───────────────────────────────

  it('uses MASTERY_HEX for node colors', () => {
    expect(source).toContain('MASTERY_HEX');
    expect(source).toMatch(/import\s*\{[^}]*MASTERY_HEX[^}]*\}\s*from/);
  });

  it('uses MASTERY_HEX_LIGHT for node colors', () => {
    expect(source).toContain('MASTERY_HEX_LIGHT');
    expect(source).toMatch(/import\s*\{[^}]*MASTERY_HEX_LIGHT[^}]*\}\s*from/);
  });

  // ── truncateLabel ─────────────────────────────────────────

  it('uses truncateLabel for label display', () => {
    expect(source).toContain('truncateLabel');
    expect(source).toMatch(/import\s*\{[^}]*truncateLabel[^}]*\}\s*from/);
  });

  // ── Cleanup: graph.destroy ────────────────────────────────

  it('destroys graph in useEffect cleanup', () => {
    expect(source).toContain('graph.destroy()');
  });

  it('nulls graphRef on destroy', () => {
    expect(source).toContain('graphRef.current = null');
  });

  // ── containerRef for DOM mounting ─────────────────────────

  it('has containerRef for DOM mounting', () => {
    expect(source).toContain('containerRef');
    expect(source).toContain('ref={containerRef}');
  });

  // ── Layout ────────────────────────────────────────────────

  it('uses a layout type for graph positioning', () => {
    // The component uses radial layout
    expect(source).toMatch(/layout:\s*\{[^}]*type:\s*['"]radial['"]/s);
  });

  // ── onNodeClickRef pattern ────────────────────────────────

  it('uses onNodeClickRef to avoid stale closures', () => {
    expect(source).toContain('onNodeClickRef');
    expect(source).toContain('onNodeClickRef.current = onNodeClick');
  });

  // ── ResizeObserver ────────────────────────────────────────

  it('uses ResizeObserver for responsive resizing', () => {
    expect(source).toContain('ResizeObserver');
    expect(source).toContain('ro.observe(container)');
    expect(source).toContain('ro.disconnect()');
  });

  // ── Accessibility ─────────────────────────────────────────

  it('has aria-label in Portuguese for the container', () => {
    expect(source).toMatch(/aria-label=\{?[`"'].*Mini mapa de conhecimento/);
  });

  it('has aria-roledescription for graph semantics', () => {
    expect(source).toContain('aria-roledescription="grafo de conhecimento"');
  });
});

// ── buildNodeStyle (replicated as pure function) ────────────

describe('buildNodeStyle (replicated)', () => {
  const colors = {
    primary: { 50: '#e8f5f1', 500: '#2a8c7a' },
    text: { primary: '#222' },
  };
  const MASTERY_HEX = { green: '#10b981', yellow: '#f59e0b', red: '#ef4444', gray: '#9ca3af' } as const;
  const MASTERY_HEX_LIGHT = { green: '#d1fae5', yellow: '#fef3c7', red: '#fee2e2', gray: '#f3f4f6' } as const;
  function truncateLabel(label: string, max: number) { return label.length > max ? label.slice(0, max - 1) + '…' : label; }

  type NodeLike = {
    id: string;
    label: string;
    masteryColor: keyof typeof MASTERY_HEX;
    isUserCreated?: boolean;
  };

  function buildNodeStyle(node: NodeLike, isFocal: boolean) {
    const isCustom = !!node.isUserCreated;
    return {
      fill: isCustom ? colors.primary[50] : MASTERY_HEX_LIGHT[node.masteryColor],
      stroke: isCustom ? colors.primary[500] : MASTERY_HEX[node.masteryColor],
      lineWidth: isFocal ? 3 : isCustom ? 2 : 1.5,
      lineDash: isCustom ? [6, 3] : undefined,
      shadowBlur: isFocal ? 10 : 0,
      shadowColor: isFocal ? (isCustom ? colors.primary[500] : MASTERY_HEX[node.masteryColor]) : 'transparent',
      size: isFocal ? 40 : 28,
      labelText: truncateLabel(node.label, 14),
      labelFill: colors.text.primary,
      labelFontSize: 10,
      labelFontFamily: 'Inter, sans-serif',
      labelPlacement: 'bottom' as const,
    };
  }

  const baseNode: NodeLike = { id: 'a', label: 'Mitose', masteryColor: 'green' };

  it('focal nodes are 40px, non-focal are 28px (40/28 ≈ 1.43× larger)', () => {
    expect(buildNodeStyle(baseNode, true).size).toBe(40);
    expect(buildNodeStyle(baseNode, false).size).toBe(28);
  });

  it('focal nodes have shadowBlur=10, non-focal=0', () => {
    expect(buildNodeStyle(baseNode, true).shadowBlur).toBe(10);
    expect(buildNodeStyle(baseNode, false).shadowBlur).toBe(0);
  });

  it('focal lineWidth=3 (highest priority over isCustom)', () => {
    const custom = { ...baseNode, isUserCreated: true };
    expect(buildNodeStyle(custom, true).lineWidth).toBe(3); // focal wins
    expect(buildNodeStyle(custom, false).lineWidth).toBe(2); // custom
    expect(buildNodeStyle(baseNode, false).lineWidth).toBe(1.5); // default
  });

  it('user-created nodes use the teal palette (primary[50] fill, primary[500] stroke)', () => {
    const custom = { ...baseNode, isUserCreated: true };
    expect(buildNodeStyle(custom, false).fill).toBe('#e8f5f1');
    expect(buildNodeStyle(custom, false).stroke).toBe('#2a8c7a');
  });

  it('non-custom nodes use MASTERY_HEX/MASTERY_HEX_LIGHT for the masteryColor tier', () => {
    expect(buildNodeStyle({ ...baseNode, masteryColor: 'red' }, false).fill).toBe(MASTERY_HEX_LIGHT.red);
    expect(buildNodeStyle({ ...baseNode, masteryColor: 'red' }, false).stroke).toBe(MASTERY_HEX.red);
  });

  it('user-created nodes get a [6,3] dashed border; non-custom is undefined', () => {
    const custom = { ...baseNode, isUserCreated: true };
    expect(buildNodeStyle(custom, false).lineDash).toEqual([6, 3]);
    expect(buildNodeStyle(baseNode, false).lineDash).toBeUndefined();
  });

  it('focal shadowColor matches stroke color (custom or mastery-tier)', () => {
    const custom = { ...baseNode, isUserCreated: true };
    expect(buildNodeStyle(custom, true).shadowColor).toBe('#2a8c7a');
    expect(buildNodeStyle(baseNode, true).shadowColor).toBe(MASTERY_HEX.green);
  });

  it('non-focal shadowColor is "transparent"', () => {
    expect(buildNodeStyle(baseNode, false).shadowColor).toBe('transparent');
  });

  it('label text is truncated at 14 chars', () => {
    const long = { ...baseNode, label: 'This is a very long label' };
    expect(buildNodeStyle(long, false).labelText.length).toBeLessThanOrEqual(14);
  });

  it('label fontSize is 10, fontFamily Inter, placement bottom', () => {
    const s = buildNodeStyle(baseNode, false);
    expect(s.labelFontSize).toBe(10);
    expect(s.labelFontFamily).toBe('Inter, sans-serif');
    expect(s.labelPlacement).toBe('bottom');
  });
});

// ── dataKey (replicated) ────────────────────────────────────

describe('dataKey hash (replicated)', () => {
  // Mirror the source-level hash function so we can verify its
  // identity properties (same data → same key, different data → diff
  // key, length included so prefix-collisions don't go undetected).
  function dataKey(data: { nodes: { id: string }[]; edges: { id: string }[] }): string {
    let hash = 0;
    for (let i = 0; i < data.nodes.length; i++) {
      const id = data.nodes[i].id;
      for (let j = 0; j < id.length; j++) hash = ((hash << 5) - hash + id.charCodeAt(j)) | 0;
    }
    const nodeHash = hash;
    hash = 0;
    for (let i = 0; i < data.edges.length; i++) {
      const id = data.edges[i].id;
      for (let j = 0; j < id.length; j++) hash = ((hash << 5) - hash + id.charCodeAt(j)) | 0;
    }
    return `${data.nodes.length}:${nodeHash}|${data.edges.length}:${hash}`;
  }

  it('returns the same key for identical data', () => {
    const data = { nodes: [{ id: 'a' }, { id: 'b' }], edges: [{ id: 'e1' }] };
    expect(dataKey(data)).toBe(dataKey({ ...data }));
  });

  it('changes when a node id changes', () => {
    const a = { nodes: [{ id: 'a' }], edges: [] };
    const b = { nodes: [{ id: 'b' }], edges: [] };
    expect(dataKey(a)).not.toBe(dataKey(b));
  });

  it('changes when an edge id changes', () => {
    const a = { nodes: [{ id: 'n1' }], edges: [{ id: 'e1' }] };
    const b = { nodes: [{ id: 'n1' }], edges: [{ id: 'e2' }] };
    expect(dataKey(a)).not.toBe(dataKey(b));
  });

  it('embeds counts so prefix-only changes are detected', () => {
    const a = { nodes: [{ id: 'a' }], edges: [] };
    const b = { nodes: [{ id: 'a' }, { id: 'b' }], edges: [] };
    // The "1:..." vs "2:..." prefix guarantees disambiguation.
    expect(dataKey(a).startsWith('1:')).toBe(true);
    expect(dataKey(b).startsWith('2:')).toBe(true);
  });

  it('returns "0:0|0:0" for empty data', () => {
    expect(dataKey({ nodes: [], edges: [] })).toBe('0:0|0:0');
  });

  it('is order-sensitive (intentional — order changes triggers refresh)', () => {
    const a = { nodes: [{ id: 'a' }, { id: 'b' }], edges: [] };
    const b = { nodes: [{ id: 'b' }, { id: 'a' }], edges: [] };
    // The hash depends on insertion order — same content, different order → different key.
    // This is actually the desired behavior for a perf cache key.
    expect(dataKey(a)).not.toBe(dataKey(b));
  });

  it('scales O(N) — 1000 nodes hashes without slowdown', () => {
    const big = { nodes: Array.from({ length: 1000 }, (_, i) => ({ id: `n${i}` })), edges: [] };
    const start = performance.now();
    dataKey(big);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(20); // generous; should be <1ms
  });
});

// ── Mobile padding switch ───────────────────────────────────

describe('Responsive padding', () => {
  it('uses miniPad=8 when container < 400px wide (mobile)', () => {
    expect(source).toMatch(/const isMobile\s*=\s*container\.clientWidth\s*<\s*400/);
    expect(source).toMatch(/const miniPad\s*=\s*isMobile\s*\?\s*8\s*:\s*16/);
  });

  it('passes miniPad to all four padding sides', () => {
    expect(source).toMatch(/padding:\s*\[miniPad,\s*miniPad,\s*miniPad,\s*miniPad\]/);
  });
});

// ── Layout tunables ─────────────────────────────────────────

describe('Radial layout tunables', () => {
  it('unitRadius=60 (compact, mini-graph appropriate)', () => {
    expect(source).toMatch(/unitRadius:\s*60/);
  });

  it('nodeSize=30, preventOverlap=true', () => {
    expect(source).toMatch(/nodeSize:\s*30/);
    expect(source).toMatch(/preventOverlap:\s*true/);
  });

  it('disables animations (animation: false) for instant layout', () => {
    expect(source).toMatch(/animation:\s*false/);
  });

  it('only enables zoom-canvas + drag-canvas behaviors (no node drag)', () => {
    expect(source).toMatch(/behaviors:\s*\[\s*'zoom-canvas',\s*'drag-canvas'\s*\]/);
  });

  it('uses circle node + line edge (minimal renderers)', () => {
    expect(source).toMatch(/node:\s*\{\s*type:\s*'circle'\s*\}/);
    expect(source).toMatch(/edge:\s*\{\s*type:\s*'line'\s*\}/);
  });

  it("autoFit='view' so layout fits without manual fitView", () => {
    expect(source).toMatch(/autoFit:\s*'view'/);
  });
});

// ── ResizeObserver guard ────────────────────────────────────

describe('ResizeObserver loop guard', () => {
  it('caches dimensions in prevSizeRef to skip identical resize() calls', () => {
    expect(source).toContain('prevSizeRef');
    expect(source).toMatch(/prev SizeRef\.current\s*=\s*\{\s*w,\s*h:\s*rh\s*\}|prevSizeRef\.current\s*=\s*\{\s*w,\s*h:\s*rh\s*\}/);
  });

  it('only calls resize when w>0 && rh>0 (skip during transitions)', () => {
    expect(source).toMatch(/w\s*>\s*0\s*&&\s*rh\s*>\s*0/);
  });

  it('only resizes when dimensions actually changed (anti-loop)', () => {
    expect(source).toMatch(/w\s*!==\s*prevSizeRef\.current\.w\s*\|\|\s*rh\s*!==\s*prevSizeRef\.current\.h/);
  });

  it('rounds dimensions via Math.round (sub-pixel jitter ignored)', () => {
    expect(source).toMatch(/Math\.round\(width\)/);
    expect(source).toMatch(/Math\.round\(h\)/);
  });
});

// ── justInitializedRef invariant ────────────────────────────

describe('Focal-change effect skips first run after init', () => {
  it('declares justInitializedRef boolean', () => {
    expect(source).toContain('justInitializedRef');
  });

  it('Effect 2 short-circuits when justInitializedRef is true', () => {
    expect(source).toMatch(/if\s*\(justInitializedRef\.current\)\s*\{[\s\S]*?justInitializedRef\.current\s*=\s*false[\s\S]*?return;/);
  });

  it('Effect 2 deps = [focalNodeId, ready, data.nodes]', () => {
    expect(source).toMatch(/\}, \[focalNodeId, ready, data\.nodes\]\)/);
  });
});

// ── Empty data handling ─────────────────────────────────────

describe('Empty data handling', () => {
  it('returns null when data.nodes is empty (no DOM)', () => {
    expect(source).toMatch(/if\s*\(data\.nodes\.length\s*===\s*0\)\s*return\s+null/);
  });

  it('destroys stale graph instance when data empties (memory-leak fix)', () => {
    expect(source).toMatch(/data\.nodes\.length\s*===\s*0[\s\S]{0,160}graphRef\.current\.destroy\(\)[\s\S]{0,40}graphRef\.current\s*=\s*null/);
  });
});

// ── Edge style mapping ──────────────────────────────────────

describe('Edge style mapping', () => {
  it('color precedence: customColor → primary[500] (user-created) → CONNECTION_TYPE_MAP color → text.disabled', () => {
    expect(source).toMatch(/edge\.customColor\s*\|\|\s*\(edge\.isUserCreated\s*\?\s*colors\.primary\[500\]\s*:\s*\(meta\?\.color\s*\|\|\s*colors\.text\.disabled\)\)/);
  });

  it('user-created edges use lineWidth 1.5; system edges 1', () => {
    expect(source).toMatch(/lineWidth:\s*edge\.isUserCreated\s*\?\s*1\.5\s*:\s*1/);
  });

  it("explicit dashed lineStyle → [6,3]", () => {
    expect(source).toMatch(/edge\.lineStyle\s*===\s*'dashed'\s*\?\s*\[6,\s*3\]/);
  });

  it("explicit dotted lineStyle → [2,4]", () => {
    expect(source).toMatch(/edge\.lineStyle\s*===\s*'dotted'\s*\?\s*\[2,\s*4\]/);
  });

  it('user-created edges with no explicit lineStyle default to [6,3] dashed', () => {
    expect(source).toMatch(/edge\.isUserCreated\s*&&\s*!edge\.lineStyle\s*\?\s*\[6,\s*3\]/);
  });

  it('endArrow set when edge.directed OR sourceKeywordId is present', () => {
    expect(source).toMatch(/endArrow:\s*edge\.directed\s*\|\|\s*!!edge\.sourceKeywordId/);
  });
});

// ── Aria-label is dynamic ───────────────────────────────────

describe('Dynamic aria-label', () => {
  it("includes the node count in the announcement", () => {
    expect(source).toMatch(/\$\{data\.nodes\.length\}\s+conceitos/);
  });

  it('hints that nodes are clickable', () => {
    expect(source).toContain('Clique em um nó');
  });
});

// ── Mount-tracking ──────────────────────────────────────────

describe('Mount-tracking discipline', () => {
  it('sets mountedRef true on mount, false on unmount', () => {
    expect(source).toContain('mountedRef.current = true');
    expect(source).toMatch(/return\s*\(\)\s*=>\s*\{\s*mountedRef\.current\s*=\s*false/);
  });

  it('graph.render().then short-circuits if !mountedRef.current OR graphRef changed', () => {
    expect(source).toMatch(/if\s*\(!mountedRef\.current\s*\|\|\s*graphRef\.current\s*!==\s*graph\)\s*return/);
  });
});
