// ============================================================
// Axon — Gamification API Service
//
// Verified against backend routes/gamification/ (2026-03-13):
//   profile.ts  — GET profile, xp-history, leaderboard (3)
//   badges.ts   — GET badges, POST check-badges, GET notifications (3)
//   streak.ts   — GET streak-status, POST daily-check-in, streak-freeze/buy, streak-repair (4)
//   goals.ts    — PUT daily-goal, POST goals/complete, POST onboarding (3)
//   Total: 13 endpoints
//
// All calls go through apiCall() (double-token convention).
// All endpoints require institution_id as QUERY PARAM (not body).
// ============================================================

import { apiCall } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────

export interface GamificationProfile {
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

export interface XPTransaction {
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

export interface XPHistoryResponse {
  items: XPTransaction[];
  total: number;
  limit: number;
  offset: number;
}

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
  type: 'streak_started' | 'streak_incremented' | 'freeze_consumed' | 'streak_broken' | 'already_checked_in';
  message: string;
  data?: Record<string, unknown>;
}

export interface CheckInResult {
  streak_status: StreakStatus;
  events: CheckInEvent[];
}

export interface BadgeWithStatus {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_url: string | null;
  category: string;
  rarity: string;
  xp_reward: number;
  criteria: string;
  is_active: boolean;
  earned: boolean;
  earned_at: string | null;
}

export interface BadgesResponse {
  badges: BadgeWithStatus[];
  total: number;
  earned_count: number;
}

export interface GamificationNotification {
  type: 'xp' | 'badge';
  timestamp: string;
  action?: string;
  xp?: number;
  bonus?: string | null;
  badge_id?: string;
  badge_name?: string;
  badge_slug?: string | null;
  badge_icon?: string | null;
  badge_rarity?: string | null;
}

// ── API Calls ─────────────────────────────────────────

export async function getProfile(institutionId: string): Promise<GamificationProfile | null> {
  try {
    return await apiCall<GamificationProfile>(
      `/gamification/profile?institution_id=${institutionId}`
    );
  } catch {
    return null;
  }
}

export async function getXPHistory(
  institutionId: string,
  opts?: { limit?: number; offset?: number }
): Promise<XPHistoryResponse> {
  try {
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;
    return await apiCall<XPHistoryResponse>(
      `/gamification/xp-history?institution_id=${institutionId}&limit=${limit}&offset=${offset}`
    );
  } catch {
    return { items: [], total: 0, limit: opts?.limit ?? 20, offset: opts?.offset ?? 0 };
  }
}

export async function getLeaderboard(
  institutionId: string,
  opts?: { limit?: number; period?: 'weekly' | 'daily' }
): Promise<LeaderboardResponse> {
  try {
    const limit = opts?.limit ?? 10;
    const period = opts?.period ?? 'weekly';
    return await apiCall<LeaderboardResponse>(
      `/gamification/leaderboard?institution_id=${institutionId}&limit=${limit}&period=${period}`
    );
  } catch {
    return { leaderboard: [], my_rank: null, period: opts?.period ?? 'weekly' };
  }
}

export async function getStreakStatus(institutionId: string): Promise<StreakStatus | null> {
  try {
    return await apiCall<StreakStatus>(
      `/gamification/streak-status?institution_id=${institutionId}`
    );
  } catch {
    return null;
  }
}

export async function dailyCheckIn(institutionId: string): Promise<CheckInResult | null> {
  try {
    return await apiCall<CheckInResult>(
      `/gamification/daily-check-in?institution_id=${institutionId}`,
      { method: 'POST' }
    );
  } catch {
    return null;
  }
}

export async function buyStreakFreeze(institutionId: string): Promise<{
  freeze: Record<string, unknown>;
  xp_spent: number;
  remaining_xp: number;
  freezes_owned: number;
} | null> {
  try {
    return await apiCall(
      `/gamification/streak-freeze/buy?institution_id=${institutionId}`,
      { method: 'POST' }
    );
  } catch {
    return null;
  }
}

export async function repairStreak(institutionId: string): Promise<{
  repaired: boolean;
  restored_streak: number;
  xp_spent: number;
  remaining_xp: number;
} | null> {
  try {
    return await apiCall(
      `/gamification/streak-repair?institution_id=${institutionId}`,
      { method: 'POST' }
    );
  } catch {
    return null;
  }
}

export async function getBadges(institutionId?: string, category?: string): Promise<BadgesResponse> {
  try {
    let path = '/gamification/badges';
    const params: string[] = [];
    if (institutionId) params.push(`institution_id=${institutionId}`);
    if (category) params.push(`category=${category}`);
    if (params.length) path += '?' + params.join('&');
    return await apiCall<BadgesResponse>(path);
  } catch {
    return { badges: [], total: 0, earned_count: 0 };
  }
}

export async function checkBadges(institutionId: string): Promise<{
  new_badges: BadgeWithStatus[];
  checked: number;
  awarded: number;
} | null> {
  try {
    return await apiCall(
      `/gamification/check-badges?institution_id=${institutionId}`,
      { method: 'POST' }
    );
  } catch {
    return null;
  }
}

export async function getNotifications(
  institutionId: string,
  opts?: { limit?: number }
): Promise<{ notifications: GamificationNotification[]; total: number }> {
  try {
    const limit = opts?.limit ?? 20;
    return await apiCall(
      `/gamification/notifications?institution_id=${institutionId}&limit=${limit}`
    );
  } catch {
    return { notifications: [], total: 0 };
  }
}

export async function updateDailyGoal(
  institutionId: string,
  dailyGoal: number
): Promise<Record<string, unknown> | null> {
  try {
    return await apiCall(
      '/gamification/daily-goal',
      {
        method: 'PUT',
        body: JSON.stringify({ institution_id: institutionId, daily_goal: dailyGoal }),
      }
    );
  } catch {
    return null;
  }
}

export async function completeGoal(
  institutionId: string,
  goalType: string
): Promise<{ goal_type: string; xp_awarded: number; bonus_type: string | null } | null> {
  try {
    return await apiCall(
      '/gamification/goals/complete',
      {
        method: 'POST',
        body: JSON.stringify({ institution_id: institutionId, goal_type: goalType }),
      }
    );
  } catch {
    return null;
  }
}

export async function onboarding(institutionId: string): Promise<{
  message: string;
  already_exists: boolean;
} | null> {
  try {
    return await apiCall(
      '/gamification/onboarding',
      {
        method: 'POST',
        body: JSON.stringify({ institution_id: institutionId }),
      }
    );
  } catch {
    return null;
  }
}

/** @deprecated Use getProfile() instead */
export async function getMyXP(institutionId: string) {
  const profile = await getProfile(institutionId);
  if (!profile) return null;
  return {
    total_xp: profile.xp.total,
    current_level: profile.xp.level,
    xp_today: profile.xp.today,
    xp_this_week: profile.xp.this_week,
    daily_goal: profile.xp.daily_goal,
    daily_cap: profile.xp.daily_cap,
    streak_freezes_owned: profile.xp.streak_freezes_owned,
    current_streak: profile.streak.current,
    longest_streak: profile.streak.longest,
    badges_earned: profile.badges_earned,
  };
}
