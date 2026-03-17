// ============================================================
// Axon — Mind Map Types
//
// Types for the knowledge graph / mind map feature.
// Consumed by:
//   - student: KnowledgeMapView (full graph + micro-sessions)
//   - professor: KnowledgeMapEditor (create/manage base maps)
//   - services: mindmapApi.ts (data fetching & transformation)
// ============================================================

import type { MasteryColor } from '@/app/lib/mastery-helpers';

// ── G6 Graph Data ───────────────────────────────────────────

/** A node in the knowledge graph (keyword or topic) */
export interface MapNode {
  id: string;
  /** Display label */
  label: string;
  /** Optional short definition for tooltip */
  definition?: string;
  /** Node category for styling/filtering */
  type: 'keyword' | 'topic' | 'subtopic';
  /** Mastery level [0-1], -1 = no data */
  mastery: number;
  /** Derived mastery color */
  masteryColor: MasteryColor;
  /** Source summary ID (for navigation) */
  summaryId?: string;
  /** Source topic ID (for navigation) */
  topicId?: string;
  /** Whether this node was created by the student (vs auto/professor) */
  isUserCreated?: boolean;
  /** Student's personal micro-annotation */
  annotation?: string;
  /** Number of flashcards available for this keyword */
  flashcardCount?: number;
  /** Number of quiz questions available */
  quizCount?: number;
}

/** Line style for custom edges */
export type EdgeLineStyle = 'solid' | 'dashed' | 'dotted';

/** An edge in the knowledge graph (connection between keywords) */
export interface MapEdge {
  id: string;
  source: string;
  target: string;
  /** Human-readable relationship label */
  label?: string;
  /** Connection type from backend (10 medical types) */
  connectionType?: string;
  /** Source keyword ID (for directional types) */
  sourceKeywordId?: string;
  /** Whether this edge was created by the student */
  isUserCreated?: boolean;
  /** Custom line style for student-created edges */
  lineStyle?: EdgeLineStyle;
  /** Custom color hex for student-created edges */
  customColor?: string;
}

/** Complete graph data for G6 */
export interface GraphData {
  nodes: MapNode[];
  edges: MapEdge[];
}

// ── Connection Type Metadata ────────────────────────────────

export interface ConnectionTypeMeta {
  key: string;
  label: string;
  labelPt: string;
  color: string;
  directed: boolean;
  icon: string;
}

/** Medical education connection types with visual metadata */
export const CONNECTION_TYPES: ConnectionTypeMeta[] = [
  { key: 'prerequisito',    label: 'Prerrequisito',      labelPt: 'Pré-requisito',        color: '#f97316', directed: true,  icon: 'ArrowRight' },
  { key: 'causa-efecto',    label: 'Causa → Efecto',     labelPt: 'Causa → Efeito',       color: '#ef4444', directed: true,  icon: 'Zap' },
  { key: 'mecanismo',       label: 'Mecanismo',          labelPt: 'Mecanismo',             color: '#8b5cf6', directed: true,  icon: 'Settings' },
  { key: 'dx-diferencial',  label: 'Dx Diferencial',     labelPt: 'Dx Diferencial',        color: '#06b6d4', directed: false, icon: 'GitBranch' },
  { key: 'tratamiento',     label: 'Tratamiento',        labelPt: 'Tratamento',            color: '#10b981', directed: true,  icon: 'Heart' },
  { key: 'manifestacion',   label: 'Manifestación',      labelPt: 'Manifestação',          color: '#f43f5e', directed: true,  icon: 'Eye' },
  { key: 'regulacion',      label: 'Regulación',         labelPt: 'Regulação',             color: '#a855f7', directed: true,  icon: 'RefreshCw' },
  { key: 'contraste',       label: 'Contraste',          labelPt: 'Contraste',             color: '#6366f1', directed: false, icon: 'ArrowLeftRight' },
  { key: 'componente',      label: 'Componente',         labelPt: 'Componente',            color: '#0ea5e9', directed: true,  icon: 'Box' },
  { key: 'asociacion',      label: 'Asociación',         labelPt: 'Associação',            color: '#64748b', directed: false, icon: 'Link' },
];

export const CONNECTION_TYPE_MAP = new Map(
  CONNECTION_TYPES.map(ct => [ct.key, ct])
);

// ── Mastery Color → Hex mapping for G6 nodes ────────────────

export const MASTERY_HEX: Record<MasteryColor, string> = {
  green:  '#10b981', // emerald-500
  yellow: '#f59e0b', // amber-500
  red:    '#ef4444', // red-500
  gray:   '#9ca3af', // gray-400
};

export const MASTERY_HEX_LIGHT: Record<MasteryColor, string> = {
  green:  '#d1fae5', // emerald-100
  yellow: '#fef3c7', // amber-100
  red:    '#fee2e2', // red-100
  gray:   '#f3f4f6', // gray-100
};

// ── Context menu action ─────────────────────────────────────

export type NodeAction = 'flashcard' | 'quiz' | 'summary' | 'annotate' | 'details';

// ── G6 Event / Controls ────────────────────────────────────

/** Lightweight G6 event shape (avoids coupling to unstable internal types) */
export interface G6NodeEvent {
  target?: { id?: string };
  itemId?: string;
  client?: { x: number; y: number };
  clientX?: number;
  clientY?: number;
  preventDefault?: () => void;
}

/** Imperative controls exposed via KnowledgeGraph onReady callback */
export interface GraphControls {
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;
  collapseAll: () => void;
  expandAll: () => void;
  /** Toggle collapse on a specific node. Returns true if now collapsed. */
  toggleCollapse: (nodeId: string) => boolean;
  /** Export graph as PNG image (overall mode) */
  exportPNG: () => Promise<void>;
  /** Export graph as JPEG image (overall mode) */
  exportJPEG: () => Promise<void>;
  /** Focus (zoom + pan) the graph on a specific node by ID */
  focusNode?: (nodeId: string) => void;
}

// ── Graph Helpers ──────────────────────────────────────────

/** Truncate a label for display in graph nodes */
export function truncateLabel(label: string, maxLen = 20): string {
  if (label.length <= maxLen) return label;
  return label.slice(0, maxLen - 1) + '\u2026';
}
