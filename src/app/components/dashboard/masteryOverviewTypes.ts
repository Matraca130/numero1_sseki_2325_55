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

// ── Mastery color helpers (5-tier BKT scale) ─────────────

export function getMasteryColor(pKnow: number | null) {
  if (pKnow === null) return { bg: 'bg-gray-100', text: 'text-gray-400', bar: 'bg-gray-300', label: 'Sin datos' };
  if (pKnow < 0.3) return { bg: 'bg-red-50', text: 'text-red-600', bar: 'bg-red-500', label: 'Critico' };
  if (pKnow < 0.5) return { bg: 'bg-orange-50', text: 'text-orange-600', bar: 'bg-orange-500', label: 'Debil' };
  if (pKnow < 0.7) return { bg: 'bg-yellow-50', text: 'text-amber-600', bar: 'bg-yellow-500', label: 'En progreso' };
  if (pKnow < 0.85) return { bg: 'bg-blue-50', text: 'text-blue-600', bar: 'bg-blue-500', label: 'Bueno' };
  return { bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500', label: 'Dominado' };
}

export function getMasteryDot(pKnow: number | null): string {
  if (pKnow === null) return 'bg-gray-300';
  if (pKnow < 0.3) return 'bg-red-500';
  if (pKnow < 0.5) return 'bg-orange-500';
  if (pKnow < 0.7) return 'bg-yellow-500';
  if (pKnow < 0.85) return 'bg-blue-500';
  return 'bg-emerald-500';
}

// ── Filter types & logic ─────────────────────────────

export type MasteryFilter = 'all' | 'critical' | 'weak' | 'progress' | 'good' | 'mastered';

export const FILTER_OPTIONS: { value: MasteryFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'critical', label: 'Criticos (< 30%)' },
  { value: 'weak', label: 'Debiles (< 50%)' },
  { value: 'progress', label: 'En progreso' },
  { value: 'good', label: 'Buenos' },
  { value: 'mastered', label: 'Dominados (≥ 85%)' },
];

export function matchesFilter(pKnow: number | null, filter: MasteryFilter): boolean {
  if (filter === 'all') return true;
  if (pKnow === null) return filter === 'all';
  switch (filter) {
    case 'critical': return pKnow < 0.3;
    case 'weak': return pKnow >= 0.3 && pKnow < 0.5;
    case 'progress': return pKnow >= 0.5 && pKnow < 0.7;
    case 'good': return pKnow >= 0.7 && pKnow < 0.85;
    case 'mastered': return pKnow >= 0.85;
    default: return true;
  }
}
