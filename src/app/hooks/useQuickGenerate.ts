// ============================================================
// Axon — useQuickGenerate Hook (v4.5)
//
// Lightweight hook for generating a SINGLE flashcard via
// POST /ai/generate-smart with BKT targeting. Designed for
// the professor toolbar "Generar 1 con IA" button.
//
// Dependencies:
//   - aiService.generateSmart() — handles double-token + rate limit
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { generateSmart, type SmartTargetMeta } from '@/app/services/aiService';

// ── Types ─────────────────────────────────────────────────

export type QuickGeneratePhase = 'idle' | 'generating' | 'done' | 'error';

export interface QuickGeneratedCard {
  id: string;
  front: string;
  back: string;
  summary_id: string;
  keyword_id: string;
  subtopic_id: string | null;
  _smart?: SmartTargetMeta;
}

interface QuickGenerateParams {
  summaryId: string;
  institutionId?: string;
}

// ── Hook ──────────────────────────────────────────────────

export function useQuickGenerate() {
  const [phase, setPhase] = useState<QuickGeneratePhase>('idle');
  const [generatedCard, setGeneratedCard] = useState<QuickGeneratedCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isGeneratingRef = useRef(false);

  const quickGenerate = useCallback(async (params: QuickGenerateParams): Promise<QuickGeneratedCard | null> => {
    if (isGeneratingRef.current) return null;
    isGeneratingRef.current = true;

    setPhase('generating');
    setError(null);
    setGeneratedCard(null);

    try {
      const response = await generateSmart({
        action: 'flashcard',
        summaryId: params.summaryId,
        institutionId: params.institutionId,
        related: true,
        count: 1,
      });

      if (!response?.id || !response?.front || !response?.back) {
        throw new Error('Respuesta invalida del servidor: faltan campos obligatorios.');
      }

      const card: QuickGeneratedCard = {
        id: response.id,
        front: response.front,
        back: response.back,
        summary_id: response.summary_id ?? params.summaryId,
        keyword_id: response.keyword_id ?? '',
        subtopic_id: response.subtopic_id ?? null,
        _smart: response._smart,
      };

      setGeneratedCard(card);
      setPhase('done');
      return card;
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : 'Error desconocido al generar flashcard.';
      setError(message);
      setPhase('error');
      if (import.meta.env.DEV) {
        console.warn('[useQuickGenerate] Error:', message);
      }
      return null;
    } finally {
      isGeneratingRef.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    setPhase('idle');
    setGeneratedCard(null);
    setError(null);
  }, []);

  return { phase, generatedCard, error, quickGenerate, reset };
}
