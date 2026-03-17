// ============================================================
// Axon — AI Knowledge Graph Types
//
// TypeScript interfaces for AI-powered knowledge graph analysis.
// These types define the expected responses from backend AI
// endpoints (which may not exist yet — used with mock data
// during frontend development).
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
  action: 'review' | 'practice' | 'connect' | 'explore';
  keyword_id: string;
  keyword_name?: string;
  reason: string;
}

export interface AnalyzeKnowledgeGraphResponse {
  weak_areas: WeakArea[];
  strong_areas: StrongArea[];
  missing_connections: MissingConnection[];
  study_path: StudyPathStep[];
  overall_score: number;
  summary_text: string;
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
