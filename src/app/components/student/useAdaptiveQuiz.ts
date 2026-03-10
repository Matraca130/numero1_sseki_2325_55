// ============================================================
// Axon — Student Quiz: Adaptive Quiz Hook
// 5-phase state machine for adaptive AI quiz generation
// ============================================================

import { useState, useCallback } from 'react';
import { generateSmartQuiz } from '@/app/services/quizApi';
import type { SmartGenerateResponse } from '@/app/services/quizApi';

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

type ErrorCategory = 'rate_limit' | 'timeout' | 'parse_error' | 'not_found' | 'forbidden' | 'unknown';
const ERROR_MESSAGES: Record<ErrorCategory, string> = {
  rate_limit: 'Limite de solicitudes alcanzado. Espera unos minutos.',
  timeout: 'La generacion tardo demasiado. Intenta con menos preguntas.',
  parse_error: 'La IA genero una respuesta malformada. Intenta de nuevo.',
  not_found: 'No se encontraron keywords o subtopics para este resumen.',
  forbidden: 'No tienes permisos para generar en este resumen.',
  unknown: 'Error al generar el quiz.',
};

function classifyError(msg: string): ErrorCategory {
  const lower = msg.toLowerCase();
  if (lower.includes('429') || lower.includes('rate limit')) return 'rate_limit';
  if (lower.includes('timeout') || lower.includes('aborted')) return 'timeout';
  if (lower.includes('json') || lower.includes('unexpected token')) return 'parse_error';
  if (lower.includes('404') || lower.includes('not found')) return 'not_found';
  if (lower.includes('403') || lower.includes('forbidden')) return 'forbidden';
  return 'unknown';
}

function getErrorMessage(msg: string): string {
  const cat = classifyError(msg);
  return cat === 'unknown' ? msg : ERROR_MESSAGES[cat];
}

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
      const title = `Quiz Adaptativo \u2014 ${now.toLocaleDateString('es', { day: '2-digit', month: 'short' })} ${now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;
      const res = await generateSmartQuiz({ action: 'quiz_question', summary_id: summaryId, count, auto_create_quiz: true, quiz_title: title });
      setResult(res);
      const createdQuizId = res._meta?.quiz_id;
      if (createdQuizId) setQuizId(createdQuizId);
      if (res.items.length === 0) {
        let errorDetail = '';
        if (res.errors?.length > 0) {
          const uniqueErrors = [...new Set(res.errors.map(e => e.error))];
          errorDetail = uniqueErrors.length === 1 ? uniqueErrors[0] : uniqueErrors.map((e, i) => `${i + 1}. ${e}`).join('\n');
        }
        setError(errorDetail ? getErrorMessage(errorDetail) : `No se generaron preguntas (${res._meta?.total_attempted || 0} intentadas).`);
        setPhase('error');
      } else if (!createdQuizId) {
        setError('Quiz generado pero no se recibio quiz_id.');
        setPhase('error');
      } else {
        setPhase('success');
      }
    } catch (err) {
      setError(getErrorMessage(err instanceof Error ? err.message : 'Error al generar el quiz.'));
      setPhase('error');
    }
  }, [count]);

  const reset = useCallback(() => { setPhase('idle'); setResult(null); setError(''); setQuizId(null); }, []);

  return { phase, count, result, error, quizId, setCount, setPhase, generate, reset };
}