// ============================================================
// Axon — Platform API: AI Schedule Logs
//
// Endpoints consumed:
//   GET  /ai/schedule-logs   — Fetch AI processing logs
// ============================================================

import { apiCall } from '@/app/lib/api';

// --- Types -----------------------------------------------------------

export interface AiScheduleLog {
  id: string;
  student_id: string;
  action: string;
  model: string;
  status: 'success' | 'fallback' | 'error';
  tokens_used: number;
  latency_ms: number;
  error_message?: string;
  fallback_reason?: string;
  created_at: string;
}

// --- API Calls -------------------------------------------------------

export async function getAiScheduleLogs(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ items: AiScheduleLog[] }> {
  const query = new URLSearchParams();
  if (params?.limit != null) query.set('limit', String(params.limit));
  if (params?.offset != null) query.set('offset', String(params.offset));
  const qs = query.toString();
  return apiCall<{ items: AiScheduleLog[] }>(`/ai/schedule-logs${qs ? `?${qs}` : ''}`);
}
