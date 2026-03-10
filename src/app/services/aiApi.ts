// ============================================================
// Axon — AI API Service (quiz-scoped)
//
// Frontend wrappers for backend AI generation endpoints:
//   POST /ai/generate       — Manual: professor/student picks keyword
//   POST /ai/generate-smart — Adaptive: backend picks weakest keyword via NeedScore
//   POST /ai/pre-generate   — Bulk: professor fills coverage gaps (up to 5)
//
// Each endpoint auto-inserts generated content into quiz_questions or flashcards.
// This service only transports typed parameters and returns typed responses.
// ============================================================

import { apiCall } from '@/app/lib/api';
import type { QuizQuestion } from '@/app/services/quizApi';

// ── Shared Types ──────────────────────────────────────────

export type AiAction = 'quiz_question' | 'flashcard';

export interface AiTokenUsage {
  input: number;
  output: number;
}

export interface AiMeta {
  model: string;
  tokens: AiTokenUsage;
}

// ── POST /ai/generate — Manual Generation ─────────────────

export interface AiGenerateParams {
  action: AiAction;
  summary_id: string;
  keyword_id?: string;
  subtopic_id?: string;
  block_id?: string;
  wrong_answer?: string;
  related?: boolean;
}

export interface AiGenerateQuizResult extends QuizQuestion {
  _meta: AiMeta & {
    had_wrong_answer: boolean;
  };
}

export interface AiGenerateFlashcardResult {
  id: string;
  summary_id: string;
  keyword_id: string;
  subtopic_id: string | null;
  front: string;
  back: string;
  source: 'ai';
  created_by: string;
  created_at: string;
  _meta: AiMeta & {
    related: boolean;
  };
}

export type AiGenerateResult = AiGenerateQuizResult | AiGenerateFlashcardResult;

export async function aiGenerate(params: AiGenerateParams): Promise<AiGenerateResult> {
  return apiCall<AiGenerateResult>('/ai/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ── POST /ai/generate-smart — Adaptive Generation ─────────

export interface AiGenerateSmartParams {
  action: AiAction;
  institution_id?: string;
  related?: boolean;
}

export interface AiSmartInfo {
  target_keyword: string;
  target_summary: string;
  target_subtopic: string | null;
  p_know: number;
  need_score: number;
  primary_reason: 'new_concept' | 'low_mastery' | 'needs_review' | 'moderate_mastery' | 'reinforcement';
  was_deduped: boolean;
  candidates_evaluated: number;
}

export interface AiGenerateSmartQuizResult extends QuizQuestion {
  _meta: AiMeta;
  _smart: AiSmartInfo;
}

export interface AiGenerateSmartFlashcardResult {
  id: string;
  summary_id: string;
  keyword_id: string;
  subtopic_id: string | null;
  front: string;
  back: string;
  source: 'ai';
  created_by: string;
  created_at: string;
  _meta: AiMeta & {
    related: boolean;
  };
  _smart: AiSmartInfo;
}

export type AiGenerateSmartResult = AiGenerateSmartQuizResult | AiGenerateSmartFlashcardResult;

export async function aiGenerateSmart(
  params: AiGenerateSmartParams
): Promise<AiGenerateSmartResult> {
  return apiCall<AiGenerateSmartResult>('/ai/generate-smart', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ── POST /ai/pre-generate — Bulk Professor Generation ─────

export interface AiPreGenerateParams {
  summary_id: string;
  action: AiAction;
  count?: number;
}

export interface AiPreGenerateItem {
  type: 'quiz_question' | 'flashcard';
  id: string;
  keyword_id: string;
  keyword_name: string;
}

export interface AiPreGenerateError {
  keyword_id: string;
  keyword_name: string;
  error: string;
}

export interface AiPreGenerateMeta {
  model: string;
  summary_id: string;
  summary_title: string;
  action: AiAction;
  total_attempted: number;
  total_generated: number;
  total_failed: number;
  total_keywords_in_summary: number;
  tokens: AiTokenUsage;
}

export interface AiPreGenerateResult {
  generated: AiPreGenerateItem[];
  errors: AiPreGenerateError[];
  _meta: AiPreGenerateMeta;
}

export async function aiPreGenerate(
  params: AiPreGenerateParams
): Promise<AiPreGenerateResult> {
  return apiCall<AiPreGenerateResult>('/ai/pre-generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ── Utility: Type guards ──────────────────────────────────

export function isAiQuizResult(
  result: AiGenerateResult
): result is AiGenerateQuizResult {
  return 'question' in result && 'correct_answer' in result;
}

export function isAiSmartQuizResult(
  result: AiGenerateSmartResult
): result is AiGenerateSmartQuizResult {
  return 'question' in result && 'correct_answer' in result;
}

export function isAiFlashcardResult(
  result: AiGenerateResult
): result is AiGenerateFlashcardResult {
  return 'front' in result && 'back' in result;
}

export function isAiSmartFlashcardResult(
  result: AiGenerateSmartResult
): result is AiGenerateSmartFlashcardResult {
  return 'front' in result && 'back' in result;
}

// ── Utility: Reason labels (Spanish) ─────────────────────

const REASON_LABELS: Record<AiSmartInfo['primary_reason'], string> = {
  new_concept: 'Concepto nuevo que aun no has estudiado',
  low_mastery: 'Dominio bajo — necesitas reforzar',
  needs_review: 'Dominio moderado-bajo — un repaso te ayudara',
  moderate_mastery: 'Dominio intermedio — puedes profundizar',
  reinforcement: 'Dominio alto — mantenimiento del conocimiento',
};

export function getReasonLabel(
  reason: AiSmartInfo['primary_reason'],
  pKnow?: number
): string {
  const base = REASON_LABELS[reason] || 'Concepto seleccionado para estudio';
  if (pKnow != null) {
    return `${base} (${Math.round(pKnow * 100)}%)`;
  }
  return base;
}

// ── Utility: Mastery color (BKT thresholds from Guidelines) ──

export type MasteryLevel = 'high' | 'medium' | 'low';

export function getMasteryLevel(pKnow: number): {
  level: MasteryLevel;
  color: string;
  label: string;
} {
  if (pKnow >= 0.80) {
    return { level: 'high', color: '#22c55e', label: 'Dominado' };
  }
  if (pKnow >= 0.50) {
    return { level: 'medium', color: '#eab308', label: 'En progreso' };
  }
  return { level: 'low', color: '#ef4444', label: 'Necesita refuerzo' };
}

// ── Re-exports from aiReportApi.ts ────────────────────────

export {
  createAiReport,
  resolveAiReport,
  getAiReportStats,
  getAiReports,
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_COLORS,
} from '@/app/services/aiReportApi';

export type {
  AiReportContentType,
  AiReportReason,
  AiReportStatus,
  AiContentReport,
  CreateAiReportParams,
  ResolveAiReportParams,
  AiReportStats,
  AiReportsListResponse,
  AiReportsListParams,
} from '@/app/services/aiReportApi';
