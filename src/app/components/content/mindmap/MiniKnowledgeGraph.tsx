// ============================================================
// Axon — MiniKnowledgeGraph (Micro-session Graph)
//
// Compact knowledge graph for embedding in quiz, flashcard,
// and summary views. Shows a local subgraph around a specific
// keyword or topic.
//
// Obsidian-inspired "local graph" — shows only direct neighbors.
// Lighter than full KnowledgeGraph: no toolbar, fixed layout.
//
// PERF: Separates graph creation (expensive) from focal-node
// style updates (cheap). Changing focalNodeId only updates
// node styles without destroying/recreating the G6 instance.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { Graph } from '@antv/g6';
import type { GraphData, MapNode } from '@/app/types/mindmap';
import { MASTERY_HEX, MASTERY_HEX_LIGHT, CONNECTION_TYPE_MAP } from '@/app/types/mindmap';

// ── Props ───────────────────────────────────────────────────

interface MiniKnowledgeGraphProps {
  /** Graph data (pre-filtered to relevant subgraph) */
  data: GraphData;
  /** ID of the focal node (highlighted) */
  focalNodeId?: string;
  /** Callback when a node is clicked */
  onNodeClick?: (node: MapNode) => void;
  /** Height of the mini graph */
  height?: number;
  /** Optional className */
  className?: string;
}

// ── Helpers ─────────────────────────────────────────────────

function truncateLabel(label: string, max = 14): string {
  return label.length > max ? label.slice(0, max - 1) + '\u2026' : label;
}

function buildNodeStyle(node: MapNode, isFocal: boolean) {
  return {
    fill: MASTERY_HEX_LIGHT[node.masteryColor],
    stroke: MASTERY_HEX[node.masteryColor],
    lineWidth: isFocal ? 3 : 1.5,
    shadowBlur: isFocal ? 10 : 0,
    shadowColor: isFocal ? MASTERY_HEX[node.masteryColor] : 'transparent',
    size: isFocal ? 40 : 28,
    labelText: truncateLabel(node.label),
    labelFill: '#111827',
    labelFontSize: 10,
    labelFontFamily: 'Inter, sans-serif',
    labelPlacement: 'bottom' as const,
  };
}

// ── Stable key for data identity ────────────────────────────

function dataKey(data: GraphData): string {
  const nodeIds = data.nodes.map(n => n.id).sort().join(',');
  const edgeIds = data.edges.map(e => e.id).sort().join(',');
  return `${nodeIds}|${edgeIds}`;
}

// ── Component ───────────────────────────────────────────────

export function MiniKnowledgeGraph({
  data,
  focalNodeId,
  onNodeClick,
  height = 200,
  className = '',
}: MiniKnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const [ready, setReady] = useState(false);
  const prevDataKeyRef = useRef<string>('');
  const justInitializedRef = useRef(false);

  // Effect 1: Create/recreate graph only when the graph STRUCTURE changes
  const currentDataKey = dataKey(data);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || data.nodes.length === 0) return;

    // Skip if same structure
    if (graphRef.current && currentDataKey === prevDataKeyRef.current) return;
    prevDataKeyRef.current = currentDataKey;

    // Destroy previous instance
    if (graphRef.current) {
      graphRef.current.destroy();
      graphRef.current = null;
      setReady(false);
    }

    const nodes = data.nodes.map((node) => ({
      id: node.id,
      data: { _raw: node },
      style: buildNodeStyle(node, node.id === focalNodeId),
    }));

    const edges = data.edges.map((edge) => {
      const meta = edge.connectionType ? CONNECTION_TYPE_MAP.get(edge.connectionType) : null;
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        style: {
          stroke: meta?.color || '#d1d5db',
          lineWidth: 1,
          endArrow: !!edge.sourceKeywordId,
        },
      };
    });

    const graph = new Graph({
      container,
      autoFit: 'view',
      padding: [16, 16, 16, 16],
      node: { type: 'circle' },
      edge: { type: 'line' },
      layout: {
        type: 'radial' as const,
        unitRadius: 60,
        preventOverlap: true,
        nodeSize: 30,
      },
      behaviors: ['zoom-canvas', 'drag-canvas'],
      animation: false,
    });

    graphRef.current = graph;
    justInitializedRef.current = true;
    graph.setData({ nodes, edges });
    graph.render()
      .then(() => setReady(true))
      .catch(() => { /* G6 render may fail if destroyed during layout */ });

    return () => {
      graph.destroy();
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDataKey]);

  // Effect 1b: ResizeObserver for container resizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !ready) return;

    const ro = new ResizeObserver(() => {
      const g = graphRef.current;
      if (!g) return;
      try {
        const { width, height: h } = container.getBoundingClientRect();
        if (width > 0 && h > 0) {
          g.resize(width, h);
        }
      } catch {
        // graph may be destroyed during unmount
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [ready]);

  // Effect 2: Update node styles when focalNodeId changes (cheap operation)
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !ready) return;

    // Skip the first run right after graph init — render() already drew
    if (justInitializedRef.current) {
      justInitializedRef.current = false;
      return;
    }

    try {
      const updates = data.nodes.map(node => ({
        id: node.id,
        style: buildNodeStyle(node, node.id === focalNodeId),
      }));
      graph.updateNodeData(updates);
      graph.draw();
    } catch {
      // Graph may have been destroyed between check and call
    }
  }, [focalNodeId, ready, data.nodes]);

  // Effect 3: Click handler
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !ready) return;

    const handler = (evt: any) => {
      const nodeId = evt.target?.id ?? evt.itemId;
      if (!nodeId) return;
      const nodeData = graph.getNodeData(nodeId);
      if (nodeData && onNodeClick) {
        onNodeClick(nodeData.data._raw as MapNode);
      }
    };

    graph.on('node:click', handler);
    return () => { graph.off('node:click', handler); };
  }, [ready, onNodeClick]);

  if (data.nodes.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className={`w-full bg-gray-50 rounded-xl border border-gray-100 ${className}`}
      style={{ height }}
      role="img"
      aria-label={`Mini mapa de conhecimento com ${data.nodes.length} conceitos`}
      aria-roledescription="grafo de conhecimento"
    />
  );
}
