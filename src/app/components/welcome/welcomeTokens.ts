// ============================================================
// Axon — Welcome View shared tokens & helpers
// Extracted from WelcomeView.tsx during refactor/welcome-view-split.
//
// Finding #5 cleanup: the `tk` object preserves its public shape (consumers
// in welcome/* rely on these property names) but its values are now sourced
// from the canonical design-system palette instead of parallel hex literals.
//   heroFrom  → colors.primary[700]  (#1B3B36, Dark Teal header/sidebar)
//   heroTo    → colors.primary[900]  (#0f2b26, deepest dark, hero end)
//   teal      → colors.primary[500]  (#2a8c7a, Teal Accent)
//   tealLight → colors.primary[400]  (#2dd4a8, progress gradient start)
//   pageBg    → colors.surface.page  (#f0f2f5, canonical Axon page bg)
// ============================================================
import {
  Brain,
  CheckCircle,
  FileText,
  Flame,
  Play,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { colors } from '@/app/design-system';

// ── Tokens ─────────────────────────────────────────────────
export const tk = {
  heroFrom: colors.primary[700],
  heroTo: colors.primary[900],
  teal: colors.primary[500],
  tealLight: colors.primary[400],
  pageBg: colors.surface.page,
} as const;

// ── XP Action labels (for activity feed) ───────────────────────
export const XP_ACTION_LABELS: Record<
  string,
  { label: string; icon: typeof Zap; color: string; bg: string }
> = {
  review_flashcard: { label: 'Flashcard revisado', icon: Brain, color: 'text-amber-600', bg: 'bg-amber-50' },
  review_correct: { label: 'Respuesta correcta', icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50' },
  quiz_answer: { label: 'Quiz respondido', icon: Zap, color: 'text-violet-600', bg: 'bg-violet-50' },
  quiz_correct: { label: 'Quiz correcto', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  complete_session: { label: 'Sesion completada', icon: Play, color: 'text-blue-600', bg: 'bg-blue-50' },
  complete_reading: { label: 'Lectura completada', icon: FileText, color: 'text-teal-600', bg: 'bg-teal-50' },
  complete_video: { label: 'Video completado', icon: Play, color: 'text-purple-500', bg: 'bg-purple-50' },
  streak_daily: { label: 'Bonus de racha', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
  complete_plan_task: { label: 'Tarea del plan', icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50' },
  complete_plan: { label: 'Plan completado', icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
  rag_question: { label: 'Pregunta AI', icon: Sparkles, color: 'text-blue-500', bg: 'bg-blue-50' },
};

export function getActionMeta(action: string) {
  return (
    XP_ACTION_LABELS[action] ?? {
      label: action,
      icon: Zap,
      color: 'text-gray-500',
      bg: 'bg-[#F0F2F5]',
    }
  );
}

// ── Greeting logic ─────────────────────────────────────────
export function getGreeting(name?: string): { line1: string; line2: string } {
  const h = new Date().getHours();
  const first = name?.split(' ')[0] ?? '';
  const saludo = h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
  return {
    line1: first ? `${saludo}, ${first}` : saludo,
    line2: 'Tu progreso de hoy',
  };
}

// ── Time helpers ───────────────────────────────────────────
export function timeAgo(isoDate: string): string {
  const ms = Date.now() - new Date(isoDate).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'Ahora';
  if (m < 60) return `Hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Ayer';
  return `Hace ${d}d`;
}

export type TimeFilter = 'today' | 'week' | 'month';
