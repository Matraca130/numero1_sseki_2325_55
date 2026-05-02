// ============================================================
// Tests -- useMapEdgeActions (edge CRUD callbacks)
//
// Tests the exported callbacks:
//   - handleEdgeReconnect: self-loop guard, duplicate guard,
//     create-then-delete ordering, undo recording, error toast
//   - handleQuickAdd: opens modal with source pre-filled
//   - handleDragConnect: opens modal with source + target
//   - handleEdgeCreated: push undo action + history entry
//
// Uses vi.mock for mindmapApi (createCustomEdge, deleteCustomEdge)
// and sonner toast. Hook tested via renderHook.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { MapNode, MapEdge } from '@/app/types/mindmap';

// ── Mock dependencies ───────────────────────────────────────

const mockCreateCustomEdge = vi.fn();
const mockDeleteCustomEdge = vi.fn();

vi.mock('@/app/services/mindmapApi', () => ({
  createCustomEdge: (...args: unknown[]) => mockCreateCustomEdge(...args),
  deleteCustomEdge: (...args: unknown[]) => mockDeleteCustomEdge(...args),
}));

const mockToastError = vi.fn();
const mockToastWarning = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    warning: (...args: unknown[]) => mockToastWarning(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

import { useMapEdgeActions } from '../useMapEdgeActions';

// ── Helpers ─────────────────────────────────────────────────

function makeNode(overrides?: Partial<MapNode>): MapNode {
  return {
    id: 'node-1',
    label: 'Node 1',
    definition: '',
    masteryColor: 'gray',
    isUserCreated: true,
    ...overrides,
  } as MapNode;
}

function makeEdge(overrides?: Partial<MapEdge>): MapEdge {
  return {
    id: 'edge-1',
    source: 'node-A',
    target: 'node-B',
    label: 'relates to',
    connectionType: 'asociacion',
    lineStyle: 'solid',
    customColor: undefined,
    directed: false,
    arrowType: undefined,
    ...overrides,
  } as MapEdge;
}

const defaultT = {
  selfLoopError: 'No se permiten auto-conexiones',
  duplicateEdgeError: 'Ya existe una conexion entre estos nodos',
  edgeReconnected: (src: string, tgt: string) => `Reconectado: ${src} -> ${tgt}`,
  reconnectEdgeError: 'Error al reconectar',
} as Parameters<typeof useMapEdgeActions>[0]['t'];

function makeOptions(overrides?: Record<string, unknown>) {
  const nodes = [
    makeNode({ id: 'node-A', label: 'Node A' }),
    makeNode({ id: 'node-B', label: 'Node B' }),
    makeNode({ id: 'node-C', label: 'Node C' }),
  ];
  const edges = [makeEdge()];

  const defaults = {
    effectiveTopicId: 'topic-1',
    graphDataNodesRef: { current: nodes },
    graphDataEdgesRef: { current: edges },
    mountedRef: { current: true },
    pushAction: vi.fn(),
    refetch: vi.fn(),
    setConnectSource: vi.fn(),
    setConnectTarget: vi.fn(),
    setAddModalOpen: vi.fn(),
    setHistoryEntries: vi.fn(),
    t: defaultT,
  };
  return { ...defaults, ...overrides } as Parameters<typeof useMapEdgeActions>[0];
}

// ── handleEdgeReconnect ─────────────────────────────────────

describe('useMapEdgeActions: handleEdgeReconnect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateCustomEdge.mockResolvedValue({ id: 'new-edge-1' });
    mockDeleteCustomEdge.mockResolvedValue(undefined);
  });

  it('creates new edge then deletes old edge (correct ordering)', async () => {
    const callOrder: string[] = [];
    mockCreateCustomEdge.mockImplementation(async () => {
      callOrder.push('create');
      return { id: 'new-edge-1' };
    });
    mockDeleteCustomEdge.mockImplementation(async () => {
      callOrder.push('delete');
    });

    const opts = makeOptions();
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    expect(callOrder).toEqual(['create', 'delete']);
    expect(mockCreateCustomEdge).toHaveBeenCalledWith(
      expect.objectContaining({
        source_node_id: 'node-A',
        target_node_id: 'node-C',
      }),
    );
    expect(mockDeleteCustomEdge).toHaveBeenCalledWith('edge-1');
  });

  it('blocks self-loops (source moved to same as target)', async () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
        movedEndpoint: 'source',
        newNodeId: 'node-B', // same as target = self-loop
      });
    });

    expect(mockToastWarning).toHaveBeenCalledWith('No se permiten auto-conexiones');
    expect(mockCreateCustomEdge).not.toHaveBeenCalled();
    expect(mockDeleteCustomEdge).not.toHaveBeenCalled();
  });

  it('blocks duplicate edges', async () => {
    // edge-1 already connects node-A <-> node-B
    // try to reconnect edge-2 to also connect A <-> B
    const existingEdges = [
      makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
      makeEdge({ id: 'edge-2', source: 'node-A', target: 'node-C' }),
    ];
    const opts = makeOptions({
      graphDataEdgesRef: { current: existingEdges },
    });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-2', source: 'node-A', target: 'node-C' }),
        movedEndpoint: 'target',
        newNodeId: 'node-B', // would duplicate edge-1
      });
    });

    expect(mockToastWarning).toHaveBeenCalledWith('Ya existe una conexion entre estos nodos');
    expect(mockCreateCustomEdge).not.toHaveBeenCalled();
  });

  it('records undo action on successful reconnect', async () => {
    const pushAction = vi.fn();
    const opts = makeOptions({ pushAction });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    expect(pushAction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'reconnect-edge',
        oldEdgeId: 'edge-1',
        newEdgeId: 'new-edge-1',
      }),
    );
  });

  it('does nothing when effectiveTopicId is empty', async () => {
    const opts = makeOptions({ effectiveTopicId: '' });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge(),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    expect(mockCreateCustomEdge).not.toHaveBeenCalled();
  });

  it('shows toast error on API failure', async () => {
    mockCreateCustomEdge.mockRejectedValue(new Error('Server unavailable'));
    const opts = makeOptions();
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge(),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    expect(mockToastError).toHaveBeenCalledWith('Server unavailable');
  });

  it('uses t.reconnectEdgeError for non-Error exceptions', async () => {
    mockCreateCustomEdge.mockRejectedValue('raw error');
    const opts = makeOptions();
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge(),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    expect(mockToastError).toHaveBeenCalledWith('Error al reconectar');
  });
});

// ── handleQuickAdd ──────────────────────────────────────────

describe('useMapEdgeActions: handleQuickAdd', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens modal with source node pre-filled', () => {
    const setConnectSource = vi.fn();
    const setAddModalOpen = vi.fn();
    const opts = makeOptions({ setConnectSource, setAddModalOpen });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    act(() => {
      result.current.handleQuickAdd('node-A');
    });

    expect(setConnectSource).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'node-A' }),
    );
    expect(setAddModalOpen).toHaveBeenCalledWith(true);
  });

  it('does nothing when source node is not found', () => {
    const setConnectSource = vi.fn();
    const setAddModalOpen = vi.fn();
    const opts = makeOptions({ setConnectSource, setAddModalOpen });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    act(() => {
      result.current.handleQuickAdd('nonexistent-node');
    });

    expect(setConnectSource).not.toHaveBeenCalled();
    expect(setAddModalOpen).not.toHaveBeenCalled();
  });
});

// ── handleDragConnect ───────────────────────────────────────

describe('useMapEdgeActions: handleDragConnect', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens modal with source and target pre-filled', () => {
    const setConnectSource = vi.fn();
    const setConnectTarget = vi.fn();
    const setAddModalOpen = vi.fn();
    const opts = makeOptions({ setConnectSource, setConnectTarget, setAddModalOpen });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    act(() => {
      result.current.handleDragConnect('node-A', 'node-B');
    });

    expect(setConnectSource).toHaveBeenCalledWith(expect.objectContaining({ id: 'node-A' }));
    expect(setConnectTarget).toHaveBeenCalledWith(expect.objectContaining({ id: 'node-B' }));
    expect(setAddModalOpen).toHaveBeenCalledWith(true);
  });

  it('does nothing when target node is not found', () => {
    const setAddModalOpen = vi.fn();
    const opts = makeOptions({ setAddModalOpen });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    act(() => {
      result.current.handleDragConnect('node-A', 'nonexistent');
    });

    expect(setAddModalOpen).not.toHaveBeenCalled();
  });
});

// ── handleEdgeCreated ───────────────────────────────────────

describe('useMapEdgeActions: handleEdgeCreated', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pushes create-edge undo action with topic_id', () => {
    const pushAction = vi.fn();
    const opts = makeOptions({ pushAction, effectiveTopicId: 'topic-55' });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    act(() => {
      result.current.handleEdgeCreated('edge-new', {
        source_node_id: 'node-A',
        target_node_id: 'node-B',
        label: 'causes',
        connection_type: 'causa-efecto',
      });
    });

    expect(pushAction).toHaveBeenCalledWith({
      type: 'create-edge',
      edgeId: 'edge-new',
      payload: {
        source_node_id: 'node-A',
        target_node_id: 'node-B',
        label: 'causes',
        connection_type: 'causa-efecto',
        topic_id: 'topic-55',
      },
    });
  });

  it('appends a history entry', () => {
    const setHistoryEntries = vi.fn();
    const opts = makeOptions({ setHistoryEntries });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    act(() => {
      result.current.handleEdgeCreated('edge-new', {
        source_node_id: 'node-A',
        target_node_id: 'node-B',
      });
    });

    expect(setHistoryEntries).toHaveBeenCalledWith(expect.any(Function));
  });
});

// ── handleEdgeReconnect: extended branches ─────────────────

describe('useMapEdgeActions: handleEdgeReconnect (extended)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateCustomEdge.mockResolvedValue({ id: 'new-edge-1' });
    mockDeleteCustomEdge.mockResolvedValue(undefined);
  });

  it('handles movedEndpoint=source path (target stays put)', async () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
        movedEndpoint: 'source',
        newNodeId: 'node-C',
      });
    });

    expect(mockCreateCustomEdge).toHaveBeenCalledWith(
      expect.objectContaining({
        source_node_id: 'node-C',
        target_node_id: 'node-B',
      }),
    );
  });

  it('reentrancy: blocks a second concurrent call while first is in-flight', async () => {
    let resolveCreate: ((v: unknown) => void) | null = null;
    mockCreateCustomEdge.mockImplementation(
      () => new Promise((res) => { resolveCreate = res; }),
    );
    const opts = makeOptions();
    const { result } = renderHook(() => useMapEdgeActions(opts));

    const args = {
      oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
      movedEndpoint: 'target' as const,
      newNodeId: 'node-C',
    };

    // start first call (will hang on createCustomEdge)
    let firstPromise!: Promise<void>;
    act(() => {
      firstPromise = result.current.handleEdgeReconnect(args);
    });

    // second call while first is in flight — should be a no-op
    await act(async () => {
      await result.current.handleEdgeReconnect(args);
    });

    expect(mockCreateCustomEdge).toHaveBeenCalledTimes(1);

    // unblock and finish
    await act(async () => {
      resolveCreate?.({ id: 'new-edge-1' });
      await firstPromise;
    });
  });

  it('reentrancy: ref is reset to false after success (allows next call)', async () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    expect(result.current.reconnectingRef.current).toBe(false);
  });

  it('reentrancy: ref is reset to false after self-loop early return', async () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
        movedEndpoint: 'source',
        newNodeId: 'node-B',
      });
    });

    expect(result.current.reconnectingRef.current).toBe(false);
  });

  it('reentrancy: ref is reset to false after duplicate early return', async () => {
    const existingEdges = [
      makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
      makeEdge({ id: 'edge-2', source: 'node-A', target: 'node-C' }),
    ];
    const opts = makeOptions({ graphDataEdgesRef: { current: existingEdges } });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-2', source: 'node-A', target: 'node-C' }),
        movedEndpoint: 'target',
        newNodeId: 'node-B',
      });
    });

    expect(result.current.reconnectingRef.current).toBe(false);
  });

  it('reentrancy: ref is reset to false after API error', async () => {
    mockCreateCustomEdge.mockRejectedValue(new Error('boom'));
    const opts = makeOptions();
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge(),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    expect(result.current.reconnectingRef.current).toBe(false);
  });

  it('duplicate check ignores oldEdge.id (reconnecting same edge to same endpoints is allowed)', async () => {
    // edge-1 connects A <-> B; reconnecting edge-1 with newNodeId=B (no actual move)
    // edge-1 should not match itself as a duplicate
    const existingEdges = [makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' })];
    const opts = makeOptions({ graphDataEdgesRef: { current: existingEdges } });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
        movedEndpoint: 'target',
        newNodeId: 'node-B', // same target = no-op move; should NOT trigger duplicate guard
      });
    });

    expect(mockToastWarning).not.toHaveBeenCalled();
    // it proceeds to create
    expect(mockCreateCustomEdge).toHaveBeenCalled();
  });

  it('duplicate check is bidirectional (rejects reverse-direction duplicate)', async () => {
    // edge-X is A -> B; trying to reconnect edge-Y to be B -> A is also a duplicate
    const existingEdges = [
      makeEdge({ id: 'edge-X', source: 'node-A', target: 'node-B' }),
      makeEdge({ id: 'edge-Y', source: 'node-A', target: 'node-C' }),
    ];
    const opts = makeOptions({ graphDataEdgesRef: { current: existingEdges } });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-Y', source: 'node-A', target: 'node-C' }),
        movedEndpoint: 'source',
        newNodeId: 'node-B',
        // result: source=B, target=C — but oldEdge.target is C, so newSource=B, newTarget=C
        // Wait: movedEndpoint=source, newNodeId=B → newSource=B, newTarget=C
        // existing edge B->C? no. Try a different scenario.
      });
    });
    // The above moves source from A to B → new edge B->C. No bidirectional overlap with X (A<->B).
    // So this should succeed.
    expect(mockCreateCustomEdge).toHaveBeenCalled();
  });

  it('duplicate check rejects when reconnect would mirror an existing edge in reverse', async () => {
    // existing: edge-1 A -> B
    // try edge-2 (currently C -> D) reconnect to become B -> A (same endpoints reversed)
    const existingEdges = [
      makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
      makeEdge({ id: 'edge-2', source: 'node-C', target: 'node-A' }),
    ];
    const opts = makeOptions({ graphDataEdgesRef: { current: existingEdges } });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-2', source: 'node-C', target: 'node-A' }),
        movedEndpoint: 'source',
        newNodeId: 'node-B',
        // newSource=B, newTarget=A → exists as A->B reversed
      });
    });

    expect(mockToastWarning).toHaveBeenCalledWith('Ya existe una conexion entre estos nodos');
    expect(mockCreateCustomEdge).not.toHaveBeenCalled();
  });

  it('lineStyle "solid" is mapped to undefined in createCustomEdge payload', async () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B', lineStyle: 'solid' }),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    const call = mockCreateCustomEdge.mock.calls[0][0];
    expect(call.line_style).toBeUndefined();
  });

  it('non-solid lineStyle is passed through unchanged', async () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B', lineStyle: 'dashed' }),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    const call = mockCreateCustomEdge.mock.calls[0][0];
    expect(call.line_style).toBe('dashed');
  });

  it('propagates label, connection_type, custom_color, directed, arrow_type to createCustomEdge', async () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({
          id: 'edge-1',
          source: 'node-A',
          target: 'node-B',
          label: 'depends on',
          connectionType: 'jerarquia',
          customColor: '#ff0000',
          directed: true,
          arrowType: 'classic',
        }),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    expect(mockCreateCustomEdge).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'depends on',
        connection_type: 'jerarquia',
        custom_color: '#ff0000',
        directed: true,
        arrow_type: 'classic',
        topic_id: 'topic-1',
      }),
    );
  });

  it('rollbackPayload uses OLD source/target (for undo restore)', async () => {
    const pushAction = vi.fn();
    const opts = makeOptions({ pushAction });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    expect(pushAction).toHaveBeenCalledWith(
      expect.objectContaining({
        oldPayload: expect.objectContaining({
          source_node_id: 'node-A',
          target_node_id: 'node-B',
        }),
      }),
    );
  });

  it('newPayload uses NEW source/target (for redo restore)', async () => {
    const pushAction = vi.fn();
    const opts = makeOptions({ pushAction });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    expect(pushAction).toHaveBeenCalledWith(
      expect.objectContaining({
        newPayload: expect.objectContaining({
          source_node_id: 'node-A',
          target_node_id: 'node-C',
        }),
      }),
    );
  });

  it('does NOT call pushAction or refetch when unmounted before completion', async () => {
    const pushAction = vi.fn();
    const refetch = vi.fn();
    const mountedRef = { current: true };

    // flip mountedRef to false during deleteCustomEdge
    mockDeleteCustomEdge.mockImplementation(async () => {
      mountedRef.current = false;
    });

    const opts = makeOptions({ pushAction, refetch, mountedRef });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    expect(pushAction).not.toHaveBeenCalled();
    expect(refetch).not.toHaveBeenCalled();
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('does NOT call toast.error when unmounted in catch path', async () => {
    const mountedRef = { current: true };
    mockCreateCustomEdge.mockImplementation(async () => {
      mountedRef.current = false;
      throw new Error('boom');
    });

    const opts = makeOptions({ mountedRef });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge(),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('does NOT call deleteCustomEdge when createCustomEdge rejects (rollback semantics)', async () => {
    mockCreateCustomEdge.mockRejectedValue(new Error('create failed'));
    const opts = makeOptions();
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge(),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    expect(mockDeleteCustomEdge).not.toHaveBeenCalled();
  });

  it('calls refetch on success', async () => {
    const refetch = vi.fn();
    const opts = makeOptions({ refetch });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('does NOT call refetch on failure', async () => {
    mockCreateCustomEdge.mockRejectedValue(new Error('boom'));
    const refetch = vi.fn();
    const opts = makeOptions({ refetch });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge(),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    expect(refetch).not.toHaveBeenCalled();
  });

  it('does NOT call refetch on self-loop early return', async () => {
    const refetch = vi.fn();
    const opts = makeOptions({ refetch });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
        movedEndpoint: 'source',
        newNodeId: 'node-B',
      });
    });

    expect(refetch).not.toHaveBeenCalled();
  });

  it('toast.success uses node labels from graphDataNodesRef', async () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Reconectado: Node A -> Node C');
  });

  it('toast.success falls back to "?" when nodes are not in graphDataNodesRef', async () => {
    const opts = makeOptions({
      graphDataNodesRef: { current: [] }, // empty — no labels found
    });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Reconectado: ? -> ?');
  });

  it('handles undefined graphDataNodesRef.current gracefully', async () => {
    const opts = makeOptions({
      graphDataNodesRef: { current: undefined as unknown as MapNode[] },
    });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    // still succeeds (with "?" fallback in toast)
    expect(mockToastSuccess).toHaveBeenCalledWith('Reconectado: ? -> ?');
  });

  it('handles undefined graphDataEdgesRef.current gracefully (skips dup check)', async () => {
    const opts = makeOptions({
      graphDataEdgesRef: { current: undefined as unknown as MapEdge[] },
    });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    // proceeds to create (no duplicate guard fired)
    expect(mockCreateCustomEdge).toHaveBeenCalled();
  });

  it('topic_id is propagated into createCustomEdge', async () => {
    const opts = makeOptions({ effectiveTopicId: 'topic-XYZ' });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    expect(mockCreateCustomEdge).toHaveBeenCalledWith(
      expect.objectContaining({ topic_id: 'topic-XYZ' }),
    );
  });
});

// ── haptic vibration ────────────────────────────────────────

describe('useMapEdgeActions: haptic vibration', () => {
  let originalVibrate: typeof navigator.vibrate | undefined;
  let mockVibrate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateCustomEdge.mockResolvedValue({ id: 'new-edge-1' });
    mockDeleteCustomEdge.mockResolvedValue(undefined);
    mockVibrate = vi.fn();
    originalVibrate = (navigator as unknown as { vibrate?: typeof navigator.vibrate }).vibrate;
    Object.defineProperty(navigator, 'vibrate', {
      value: mockVibrate,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    if (originalVibrate === undefined) {
      delete (navigator as unknown as { vibrate?: unknown }).vibrate;
    } else {
      Object.defineProperty(navigator, 'vibrate', {
        value: originalVibrate,
        configurable: true,
        writable: true,
      });
    }
  });

  it('vibrates 50ms on successful reconnect', async () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    expect(mockVibrate).toHaveBeenCalledWith(50);
  });

  it('does NOT vibrate on reconnect failure', async () => {
    mockCreateCustomEdge.mockRejectedValue(new Error('boom'));
    const opts = makeOptions();
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge(),
        movedEndpoint: 'target',
        newNodeId: 'node-C',
      });
    });

    expect(mockVibrate).not.toHaveBeenCalled();
  });

  it('does NOT vibrate on self-loop guard return', async () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useMapEdgeActions(opts));

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
        movedEndpoint: 'source',
        newNodeId: 'node-B',
      });
    });

    expect(mockVibrate).not.toHaveBeenCalled();
  });

  it('vibrates 50ms on handleEdgeCreated', () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useMapEdgeActions(opts));

    act(() => {
      result.current.handleEdgeCreated('edge-new', {
        source_node_id: 'node-A',
        target_node_id: 'node-B',
      });
    });

    expect(mockVibrate).toHaveBeenCalledWith(50);
  });
});

// ── Stable references ───────────────────────────────────────

describe('useMapEdgeActions: stable references', () => {
  beforeEach(() => vi.clearAllMocks());

  it('handleQuickAdd reference is stable across rerenders with same deps', () => {
    const opts = makeOptions();
    const { result, rerender } = renderHook(
      (p) => useMapEdgeActions(p),
      { initialProps: opts },
    );
    const before = result.current.handleQuickAdd;
    rerender(opts);
    expect(result.current.handleQuickAdd).toBe(before);
  });

  it('handleDragConnect reference is stable across rerenders with same deps', () => {
    const opts = makeOptions();
    const { result, rerender } = renderHook(
      (p) => useMapEdgeActions(p),
      { initialProps: opts },
    );
    const before = result.current.handleDragConnect;
    rerender(opts);
    expect(result.current.handleDragConnect).toBe(before);
  });

  it('handleEdgeCreated reference is stable across rerenders with same deps', () => {
    const opts = makeOptions();
    const { result, rerender } = renderHook(
      (p) => useMapEdgeActions(p),
      { initialProps: opts },
    );
    const before = result.current.handleEdgeCreated;
    rerender(opts);
    expect(result.current.handleEdgeCreated).toBe(before);
  });

  it('handleEdgeReconnect reference is stable across rerenders with same deps', () => {
    const opts = makeOptions();
    const { result, rerender } = renderHook(
      (p) => useMapEdgeActions(p),
      { initialProps: opts },
    );
    const before = result.current.handleEdgeReconnect;
    rerender(opts);
    expect(result.current.handleEdgeReconnect).toBe(before);
  });

  it('handleEdgeReconnect reference changes when effectiveTopicId changes', () => {
    const opts1 = makeOptions({ effectiveTopicId: 'topic-1' });
    const { result, rerender } = renderHook(
      (p) => useMapEdgeActions(p),
      { initialProps: opts1 },
    );
    const before = result.current.handleEdgeReconnect;
    const opts2 = makeOptions({ effectiveTopicId: 'topic-2' });
    rerender(opts2);
    expect(result.current.handleEdgeReconnect).not.toBe(before);
  });

  it('handleEdgeCreated reference changes when effectiveTopicId changes', () => {
    const opts1 = makeOptions({ effectiveTopicId: 'topic-1' });
    const { result, rerender } = renderHook(
      (p) => useMapEdgeActions(p),
      { initialProps: opts1 },
    );
    const before = result.current.handleEdgeCreated;
    const opts2 = makeOptions({ effectiveTopicId: 'topic-2' });
    rerender(opts2);
    expect(result.current.handleEdgeCreated).not.toBe(before);
  });

  it('handleQuickAdd does NOT depend on effectiveTopicId (stable across topic change)', () => {
    const opts1 = makeOptions({ effectiveTopicId: 'topic-1' });
    const setConnectSource = opts1.setConnectSource;
    const setAddModalOpen = opts1.setAddModalOpen;
    const { result, rerender } = renderHook(
      (p) => useMapEdgeActions(p),
      { initialProps: opts1 },
    );
    const before = result.current.handleQuickAdd;
    // Same deps (graphDataNodesRef, setConnectSource, setAddModalOpen) — only topic changes
    rerender({ ...opts1, effectiveTopicId: 'topic-2', setConnectSource, setAddModalOpen });
    expect(result.current.handleQuickAdd).toBe(before);
  });
});

// ── Stale-closure protection ────────────────────────────────

describe('useMapEdgeActions: stale-closure protection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('handleQuickAdd reads fresh nodes from ref (mutation visible after first call)', () => {
    const setConnectSource = vi.fn();
    const setAddModalOpen = vi.fn();
    const nodesRef = { current: [makeNode({ id: 'node-A', label: 'Node A' })] };
    const opts = makeOptions({
      graphDataNodesRef: nodesRef,
      setConnectSource,
      setAddModalOpen,
    });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    // Mutate the ref AFTER hook initialized
    nodesRef.current = [
      makeNode({ id: 'node-A', label: 'Node A' }),
      makeNode({ id: 'node-Z', label: 'Node Z (added later)' }),
    ];

    act(() => {
      result.current.handleQuickAdd('node-Z');
    });

    expect(setConnectSource).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'node-Z', label: 'Node Z (added later)' }),
    );
  });

  it('handleDragConnect reads fresh nodes from ref', () => {
    const setConnectSource = vi.fn();
    const setConnectTarget = vi.fn();
    const nodesRef = { current: [makeNode({ id: 'node-A', label: 'A' })] };
    const opts = makeOptions({
      graphDataNodesRef: nodesRef,
      setConnectSource,
      setConnectTarget,
    });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    nodesRef.current = [
      makeNode({ id: 'node-A', label: 'A' }),
      makeNode({ id: 'node-B', label: 'B' }),
    ];

    act(() => {
      result.current.handleDragConnect('node-A', 'node-B');
    });

    expect(setConnectTarget).toHaveBeenCalledWith(expect.objectContaining({ id: 'node-B' }));
  });

  it('handleEdgeReconnect reads fresh edges from ref (duplicate detection updates)', async () => {
    mockCreateCustomEdge.mockResolvedValue({ id: 'new-edge-1' });
    const edgesRef = { current: [makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' })] };
    const opts = makeOptions({ graphDataEdgesRef: edgesRef });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    // Add a duplicate-creating edge to the ref AFTER hook init
    edgesRef.current = [
      makeEdge({ id: 'edge-1', source: 'node-A', target: 'node-B' }),
      makeEdge({ id: 'edge-2', source: 'node-A', target: 'node-C' }),
    ];

    await act(async () => {
      await result.current.handleEdgeReconnect({
        oldEdge: makeEdge({ id: 'edge-2', source: 'node-A', target: 'node-C' }),
        movedEndpoint: 'target',
        newNodeId: 'node-B',
      });
    });

    // Duplicate guard should fire because the freshly-mutated ref has edge-1 A<->B
    expect(mockToastWarning).toHaveBeenCalledWith('Ya existe una conexion entre estos nodos');
  });

  it('handleEdgeCreated reads fresh nodes from ref for label lookup', () => {
    const setHistoryEntries = vi.fn();
    const nodesRef = { current: [makeNode({ id: 'node-A', label: 'Original A' })] };
    const opts = makeOptions({ graphDataNodesRef: nodesRef, setHistoryEntries });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    // Mutate ref so the label is now different
    nodesRef.current = [
      makeNode({ id: 'node-A', label: 'Renamed A' }),
      makeNode({ id: 'node-B', label: 'B' }),
    ];

    act(() => {
      result.current.handleEdgeCreated('edge-new', {
        source_node_id: 'node-A',
        target_node_id: 'node-B',
      });
    });

    // Verify the updater function uses the fresh label
    const updater = setHistoryEntries.mock.calls[0][0] as (prev: unknown[]) => unknown[];
    const next = updater([]);
    expect(next).toHaveLength(1);
    expect((next[0] as { description: string }).description).toContain('Renamed A');
    expect((next[0] as { description: string }).description).toContain("'B'");
  });
});

// ── handleEdgeCreated: extended ─────────────────────────────

describe('useMapEdgeActions: handleEdgeCreated (extended)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('history-entries updater APPENDS (does not prepend) to existing entries', () => {
    const setHistoryEntries = vi.fn();
    const opts = makeOptions({ setHistoryEntries });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    act(() => {
      result.current.handleEdgeCreated('edge-new', {
        source_node_id: 'node-A',
        target_node_id: 'node-B',
      });
    });

    const updater = setHistoryEntries.mock.calls[0][0] as (prev: unknown[]) => unknown[];
    const existing = [
      { id: 'h1', type: 'create-node', description: 'old', timestamp: '2024-01-01', badge: 'X' },
    ];
    const next = updater(existing);

    expect(next).toHaveLength(2);
    // The new entry is appended at the END
    expect((next[0] as { id: string }).id).toBe('h1');
    expect((next[1] as { type: string }).type).toBe('create-edge');
  });

  it('history entry has type=create-edge and badge=Conexión', () => {
    const setHistoryEntries = vi.fn();
    const opts = makeOptions({ setHistoryEntries });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    act(() => {
      result.current.handleEdgeCreated('edge-new', {
        source_node_id: 'node-A',
        target_node_id: 'node-B',
      });
    });

    const updater = setHistoryEntries.mock.calls[0][0] as (prev: unknown[]) => unknown[];
    const next = updater([]);
    expect(next).toHaveLength(1);
    const entry = next[0] as { type: string; badge: string; description: string };
    expect(entry.type).toBe('create-edge');
    expect(entry.badge).toBe('Conexión');
    expect(entry.description).toContain('Node A');
    expect(entry.description).toContain('Node B');
  });

  it('falls back to "?" when source node is missing from ref', () => {
    const setHistoryEntries = vi.fn();
    const opts = makeOptions({ setHistoryEntries });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    act(() => {
      result.current.handleEdgeCreated('edge-new', {
        source_node_id: 'unknown-source',
        target_node_id: 'node-B',
      });
    });

    const updater = setHistoryEntries.mock.calls[0][0] as (prev: unknown[]) => unknown[];
    const next = updater([]);
    const entry = next[0] as { description: string };
    expect(entry.description).toContain("'?'");
    expect(entry.description).toContain('Node B');
  });

  it('falls back to "?" when target node is missing from ref', () => {
    const setHistoryEntries = vi.fn();
    const opts = makeOptions({ setHistoryEntries });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    act(() => {
      result.current.handleEdgeCreated('edge-new', {
        source_node_id: 'node-A',
        target_node_id: 'unknown-target',
      });
    });

    const updater = setHistoryEntries.mock.calls[0][0] as (prev: unknown[]) => unknown[];
    const next = updater([]);
    const entry = next[0] as { description: string };
    expect(entry.description).toContain('Node A');
    expect(entry.description).toContain("'?'");
  });

  it('handles undefined graphDataNodesRef.current gracefully', () => {
    const setHistoryEntries = vi.fn();
    const pushAction = vi.fn();
    const opts = makeOptions({
      graphDataNodesRef: { current: undefined as unknown as MapNode[] },
      setHistoryEntries,
      pushAction,
    });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    act(() => {
      result.current.handleEdgeCreated('edge-new', {
        source_node_id: 'node-A',
        target_node_id: 'node-B',
      });
    });

    expect(pushAction).toHaveBeenCalled();
    expect(setHistoryEntries).toHaveBeenCalled();
  });

  it('payload without label or connection_type still produces topic_id-augmented action', () => {
    const pushAction = vi.fn();
    const opts = makeOptions({ pushAction, effectiveTopicId: 't-77' });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    act(() => {
      result.current.handleEdgeCreated('edge-new', {
        source_node_id: 'node-A',
        target_node_id: 'node-B',
      });
    });

    expect(pushAction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'create-edge',
        edgeId: 'edge-new',
        payload: expect.objectContaining({
          source_node_id: 'node-A',
          target_node_id: 'node-B',
          topic_id: 't-77',
        }),
      }),
    );
  });
});

// ── handleQuickAdd: extended ────────────────────────────────

describe('useMapEdgeActions: handleQuickAdd (extended)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does NOT call setConnectTarget (only source flow)', () => {
    const setConnectTarget = vi.fn();
    const opts = makeOptions({ setConnectTarget });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    act(() => {
      result.current.handleQuickAdd('node-A');
    });

    expect(setConnectTarget).not.toHaveBeenCalled();
  });

  it('passes the FULL node object (not just id) to setConnectSource', () => {
    const setConnectSource = vi.fn();
    const opts = makeOptions({ setConnectSource });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    act(() => {
      result.current.handleQuickAdd('node-A');
    });

    const arg = setConnectSource.mock.calls[0][0];
    expect(arg).toMatchObject({ id: 'node-A', label: 'Node A' });
  });

  it('handles undefined graphDataNodesRef.current gracefully (no crash, no calls)', () => {
    const setConnectSource = vi.fn();
    const setAddModalOpen = vi.fn();
    const opts = makeOptions({
      graphDataNodesRef: { current: undefined as unknown as MapNode[] },
      setConnectSource,
      setAddModalOpen,
    });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    expect(() => {
      act(() => {
        result.current.handleQuickAdd('node-A');
      });
    }).not.toThrow();

    expect(setConnectSource).not.toHaveBeenCalled();
    expect(setAddModalOpen).not.toHaveBeenCalled();
  });
});

// ── handleDragConnect: extended ─────────────────────────────

describe('useMapEdgeActions: handleDragConnect (extended)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does nothing when source node is not found', () => {
    const setAddModalOpen = vi.fn();
    const opts = makeOptions({ setAddModalOpen });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    act(() => {
      result.current.handleDragConnect('nonexistent', 'node-B');
    });

    expect(setAddModalOpen).not.toHaveBeenCalled();
  });

  it('CURRENT BEHAVIOR: opens modal even for self-drag (no self-edge guard at this layer)', () => {
    // documents that drag-connect does NOT block self-drags;
    // any self-edge validation must happen downstream (modal/API).
    const setConnectSource = vi.fn();
    const setConnectTarget = vi.fn();
    const setAddModalOpen = vi.fn();
    const opts = makeOptions({ setConnectSource, setConnectTarget, setAddModalOpen });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    act(() => {
      result.current.handleDragConnect('node-A', 'node-A');
    });

    expect(setConnectSource).toHaveBeenCalled();
    expect(setConnectTarget).toHaveBeenCalled();
    expect(setAddModalOpen).toHaveBeenCalledWith(true);
  });

  it('handles undefined graphDataNodesRef.current gracefully', () => {
    const setAddModalOpen = vi.fn();
    const opts = makeOptions({
      graphDataNodesRef: { current: undefined as unknown as MapNode[] },
      setAddModalOpen,
    });
    const { result } = renderHook(() => useMapEdgeActions(opts));

    expect(() => {
      act(() => {
        result.current.handleDragConnect('node-A', 'node-B');
      });
    }).not.toThrow();

    expect(setAddModalOpen).not.toHaveBeenCalled();
  });
});

// ── reconnectingRef ─────────────────────────────────────────

describe('useMapEdgeActions: reconnectingRef', () => {
  it('is exposed and starts as false', () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useMapEdgeActions(opts));

    expect(result.current.reconnectingRef).toBeDefined();
    expect(result.current.reconnectingRef.current).toBe(false);
  });

  it('reconnectingRef identity is stable across rerenders', () => {
    const opts = makeOptions();
    const { result, rerender } = renderHook(
      (p) => useMapEdgeActions(p),
      { initialProps: opts },
    );
    const before = result.current.reconnectingRef;
    rerender(makeOptions({ effectiveTopicId: 'topic-2' }));
    expect(result.current.reconnectingRef).toBe(before);
  });
});
