// ============================================================
// Axon — Student Quiz: Shared BKT States Hook (M-2 Extraction)
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

export interface UseBktStatesReturn {
  bktStates: BktState[];
  bktBySubtopic: Map<string, number>;
  hasBktData: boolean;
}

export function useBktStates(questions: QuizQuestion[]): UseBktStatesReturn {
  const [bktStates, setBktStates] = useState<BktState[]>([]);

  const hasBktData = useMemo(
    () => questions.some(q => q.subtopic_id),
    [questions],
  );

  useEffect(() => {
    if (!hasBktData) return;
    let cancelled = false;
    const subtopicIds = [...new Set(
      questions.filter(q => q.subtopic_id).map(q => q.subtopic_id!),
    )];
    if (subtopicIds.length === 0) return;
    getBktStates({ subtopic_ids: subtopicIds, limit: 200 })
      .then(states => { if (!cancelled) setBktStates(states); })
      .catch(err => logger.warn('[useBktStates] BKT fetch failed (non-blocking):', err));
    return () => { cancelled = true; };
  }, [hasBktData, questions]);

  const bktBySubtopic = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of bktStates) map.set(s.subtopic_id, s.p_know);
    return map;
  }, [bktStates]);

  return { bktStates, bktBySubtopic, hasBktData };
}