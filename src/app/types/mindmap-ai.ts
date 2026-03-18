// ============================================================
// Axon — AI Knowledge Graph Types
//
// TypeScript interfaces for AI-powered knowledge graph analysis.
// These types match the backend AI endpoint responses:
//   POST /ai/analyze-knowledge-graph
//   POST /ai/suggest-student-connections
//   GET  /ai/student-weak-points
// ============================================================

// ── Analyze Knowledge Graph ─────────────────────────────────

export interface WeakArea {
  keyword_id: string;
  keyword_name: string;
  mastery: number;
  recommendation: string;
}

export interface StrongArea {
  keyword_id: string;
  keyword_name: string;
  mastery: number;
}

export interface MissingConnection {
  from_keyword: string;
  to_keyword: string;
  suggested_type: string;
  reason: string;
}

export interface StudyPathStep {
  step: number;
  action: string;
  keyword_id: string;
  keyword_name?: string;
  reason: string;
}

export interface AiResponseMeta {
  model: string;
  tokens: { input: number; output: number };
  keyword_count?: number;
  connection_count?: number;
}

export interface AnalyzeKnowledgeGraphResponse {
  weak_areas: WeakArea[];
  strong_areas: StrongArea[];
  missing_connections: MissingConnection[];
  study_path: StudyPathStep[];
  overall_score: number;
  summary_text: string;
  _meta?: AiResponseMeta;
}

// ── Suggest Connections ─────────────────────────────────────

export interface SuggestedConnection {
  source: string;
  target: string;
  type: string;
  reason: string;
  confidence: number;
}

export type SuggestConnectionsResponse = SuggestedConnection[];

// ── Student Weak Points ─────────────────────────────────────

export interface WeakPoint {
  keyword_id: string;
  name: string;
  mastery: number;
  last_reviewed: string | null;
  recommended_action: 'flashcard' | 'quiz' | 'summary' | 'review';
}

export type WeakPointsResponse = WeakPoint[];
