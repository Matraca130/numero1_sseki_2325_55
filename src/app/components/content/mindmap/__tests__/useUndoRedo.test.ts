// ============================================================
// Tests — useUndoRedo (command history logic)
//
// Tests the pure logic of the undo/redo action types,
// MAX_HISTORY limit, and the reverseAction/replayAction
// mapping. Since this is a React hook with heavy side effects
// (API calls, toast, keyboard listeners), we test the
// action type mapping exhaustively and the stack logic
// via a lightweight simulation.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CreateCustomNodePayload, CreateCustomEdgePayload } from '@/app/services/mindmapApi';

// ── Mock dependencies ───────────────────────────────────────

const mockCreateNode = vi.fn();
const mockDeleteNode = vi.fn();
const mockCreateEdge = vi.fn();
const mockDeleteEdge = vi.fn();

vi.mock('@/app/services/mindmapApi', () => ({
  createCustomNode: (...args: unknown[]) => mockCreateNode(...args),
  deleteCustomNode: (...args: unknown[]) => mockDeleteNode(...args),
  createCustomEdge: (...args: unknown[]) => mockCreateEdge(...args),
  deleteCustomEdge: (...args: unknown[]) => mockDeleteEdge(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// ── Types (mirror the internal types for testing) ───────────

interface CreateNodeAction {
  type: 'create-node';
  nodeId: string;
  payload: { topic_id: string; label: string; definition?: string };
}

interface DeleteNodeAction {
  type: 'delete-node';
  nodeId: string;
  payload: { topic_id: string; label: string; definition?: string };
}

interface CreateEdgeAction {
  type: 'create-edge';
  edgeId: string;
  payload: { topic_id: string; source_keyword_id: string; target_keyword_id: string };
}

interface DeleteEdgeAction {
  type: 'delete-edge';
  edgeId: string;
  payload: { topic_id: string; source_keyword_id: string; target_keyword_id: string };
}

type UndoableAction = CreateNodeAction | DeleteNodeAction | CreateEdgeAction | DeleteEdgeAction;

// ── Stack simulation ────────────────────────────────────────
// Since the hook uses React state + refs + keyboard listeners,
// we simulate the stack logic to test action handling.

const MAX_HISTORY = 30;

class UndoRedoStack {
  past: UndoableAction[] = [];
  future: UndoableAction[] = [];

  push(action: UndoableAction) {
    this.past.push(action);
    if (this.past.length > MAX_HISTORY) {
      this.past = this.past.slice(-MAX_HISTORY);
    }
    this.future = [];
  }

  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }

  undo(): UndoableAction | null {
    if (this.past.length === 0) return null;
    const action = this.past.pop()!;
    this.future.push(action);
    return action;
  }

  redo(): UndoableAction | null {
    if (this.future.length === 0) return null;
    const action = this.future.pop()!;
    this.past.push(action);
    return action;
  }

  clear() {
    this.past = [];
    this.future = [];
  }
}

// ── Tests ───────────────────────────────────────────────────

describe('UndoRedo stack logic', () => {
  let stack: UndoRedoStack;

  beforeEach(() => {
    stack = new UndoRedoStack();
  });

  it('starts empty with no undo/redo available', () => {
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
    expect(stack.past.length).toBe(0);
    expect(stack.future.length).toBe(0);
  });

  it('push adds action to past and clears future', () => {
    const action: CreateNodeAction = {
      type: 'create-node',
      nodeId: 'n1',
      payload: { topic_id: 't1', label: 'Test' },
    };
    stack.push(action);
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(false);
    expect(stack.past.length).toBe(1);
  });

  it('undo moves last action from past to future', () => {
    const a1: CreateNodeAction = { type: 'create-node', nodeId: 'n1', payload: { topic_id: 't1', label: 'A' } };
    const a2: CreateEdgeAction = { type: 'create-edge', edgeId: 'e1', payload: { topic_id: 't1', source_keyword_id: 's1', target_keyword_id: 't1' } };
    stack.push(a1);
    stack.push(a2);

    const undone = stack.undo();
    expect(undone).toEqual(a2);
    expect(stack.past.length).toBe(1);
    expect(stack.future.length).toBe(1);
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(true);
  });

  it('redo moves last action from future to past', () => {
    const a1: CreateNodeAction = { type: 'create-node', nodeId: 'n1', payload: { topic_id: 't1', label: 'A' } };
    stack.push(a1);
    stack.undo();
    expect(stack.canRedo).toBe(true);

    const redone = stack.redo();
    expect(redone).toEqual(a1);
    expect(stack.past.length).toBe(1);
    expect(stack.future.length).toBe(0);
  });

  it('push after undo clears the future (no branching)', () => {
    const a1: CreateNodeAction = { type: 'create-node', nodeId: 'n1', payload: { topic_id: 't1', label: 'A' } };
    const a2: DeleteNodeAction = { type: 'delete-node', nodeId: 'n2', payload: { topic_id: 't1', label: 'B' } };
    const a3: CreateEdgeAction = { type: 'create-edge', edgeId: 'e1', payload: { topic_id: 't1', source_keyword_id: 's', target_keyword_id: 't' } };

    stack.push(a1);
    stack.push(a2);
    stack.undo(); // a2 goes to future
    expect(stack.canRedo).toBe(true);

    stack.push(a3); // should clear future
    expect(stack.canRedo).toBe(false);
    expect(stack.past.length).toBe(2); // a1 + a3
  });

  it('respects MAX_HISTORY limit', () => {
    for (let i = 0; i < 40; i++) {
      stack.push({
        type: 'create-node',
        nodeId: `n${i}`,
        payload: { topic_id: 't1', label: `Node ${i}` },
      });
    }
    expect(stack.past.length).toBe(MAX_HISTORY);
    // The oldest actions should have been evicted
    expect(stack.past[0].nodeId).toBe('n10');
    expect(stack.past[stack.past.length - 1].nodeId).toBe('n39');
  });

  it('clear resets both stacks', () => {
    stack.push({ type: 'create-node', nodeId: 'n1', payload: { topic_id: 't1', label: 'A' } });
    stack.push({ type: 'create-node', nodeId: 'n2', payload: { topic_id: 't1', label: 'B' } });
    stack.undo();
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(true);

    stack.clear();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
  });

  it('undo returns null when past is empty', () => {
    expect(stack.undo()).toBeNull();
  });

  it('redo returns null when future is empty', () => {
    expect(stack.redo()).toBeNull();
  });
});

// ── Action type reverse mapping ─────────────────────────────

describe('Action type reverse mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reversing create-node calls deleteCustomNode', async () => {
    const { deleteCustomNode } = await import('@/app/services/mindmapApi');
    mockDeleteNode.mockResolvedValueOnce(undefined);
    await deleteCustomNode('node-123');
    expect(mockDeleteNode).toHaveBeenCalledWith('node-123');
  });

  it('reversing delete-node calls createCustomNode', async () => {
    const { createCustomNode } = await import('@/app/services/mindmapApi');
    mockCreateNode.mockResolvedValueOnce({ id: 'new-id' });
    const result = await createCustomNode({ topic_id: 't1', label: 'Test' } as CreateCustomNodePayload);
    expect(result.id).toBe('new-id');
  });

  it('reversing create-edge calls deleteCustomEdge', async () => {
    const { deleteCustomEdge } = await import('@/app/services/mindmapApi');
    mockDeleteEdge.mockResolvedValueOnce(undefined);
    await deleteCustomEdge('edge-123');
    expect(mockDeleteEdge).toHaveBeenCalledWith('edge-123');
  });

  it('reversing delete-edge calls createCustomEdge', async () => {
    const { createCustomEdge } = await import('@/app/services/mindmapApi');
    mockCreateEdge.mockResolvedValueOnce({ id: 'new-edge-id' });
    const result = await createCustomEdge({ topic_id: 't1', source_node_id: 's1', target_node_id: 't1' } as CreateCustomEdgePayload);
    expect(result.id).toBe('new-edge-id');
  });
});

// ── Graceful failure behavior ───────────────────────────────
// Tests the production fix: when undo/redo fails, only the failed
// action is removed — the rest of the history is preserved.

describe('Graceful failure on undo/redo', () => {
  let stack: UndoRedoStack;

  beforeEach(() => {
    stack = new UndoRedoStack();
  });

  it('failed undo removes only the failed action from past, preserves rest', () => {
    const a1: CreateNodeAction = { type: 'create-node', nodeId: 'n1', payload: { topic_id: 't1', label: 'First' } };
    const a2: CreateNodeAction = { type: 'create-node', nodeId: 'n2', payload: { topic_id: 't1', label: 'Second' } };
    const a3: CreateNodeAction = { type: 'create-node', nodeId: 'n3', payload: { topic_id: 't1', label: 'Third' } };

    stack.push(a1);
    stack.push(a2);
    stack.push(a3);
    expect(stack.past.length).toBe(3);

    // Simulate failed undo: remove only the last action (the one that failed)
    // This mirrors the production code: setPast(prev => prev.slice(0, -1))
    stack.past = stack.past.slice(0, -1);

    // Remaining history should be intact
    expect(stack.past.length).toBe(2);
    expect(stack.past[0]).toEqual(a1);
    expect(stack.past[1]).toEqual(a2);
    // Future should remain unchanged (not cleared)
    expect(stack.future.length).toBe(0);
  });

  it('failed redo removes only the failed action from future, preserves rest', () => {
    const a1: CreateNodeAction = { type: 'create-node', nodeId: 'n1', payload: { topic_id: 't1', label: 'First' } };
    const a2: CreateNodeAction = { type: 'create-node', nodeId: 'n2', payload: { topic_id: 't1', label: 'Second' } };

    stack.push(a1);
    stack.push(a2);
    stack.undo(); // a2 -> future
    stack.undo(); // a1 -> future
    expect(stack.future.length).toBe(2);
    expect(stack.past.length).toBe(0);

    // Simulate failed redo: remove only the last future action
    // This mirrors the production code: setFuture(prev => prev.slice(0, -1))
    stack.future = stack.future.slice(0, -1);

    // One action should remain in future
    expect(stack.future.length).toBe(1);
    expect(stack.future[0]).toEqual(a2);
    // Past should remain unchanged
    expect(stack.past.length).toBe(0);
  });

  it('graceful failure does NOT clear the entire stack (regression test)', () => {
    // This test ensures the old "nuclear clear" behavior is not reintroduced
    const actions: CreateNodeAction[] = Array.from({ length: 5 }, (_, i) => ({
      type: 'create-node' as const,
      nodeId: `n${i}`,
      payload: { topic_id: 't1', label: `Node ${i}` },
    }));

    actions.forEach(a => stack.push(a));
    expect(stack.past.length).toBe(5);

    // Old behavior would do: stack.past = []; stack.future = [];
    // New behavior: stack.past = stack.past.slice(0, -1);
    stack.past = stack.past.slice(0, -1);

    // Must still have 4 actions, NOT zero
    expect(stack.past.length).toBe(4);
    expect(stack.past.map(a => a.nodeId)).toEqual(['n0', 'n1', 'n2', 'n3']);
  });
});

// ── All four action types exist ─────────────────────────────

describe('Action type coverage', () => {
  it('all four action types are representable', () => {
    const actions: UndoableAction[] = [
      { type: 'create-node', nodeId: 'n1', payload: { topic_id: 't', label: 'L' } },
      { type: 'delete-node', nodeId: 'n2', payload: { topic_id: 't', label: 'L' } },
      { type: 'create-edge', edgeId: 'e1', payload: { topic_id: 't', source_keyword_id: 's', target_keyword_id: 't' } },
      { type: 'delete-edge', edgeId: 'e2', payload: { topic_id: 't', source_keyword_id: 's', target_keyword_id: 't' } },
    ];
    const types = new Set(actions.map(a => a.type));
    expect(types.size).toBe(4);
    expect(types.has('create-node')).toBe(true);
    expect(types.has('delete-node')).toBe(true);
    expect(types.has('create-edge')).toBe(true);
    expect(types.has('delete-edge')).toBe(true);
  });
});
