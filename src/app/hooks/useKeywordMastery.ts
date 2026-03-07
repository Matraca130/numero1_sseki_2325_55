// ============================================================
// useKeywordMastery — Stub (original deleted during poda)
//
// Returns no-op functions so SummarySessionNew compiles.
// TODO: Re-implement when keyword mastery feature is built
//       against the real backend.
// ============================================================

import { useState, useCallback } from 'react';
import type { MasteryLevel, KeywordData } from '@/app/types/legacy-stubs';

export interface KeywordMasteryState {
  keywordMastery: Record<string, MasteryLevel>;
  setKeywordMastery: (km: Record<string, MasteryLevel>) => void;
  updateMastery: (term: string, level: MasteryLevel) => void;
  getMastery: (term: string) => MasteryLevel;
  getAnnotationStats: () => { total: number; mastered: number; learning: number; seen: number; none: number };
  getAnnotatedKeywords: () => KeywordData[];
}

export function useKeywordMastery(): KeywordMasteryState {
  const [keywordMastery, setKeywordMastery] = useState<Record<string, MasteryLevel>>({});

  const updateMastery = useCallback((term: string, level: MasteryLevel) => {
    setKeywordMastery(prev => ({ ...prev, [term]: level }));
  }, []);

  const getMastery = useCallback((term: string): MasteryLevel => {
    return keywordMastery[term] || 'none';
  }, [keywordMastery]);

  const getAnnotationStats = useCallback(() => {
    return { total: 0, mastered: 0, learning: 0, seen: 0, none: 0 };
  }, []);

  const getAnnotatedKeywords = useCallback((): KeywordData[] => {
    return [];
  }, []);

  return {
    keywordMastery,
    setKeywordMastery,
    updateMastery,
    getMastery,
    getAnnotationStats,
    getAnnotatedKeywords,
  };
}
