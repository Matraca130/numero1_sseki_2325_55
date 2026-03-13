// ============================================================
// Axon — AI Smart Generation Service (Fase 8A/8D/8E)
// Split from aiService.ts (PN-6)
//
// Backend: POST /ai/generate-smart, POST /ai/pre-generate
// ============================================================

import { apiCall } from '@/app/lib/api';
import { handleRateLimitError } from './as-types';

/**
 * Smart generation with gap analysis.
 * Backend: POST /ai/generate-smart
 */
export async function generateSmart(
  params: {
    action?: 'flashcard' | 'quiz_question';
    institutionId?: string;
    summaryId?: string;
    related?: boolean;
    count?: number;
    quizId?: string;
    autoCreateQuiz?: boolean;
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
  } catch (err: unknown) {
    handleRateLimitError(err);
  }
}

/**
 * Bulk pre-generate AI content for a summary.
 * Professor/admin only. Up to 5 items per call.
 * Backend: POST /ai/pre-generate (Fase 8D)
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
  } catch (err: unknown) {
    handleRateLimitError(err);
  }
}
