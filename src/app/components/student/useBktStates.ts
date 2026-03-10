// ============================================================
// Axon — Student Quiz: Shared BKT States Hook (M-2 Extraction)
//
// Extracted from KeywordMasterySection.tsx + SubtopicResultsSection.tsx
// to eliminate duplicate BKT fetch logic and reduce API calls.
//
// Given a list of QuizQuestion[], this hook:
//   1. Extracts unique subtopic IDs
//   2. Fetches BKT states from the backend (single API call)
//   3. Builds a Map<subtopicId, pKnow> for O(1) lookup
//
// FIX H5-4: Uses `cancelled` flag to prevent state update after unmount.
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import type { QuizQuestion } from '@/app/services/quizApi';
import { getBktStates } from '@/app/services/quizApi';
import type { BktState } from '@/app/services/quizApi';
import { logger } from '@/app/lib/logger';

// ── Return type ──────────────────────────────────────────

export interface UseBktStatesReturn {
  /** Raw BKT state records from the backend */
  bktStates: BktState[];
  /** O(1) lookup: subtopicId → p_know */
  bktBySubtopic: Map<string, number>;
  /** Whether any question has a subtopic_id (needed for guards/notices) */
  hasBktData: boolean;
}

// ── Hook ─────────────────────────────────────────────

export function useBktStates(questions: QuizQuestion[]): UseBktStatesReturn {
  const [bktStates, setBktStates] = useState<BktState[]>([]);

  // ── Check if BKT data is possible ──────────────────────
  const hasBktData = useMemo(
    () => questions.some(q => q.subtopic_id),
    [questions],
  );

  // ── Fetch BKT states (single API call) ─────────────────
  useEffect(() => {
    if (!hasBktData) return;

    let cancelled = false; // FIX H5-4: prevent state update after unmount

    const subtopicIds = [...new Set(
      questions.filter(q => q.subtopic_id).map(q => q.subtopic_id!),
    )];
    if (subtopicIds.length === 0) return;

    getBktStates({ subtopic_ids: subtopicIds, limit: 200 })
      .then(states => { if (!cancelled) setBktStates(states); })
      .catch(err => logger.warn('[useBktStates] BKT fetch failed (non-blocking):', err));

    return () => { cancelled = true; };
  }, [hasBktData, questions]);

  // ── Build subtopic → p_know lookup ─────────────────────
  const bktBySubtopic = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of bktStates) {
      map.set(s.subtopic_id, s.p_know);
    }
    return map;
  }, [bktStates]);

  return { bktStates, bktBySubtopic, hasBktData };
}
