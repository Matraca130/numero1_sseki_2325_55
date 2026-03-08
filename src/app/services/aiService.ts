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
//   POST /ai/report         — content quality reports
//   POST /ai/ingest-pdf     — PDF upload + extraction
//   GET  /ai/list-models    — available AI models
//   PATCH /ai/rag-feedback  — feedback on RAG responses
//   GET  /ai/rag-analytics  — RAG analytics dashboard
//   GET  /ai/embedding-coverage — embedding coverage stats
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
  keyword_id?: string;
  subtopic_id?: string;
  source?: string;
  _meta?: { model: string; tokens: any; related?: boolean };
  _smart?: any;
}

export interface GeneratedQuestion {
  id?: string;
  question_type: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: string;
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
 * Backend: POST /ai/generate-smart (Fase 8A)
 *
 * Backend auto-selects the best keyword to study based on
 * BKT mastery profile. Does NOT require summary_id — the
 * server chooses the best target.
 *
 * Body: { action, institution_id?, related? }
 */
export async function generateSmart(
  params: {
    action?: 'flashcard' | 'quiz_question';
    institutionId?: string;
    related?: boolean;
    count?: number;
  } = {}
): Promise<any> {
  try {
    return await apiCall<any>('/ai/generate-smart', {
      method: 'POST',
      body: JSON.stringify({
        action: params.action || 'flashcard',
        institution_id: params.institutionId,
        related: params.related,
      }),
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
 */
export async function submitRagFeedback(
  params: {
    logId: string;
    rating: 'positive' | 'negative';
    comment?: string;
  }
): Promise<void> {
  await apiCall('/ai/rag-feedback', {
    method: 'PATCH',
    body: JSON.stringify({
      log_id: params.logId,
      rating: params.rating,
      comment: params.comment,
    }),
  });
}

/**
 * Get available AI models.
 * Backend: GET /ai/list-models
 */
export async function listModels(): Promise<any> {
  return apiCall<any>('/ai/list-models');
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
