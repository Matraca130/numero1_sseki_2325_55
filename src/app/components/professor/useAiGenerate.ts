// ============================================================
// Axon — Professor: AI Generation Hook (P3-S02)
//
// Extracted from AiGeneratePanel.tsx to keep it under the
// 500-line Architecture Practices limit.
//
// Manages:
//   - Generation mode (manual vs bulk)
//   - Manual: keyword selection + single question generation
//   - Bulk: count selection + pre-generate (coverage gaps)
//   - Quiz ID assignment post-generation
//   - Generation state machine (idle → generating → assigning → done/error)
//
// Stateless logic — AiGeneratePanel owns the UI rendering.
// ============================================================

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { logger } from '@/app/lib/logger';
import { getErrorMsg } from '@/app/lib/error-utils';
import * as aiApi from '@/app/services/aiApi';
import * as quizApi from '@/app/services/quizApi';
import type { KeywordRef } from '@/app/types/platform';

// ── Types ──────────────────────────────────────────────

export type GenerateMode = 'manual' | 'bulk';

export interface GenerationState {
  status: 'idle' | 'generating' | 'assigning' | 'done' | 'error';
  message: string;
  generatedCount?: number;
  failedCount?: number;
  errorDetail?: string;
}

export interface UseAiGenerateReturn {
  mode: GenerateMode;
  setMode: (m: GenerateMode) => void;
  selectedKeywordId: string;
  setSelectedKeywordId: (id: string) => void;
  count: number;
  setCount: (n: number) => void;
  genState: GenerationState;
  isProcessing: boolean;
  handleGenerate: () => void;
}

// ── Hook ─────────────────────────────────────────────

export function useAiGenerate(
  quizId: string,
  summaryId: string,
  keywords: KeywordRef[],
  onGenerated: () => void,
): UseAiGenerateReturn {
  const [mode, setMode] = useState<GenerateMode>('bulk');
  const [selectedKeywordId, setSelectedKeywordId] = useState(
    keywords.length > 0 ? keywords[0].id : '',
  );
  const [count, setCount] = useState(3);
  const [genState, setGenState] = useState<GenerationState>({
    status: 'idle',
    message: '',
  });

  const isProcessing = genState.status === 'generating' || genState.status === 'assigning';

  const assignQuizId = useCallback(
    async (questionIds: string[]): Promise<number> => {
      let assigned = 0;
      for (const qId of questionIds) {
        try {
          await quizApi.updateQuizQuestion(qId, { quiz_id: quizId });
          assigned++;
        } catch (err) {
          logger.warn(
            `[AiGenerate] Failed to assign quiz_id to question ${qId}:`,
            getErrorMsg(err),
          );
        }
      }
      return assigned;
    },
    [quizId],
  );

  const handleManualGenerate = useCallback(async () => {
    if (!selectedKeywordId) {
      toast.error('Selecciona un keyword');
      return;
    }
    setGenState({ status: 'generating', message: 'Generando pregunta con Gemini...' });
    try {
      const result = await aiApi.aiGenerate({
        action: 'quiz_question',
        summary_id: summaryId,
        keyword_id: selectedKeywordId,
      });
      setGenState({ status: 'assigning', message: 'Asignando al quiz...' });
      await assignQuizId([result.id]);
      setGenState({ status: 'done', message: 'Pregunta generada exitosamente', generatedCount: 1 });
      toast.success('Pregunta AI generada y asignada al quiz');
      onGenerated();
    } catch (err) {
      const msg = getErrorMsg(err);
      logger.error('[AiGenerate] Manual generation failed:', msg);
      setGenState({ status: 'error', message: 'Error al generar', errorDetail: msg });
      toast.error(`Error AI: ${msg}`);
    }
  }, [selectedKeywordId, summaryId, assignQuizId, onGenerated]);

  const handleBulkGenerate = useCallback(async () => {
    setGenState({ status: 'generating', message: `Generando ${count} preguntas con Gemini...` });
    try {
      const result = await aiApi.aiPreGenerate({
        summary_id: summaryId,
        action: 'quiz_question',
        count,
      });
      const generatedIds = result.generated.map(g => g.id);
      if (generatedIds.length > 0) {
        setGenState({ status: 'assigning', message: `Asignando ${generatedIds.length} preguntas al quiz...` });
        await assignQuizId(generatedIds);
      }
      setGenState({
        status: 'done',
        message: 'Generacion completada',
        generatedCount: result._meta.total_generated,
        failedCount: result._meta.total_failed,
      });
      if (result._meta.total_generated > 0) {
        toast.success(
          `${result._meta.total_generated} pregunta${result._meta.total_generated !== 1 ? 's' : ''} AI generada${result._meta.total_generated !== 1 ? 's' : ''}`,
        );
        onGenerated();
      }
      if (result._meta.total_failed > 0) {
        toast.warning(
          `${result._meta.total_failed} pregunta${result._meta.total_failed !== 1 ? 's' : ''} fallaron al generar`,
        );
      }
    } catch (err) {
      const msg = getErrorMsg(err);
      logger.error('[AiGenerate] Bulk generation failed:', msg);
      setGenState({ status: 'error', message: 'Error al generar', errorDetail: msg });
      toast.error(`Error AI: ${msg}`);
    }
  }, [summaryId, count, assignQuizId, onGenerated]);

  const handleGenerate = useCallback(() => {
    if (mode === 'manual') handleManualGenerate();
    else handleBulkGenerate();
  }, [mode, handleManualGenerate, handleBulkGenerate]);

  return {
    mode, setMode,
    selectedKeywordId, setSelectedKeywordId,
    count, setCount,
    genState,
    isProcessing,
    handleGenerate,
  };
}
