// ============================================================
// Axon — Keyword Types & Stubs
//
// Consolidates types and minimal stubs that were previously
// spread across data/keywords.ts and services/keywordManager.ts.
// Real keyword data comes from the backend API.
// ============================================================

import type { KeywordState } from '@/app/types/student';

// ── Types ────────────────────────────────────────────────────

/** Stage-based mastery level (canonical 5-tier progression) */
export type MasteryStage = 'none' | 'seen' | 'learning' | 'familiar' | 'mastered';

/**
 * Canonical mastery level type — alias for MasteryStage.
 * Previously had a divergent 3-tier color definition ('red'|'yellow'|'green').
 * Unified to MasteryStage in BH-ERR-021.
 */
export type MasteryLevel = MasteryStage;

export interface AIQuestion {
  question: string;
  answer?: string;
}

export interface KeywordData {
  term: string;
  definition: string;
  relatedTerms: string[];
  masteryLevel: MasteryLevel;
  aiQuestions: AIQuestion[];
  category?: string;
}

/** Record<normalizedKeyword, KeywordState> — canonical keyword collection type */
export type KeywordCollection = Record<string, KeywordState>;

// ── Stub functions (previously in data/keywords.ts) ──────────

export function findKeyword(_term: string): KeywordData | null {
  return null;
}

export function getAllKeywordTerms(): string[] {
  return [];
}

// ── Stub functions (previously in services/keywordManager.ts) ─

export interface KeywordNeed {
  keyword: string;
  coverage: number;
  needScore: number;
}

export function getKeywordsNeedingCards(
  _keywords: KeywordCollection,
  _minCoverage?: number,
  _maxResults?: number,
): KeywordNeed[] {
  return [];
}

export function getKeywordStats(
  keywords: KeywordCollection,
): { total: number; covered: number; uncovered: number } {
  const total = Object.keys(keywords).length;
  return { total, covered: 0, uncovered: total };
}
