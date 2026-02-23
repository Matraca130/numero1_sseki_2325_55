// ============================================================
// Axon — useTreeCourses hook
//
// Adapts ContentTree (backend) → Course[] (client-side types).
// Maps TreeCourse.name → Course.name, TreeSemester.name → Semester.title, etc.
// Assigns deterministic colors by index.
// ============================================================

import { useMemo } from 'react';
import { useContentTree } from '@/app/context/ContentTreeContext';
import type { Course } from '@/app/data/courses';

// Deterministic color palette for courses
const COURSE_COLORS = [
  { color: 'bg-rose-400',    accent: 'text-rose-400' },
  { color: 'bg-indigo-500',  accent: 'text-indigo-500' },
  { color: 'bg-teal-500',    accent: 'text-teal-500' },
  { color: 'bg-purple-500',  accent: 'text-purple-500' },
  { color: 'bg-amber-500',   accent: 'text-amber-500' },
  { color: 'bg-emerald-500', accent: 'text-emerald-500' },
  { color: 'bg-sky-500',     accent: 'text-sky-500' },
  { color: 'bg-orange-500',  accent: 'text-orange-500' },
];

export function useTreeCourses(): { courses: Course[]; loading: boolean; error: string | null } {
  const { tree, loading, error } = useContentTree();

  const courses = useMemo<Course[]>(() => {
    if (!tree?.courses?.length) return [];

    return tree.courses.map((c, i) => {
      const palette = COURSE_COLORS[i % COURSE_COLORS.length];
      return {
        id: c.id,
        name: c.name,
        color: palette.color,
        accentColor: palette.accent,
        semesters: (c.semesters ?? []).map(s => ({
          id: s.id,
          title: s.name,
          sections: (s.sections ?? []).map(sec => ({
            id: sec.id,
            title: sec.name,
            topics: (sec.topics ?? []).map(t => ({
              id: t.id,
              title: t.name,
              summary: '',
            })),
          })),
        })),
      };
    });
  }, [tree]);

  return { courses, loading, error };
}
