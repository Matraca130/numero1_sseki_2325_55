// ============================================================
// Axon — Schedule Fallback Data
// Demo/placeholder data shown when no study plans exist.
// DT-05 fix: dates are relative to AXON_TODAY instead of hardcoded.
// ============================================================
import { getAxonToday } from '@/app/utils/constants';

export interface FallbackEvent {
  date: Date;
  title: string;
  type: string;
  color: string;
}

export interface UpcomingExam {
  id: number;
  title: string;
  date: string;
  daysLeft: number;
  priority: 'high' | 'medium' | 'low';
}

export interface CompletedTask {
  id: number;
  title: string;
  date: string;
  score: string;
}

export function buildFallbackEvents(): FallbackEvent[] {
  const base = getAxonToday();
  const d = (offset: number) => {
    const dt = getAxonToday();
    dt.setDate(base.getDate() + offset);
    return dt;
  };
  return [
    { date: d(-2), title: 'Anatomia: Miembro Superior', type: 'study', color: 'bg-teal-100 text-teal-700 border-teal-200' },
    { date: d(-2), title: 'Revision: Histologia', type: 'review', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { date: d(0),  title: 'Examen de Fisiologia', type: 'exam', color: 'bg-red-100 text-red-700 border-red-200' },
    { date: d(3),  title: 'Bioquimica: Metabolismo', type: 'study', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { date: d(5),  title: 'Seminario de Patologia', type: 'task', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { date: d(8),  title: 'Simulacro General', type: 'exam', color: 'bg-red-100 text-red-700 border-red-200' },
  ];
}

export const UPCOMING_EXAMS: UpcomingExam[] = [
  { id: 1, title: 'Examen de Fisiologia', date: '07 Feb', daysLeft: 0, priority: 'high' },
  { id: 2, title: 'Simulacro General', date: '15 Feb', daysLeft: 8, priority: 'medium' },
  { id: 3, title: 'Anatomia Practica', date: '22 Feb', daysLeft: 15, priority: 'high' },
];

export const COMPLETED_TASKS: CompletedTask[] = [
  { id: 1, title: 'Resumen: Introduccion a la Anatomia', date: 'Ayer', score: '95%' },
  { id: 2, title: 'Flashcards: Huesos del Craneo', date: '05 Feb', score: '80%' },
  { id: 3, title: 'Quiz: Sistema Nervioso', date: '04 Feb', score: '100%' },
];
