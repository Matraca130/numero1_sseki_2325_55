// ============================================================
// Shared types + constants for week/month schedule views.
// ============================================================
import React from 'react';
import { Video, Zap, GraduationCap, FileText, Box } from 'lucide-react';
import type { StudyPlanTask } from '@/app/types/study-plan';

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

/** Display labels per study method. */
export const METHOD_LABELS: Record<string, string> = {
  video: 'Video',
  flashcard: 'Flashcards',
  quiz: 'Quiz',
  resumo: 'Resumen',
  '3d': 'Atlas 3D',
};

/** Pill color palette per study method. */
export const METHOD_PILL: Record<string, { bg: string; text: string; border: string }> = {
  flashcard: { bg: '#f0fdf6', text: '#6ba88e', border: 'rgba(198,240,223,0.8)' },
  quiz:      { bg: '#fefce8', text: '#b45309', border: 'rgba(253,230,138,0.6)' },
  video:     { bg: '#eff6ff', text: '#3b82f6', border: 'rgba(191,219,254,0.8)' },
  resumo:    { bg: '#faf5ff', text: '#7c3aed', border: 'rgba(221,214,254,0.8)' },
  '3d':      { bg: '#fff7ed', text: '#c2410c', border: 'rgba(254,215,170,0.8)' },
};

/** Day-of-week headers for the month grid (Sunday-first). */
export const DAY_HEADERS = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];
