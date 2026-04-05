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

// ── Helpers for relative date formatting ────────────────────
const _addDays = (base: Date, days: number): Date => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

const _MONTH_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const _fmtDate = (date: Date): string =>
  `${String(date.getDate()).padStart(2, '0')} ${_MONTH_ABBR[date.getMonth()]}`;

// L-3 fix: dates are relative to getAxonToday() so "daysLeft" stays accurate.
export function buildUpcomingExams(): UpcomingExam[] {
  const today = getAxonToday();
  return [
    { id: 1, title: 'Examen de Fisiologia', date: _fmtDate(today),               daysLeft: 0,  priority: 'high' },
    { id: 2, title: 'Simulacro General',    date: _fmtDate(_addDays(today, 8)),   daysLeft: 8,  priority: 'medium' },
    { id: 3, title: 'Anatomia Practica',    date: _fmtDate(_addDays(today, 15)),  daysLeft: 15, priority: 'high' },
  ];
}

export function buildCompletedTasks(): CompletedTask[] {
  const today = getAxonToday();
  return [
    { id: 1, title: 'Resumen: Introduccion a la Anatomia', date: 'Ayer',                          score: '95%' },
    { id: 2, title: 'Flashcards: Huesos del Craneo',       date: _fmtDate(_addDays(today, -2)),   score: '80%' },
    { id: 3, title: 'Quiz: Sistema Nervioso',              date: _fmtDate(_addDays(today, -3)),   score: '100%' },
  ];
}

// Backward-compatible constants (evaluated once at import time).
// Prefer the builder functions above for always-fresh dates.
export const UPCOMING_EXAMS: UpcomingExam[] = buildUpcomingExams();
export const COMPLETED_TASKS: CompletedTask[] = buildCompletedTasks();
