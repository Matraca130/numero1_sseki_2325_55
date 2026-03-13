// ============================================================
// Axon — StudyHub shared helpers & constants
// Extracted from StudyHubView.tsx (zero functional changes)
// ============================================================
import type { TreeSection } from '@/app/services/contentTreeApi';
import type { StudySession } from '@/app/types/student';

// ── Relative time formatter ──────────────────────────────────

/** Formats an ISO date string as a relative time string (e.g. "hace 2 días") */
export function formatRelativeTime(isoDate: string | undefined | null): string | undefined {
  if (!isoDate) return undefined;
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  if (isNaN(then)) return undefined;

  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'justo ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'hace 1 día';
  if (diffD < 30) return `hace ${diffD} días`;
  const diffM = Math.floor(diffD / 30);
  return diffM === 1 ? 'hace 1 mes' : `hace ${diffM} meses`;
}

// ── Section progress computation ─────────────────────────────

export interface SectionProgress {
  completedTopics: number;
  progress: number; // 0-100
  lastActivity: string | undefined;
  nextTopicName: string | undefined;
}

/** Compute per-section stats from real sessions + courseProgress */
export function computeSectionProgress(
  section: TreeSection,
  sessions: StudySession[],
  courseProgressTopicIds: Set<string>,
): SectionProgress {
  const topicIds = new Set(section.topics.map(t => t.id));

  // A topic counts as "touched" if it has at least 1 session OR appears in courseProgress
  const touchedTopicIds = new Set<string>();
  let latestSessionDate: string | undefined;

  for (const s of sessions) {
    if (s.topicId && topicIds.has(s.topicId)) {
      touchedTopicIds.add(s.topicId);
      if (!latestSessionDate || s.startedAt > latestSessionDate) {
        latestSessionDate = s.startedAt;
      }
    }
  }
  // Also count topics from courseProgress (bkt-states — when available)
  for (const tid of courseProgressTopicIds) {
    if (topicIds.has(tid)) touchedTopicIds.add(tid);
  }

  const completedTopics = touchedTopicIds.size;
  const progress = section.topics.length > 0
    ? Math.round((completedTopics / section.topics.length) * 100)
    : 0;

  // Next topic = first topic in order that hasn't been touched
  const nextTopic = section.topics.find(t => !touchedTopicIds.has(t.id));

  return {
    completedTopics,
    progress,
    lastActivity: formatRelativeTime(latestSessionDate),
    nextTopicName: nextTopic?.name,
  };
}

// ── Visual constants ─────────────────────────────────────────

/** Accent palette: cycles through colors per section index */
export const SECTION_ACCENTS = [
  { border: 'border-t-teal-500',   bar: 'bg-teal-500',   iconBg: 'bg-teal-50',  iconText: 'text-teal-600',  icon: '🫀' },
  { border: 'border-t-blue-500',   bar: 'bg-blue-500',   iconBg: 'bg-blue-50',   iconText: 'text-blue-600',  icon: '🦠' },
  { border: 'border-t-amber-500',  bar: 'bg-amber-500',  iconBg: 'bg-amber-50',  iconText: 'text-amber-600', icon: '🔬' },
  { border: 'border-t-pink-500',   bar: 'bg-pink-500',   iconBg: 'bg-pink-50',   iconText: 'text-pink-600',  icon: '🧬' },
] as const;

/** Hex colors for inline styles on section cards */
export const SECTION_COLORS = ['#14b8a6', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'] as const;
