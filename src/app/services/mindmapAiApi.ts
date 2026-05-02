// ============================================================
// Axon — Mind Map AI API Service
//
// Frontend API calls for AI-powered knowledge graph analysis.
//
// Endpoints:
//   POST /ai/analyze-knowledge-graph
//   POST /ai/suggest-student-connections
//   GET  /ai/student-weak-points?topic_id=X
//
// All endpoints return { data: ... } which apiCall() unwraps.
// ============================================================

import { apiCall } from '@/app/lib/api';
import type {
  AnalyzeKnowledgeGraphResponse,
  SuggestConnectionsResponse,
  WeakPointsResponse,
} from '@/app/types/mindmap-ai';

// ── Internal helper ─────────────────────────────────────────

/**
 * Wraps an AI API call with consistent error wrapping. Preserves the original
 * error via Error.cause so callers can introspect, while presenting a
 * user-facing prefix. Extracted in cycle #45 to dedupe a 3× boilerplate.
 */
async function wrapAiCall<T>(failurePrefix: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    throw new Error(`${failurePrefix}: ${message}`, { cause: err });
  }
}

// ── API Functions ───────────────────────────────────────────

/**
 * Analyze the student's knowledge graph for a given topic.
 * Returns weak areas, strong areas, missing connections, and a study path.
 */
export async function analyzeKnowledgeGraph(
  topicId: string,
): Promise<AnalyzeKnowledgeGraphResponse> {
  if (!topicId) throw new Error('topicId es requerido para analizar el grafo');
  return wrapAiCall('No se pudo analizar el grafo de conocimiento', () =>
    apiCall<AnalyzeKnowledgeGraphResponse>('/ai/analyze-knowledge-graph', {
      method: 'POST',
      body: JSON.stringify({ topic_id: topicId }),
    }),
  );
}

/**
 * Suggest new connections between nodes based on AI analysis.
 */
export async function suggestStudentConnections(
  topicId: string,
  nodeIds: string[],
  edgeIds: string[],
): Promise<SuggestConnectionsResponse> {
  if (!topicId) throw new Error('topicId es requerido para sugerir conexiones');
  // Short-circuit: AI cannot suggest connections without existing nodes
  if (nodeIds.length === 0) return [] as SuggestConnectionsResponse;

  return wrapAiCall('No se pudieron obtener sugerencias de conexiones', () =>
    apiCall<SuggestConnectionsResponse>('/ai/suggest-student-connections', {
      method: 'POST',
      body: JSON.stringify({
        topic_id: topicId,
        existing_node_ids: nodeIds,
        existing_edge_ids: edgeIds,
      }),
    }),
  );
}

/**
 * Get student's weak points for a specific topic, ordered by urgency.
 */
export async function getStudentWeakPoints(
  topicId: string,
): Promise<WeakPointsResponse> {
  if (!topicId) throw new Error('topicId es requerido para obtener puntos débiles');
  return wrapAiCall('No se pudieron obtener los puntos débiles del estudiante', () =>
    apiCall<WeakPointsResponse>(
      `/ai/student-weak-points?topic_id=${encodeURIComponent(topicId)}`,
    ),
  );
}
