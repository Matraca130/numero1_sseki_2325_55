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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

// ── executeDeleteNode: setter updater semantics ─────────────
//
// Cycle 44 changed setSelectedNode/setContextMenu/setConnectSource/setAnnotationNode
// from `(node) => void` to React.Dispatch<SetStateAction<...>>. The hook now passes
// an updater function so cleanup is by-id (only nulls if matches the deleted node).
// These tests pin that updater contract.

describe('useMapNodeActions: executeDeleteNode setter updaters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteCustomNode.mockResolvedValue(undefined);
  });

  it('setSelectedNode is called with an updater function (not direct value)', async () => {
    const node = makeNode({ id: 'node-del' });
    const setSelectedNode = vi.fn();
    const opts = makeOptions({ confirmDeleteNode: node, setSelectedNode });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(setSelectedNode).toHaveBeenCalledTimes(1);
    expect(typeof setSelectedNode.mock.calls[0][0]).toBe('function');
  });

  it('setSelectedNode updater nulls out the deleted node (id match)', async () => {
    const node = makeNode({ id: 'node-del' });
    const setSelectedNode = vi.fn();
    const opts = makeOptions({ confirmDeleteNode: node, setSelectedNode });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    const updater = setSelectedNode.mock.calls[0][0] as (prev: MapNode | null) => MapNode | null;
    const matchingNode = makeNode({ id: 'node-del' });
    expect(updater(matchingNode)).toBeNull();
  });

  it('setSelectedNode updater preserves an unrelated node (id mismatch)', async () => {
    const node = makeNode({ id: 'node-del' });
    const setSelectedNode = vi.fn();
    const opts = makeOptions({ confirmDeleteNode: node, setSelectedNode });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    const updater = setSelectedNode.mock.calls[0][0] as (prev: MapNode | null) => MapNode | null;
    const otherNode = makeNode({ id: 'other-node' });
    expect(updater(otherNode)).toBe(otherNode);
  });

  it('setSelectedNode updater handles null prev (already cleared)', async () => {
    const node = makeNode({ id: 'node-del' });
    const setSelectedNode = vi.fn();
    const opts = makeOptions({ confirmDeleteNode: node, setSelectedNode });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    const updater = setSelectedNode.mock.calls[0][0] as (prev: MapNode | null) => MapNode | null;
    expect(updater(null)).toBeNull();
  });

  it('setContextMenu updater nulls out when prev.node.id matches (different shape: {node, position})', async () => {
    const node = makeNode({ id: 'node-del' });
    const setContextMenu = vi.fn();
    const opts = makeOptions({ confirmDeleteNode: node, setContextMenu });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    type CtxMenu = { node: MapNode; position: { x: number; y: number } } | null;
    const updater = setContextMenu.mock.calls[0][0] as (prev: CtxMenu) => CtxMenu;
    const ctxMenu = { node: makeNode({ id: 'node-del' }), position: { x: 10, y: 20 } };
    expect(updater(ctxMenu)).toBeNull();
  });

  it('setContextMenu updater preserves prev when prev.node.id does not match', async () => {
    const node = makeNode({ id: 'node-del' });
    const setContextMenu = vi.fn();
    const opts = makeOptions({ confirmDeleteNode: node, setContextMenu });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    type CtxMenu = { node: MapNode; position: { x: number; y: number } } | null;
    const updater = setContextMenu.mock.calls[0][0] as (prev: CtxMenu) => CtxMenu;
    const ctxMenu = { node: makeNode({ id: 'other-node' }), position: { x: 5, y: 5 } };
    expect(updater(ctxMenu)).toBe(ctxMenu);
  });

  it('setContextMenu updater handles null prev', async () => {
    const node = makeNode({ id: 'node-del' });
    const setContextMenu = vi.fn();
    const opts = makeOptions({ confirmDeleteNode: node, setContextMenu });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    type CtxMenu = { node: MapNode; position: { x: number; y: number } } | null;
    const updater = setContextMenu.mock.calls[0][0] as (prev: CtxMenu) => CtxMenu;
    expect(updater(null)).toBeNull();
  });

  it('setConnectSource updater nulls out the deleted node (id match)', async () => {
    const node = makeNode({ id: 'node-del' });
    const setConnectSource = vi.fn();
    const opts = makeOptions({ confirmDeleteNode: node, setConnectSource });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    const updater = setConnectSource.mock.calls[0][0] as (prev: MapNode | null) => MapNode | null;
    expect(updater(makeNode({ id: 'node-del' }))).toBeNull();
    expect(updater(makeNode({ id: 'other' }))).not.toBeNull();
    expect(updater(null)).toBeNull();
  });

  it('setAnnotationNode updater nulls out the deleted node (id match)', async () => {
    const node = makeNode({ id: 'node-del' });
    const setAnnotationNode = vi.fn();
    const opts = makeOptions({ confirmDeleteNode: node, setAnnotationNode });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    const updater = setAnnotationNode.mock.calls[0][0] as (prev: MapNode | null) => MapNode | null;
    expect(updater(makeNode({ id: 'node-del' }))).toBeNull();
    const otherNode = makeNode({ id: 'other' });
    expect(updater(otherNode)).toBe(otherNode);
    expect(updater(null)).toBeNull();
  });

  it('setter updaters are NOT called on error path (cleanup only on success)', async () => {
    mockDeleteCustomNode.mockRejectedValue(new Error('boom'));
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

    expect(setSelectedNode).not.toHaveBeenCalled();
    expect(setContextMenu).not.toHaveBeenCalled();
    expect(setConnectSource).not.toHaveBeenCalled();
    expect(setAnnotationNode).not.toHaveBeenCalled();
  });
});

// ── executeDeleteNode: pushAction payload ───────────────────

describe('useMapNodeActions: executeDeleteNode pushAction payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteCustomNode.mockResolvedValue(undefined);
  });

  it('pushAction payload includes label, definition, topic_id', async () => {
    const node = makeNode({
      id: 'node-x',
      label: 'Apoptosis',
      definition: 'Programmed cell death',
    });
    const pushAction = vi.fn();
    const opts = makeOptions({
      confirmDeleteNode: node,
      pushAction,
      effectiveTopicId: 'topic-bio',
    });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(pushAction).toHaveBeenCalledWith({
      type: 'delete-node',
      nodeId: 'node-x',
      payload: {
        label: 'Apoptosis',
        definition: 'Programmed cell death',
        topic_id: 'topic-bio',
      },
    });
  });

  it('pushAction is NOT called on error path', async () => {
    mockDeleteCustomNode.mockRejectedValue(new Error('boom'));
    const node = makeNode();
    const pushAction = vi.fn();
    const opts = makeOptions({ confirmDeleteNode: node, pushAction });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(pushAction).not.toHaveBeenCalled();
  });

  it('refetch is NOT called on error path', async () => {
    mockDeleteCustomNode.mockRejectedValue(new Error('boom'));
    const node = makeNode();
    const refetch = vi.fn();
    const opts = makeOptions({ confirmDeleteNode: node, refetch });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(refetch).not.toHaveBeenCalled();
  });

  it('definition can be undefined and still produces a valid payload', async () => {
    const node = makeNode({ id: 'n', label: 'X', definition: undefined });
    const pushAction = vi.fn();
    const opts = makeOptions({ confirmDeleteNode: node, pushAction });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(pushAction).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          label: 'X',
          definition: undefined,
        }),
      }),
    );
  });
});

// ── executeDeleteNode: history entry semantics ──────────────

describe('useMapNodeActions: executeDeleteNode history entry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteCustomNode.mockResolvedValue(undefined);
  });

  it('setHistoryEntries is called with an updater function', async () => {
    const node = makeNode();
    const setHistoryEntries = vi.fn();
    const opts = makeOptions({ confirmDeleteNode: node, setHistoryEntries });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(setHistoryEntries).toHaveBeenCalledTimes(1);
    expect(typeof setHistoryEntries.mock.calls[0][0]).toBe('function');
  });

  it('history-entries updater APPENDS (not prepends) the delete entry', async () => {
    const node = makeNode({ label: 'Apoptosis' });
    const setHistoryEntries = vi.fn();
    const opts = makeOptions({ confirmDeleteNode: node, setHistoryEntries });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    const updater = setHistoryEntries.mock.calls[0][0] as (prev: unknown[]) => unknown[];
    const existing = [
      { id: 'h1', type: 'create-node', description: 'old', timestamp: '2024-01-01', badge: 'Nodo' },
    ];
    const next = updater(existing);

    expect(next).toHaveLength(2);
    expect((next[0] as { id: string }).id).toBe('h1');
    expect((next[1] as { type: string }).type).toBe('delete-node');
  });

  it('delete history entry has type=delete-node, badge=Nodo, description contains label', async () => {
    const node = makeNode({ label: 'Mitosis' });
    const setHistoryEntries = vi.fn();
    const opts = makeOptions({ confirmDeleteNode: node, setHistoryEntries });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    const updater = setHistoryEntries.mock.calls[0][0] as (prev: unknown[]) => unknown[];
    const next = updater([]);
    expect(next).toHaveLength(1);
    const entry = next[0] as { type: string; badge: string; description: string };
    expect(entry.type).toBe('delete-node');
    expect(entry.badge).toBe('Nodo');
    expect(entry.description).toContain('Mitosis');
  });

  it('setHistoryEntries is NOT called on error path', async () => {
    mockDeleteCustomNode.mockRejectedValue(new Error('boom'));
    const node = makeNode();
    const setHistoryEntries = vi.fn();
    const opts = makeOptions({ confirmDeleteNode: node, setHistoryEntries });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(setHistoryEntries).not.toHaveBeenCalled();
  });
});

// ── executeDeleteNode: deletingNodeRef reentrancy guard ─────

describe('useMapNodeActions: deletingNodeRef', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteCustomNode.mockResolvedValue(undefined);
  });

  it('is exposed and starts as false', () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useMapNodeActions(opts));

    expect(result.current.deletingNodeRef).toBeDefined();
    expect(result.current.deletingNodeRef.current).toBe(false);
  });

  it('identity is stable across rerenders', () => {
    const opts = makeOptions();
    const { result, rerender } = renderHook(
      (p) => useMapNodeActions(p),
      { initialProps: opts },
    );
    const before = result.current.deletingNodeRef;
    rerender(makeOptions({ effectiveTopicId: 'topic-2' }));
    expect(result.current.deletingNodeRef).toBe(before);
  });

  it('is reset to false after success', async () => {
    const node = makeNode();
    const opts = makeOptions({ confirmDeleteNode: node });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(result.current.deletingNodeRef.current).toBe(false);
  });

  it('is reset to false after API error', async () => {
    mockDeleteCustomNode.mockRejectedValue(new Error('boom'));
    const node = makeNode();
    const opts = makeOptions({ confirmDeleteNode: node });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(result.current.deletingNodeRef.current).toBe(false);
  });

  it('blocks concurrent calls while delete is in-flight (reentrancy)', async () => {
    let resolveDelete: ((v: unknown) => void) | null = null;
    mockDeleteCustomNode.mockImplementation(
      () => new Promise((res) => { resolveDelete = res; }),
    );
    const node = makeNode();
    const opts = makeOptions({ confirmDeleteNode: node });
    const { result } = renderHook(() => useMapNodeActions(opts));

    let firstPromise!: Promise<void>;
    act(() => {
      firstPromise = result.current.executeDeleteNode();
    });

    // Second call while first hangs — should be a no-op
    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(mockDeleteCustomNode).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveDelete?.(undefined);
      await firstPromise;
    });
  });

  it('early-return when confirmDeleteNode is null does NOT touch the ref', async () => {
    const opts = makeOptions({ confirmDeleteNode: null });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    // ref was never set true → still false (no observable difference, but verifies finally{} not entered)
    expect(result.current.deletingNodeRef.current).toBe(false);
    expect(mockDeleteCustomNode).not.toHaveBeenCalled();
  });

  it('early-return when effectiveTopicId is empty does NOT touch the ref', async () => {
    const node = makeNode();
    const opts = makeOptions({ confirmDeleteNode: node, effectiveTopicId: '' });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(result.current.deletingNodeRef.current).toBe(false);
    expect(mockDeleteCustomNode).not.toHaveBeenCalled();
  });
});

// ── executeDeleteNode: mountedRef bail ──────────────────────

describe('useMapNodeActions: mountedRef bail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT call pushAction/setHistoryEntries/refetch when unmounted before success', async () => {
    const mountedRef = { current: true };
    mockDeleteCustomNode.mockImplementation(async () => {
      mountedRef.current = false;
    });
    const node = makeNode();
    const pushAction = vi.fn();
    const setHistoryEntries = vi.fn();
    const refetch = vi.fn();
    const setConfirmDeleteNode = vi.fn();
    const opts = makeOptions({
      confirmDeleteNode: node,
      mountedRef,
      pushAction,
      setHistoryEntries,
      refetch,
      setConfirmDeleteNode,
    });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(pushAction).not.toHaveBeenCalled();
    expect(setHistoryEntries).not.toHaveBeenCalled();
    expect(refetch).not.toHaveBeenCalled();
    expect(setConfirmDeleteNode).not.toHaveBeenCalled();
  });

  it('does NOT call setSelectedNode/setContextMenu/setConnectSource/setAnnotationNode when unmounted before success', async () => {
    const mountedRef = { current: true };
    mockDeleteCustomNode.mockImplementation(async () => {
      mountedRef.current = false;
    });
    const node = makeNode();
    const setSelectedNode = vi.fn();
    const setContextMenu = vi.fn();
    const setConnectSource = vi.fn();
    const setAnnotationNode = vi.fn();
    const opts = makeOptions({
      confirmDeleteNode: node,
      mountedRef,
      setSelectedNode,
      setContextMenu,
      setConnectSource,
      setAnnotationNode,
    });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(setSelectedNode).not.toHaveBeenCalled();
    expect(setContextMenu).not.toHaveBeenCalled();
    expect(setConnectSource).not.toHaveBeenCalled();
    expect(setAnnotationNode).not.toHaveBeenCalled();
  });

  it('does NOT call toast.error when unmounted in catch path', async () => {
    const mountedRef = { current: true };
    mockDeleteCustomNode.mockImplementation(async () => {
      mountedRef.current = false;
      throw new Error('boom');
    });
    const node = makeNode();
    const setConfirmDeleteNode = vi.fn();
    const opts = makeOptions({
      confirmDeleteNode: node,
      mountedRef,
      setConfirmDeleteNode,
    });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(mockToastError).not.toHaveBeenCalled();
    expect(setConfirmDeleteNode).not.toHaveBeenCalled();
  });

  it('STILL resets deletingNodeRef to false in finally even when unmounted', async () => {
    const mountedRef = { current: true };
    mockDeleteCustomNode.mockImplementation(async () => {
      mountedRef.current = false;
    });
    const node = makeNode();
    const opts = makeOptions({ confirmDeleteNode: node, mountedRef });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(result.current.deletingNodeRef.current).toBe(false);
  });
});

// ── handleNodeCreated: extended ─────────────────────────────

describe('useMapNodeActions: handleNodeCreated (extended)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('handles payload without definition (only label)', () => {
    const pushAction = vi.fn();
    const opts = makeOptions({ pushAction, effectiveTopicId: 't-1' });
    const { result } = renderHook(() => useMapNodeActions(opts));

    act(() => {
      result.current.handleNodeCreated('n-1', { label: 'Mitosis' });
    });

    expect(pushAction).toHaveBeenCalledWith({
      type: 'create-node',
      nodeId: 'n-1',
      payload: { label: 'Mitosis', topic_id: 't-1' },
    });
  });

  it('history-entries updater APPENDS (not prepends) the create entry', () => {
    const setHistoryEntries = vi.fn();
    const opts = makeOptions({ setHistoryEntries });
    const { result } = renderHook(() => useMapNodeActions(opts));

    act(() => {
      result.current.handleNodeCreated('n-1', { label: 'Mitosis' });
    });

    const updater = setHistoryEntries.mock.calls[0][0] as (prev: unknown[]) => unknown[];
    const existing = [
      { id: 'h1', type: 'delete-edge', description: 'old', timestamp: '2024-01-01', badge: 'Conexión' },
    ];
    const next = updater(existing);

    expect(next).toHaveLength(2);
    expect((next[0] as { id: string }).id).toBe('h1');
    expect((next[1] as { type: string }).type).toBe('create-node');
  });

  it('create history entry has type=create-node, badge=Nodo, description contains label', () => {
    const setHistoryEntries = vi.fn();
    const opts = makeOptions({ setHistoryEntries });
    const { result } = renderHook(() => useMapNodeActions(opts));

    act(() => {
      result.current.handleNodeCreated('n-1', { label: 'Photosynthesis' });
    });

    const updater = setHistoryEntries.mock.calls[0][0] as (prev: unknown[]) => unknown[];
    const next = updater([]);
    expect(next).toHaveLength(1);
    const entry = next[0] as { type: string; badge: string; description: string };
    expect(entry.type).toBe('create-node');
    expect(entry.badge).toBe('Nodo');
    expect(entry.description).toContain('Photosynthesis');
  });

  it('passes the SAME nodeId through to pushAction (string identity)', () => {
    const pushAction = vi.fn();
    const opts = makeOptions({ pushAction });
    const { result } = renderHook(() => useMapNodeActions(opts));

    act(() => {
      result.current.handleNodeCreated('precise-uuid-123', { label: 'X' });
    });

    expect(pushAction.mock.calls[0][0].nodeId).toBe('precise-uuid-123');
  });

  it('topic_id is propagated from effectiveTopicId into payload', () => {
    const pushAction = vi.fn();
    const opts = makeOptions({ pushAction, effectiveTopicId: 'topic-XYZ' });
    const { result } = renderHook(() => useMapNodeActions(opts));

    act(() => {
      result.current.handleNodeCreated('n', { label: 'X' });
    });

    expect(pushAction.mock.calls[0][0].payload.topic_id).toBe('topic-XYZ');
  });
});

// ── haptic vibration ────────────────────────────────────────

describe('useMapNodeActions: haptic vibration', () => {
  let originalVibrate: typeof navigator.vibrate | undefined;
  let mockVibrate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteCustomNode.mockResolvedValue(undefined);
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

  it('handleNodeCreated vibrates 50ms', () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useMapNodeActions(opts));

    act(() => {
      result.current.handleNodeCreated('n-1', { label: 'X' });
    });

    expect(mockVibrate).toHaveBeenCalledWith(50);
  });

  it('handleDeleteCustomNode (just opens confirm dialog) does NOT vibrate', async () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useMapNodeActions(opts));

    const node = makeNode({ isUserCreated: true });
    await act(async () => {
      await result.current.handleDeleteCustomNode(node);
    });

    expect(mockVibrate).not.toHaveBeenCalled();
  });

  it('executeDeleteNode does NOT vibrate (only confirm + handleNodeCreated do)', async () => {
    const node = makeNode();
    const opts = makeOptions({ confirmDeleteNode: node });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(mockVibrate).not.toHaveBeenCalled();
  });
});

// ── Stable references ───────────────────────────────────────

describe('useMapNodeActions: stable references', () => {
  beforeEach(() => vi.clearAllMocks());

  it('handleDeleteCustomNode reference is stable across rerenders with same deps', () => {
    const opts = makeOptions();
    const { result, rerender } = renderHook(
      (p) => useMapNodeActions(p),
      { initialProps: opts },
    );
    const before = result.current.handleDeleteCustomNode;
    rerender(opts);
    expect(result.current.handleDeleteCustomNode).toBe(before);
  });

  it('executeDeleteNode reference is stable across rerenders with same deps', () => {
    const opts = makeOptions();
    const { result, rerender } = renderHook(
      (p) => useMapNodeActions(p),
      { initialProps: opts },
    );
    const before = result.current.executeDeleteNode;
    rerender(opts);
    expect(result.current.executeDeleteNode).toBe(before);
  });

  it('handleNodeCreated reference is stable across rerenders with same deps', () => {
    const opts = makeOptions();
    const { result, rerender } = renderHook(
      (p) => useMapNodeActions(p),
      { initialProps: opts },
    );
    const before = result.current.handleNodeCreated;
    rerender(opts);
    expect(result.current.handleNodeCreated).toBe(before);
  });

  it('executeDeleteNode reference changes when effectiveTopicId changes', () => {
    const opts1 = makeOptions({ effectiveTopicId: 'topic-1' });
    const { result, rerender } = renderHook(
      (p) => useMapNodeActions(p),
      { initialProps: opts1 },
    );
    const before = result.current.executeDeleteNode;
    rerender(makeOptions({ effectiveTopicId: 'topic-2' }));
    expect(result.current.executeDeleteNode).not.toBe(before);
  });

  it('executeDeleteNode reference changes when confirmDeleteNode changes', () => {
    const opts1 = makeOptions({ confirmDeleteNode: null });
    const { result, rerender } = renderHook(
      (p) => useMapNodeActions(p),
      { initialProps: opts1 },
    );
    const before = result.current.executeDeleteNode;
    rerender(makeOptions({ confirmDeleteNode: makeNode() }));
    expect(result.current.executeDeleteNode).not.toBe(before);
  });

  it('handleNodeCreated reference changes when effectiveTopicId changes', () => {
    const opts1 = makeOptions({ effectiveTopicId: 'topic-1' });
    const { result, rerender } = renderHook(
      (p) => useMapNodeActions(p),
      { initialProps: opts1 },
    );
    const before = result.current.handleNodeCreated;
    rerender(makeOptions({ effectiveTopicId: 'topic-2' }));
    expect(result.current.handleNodeCreated).not.toBe(before);
  });

  it('handleDeleteCustomNode does NOT depend on effectiveTopicId (stable across topic change)', () => {
    const setConfirmDeleteNode = vi.fn();
    const opts1 = makeOptions({ effectiveTopicId: 'topic-1', setConfirmDeleteNode });
    const { result, rerender } = renderHook(
      (p) => useMapNodeActions(p),
      { initialProps: opts1 },
    );
    const before = result.current.handleDeleteCustomNode;
    // Only effectiveTopicId changes; setConfirmDeleteNode (the only dep) stays identical
    rerender({ ...opts1, effectiveTopicId: 'topic-2' });
    expect(result.current.handleDeleteCustomNode).toBe(before);
  });
});

// ── handleDeleteCustomNode: extended ────────────────────────

describe('useMapNodeActions: handleDeleteCustomNode (extended)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a Promise (async function shape)', () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useMapNodeActions(opts));
    const node = makeNode({ isUserCreated: true });
    const ret = result.current.handleDeleteCustomNode(node);
    expect(ret).toBeInstanceOf(Promise);
    return ret; // settle the promise
  });

  it('passes the FULL node object (not just id) to setConfirmDeleteNode', async () => {
    const setConfirmDeleteNode = vi.fn();
    const opts = makeOptions({ setConfirmDeleteNode });
    const { result } = renderHook(() => useMapNodeActions(opts));

    const node = makeNode({ id: 'n-1', label: 'Mitosis', definition: 'cell division', isUserCreated: true });
    await act(async () => {
      await result.current.handleDeleteCustomNode(node);
    });

    const arg = setConfirmDeleteNode.mock.calls[0][0];
    expect(arg).toMatchObject({ id: 'n-1', label: 'Mitosis', definition: 'cell division' });
  });

  it('does NOT call deleteCustomNode API (only opens confirm dialog)', async () => {
    const opts = makeOptions();
    const { result } = renderHook(() => useMapNodeActions(opts));

    const node = makeNode({ isUserCreated: true });
    await act(async () => {
      await result.current.handleDeleteCustomNode(node);
    });

    expect(mockDeleteCustomNode).not.toHaveBeenCalled();
  });

  it('isUserCreated=undefined is treated as falsy (no-op)', async () => {
    const setConfirmDeleteNode = vi.fn();
    const opts = makeOptions({ setConfirmDeleteNode });
    const { result } = renderHook(() => useMapNodeActions(opts));

    const node = makeNode({ isUserCreated: undefined });
    await act(async () => {
      await result.current.handleDeleteCustomNode(node);
    });

    expect(setConfirmDeleteNode).not.toHaveBeenCalled();
  });
});

// ── executeDeleteNode: argument identity ────────────────────

describe('useMapNodeActions: executeDeleteNode argument identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteCustomNode.mockResolvedValue(undefined);
  });

  it('passes confirmDeleteNode.id (string) to deleteCustomNode', async () => {
    const node = makeNode({ id: 'precise-id-12345' });
    const opts = makeOptions({ confirmDeleteNode: node });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(mockDeleteCustomNode).toHaveBeenCalledTimes(1);
    expect(mockDeleteCustomNode).toHaveBeenCalledWith('precise-id-12345');
  });

  it('does not pass extra arguments to deleteCustomNode', async () => {
    const node = makeNode();
    const opts = makeOptions({ confirmDeleteNode: node });
    const { result } = renderHook(() => useMapNodeActions(opts));

    await act(async () => {
      await result.current.executeDeleteNode();
    });

    expect(mockDeleteCustomNode.mock.calls[0]).toHaveLength(1);
  });
});
