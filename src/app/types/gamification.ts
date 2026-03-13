// ============================================================
// Axon v4.4 — Gamification Types
//
// Sprint G1 Foundation types matching backend contracts:
//   - xp-engine.ts   → XP_TABLE, LEVEL_THRESHOLDS, AwardResult
//   - streak-engine.ts → StreakStatus, CheckInResult, CheckInEvent
//   - routes/gamification/ → Profile, Leaderboard, Badges
//
// AUDIT FIX: All types now match EXACT backend response shapes.
// Backend wraps responses with ok(c, data) → { data: ... }
// apiCall() unwraps { data } envelope automatically.
//
// NOTE: XP awarding is 100% server-side (afterWrite hooks).
// Frontend NEVER calls POST /award-xp. These types are READ-ONLY.
// ============================================================

// ── GET /gamification/profile (COMPOSITE response) ────────
// Backend profile.ts returns nested structure, NOT flat row.

export interface GamificationProfileResponse {
  xp: {
    total: number;
    today: number;
    this_week: number;
    level: number;
    daily_goal: number;
    daily_cap: number;
    streak_freezes_owned: number;
  };
  streak: {
    current: number;
    longest: number;
    last_study_date: string | null;
  };
  badges_earned: number;
}

// ── Flattened profile for UI consumption ──────────────────
// Components use this normalized shape (mapped from response).

export interface GamificationProfile {
  total_xp: number;
  xp_today: number;
  xp_this_week: number;
  current_level: number;
  daily_goal_xp: number;
  daily_cap: number;
  streak_freezes_owned: number;
  streak_current: number;
  streak_longest: number;
  last_study_date: string | null;
  badges_earned: number;
}

/** Maps backend composite response → flat UI profile */
export function mapProfileResponse(
  res: GamificationProfileResponse,
): GamificationProfile {
  return {
    total_xp: res.xp.total,
    xp_today: res.xp.today,
    xp_this_week: res.xp.this_week,
    current_level: res.xp.level,
    daily_goal_xp: res.xp.daily_goal,
    daily_cap: res.xp.daily_cap,
    streak_freezes_owned: res.xp.streak_freezes_owned,
    streak_current: res.streak.current,
    streak_longest: res.streak.longest,
    last_study_date: res.streak.last_study_date,
    badges_earned: res.badges_earned,
  };
}

// ── Level Thresholds (synced from xp-engine.ts) ──────────
// Must stay in sync with backend LEVEL_THRESHOLDS constant.

export const LEVEL_THRESHOLDS: ReadonlyArray<{ level: number; xp: number }> = [
  { level: 1, xp: 0 },
  { level: 2, xp: 100 },
  { level: 3, xp: 300 },
  { level: 4, xp: 600 },
  { level: 5, xp: 1000 },
  { level: 6, xp: 1500 },
  { level: 7, xp: 2200 },
  { level: 8, xp: 3000 },
  { level: 9, xp: 4000 },
  { level: 10, xp: 5500 },
  { level: 11, xp: 7500 },
  { level: 12, xp: 10000 },
] as const;

/** XP needed for current → next level, and progress percentage */
export function getLevelProgress(totalXp: number, currentLevel: number) {
  const currentThreshold =
    LEVEL_THRESHOLDS.find((t) => t.level === currentLevel)?.xp ?? 0;
  const nextThreshold =
    LEVEL_THRESHOLDS.find((t) => t.level === currentLevel + 1)?.xp ?? null;

  // Max level reached
  if (nextThreshold === null) {
    return { current: totalXp, needed: totalXp, progress: 1, isMaxLevel: true };
  }

  const xpInLevel = totalXp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const progress = Math.min(1, Math.max(0, xpInLevel / xpNeeded));

  return { current: xpInLevel, needed: xpNeeded, progress, isMaxLevel: false };
}

// ── XP Table (display-only, synced from xp-engine.ts) ────

export const XP_TABLE: Readonly<Record<string, number>> = {
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
} as const;

// ── XP Transaction (xp_transactions table) ───────────────

export interface XpTransaction {
  id: string;
  student_id: string;
  institution_id: string;
  action: string;
  xp_base: number;
  xp_final: number;
  multiplier: number;
  bonus_type: string | null;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
}

// ── GET /gamification/xp-history response ─────────────────
// Backend returns paginated wrapper, not raw array.

export interface XpHistoryResponse {
  items: XpTransaction[];
  total: number;
  limit: number;
  offset: number;
}

// ── Streak (from streak-engine.ts) ───────────────────────
// These match the backend StreakStatus/CheckInResult/CheckInEvent
// interfaces EXACTLY (verified against streak-engine.ts source).

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

export interface CheckInEvent {
  type:
    | 'streak_started'
    | 'streak_incremented'
    | 'freeze_consumed'
    | 'streak_broken'
    | 'already_checked_in';
  message: string;
  data?: Record<string, unknown>;
}

export interface CheckInResult {
  streak_status: StreakStatus;
  events: CheckInEvent[];
}

// ── Badges ───────────────────────────────────────────────
// Backend GET /gamification/badges returns merged array:
//   each item = badge_definition fields + { earned, earned_at }

export type BadgeCategory =
  | 'consistency'
  | 'study'
  | 'mastery'
  | 'exploration'
  | 'social';

export type BadgeRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary';

export interface BadgeWithEarnedStatus {
  id: string;
  name: string;
  description: string;
  slug?: string;
  /** Lucide icon name (e.g. 'Flame', 'Crown', 'Trophy') */
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  xp_reward: number;
  trigger_type: string;
  trigger_config?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  // Merged earned data from backend
  earned: boolean;
  earned_at: string | null;
}

export interface BadgesResponse {
  badges: BadgeWithEarnedStatus[];
  total: number;
  earned_count: number;
}

// ── Leaderboard ──────────────────────────────────────────
// Backend returns { leaderboard, my_rank, period }, not array.

export interface LeaderboardEntry {
  student_id: string;
  xp_this_week?: number;
  xp_today?: number;
  current_level: number;
  total_xp: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  my_rank: number | null;
  period: string;
}

export type LeaderboardPeriod = 'weekly' | 'daily';

// ── Daily Goal ───────────────────────────────────────────
// Backend PUT /gamification/daily-goal expects field "daily_goal"

export interface DailyGoalUpdate {
  daily_goal: number;
}
