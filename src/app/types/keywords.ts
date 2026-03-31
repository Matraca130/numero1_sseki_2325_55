// ============================================================
// Axon — Keyword Types & Stubs
//
// Consolidates types and minimal stubs that were previously
// spread across data/keywords.ts and services/keywordManager.ts.
// Real keyword data comes from the backend API.
// ============================================================

import type { KeywordState } from '@/app/types/student';

// ── Types ────────────────────────────────────────────────────

/** Color-based mastery level (legacy 3-tier UI display) */
/** @deprecated Use DeltaColorLevel from mastery-helpers.ts instead */
export type MasteryColor = 'red' | 'yellow' | 'green';

/** Stage-based mastery level (legacy progression stages) */
export type MasteryStage = 'none' | 'seen' | 'learning' | 'familiar' | 'mastered';

export interface AIQuestion {
  question: string;
  answer?: string;
}

export interface KeywordData {
  term: string;
  definition: string;
  relatedTerms: string[];
  masteryLevel: MasteryColor;
  aiQuestions: AIQuestion[];
  category?: string;
}

/** Record<normalizedKeyword, KeywordState> — canonical keyword collection type */
export type KeywordCollection = Record<string, KeywordState>;

// ── Mastery Config ───────────────────────────────────────────

/** @deprecated Use getDeltaColorClasses + getDeltaColorLabel from mastery-helpers.ts instead */
export const masteryConfig: Record<MasteryColor, {
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

