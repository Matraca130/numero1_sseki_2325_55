// ============================================================
// Axon — Mind Map API Service
//
// Fetches keyword connections + mastery data and transforms
// them into G6-compatible graph data (nodes + edges).
//
// BACKEND ENDPOINTS USED:
//   GET /keyword-connections-batch?keyword_ids=...  → edges
//   GET /keywords?summary_id=X                      → nodes (via keywordMasteryApi)
//   GET /subtopics-batch?keyword_ids=...            → subtopic data
//   GET /bkt-states?subtopic_ids=...                → mastery coloring
//   GET /topic-progress?topic_id=X                  → summary list
//
// EFFICIENCY:
//   fetchGraphByTopic: reuses keywordMasteryApi + 1 batch connections call
// ============================================================

import { apiCall } from '@/app/lib/api';
import {
  fetchKeywordMasteryByTopic,
  fetchKeywordMasteryBySummary,
  type KeywordMasteryMap,
} from '@/app/services/keywordMasteryApi';
import { getSafeMasteryColor } from '@/app/lib/mastery-helpers';
import type { KeywordConnection } from '@/app/types/keyword-connections';
import type { GraphData, MapNode, MapEdge, ClassMasteryData } from '@/app/types/mindmap';

// ── Helpers ─────────────────────────────────────────────────

function unwrapItems<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object' && 'items' in result) {
    return (result as { items: T[] }).items || [];
  }
  return [];
}

/** Chunk array into batches */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ── Fetch connections for multiple keywords ─────────────────

const MAX_BATCH = 50;

async function fetchConnectionsBatch(
  keywordIds: string[]
): Promise<KeywordConnection[]> {
  if (keywordIds.length === 0) return [];

  const batches = chunk(keywordIds, MAX_BATCH);
  const allConnections: KeywordConnection[] = [];
  const seenIds = new Set<string>();

  // Fetch all batches in parallel for better latency with 100+ nodes
  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      try {
        const idsParam = batch.map(id => encodeURIComponent(id)).join(',');
        const result = await apiCall<unknown>(
          `/keyword-connections-batch?keyword_ids=${idsParam}`
        );
        return unwrapItems<KeywordConnection>(result);
      } catch (e) {
        if (import.meta.env.DEV) {
          console.warn('[MindmapApi] connections-batch failed:', e);
        }
        return [];
      }
    })
  );

  for (const connections of batchResults) {
    for (const conn of connections) {
      if (!seenIds.has(conn.id)) {
        seenIds.add(conn.id);
        allConnections.push(conn);
      }
    }
  }

  return allConnections;
}

// ── Transform mastery + connections → GraphData ─────────────

function buildGraphData(
  masteryMap: KeywordMasteryMap,
  connections: KeywordConnection[],
  /** Optional map of keywordId → topicId for course-graph navigation */
  topicMap?: Map<string, string>,
): GraphData {
  const nodes: MapNode[] = [];
  const edges: MapEdge[] = [];
  const nodeIds = new Set<string>();

  // Build nodes from mastery data
  for (const [kwId, info] of masteryMap) {
    nodeIds.add(kwId);
    nodes.push({
      id: kwId,
      label: info.name,
      definition: info.definition || undefined,
      type: 'keyword',
      mastery: info.mastery,
      masteryColor: getSafeMasteryColor(info.mastery),
      summaryId: info.summary_id,
      topicId: topicMap?.get(kwId),
      flashcardCount: 0,
      quizCount: 0,
    });
  }

  // Build edges from connections
  for (const conn of connections) {
    // Only include edges where both nodes exist in our set
    if (!nodeIds.has(conn.keyword_a_id) || !nodeIds.has(conn.keyword_b_id)) {
      continue;
    }

    // Determine direction: use source_keyword_id if set, default to keyword_a → keyword_b
    const source = conn.source_keyword_id || conn.keyword_a_id;
    const target = source === conn.keyword_a_id ? conn.keyword_b_id : conn.keyword_a_id;

    edges.push({
      id: conn.id,
      source,
      target,
      label: conn.relationship || conn.connection_type || undefined,
      connectionType: conn.connection_type || undefined,
      sourceKeywordId: conn.source_keyword_id || undefined,
    });
  }

  return { nodes, edges };
}

// ── Public API ──────────────────────────────────────────────

/**
 * Fetch complete graph data for a topic.
 * Combines keyword mastery + keyword connections into G6-ready data.
 */
export async function fetchGraphByTopic(topicId: string): Promise<GraphData> {
  // Step 1: Get keyword mastery (reuses existing efficient service)
  const masteryMap = await fetchKeywordMasteryByTopic(topicId);

  if (masteryMap.size === 0) {
    return { nodes: [], edges: [] };
  }

  // Step 2: Get connections for all keywords in one batch
  const keywordIds = Array.from(masteryMap.keys());
  const connections = await fetchConnectionsBatch(keywordIds);

  // Step 3: Build graph (all keywords belong to this topic)
  const topicMap = new Map(keywordIds.map(id => [id, topicId]));
  return buildGraphData(masteryMap, connections, topicMap);
}

/**
 * Fetch complete graph data for a single summary.
 */
export async function fetchGraphBySummary(summaryId: string): Promise<GraphData> {
  const masteryMap = await fetchKeywordMasteryBySummary(summaryId);

  if (masteryMap.size === 0) {
    return { nodes: [], edges: [] };
  }

  const keywordIds = Array.from(masteryMap.keys());
  const connections = await fetchConnectionsBatch(keywordIds);

  return buildGraphData(masteryMap, connections);
}

/**
 * Fetch graph data for multiple topics (full course graph).
 */
export async function fetchGraphByCourse(topicIds: string[]): Promise<GraphData> {
  if (topicIds.length === 0) return { nodes: [], edges: [] };

  // Fetch mastery for all topics in parallel (allSettled so one failure doesn't block others)
  const results = await Promise.allSettled(
    topicIds.map(id => fetchKeywordMasteryByTopic(id))
  );

  // Merge all mastery maps + track which topic each keyword belongs to
  const merged: KeywordMasteryMap = new Map();
  const topicMap = new Map<string, string>();
  for (let i = 0; i < topicIds.length; i++) {
    const r = results[i];
    if (r.status !== 'fulfilled') continue;
    for (const [k, v] of r.value) {
      merged.set(k, v);
      topicMap.set(k, topicIds[i]);
    }
  }

  if (merged.size === 0) {
    return { nodes: [], edges: [] };
  }

  const keywordIds = Array.from(merged.keys());
  const connections = await fetchConnectionsBatch(keywordIds);

  return buildGraphData(merged, connections, topicMap);
}

// ── Class Mastery (Professor Heatmap) ────────────────────────

/**
 * Fetch aggregated BKT mastery data per keyword for a topic.
 * Used by the professor heatmap overlay to visualize class-wide mastery.
 *
 * TODO: Backend endpoint `/ai/class-mastery` not yet deployed.
 * Currently returns mock data for preview purposes.
 */
export async function fetchClassMastery(
  topicId: string,
  graphNodes: MapNode[],
): Promise<ClassMasteryData[]> {
  try {
    return await apiCall<ClassMasteryData[]>(
      `/ai/class-mastery?topic_id=${encodeURIComponent(topicId)}`
    );
  } catch (e: unknown) {
    // Endpoint not deployed yet — return mock data based on graph nodes
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
      if (import.meta.env.DEV) {
        console.info('[MindmapApi] /ai/class-mastery not deployed, using mock data');
      }
      return graphNodes.map((node) => ({
        keyword_id: node.id,
        keyword_name: node.label,
        avg_mastery: Math.random() * 0.85 + 0.1, // 0.10 – 0.95
        student_count: Math.floor(Math.random() * 30) + 5,
        weak_student_count: Math.floor(Math.random() * 10),
      }));
    }
    throw e;
  }
}

// ── Student Custom Nodes & Edges ────────────────────────────

/** Custom node payload for creation */
export interface CreateCustomNodePayload {
  label: string;
  definition?: string;
  topic_id: string;
}

/** Custom edge payload for creation */
export interface CreateCustomEdgePayload {
  source_node_id: string;
  target_node_id: string;
  label?: string;
  connection_type?: string;
  topic_id: string;
  /** Custom line style (solid by default if omitted) */
  line_style?: 'dashed' | 'dotted';
  /** Custom color hex (overrides connection type default) */
  custom_color?: string;
  /** Whether the edge is directed (shows arrowhead from source to target) */
  directed?: boolean;
  /** Arrowhead shape when directed (default: 'triangle') */
  arrow_type?: 'triangle' | 'diamond' | 'circle' | 'vee';
}

/** Backend response for custom node */
interface CustomNodeResponse {
  id: string;
  label: string;
  definition?: string;
  topic_id: string;
}

/** Backend response for custom edge */
interface CustomEdgeResponse {
  id: string;
  source_node_id: string;
  target_node_id: string;
  label?: string;
  connection_type?: string;
  line_style?: 'dashed' | 'dotted';
  custom_color?: string;
  directed?: boolean;
  arrow_type?: 'triangle' | 'diamond' | 'circle' | 'vee';
}

/**
 * Fetch student's custom nodes + edges for a topic.
 * Returns them as MapNode[] / MapEdge[] ready to merge with auto-generated graph.
 */
export async function fetchCustomGraph(topicId: string): Promise<GraphData> {
  try {
    const [nodesRaw, edgesRaw] = await Promise.all([
      apiCall<unknown>(`/student-custom-nodes?topic_id=${topicId}`),
      apiCall<unknown>(`/student-custom-edges?topic_id=${topicId}`),
    ]);

    const customNodes = unwrapItems<CustomNodeResponse>(nodesRaw);
    const customEdges = unwrapItems<CustomEdgeResponse>(edgesRaw);

    const nodes: MapNode[] = customNodes.map(n => ({
      id: n.id,
      label: n.label,
      definition: n.definition,
      type: 'keyword' as const,
      mastery: -1,
      masteryColor: 'gray' as const,
      topicId: n.topic_id,
      isUserCreated: true,
    }));

    const edges: MapEdge[] = customEdges.map(e => ({
      id: e.id,
      source: e.source_node_id,
      target: e.target_node_id,
      label: e.label,
      connectionType: e.connection_type,
      isUserCreated: true,
      lineStyle: e.line_style,
      customColor: e.custom_color,
      directed: e.directed,
      arrowType: e.arrow_type,
    }));

    return { nodes, edges };
  } catch (e: unknown) {
    // Swallow 404s (endpoint not deployed yet). Re-throw all other errors.
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('404') || msg.toLowerCase().includes('not found')) return { nodes: [], edges: [] };
    throw e;
  }
}

/** Create a custom node for the student */
export async function createCustomNode(payload: CreateCustomNodePayload): Promise<CustomNodeResponse> {
  return apiCall<CustomNodeResponse>('/student-custom-nodes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Delete a custom node */
export async function deleteCustomNode(nodeId: string): Promise<void> {
  await apiCall(`/student-custom-nodes/${nodeId}`, { method: 'DELETE' });
}

/** Create a custom edge between two nodes */
export async function createCustomEdge(payload: CreateCustomEdgePayload): Promise<CustomEdgeResponse> {
  return apiCall<CustomEdgeResponse>('/student-custom-edges', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Delete a custom edge */
export async function deleteCustomEdge(edgeId: string): Promise<void> {
  await apiCall(`/student-custom-edges/${edgeId}`, { method: 'DELETE' });
}
