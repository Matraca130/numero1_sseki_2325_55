// ============================================================
// Axon — KnowledgeGraph (G6 Canvas Component)
//
// Core graph visualization using @antv/g6.
// Renders keyword nodes with mastery colors and connection edges.
//
// Features:
//   - Force-directed layout with mind-map option
//   - Mastery-colored nodes (green/yellow/red/gray)
//   - Connection type colored edges
//   - Click → context menu
//   - Double-click → collapse/expand branch (XMind-style)
//   - Zoom/pan with smooth animations
//   - Keyboard shortcuts (+/- zoom, Esc deselect)
//   - Hover tooltips with definition
//   - Responsive container
// ============================================================

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Graph } from '@antv/g6';
import type { GraphData, MapNode } from '@/app/types/mindmap';
import { MASTERY_HEX, MASTERY_HEX_LIGHT, CONNECTION_TYPE_MAP } from '@/app/types/mindmap';
import type { MasteryColor } from '@/app/lib/mastery-helpers';

// ── Types ───────────────────────────────────────────────────

/** Imperative controls exposed via onReady callback */
export interface GraphControls {
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;
  collapseAll: () => void;
  expandAll: () => void;
}

interface KnowledgeGraphProps {
  data: GraphData;
  onNodeClick?: (node: MapNode | null) => void;
  onNodeRightClick?: (node: MapNode, position: { x: number; y: number }) => void;
  selectedNodeId?: string | null;
  layout?: 'force' | 'radial' | 'dagre';
  className?: string;
  /** Called when the graph is ready, exposes zoom/fitView/collapse controls */
  onReady?: (controls: GraphControls) => void;
  /** Set of node IDs that match the current search query — highlighted with glow, others dimmed */
  highlightNodeIds?: Set<string>;
  /** Called when collapsed node count changes */
  onCollapseChange?: (collapsedCount: number) => void;
}

// ── Node style helpers ──────────────────────────────────────

function getNodeFill(masteryColor: MasteryColor): string {
  return MASTERY_HEX_LIGHT[masteryColor];
}

function getNodeStroke(masteryColor: MasteryColor): string {
  return MASTERY_HEX[masteryColor];
}

function getEdgeColor(connectionType?: string): string {
  if (!connectionType) return '#d1d5db';
  const meta = CONNECTION_TYPE_MAP.get(connectionType);
  return meta?.color || '#d1d5db';
}

// ── HTML escape for tooltip content (prevent XSS) ───────────

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Truncate label for display ──────────────────────────────

function truncateLabel(label: string, maxLen = 20): string {
  if (label.length <= maxLen) return label;
  return label.slice(0, maxLen - 1) + '\u2026';
}

// ── Collapse helpers ─────────────────────────────────────────

/**
 * Build a map of nodeId → direct child node IDs based on directed edges.
 */
function buildChildrenMap(edges: GraphData['edges']): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const edge of edges) {
    if (!map.has(edge.source)) map.set(edge.source, []);
    map.get(edge.source)!.push(edge.target);
  }
  return map;
}

/**
 * For a set of collapsed node IDs, compute which nodes should be hidden.
 * BFS from root nodes; stop traversal at collapsed nodes so their
 * descendants never enter the visible set.
 */
function computeHiddenNodes(
  nodes: GraphData['nodes'],
  edges: GraphData['edges'],
  collapsedNodes: Set<string>,
  prebuiltChildrenMap?: Map<string, string[]>,
): Set<string> {
  if (collapsedNodes.size === 0) return new Set();

  const cm = prebuiltChildrenMap || buildChildrenMap(edges);

  // Root nodes: no incoming edges
  const hasIncoming = new Set<string>();
  for (const edge of edges) hasIncoming.add(edge.target);
  const roots = nodes.map(n => n.id).filter(id => !hasIncoming.has(id));
  const seeds = roots.length > 0 ? roots : nodes.map(n => n.id);

  const visible = new Set<string>();
  const queue = [...seeds];
  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    if (visible.has(id)) continue;
    visible.add(id);
    // Do not traverse beyond collapsed nodes
    if (collapsedNodes.has(id)) continue;
    for (const child of (cm.get(id) || [])) {
      if (!visible.has(child)) queue.push(child);
    }
  }

  const hidden = new Set<string>();
  for (const node of nodes) {
    if (!visible.has(node.id)) hidden.add(node.id);
  }
  return hidden;
}

// ── Component ───────────────────────────────────────────────

export function KnowledgeGraph({
  data,
  onNodeClick,
  onNodeRightClick,
  selectedNodeId,
  layout = 'force',
  className = '',
  onReady,
  highlightNodeIds,
  onCollapseChange,
}: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const mountedRef = useRef(true);
  const [ready, setReady] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showMobileHint, setShowMobileHint] = useState(true);

  // Track mount state to guard async callbacks
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Auto-dismiss mobile hint after 4 seconds
  useEffect(() => {
    if (!ready || !showMobileHint) return;
    const t = setTimeout(() => setShowMobileHint(false), 4000);
    return () => clearTimeout(t);
  }, [ready, showMobileHint]);

  // Memoize children map to avoid O(N*E) per draw — only depends on edges
  const childrenMap = useMemo(() => buildChildrenMap(data.edges), [data.edges]);

  // Transform Axon data → G6 format, respecting collapsed and highlight state
  const g6Data = useCallback((collapsed: Set<string>) => {
    const hasHighlight = highlightNodeIds && highlightNodeIds.size > 0;
    const hidden = computeHiddenNodes(data.nodes, data.edges, collapsed, childrenMap);

    const nodes = data.nodes
      .filter(node => !hidden.has(node.id))
      .map((node) => {
        const isHighlighted = hasHighlight && highlightNodeIds!.has(node.id);
        const isDimmed = hasHighlight && !isHighlighted;
        const strokeColor = getNodeStroke(node.masteryColor);
        const isCollapsed = collapsed.has(node.id);
        const childCount = childrenMap.get(node.id)?.length ?? 0;
        const baseLabel = truncateLabel(node.label);
        const displayLabel = isCollapsed && childCount > 0
          ? baseLabel + ` (+${childCount})`
          : baseLabel;

        return {
          id: node.id,
          data: {
            label: displayLabel,
            fullLabel: node.label,
            definition: node.definition,
            mastery: node.mastery,
            masteryColor: node.masteryColor,
            type: node.type,
            summaryId: node.summaryId,
            topicId: node.topicId,
            flashcardCount: node.flashcardCount,
            quizCount: node.quizCount,
            annotation: node.annotation,
            _raw: node,
          },
          style: {
            fill: node.isUserCreated ? '#f0fdf9' : getNodeFill(node.masteryColor),
            stroke: node.isUserCreated ? '#2a8c7a' : strokeColor,
            lineWidth: isHighlighted ? 3 : isCollapsed ? 2.5 : node.isUserCreated ? 2 : 1.5,
            lineDash: isCollapsed ? [4, 4] : node.isUserCreated ? [6, 3] : undefined,
            shadowColor: isHighlighted ? strokeColor : 'transparent',
            shadowBlur: isHighlighted ? 10 : 0,
            opacity: isDimmed ? 0.35 : 1,
            labelText: displayLabel,
            labelFill: isDimmed ? '#9ca3af' : '#111827',
            labelFontSize: 12,
            labelFontFamily: 'Inter, sans-serif',
            size: Math.max(32, Math.min(56, 32 + (node.mastery >= 0 ? node.mastery * 24 : 0))),
          },
        };
      });

    const edges = data.edges
      .filter(edge => !hidden.has(edge.source) && !hidden.has(edge.target))
      .map((edge) => {
        const edgeHighlighted =
          hasHighlight &&
          highlightNodeIds!.has(edge.source) &&
          highlightNodeIds!.has(edge.target);
        const edgeDimmed = hasHighlight && !edgeHighlighted;

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          data: {
            label: edge.label,
            connectionType: edge.connectionType,
            _raw: edge,
          },
          style: {
            stroke: edge.isUserCreated ? '#2a8c7a' : getEdgeColor(edge.connectionType),
            lineWidth: edge.isUserCreated ? 2 : 1.5,
            lineDash: edge.isUserCreated ? [6, 3] : undefined,
            opacity: edgeDimmed ? 0.2 : 1,
            endArrow: !!edge.sourceKeywordId,
            labelText: edge.label || undefined,
            labelFill: edge.label ? '#6b7280' : undefined,
            labelFontSize: edge.label ? 10 : undefined,
            labelFontFamily: edge.label ? 'Inter, sans-serif' : undefined,
            labelBackground: !!edge.label,
            labelBackgroundFill: edge.label ? '#ffffff' : undefined,
            labelBackgroundOpacity: edge.label ? 0.85 : undefined,
            labelBackgroundRadius: edge.label ? 4 : undefined,
          },
        };
      });

    return { nodes, edges };
  }, [data, highlightNodeIds, childrenMap]);

  // Layout config
  const getLayoutConfig = useCallback(() => {
    switch (layout) {
      case 'radial':
        return {
          type: 'radial' as const,
          unitRadius: 120,
          preventOverlap: true,
          nodeSize: 50,
        };
      case 'dagre':
        return {
          type: 'dagre' as const,
          rankdir: 'TB',
          nodesep: 40,
          ranksep: 60,
        };
      case 'force':
      default:
        return {
          type: 'd3-force' as const,
          preventOverlap: true,
          nodeSize: 50,
          linkDistance: 150,
          nodeStrength: -200,
          collideStrength: 0.8,
        };
    }
  }, [layout]);

  // Reset collapsed nodes when the underlying data set changes (e.g. topic switch)
  const prevNodeSetRef = useRef('');
  const nodeSetKey = useMemo(
    () => data.nodes.map(n => n.id).sort().join(','),
    [data.nodes],
  );
  useEffect(() => {
    if (prevNodeSetRef.current && prevNodeSetRef.current !== nodeSetKey) {
      setCollapsedNodes(new Set());
      onCollapseChange?.(0);
    }
    prevNodeSetRef.current = nodeSetKey;
  }, [nodeSetKey, onCollapseChange]);

  // Stable identity key for data+layout to avoid unnecessary graph recreations
  const dataKey = useRef('');
  const currentDataKey = useMemo(
    () => layout + ':' + nodeSetKey + '|' + data.edges.map(e => e.id).sort().join(','),
    [layout, nodeSetKey, data.edges],
  );

  // Stable refs so collapseAll/expandAll in onReady always use latest state
  const collapseAllRef = useRef<() => void>(() => {});
  const expandAllRef = useRef<() => void>(() => {});

  collapseAllRef.current = () => {
    const nodesWithChildren = new Set(data.edges.map(e => e.source).filter(Boolean));
    setCollapsedNodes(nodesWithChildren);
    onCollapseChange?.(nodesWithChildren.size);
  };
  expandAllRef.current = () => {
    setCollapsedNodes(new Set());
    onCollapseChange?.(0);
  };

  // Guard: skip first update-data effect after graph init (render already drew)
  const justInitializedRef = useRef(false);

  // Initialize graph
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Skip if same data structure and same layout
    if (graphRef.current && dataKey.current === currentDataKey) return;
    dataKey.current = currentDataKey;

    // Destroy previous instance
    if (graphRef.current) {
      graphRef.current.destroy();
      graphRef.current = null;
    }

    if (data.nodes.length === 0) {
      setReady(true);
      return;
    }

    const graph = new Graph({
      container,
      autoFit: 'view',
      padding: [40, 40, 40, 40],
      node: {
        type: 'circle',
        style: {
          labelPlacement: 'bottom',
          labelMaxWidth: 100,
        },
        state: {
          hover: {
            lineWidth: 2.5,
            shadowBlur: 8,
          },
          selected: {
            lineWidth: 3,
            shadowBlur: 12,
          },
        },
      },
      edge: {
        type: 'line',
        style: {
          labelPlacement: 'center',
        },
      },
      layout: getLayoutConfig(),
      behaviors: [
        'drag-canvas',
        'zoom-canvas',
        'drag-element',
        {
          type: 'hover-activate',
          degree: 1,
        },
      ],
      plugins: [
        {
          type: 'tooltip',
          key: 'node-tooltip',
          trigger: 'hover',
          getContent: (_evt: any, items: any[]) => {
            if (!items?.length) return '';
            const item = items[0];
            const d = item?.data ?? {};
            const label = escHtml(d.fullLabel || d.label || '');
            const rawDef = d.definition || '';
            const def = escHtml(rawDef.length > 120 ? rawDef.slice(0, 117) + '\u2026' : rawDef);
            const mastery = d.mastery ?? -1;
            const pct = mastery >= 0 ? `${Math.round(mastery * 100)}%` : 'Sem dados';
            const rawAnnotation = d.annotation || '';
            const annotation = escHtml(rawAnnotation.length > 80 ? rawAnnotation.slice(0, 77) + '\u2026' : rawAnnotation);
            return `<div style="max-width:220px;font-family:Inter,sans-serif">
              <div style="font-weight:600;font-size:12px;color:#111827;margin-bottom:2px;font-family:Georgia,serif">${label}</div>
              ${def ? `<div style="font-size:11px;color:#6b7280;margin-bottom:3px">${def}</div>` : ''}
              <div style="font-size:10px;color:#9ca3af">Dom&iacute;nio: ${pct}</div>
              ${annotation ? `<div style="font-size:10px;color:#2a8c7a;font-style:italic;margin-top:2px">&ldquo;${annotation}&rdquo;</div>` : ''}
            </div>`;
          },
          itemTypes: ['node'],
          style: {
            '.tooltip': {
              'background-color': 'white',
              'border-radius': '10px',
              'box-shadow': '0 4px 16px rgba(0,0,0,0.1)',
              'border': '1px solid #e5e7eb',
              'padding': '8px 12px',
            },
          },
        },
      ],
      animation: true,
    });

    graphRef.current = graph;

    // Set data and render (pass empty collapsed set on initial render)
    justInitializedRef.current = true;
    graph.setData(g6Data(new Set()));
    graph.render().then(() => {
      // Guard: if component unmounted or graph replaced before render finished, skip
      if (!mountedRef.current || graphRef.current !== graph) return;
      setReady(true);
      onReady?.({
        zoomIn: () => { try { graph.zoomBy(1.25, { duration: 200 }); } catch { /* graph may be destroyed */ } },
        zoomOut: () => { try { graph.zoomBy(0.8, { duration: 200 }); } catch { /* graph may be destroyed */ } },
        fitView: () => { try { graph.fitView(); } catch { /* graph may be destroyed */ } },
        collapseAll: () => collapseAllRef.current(),
        expandAll: () => expandAllRef.current(),
      });
    }).catch(() => { /* G6 render may fail if destroyed during layout */ });

    return () => {
      graph.destroy();
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDataKey, layout]);

  // ResizeObserver: auto-resize graph when container dimensions change
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !ready) return;

    const ro = new ResizeObserver(() => {
      const g = graphRef.current; // always use latest ref
      if (!g) return;
      try {
        const { width, height } = container.getBoundingClientRect();
        if (width > 0 && height > 0) {
          g.resize(width, height);
        }
      } catch {
        // graph may be destroyed during unmount
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [ready]);

  // Update data when it changes or collapsed set changes (without destroying graph)
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !ready || data.nodes.length === 0) return;

    // Skip the first run right after graph init — render() already drew
    if (justInitializedRef.current) {
      justInitializedRef.current = false;
      return;
    }

    graph.setData(g6Data(collapsedNodes));
    graph.draw();
  }, [g6Data, ready, data, collapsedNodes]);

  // Highlight selected node — O(1): only updates prev + current node
  const prevSelectedRef = useRef<string | null>(null);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !ready) return;

    const prev = prevSelectedRef.current;
    const curr = selectedNodeId ?? null;
    prevSelectedRef.current = curr;

    // Skip if nothing changed
    if (prev === curr) return;

    const updates: { id: string; style: Record<string, unknown> }[] = [];

    // Deselect previous
    if (prev) {
      const prevNode = data.nodes.find(n => n.id === prev);
      if (prevNode) {
        updates.push({
          id: prev,
          style: { shadowColor: 'transparent', shadowBlur: 0 },
        });
      }
    }

    // Select current
    if (curr) {
      const currNode = data.nodes.find(n => n.id === curr);
      if (currNode) {
        updates.push({
          id: curr,
          style: {
            shadowColor: getNodeStroke(currNode.masteryColor),
            shadowBlur: 12,
          },
        });
      }
    }

    if (updates.length > 0) {
      try {
        graph.updateNodeData(updates);
        graph.draw();
      } catch {
        // Graph may be destroyed during transition
      }
    }
  }, [selectedNodeId, ready, data.nodes]);

  // Event handlers (click, right-click, double-click to collapse/expand)
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !ready) return;

    let longPressTriggered = false;

    const handleNodeClick = (evt: any) => {
      if (longPressTriggered) { longPressTriggered = false; return; }
      const nodeId = evt.target?.id ?? evt.itemId;
      if (!nodeId) return;
      const nodeData = graph.getNodeData(nodeId);
      if (nodeData && onNodeClick) {
        onNodeClick(nodeData.data._raw as MapNode);
      }
    };

    const handleNodeContextMenu = (evt: any) => {
      evt.preventDefault?.();
      const nodeId = evt.target?.id ?? evt.itemId;
      if (!nodeId) return;
      const nodeData = graph.getNodeData(nodeId);
      if (nodeData && onNodeRightClick) {
        const { client } = evt;
        onNodeRightClick(nodeData.data._raw as MapNode, {
          x: client?.x ?? evt.clientX ?? 0,
          y: client?.y ?? evt.clientY ?? 0,
        });
      }
    };

    const handleNodeDblClick = (evt: any) => {
      const nodeId: string = evt.target?.id ?? evt.itemId;
      if (!nodeId) return;
      // Skip collapse on leaf nodes (no children)
      const hasChildren = (childrenMap.get(nodeId)?.length ?? 0) > 0;
      if (!hasChildren) return;
      setCollapsedNodes(prev => {
        const next = new Set(prev);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        onCollapseChange?.(next.size);
        return next;
      });
    };

    const handleCanvasClick = () => {
      // Deselect node when clicking on empty canvas
      onNodeClick?.(null);
      setShowShortcuts(false);
    };

    graph.on('node:click', handleNodeClick);
    graph.on('node:contextmenu', handleNodeContextMenu);
    graph.on('node:dblclick', handleNodeDblClick);
    graph.on('canvas:click', handleCanvasClick);

    // Long-press for mobile context menu (500ms threshold)
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;

    const handleNodePointerDown = (evt: any) => {
      longPressTriggered = false;
      longPressTimer = setTimeout(() => {
        longPressTriggered = true;
        handleNodeContextMenu(evt);
      }, 500);
    };
    const handleNodePointerUp = () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    };
    const handleNodePointerLeave = () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    };

    graph.on('node:pointerdown', handleNodePointerDown);
    graph.on('node:pointerup', handleNodePointerUp);
    graph.on('node:pointerleave', handleNodePointerLeave);

    return () => {
      graph.off('node:click', handleNodeClick);
      graph.off('node:contextmenu', handleNodeContextMenu);
      graph.off('node:dblclick', handleNodeDblClick);
      graph.off('canvas:click', handleCanvasClick);
      graph.off('node:pointerdown', handleNodePointerDown);
      graph.off('node:pointerup', handleNodePointerUp);
      graph.off('node:pointerleave', handleNodePointerLeave);
      if (longPressTimer) clearTimeout(longPressTimer);
    };
  }, [ready, onNodeClick, onNodeRightClick, onCollapseChange, childrenMap]);

  // Keyboard shortcuts
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !ready) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      try {
        if (e.key === '=' || e.key === '+') {
          graph.zoomBy(1.25, { duration: 200 });
        } else if (e.key === '-') {
          graph.zoomBy(0.8, { duration: 200 });
        } else if (e.key === '0' || e.key === 'f') {
          graph.fitView();
        } else if (e.key === 'Escape') {
          onNodeClick?.(null);
        } else if (e.key === '[' && e.ctrlKey) {
          e.preventDefault();
          collapseAllRef.current();
        } else if (e.key === ']' && e.ctrlKey) {
          e.preventDefault();
          expandAllRef.current();
        } else if (e.key === '?') {
          setShowShortcuts(v => !v);
        }
      } catch {
        // graph may be in transition
      }
    };

    const container = containerRef.current;
    container?.addEventListener('keydown', handleKeyDown);
    return () => container?.removeEventListener('keydown', handleKeyDown);
  }, [ready, onNodeClick]);

  const collapsedCount = collapsedNodes.size;

  return (
    <div className={`relative w-full h-full min-h-[280px] sm:min-h-[400px] ${className}`}>
      <div
        ref={containerRef}
        className="w-full h-full bg-white rounded-2xl shadow-sm border border-gray-200 outline-none"
        style={{ touchAction: 'none' }}
        tabIndex={0}
        role="application"
        aria-label="Mapa de conhecimento interativo. Use + e - para zoom, 0 para ajustar vista, duplo-clique em um nodo para recolher/expandir ramos. Ctrl+[ recolhe todos, Ctrl+] expande todos."
        aria-roledescription="grafo de conhecimento"
        aria-busy={!ready}
      />
      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {collapsedCount > 0
          ? `${collapsedCount} nodos recolhidos`
          : ready ? 'Todos os nodos expandidos' : ''}
      </div>
      {/* Mobile hint overlay — auto-dismisses after 4s */}
      {ready && showMobileHint && data.nodes.length > 5 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 sm:hidden pointer-events-none transition-opacity duration-500">
          <p className="text-[10px] text-gray-400 bg-white/90 px-2 py-1 rounded-full shadow-sm border border-gray-100">
            Arraste para mover · Pinça para zoom · Segure para menu
          </p>
        </div>
      )}
      {/* Desktop: press ? for shortcut hint */}
      {ready && !showShortcuts && (
        <div className="absolute bottom-2 left-2 hidden sm:flex items-center gap-2 pointer-events-none">
          <p className="text-[10px] text-gray-300 bg-white/80 px-1.5 py-0.5 rounded">
            ? atalhos
          </p>
          <p className="text-[10px] text-gray-300 bg-white/80 px-1.5 py-0.5 rounded">
            / buscar
          </p>
        </div>
      )}
      {/* Keyboard shortcut help overlay */}
      {showShortcuts && (
        <div
          className="absolute top-3 right-3 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-10 text-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-700" style={{ fontFamily: 'Georgia, serif' }}>
              Atalhos
            </span>
            <button
              onClick={() => setShowShortcuts(false)}
              className="text-gray-400 hover:text-gray-600 p-0.5"
              aria-label="Fechar atalhos"
            >
              &times;
            </button>
          </div>
          <div className="space-y-1 text-gray-500">
            {[
              ['+/-', 'Zoom'],
              ['0 ou F', 'Ajustar vista'],
              ['/ ou Ctrl+F', 'Buscar conceito'],
              ['Duplo-clique', 'Recolher/expandir'],
              ['Ctrl+[', 'Recolher todos'],
              ['Ctrl+]', 'Expandir todos'],
              ['Esc', 'Desmarcar'],
              ['?', 'Esta ajuda'],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono text-gray-600 min-w-[60px] text-center">
                  {key}
                </kbd>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
