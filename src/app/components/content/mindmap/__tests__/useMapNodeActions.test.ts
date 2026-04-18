// ============================================================
// Tests -- useMapNodeActions (node CRUD callbacks)
//
// Tests the three exported callbacks:
//   - handleDeleteCustomNode: guard on isUserCreated, sets confirm dialog
//   - executeDeleteNode: API call, undo recording, state cleanup, error path
//   - handleNodeCreated: push undo action + history entry
//
// Uses vi.mock for mindmapApi.deleteCustomNode and sonner toast.
// Hook is tested via renderHook from @testing-library/react.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { MapNode } from '@/app/types/mindmap';

// ── Mock dependencies ───────────────────────────────────────

const mockDeleteCustomNode = vi.fn();

vi.mock('@/app/services/mindmapApi', () => ({
  deleteCustomNode: (...args: unknown[]) => mockDeleteCustomNode(...args),
}));

const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

import { useMapNodeActions } from '../useMapNodeActions';

// ── Helpers ─────────────────────────────────────────────────

function makeNode(overrides?: Partial<MapNode>): MapNode {
  return {
    id: 'node-1',
    label: 'Test Node',
    definition: 'A test node',
    masteryColor: 'gray',
    isUserCreated: true,
    ...overrides,
  } as MapNode;
}

function makeOptions(overrides?: Record<string, unknown>) {
  const defaults = {
    effectiveTopicId: 'topic-1',
    mountedRef: { current: true },
    confirmDeleteNode: null as MapNode | null,
    setConfirmDeleteNode: vi.fn(),
    setSelectedNode: vi.fn(),
    setContextMenu: vi.fn(),
    setConnectSource: vi.fn(),
    setAnnotationNode: vi.fn(),
    pushAction: vi.fn(),
    refetch: vi.fn(),
    setHistoryEntries: vi.fn(),
    t: {
      deleteNodeError: 'Error al eliminar nodo',
    },
  };
  return { ...defaults, ...overrides } as Parameters<typeof useMapNodeActions>[0];
}

// ── handleDeleteCustomNode ──────────────────────────────────

describe('useMapNodeActions: handleDeleteCustomNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets confirmDeleteNode when node is user-created', async () => {
    const setConfirmDeleteNode = vi.fn();
    const opts = makeOptions({ setConfirmDeleteNode });
    const { result } = renderHook(() => useMapNodeActions(opts));

    const node = makeNode({ isUserCreated: true });
    await act(async () => {
      await result.current.handleDeleteCustomNode(node);
    });

    expect(setConfirmDeleteNode).toHaveBeenCalledWith(node);
  });

  it('does NOT set confirmDeleteNode when node is not user-created', async () => {
    const setConfirmDeleteNode = vi.fn();
    const opts = makeOptions({ setConfirmDeleteNode });
    const { result } = renderHook(() => useMapNodeActions(opts));

    const node = makeNode({ isUserCreated: false });
    await act(async () => {
      await result.current.handleDeleteCustomNode(node);
    });

    expect(setConfirmDeleteNode).not.toHaveBeenCalled();
  });
});

// ── executeDeleteNode ───────────────────────────────────────

describe('useMapNodeActions: executeDeleteNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteCustomNode.mockResolvedValue(undefined);
  });

  it('calls deleteCustomNode API and records undo action on success', async () => {
    const pushAction = vi.fn();
    const refetch = vi.fn();
    const setConfirmDeleteNode = vi.fn();
    const setHistoryEntries = vi.fn();
    const node = makeNode({ id: 'node-42', label: 'Apoptosis' });

    const opts = makeOptions({
      confirmDeleteNode: node,
      pushAction,
      refetch,
      setConfirmDeleteNode,
      setHistoryEntries,
    });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(mockDeleteCustomNode).toHaveBeenCalledWith('node-42');
    expect(pushAction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'delete-node',
        nodeId: 'node-42',
      }),
    );
    expect(refetch).toHaveBeenCalled();
    expect(setConfirmDeleteNode).toHaveBeenCalledWith(null);
  });

  it('does nothing when confirmDeleteNode is null', async () => {
    const opts = makeOptions({ confirmDeleteNode: null });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(mockDeleteCustomNode).not.toHaveBeenCalled();
  });

  it('does nothing when effectiveTopicId is empty', async () => {
    const node = makeNode();
    const opts = makeOptions({ confirmDeleteNode: node, effectiveTopicId: '' });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(mockDeleteCustomNode).not.toHaveBeenCalled();
  });

  it('shows toast error on API failure', async () => {
    mockDeleteCustomNode.mockRejectedValue(new Error('Network error'));
    const node = makeNode();
    const setConfirmDeleteNode = vi.fn();
    const opts = makeOptions({ confirmDeleteNode: node, setConfirmDeleteNode });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(mockToastError).toHaveBeenCalledWith('Network error');
    expect(setConfirmDeleteNode).toHaveBeenCalledWith(null);
  });

  it('uses t.deleteNodeError for non-Error exceptions', async () => {
    mockDeleteCustomNode.mockRejectedValue('raw string error');
    const node = makeNode();
    const opts = makeOptions({ confirmDeleteNode: node });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(mockToastError).toHaveBeenCalledWith('Error al eliminar nodo');
  });

  it('clears related UI state after successful deletion', async () => {
    const node = makeNode({ id: 'node-del' });
    const setSelectedNode = vi.fn();
    const setContextMenu = vi.fn();
    const setConnectSource = vi.fn();
    const setAnnotationNode = vi.fn();

    const opts = makeOptions({
      confirmDeleteNode: node,
      setSelectedNode,
      setContextMenu,
      setConnectSource,
      setAnnotationNode,
    });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    // All setter functions should have been called (to clear if matching deleted node)
    expect(setSelectedNode).toHaveBeenCalled();
    expect(setContextMenu).toHaveBeenCalled();
    expect(setConnectSource).toHaveBeenCalled();
    expect(setAnnotationNode).toHaveBeenCalled();
  });
});

// ── handleNodeCreated ───────────────────────────────────────

describe('useMapNodeActions: handleNodeCreated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pushes a create-node undo action with topic_id', () => {
    const pushAction = vi.fn();
    const setHistoryEntries = vi.fn();
    const opts = makeOptions({ pushAction, setHistoryEntries, effectiveTopicId: 'topic-99' });
    const { result } = renderHook(() => useMapNodeActions(opts));

    act(() => {
      result.current.handleNodeCreated('new-node-1', { label: 'Mitosis', definition: 'Cell division' });
    });

    expect(pushAction).toHaveBeenCalledWith({
      type: 'create-node',
      nodeId: 'new-node-1',
      payload: { label: 'Mitosis', definition: 'Cell division', topic_id: 'topic-99' },
    });
  });

  it('appends a history entry', () => {
    const setHistoryEntries = vi.fn();
    const opts = makeOptions({ setHistoryEntries });
    const { result } = renderHook(() => useMapNodeActions(opts));

    act(() => {
      result.current.handleNodeCreated('n1', { label: 'Mitosis' });
    });

    expect(setHistoryEntries).toHaveBeenCalledWith(expect.any(Function));
  });
});
