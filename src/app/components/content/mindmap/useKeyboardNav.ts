// ============================================================
// Axon — useKeyboardNav
//
// Keyboard navigation hook for the KnowledgeGraph component.
// Handles:
//   - Tab: cycle focus through nodes
//   - Arrow keys: navigate to connected nodes by position
//   - Enter: trigger context menu on focused node
//   - Escape: clear focus and selection
//   - +/-/0/f: zoom controls
//   - ?: toggle shortcut help
//   - Ctrl+[/]: collapse/expand all
//   - + (when node focused): quick-add new connected node
//
// LANG: Internal (no user-facing strings)
// ============================================================

import { useEffect, useRef, useCallback, useState } from 'react';
import type { Graph } from '@antv/g6';
import type { MapNode } from '@/app/types/mindmap';

interface UseKeyboardNavOptions {
  graphRef: React.RefObject<Graph | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  ready: boolean;
  graphVersion: number;
  nodes: MapNode[];
  edges: Array<{ source: string; target: string }>;
  selectedNodeId?: string | null;
  onNodeClick?: (node: MapNode | null) => void;
  onNodeRightClick?: (node: MapNode, position: { x: number; y: number }) => void;
  onQuickAdd?: (sourceNodeId: string) => void;
  collapseAllRef: React.RefObject<() => void>;
  expandAllRef: React.RefObject<() => void>;
  multiSelectedIdsRef: React.RefObject<Set<string>>;
  updateMultiSelection: (ids: Set<string>) => void;
  setShowShortcuts: React.Dispatch<React.SetStateAction<boolean>>;
  batchDraw: () => void;
}

interface UseKeyboardNavReturn {
  focusedNodeId: string | null;
  setFocusedNodeId: React.Dispatch<React.SetStateAction<string | null>>;
  clearFocus: () => void;
}

/**
 * Get the visual position of a node in the G6 graph canvas.
 * Returns null if the node position cannot be determined.
 */
function getNodePosition(graph: Graph, nodeId: string): { x: number; y: number } | null {
  try {
    const nodeData = graph.getNodeData(nodeId);
    if (!nodeData?.style) return null;
    const { x, y } = nodeData.style as { x?: number; y?: number };
    if (typeof x === 'number' && typeof y === 'number') return { x, y };
  } catch {
    // Graph may be in transition
  }
  return null;
}

/**
 * Build a set of all node IDs connected to a given node (neighbors).
 */
function getNeighborIds(
  nodeId: string,
  edges: Array<{ source: string; target: string }>,
): string[] {
  const neighbors: string[] = [];
  for (const edge of edges) {
    if (edge.source === nodeId) neighbors.push(edge.target);
    if (edge.target === nodeId) neighbors.push(edge.source);
  }
  return neighbors;
}

/**
 * Find the best neighbor in a given direction based on angular proximity.
 * Direction angles: right=0, down=PI/2, left=PI, up=-PI/2
 */
function findNeighborInDirection(
  graph: Graph,
  currentId: string,
  neighbors: string[],
  direction: 'up' | 'down' | 'left' | 'right',
): string | null {
  const currentPos = getNodePosition(graph, currentId);
  if (!currentPos || neighbors.length === 0) return null;

  const targetAngle = {
    right: 0,
    down: Math.PI / 2,
    left: Math.PI,
    up: -Math.PI / 2,
  }[direction];

  let bestId: string | null = null;
  let bestScore = Infinity;

  for (const nId of neighbors) {
    const nPos = getNodePosition(graph, nId);
    if (!nPos) continue;

    const dx = nPos.x - currentPos.x;
    const dy = nPos.y - currentPos.y;
    const angle = Math.atan2(dy, dx);
    let angleDiff = Math.abs(angle - targetAngle);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

    // Only consider nodes roughly in the right direction (within 90 degrees)
    if (angleDiff > Math.PI / 2) continue;

    // Score: lower is better (combine angle difference and distance)
    const dist = Math.sqrt(dx * dx + dy * dy);
    const score = angleDiff * 100 + dist * 0.1;
    if (score < bestScore) {
      bestScore = score;
      bestId = nId;
    }
  }

  return bestId;
}

export function useKeyboardNav({
  graphRef,
  containerRef,
  ready,
  graphVersion,
  nodes,
  edges,
  selectedNodeId,
  onNodeClick,
  onNodeRightClick,
  onQuickAdd,
  collapseAllRef,
  expandAllRef,
  multiSelectedIdsRef,
  updateMultiSelection,
  setShowShortcuts,
  batchDraw,
}: UseKeyboardNavOptions): UseKeyboardNavReturn {
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  // Build a map of nodeId -> MapNode for quick lookup (only rebuild when nodes change)
  const nodeByIdRef = useRef(new Map<string, MapNode>());
  useEffect(() => {
    nodeByIdRef.current = new Map(nodes.map(n => [n.id, n]));
  }, [nodes]);

  // Clear focus if the focused node was removed from the graph
  useEffect(() => {
    if (focusedNodeId && !nodeByIdRef.current.has(focusedNodeId)) {
      setFocusedNodeId(null);
    }
  }, [focusedNodeId, nodes]);

  // Keep edges ref fresh
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  // Keep nodes ref fresh for Tab cycling order
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // Keep callback refs fresh — avoids effect re-registration on parent re-render
  const onQuickAddRef = useRef(onQuickAdd);
  onQuickAddRef.current = onQuickAdd;
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;
  const onNodeRightClickRef = useRef(onNodeRightClick);
  onNodeRightClickRef.current = onNodeRightClick;

  // Stable ref for focusedNodeId — avoids stale closure in clearFocus
  const focusedNodeIdRef = useRef(focusedNodeId);
  focusedNodeIdRef.current = focusedNodeId;

  // Apply focus ring visual to G6 node
  const applyFocusRing = useCallback((graph: Graph, nodeId: string | null, prevId: string | null) => {
    try {
      if (prevId) {
        // Only remove 'selected' state — preserve other states (highlight, hover, etc.)
        try {
          const currentStates = graph.getElementState(prevId);
          const filtered = Array.isArray(currentStates)
            ? currentStates.filter((s: string) => s !== 'selected')
            : [];
          graph.setElementState(prevId, filtered);
        } catch {
          // Fallback: clear all states if getElementState is unavailable
          graph.setElementState(prevId, []);
        }
      }
      if (nodeId) {
        // Merge 'selected' with existing states (preserve highlight, hover, etc.)
        try {
          const existing = graph.getElementState(nodeId);
          const states = Array.isArray(existing)
            ? [...existing.filter((s: string) => s !== 'selected'), 'selected']
            : ['selected'];
          graph.setElementState(nodeId, states);
        } catch {
          graph.setElementState(nodeId, ['selected']);
        }
        // Pan to make focused node visible
        graph.focusElements([nodeId], { animation: { duration: 200, easing: 'ease-out' } });
      }
      batchDraw();
    } catch {
      // Graph may be destroyed
    }
  }, [batchDraw]);

  const clearFocus = useCallback(() => {
    const graph = graphRef.current;
    const currentFocused = focusedNodeIdRef.current;
    if (graph && currentFocused) {
      try {
        // Only remove 'selected' state — preserve other states
        const currentStates = graph.getElementState(currentFocused);
        const filtered = Array.isArray(currentStates)
          ? currentStates.filter((s: string) => s !== 'selected')
          : [];
        graph.setElementState(currentFocused, filtered);
        batchDraw();
      } catch (e) { if (import.meta.env.DEV) console.warn("[useKeyboardNav] graph may be destroyed", e); }
    }
    setFocusedNodeId(null);
  }, [graphRef, batchDraw]);

  // Sync: when selectedNodeId changes externally, also set focus
  useEffect(() => {
    if (selectedNodeId) {
      setFocusedNodeId(selectedNodeId);
    }
  }, [selectedNodeId]);

  useEffect(() => {
    const graph = graphRef.current;
    const container = containerRef.current;
    if (!graph || !container || !ready) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea/contenteditable
      const target = e.target as HTMLElement;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (target?.isContentEditable) return;
      // Ignore if any modal/dialog is open (don't hijack keyboard inside modals)
      if (target?.closest?.('[role="dialog"], [role="alertdialog"]')) return;

      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;
      const g = graphRef.current;
      if (!g) return;

      try {
        // Read focused node from ref (avoids effect re-registration on every keystroke)
        const focused = focusedNodeIdRef.current;

        // ── Zoom/view shortcuts ──
        if (e.key === '=' || (e.key === '+' && !focused)) {
          e.preventDefault();
          g.zoomBy(1.25, { duration: 200 });
          return;
        }
        if (e.key === '-') {
          e.preventDefault();
          g.zoomBy(0.8, { duration: 200 });
          return;
        }
        if (e.key === '0' || e.key === 'f') {
          e.preventDefault();
          g.fitView();
          return;
        }

        // ── Escape: close shortcuts overlay, clear focus and selection ──
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowShortcuts(false);
          if (focused) {
            applyFocusRing(g, null, focused);
            setFocusedNodeId(null);
          }
          onNodeClickRef.current?.(null);
          if (multiSelectedIdsRef.current.size > 0) {
            updateMultiSelection(new Set());
          }
          return;
        }

        // ── Ctrl+[/]: collapse/expand all ──
        if (e.key === '[' && e.ctrlKey) {
          e.preventDefault();
          collapseAllRef.current?.();
          return;
        }
        if (e.key === ']' && e.ctrlKey) {
          e.preventDefault();
          expandAllRef.current?.();
          return;
        }

        // ── ?: toggle shortcut help ──
        if (e.key === '?') {
          e.preventDefault();
          setShowShortcuts(v => !v);
          return;
        }

        // ── Tab: cycle through nodes ──
        if (e.key === 'Tab') {
          e.preventDefault();
          if (currentNodes.length === 0) return;

          const currentIndex = focused
            ? currentNodes.findIndex(n => n.id === focused)
            : -1;

          let nextIndex: number;
          if (currentIndex === -1) {
            // No focus yet: Tab → first, Shift+Tab → last
            nextIndex = e.shiftKey ? currentNodes.length - 1 : 0;
          } else {
            const step = e.shiftKey ? -1 : 1;
            nextIndex = (currentIndex + step + currentNodes.length) % currentNodes.length;
          }
          const nextNodeId = currentNodes[nextIndex].id;

          setFocusedNodeId(nextNodeId);
          applyFocusRing(g, nextNodeId, focused);
          return;
        }

        // ── Enter: open context menu for focused node ──
        if (e.key === 'Enter' && focused) {
          e.preventDefault();
          const node = nodeByIdRef.current.get(focused);
          if (!node) return;

          // Get node position on screen for context menu placement
          const pos = getNodePosition(g, focused);
          if (pos && onNodeRightClickRef.current) {
            // Convert graph coordinates to client (screen) coordinates
            let clientX: number;
            let clientY: number;
            try {
              const clientPt = g.getClientByCanvas([pos.x, pos.y]);
              clientX = clientPt[0];
              clientY = clientPt[1];
            } catch {
              // Fallback to container center if conversion fails
              const rect = container.getBoundingClientRect();
              clientX = rect.left + rect.width / 2;
              clientY = rect.top + rect.height / 2;
            }
            onNodeRightClickRef.current(node, { x: clientX, y: clientY });
          }
          return;
        }

        // ── Arrow keys: navigate to connected nodes by direction ──
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && focused) {
          e.preventDefault();
          const dirMap: Record<string, 'up' | 'down' | 'left' | 'right'> = {
            ArrowUp: 'up',
            ArrowDown: 'down',
            ArrowLeft: 'left',
            ArrowRight: 'right',
          };
          const direction = dirMap[e.key];
          const neighbors = getNeighborIds(focused, currentEdges);
          const nextId = findNeighborInDirection(g, focused, neighbors, direction);
          if (nextId) {
            setFocusedNodeId(nextId);
            applyFocusRing(g, nextId, focused);

            // Also notify parent of selection change
            const nextNode = nodeByIdRef.current.get(nextId);
            if (nextNode) onNodeClickRef.current?.(nextNode);
          }
          return;
        }

        // ── + key: quick-add node connected to focused/selected node ──
        if (e.key === '+' && focused) {
          e.preventDefault();
          onQuickAddRef.current?.(focused);
          return;
        }
      } catch {
        // graph may be in transition
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps — onNodeClick/onNodeRightClick stabilized via refs
  }, [
    ready, graphVersion,
    graphRef, containerRef, collapseAllRef, expandAllRef,
    multiSelectedIdsRef, updateMultiSelection, setShowShortcuts, applyFocusRing,
  ]);

  return {
    focusedNodeId,
    setFocusedNodeId,
    clearFocus,
  };
}
