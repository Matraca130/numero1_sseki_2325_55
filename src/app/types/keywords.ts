// ============================================================
// Axon — Keyword Types & Stubs
//
// Consolidates types and minimal stubs that were previously
// spread across data/keywords.ts and services/keywordManager.ts.
// Real keyword data comes from the backend API.
// ============================================================

// ── Types ────────────────────────────────────────────────────

export type MasteryLevel = 'red' | 'yellow' | 'green';

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

/** Record<term, KeywordData> — used by SmartFlashcardGenerator */
export type KeywordCollection = Record<string, KeywordData>;

// ── Mastery Config ───────────────────────────────────────────

export const masteryConfig: Record<MasteryLevel, {
  label: string;
  color: string;
  bg: string;
  border: string;
  description: string;
}> = {
  red: {
    label: 'Nao sei',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    description: 'Precisa de revisao urgente',
  },
  yellow: {
    label: 'Mais ou menos',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    description: 'Conhecimento parcial',
  },
  green: {
    label: 'Sei bem',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    description: 'Dominio consolidado',
  },
};

// ── Stub functions (previously in data/keywords.ts) ──────────

export function findKeyword(_term: string): KeywordData | null {
  return null;
}

export function getAllKeywordTerms(): string[] {
  return [];
}

// ── Stub functions (previously in services/keywordManager.ts) ─

export function getKeywordsNeedingCards(
  _keywords: KeywordCollection,
): KeywordData[] {
  return [];
}

export function getKeywordStats(
  keywords: KeywordCollection,
): { total: number; covered: number; uncovered: number } {
  const total = Object.keys(keywords).length;
  return { total, covered: 0, uncovered: total };
}
