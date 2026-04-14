// ============================================================
// Shared types + constants for week/month schedule views.
// Labels and pill colors are imported from the shared module.
// ============================================================
import React from 'react';
import { Video, Zap, GraduationCap, FileText, Box } from 'lucide-react';
import type { StudyPlanTask } from '@/app/types/study-plan';
import { METHOD_LABELS, METHOD_PILL } from '@/app/utils/studyMethodStyles';

/** Task annotated with its parent plan id. */
export type TaskWithPlan = StudyPlanTask & { planId: string };

/** Compact-size icons per study method. */
export const COMPACT_METHOD_ICONS: Record<string, React.ReactNode> = {
  video:     <Video size={9} />,
  flashcard: <Zap size={9} />,
  quiz:      <GraduationCap size={9} />,
  resumo:    <FileText size={9} />,
  '3d':      <Box size={9} />,
};

// Re-export from the shared module so existing consumers (CompactMethodPill, etc.)
// continue to import from this file without changes.
export { METHOD_LABELS, METHOD_PILL };

/** Day-of-week headers for the month grid (Sunday-first). */
export const DAY_HEADERS = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];
