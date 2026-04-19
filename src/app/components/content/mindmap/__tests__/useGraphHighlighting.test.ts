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
