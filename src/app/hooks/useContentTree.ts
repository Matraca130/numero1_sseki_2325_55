// ============================================================
// Axon — Shared: useContentTree Hook (R16 Extraction)
//
// Loads the institution's content tree (courses → semesters →
// sections → topics).
//
// Extracted from useQuizCascade.tsx to be reusable across
// quiz, flashcard, summary, and other cascade selectors.
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { apiCall } from '@/app/lib/api';
import { logger } from '@/app/lib/logger';

// ── Content-tree types ───────────────────────────────────

export interface ContentTreeTopic {
  id: string;
  name: string;
  order_index?: number;
}

export interface ContentTreeSection {
  id: string;
  name: string;
  order_index?: number;
  topics: ContentTreeTopic[];
}

export interface ContentTreeSemester {
  id: string;
  name: string;
  order_index?: number;
  sections: ContentTreeSection[];
}

export interface ContentTreeCourse {
  id: string;
  name: string;
  semesters: ContentTreeSemester[];
}

// ── Return type ──────────────────────────────────────────

export interface UseContentTreeReadonlyReturn {
  contentTree: ContentTreeCourse[];
  treeLoading: boolean;
}

// ── Hook ─────────────────────────────────────────────────

export function useContentTreeReadonly(): UseContentTreeReadonlyReturn {
  const { selectedInstitution } = useAuth();
  const institutionId = selectedInstitution?.id || null;

  const [contentTree, setContentTree] = useState<ContentTreeCourse[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);

  useEffect(() => {
    if (!institutionId) {
      setContentTree([]);
      setTreeLoading(false);
      return;
    }
    let cancelled = false;
    setTreeLoading(true);
    (async () => {
      try {
        // Schema note: memberships has no course_id — professors are scoped
        // at the institution level, not per course. The caller's role lives
        // in selectedInstitution.role (set from GET /institutions). So the
        // tree below is whatever the institution has and the caller can read.
        const tree = await apiCall<ContentTreeCourse[]>(
          `/content-tree?institution_id=${institutionId}`,
        );
        if (cancelled) return;

        const allCourses = Array.isArray(tree) ? tree : [];
        setContentTree(allCourses);
      } catch (err) {
        logger.error('[ContentTree] Load error:', err);
        if (!cancelled) setContentTree([]);
      } finally {
        if (!cancelled) setTreeLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [institutionId]);

  return { contentTree, treeLoading };
}
