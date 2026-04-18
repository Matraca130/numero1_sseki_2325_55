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

import { describe, it, expect, vi, beforeEach } from 'vitest';
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
