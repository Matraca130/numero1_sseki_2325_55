// ============================================================
// Axon — AI Analytics & Feedback
// Split from aiService.ts (PN-6)
//
// Backend: PATCH /ai/rag-feedback, GET /ai/rag-analytics,
//          GET /ai/embedding-coverage
// ============================================================

import { apiCall } from '@/app/lib/api';
import type { RagAnalytics, EmbeddingCoverage } from './as-types';

/**
 * Submit RAG feedback (thumbs up/down on AI responses).
 * Backend: PATCH /ai/rag-feedback (T-03)
 */
export async function submitRagFeedback(
  params: {
    logId: string;
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
 * Get aggregated RAG query metrics for an institution.
 * Backend: GET /ai/rag-analytics
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
 */
export async function getEmbeddingCoverage(
  institutionId: string
): Promise<EmbeddingCoverage> {
  return apiCall<EmbeddingCoverage>(
    `/ai/embedding-coverage?institution_id=${encodeURIComponent(institutionId)}`
  );
}
