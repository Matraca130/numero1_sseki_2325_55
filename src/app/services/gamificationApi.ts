// ============================================================
// Axon v4.4 — Gamification API Service
//
// Sprint G1: Thin wrappers over backend gamification endpoints.
//
// AUDIT FIX: All functions now match EXACT backend contracts:
//   - Profile returns composite {xp, streak, badges_earned} → mapped to flat
//   - daily-check-in reads institution_id from query param (not body)
//   - xp-history returns {items, total, limit, offset} → extracted
//   - leaderboard returns {leaderboard, my_rank, period} → extracted
//   - badges returns {badges, total, earned_count} → extracted
//   - daily-goal expects "daily_goal" field (not "daily_goal_xp")
//
// Uses apiCall() from lib/api.ts (handles Auth + X-Access-Token)
// ============================================================

import { apiCall } from '@/app/lib/api';
import {
  mapProfileResponse,
} from '@/app/types/gamification';
import type {
  GamificationProfile,
  GamificationProfileResponse,
  StreakStatus,
  CheckInResult,
  XpTransaction,
  XpHistoryResponse,
  LeaderboardResponse,
  LeaderboardPeriod,
  BadgeWithEarnedStatus,
  BadgesResponse,
  DailyGoalUpdate,
} from '@/app/types/gamification';

// ── Profile ──────────────────────────────────────────────

/**
 * Fetch the authenticated student's XP profile for an institution.
 * Backend returns composite {xp, streak, badges_earned} — we map to flat UI shape.
 */
export async function getGamificationProfile(
  institutionId: string,
): Promise<GamificationProfile> {
  const raw = await apiCall<GamificationProfileResponse>(
    `/gamification/profile?institution_id=${institutionId}`,
  );
  return mapProfileResponse(raw);
}

// ── Streak ───────────────────────────────────────────────

/** Get current streak status (pure read, no side effects) */
export async function getStreakStatus(
  institutionId: string,
): Promise<StreakStatus> {
  return apiCall<StreakStatus>(
    `/gamification/streak-status?institution_id=${institutionId}`,
  );
}

/**
 * Perform daily check-in.
 * Idempotent — safe to call multiple times per day.
 * AUDIT FIX: Backend reads institution_id from QUERY param, not body.
 */
export async function dailyCheckIn(
  institutionId: string,
): Promise<CheckInResult> {
  return apiCall<CheckInResult>(
    `/gamification/daily-check-in?institution_id=${institutionId}`,
    { method: 'POST' },
  );
}

// ── XP History ───────────────────────────────────────────

/**
 * Fetch XP transaction history (most recent first).
 * AUDIT FIX: Backend returns {items, total, limit, offset} — we extract items.
 */
export async function getXpHistory(
  institutionId: string,
  opts?: { limit?: number; offset?: number },
): Promise<XpTransaction[]> {
  const params = new URLSearchParams();
  params.set('institution_id', institutionId);
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  const res = await apiCall<XpHistoryResponse>(
    `/gamification/xp-history?${params}`,
  );
  return res.items;
}

// ── Leaderboard ──────────────────────────────────────────

/**
 * Fetch institution leaderboard.
 * AUDIT FIX: Backend returns {leaderboard, my_rank, period} — we return full response.
 */
export async function getLeaderboard(
  institutionId: string,
  period: LeaderboardPeriod = 'weekly',
  opts?: { limit?: number },
): Promise<LeaderboardResponse> {
  const params = new URLSearchParams();
  params.set('institution_id', institutionId);
  params.set('period', period);
  if (opts?.limit) params.set('limit', String(opts.limit));
  return apiCall<LeaderboardResponse>(
    `/gamification/leaderboard?${params}`,
  );
}

// ── Badges ───────────────────────────────────────────────

/**
 * Fetch all badge definitions + student's earned status.
 * AUDIT FIX: Backend merges definitions and earned data into one array.
 * Returns {badges, total, earned_count}.
 */
export async function getBadges(
  category?: string,
): Promise<BadgesResponse> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  const qs = params.toString() ? `?${params}` : '';
  return apiCall<BadgesResponse>(`/gamification/badges${qs}`);
}

/**
 * Trigger server-side badge evaluation.
 * Returns newly awarded badges.
 */
export async function checkBadges(
  institutionId: string,
): Promise<{ new_badges: BadgeWithEarnedStatus[]; checked: number; awarded: number }> {
  return apiCall(`/gamification/check-badges?institution_id=${institutionId}`, {
    method: 'POST',
  });
}

// ── Daily Goal ───────────────────────────────────────────

/**
 * Update the student's daily XP goal.
 * AUDIT FIX: Backend expects "daily_goal" field, not "daily_goal_xp".
 * Validates range: 10-1000.
 */
export async function updateDailyGoal(
  institutionId: string,
  data: DailyGoalUpdate,
): Promise<unknown> {
  return apiCall('/gamification/daily-goal', {
    method: 'PUT',
    body: JSON.stringify({
      institution_id: institutionId,
      daily_goal: data.daily_goal,
    }),
  });
}

// ── Streak Freeze & Repair ───────────────────────────────

/** Purchase a streak freeze with XP */
export async function buyStreakFreeze(
  institutionId: string,
): Promise<{ freeze: unknown; xp_spent: number; remaining_xp: number; freezes_owned: number }> {
  return apiCall(`/gamification/streak-freeze/buy?institution_id=${institutionId}`, {
    method: 'POST',
  });
}

/** Repair a broken streak with XP */
export async function repairStreak(
  institutionId: string,
): Promise<{ repaired: boolean; restored_streak: number; xp_spent: number; remaining_xp: number }> {
  return apiCall(`/gamification/streak-repair?institution_id=${institutionId}`, {
    method: 'POST',
  });
}
