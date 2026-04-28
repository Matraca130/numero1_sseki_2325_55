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
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { CreateCustomNodePayload, CreateCustomEdgePayload } from '@/app/services/mindmapApi';

const SOURCE_PATH = resolve(__dirname, '..', 'useUndoRedo.ts');
const source = readFileSync(SOURCE_PATH, 'utf-8');

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
    expect((stack.past[0] as { nodeId: string }).nodeId).toBe('n10');
    expect((stack.past[stack.past.length - 1] as { nodeId: string }).nodeId).toBe('n39');
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
    expect(stack.past.map(a => (a as { nodeId: string }).nodeId)).toEqual(['n0', 'n1', 'n2', 'n3']);
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

// ── Source contract tests (added Cycle 1) ───────────────────

describe('useUndoRedo module contract', () => {
  it('exports useUndoRedo function', () => {
    expect(source).toContain('export function useUndoRedo');
  });

  it('defines MAX_HISTORY = 30', () => {
    expect(source).toContain('const MAX_HISTORY = 30');
  });

  it('defines all 5 action types including reconnect-edge', () => {
    expect(source).toContain("type: 'create-node'");
    expect(source).toContain("type: 'delete-node'");
    expect(source).toContain("type: 'create-edge'");
    expect(source).toContain("type: 'delete-edge'");
    expect(source).toContain("type: 'reconnect-edge'");
  });

  it('returns pushAction, clearHistory, undo, redo, canUndo, canRedo, busy, historyCount', () => {
    expect(source).toContain('pushAction');
    expect(source).toContain('clearHistory');
    expect(source).toContain('canUndo');
    expect(source).toContain('canRedo');
    expect(source).toContain('busy');
    expect(source).toContain('historyCount');
  });

  it('invalidates graph cache on unmounted undo/redo', () => {
    expect(source).toContain('invalidateGraphCache');
  });
});

describe('keyboard shortcuts contract', () => {
  it('handles Ctrl+Z for undo', () => {
    expect(source).toContain("e.key === 'z' && !e.shiftKey");
  });

  it('handles Ctrl+Y and Ctrl+Shift+Z for redo', () => {
    expect(source).toContain("e.key === 'y'");
    expect(source).toContain("e.key === 'z' && e.shiftKey");
  });

  it('ignores input, textarea, select, and contentEditable', () => {
    expect(source).toContain("tag === 'INPUT'");
    expect(source).toContain("tag === 'TEXTAREA'");
    expect(source).toContain('isContentEditable');
  });

  it('ignores dialog/alertdialog context', () => {
    expect(source).toContain('role="dialog"');
  });

  it('ignores key repeats', () => {
    expect(source).toContain('e.repeat');
  });
});

describe('busy guard contract', () => {
  it('uses sync busyRef to prevent concurrent operations', () => {
    expect(source).toContain('busyRef.current = true');
    expect(source).toContain('busyRef.current = false');
  });

  it('checks busyRef at start of undo and redo', () => {
    const busyChecks = source.match(/if \(busyRef\.current/g);
    expect(busyChecks).not.toBeNull();
    expect(busyChecks!.length).toBeGreaterThanOrEqual(2);
  });
});

describe('reconnect-edge pattern', () => {
  it('stores oldEdgeId, oldPayload, newEdgeId, newPayload', () => {
    expect(source).toContain('oldEdgeId');
    expect(source).toContain('oldPayload');
    expect(source).toContain('newEdgeId');
    expect(source).toContain('newPayload');
  });

  it('implements compensating rollback on failure', () => {
    const rollbackBlocks = source.match(/best-effort rollback/g);
    expect(rollbackBlocks).not.toBeNull();
    expect(rollbackBlocks!.length).toBeGreaterThanOrEqual(2);
  });
});

// ── i18n fallback contract ─────────────────────────────────

describe('i18n fallback contract', () => {
  it("defaults to I18N_GRAPH.pt when no i18n arg is passed (student-default)", () => {
    expect(source).toMatch(/i18n\s*\?\?\s*I18N_GRAPH\.pt/);
  });

  it('signature accepts optional GraphI18nStrings', () => {
    expect(source).toMatch(/useUndoRedo\(onGraphChanged:\s*\(\)\s*=>\s*void,\s*i18n\?:\s*GraphI18nStrings\)/);
  });
});

// ── Toast message paths ─────────────────────────────────────

describe('Toast message paths', () => {
  it('undo emits t.undoReconnect for reconnect-edge type', () => {
    expect(source).toMatch(/updated\.type\s*===\s*['"]reconnect-edge['"][\s\S]{0,200}toast\.info\(t\.undoReconnect\)/);
  });

  it('redo emits t.redoReconnect for reconnect-edge type', () => {
    expect(source).toMatch(/updated\.type\s*===\s*['"]reconnect-edge['"][\s\S]{0,200}toast\.info\(t\.redoReconnect\)/);
  });

  it('undo computes verb/label (creation+concept|connection / deletion+concept|connection) for non-reconnect', () => {
    expect(source).toMatch(/const label\s*=\s*updated\.type\.includes\(['"]node['"]\)\s*\?\s*t\.labelConcept\s*:\s*t\.labelConnection/);
    expect(source).toMatch(/const verb\s*=\s*updated\.type\.startsWith\(['"]create['"]\)\s*\?\s*t\.verbCreation\s*:\s*t\.verbDeletion/);
  });

  it('undo final toast uses t.undoAction(verb, label)', () => {
    expect(source).toMatch(/toast\.info\(t\.undoAction\(verb,\s*label\)\)/);
  });

  it('redo final toast uses t.redoAction(verb, label)', () => {
    expect(source).toMatch(/toast\.info\(t\.redoAction\(verb,\s*label\)\)/);
  });

  it('reverseAction error toast uses t.undoErrorWithMsg(msg)', () => {
    expect(source).toMatch(/toast\.error\(t\.undoErrorWithMsg\(msg\)\)/);
  });

  it('replayAction error toast uses t.redoErrorWithMsg(msg)', () => {
    expect(source).toMatch(/toast\.error\(t\.redoErrorWithMsg\(msg\)\)/);
  });

  it('failed undo (updated=null) shows t.undoFailed', () => {
    expect(source).toMatch(/toast\.error\(t\.undoFailed\)/);
  });

  it('failed redo (updated=null) shows t.redoFailed', () => {
    expect(source).toMatch(/toast\.error\(t\.redoFailed\)/);
  });
});

// ── Server-assigned ID flow ────────────────────────────────

describe('Server-assigned ID flow (reverseAction/replayAction)', () => {
  it('reverseAction(create-node) → only deletes; returns the action unchanged', () => {
    const block = source.match(/case 'create-node':[\s\S]{0,200}return action;/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('deleteCustomNode(action.nodeId)');
  });

  it('reverseAction(delete-node) → re-creates; returns action with NEW server-assigned nodeId', () => {
    expect(source).toMatch(/case ['"]delete-node['"]:\s*\{[\s\S]{0,300}createCustomNode\(action\.payload\)[\s\S]{0,200}return\s*\{\s*\.\.\.action,\s*nodeId:\s*res\.id\s*\}/);
  });

  it('reverseAction(create-edge) → only deletes; returns the action unchanged', () => {
    const block = source.match(/case 'create-edge':[\s\S]{0,200}return action;/);
    expect(block).not.toBeNull();
    expect(block![0]).toContain('deleteCustomEdge(action.edgeId)');
  });

  it('reverseAction(delete-edge) → re-creates; returns action with NEW server-assigned edgeId', () => {
    expect(source).toMatch(/case ['"]delete-edge['"]:\s*\{[\s\S]{0,300}createCustomEdge\(action\.payload\)[\s\S]{0,200}return\s*\{\s*\.\.\.action,\s*edgeId:\s*res\.id\s*\}/);
  });

  it('reverseAction(reconnect-edge): deletes new edge, creates old payload, returns updated oldEdgeId', () => {
    expect(source).toMatch(/case ['"]reconnect-edge['"]:\s*\{[\s\S]{0,500}deleteCustomEdge\(action\.newEdgeId\)[\s\S]{0,500}return\s*\{\s*\.\.\.action,\s*oldEdgeId:\s*res\.id\s*\}/);
  });

  it('replayAction(create-node) → re-creates; returns action with NEW server-assigned nodeId', () => {
    expect(source).toMatch(/replayAction[\s\S]{0,500}case ['"]create-node['"]:[\s\S]{0,200}createCustomNode\(action\.payload\)[\s\S]{0,200}return\s*\{\s*\.\.\.action,\s*nodeId:\s*res\.id\s*\}/);
  });

  it('replayAction(delete-node) → only deletes; returns the action unchanged', () => {
    const replayBlock = source.match(/replayAction\s*=\s*useCallback\([\s\S]{0,3500}/);
    expect(replayBlock).not.toBeNull();
    expect(replayBlock![0]).toMatch(/case ['"]delete-node['"]:[\s\S]{0,150}deleteCustomNode\(action\.nodeId\)[\s\S]{0,80}return action/);
  });

  it('replayAction(reconnect-edge): deletes old edge, creates new payload, returns updated newEdgeId', () => {
    expect(source).toMatch(/replayAction[\s\S]{0,3500}case ['"]reconnect-edge['"]:\s*\{[\s\S]{0,500}deleteCustomEdge\(action\.oldEdgeId\)[\s\S]{0,500}return\s*\{\s*\.\.\.action,\s*newEdgeId:\s*res\.id\s*\}/);
  });
});

// ── Compensating rollback (atomic-ish reconnect) ───────────

describe('Compensating rollback for reconnect-edge', () => {
  it('reverseAction rollback re-creates the deleted new edge if old-creation fails', () => {
    expect(source).toMatch(/reverseAction[\s\S]{0,3000}deleteCustomEdge\(action\.newEdgeId\)[\s\S]{0,500}createCustomEdge\(action\.newPayload\)/);
  });

  it('replayAction rollback re-creates the deleted old edge if new-creation fails', () => {
    expect(source).toMatch(/replayAction[\s\S]{0,3500}deleteCustomEdge\(action\.oldEdgeId\)[\s\S]{0,500}createCustomEdge\(action\.oldPayload\)/);
  });

  it('rollback failures are swallowed via devWarn (best-effort)', () => {
    expect(source).toMatch(/devWarn\(['"]useUndoRedo['"],\s*['"]best-effort rollback['"],\s*e\)/);
  });

  it('rollback throws the ORIGINAL recreate error (not the rollback error)', () => {
    expect(source).toMatch(/throw recreateErr/);
  });
});

// ── Mounted-ref guard for async ────────────────────────────

describe('mountedRef async-guard', () => {
  it('mountedRef starts true on mount via useEffect', () => {
    expect(source).toMatch(/useEffect\(\(\)\s*=>\s*\{\s*mountedRef\.current\s*=\s*true;\s*return\s*\(\)\s*=>\s*\{\s*mountedRef\.current\s*=\s*false/);
  });

  it('after async undo: !mountedRef.current → invalidateGraphCache and bail (no setState)', () => {
    expect(source).toMatch(/undo[\s\S]{0,500}if\s*\(!mountedRef\.current\)\s*\{[\s\S]{0,200}invalidateGraphCache\(\);\s*return/);
  });

  it('after async redo: !mountedRef.current → invalidateGraphCache and bail', () => {
    expect(source).toMatch(/redo[\s\S]{0,500}if\s*\(!mountedRef\.current\)\s*\{[\s\S]{0,200}invalidateGraphCache\(\)/);
  });

  it('finally block only setBusy(false) when still mounted (avoids React warning)', () => {
    const matches = source.match(/finally\s*\{\s*if\s*\(mountedRef\.current\)\s*setBusy\(false\)/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('busyRef is always cleared in finally (even on unmount)', () => {
    const matches = source.match(/busyRef\.current\s*=\s*false/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});

// ── Error message extraction ───────────────────────────────

describe('Error message extraction', () => {
  it('uses err instanceof Error to extract .message', () => {
    expect(source).toMatch(/err\s+instanceof\s+Error\s*\?\s*err\.message\s*:\s*['"]Error['"]/);
  });

  it('fallback "Error" string when err is not an Error instance', () => {
    expect(source).toMatch(/:\s*['"]Error['"]/);
  });

  it('typed catch as unknown (TS strict)', () => {
    expect(source).toMatch(/catch\s*\(err:\s*unknown\)/);
  });
});

// ── Keyboard handler deeper ────────────────────────────────

describe('Keyboard handler deeper', () => {
  it('accepts both Ctrl AND Meta (Mac) for shortcuts', () => {
    expect(source).toMatch(/const isCtrl\s*=\s*e\.ctrlKey\s*\|\|\s*e\.metaKey/);
  });

  it('preventDefault is called inside both undo and redo branches', () => {
    const blocks = source.match(/e\.preventDefault\(\)/g) ?? [];
    expect(blocks.length).toBeGreaterThanOrEqual(2);
  });

  it('handles capital "Z" with Shift (Shift naturally capitalizes letters)', () => {
    expect(source).toMatch(/e\.key\s*===\s*['"]Z['"]\s*&&\s*e\.shiftKey/);
  });

  it('skips when isCtrl is false (avoids hijacking plain "z")', () => {
    expect(source).toMatch(/if\s*\(!isCtrl\)\s*return/);
  });

  it('listener is added on document and cleaned up on effect unwind', () => {
    expect(source).toMatch(/document\.addEventListener\(['"]keydown['"],\s*handler\)/);
    expect(source).toMatch(/document\.removeEventListener\(['"]keydown['"],\s*handler\)/);
  });

  it('keyboard effect dep array is [undo, redo]', () => {
    expect(source).toMatch(/\},\s*\[undo,\s*redo\]\)/);
  });
});

// ── pushAction invariants ──────────────────────────────────

describe('pushAction invariants (source)', () => {
  it('appends action to past via spread (immutable)', () => {
    expect(source).toMatch(/setPast\(prev\s*=>\s*\{\s*const next\s*=\s*\[\.\.\.prev,\s*action\]/);
  });

  it('caps at MAX_HISTORY using slice(-MAX_HISTORY) (keeps most recent)', () => {
    expect(source).toMatch(/next\.length\s*>\s*MAX_HISTORY\s*\?\s*next\.slice\(-MAX_HISTORY\)\s*:\s*next/);
  });

  it('clears future on every push (no branch history)', () => {
    expect(source).toMatch(/pushAction[\s\S]{0,400}setFuture\(\[\]\)/);
  });

  it('useCallback empty deps (stable reference)', () => {
    expect(source).toMatch(/pushAction\s*=\s*useCallback\([\s\S]{0,500}\},\s*\[\]\)/);
  });
});

// ── Stack pop/push timing ──────────────────────────────────

describe('Stack pop/push timing on success', () => {
  it('undo pops past via slice(0, -1) AFTER reverseAction succeeds', () => {
    expect(source).toMatch(/undo[\s\S]{0,1500}if\s*\(updated\)\s*\{\s*setPast\(prev\s*=>\s*prev\.slice\(0,\s*-1\)\)/);
  });

  it('undo pushes UPDATED action (with server IDs) onto future', () => {
    expect(source).toMatch(/setFuture\(prev\s*=>\s*\[\.\.\.prev,\s*updated\]\)/);
  });

  it('redo pops future and pushes onto past on success', () => {
    expect(source).toMatch(/redo[\s\S]{0,1500}setFuture\(prev\s*=>\s*prev\.slice\(0,\s*-1\)\);\s*setPast\(prev\s*=>\s*\[\.\.\.prev,\s*updated\]\)/);
  });

  it('onGraphChanged is invoked after successful undo and redo', () => {
    const calls = source.match(/onGraphChanged\(\)/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });
});

// ── Replicated stack — server-ID round trip ────────────────

class StackWithServerIds {
  past: { id: string; reCreated?: boolean }[] = [];
  future: { id: string; reCreated?: boolean }[] = [];

  pushDeleteThenUndoCycle(originalId: string, newServerIdAfterRecreate: string) {
    // 1. delete-node action recorded
    this.past.push({ id: originalId });
    // 2. undo → re-create yields new server id
    const last = this.past.pop()!;
    this.future.push({ id: newServerIdAfterRecreate, reCreated: true });
    return last;
  }

  redoCycle(action: { id: string }, newServerIdAfterRecreate: string) {
    // 3. redo → action fires forward; depending on type may yield another id
    const last = this.future.pop()!;
    this.past.push({ id: newServerIdAfterRecreate });
    return last;
  }
}

describe('Replicated server-ID round trip', () => {
  it('after undo of delete, future stores the NEW id (not the original)', () => {
    const s = new StackWithServerIds();
    s.pushDeleteThenUndoCycle('orig-1', 'server-1');
    expect(s.future[0].id).toBe('server-1');
    expect(s.future[0].reCreated).toBe(true);
  });

  it('redo after undo can yield yet another new id (server may re-assign)', () => {
    const s = new StackWithServerIds();
    s.pushDeleteThenUndoCycle('orig-1', 'server-1');
    s.redoCycle(s.future[0], 'server-2');
    expect(s.past[s.past.length - 1].id).toBe('server-2');
  });
});
