// ============================================================
// Axon — Gamification Types
// Mirrors backend: routes/gamification/, xp-engine.ts,
// streak-engine.ts, student_xp table, xp_transactions table
//
// NOTE: Response types for API calls live in gamificationApi.ts.
// This file holds DB-level types, constants, and shared utilities.
// ============================================================

// ── XP Transactions ───────────────────────────────────────

export interface XPTransaction {
  id: string;
  student_id: string;
  institution_id: string;
  action: string; // XPAction union + dynamic backend actions (badge_*, goal_*, streak_*)
  xp_base: number;
  xp_final: number;
  multiplier: number;
  bonus_type: string | null;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
}

// Known XP actions (frontend-triggered). Backend also generates
// badge_*, goal_*, streak_freeze_buy, streak_repair actions.
export type XPAction =
  | 'review_flashcard'
  | 'review_correct'
  | 'quiz_answer'
  | 'quiz_correct'
  | 'complete_session'
  | 'complete_reading'
  | 'complete_video'
  | 'streak_daily'
  | 'complete_plan_task'
  | 'complete_plan'
  | 'rag_question';

// ── Level System ────────────────────────────────────────

export const LEVEL_THRESHOLDS: { xp: number; level: number; title: string }[] = [
  { xp: 0,     level: 1,  title: 'Novato' },
  { xp: 100,   level: 2,  title: 'Aprendiz' },
  { xp: 300,   level: 3,  title: 'Practicante' },
  { xp: 600,   level: 4,  title: 'Interno' },
  { xp: 1000,  level: 5,  title: 'Residente Jr.' },
  { xp: 1500,  level: 6,  title: 'Residente' },
  { xp: 2200,  level: 7,  title: 'Residente Sr.' },
  { xp: 3000,  level: 8,  title: 'Especialista Jr.' },
  { xp: 4000,  level: 9,  title: 'Especialista' },
  { xp: 5500,  level: 10, title: 'Subespecialista' },
  { xp: 7500,  level: 11, title: 'Jefe de Servicio' },
  { xp: 10000, level: 12, title: 'Catedratico' },
];

export function getLevelInfo(totalXP: number) {
  let current = LEVEL_THRESHOLDS[0];
  let next = LEVEL_THRESHOLDS[1] ?? null;

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i].xp) {
      current = LEVEL_THRESHOLDS[i];
      next = LEVEL_THRESHOLDS[i + 1] ?? null;
      break;
    }
  }

  const xpInLevel = totalXP - current.xp;
  const xpForNext = next ? next.xp - current.xp : 0;
  const progress = next ? Math.min(1, xpInLevel / xpForNext) : 1;

  return { ...current, next, xpInLevel, xpForNext, progress };
}

// ── XP Table (mirrors backend xp-engine.ts) ─────────────

export const XP_TABLE: Record<XPAction, number> = {
  review_flashcard: 5,
  review_correct: 10,
  quiz_answer: 5,
  quiz_correct: 15,
  complete_session: 25,
  complete_reading: 30,
  complete_video: 20,
  streak_daily: 15,
  complete_plan_task: 15,
  complete_plan: 100,
  rag_question: 5,
};

export const XP_DAILY_CAP = 500;

// ── Streak ────────────────────────────────────────────

export interface StreakStatus {
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
  freezes_available: number;
  repair_eligible: boolean;
  streak_at_risk: boolean;
  studied_today: boolean;
  days_since_last_study: number | null;
}

// ── Badges ────────────────────────────────────────────

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string; // Lucide component name (e.g. 'Flame', 'Brain')
  category: 'consistency' | 'study' | 'mastery' | 'exploration' | 'social';
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  xp_reward?: number;
  earned_at: string | null;
  progress?: number;
  requirement?: number;
}

/**
 * Badge with guaranteed earned_at (used for display of earned badges).
 * Used by useQuizGamificationFeedback and BadgeEarnedToast.
 */
export interface BadgeWithEarnedStatus extends Badge {
  earned_at: string; // non-null: this badge has been earned
}

// ── Study Queue ─────────────────────────────────────────

export interface StudyQueueItem {
  flashcard_id: string;
  summary_id: string;
  keyword_id: string;
  subtopic_id: string | null;
  front: string;
  back: string;
  front_image_url: string | null;
  back_image_url: string | null;
  need_score: number;
  retention: number;
  mastery_color: 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'gray';
  p_know: number;
  fsrs_state: string;
  due_at: string | null;
  stability: number;
  difficulty: number;
  is_new: boolean;
  reps: number;
  lapses: number;
  last_review_at: string | null;
  max_p_know: number;
  clinical_priority: number;
  consecutive_lapses: number;
  is_leech: boolean;
}

export interface StudyQueueMeta {
  total_due: number;
  total_new: number;
  total_in_queue: number;
  returned: number;
  limit: number;
  include_future: boolean;
  course_id: string | null;
  generated_at: string;
  algorithm: string;
  engine: 'sql' | 'js';
}

export interface StudyQueueResponse {
  queue: StudyQueueItem[];
  meta: StudyQueueMeta;
}
