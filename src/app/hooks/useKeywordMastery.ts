// ============================================================
// useKeywordMastery — Keyword-level mastery from shared study-queue
//
// REFACTORED v4.4.1:
//   Now consumes useStudyQueueData instead of fetching its own
//   copy of the study-queue. Eliminates 1 of 3 duplicate fetches.
//
// MIGRATED v4.5 (Delta Mastery):
//   Uses unified Delta Mastery color system (5-tier) from
//   mastery-helpers.ts instead of hardcoded 3-tier thresholds.
//
// Accepts pre-fetched StudyQueueItem[] from useStudyQueueData,
// groups by keyword_id, computes AVG(p_know).
//
// Color mapping: Delta scale (gray/red/yellow/green/blue) via
// getKeywordDeltaColorSafe with default priority=1 (threshold 0.70).
// ============================================================

import { useCallback, useMemo } from 'react';
import type { StudyQueueItem } from '@/app/lib/studyQueueApi';
import {
  getKeywordDeltaColorSafe,
  getDeltaColorClasses,
  getDeltaColorLabel,
  type DeltaColorLevel,
} from '@/app/lib/mastery-helpers';

// ── Types ─────────────────────────────────────────────────

/** Backward-compat alias — prefer DeltaColorLevel directly */
export type MasteryLevel = DeltaColorLevel;

export interface KeywordMasteryEntry {
  keywordId: string;
  mastery: DeltaColorLevel;
  pKnow: number;       // AVG(p_know) across all cards for this keyword
  cardCount: number;    // number of cards contributing to the average
}

export interface KeywordMasteryStats {
  gray: number;
  red: number;
  yellow: number;
  green: number;
  blue: number;
  total: number;
}

export const masteryConfig = Object.fromEntries(
  (['gray', 'red', 'yellow', 'green', 'blue'] as DeltaColorLevel[]).map(level => {
    const dc = getDeltaColorClasses(level);
    return [level, {
      label: getDeltaColorLabel(level),
      color: dc.text,
      bg: dc.bg,
      border: dc.border,
      description: getDeltaColorLabel(level),
    }];
  })
) as Record<DeltaColorLevel, { label: string; color: string; bg: string; border: string; description: string }>;

// ── Helpers ───────────────────────────────────────────────

function pKnowToLevel(pKnow: number): DeltaColorLevel {
  // Default priority 1 — study queue doesn't carry keyword priority
  return getKeywordDeltaColorSafe(pKnow, 1);
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
    (keywordId: string): DeltaColorLevel | null => {
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
    let gray = 0, red = 0, yellow = 0, green = 0, blue = 0;
    for (const entry of masteryMap.values()) {
      switch (entry.mastery) {
        case 'gray': gray++; break;
        case 'red': red++; break;
        case 'yellow': yellow++; break;
        case 'green': green++; break;
        case 'blue': blue++; break;
      }
    }
    return { gray, red, yellow, green, blue, total: masteryMap.size };
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
