// ============================================================
// Axon — AI Ingest Service (PDF, Embeddings, Re-chunk)
// Split from aiService.ts (PN-6)
//
// Backend: POST /ai/ingest-pdf, POST /ai/ingest-embeddings,
//          POST /ai/re-chunk
// ============================================================

import { apiCall } from '@/app/lib/api';
import type {
  PdfIngestResponse,
  IngestTarget,
  IngestResult,
  ReChunkOptions,
  ReChunkResult,
} from './as-types';

/**
 * Upload a PDF and create a summary from it.
 * Backend: POST /ai/ingest-pdf (Fase 7)
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
    timeoutMs: 60_000,
  });
}

/**
 * Batch generate embeddings for chunks or summaries.
 * Backend: POST /ai/ingest-embeddings
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
    timeoutMs: 120_000,
  });
}

/**
 * Force re-chunking of a summary.
 * Backend: POST /ai/re-chunk (Fase 5)
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
    timeoutMs: 60_000,
  });
}
