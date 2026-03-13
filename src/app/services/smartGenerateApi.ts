// ============================================================
// Axon — Smart (Adaptive) Quiz Generation API (R1 domain extraction)
//
// POST for /ai/generate-smart endpoint.
// Backend: routes/ai/generate-smart.ts (Fase 8A + 8E)
// Uses RPC get_smart_generate_target() → picks weakest subtopics by BKT
// Then generates AI quiz questions scoped to those subtopics.
//
// Extracted from quizApi.ts — all consumers continue to import
// from quizApi.ts barrel (backwards compatible).
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────────

export interface SmartGenerateParams {
  action: 'quiz_question' | 'flashcard';
  institution_id?: string;
  summary_id?: string;
  count?: number;    // 1-10, default 1
  quiz_id?: string;  // auto-link generated questions to quiz entity
  auto_create_quiz?: boolean;  // Fase 8G: server-side quiz creation
  quiz_title?: string;         // Fase 8G: title for auto-created quiz
}

export interface SmartGenerateItem {
  type: string;
  id: string;
  keyword_id: string;
  keyword_name: string;
  summary_id: string;
  _smart: {
    p_know: number;
    need_score: number;
    primary_reason: string;
    target_subtopic: string | null;
  };
}

export interface SmartGenerateError {
  keyword_id: string;
  keyword_name: string;
  error: string;
}

export interface SmartGenerateResponse {
  items: SmartGenerateItem[];
  errors: SmartGenerateError[];
  _meta: {
    model: string;
    action: string;
    summary_id?: string;
    quiz_id?: string;
    total_attempted: number;
    total_generated: number;
    total_failed: number;
    total_targets_available: number;
  };
}

// ── API Functions ─────────────────────────────────────────

/**
 * Generate adaptive quiz questions using AI.
 * Backend auto-selects weakest subtopics via BKT analysis.
 *
 * Flow:
 *   1. Create a quiz entity via createQuiz()
 *   2. Call generateSmartQuiz() with the quiz_id + count
 *   3. Backend generates questions and auto-links them to the quiz
 *   4. Navigate to QuizTaker with the quiz_id
 *
 * Timeout is 120s (bulk AI generation can be slow).
 */
export async function generateSmartQuiz(params: SmartGenerateParams): Promise<SmartGenerateResponse> {
  // FIX: apiCall does NOT support timeoutMs — implement AbortController timeout
  // for bulk AI generation which can take 60-120s
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000); // 2 min

  try {
    return await apiCall<SmartGenerateResponse>('/ai/generate-smart', {
      method: 'POST',
      body: JSON.stringify(params),
      signal: controller.signal,
    });
  } catch (err) {
    // Convert AbortError to a more descriptive timeout message
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Timeout: la generacion adaptativa tardo mas de 2 minutos. Intenta con menos preguntas.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
