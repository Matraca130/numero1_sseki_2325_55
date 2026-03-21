// ============================================================
// Axon — Shared: useContentTree Hook (R16 Extraction)
//
// Loads the institution's content tree (courses → semesters →
// sections → topics) and filters by professor memberships.
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

interface MembershipLite {
  id: string;
  course_id: string;
  role: string;
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
        const [tree, memberships] = await Promise.all([
          apiCall<ContentTreeCourse[]>(`/content-tree?institution_id=${institutionId}`),
          apiCall<MembershipLite[]>(`/memberships?institution_id=${institutionId}`),
        ]);
        if (cancelled) return;

        const allCourses = Array.isArray(tree) ? tree : [];
        const profCourseIds = (memberships || [])
          .filter(m => m.role?.toLowerCase() === 'professor')
          .map(m => m.course_id)
          .filter(Boolean);

        const professorCourses = allCourses.filter(c => profCourseIds.includes(c.id));
        setContentTree(professorCourses.length > 0 ? professorCourses : allCourses);
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
