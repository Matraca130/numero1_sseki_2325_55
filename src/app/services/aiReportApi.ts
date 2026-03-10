// ============================================================
// Axon — AI Content Report API Service (Fase D)
//
// Endpoints:
//   POST  /ai/report      — Create a report on AI-generated content
//   PATCH /ai/report/:id  — Resolve/update a report
//   GET   /ai/report-stats — Aggregate quality metrics (RPC)
//   GET   /ai/reports      — Paginated report listing
//
// Extracted from aiApi.ts to keep under 500-line architectural limit.
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────────

export type AiReportContentType = 'quiz_question' | 'flashcard';

export type AiReportReason =
  | 'incorrect'
  | 'inappropriate'
  | 'low_quality'
  | 'irrelevant'
  | 'other';

export type AiReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

// ── Display Constants ─────────────────────────────────────

export const REPORT_REASON_LABELS: Record<AiReportReason, string> = {
  incorrect: 'Respuesta incorrecta',
  inappropriate: 'Contenido inapropiado',
  low_quality: 'Baja calidad',
  irrelevant: 'Irrelevante al tema',
  other: 'Otro motivo',
};

export const REPORT_STATUS_LABELS: Record<AiReportStatus, string> = {
  pending: 'Pendiente',
  reviewed: 'En revision',
  resolved: 'Resuelto',
  dismissed: 'Descartado',
};

export const REPORT_STATUS_COLORS: Record<AiReportStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  reviewed: 'bg-blue-100 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  dismissed: 'bg-zinc-100 text-zinc-500 border-zinc-200',
};

// ── Interfaces ────────────────────────────────────────────

export interface AiContentReport {
  id: string;
  content_type: AiReportContentType;
  content_id: string;
  reported_by: string;
  institution_id: string;
  reason: AiReportReason;
  description: string | null;
  status: AiReportStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
}

export interface CreateAiReportParams {
  content_type: AiReportContentType;
  content_id: string;
  reason: AiReportReason;
  description?: string;
}

export interface ResolveAiReportParams {
  status: AiReportStatus;
  resolution_note?: string;
}

export interface AiReportStats {
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

export interface AiReportsListResponse {
  items: AiContentReport[];
  total: number;
  limit: number;
  offset: number;
}

export interface AiReportsListParams {
  institution_id: string;
  status?: AiReportStatus;
  reason?: AiReportReason;
  content_type?: AiReportContentType;
  limit?: number;
  offset?: number;
}

// ── Service Functions ─────────────────────────────────────

export async function createAiReport(
  params: CreateAiReportParams
): Promise<AiContentReport> {
  return apiCall<AiContentReport>('/ai/report', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function resolveAiReport(
  reportId: string,
  params: ResolveAiReportParams
): Promise<AiContentReport> {
  return apiCall<AiContentReport>(`/ai/report/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  });
}

export async function getAiReportStats(
  institutionId: string,
  from?: string,
  to?: string
): Promise<AiReportStats> {
  const params = new URLSearchParams({ institution_id: institutionId });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return apiCall<AiReportStats>(`/ai/report-stats?${params.toString()}`);
}

export async function getAiReports(
  params: AiReportsListParams
): Promise<AiReportsListResponse> {
  const qs = new URLSearchParams({ institution_id: params.institution_id });
  if (params.status) qs.set('status', params.status);
  if (params.reason) qs.set('reason', params.reason);
  if (params.content_type) qs.set('content_type', params.content_type);
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.offset) qs.set('offset', String(params.offset));
  return apiCall<AiReportsListResponse>(`/ai/reports?${qs.toString()}`);
}
