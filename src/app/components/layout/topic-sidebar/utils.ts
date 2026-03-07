// ============================================================
// TopicSidebar — Utility helpers
//
// Transforms ContentTree into flat SidebarSection[] for rendering.
// Accepts optional TopicProgress map for mastery-aware status.
// ============================================================

import type { NodeStatus, SidebarSection, SidebarTopic, CourseInfo } from './types';
import type { ContentTree } from '@/app/services/contentTreeApi';
import type { TopicProgress } from '@/app/hooks/useTopicProgress';

// ── Status helpers ────────────────────────────────────────

/** Derive section status from its children topics */
export function deriveSectionStatus(topics: SidebarTopic[]): NodeStatus {
  if (topics.length === 0) return 'empty';
  const statuses = topics.map(t => t.status);
  if (statuses.every(s => s === 'mastered')) return 'mastered';
  if (statuses.some(s => s === 'learning' || s === 'mastered')) return 'learning';
  if (statuses.some(s => s === 'new')) return 'new';
  return 'empty';
}

/** Compute section progress % from topic mastery */
export function sectionProgressPct(
  topics: SidebarTopic[],
  progressMap: Map<string, TopicProgress>,
): number {
  const entries = topics
    .map(t => progressMap.get(t.id))
    .filter((p): p is TopicProgress => !!p && p.totalCards > 0);

  if (entries.length === 0) return 0;
  const avg = entries.reduce((s, e) => s + e.pKnow, 0) / entries.length;
  return Math.round(avg * 100);
}

// ── Tree → flat sidebar data ──────────────────────────────

/** Build flat SidebarSection[] from ContentTree + optional progress. */
export function buildSidebarSections(
  tree: ContentTree | null,
  progressMap?: Map<string, TopicProgress>,
): SidebarSection[] {
  if (!tree || tree.courses.length === 0) return [];

  const course = tree.courses[0];
  const sections: SidebarSection[] = [];

  for (const sem of course.semesters || []) {
    for (const sec of sem.sections || []) {
      const topics: SidebarTopic[] = (sec.topics || []).map(t => {
        const progress = progressMap?.get(t.id);
        const status: NodeStatus = progress ? progress.status : 'empty';
        return { id: t.id, name: t.name, status, isNext: false };
      });

      // Mark the first non-mastered topic as "next" (only if it has cards)
      const nextIdx = topics.findIndex(t => {
        if (t.status === 'mastered') return false;
        const p = progressMap?.get(t.id);
        return p ? p.totalCards > 0 : false;
      });
      if (nextIdx >= 0) topics[nextIdx].isNext = true;

      sections.push({
        id: sec.id,
        name: sec.name,
        status: deriveSectionStatus(topics),
        topics,
      });
    }
  }

  return sections;
}

/** Build CourseInfo from ContentTree + optional progress. */
export function buildCourseInfo(
  tree: ContentTree | null,
  overallProgress?: { pct: number; totalCards: number; dueCards: number },
): CourseInfo {
  if (!tree || tree.courses.length === 0) {
    return {
      name: 'Sin Curso',
      semesterName: '',
      totalSections: 0,
      completedSections: 0,
      progressPct: 0,
    };
  }

  const course = tree.courses[0];
  const semesterName = course.semesters?.[0]?.name || '';

  let totalSections = 0;
  for (const sem of course.semesters || []) {
    totalSections += (sem.sections || []).length;
  }

  // Use real overall progress if available
  const progressPct = overallProgress?.pct ?? 0;

  // A section is "completed" if its progress is >= 80%
  // For now this is approximated from overall progress
  const completedSections = overallProgress
    ? Math.round((progressPct / 100) * totalSections)
    : 0;

  return {
    name: course.name,
    semesterName,
    totalSections,
    completedSections,
    progressPct,
  };
}
