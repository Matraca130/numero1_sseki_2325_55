// ============================================================
// Axon — Student Quiz: Adaptive Quiz Hook
//
// Extracted from QuizResults.tsx (P2-S02) to keep QuizResults
// under the 500-line Architecture Practices limit.
//
// Manages:
//   - 5-phase state machine (idle → config → generating → success/error)
//   - Question count selection
//   - generateSmartQuiz() API call with structured error handling
//   - Quiz ID tracking for in-place navigation
// ============================================================

import { useState, useCallback } from 'react';
import { generateSmartQuiz } from '@/app/services/quizApi';
import type { SmartGenerateResponse } from '@/app/services/quizApi';

// ── Types ────────────────────────────────────────────

export type AdaptivePhase = 'idle' | 'config' | 'generating' | 'success' | 'error';

export interface UseAdaptiveQuizReturn {
  phase: AdaptivePhase;
  count: number;
  result: SmartGenerateResponse | null;
  error: string;
  quizId: string | null;
  setCount: (n: number) => void;
  setPhase: (p: AdaptivePhase) => void;
  generate: (summaryId: string) => Promise<void>;
  reset: () => void;
}

// ── Error Classification (P2-S03) ──────────────────────

type ErrorCategory = 'rate_limit' | 'timeout' | 'parse_error' | 'not_found' | 'forbidden' | 'unknown';

const ERROR_MESSAGES: Record<ErrorCategory, string> = {
  rate_limit: 'Limite de solicitudes alcanzado. Espera unos minutos e intenta de nuevo.',
  timeout: 'La generacion tardo demasiado (>2 min). Intenta con menos preguntas o verifica tu conexion.',
  parse_error: 'La IA genero una respuesta malformada. Esto es temporal — intenta de nuevo con menos preguntas.',
  not_found: 'No se encontraron keywords o subtopics para este resumen. Pide a tu profesor que agregue contenido.',
  forbidden: 'No tienes permisos para generar en este resumen. Verifica tu membresia.',
  unknown: 'Error al generar el quiz.',
};

function classifyError(msg: string): ErrorCategory {
  const lower = msg.toLowerCase();
  if (lower.includes('429') || lower.includes('rate limit')) return 'rate_limit';
  if (lower.includes('timeout') || lower.includes('aborted')) return 'timeout';
  if (lower.includes('unterminated string') || lower.includes('json') || lower.includes('unexpected token') || lower.includes('invalid response')) return 'parse_error';
  if (lower.includes('404') || lower.includes('not found') || lower.includes('no keywords')) return 'not_found';
  if (lower.includes('403') || lower.includes('forbidden') || lower.includes('permission')) return 'forbidden';
  return 'unknown';
}

function getErrorMessage(msg: string): string {
  const category = classifyError(msg);
  return category === 'unknown' ? msg : ERROR_MESSAGES[category];
}

// ── Hook ─────────────────────────────────────────────

export function useAdaptiveQuiz(): UseAdaptiveQuizReturn {
  const [phase, setPhase] = useState<AdaptivePhase>('idle');
  const [count, setCount] = useState(5);
  const [result, setResult] = useState<SmartGenerateResponse | null>(null);
  const [error, setError] = useState('');
  const [quizId, setQuizId] = useState<string | null>(null);

  const generate = useCallback(async (summaryId: string) => {
    setPhase('generating');
    setError('');
    try {
      if (!summaryId) throw new Error('No se pudo determinar el resumen.');

      const now = new Date();
      const title = `Quiz Adaptativo — ${now.toLocaleDateString('es', { day: '2-digit', month: 'short' })} ${now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;

      const res = await generateSmartQuiz({
        action: 'quiz_question',
        summary_id: summaryId,
        count,
        auto_create_quiz: true,
        quiz_title: title,
      });

      setResult(res);
      const createdQuizId = res._meta?.quiz_id;
      if (createdQuizId) setQuizId(createdQuizId);

      if (res.items.length === 0) {
        let errorDetail = '';
        if (res.errors && res.errors.length > 0) {
          const uniqueErrors = [...new Set(res.errors.map(e => e.error))];
          errorDetail = uniqueErrors.length === 1
            ? uniqueErrors[0]
            : uniqueErrors.map((e, i) => `${i + 1}. ${e}`).join('\n');
        }
        if (errorDetail) {
          setError(getErrorMessage(errorDetail));
        } else {
          setError(
            `No se generaron preguntas (${res._meta?.total_attempted || 0} intentadas, ${res._meta?.total_failed || 0} fallidas). ` +
            'Verifica que el resumen tenga keywords con subtopics asignados.'
          );
        }
        setPhase('error');
      } else if (!createdQuizId) {
        setError('Quiz generado pero no se recibio quiz_id. Contacta soporte.');
        setPhase('error');
      } else {
        setPhase('success');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al generar el quiz.';
      setError(getErrorMessage(msg));
      setPhase('error');
    }
  }, [count]);

  const reset = useCallback(() => {
    setPhase('idle');
    setResult(null);
    setError('');
    setQuizId(null);
  }, []);

  return { phase, count, result, error, quizId, setCount, setPhase, generate, reset };
}
