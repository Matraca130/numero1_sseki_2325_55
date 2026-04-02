// ============================================================
// Axon — AI Service Types & Shared Utilities
// Split from aiService.ts (PN-6)
// ============================================================

/** History entry for multi-turn chat */
export interface ChatHistoryEntry {
  role: 'user' | 'model';
  content: string;
}



/** Response from POST /ai/rag-chat */
export interface RagChatResponse {
  response: string;
  sources: Array<{ chunk_id: string; summary_title: string; similarity: number }>;
  tokens: { input: number; output: number };
  profile_used: boolean;
  log_id: string;
  _search: {
    augmented: boolean;
    search_type: string;
    context_chunks: number;
    primary_matches: number;
    strategy: string;
    rerank_applied: boolean;
  };
}

export interface GeneratedFlashcard {
  id?: string;
  front: string;
  back: string;
  summary_id?: string;
  keyword_id?: string;
  subtopic_id?: string;
  source?: string;
  created_by?: string;
  created_at?: string;
  _meta?: { model: string; tokens: any; related?: boolean };
  _smart?: SmartTargetMeta;
}

export interface GeneratedQuestion {
  id?: string;
  summary_id?: string;
  keyword_id?: string;
  subtopic_id?: string;
  question_type: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: string;
  source?: string;
  created_by?: string;
  created_at?: string;
  _meta?: { model: string; tokens: any; had_wrong_answer?: boolean };
  _smart?: SmartTargetMeta;
}

export interface SmartTargetMeta {
  target_keyword?: string;
  target_summary?: string;
  target_subtopic: string | null;
  p_know: number;
  need_score: number;
  primary_reason:
    | 'new_concept'
    | 'low_mastery'
    | 'needs_review'
    | 'moderate_mastery'
    | 'reinforcement';
  was_deduped?: boolean;
  candidates_evaluated?: number;
}

export interface SmartBulkResponse {
  items: Array<{
    type: string;
    id: string;
    keyword_id: string;
    keyword_name: string;
    summary_id: string;
    _smart: SmartTargetMeta;
  }>;
  errors: Array<{
    keyword_id: string;
    keyword_name: string;
    error: string;
  }>;
  _meta: {
    model: string;
    action: string;
    summary_id?: string;
    quiz_id?: string;
    total_attempted: number;
    total_generated: number;
    total_failed: number;
    total_targets_available: number;
    tokens: { input: number; output: number };
  };
}

export interface GenerateParams {
  action: 'flashcard' | 'quiz_question';
  summary_id: string;
  keyword_id?: string;
  subtopic_id?: string;
  block_id?: string;
  wrong_answer?: string;
  related?: boolean;
}

// ── AI Content Reports (Fase 8B) ─────────────────────

export type ReportReason = 'incorrect' | 'inappropriate' | 'low_quality' | 'irrelevant' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';
export type ReportContentType = 'quiz_question' | 'flashcard';

export interface AiContentReport {
  id: string;
  content_type: ReportContentType;
  content_id: string;
  reported_by: string;
  institution_id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReportStats {
  total_reports: number;
  pending_count: number;
  reviewed_count: number;
  resolved_count: number;
  dismissed_count: number;
  reason_incorrect: number;
  reason_inappropriate: number;
  reason_low_quality: number;
  reason_irrelevant: number;
  reason_other: number;
  type_quiz_question: number;
  type_flashcard: number;
  avg_resolution_hours: number;
  resolution_rate: number;
}

export interface ReportListResponse {
  items: AiContentReport[];
  total: number;
  limit: number;
  offset: number;
}

// ── RAG Analytics ─────────────────────────────────

export interface RagAnalytics {
  total_queries: number;
  avg_similarity: number | null;
  avg_latency_ms: number | null;
  positive_feedback: number;
  negative_feedback: number;
  zero_result_queries: number;
}

export interface EmbeddingCoverage {
  total_chunks: number;
  chunks_with_embedding: number;
  coverage_pct: number;
}

// ── PDF Ingest (Fase 7) ──────────────────────────

export interface PdfIngestResponse {
  summary_id: string;
  title: string;
  source_type: 'pdf';
  source_file_name: string;
  source_file_path: string | null;
  word_count: number;
  char_count: number;
  tokens_used: { input: number; output: number };
  chunking_status: 'started' | 'skipped';
}

export type IngestTarget = 'chunks' | 'summaries';

export interface IngestResult {
  processed: number;
  failed: number;
  skipped?: number;
  total_found: number;
  target: IngestTarget;
  message?: string;
  errors?: string[];
}

export interface ReChunkOptions {
  maxChunkSize?: number;
  minChunkSize?: number;
  overlapSize?: number;
}

export interface ReChunkResult {
  chunks_created: number;
  chunks_deleted: number;
  embeddings_generated: number;
  strategy_used: string;
  elapsed_ms: number;
}

// ── Shared utility ────────────────────────────────

/** Rate limit error handler — rethrows with user-friendly message if 429 */
export function handleRateLimitError(err: unknown): never {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes('rate limit') || msg.includes('429')) {
    throw new Error(
      'Limite de solicitudes de IA excedido. Aguarde un momento e intente nuevamente.'
    );
  }
  if (err instanceof Error) throw err;
  throw new Error(String(err));
}
