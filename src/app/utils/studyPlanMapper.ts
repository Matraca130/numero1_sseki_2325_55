// ============================================================
// studyPlanMapper — Pure mapping functions for study plan data.
//
// Extracted from useStudyPlans to eliminate duplication between
// the main mapping effect and the reschedule snapshot builder.
//
// NO React imports — these are pure, testable functions.
// ============================================================

import type { StudyPlanTask } from '@/app/types/study-plan';
import type { StudyPlanTaskRecord } from '@/app/services/platformApi';
import {
  BACKEND_ITEM_TYPE_TO_METHOD,
  METHOD_TIME_DEFAULTS,
} from '@/app/utils/constants';

// ── Topic Lookup ────────────────────────────────────────────

export interface TopicLookup {
  topicTitle: string;
  sectionTitle: string;
  courseName: string;
  courseId: string;
  courseColor: string;
}

const COURSE_COLORS = [
  'bg-teal-500', 'bg-blue-500', 'bg-purple-500',
  'bg-amber-500', 'bg-pink-500', 'bg-emerald-500',
];

/**
 * Builds an id→lookup map from the content tree.
 * Accepts `any` to avoid coupling to a specific tree type —
 * the content tree shape varies between platform contexts.
 */
export function buildTopicMap(tree: any): Map<string, TopicLookup> {
  const map = new Map<string, TopicLookup>();
  if (!tree?.courses) return map;

  tree.courses.forEach((course: any, ci: number) => {
    const color = COURSE_COLORS[ci % COURSE_COLORS.length];
    course.semesters?.forEach((sem: any) => {
      sem.sections?.forEach((sec: any) => {
        sec.topics?.forEach((topic: any) => {
          map.set(topic.id, {
            topicTitle: topic.name || topic.title || topic.id,
            sectionTitle: sec.name || sec.title || sec.id,
            courseName: course.name || course.title || course.id,
            courseId: course.id,
            courseColor: color,
          });
        });
      });
    });
  });

  return map;
}

// ── Backend → Frontend Task Mapping ─────────────────────

/**
 * Maps a single backend `StudyPlanTaskRecord` to the frontend
 * `StudyPlanTask` model, applying all Phase 5 fallback logic:
 *
 *   - scheduled_date → Date (falls back to planCreatedAt + idx/3)
 *   - original_method → display method (falls back to item_type mapping)
 *   - estimated_minutes → minutes (falls back to method defaults → 25)
 *
 * This is a **pure function** with no side effects.
 *
 * @param bt              Backend task record
 * @param idx             Position index in the sorted task list (used for legacy date fallback)
 * @param planCreatedAt   Plan creation date (used for legacy date fallback)
 * @param topicMap        Content-tree topic lookup map
 */
export function mapBackendTaskToFrontend(
  bt: StudyPlanTaskRecord,
  idx: number,
  planCreatedAt: Date,
  topicMap: Map<string, TopicLookup>,
): StudyPlanTask {
  const lookup = topicMap.get(bt.item_id);

  // ── Display method ──
  const displayMethod = bt.original_method
    || BACKEND_ITEM_TYPE_TO_METHOD[bt.item_type]
    || bt.item_type;

  // ── Estimated minutes ──
  const estimatedMinutes = bt.estimated_minutes
    ?? METHOD_TIME_DEFAULTS[bt.item_type]
    ?? METHOD_TIME_DEFAULTS[displayMethod]
    ?? 25;

  // ── Scheduled date ──
  const date = bt.scheduled_date
    ? new Date(bt.scheduled_date)
    : (() => {
        const d = new Date(planCreatedAt);
        d.setDate(d.getDate() + Math.floor(idx / 3)); // legacy: ~3 tasks per day
        return d;
      })();

  return {
    id: bt.id,
    date,
    title: lookup?.topicTitle || bt.item_id,
    subject: lookup?.courseName || 'Materia',
    subjectColor: lookup?.courseColor || 'bg-gray-500',
    method: displayMethod,
    estimatedMinutes,
    completed: bt.status === 'completed',
    topicId: bt.item_id,
  };
}
