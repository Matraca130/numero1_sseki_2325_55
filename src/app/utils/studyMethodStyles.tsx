// ============================================================
// Axon — Study Method Styles (shared across Schedule, Wizard, etc.)
// Centralizes METHOD_ICONS, METHOD_LABELS, METHOD_COLORS
// ============================================================
import React from 'react';
import { Video, Zap, GraduationCap, FileText, Box } from 'lucide-react';

export const METHOD_ICONS: Record<string, React.ReactNode> = {
  video: <Video size={14} />,
  flashcard: <Zap size={14} />,
  quiz: <GraduationCap size={14} />,
  resumo: <FileText size={14} />,
  '3d': <Box size={14} />,
};

export const METHOD_LABELS: Record<string, string> = {
  video: 'Video',
  flashcard: 'Flashcards',
  quiz: 'Quiz',
  resumo: 'Resumen',
  '3d': 'Atlas 3D',
};

export const METHOD_COLORS: Record<string, string> = {
  video: 'bg-[#e6f5f1] text-axon-dark border-[#ccebe3]',
  flashcard: 'bg-amber-100 text-amber-700 border-amber-200',
  quiz: 'bg-purple-100 text-purple-700 border-purple-200',
  resumo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '3d': 'bg-orange-100 text-orange-700 border-orange-200',
};

/**
 * Pill-style color palette (solid hex) for method tags/badges.
 * Used by schedule views (WeekMonthViews) and extended by CompletionIndicators
 * for its Figma-accurate gradient variant.
 * Single source of truth — do NOT duplicate these hex values locally.
 */
export interface MethodPillStyle {
  bg: string;
  text: string;
  border: string;
}

export const METHOD_PILL: Record<string, MethodPillStyle> = {
  flashcard: { bg: '#f0fdf6', text: '#6ba88e', border: 'rgba(198,240,223,0.8)' },
  quiz:      { bg: '#fefce8', text: '#b45309', border: 'rgba(253,230,138,0.6)' },
  video:     { bg: '#eff6ff', text: '#3b82f6', border: 'rgba(191,219,254,0.8)' },
  resumo:    { bg: '#faf5ff', text: '#7c3aed', border: 'rgba(221,214,254,0.8)' },
  '3d':      { bg: '#fff7ed', text: '#c2410c', border: 'rgba(254,215,170,0.8)' },
};

/** Full study method definition (used in wizard) */
export interface StudyMethodDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  avgMinutes: number;
}

export const STUDY_METHODS: StudyMethodDef[] = [
  { id: 'video', label: 'Videos', icon: <Video size={28} />, color: 'bg-[#e6f5f1] text-axon-accent border-[#ccebe3]', avgMinutes: 35 },
  { id: 'flashcard', label: 'Flashcards', icon: <Zap size={28} />, color: 'bg-amber-100 text-amber-600 border-amber-200', avgMinutes: 20 },
  { id: 'quiz', label: 'Quiz', icon: <GraduationCap size={28} />, color: 'bg-purple-100 text-purple-600 border-purple-200', avgMinutes: 15 },
  { id: 'resumo', label: 'Resumen', icon: <FileText size={28} />, color: 'bg-emerald-100 text-emerald-600 border-emerald-200', avgMinutes: 40 },
  { id: '3d', label: 'Atlas 3D', icon: <Box size={28} />, color: 'bg-orange-100 text-orange-600 border-orange-200', avgMinutes: 15 },
];