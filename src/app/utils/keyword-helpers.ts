// ============================================================
// Keyword helpers — runtime logic extracted from types/keywords.ts
// ============================================================

import type { KeywordCollection } from '@/app/types/keywords';

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
