// ============================================================
// Axon — Mind Map AI API Service
//
// Frontend API calls for AI-powered knowledge graph analysis.
// Returns mock data when the backend endpoints don't exist yet.
//
// Endpoints:
//   POST /ai/analyze-knowledge-graph
//   POST /ai/suggest-student-connections
//   GET  /ai/student-weak-points?topic_id=X
// ============================================================

import { apiCall } from '@/app/lib/api';
import type {
  AnalyzeKnowledgeGraphResponse,
  SuggestConnectionsResponse,
  WeakPointsResponse,
} from '@/app/types/mindmap-ai';

// ── Mock data for development ───────────────────────────────

const MOCK_ANALYZE: AnalyzeKnowledgeGraphResponse = {
  weak_areas: [
    { keyword_id: 'mock-1', keyword_name: 'Concepto débil', mastery: 0.15, recommendation: 'Revisa las flashcards de este tema' },
    { keyword_id: 'mock-2', keyword_name: 'Necesita práctica', mastery: 0.30, recommendation: 'Realiza el quiz para reforzar' },
  ],
  strong_areas: [
    { keyword_id: 'mock-3', keyword_name: 'Concepto dominado', mastery: 0.92 },
  ],
  missing_connections: [
    { from_keyword: 'mock-1', to_keyword: 'mock-3', suggested_type: 'prerequisito', reason: 'Este concepto es base para entender el otro' },
  ],
  study_path: [
    { step: 1, action: 'review', keyword_id: 'mock-1', keyword_name: 'Concepto débil', reason: 'Comienza por lo más débil' },
    { step: 2, action: 'practice', keyword_id: 'mock-2', keyword_name: 'Necesita práctica', reason: 'Practica para consolidar' },
    { step: 3, action: 'connect', keyword_id: 'mock-3', keyword_name: 'Concepto dominado', reason: 'Conecta con lo que ya sabes' },
  ],
  overall_score: 0.58,
  summary_text: 'Dominas bien los conceptos fundamentales pero necesitas reforzar las conexiones entre temas avanzados. Te recomendamos empezar por revisar los puntos débiles.',
};

const MOCK_SUGGESTIONS: SuggestConnectionsResponse = [
  { source: 'mock-1', target: 'mock-2', type: 'asociacion', reason: 'Estos conceptos están relacionados temáticamente', confidence: 0.85 },
  { source: 'mock-2', target: 'mock-3', type: 'prerequisito', reason: 'Uno es base del otro', confidence: 0.72 },
];

const MOCK_WEAK_POINTS: WeakPointsResponse = [
  { keyword_id: 'mock-1', name: 'Concepto débil', mastery: 0.15, last_reviewed: null, recommended_action: 'flashcard' },
  { keyword_id: 'mock-2', name: 'Necesita práctica', mastery: 0.30, last_reviewed: '2026-03-10T00:00:00Z', recommended_action: 'quiz' },
];

// ── API Functions ───────────────────────────────────────────

/**
 * Analyze the student's knowledge graph for a given topic.
 * Returns weak areas, strong areas, missing connections, and a study path.
 */
export async function analyzeKnowledgeGraph(
  topicId: string,
): Promise<AnalyzeKnowledgeGraphResponse> {
  try {
    const result = await apiCall<AnalyzeKnowledgeGraphResponse>(
      '/ai/analyze-knowledge-graph',
      {
        method: 'POST',
        body: JSON.stringify({ topic_id: topicId }),
      },
    );
    return result;
  } catch (err) {
    // Backend doesn't exist yet — return mock data only in dev
    if (!import.meta.env.DEV) throw err;
    console.info('[mindmapAiApi] analyzeKnowledgeGraph: using mock data');
    await new Promise(r => setTimeout(r, 800));
    return MOCK_ANALYZE;
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
    const result = await apiCall<SuggestConnectionsResponse>(
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
    return result;
  } catch (err) {
    if (!import.meta.env.DEV) throw err;
    console.info('[mindmapAiApi] suggestStudentConnections: using mock data');
    await new Promise(r => setTimeout(r, 600));
    return MOCK_SUGGESTIONS;
  }
}

/**
 * Get student's weak points for a specific topic, ordered by urgency.
 */
export async function getStudentWeakPoints(
  topicId: string,
): Promise<WeakPointsResponse> {
  try {
    const result = await apiCall<WeakPointsResponse>(
      `/ai/student-weak-points?topic_id=${topicId}`,
    );
    return result;
  } catch (err) {
    if (!import.meta.env.DEV) throw err;
    console.info('[mindmapAiApi] getStudentWeakPoints: using mock data');
    await new Promise(r => setTimeout(r, 400));
    return MOCK_WEAK_POINTS;
  }
}
