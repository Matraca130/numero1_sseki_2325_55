// ============================================================
// useKeywordMastery — Keyword-level mastery from shared study-queue
//
// REFACTORED v4.4.1:
//   Now consumes useStudyQueueData instead of fetching its own
//   copy of the study-queue. Eliminates 1 of 3 duplicate fetches.
//
// Accepts pre-fetched StudyQueueItem[] from useStudyQueueData,
// groups by keyword_id, computes AVG(p_know).
//
// Color mapping: >= 0.80 → green | >= 0.50 → yellow | < 0.50 → red
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { StudyQueueItem } from '@/app/lib/studyQueueApi';

// ── Types ─────────────────────────────────────────────────

export type MasteryLevel = 'red' | 'yellow' | 'green';

export interface KeywordMasteryEntry {
  keywordId: string;
  mastery: MasteryLevel;
  pKnow: number;       // AVG(p_know) across all cards for this keyword
  cardCount: number;    // number of cards contributing to the average
}

export interface KeywordMasteryStats {
  red: number;
  yellow: number;
  green: number;
  total: number;
}

export const masteryConfig: Record<MasteryLevel, {
  label: string;
  color: string;
  bg: string;
  border: string;
  description: string;
}> = {
  red: {
    label: 'No domino',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    description: 'Necesita repaso urgente',
  },
  yellow: {
    label: 'En progreso',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    description: 'Conocimiento parcial',
  },
  green: {
    label: 'Dominado',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    description: 'Dominio consolidado',
  },
};

// ── Helpers ───────────────────────────────────────────────

function pKnowToLevel(pKnow: number): MasteryLevel {
  if (pKnow >= 0.80) return 'green';
  if (pKnow >= 0.50) return 'yellow';
  return 'red';
}

function buildKeywordMastery(
  byKeywordId: Map<string, StudyQueueItem[]>,
): Map<string, KeywordMasteryEntry> {
  const result = new Map<string, KeywordMasteryEntry>();

  for (const [kwId, items] of byKeywordId) {
    let sum = 0;
    for (const item of items) {
      sum += item.p_know;
    }
    const avg = sum / items.length;
    result.set(kwId, {
      keywordId: kwId,
      mastery: pKnowToLevel(avg),
      pKnow: avg,
      cardCount: items.length,
    });
  }

  return result;
}

// ── Hook ──────────────────────────────────────────────────

/**
 * Keyword mastery from shared study-queue data.
 *
 * @param byKeywordId - Pre-indexed map from useStudyQueueData
 * @param loading     - Loading state from useStudyQueueData
 */
export function useKeywordMastery(
  byKeywordId: Map<string, StudyQueueItem[]>,
  loading: boolean,
) {
  // Build mastery map from the pre-indexed data
  const masteryMap = useMemo(
    () => buildKeywordMastery(byKeywordId),
    [byKeywordId],
  );

  // ── Derived helpers ─────────────────────────────────────

  /** Get mastery level for a specific keyword */
  const getMastery = useCallback(
    (keywordId: string): MasteryLevel | null => {
      return masteryMap.get(keywordId)?.mastery ?? null;
    },
    [masteryMap],
  );

  /** Get p_know for a specific keyword */
  const getPKnow = useCallback(
    (keywordId: string): number | null => {
      return masteryMap.get(keywordId)?.pKnow ?? null;
    },
    [masteryMap],
  );

  /** Summary stats across all keywords — single pass */
  const getStats = useCallback((): KeywordMasteryStats => {
    let red = 0, yellow = 0, green = 0;
    for (const entry of masteryMap.values()) {
      switch (entry.mastery) {
        case 'red': red++; break;
        case 'yellow': yellow++; break;
        case 'green': green++; break;
      }
    }
    return { red, yellow, green, total: masteryMap.size };
  }, [masteryMap]);

  /** All entries sorted by mastery (weakest first) */
  const getSortedEntries = useCallback((): KeywordMasteryEntry[] => {
    return Array.from(masteryMap.values()).sort((a, b) => a.pKnow - b.pKnow);
  }, [masteryMap]);

  return {
    masteryMap,
    loading,
    getMastery,
    getPKnow,
    getStats,
    getSortedEntries,
  };
}
