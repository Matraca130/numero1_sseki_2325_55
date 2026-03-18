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

// ── API Functions ───────────────────────────────────────────

/**
 * Analyze the student's knowledge graph for a given topic.
 * Returns weak areas, strong areas, missing connections, and a study path.
 */
export async function analyzeKnowledgeGraph(
  topicId: string,
): Promise<AnalyzeKnowledgeGraphResponse> {
  try {
    return await apiCall<AnalyzeKnowledgeGraphResponse>(
      '/ai/analyze-knowledge-graph',
      {
        method: 'POST',
        body: JSON.stringify({ topic_id: topicId }),
      },
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Error desconocido';
    throw new Error(
      `No se pudo analizar el grafo de conocimiento: ${message}`,
      { cause: err },
    );
  }
}

/**
 * Suggest new connections between nodes based on AI analysis.
 */
export async function suggestStudentConnections(
  topicId: string,
  nodeIds: string[],
  edgeIds: string[],
): Promise<SuggestConnectionsResponse> {
  try {
    return await apiCall<SuggestConnectionsResponse>(
      '/ai/suggest-student-connections',
      {
        method: 'POST',
        body: JSON.stringify({
          topic_id: topicId,
          existing_node_ids: nodeIds,
          existing_edge_ids: edgeIds,
        }),
      },
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Error desconocido';
    throw new Error(
      `No se pudieron obtener sugerencias de conexiones: ${message}`,
      { cause: err },
    );
  }
}

/**
 * Get student's weak points for a specific topic, ordered by urgency.
 */
export async function getStudentWeakPoints(
  topicId: string,
): Promise<WeakPointsResponse> {
  try {
    return await apiCall<WeakPointsResponse>(
      `/ai/student-weak-points?topic_id=${encodeURIComponent(topicId)}`,
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Error desconocido';
    throw new Error(
      `No se pudieron obtener los puntos debiles del estudiante: ${message}`,
      { cause: err },
    );
  }
}
