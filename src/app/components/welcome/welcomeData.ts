// ============================================================
// Axon — Welcome View Static Data
// Course visuals, shortcut card definitions.
// Extracted from WelcomeView.tsx for modularization.
// ============================================================
import { BookOpen, Layers, GraduationCap, Box } from 'lucide-react';
import { components } from '@/app/design-system';

export interface WelcomeCourseBase {
  id: string;
  title: string;
  module: string;
  icon: string;
  iconBg: string;
  progressColor: string;
  percentColor: string;
}

export const WELCOME_COURSE_BASES: WelcomeCourseBase[] = [
  { id: 'microbiology', title: 'Microbiologia', module: 'MODULO IV', icon: '\u{1F9A0}', iconBg: 'bg-purple-100', progressColor: 'bg-purple-500', percentColor: 'text-purple-600' },
  { id: 'cell-biology', title: 'Biologia Celular', module: 'MODULO FINAL', icon: '\u{1F33F}', iconBg: 'bg-teal-100', progressColor: 'bg-teal-500', percentColor: 'text-teal-600' },
  { id: 'histology', title: 'Histologia', module: 'MODULO II', icon: '\u{1F52C}', iconBg: 'bg-teal-100', progressColor: 'bg-teal-500', percentColor: 'text-teal-600' },
  { id: 'anatomy', title: 'Anatomia Humana', module: 'MODULO I', icon: '\u{2764}\u{FE0F}', iconBg: 'bg-pink-100', progressColor: 'bg-pink-500', percentColor: 'text-pink-600' },
];

/** Map base → courseId used for progress lookup */
export const COURSE_PROGRESS_MAP: Record<string, string> = {
  microbiology: 'anatomy',
  'cell-biology': 'histology',
  histology: 'histology',
  anatomy: 'anatomy',
};

export interface ShortcutCard {
  title: string;
  subtitle: string;
  icon: typeof BookOpen;
  color: string;
  bg: string;
  view: string;
}

export const SHORTCUT_CARDS: ShortcutCard[] = [
  { title: 'Resumenes', subtitle: 'Acceder a resumenes', icon: BookOpen, color: components.shortcutCard.iconColor, bg: components.shortcutCard.iconBg, view: 'summaries' },
  { title: 'Flashcards', subtitle: 'Revisar tarjetas', icon: Layers, color: components.shortcutCard.iconColor, bg: components.shortcutCard.iconBg, view: 'flashcards' },
  { title: 'Quiz', subtitle: 'Probar conocimiento', icon: GraduationCap, color: components.shortcutCard.iconColor, bg: components.shortcutCard.iconBg, view: 'quiz' },
  { title: 'Atlas 3D', subtitle: 'Explorar modelos', icon: Box, color: components.shortcutCard.iconColor, bg: components.shortcutCard.iconBg, view: '3d-atlas' },
];
