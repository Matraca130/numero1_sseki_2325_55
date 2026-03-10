// ============================================================
// Axon — AI Service (Frontend → Backend → Gemini)
//
// FIX BUG-008: Uses apiCall() (sends ANON_KEY + JWT).
// FIX BUG-009: Route names match backend.
// FIX BUG-010: /ai/generate field names: action + summary_id.
// FIX BUG-015: /ai/rag-chat contract matched to CURRENT backend:
//   - Request:  { message: string, summary_id?, history?, strategy? }
//     NOT the old { messages: [...], context: {...} }
//   - Response: { response: string, sources, tokens, log_id, _search }
//     NOT { reply: string }
//
// Backend AI routes (verified against main branch 2026-03-08):
//   POST /ai/generate       — action: flashcard | quiz_question
//   POST /ai/generate-smart — smart generation with gap analysis
//   POST /ai/rag-chat       — RAG chat (message + summary_id + history)
//   POST /ai/pre-generate   — bulk pre-generation (professor)
//   POST /ai/report         — content quality reports (Fase 8B)
//   PATCH /ai/report/:id    — resolve/update reports
//   GET  /ai/report-stats   — aggregate quality metrics (Fase 8C)
//   GET  /ai/reports        — paginated report listing (Fase 8C)
//   POST /ai/ingest-pdf     — PDF upload + extraction (Fase 7)
//   POST /ai/ingest-embeddings — batch embedding generation
//   POST /ai/re-chunk       — manual re-chunking (Fase 5)
//   PATCH /ai/rag-feedback  — feedback on RAG responses (T-03)
//   GET  /ai/rag-analytics  — RAG analytics dashboard (admin)
//   GET  /ai/embedding-coverage — embedding coverage stats (admin)
//   ❌ GET /ai/list-models  — REMOVED in PHASE-A2 CLEANUP
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────────

/** History entry for multi-turn chat */
export interface ChatHistoryEntry {
  role: 'user' | 'model';
  content: string;
}

/** @deprecated Old type name — use ChatHistoryEntry instead */
export type ChatMessage = ChatHistoryEntry;

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

/** Metadata from backend's smart targeting system (generate-smart.ts) */
export interface SmartTargetMeta {
  /**
   * Keyword name targeted by the algorithm.
   * OPTIONAL: Only present in single-item responses (count=1).
   * Bulk responses (count>1) do NOT include this field in _smart.
   */
  target_keyword?: string;
  /**
   * Summary title of the target.
   * OPTIONAL: Only present in single-item responses (count=1).
   * Bulk responses return keyword_name at the item level instead.
   */
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

/** Bulk response from generate-smart with count>1 (Fase 8E) */
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

// ── Generate request params (matches backend /ai/generate) ──

export interface GenerateParams {
  action: 'flashcard' | 'quiz_question';
  summary_id: string;
  keyword_id?: string;
  subtopic_id?: string;
  block_id?: string;
  wrong_answer?: string;
  related?: boolean;
}

// ══════════════════════════════════════════════════════════
// B-2: Types for ALL remaining backend endpoints
// Verified against actual backend source code (2026-03-09)
// ══════════════════════════════════════════════════════════

// ── AI Content Reports (Fase 8B: report.ts) ──────────────

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

// ── Report Dashboard (Fase 8C: report-dashboard.ts) ──────

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

// ── RAG Analytics (analytics.ts) ─────────────────────────

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

// ── PDF Ingest (Fase 7: ingest-pdf.ts) ───────────────────

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

// ── Embedding Ingest (ingest.ts) ─────────────────────────

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

// ── Re-Chunk (Fase 5: re-chunk.ts) ──────────────────────

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

// ── Rate limit error helper ───────────────────────────────

function handleRateLimitError(err: Error): never {
  const msg = err.message?.toLowerCase() || '';
  if (msg.includes('rate limit') || msg.includes('429')) {
    throw new Error(
      'Limite de solicitudes de IA excedido. Aguarde un momento e intente nuevamente.'
    );
  }
  throw err;
}

// ══════════════════════════════════════════════════════════
// RAG CHAT — POST /ai/rag-chat
//
// Backend contract (chat.ts on main):
//   Request body:
//     message: string        — REQUIRED, max 2000 chars
//     summary_id?: UUID      — optional, scopes vector search to one summary
//     history?: Array<{role, content}> — optional, max 6 entries
//     strategy?: string      — optional: auto|standard|multi_query|hyde
//
//   Response:
//     response: string       — the AI reply (NOT "reply"!)
//     sources: [...]         — matched chunks
//     tokens: {input, output}
//     log_id: string         — for rag-feedback
//     _search: {...}         — search metadata
// ══════════════════════════════════════════════════════════

/**
 * Chat with AI using RAG context.
 * Backend: POST /ai/rag-chat
 *
 * @param message - The user's current message (string, max 2000 chars)
 * @param opts.summaryId - Optional UUID to scope search to one summary
 * @param opts.history - Optional conversation history (max 6 entries)
 * @param opts.strategy - Optional retrieval strategy
 */
export async function chat(
  message: string,
  opts?: {
    summaryId?: string;
    history?: ChatHistoryEntry[];
    strategy?: 'auto' | 'standard' | 'multi_query' | 'hyde';
  }
): Promise<RagChatResponse> {
  try {
    const body: Record<string, unknown> = { message };
    if (opts?.summaryId) body.summary_id = opts.summaryId;
    if (opts?.history && opts.history.length > 0) body.history = opts.history;
    if (opts?.strategy) body.strategy = opts.strategy;

    return await apiCall<RagChatResponse>('/ai/rag-chat', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    handleRateLimitError(err);
  }
}

/**
 * Convenience: get just the text response from chat.
 */
export async function chatText(
  message: string,
  opts?: {
    summaryId?: string;
    history?: ChatHistoryEntry[];
    strategy?: 'auto' | 'standard' | 'multi_query' | 'hyde';
  }
): Promise<string> {
  const result = await chat(message, opts);
  return result.response;
}

// ══════════════════════════════════════════════════════════
// AI GENERATE — POST /ai/generate
// ══════════════════════════════════════════════════════════

/**
 * Generate a flashcard via AI.
 * Backend: POST /ai/generate (action: 'flashcard')
 *
 * The backend generates ONE flashcard per call and persists it to DB.
 * Returns the full flashcard row with id, front, back, etc.
 */
export async function generateFlashcard(
  params: {
    summaryId: string;
    keywordId?: string;
    subtopicId?: string;
    blockId?: string;
    related?: boolean;
  }
): Promise<GeneratedFlashcard> {
  try {
    const data = await apiCall<GeneratedFlashcard>('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({
        action: 'flashcard',
        summary_id: params.summaryId,
        keyword_id: params.keywordId,
        subtopic_id: params.subtopicId,
        block_id: params.blockId,
        related: params.related ?? true,
      }),
    });
    return data;
  } catch (err: any) {
    handleRateLimitError(err);
  }
}

/**
 * Generate a quiz question via AI.
 * Backend: POST /ai/generate (action: 'quiz_question')
 */
export async function generateQuizQuestion(
  params: {
    summaryId: string;
    keywordId?: string;
    subtopicId?: string;
    blockId?: string;
    wrongAnswer?: string;
  }
): Promise<GeneratedQuestion> {
  try {
    const data = await apiCall<GeneratedQuestion>('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({
        action: 'quiz_question',
        summary_id: params.summaryId,
        keyword_id: params.keywordId,
        subtopic_id: params.subtopicId,
        block_id: params.blockId,
        wrong_answer: params.wrongAnswer,
      }),
    });
    return data;
  } catch (err: any) {
    handleRateLimitError(err);
  }
}

// ══════════════════════════════════════════════════════════
// AI GENERATE-SMART — POST /ai/generate-smart
// ══════════════════════════════════════════════════════════

/**
 * Smart generation with gap analysis.
 * Backend: POST /ai/generate-smart (Fase 8A + 8E)
 *
 * Backend auto-selects the best keyword to study based on
 * BKT mastery profile via RPC get_smart_generate_target().
 *
 * Fase 8E additions:
 *   - summary_id: scopes RPC to one summary (subtopic-level targeting)
 *   - count: generates 1-10 items in one request (sequential Gemini)
 *   - quiz_id: auto-links quiz_questions to a quiz entity
 *
 * When count=1: returns single item (GeneratedFlashcard | GeneratedQuestion)
 * When count>1: returns SmartBulkResponse with items[] + errors[]
 */
export async function generateSmart(
  params: {
    action?: 'flashcard' | 'quiz_question';
    institutionId?: string;
    summaryId?: string;
    related?: boolean;
    count?: number;
    quizId?: string;
    /** Fase 8G: Create quiz entity server-side (students bypass CRUD role check) */
    autoCreateQuiz?: boolean;
    /** Fase 8G: Title for the auto-created quiz */
    quizTitle?: string;
  } = {}
): Promise<any> {
  try {
    const body: Record<string, unknown> = {
      action: params.action || 'flashcard',
    };
    if (params.institutionId) body.institution_id = params.institutionId;
    if (params.summaryId) body.summary_id = params.summaryId;
    if (params.related !== undefined) body.related = params.related;
    if (params.count && params.count > 1) body.count = params.count;
    if (params.quizId) body.quiz_id = params.quizId;
    if (params.autoCreateQuiz) body.auto_create_quiz = true;
    if (params.quizTitle) body.quiz_title = params.quizTitle;

    return await apiCall<any>('/ai/generate-smart', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    handleRateLimitError(err);
  }
}

// ══════════════════════════════════════════════════════════
// AI PRE-GENERATE — POST /ai/pre-generate (Fase 8D)
// ══════════════════════════════════════════════════════════

/**
 * Bulk pre-generate AI content for a summary.
 * Professor/admin only. Up to 5 items per call.
 *
 * Body: { summary_id, action, count? }
 */
export async function preGenerate(
  params: {
    summaryId: string;
    action: 'flashcard' | 'quiz_question';
    count?: number;
  }
): Promise<{
  generated: Array<{ type: string; id: string; keyword_id: string; keyword_name: string }>;
  errors: Array<{ keyword_id: string; keyword_name: string; error: string }>;
  _meta: any;
}> {
  try {
    return await apiCall<any>('/ai/pre-generate', {
      method: 'POST',
      body: JSON.stringify({
        summary_id: params.summaryId,
        action: params.action,
        count: params.count || 3,
      }),
    });
  } catch (err: any) {
    handleRateLimitError(err);
  }
}

// ══════════════════════════════════════════════════════════
// EXPLAIN — convenience wrapper over rag-chat
// ══════════════════════════════════════════════════════════

/**
 * Explain a concept using AI with RAG context.
 * Sends a single message to /ai/rag-chat.
 */
export async function explainConcept(
  concept: string,
  summaryId?: string
): Promise<string> {
  const message = `Explica el siguiente concepto de forma clara y concisa: ${concept}`;
  const result = await chat(message, { summaryId });
  return result.response;
}

// ══════════════════════════════════════════════════════════
// RAG FEEDBACK — PATCH /ai/rag-feedback
// ══════════════════════════════════════════════════════════

/**
 * Submit RAG feedback (thumbs up/down on AI responses).
 * Backend: PATCH /ai/rag-feedback (T-03)
 *
 * FIX A-1: Backend expects { log_id: UUID, feedback: 1 | -1 }.
 * Previously sent { rating: 'positive', comment } which caused 400 errors.
 * The `comment` field was removed (backend doesn't accept it).
 */
export async function submitRagFeedback(
  params: {
    logId: string;
    /** 'positive' = thumbs up (1), 'negative' = thumbs down (-1) */
    feedback: 'positive' | 'negative';
  }
): Promise<{ updated: { id: string; feedback: number; created_at: string } }> {
  return apiCall('/ai/rag-feedback', {
    method: 'PATCH',
    body: JSON.stringify({
      log_id: params.logId,
      feedback: params.feedback === 'positive' ? 1 : -1,
    }),
  });
}

/**
 * @deprecated REMOVED from backend in PHASE-A2 CLEANUP.
 * The list-models.ts route was removed from ai/index.ts.
 * Calling this function will result in a 404 error.
 * This export is kept only for backward compatibility — do NOT use.
 */
export async function listModels(): Promise<never> {
  throw new Error(
    '[aiService] listModels() is no longer available. ' +
    'Backend removed GET /ai/list-models in PHASE-A2 CLEANUP.'
  );
}

// ══════════════════════════════════════════════════════════
// C-2: AI CONTENT REPORTS — POST /ai/report + PATCH /ai/report/:id
//
// Backend: report.ts (Fase 8B)
// POST — ANY active member can report AI content (ALL_ROLES)
// PATCH — Only owner/admin/professor (CONTENT_WRITE_ROLES)
// Unique constraint: one report per user per content item
// ══════════════════════════════════════════════════════════

/**
 * Report AI-generated content as incorrect, inappropriate, etc.
 * Backend: POST /ai/report
 *
 * @param params.contentType - 'quiz_question' or 'flashcard'
 * @param params.contentId - UUID of the content item
 * @param params.reason - Why the content is being reported
 * @param params.description - Optional free-text detail (max 2000 chars)
 */
export async function reportContent(
  params: {
    contentType: ReportContentType;
    contentId: string;
    reason: ReportReason;
    description?: string;
  }
): Promise<AiContentReport> {
  return apiCall<AiContentReport>('/ai/report', {
    method: 'POST',
    body: JSON.stringify({
      content_type: params.contentType,
      content_id: params.contentId,
      reason: params.reason,
      description: params.description || null,
    }),
  });
}

/**
 * Resolve/update an AI content report.
 * Backend: PATCH /ai/report/:id
 *
 * Status transitions:
 *   pending -> reviewed (moderator looked, no decision)
 *   pending -> resolved (confirmed issue, fixed)
 *   pending -> dismissed (not a real issue)
 *   resolved/dismissed -> pending (re-open)
 */
export async function resolveReport(
  reportId: string,
  params: {
    status: ReportStatus;
    resolutionNote?: string;
  }
): Promise<AiContentReport> {
  return apiCall<AiContentReport>(`/ai/report/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: params.status,
      resolution_note: params.resolutionNote || null,
    }),
  });
}

// ══════════════════════════════════════════════════════════
// C-3: REPORT DASHBOARD — GET /ai/report-stats + GET /ai/reports
//
// Backend: report-dashboard.ts (Fase 8C)
// Both endpoints require CONTENT_WRITE_ROLES
// ══════════════════════════════════════════════════════════

/**
 * Get aggregate AI content quality metrics.
 * Backend: GET /ai/report-stats
 *
 * Returns 14 metrics: counts by status, reason, type + resolution performance.
 * Defaults: from = now()-30d, to = now() (handled by backend RPC defaults).
 */
export async function getReportStats(
  institutionId: string,
  opts?: { from?: string; to?: string }
): Promise<ReportStats> {
  const params = new URLSearchParams({ institution_id: institutionId });
  if (opts?.from) params.set('from', opts.from);
  if (opts?.to) params.set('to', opts.to);

  return apiCall<ReportStats>(`/ai/report-stats?${params.toString()}`);
}

/**
 * Get paginated list of AI content reports.
 * Backend: GET /ai/reports
 *
 * Supports filtering by status, reason, and content_type.
 * Ordered by created_at DESC (newest first — moderator queue pattern).
 */
export async function getReports(
  institutionId: string,
  opts?: {
    status?: ReportStatus;
    reason?: ReportReason;
    contentType?: ReportContentType;
    limit?: number;
    offset?: number;
  }
): Promise<ReportListResponse> {
  const params = new URLSearchParams({ institution_id: institutionId });
  if (opts?.status) params.set('status', opts.status);
  if (opts?.reason) params.set('reason', opts.reason);
  if (opts?.contentType) params.set('content_type', opts.contentType);
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));

  return apiCall<ReportListResponse>(`/ai/reports?${params.toString()}`);
}

// ══════════════════════════════════════════════════════════
// C-4: RAG ANALYTICS — GET /ai/rag-analytics + GET /ai/embedding-coverage
//
// Backend: analytics.ts
// Both endpoints require admin/owner role
// ══════════════════════════════════════════════════════════

/**
 * Get aggregated RAG query metrics for an institution.
 * Backend: GET /ai/rag-analytics
 *
 * Returns: total_queries, avg_similarity, avg_latency_ms, feedback counts.
 * Defaults: from = now()-7d, to = now() (handled by backend RPC).
 */
export async function getRagAnalytics(
  institutionId: string,
  opts?: { from?: string; to?: string }
): Promise<RagAnalytics> {
  const params = new URLSearchParams({ institution_id: institutionId });
  if (opts?.from) params.set('from', opts.from);
  if (opts?.to) params.set('to', opts.to);

  return apiCall<RagAnalytics>(`/ai/rag-analytics?${params.toString()}`);
}

/**
 * Get embedding coverage stats for an institution.
 * Backend: GET /ai/embedding-coverage
 *
 * Returns: total_chunks, chunks_with_embedding, coverage_pct (0-100).
 */
export async function getEmbeddingCoverage(
  institutionId: string
): Promise<EmbeddingCoverage> {
  return apiCall<EmbeddingCoverage>(
    `/ai/embedding-coverage?institution_id=${encodeURIComponent(institutionId)}`
  );
}

// ══════════════════════════════════════════════════════════
// C-5: PDF INGEST — POST /ai/ingest-pdf (Fase 7)
//
// Backend: ingest-pdf.ts
// CONTENT_WRITE_ROLES only (professors/admins)
// Uses FormData (multipart/form-data), NOT JSON body
// Max file size: 10MB, PDF only
// ══════════════════════════════════════════════════════════

/**
 * Upload a PDF and create a summary from it.
 * Backend: POST /ai/ingest-pdf
 *
 * Pipeline:
 *   1. Validate PDF (max 10MB)
 *   2. Extract text via Gemini
 *   3. Create summary in DB
 *   4. Upload PDF to Storage
 *   5. Fire-and-forget chunking + embedding
 *
 * @param file - The PDF File object from an <input type="file">
 * @param institutionId - UUID of the institution
 * @param topicId - UUID of the topic to add the summary to
 * @param title - Optional custom title (defaults to filename)
 */
export async function ingestPdf(
  file: File,
  institutionId: string,
  topicId: string,
  title?: string
): Promise<PdfIngestResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('institution_id', institutionId);
  formData.append('topic_id', topicId);
  if (title) formData.append('title', title);

  return apiCall<PdfIngestResponse>('/ai/ingest-pdf', {
    method: 'POST',
    body: formData,
    // Longer timeout for PDF processing (Gemini extraction can take 30s+)
    timeoutMs: 60_000,
  });
}

// ══════════════════════════════════════════════════════════
// C-6: ADMIN TOOLS — POST /ai/ingest-embeddings + POST /ai/re-chunk
//
// Backend: ingest.ts + re-chunk.ts
// CONTENT_WRITE_ROLES only (professors/admins)
// ══════════════════════════════════════════════════════════

/**
 * Batch generate embeddings for chunks or summaries.
 * Backend: POST /ai/ingest-embeddings
 *
 * Targets:
 *   'chunks'    — Generate embeddings for chunks without embeddings (default)
 *   'summaries' — Generate summary-level embeddings for coarse-to-fine search
 *
 * @param params.institutionId - UUID of the institution (required)
 * @param params.target - 'chunks' or 'summaries' (default: 'chunks')
 * @param params.summaryId - Optional: scope to one summary (chunks only)
 * @param params.batchSize - How many to process (default: 50, max: 100)
 */
export async function ingestEmbeddings(
  params: {
    institutionId: string;
    target?: IngestTarget;
    summaryId?: string;
    batchSize?: number;
  }
): Promise<IngestResult> {
  return apiCall<IngestResult>('/ai/ingest-embeddings', {
    method: 'POST',
    body: JSON.stringify({
      institution_id: params.institutionId,
      target: params.target || 'chunks',
      summary_id: params.summaryId,
      batch_size: params.batchSize || 50,
    }),
    // Embedding generation can be slow (50 chunks x rate limit pauses)
    timeoutMs: 120_000,
  });
}

/**
 * Force re-chunking of a summary.
 * Backend: POST /ai/re-chunk
 *
 * Deletes existing chunks, re-chunks the summary content,
 * and generates embeddings for the new chunks.
 *
 * @param params.summaryId - UUID of the summary to re-chunk
 * @param params.institutionId - UUID of the institution
 * @param params.options - Optional chunking parameters
 */
export async function reChunk(
  params: {
    summaryId: string;
    institutionId: string;
    options?: ReChunkOptions;
  }
): Promise<ReChunkResult> {
  const body: Record<string, unknown> = {
    summary_id: params.summaryId,
    institution_id: params.institutionId,
  };
  if (params.options) body.options = params.options;

  return apiCall<ReChunkResult>('/ai/re-chunk', {
    method: 'POST',
    body: JSON.stringify(body),
    // Re-chunking + embedding can take a while
    timeoutMs: 60_000,
  });
}

// ── Legacy aliases (backward compat) ─────────────────────

/** @deprecated Use generateFlashcard() instead */
export async function generateFlashcards(
  _topic: string,
  _count: number = 5,
  _context?: string
): Promise<GeneratedFlashcard[]> {
  console.warn('[aiService] generateFlashcards() is deprecated. Use generateFlashcard({ summaryId }) instead.');
  return [];
}

/** @deprecated Use generateQuizQuestion() instead */
export async function generateQuiz(
  _topic: string,
  _count: number = 3,
  _difficulty?: string
): Promise<GeneratedQuestion[]> {
  console.warn('[aiService] generateQuiz() is deprecated. Use generateQuizQuestion({ summaryId }) instead.');
  return [];
}
