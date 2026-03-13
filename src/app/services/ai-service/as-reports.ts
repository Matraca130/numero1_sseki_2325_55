// ============================================================
// Axon — AI Content Reports (Fase 8B/8C)
// Split from aiService.ts (PN-6)
//
// Backend: POST /ai/report, PATCH /ai/report/:id,
//          GET /ai/report-stats, GET /ai/reports
// ============================================================

import { apiCall } from '@/app/lib/api';
import type {
  AiContentReport,
  ReportContentType,
  ReportReason,
  ReportStatus,
  ReportStats,
  ReportListResponse,
} from './as-types';

/**
 * Report AI-generated content.
 * Backend: POST /ai/report
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

/**
 * Get aggregate AI content quality metrics.
 * Backend: GET /ai/report-stats
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
