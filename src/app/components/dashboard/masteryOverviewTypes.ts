// ============================================================
// Axon — MasteryOverview: Types, color helpers & filter logic
// Extracted from MasteryOverview.tsx for modularization.
// ============================================================

// ── Types ────────────────────────────────────────────────

export interface KeywordRaw {
  id: string;
  name: string;
  definition?: string | null;
  summary_id: string;
  priority: number;
  is_active?: boolean;
}

export interface SubtopicRaw {
  id: string;
  keyword_id: string;
  name: string;
  order_index: number;
  is_active?: boolean;
}

export interface SummaryRef {
  id: string;
  title?: string | null;
  topic_id: string;
}

export interface TopicRef {
  id: string;
  name: string;
  courseName: string;
}

export interface KeywordMastery {
  keyword: KeywordRaw;
  topicName: string;
  courseName: string;
  pKnow: number | null; // null = no data
  subtopicCount: number;
  subtopicBkt: Map<string, number>; // subtopic_id → p_know
}

export interface SubtopicMastery {
  subtopic: SubtopicRaw;
  pKnow: number | null;
}

// ── Mastery color helpers (Delta Mastery Scale) ─────────────

import {
  getKeywordDeltaColorSafe,
  getDeltaColorClasses,
  getDeltaColorLabel,
  type DeltaColorLevel,
} from '@/app/lib/mastery-helpers';

export function getMasteryColor(pKnow: number | null, priority: number = 1) {
  const level = getKeywordDeltaColorSafe(pKnow, priority);
  const dc = getDeltaColorClasses(level);
  const label = getDeltaColorLabel(level);
  return { bg: dc.bg, text: dc.text, bar: dc.dot, label };
}

export function getMasteryDot(pKnow: number | null, priority: number = 1): string {
  const level = getKeywordDeltaColorSafe(pKnow, priority);
  return getDeltaColorClasses(level).dot;
}

// ── Filter types & logic ─────────────────────────────

export type MasteryFilter = 'all' | 'descubrir' | 'emergente' | 'progreso' | 'consolidado' | 'maestria';

export const FILTER_OPTIONS: { value: MasteryFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'descubrir', label: 'Por descubrir' },
  { value: 'emergente', label: 'Emergente' },
  { value: 'progreso', label: 'En progreso' },
  { value: 'consolidado', label: 'Consolidado' },
  { value: 'maestria', label: 'Maestría' },
];

export function matchesFilter(pKnow: number | null, filter: MasteryFilter, priority: number = 1): boolean {
  if (filter === 'all') return true;
  const level = getKeywordDeltaColorSafe(pKnow, priority);
  switch (filter) {
    case 'descubrir': return level === 'gray';
    case 'emergente': return level === 'red';
    case 'progreso': return level === 'yellow';
    case 'consolidado': return level === 'green';
    case 'maestria': return level === 'blue';
    default: return true;
  }
}
