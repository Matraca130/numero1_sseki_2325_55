// ============================================================
// Axon — Content Tree Helpers
//
// Shared utilities for navigating the content tree structure.
// Extracted from inline implementations in SummaryView,
// StudentSummariesView, and StudyHubView (DRY-5).
//
// Import: import { resolveBreadcrumb } from '@/app/lib/content-tree-helpers';
// ============================================================

// ── Types ─────────────────────────────────────────────────

export interface BreadcrumbResult {
  courseName?: string;
  semesterName?: string;
  sectionName?: string;
  topicName?: string;
}

// ── resolveBreadcrumb ───────────────────────────────────
/**
 * Walk the content tree to find a topic by ID and return
 * the full breadcrumb path (course > semester > section > topic).
 *
 * @param tree  The content tree object (has `.courses` array)
 *              or a direct array of courses.
 *              Accepts `null`/`undefined` gracefully.
 * @param topicId  The topic ID to locate.
 * @returns An object with the names of each level found.
 *          Missing levels are `undefined`.
 *
 * @example
 *   // Full tree
 *   const bc = resolveBreadcrumb(tree, topicId);
 *   // bc.courseName, bc.sectionName, bc.topicName
 *
 *   // Single course (wrap it)
 *   const bc = resolveBreadcrumb({ courses: [course] }, topicId);
 *   // bc.semesterName, bc.sectionName
 */
export function resolveBreadcrumb(
  tree: any,
  topicId: string,
): BreadcrumbResult {
  if (!tree || !topicId) return {};

  const courses: any[] =
    tree.courses || (Array.isArray(tree) ? tree : []);

  for (const c of courses) {
    for (const sem of c.semesters || []) {
      for (const sec of sem.sections || []) {
        for (const t of sec.topics || []) {
          if (t.id === topicId) {
            return {
              courseName: c.name,
              semesterName: sem.name,
              sectionName: sec.name,
              topicName: t.name,
            };
          }
        }
      }
    }
  }

  return {};
}
