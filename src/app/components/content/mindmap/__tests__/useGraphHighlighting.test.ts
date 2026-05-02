// ============================================================
// Tests -- useGraphHighlighting (highlight, review, multi-select)
//
// Tests the hook that manages:
// 1. applyMultiSelectionState — adding/removing multiSelected
//    state on graph nodes via stub Graph object
// 2. Highlight/review styling effect — source contract tests
// 3. Selected node highlight effect — source contract tests
//
// The hook uses G6 Graph methods heavily. We test
// applyMultiSelectionState with a mock graph, and verify
// effect logic via source contract (readFileSync + regex).
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Source for contract tests ────────────────────────────────

const source = readFileSync(resolve(__dirname, '..', 'useGraphHighlighting.ts'), 'utf-8');

// ── Stub graph factory ───────────────────────────────────────

function createStubGraph() {
  const elementStates = new Map<string, string[]>();
  const nodeDataUpdates: unknown[] = [];
  const edgeDataUpdates: unknown[] = [];

  return {
    getElementState: vi.fn((id: string) => elementStates.get(id) ?? []),
    setElementState: vi.fn((id: string, states: string[]) => {
      elementStates.set(id, states);
    }),
    getNodeData: vi.fn(() => [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }]),
    updateNodeData: vi.fn((updates: unknown[]) => nodeDataUpdates.push(...updates)),
    updateEdgeData: vi.fn((updates: unknown[]) => edgeDataUpdates.push(...updates)),
    _elementStates: elementStates,
    _nodeDataUpdates: nodeDataUpdates,
    _edgeDataUpdates: edgeDataUpdates,
  };
}

// ── Mock dependencies ────────────────────────────────────────

vi.mock('@/app/design-system', () => ({
  colors: {
    text: { primary: '#e2e8f0', tertiary: '#64748b' },
  },
}));

vi.mock('../graphHelpers', () => ({
  getNodeStroke: (masteryColor: string) =>
    masteryColor === 'green' ? '#22c55e' : '#94a3b8',
  devWarn: vi.fn(),
}));

vi.mock('../useGraphInit', () => ({
  warnIfNotDestroyed: vi.fn(),
}));

vi.mock('@/app/types/mindmap', () => ({
  truncateLabel: (label: string) => label.length > 20 ? label.slice(0, 20) + '...' : label,
}));

import { useGraphHighlighting } from '../useGraphHighlighting';
import type { UseGraphHighlightingOptions } from '../useGraphHighlighting';

// ── Default options factory ──────────────────────────────────

function createDefaultOpts(overrides: Partial<UseGraphHighlightingOptions> = {}): UseGraphHighlightingOptions {
  const stubGraph = createStubGraph();
  return {
    graphRef: { current: stubGraph as any },
    ready: true,
    graphVersion: 1,
    highlightNodeIds: undefined,
    reviewNodeIds: undefined,
    selectedNodeId: null,
    highlightEpoch: 0,
    setHighlightEpoch: vi.fn(),
    layoutInProgressRef: { current: false },
    dataNodesRef: { current: [] },
    dataEdgesRef: { current: [] },
    nodeById: new Map(),
    batchDraw: vi.fn(),
    ...overrides,
  };
}

// ── applyMultiSelectionState (unit tests with stub graph) ────

describe('useGraphHighlighting: applyMultiSelectionState', () => {
  it('adds multiSelected state to new nodes', () => {
    const stubGraph = createStubGraph();
    const opts = createDefaultOpts({ graphRef: { current: stubGraph as any } });
    const { result } = renderHook(() => useGraphHighlighting(opts));

    act(() => {
      result.current.applyMultiSelectionState(stubGraph as any, new Set(['n1', 'n2']));
    });

    expect(stubGraph.setElementState).toHaveBeenCalledWith('n1', ['multiSelected']);
    expect(stubGraph.setElementState).toHaveBeenCalledWith('n2', ['multiSelected']);
  });

  it('removes multiSelected state from deselected nodes', () => {
    const stubGraph = createStubGraph();
    const opts = createDefaultOpts({ graphRef: { current: stubGraph as any } });
    const { result } = renderHook(() => useGraphHighlighting(opts));

    // First select n1 and n2
    act(() => {
      result.current.applyMultiSelectionState(stubGraph as any, new Set(['n1', 'n2']));
    });

    // Then select only n1 -- n2 should be deselected
    stubGraph.setElementState.mockClear();
    stubGraph._elementStates.set('n2', ['multiSelected']);

    act(() => {
      result.current.applyMultiSelectionState(stubGraph as any, new Set(['n1']));
    });

    // n2 should have multiSelected removed
    const n2Calls = stubGraph.setElementState.mock.calls.filter(
      (c: [string, string[]]) => c[0] === 'n2',
    );
    expect(n2Calls.length).toBeGreaterThan(0);
    // The state should not contain multiSelected
    const lastN2State = n2Calls[n2Calls.length - 1][1];
    expect(lastN2State).not.toContain('multiSelected');
  });

  it('calls batchDraw after applying state', () => {
    const stubGraph = createStubGraph();
    const batchDraw = vi.fn();
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      batchDraw,
    });
    const { result } = renderHook(() => useGraphHighlighting(opts));

    act(() => {
      result.current.applyMultiSelectionState(stubGraph as any, new Set(['n1']));
    });

    expect(batchDraw).toHaveBeenCalled();
  });

  it('updates prevMultiRef to track current selection', () => {
    const stubGraph = createStubGraph();
    const opts = createDefaultOpts({ graphRef: { current: stubGraph as any } });
    const { result } = renderHook(() => useGraphHighlighting(opts));

    expect(result.current.prevMultiRef.current.size).toBe(0);

    act(() => {
      result.current.applyMultiSelectionState(stubGraph as any, new Set(['n1', 'n2']));
    });

    expect(result.current.prevMultiRef.current.size).toBe(2);
    expect(result.current.prevMultiRef.current.has('n1')).toBe(true);
    expect(result.current.prevMultiRef.current.has('n2')).toBe(true);
  });

  it('handles empty selection (clear all)', () => {
    const stubGraph = createStubGraph();
    const opts = createDefaultOpts({ graphRef: { current: stubGraph as any } });
    const { result } = renderHook(() => useGraphHighlighting(opts));

    // Select some nodes first
    act(() => {
      result.current.applyMultiSelectionState(stubGraph as any, new Set(['n1']));
    });

    // Clear selection
    act(() => {
      result.current.applyMultiSelectionState(stubGraph as any, new Set());
    });

    expect(result.current.prevMultiRef.current.size).toBe(0);
  });

  it('preserves existing non-multiSelected states', () => {
    const stubGraph = createStubGraph();
    stubGraph._elementStates.set('n1', ['hovered', 'active']);
    stubGraph.getElementState.mockImplementation((id: string) =>
      stubGraph._elementStates.get(id) ?? [],
    );

    const opts = createDefaultOpts({ graphRef: { current: stubGraph as any } });
    const { result } = renderHook(() => useGraphHighlighting(opts));

    act(() => {
      result.current.applyMultiSelectionState(stubGraph as any, new Set(['n1']));
    });

    // Should add multiSelected while keeping hovered, active
    const n1Calls = stubGraph.setElementState.mock.calls.filter(
      (c: [string, string[]]) => c[0] === 'n1',
    );
    const lastN1State = n1Calls[n1Calls.length - 1][1];
    expect(lastN1State).toContain('multiSelected');
    expect(lastN1State).toContain('hovered');
    expect(lastN1State).toContain('active');
  });

  it('does not duplicate multiSelected if already present', () => {
    const stubGraph = createStubGraph();
    stubGraph._elementStates.set('n1', ['multiSelected']);
    stubGraph.getElementState.mockImplementation((id: string) =>
      stubGraph._elementStates.get(id) ?? [],
    );

    const opts = createDefaultOpts({ graphRef: { current: stubGraph as any } });
    const { result } = renderHook(() => useGraphHighlighting(opts));

    // First call sets prevMultiRef
    act(() => {
      result.current.applyMultiSelectionState(stubGraph as any, new Set());
    });

    // Now re-select n1
    act(() => {
      result.current.applyMultiSelectionState(stubGraph as any, new Set(['n1']));
    });

    const n1Calls = stubGraph.setElementState.mock.calls.filter(
      (c: [string, string[]]) => c[0] === 'n1',
    );
    const lastN1State = n1Calls[n1Calls.length - 1][1];
    const multiCount = lastN1State.filter((s: string) => s === 'multiSelected').length;
    expect(multiCount).toBe(1);
  });
});

// ── Return shape ─────────────────────────────────────────────

describe('useGraphHighlighting: return shape', () => {
  it('returns applyMultiSelectionState function', () => {
    const opts = createDefaultOpts();
    const { result } = renderHook(() => useGraphHighlighting(opts));
    expect(typeof result.current.applyMultiSelectionState).toBe('function');
  });

  it('returns prevMultiRef as a ref with Set value', () => {
    const opts = createDefaultOpts();
    const { result } = renderHook(() => useGraphHighlighting(opts));
    expect(result.current.prevMultiRef.current).toBeInstanceOf(Set);
  });
});

// ── Source contract: highlight/review effect ──────────────────

describe('useGraphHighlighting: highlight/review styling (source contract)', () => {
  it('uses useEffect for highlight/review changes', () => {
    expect(source).toContain('useEffect');
  });

  it('checks ready and layoutInProgressRef before applying', () => {
    expect(source).toContain('if (!graph || !ready || layoutInProgressRef.current) return');
  });

  it('tracks epoch changes to force re-apply', () => {
    expect(source).toContain('highlightEpoch');
    expect(source).toContain('prevEpochRef');
    expect(source).toContain('epochChanged');
  });

  it('computes highlight dimming at 0.35 opacity', () => {
    expect(source).toContain('opacity: isDimmed ? 0.35 : 1');
  });

  it('computes edge dimming at 0.2 opacity', () => {
    expect(source).toContain('opacity: edgeDimmed ? 0.2 : 1');
  });

  it('applies shadow glow to highlighted nodes', () => {
    expect(source).toContain('shadowBlur: isHighlighted ? 10');
  });

  it('applies orange stroke for review nodes', () => {
    expect(source).toContain("'#f97316'");
  });

  it('adds warning prefix to review node labels', () => {
    // Unicode warning sign prefix
    expect(source).toContain("'\\u26a0 '");
  });

  it('increases lineWidth for highlighted nodes', () => {
    expect(source).toContain('styleUpdate.lineWidth = 3');
  });

  it('increases lineWidth for review nodes', () => {
    expect(source).toContain('styleUpdate.lineWidth = 2.5');
  });

  it('sets needsReview in node data for review nodes', () => {
    expect(source).toContain('data: { needsReview }');
  });

  it('skips nodes not visible in graph', () => {
    expect(source).toContain('if (visibleNodeIds && !visibleNodeIds.has(node.id)) continue');
  });

  it('edge highlighting requires both endpoints to be highlighted', () => {
    expect(source).toContain('highlightNodeIds!.has(edge.source) && highlightNodeIds!.has(edge.target)');
  });

  it('calls batchDraw after applying highlight updates', () => {
    const batchDrawCount = (source.match(/batchDraw\(\)/g) || []).length;
    expect(batchDrawCount).toBeGreaterThanOrEqual(3);
  });
});

// ── Source contract: selected node effect ─────────────────────

describe('useGraphHighlighting: selected node highlight (source contract)', () => {
  it('tracks previous selected node via prevSelectedRef', () => {
    expect(source).toContain('prevSelectedRef');
  });

  it('skips if prev === curr', () => {
    expect(source).toContain('if (prev === curr) return');
  });

  it('clears shadow on previously selected node', () => {
    expect(source).toContain("shadowColor: 'transparent'");
    expect(source).toContain('shadowBlur: 0');
  });

  it('applies shadow glow to newly selected node', () => {
    expect(source).toContain('shadowBlur: 12');
  });

  it('uses getNodeStroke for selected node shadow color', () => {
    expect(source).toContain('getNodeStroke(currNode.masteryColor)');
  });

  it('depends on selectedNodeId, ready, graphVersion, nodeById', () => {
    expect(source).toContain('[selectedNodeId, ready, graphVersion, nodeById, graphRef]');
  });

  it('validates node exists in nodeById before updating', () => {
    expect(source).toContain('nodeById.get(prev)');
    expect(source).toContain('nodeById.get(curr)');
  });
});

// ── Source contract: interface and exports ────────────────────

describe('useGraphHighlighting: exports', () => {
  it('exports UseGraphHighlightingOptions interface', () => {
    expect(source).toMatch(/export\s+interface\s+UseGraphHighlightingOptions/);
  });

  it('exports UseGraphHighlightingReturn interface', () => {
    expect(source).toMatch(/export\s+interface\s+UseGraphHighlightingReturn/);
  });

  it('exports useGraphHighlighting function', () => {
    expect(source).toMatch(/export\s+function\s+useGraphHighlighting/);
  });

  it('options include highlightNodeIds and reviewNodeIds', () => {
    expect(source).toContain('highlightNodeIds?: Set<string>');
    expect(source).toContain('reviewNodeIds?: Set<string>');
  });

  it('options include highlightEpoch for force-refresh', () => {
    expect(source).toContain('highlightEpoch: number');
  });

  it('return type includes applyMultiSelectionState and prevMultiRef', () => {
    expect(source).toContain('applyMultiSelectionState');
    expect(source).toContain('prevMultiRef');
  });
});

// ── Error handling ───────────────────────────────────────────

describe('useGraphHighlighting: error handling', () => {
  it('wraps multi-selection in try/catch with warnIfNotDestroyed', () => {
    expect(source).toContain('warnIfNotDestroyed');
  });

  it('wraps highlight update in try/catch', () => {
    // There should be multiple try/catch blocks
    const tryCount = (source.match(/\btry\s*\{/g) || []).length;
    expect(tryCount).toBeGreaterThanOrEqual(3);
  });

  it('handles getElementState failure gracefully in multi-select', () => {
    // The inner catch sets fallback state
    expect(source).toContain("graph.setElementState(id, ['multiSelected'])");
  });
});

// ── Behavioral: highlight/review effect — gating ─────────────

describe('useGraphHighlighting: highlight effect gating (behavioral)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not call updateNodeData when ready=false', () => {
    const stubGraph = createStubGraph();
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      ready: false,
      highlightNodeIds: new Set(['n1']),
      dataNodesRef: { current: [{ id: 'n1', label: 'A', masteryColor: 'green' } as any] },
    });
    renderHook(() => useGraphHighlighting(opts));
    expect(stubGraph.updateNodeData).not.toHaveBeenCalled();
  });

  it('does not call updateNodeData when layoutInProgressRef is true', () => {
    const stubGraph = createStubGraph();
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      layoutInProgressRef: { current: true },
      highlightNodeIds: new Set(['n1']),
      dataNodesRef: { current: [{ id: 'n1', label: 'A', masteryColor: 'green' } as any] },
    });
    renderHook(() => useGraphHighlighting(opts));
    expect(stubGraph.updateNodeData).not.toHaveBeenCalled();
  });

  it('does nothing when graphRef.current is null', () => {
    const opts = createDefaultOpts({
      graphRef: { current: null },
      highlightNodeIds: new Set(['n1']),
      dataNodesRef: { current: [{ id: 'n1', label: 'A', masteryColor: 'green' } as any] },
    });
    // Should not throw
    expect(() => renderHook(() => useGraphHighlighting(opts))).not.toThrow();
  });

  it('runs once on mount when highlightNodeIds is set', () => {
    const stubGraph = createStubGraph();
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      highlightNodeIds: new Set(['n1']),
      dataNodesRef: { current: [{ id: 'n1', label: 'A', masteryColor: 'green' } as any] },
    });
    renderHook(() => useGraphHighlighting(opts));
    expect(stubGraph.updateNodeData).toHaveBeenCalledTimes(1);
  });

  it('skips re-apply when same Set ref + same epoch (rerender)', () => {
    const stubGraph = createStubGraph();
    const highlightNodeIds = new Set(['n1']);
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      highlightNodeIds,
      dataNodesRef: { current: [{ id: 'n1', label: 'A', masteryColor: 'green' } as any] },
    });
    const { rerender } = renderHook(
      ({ o }) => useGraphHighlighting(o),
      { initialProps: { o: opts } },
    );
    const callsAfterMount = stubGraph.updateNodeData.mock.calls.length;
    // Rerender with same opts — same Set ref, same epoch
    rerender({ o: opts });
    expect(stubGraph.updateNodeData.mock.calls.length).toBe(callsAfterMount);
  });

  it('re-applies when epoch increments even with same Set ref', () => {
    const stubGraph = createStubGraph();
    const highlightNodeIds = new Set(['n1']);
    const initial = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      highlightNodeIds,
      highlightEpoch: 0,
      dataNodesRef: { current: [{ id: 'n1', label: 'A', masteryColor: 'green' } as any] },
    });
    const { rerender } = renderHook(
      ({ o }) => useGraphHighlighting(o),
      { initialProps: { o: initial } },
    );
    const before = stubGraph.updateNodeData.mock.calls.length;
    rerender({ o: { ...initial, highlightEpoch: 1 } });
    expect(stubGraph.updateNodeData.mock.calls.length).toBeGreaterThan(before);
  });

  it('re-applies when highlightNodeIds reference changes', () => {
    const stubGraph = createStubGraph();
    const initial = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      highlightNodeIds: new Set(['n1']),
      dataNodesRef: { current: [{ id: 'n1', label: 'A', masteryColor: 'green' } as any] },
    });
    const { rerender } = renderHook(
      ({ o }) => useGraphHighlighting(o),
      { initialProps: { o: initial } },
    );
    const before = stubGraph.updateNodeData.mock.calls.length;
    rerender({ o: { ...initial, highlightNodeIds: new Set(['n1']) } });
    expect(stubGraph.updateNodeData.mock.calls.length).toBeGreaterThan(before);
  });

  it('does nothing when both highlight and review are undefined and epoch unchanged', () => {
    const stubGraph = createStubGraph();
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      highlightNodeIds: undefined,
      reviewNodeIds: undefined,
      dataNodesRef: { current: [{ id: 'n1', label: 'A', masteryColor: 'green' } as any] },
    });
    renderHook(() => useGraphHighlighting(opts));
    expect(stubGraph.updateNodeData).not.toHaveBeenCalled();
  });

  it('does nothing when both highlight and review are empty sets and epoch unchanged', () => {
    const stubGraph = createStubGraph();
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      highlightNodeIds: new Set(),
      reviewNodeIds: new Set(),
      dataNodesRef: { current: [{ id: 'n1', label: 'A', masteryColor: 'green' } as any] },
    });
    renderHook(() => useGraphHighlighting(opts));
    expect(stubGraph.updateNodeData).not.toHaveBeenCalled();
  });

  it('does run when transitioning from highlight set to empty set (clear)', () => {
    const stubGraph = createStubGraph();
    const initial = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      highlightNodeIds: new Set(['n1']),
      dataNodesRef: { current: [{ id: 'n1', label: 'A', masteryColor: 'green' } as any] },
    });
    const { rerender } = renderHook(
      ({ o }) => useGraphHighlighting(o),
      { initialProps: { o: initial } },
    );
    const before = stubGraph.updateNodeData.mock.calls.length;
    rerender({ o: { ...initial, highlightNodeIds: new Set() } });
    expect(stubGraph.updateNodeData.mock.calls.length).toBeGreaterThan(before);
  });
});

// ── Behavioral: highlight/review style content ───────────────

function getNodeUpdate(stub: ReturnType<typeof createStubGraph>, id: string): any {
  const allUpdates: any[] = [];
  for (const call of stub.updateNodeData.mock.calls) {
    if (Array.isArray(call[0])) allUpdates.push(...call[0]);
  }
  return allUpdates.find(u => u.id === id);
}

describe('useGraphHighlighting: highlighted node styles (behavioral)', () => {
  beforeEach(() => vi.clearAllMocks());

  function setup() {
    const stubGraph = createStubGraph();
    stubGraph.getNodeData.mockReturnValue([{ id: 'n1' }, { id: 'n2' }]);
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      highlightNodeIds: new Set(['n1']),
      dataNodesRef: {
        current: [
          { id: 'n1', label: 'Highlighted', masteryColor: 'green' },
          { id: 'n2', label: 'Dimmed', masteryColor: 'green' },
        ] as any,
      },
    });
    renderHook(() => useGraphHighlighting(opts));
    return { stubGraph };
  }

  it('highlighted node gets shadowBlur=10', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n1');
    expect(u.style.shadowBlur).toBe(10);
  });

  it('highlighted node gets lineWidth=3', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n1');
    expect(u.style.lineWidth).toBe(3);
  });

  it('highlighted node gets opacity=1', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n1');
    expect(u.style.opacity).toBe(1);
  });

  it('highlighted node uses mastery stroke color for shadow', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n1');
    expect(u.style.shadowColor).toBe('#22c55e');
  });

  it('highlighted node label uses primary text color', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n1');
    expect(u.style.labelFill).toBe('#e2e8f0');
  });

  it('highlighted-only node has falsy needsReview in data', () => {
    // Source: needsReview = hasReview && reviewNodeIds!.has(node.id)
    // When hasReview is falsy (undefined reviewNodeIds), this is undefined.
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n1');
    expect(u.data.needsReview).toBeFalsy();
  });

  it('dimmed node (not in highlight set) gets opacity=0.35', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n2');
    expect(u.style.opacity).toBe(0.35);
  });

  it('dimmed node label uses tertiary text color', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n2');
    expect(u.style.labelFill).toBe('#64748b');
  });

  it('dimmed node has shadowBlur=0 (no glow)', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n2');
    expect(u.style.shadowBlur).toBe(0);
  });

  it('dimmed node has shadowColor=transparent', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n2');
    expect(u.style.shadowColor).toBe('transparent');
  });

  it('dimmed node does not set lineWidth', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n2');
    expect(u.style.lineWidth).toBeUndefined();
  });
});

describe('useGraphHighlighting: review-only node styles (behavioral)', () => {
  beforeEach(() => vi.clearAllMocks());

  function setup() {
    const stubGraph = createStubGraph();
    stubGraph.getNodeData.mockReturnValue([{ id: 'n1' }]);
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      reviewNodeIds: new Set(['n1']),
      dataNodesRef: {
        current: [{ id: 'n1', label: 'Review me', masteryColor: 'green' }] as any,
      },
    });
    renderHook(() => useGraphHighlighting(opts));
    return { stubGraph };
  }

  it('review node gets shadowBlur=8', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n1');
    expect(u.style.shadowBlur).toBe(8);
  });

  it('review node gets lineWidth=2.5', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n1');
    expect(u.style.lineWidth).toBe(2.5);
  });

  it('review node gets orange shadowColor', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n1');
    expect(u.style.shadowColor).toBe('#f97316');
  });

  it('review node label gets warning prefix', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n1');
    expect(u.style.labelText).toMatch(/^⚠ /);
  });

  it('review node label fill is dark orange (#c2410c)', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n1');
    expect(u.style.labelFill).toBe('#c2410c');
  });

  it('review node has needsReview=true in data', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n1');
    expect(u.data.needsReview).toBe(true);
  });

  it('review node has opacity=1 (not dimmed when no highlight active)', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n1');
    expect(u.style.opacity).toBe(1);
  });
});

// ── Behavioral: overlap semantics ────────────────────────────

describe('useGraphHighlighting: highlight + review overlap (behavioral)', () => {
  beforeEach(() => vi.clearAllMocks());

  function setup() {
    const stubGraph = createStubGraph();
    stubGraph.getNodeData.mockReturnValue([{ id: 'n1' }]);
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      highlightNodeIds: new Set(['n1']),
      reviewNodeIds: new Set(['n1']),
      dataNodesRef: {
        current: [{ id: 'n1', label: 'Both', masteryColor: 'green' }] as any,
      },
    });
    renderHook(() => useGraphHighlighting(opts));
    return { stubGraph };
  }

  it('highlight wins for lineWidth (3 not 2.5)', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n1');
    expect(u.style.lineWidth).toBe(3);
  });

  it('highlight wins for shadowBlur (10 not 8)', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n1');
    expect(u.style.shadowBlur).toBe(10);
  });

  it('review wins for shadowColor (orange overrides mastery)', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n1');
    expect(u.style.shadowColor).toBe('#f97316');
  });

  it('review wins for labelFill (dark orange)', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n1');
    expect(u.style.labelFill).toBe('#c2410c');
  });

  it('label gets warning prefix (review wins)', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n1');
    expect(u.style.labelText).toMatch(/^⚠ /);
  });

  it('node still has needsReview=true in data', () => {
    const { stubGraph } = setup();
    const u = getNodeUpdate(stubGraph, 'n1');
    expect(u.data.needsReview).toBe(true);
  });
});

// ── Behavioral: edge dimming ─────────────────────────────────

describe('useGraphHighlighting: edge dimming (behavioral)', () => {
  beforeEach(() => vi.clearAllMocks());

  function getEdgeUpdate(stub: ReturnType<typeof createStubGraph>, id: string): any {
    const allUpdates: any[] = [];
    for (const call of stub.updateEdgeData.mock.calls) {
      if (Array.isArray(call[0])) allUpdates.push(...call[0]);
    }
    return allUpdates.find(u => u.id === id);
  }

  it('edge with both endpoints highlighted gets opacity=1', () => {
    const stubGraph = createStubGraph();
    stubGraph.getNodeData.mockReturnValue([{ id: 'n1' }, { id: 'n2' }]);
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      highlightNodeIds: new Set(['n1', 'n2']),
      dataNodesRef: {
        current: [
          { id: 'n1', label: 'A', masteryColor: 'green' },
          { id: 'n2', label: 'B', masteryColor: 'green' },
        ] as any,
      },
      dataEdgesRef: {
        current: [{ id: 'e1', source: 'n1', target: 'n2' }] as any,
      },
    });
    renderHook(() => useGraphHighlighting(opts));
    const u = getEdgeUpdate(stubGraph, 'e1');
    expect(u.style.opacity).toBe(1);
  });

  it('edge with only one endpoint highlighted gets opacity=0.2', () => {
    const stubGraph = createStubGraph();
    stubGraph.getNodeData.mockReturnValue([{ id: 'n1' }, { id: 'n2' }]);
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      highlightNodeIds: new Set(['n1']),
      dataNodesRef: {
        current: [
          { id: 'n1', label: 'A', masteryColor: 'green' },
          { id: 'n2', label: 'B', masteryColor: 'green' },
        ] as any,
      },
      dataEdgesRef: {
        current: [{ id: 'e1', source: 'n1', target: 'n2' }] as any,
      },
    });
    renderHook(() => useGraphHighlighting(opts));
    const u = getEdgeUpdate(stubGraph, 'e1');
    expect(u.style.opacity).toBe(0.2);
  });

  it('edge with neither endpoint highlighted gets opacity=0.2', () => {
    const stubGraph = createStubGraph();
    stubGraph.getNodeData.mockReturnValue([{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }]);
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      highlightNodeIds: new Set(['n3']),
      dataNodesRef: {
        current: [
          { id: 'n1', label: 'A', masteryColor: 'green' },
          { id: 'n2', label: 'B', masteryColor: 'green' },
          { id: 'n3', label: 'C', masteryColor: 'green' },
        ] as any,
      },
      dataEdgesRef: {
        current: [{ id: 'e1', source: 'n1', target: 'n2' }] as any,
      },
    });
    renderHook(() => useGraphHighlighting(opts));
    const u = getEdgeUpdate(stubGraph, 'e1');
    expect(u.style.opacity).toBe(0.2);
  });

  it('edges are not updated when no highlight set is active (review only)', () => {
    const stubGraph = createStubGraph();
    stubGraph.getNodeData.mockReturnValue([{ id: 'n1' }, { id: 'n2' }]);
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      reviewNodeIds: new Set(['n1']),
      dataNodesRef: {
        current: [
          { id: 'n1', label: 'A', masteryColor: 'green' },
          { id: 'n2', label: 'B', masteryColor: 'green' },
        ] as any,
      },
      dataEdgesRef: {
        current: [{ id: 'e1', source: 'n1', target: 'n2' }] as any,
      },
    });
    renderHook(() => useGraphHighlighting(opts));
    const u = getEdgeUpdate(stubGraph, 'e1');
    // Edge gets opacity=1 because edgeDimmed=false when hasHighlight is false
    expect(u.style.opacity).toBe(1);
  });

  it('edges are skipped when source or target is not visible', () => {
    const stubGraph = createStubGraph();
    // n2 is invisible
    stubGraph.getNodeData.mockReturnValue([{ id: 'n1' }]);
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      highlightNodeIds: new Set(['n1']),
      dataNodesRef: {
        current: [
          { id: 'n1', label: 'A', masteryColor: 'green' },
        ] as any,
      },
      dataEdgesRef: {
        current: [{ id: 'e1', source: 'n1', target: 'n2' }] as any,
      },
    });
    renderHook(() => useGraphHighlighting(opts));
    expect(stubGraph.updateEdgeData).not.toHaveBeenCalled();
  });
});

// ── Behavioral: visible-nodes filter ─────────────────────────

describe('useGraphHighlighting: visibility filtering (behavioral)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('skips nodes not present in graph.getNodeData()', () => {
    const stubGraph = createStubGraph();
    stubGraph.getNodeData.mockReturnValue([{ id: 'n1' }]); // n2 invisible
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      highlightNodeIds: new Set(['n1']),
      dataNodesRef: {
        current: [
          { id: 'n1', label: 'A', masteryColor: 'green' },
          { id: 'n2', label: 'B', masteryColor: 'green' },
        ] as any,
      },
    });
    renderHook(() => useGraphHighlighting(opts));
    expect(getNodeUpdate(stubGraph, 'n1')).toBeDefined();
    expect(getNodeUpdate(stubGraph, 'n2')).toBeUndefined();
  });

  it('updates all dataRef nodes when getNodeData throws (fallback)', () => {
    const stubGraph = createStubGraph();
    stubGraph.getNodeData.mockImplementation(() => { throw new Error('boom'); });
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      highlightNodeIds: new Set(['n1']),
      dataNodesRef: {
        current: [
          { id: 'n1', label: 'A', masteryColor: 'green' },
          { id: 'n2', label: 'B', masteryColor: 'green' },
        ] as any,
      },
    });
    renderHook(() => useGraphHighlighting(opts));
    // Both nodes should be updated since visibility filter is null
    expect(getNodeUpdate(stubGraph, 'n1')).toBeDefined();
    expect(getNodeUpdate(stubGraph, 'n2')).toBeDefined();
  });
});

// ── Behavioral: batchDraw interaction ────────────────────────

describe('useGraphHighlighting: batchDraw interaction (behavioral)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls batchDraw once after applying highlight updates', () => {
    const stubGraph = createStubGraph();
    const batchDraw = vi.fn();
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      batchDraw,
      highlightNodeIds: new Set(['n1']),
      dataNodesRef: { current: [{ id: 'n1', label: 'A', masteryColor: 'green' } as any] },
    });
    renderHook(() => useGraphHighlighting(opts));
    expect(batchDraw).toHaveBeenCalledTimes(1);
  });

  it('does not call batchDraw when effect early-returns (ready=false)', () => {
    const stubGraph = createStubGraph();
    const batchDraw = vi.fn();
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      ready: false,
      batchDraw,
      highlightNodeIds: new Set(['n1']),
      dataNodesRef: { current: [{ id: 'n1', label: 'A', masteryColor: 'green' } as any] },
    });
    renderHook(() => useGraphHighlighting(opts));
    expect(batchDraw).not.toHaveBeenCalled();
  });
});

// ── Behavioral: selected node effect ─────────────────────────

describe('useGraphHighlighting: selected node effect (behavioral)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not update when selectedNodeId is null on mount', () => {
    const stubGraph = createStubGraph();
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      selectedNodeId: null,
      nodeById: new Map([['n1', { id: 'n1', label: 'A', masteryColor: 'green' } as any]]),
    });
    renderHook(() => useGraphHighlighting(opts));
    expect(stubGraph.updateNodeData).not.toHaveBeenCalled();
  });

  it('applies shadow glow to selected node on mount', () => {
    const stubGraph = createStubGraph();
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      selectedNodeId: 'n1',
      nodeById: new Map([['n1', { id: 'n1', label: 'A', masteryColor: 'green' } as any]]),
    });
    renderHook(() => useGraphHighlighting(opts));
    const u = getNodeUpdate(stubGraph, 'n1');
    expect(u).toBeDefined();
    expect(u.style.shadowBlur).toBe(12);
    expect(u.style.shadowColor).toBe('#22c55e');
  });

  it('clears shadow on previous selection when switching', () => {
    const stubGraph = createStubGraph();
    const nodeById = new Map([
      ['n1', { id: 'n1', label: 'A', masteryColor: 'green' } as any],
      ['n2', { id: 'n2', label: 'B', masteryColor: 'green' } as any],
    ]);
    const initial = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      selectedNodeId: 'n1',
      nodeById,
    });
    const { rerender } = renderHook(
      ({ o }) => useGraphHighlighting(o),
      { initialProps: { o: initial } },
    );
    stubGraph.updateNodeData.mockClear();
    rerender({ o: { ...initial, selectedNodeId: 'n2' } });
    const lastCall = stubGraph.updateNodeData.mock.calls[0]?.[0] as any[];
    const prevUpdate = lastCall.find(u => u.id === 'n1');
    expect(prevUpdate).toBeDefined();
    expect(prevUpdate.style.shadowColor).toBe('transparent');
    expect(prevUpdate.style.shadowBlur).toBe(0);
  });

  it('applies new shadow when switching selection', () => {
    const stubGraph = createStubGraph();
    const nodeById = new Map([
      ['n1', { id: 'n1', label: 'A', masteryColor: 'green' } as any],
      ['n2', { id: 'n2', label: 'B', masteryColor: 'green' } as any],
    ]);
    const initial = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      selectedNodeId: 'n1',
      nodeById,
    });
    const { rerender } = renderHook(
      ({ o }) => useGraphHighlighting(o),
      { initialProps: { o: initial } },
    );
    stubGraph.updateNodeData.mockClear();
    rerender({ o: { ...initial, selectedNodeId: 'n2' } });
    const lastCall = stubGraph.updateNodeData.mock.calls[0]?.[0] as any[];
    const newUpdate = lastCall.find(u => u.id === 'n2');
    expect(newUpdate).toBeDefined();
    expect(newUpdate.style.shadowBlur).toBe(12);
  });

  it('issues two updates (clear prev + apply new) in single call when switching', () => {
    const stubGraph = createStubGraph();
    const nodeById = new Map([
      ['n1', { id: 'n1', label: 'A', masteryColor: 'green' } as any],
      ['n2', { id: 'n2', label: 'B', masteryColor: 'green' } as any],
    ]);
    const initial = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      selectedNodeId: 'n1',
      nodeById,
    });
    const { rerender } = renderHook(
      ({ o }) => useGraphHighlighting(o),
      { initialProps: { o: initial } },
    );
    stubGraph.updateNodeData.mockClear();
    rerender({ o: { ...initial, selectedNodeId: 'n2' } });
    expect(stubGraph.updateNodeData).toHaveBeenCalledTimes(1);
    const updates = stubGraph.updateNodeData.mock.calls[0]?.[0] as any[];
    expect(updates).toHaveLength(2);
  });

  it('clears shadow on previous when deselecting (selectedNodeId=null)', () => {
    const stubGraph = createStubGraph();
    const nodeById = new Map([
      ['n1', { id: 'n1', label: 'A', masteryColor: 'green' } as any],
    ]);
    const initial = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      selectedNodeId: 'n1',
      nodeById,
    });
    const { rerender } = renderHook(
      ({ o }) => useGraphHighlighting(o),
      { initialProps: { o: initial } },
    );
    stubGraph.updateNodeData.mockClear();
    rerender({ o: { ...initial, selectedNodeId: null } });
    const lastCall = stubGraph.updateNodeData.mock.calls[0]?.[0] as any[];
    expect(lastCall).toHaveLength(1);
    expect(lastCall[0].id).toBe('n1');
    expect(lastCall[0].style.shadowColor).toBe('transparent');
    expect(lastCall[0].style.shadowBlur).toBe(0);
  });

  it('does nothing on rerender with same selectedNodeId (prev===curr)', () => {
    const stubGraph = createStubGraph();
    const nodeById = new Map([
      ['n1', { id: 'n1', label: 'A', masteryColor: 'green' } as any],
    ]);
    const initial = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      selectedNodeId: 'n1',
      nodeById,
    });
    const { rerender } = renderHook(
      ({ o }) => useGraphHighlighting(o),
      { initialProps: { o: initial } },
    );
    stubGraph.updateNodeData.mockClear();
    rerender({ o: { ...initial } });
    expect(stubGraph.updateNodeData).not.toHaveBeenCalled();
  });

  it('skips update for selected node not in nodeById', () => {
    const stubGraph = createStubGraph();
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      selectedNodeId: 'unknown',
      nodeById: new Map(), // selected is not in map
    });
    renderHook(() => useGraphHighlighting(opts));
    expect(stubGraph.updateNodeData).not.toHaveBeenCalled();
  });

  it('treats undefined selectedNodeId as null (no update)', () => {
    const stubGraph = createStubGraph();
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      selectedNodeId: undefined,
      nodeById: new Map(),
    });
    renderHook(() => useGraphHighlighting(opts));
    expect(stubGraph.updateNodeData).not.toHaveBeenCalled();
  });

  it('does not crash when graphRef.current is null and selectedNodeId is set', () => {
    const opts = createDefaultOpts({
      graphRef: { current: null },
      selectedNodeId: 'n1',
      nodeById: new Map([['n1', { id: 'n1', label: 'A', masteryColor: 'green' } as any]]),
    });
    expect(() => renderHook(() => useGraphHighlighting(opts))).not.toThrow();
  });

  it('does not run when ready=false even with selectedNodeId set', () => {
    const stubGraph = createStubGraph();
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      ready: false,
      selectedNodeId: 'n1',
      nodeById: new Map([['n1', { id: 'n1', label: 'A', masteryColor: 'green' } as any]]),
    });
    renderHook(() => useGraphHighlighting(opts));
    expect(stubGraph.updateNodeData).not.toHaveBeenCalled();
  });
});

// ── Behavioral: applyMultiSelectionState corner cases ────────

describe('useGraphHighlighting: applyMultiSelectionState corner cases (behavioral)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('survives setElementState throwing (caught by outer try/catch)', () => {
    const stubGraph = createStubGraph();
    stubGraph.setElementState.mockImplementation(() => { throw new Error('boom'); });
    const opts = createDefaultOpts({ graphRef: { current: stubGraph as any } });
    const { result } = renderHook(() => useGraphHighlighting(opts));

    expect(() => {
      act(() => {
        result.current.applyMultiSelectionState(stubGraph as any, new Set(['n1']));
      });
    }).not.toThrow();
  });

  it('falls back to just multiSelected when getElementState throws', () => {
    const stubGraph = createStubGraph();
    stubGraph.getElementState.mockImplementation(() => { throw new Error('fail'); });
    const opts = createDefaultOpts({ graphRef: { current: stubGraph as any } });
    const { result } = renderHook(() => useGraphHighlighting(opts));

    act(() => {
      result.current.applyMultiSelectionState(stubGraph as any, new Set(['n1']));
    });

    // Should still call setElementState with the fallback
    expect(stubGraph.setElementState).toHaveBeenCalledWith('n1', ['multiSelected']);
  });

  it('replaces existing multiSelected (does not double-add)', () => {
    const stubGraph = createStubGraph();
    stubGraph._elementStates.set('n1', ['multiSelected', 'hovered']);
    stubGraph.getElementState.mockImplementation(
      (id: string) => stubGraph._elementStates.get(id) ?? [],
    );
    const opts = createDefaultOpts({ graphRef: { current: stubGraph as any } });
    const { result } = renderHook(() => useGraphHighlighting(opts));

    // First clear to set prevMultiRef
    act(() => {
      result.current.applyMultiSelectionState(stubGraph as any, new Set());
    });
    stubGraph.setElementState.mockClear();

    // Re-add
    act(() => {
      result.current.applyMultiSelectionState(stubGraph as any, new Set(['n1']));
    });

    const lastCall = stubGraph.setElementState.mock.calls.find(
      (c: [string, string[]]) => c[0] === 'n1',
    );
    const states = lastCall?.[1] || [];
    const multiCount = states.filter((s: string) => s === 'multiSelected').length;
    expect(multiCount).toBe(1);
  });

  it('does not call setElementState for unchanged ids (in both prev and curr)', () => {
    const stubGraph = createStubGraph();
    const opts = createDefaultOpts({ graphRef: { current: stubGraph as any } });
    const { result } = renderHook(() => useGraphHighlighting(opts));

    act(() => {
      result.current.applyMultiSelectionState(stubGraph as any, new Set(['n1', 'n2']));
    });
    stubGraph.setElementState.mockClear();

    // Same set — n1 and n2 are in both prev and curr; nothing should be called
    act(() => {
      result.current.applyMultiSelectionState(stubGraph as any, new Set(['n1', 'n2']));
    });
    expect(stubGraph.setElementState).not.toHaveBeenCalled();
  });

  it('returns stable applyMultiSelectionState identity across rerenders (batchDraw stable)', () => {
    const batchDraw = vi.fn();
    const opts = createDefaultOpts({ batchDraw });
    const { result, rerender } = renderHook(
      ({ o }) => useGraphHighlighting(o),
      { initialProps: { o: opts } },
    );
    const fn1 = result.current.applyMultiSelectionState;
    rerender({ o: opts });
    expect(result.current.applyMultiSelectionState).toBe(fn1);
  });

  it('returns new applyMultiSelectionState identity when batchDraw reference changes', () => {
    const batchDraw1 = vi.fn();
    const initial = createDefaultOpts({ batchDraw: batchDraw1 });
    const { result, rerender } = renderHook(
      ({ o }) => useGraphHighlighting(o),
      { initialProps: { o: initial } },
    );
    const fn1 = result.current.applyMultiSelectionState;
    const batchDraw2 = vi.fn();
    rerender({ o: { ...initial, batchDraw: batchDraw2 } });
    expect(result.current.applyMultiSelectionState).not.toBe(fn1);
  });

  it('prevMultiRef is the same ref instance across rerenders', () => {
    const opts = createDefaultOpts();
    const { result, rerender } = renderHook(
      ({ o }) => useGraphHighlighting(o),
      { initialProps: { o: opts } },
    );
    const ref1 = result.current.prevMultiRef;
    rerender({ o: opts });
    expect(result.current.prevMultiRef).toBe(ref1);
  });
});

// ── Behavioral: long-label truncation in review prefix ───────

describe('useGraphHighlighting: label truncation in review (behavioral)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('truncates long labels and prefixes with warning sign', () => {
    const stubGraph = createStubGraph();
    stubGraph.getNodeData.mockReturnValue([{ id: 'n1' }]);
    const longLabel = 'a'.repeat(50);
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      reviewNodeIds: new Set(['n1']),
      dataNodesRef: {
        current: [{ id: 'n1', label: longLabel, masteryColor: 'green' }] as any,
      },
    });
    renderHook(() => useGraphHighlighting(opts));
    const u = getNodeUpdate(stubGraph, 'n1');
    // Mocked truncateLabel cuts at 20 chars + '...'
    expect(u.style.labelText).toBe('⚠ ' + 'a'.repeat(20) + '...');
  });

  it('does not prefix non-review nodes with warning sign', () => {
    const stubGraph = createStubGraph();
    stubGraph.getNodeData.mockReturnValue([{ id: 'n1' }]);
    const opts = createDefaultOpts({
      graphRef: { current: stubGraph as any },
      highlightNodeIds: new Set(['n1']),
      dataNodesRef: {
        current: [{ id: 'n1', label: 'short', masteryColor: 'green' }] as any,
      },
    });
    renderHook(() => useGraphHighlighting(opts));
    const u = getNodeUpdate(stubGraph, 'n1');
    expect(u.style.labelText).toBe('short');
    expect(u.style.labelText).not.toMatch(/^⚠/);
  });
});
