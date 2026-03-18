// ============================================================
// Axon — useUndoRedo hook
//
// Command history pattern for undo/redo in the knowledge graph.
// Tracks create/delete actions on custom nodes and edges.
// Ctrl+Z = undo, Ctrl+Y / Ctrl+Shift+Z = redo.
//
// Each action stores enough data to reverse itself:
//   - create-node: undo = delete it, redo = re-create it
//   - delete-node: undo = re-create it, redo = delete it
//   - create-edge: undo = delete it, redo = re-create it
//   - delete-edge: undo = re-create it, redo = delete it
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  createCustomNode,
  deleteCustomNode,
  createCustomEdge,
  deleteCustomEdge,
} from '@/app/services/mindmapApi';
import type { CreateCustomNodePayload, CreateCustomEdgePayload } from '@/app/services/mindmapApi';

// ── Types ───────────────────────────────────────────────────

interface CreateNodeAction {
  type: 'create-node';
  nodeId: string;
  payload: CreateCustomNodePayload;
}

interface DeleteNodeAction {
  type: 'delete-node';
  nodeId: string;
  payload: CreateCustomNodePayload;
}

interface CreateEdgeAction {
  type: 'create-edge';
  edgeId: string;
  payload: CreateCustomEdgePayload;
}

interface DeleteEdgeAction {
  type: 'delete-edge';
  edgeId: string;
  payload: CreateCustomEdgePayload;
}

/** Reconnect edge: stores both the old and new edge data so it can be fully reversed */
interface ReconnectEdgeAction {
  type: 'reconnect-edge';
  /** ID of the old edge that was deleted */
  oldEdgeId: string;
  /** Payload to re-create the old edge (for undo) */
  oldPayload: CreateCustomEdgePayload;
  /** ID of the new edge that was created */
  newEdgeId: string;
  /** Payload to re-create the new edge (for redo) */
  newPayload: CreateCustomEdgePayload;
}

type UndoableAction = CreateNodeAction | DeleteNodeAction | CreateEdgeAction | DeleteEdgeAction | ReconnectEdgeAction;

const MAX_HISTORY = 30;

// ── Hook ────────────────────────────────────────────────────

export function useUndoRedo(onGraphChanged: () => void) {
  const [past, setPast] = useState<UndoableAction[]>([]);
  const [future, setFuture] = useState<UndoableAction[]>([]);
  const [busy, setBusy] = useState(false);

  // Refs to avoid stale closures in the keyboard handler
  const pastRef = useRef(past);
  const futureRef = useRef(future);
  const busyRef = useRef(busy);
  const mountedRef = useRef(true);
  pastRef.current = past;
  futureRef.current = future;
  busyRef.current = busy;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /** Push a completed action onto the undo stack */
  const pushAction = useCallback((action: UndoableAction) => {
    setPast(prev => {
      const next = [...prev, action];
      return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
    });
    setFuture([]); // new action invalidates redo stack
  }, []);

  /** Clear all history (e.g. on topic change) */
  const clearHistory = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  /** Execute the reverse of an action.
   *  Returns the (possibly updated) action — server may assign new IDs on re-create. */
  const reverseAction = useCallback(async (action: UndoableAction): Promise<UndoableAction | null> => {
    try {
      switch (action.type) {
        case 'create-node':
          await deleteCustomNode(action.nodeId);
          return action;
        case 'delete-node': {
          const res = await createCustomNode(action.payload);
          // Server assigns a new ID on re-create — update the action so redo uses the correct ID
          return { ...action, nodeId: res.id };
        }
        case 'create-edge':
          await deleteCustomEdge(action.edgeId);
          return action;
        case 'delete-edge': {
          const res = await createCustomEdge(action.payload);
          return { ...action, edgeId: res.id };
        }
        case 'reconnect-edge': {
          // Undo reconnect: delete the new edge, re-create the old edge
          await deleteCustomEdge(action.newEdgeId);
          const res = await createCustomEdge(action.oldPayload);
          return { ...action, oldEdgeId: res.id };
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(`No se pudo deshacer: ${msg}`);
      return null;
    }
  }, []);

  /** Execute the forward version of an action (for redo).
   *  Returns the (possibly updated) action — server may assign new IDs on re-create. */
  const replayAction = useCallback(async (action: UndoableAction): Promise<UndoableAction | null> => {
    try {
      switch (action.type) {
        case 'create-node': {
          const res = await createCustomNode(action.payload);
          // Return a new action with the server-assigned ID (don't mutate original)
          return { ...action, nodeId: res.id };
        }
        case 'delete-node':
          await deleteCustomNode(action.nodeId);
          return action;
        case 'create-edge': {
          const res = await createCustomEdge(action.payload);
          return { ...action, edgeId: res.id };
        }
        case 'delete-edge':
          await deleteCustomEdge(action.edgeId);
          return action;
        case 'reconnect-edge': {
          // Redo reconnect: delete the old edge, re-create the new edge
          await deleteCustomEdge(action.oldEdgeId);
          const res = await createCustomEdge(action.newPayload);
          return { ...action, newEdgeId: res.id };
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(`No se pudo rehacer: ${msg}`);
      return null;
    }
  }, []);

  const undo = useCallback(async () => {
    if (busyRef.current || pastRef.current.length === 0) return;
    setBusy(true);
    const action = pastRef.current[pastRef.current.length - 1];
    const updated = await reverseAction(action);
    if (!mountedRef.current) return; // unmounted during async
    if (updated) {
      setPast(prev => prev.slice(0, -1));
      // Push the updated action (with server-assigned IDs) onto the redo stack
      setFuture(prev => [...prev, updated]);
      onGraphChanged();
      if (updated.type === 'reconnect-edge') {
        toast.info('Deshacer: Reconexión de arista');
      } else {
        const label = updated.type.includes('node') ? 'concepto' : 'conexión';
        const verb = updated.type.startsWith('create') ? 'Creación' : 'Eliminación';
        toast.info(`Deshacer: ${verb} de ${label}`);
      }
    }
    setBusy(false);
  }, [reverseAction, onGraphChanged]);

  const redo = useCallback(async () => {
    if (busyRef.current || futureRef.current.length === 0) return;
    setBusy(true);
    const action = futureRef.current[futureRef.current.length - 1];
    const updated = await replayAction(action);
    if (!mountedRef.current) return; // unmounted during async
    if (updated) {
      setFuture(prev => prev.slice(0, -1));
      setPast(prev => [...prev, updated]);
      onGraphChanged();
      if (updated.type === 'reconnect-edge') {
        toast.info('Rehacer: Reconexión de arista');
      } else {
        const label = updated.type.includes('node') ? 'concepto' : 'conexión';
        const verb = updated.type.startsWith('create') ? 'Creación' : 'Eliminación';
        toast.info(`Rehacer: ${verb} de ${label}`);
      }
    }
    setBusy(false);
  }, [replayAction, onGraphChanged]);

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl) return;

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey) || (e.key === 'Z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return {
    pushAction,
    clearHistory,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    busy,
    historyCount: past.length,
  };
}
