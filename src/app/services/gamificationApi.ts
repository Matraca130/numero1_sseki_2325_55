// ============================================================
// Axon — Gamification API Service v2 (VERIFIED against backend)
//
// Backend: routes/gamification/ (PR #101 modularized)
// All endpoints REQUIRE institution_id (query or body).
//
// ENDPOINTS (13 total):
//   profile.ts:
//     GET  /gamification/profile      — Composite XP + streak + badge count
//     GET  /gamification/xp-history   — Paginated XP transactions
//     GET  /gamification/leaderboard  — Weekly/daily leaderboard
//   badges.ts:
//     GET  /gamification/badges       — All badge defs + earned status
//     POST /gamification/check-badges — Evaluate and award eligible
//     GET  /gamification/notifications— Recent XP + badge timeline
//   streak.ts:
//     GET  /gamification/streak-status — Detailed streak info
//     POST /gamification/daily-check-in— Daily login streak check-in
//     POST /gamification/streak-freeze/buy — Purchase freeze with XP
//     POST /gamification/streak-repair — Repair broken streak with XP
//   goals.ts:
//     PUT  /gamification/daily-goal   — Update daily XP goal target
//     POST /gamification/goals/complete— Mark goal completed for bonus XP
//     POST /gamification/onboarding   — Initialize gamification profile
//
// Uses apiCall() from lib/api.ts (handles Auth headers).
// ============================================================

import { apiCall } from '@/app/lib/api';
import type {
  XPTransaction,
  Badge,
  StudyQueueResponse,
} from '@/app/types/gamification';

// ── Response Types (matching REAL backend shapes) ─────────

/** GET /gamification/profile response */
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

/** GET /gamification/streak-status response (from computeStreakStatus) */
export interface StreakStatusResponse {
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
  freezes_available: number;
  repair_eligible: boolean;
  streak_at_risk: boolean;
  studied_today: boolean;
  days_since_last_study: number | null;
}

/** POST /gamification/daily-check-in response */
export interface CheckInResponse {
  streak_status: StreakStatusResponse;
  events: Array<{
    type: 'streak_started' | 'streak_incremented' | 'freeze_consumed' | 'streak_broken' | 'already_checked_in';
    message: string;
    data?: Record<string, unknown>;
  }>;
}

/** GET /gamification/leaderboard response */
export interface LeaderboardResponse {
  leaderboard: Array<Record<string, unknown>>;
  my_rank: number | null;
  period: string;
}

/** GET /gamification/badges response */
export interface BadgesResponse {
  badges: Array<Badge & { earned: boolean }>;
  total: number;
  earned_count: number;
}

/** GET /gamification/xp-history response */
export interface XPHistoryResponse {
  items: XPTransaction[];
  total: number;
  limit: number;
  offset: number;
}

/** GET /gamification/notifications response */
export interface NotificationsResponse {
  notifications: Array<{
    type: 'xp' | 'badge';
    action?: string;
    xp?: number;
    bonus?: string | null;
    badge_id?: string;
    badge_name?: string;
    badge_slug?: string | null;
    badge_icon?: string | null;
    badge_rarity?: string | null;
    timestamp: string;
  }>;
  total: number;
}

/** POST /gamification/streak-repair response */
export interface RepairResponse {
  repaired: boolean;
  restored_streak: number;
  xp_spent: number;
  remaining_xp: number;
}

/** POST /gamification/streak-freeze/buy response */
export interface FreezeResponse {
  freeze: Record<string, unknown>;
  xp_spent: number;
  remaining_xp: number;
  freezes_owned: number;
}

// ── Helper: append institution_id as query param ──────────

function withInst(path: string, institutionId: string): string {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}institution_id=${institutionId}`;
}

// ── Profile (Composite XP + streak + badges) ──────────────

export async function getGamificationProfile(
  institutionId: string
): Promise<GamificationProfile> {
  return apiCall<GamificationProfile>(
    withInst('/gamification/profile', institutionId)
  );
}

// ── XP History ────────────────────────────────────────────

export async function getXPHistory(
  institutionId: string,
  options?: { limit?: number; offset?: number }
): Promise<XPHistoryResponse> {
  const params = new URLSearchParams({ institution_id: institutionId });
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  return apiCall<XPHistoryResponse>(`/gamification/xp-history?${params}`);
}

// ── Leaderboard ───────────────────────────────────────────

export async function getLeaderboard(
  institutionId: string,
  options?: { period?: 'weekly' | 'daily'; limit?: number }
): Promise<LeaderboardResponse> {
  const params = new URLSearchParams({ institution_id: institutionId });
  if (options?.period) params.set('period', options.period);
  if (options?.limit) params.set('limit', String(options.limit));
  return apiCall<LeaderboardResponse>(`/gamification/leaderboard?${params}`);
}

// ── Badges ────────────────────────────────────────────────

export async function getBadges(
  category?: string
): Promise<BadgesResponse> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  const qs = params.toString() ? `?${params}` : '';
  return apiCall<BadgesResponse>(`/gamification/badges${qs}`);
}

export async function checkBadges(
  institutionId: string
): Promise<{ new_badges: Array<Record<string, unknown>>; checked: number; awarded: number }> {
  return apiCall(`/gamification/check-badges?institution_id=${institutionId}`, {
    method: 'POST',
  });
}

// ── Notifications ─────────────────────────────────────────

export async function getGamificationNotifications(
  institutionId: string,
  options?: { limit?: number }
): Promise<NotificationsResponse> {
  const params = new URLSearchParams({ institution_id: institutionId });
  if (options?.limit) params.set('limit', String(options.limit));
  return apiCall<NotificationsResponse>(`/gamification/notifications?${params}`);
}

// ── Streak ────────────────────────────────────────────────

export async function getStreakStatus(
  institutionId: string
): Promise<StreakStatusResponse> {
  return apiCall<StreakStatusResponse>(
    withInst('/gamification/streak-status', institutionId)
  );
}

export async function dailyCheckIn(
  institutionId: string
): Promise<CheckInResponse> {
  return apiCall<CheckInResponse>(
    withInst('/gamification/daily-check-in', institutionId),
    { method: 'POST' }
  );
}

export async function buyStreakFreeze(
  institutionId: string
): Promise<FreezeResponse> {
  return apiCall<FreezeResponse>(
    withInst('/gamification/streak-freeze/buy', institutionId),
    { method: 'POST' }
  );
}

export async function repairStreak(
  institutionId: string
): Promise<RepairResponse> {
  return apiCall<RepairResponse>(
    withInst('/gamification/streak-repair', institutionId),
    { method: 'POST' }
  );
}

// ── Goals ─────────────────────────────────────────────────

export async function updateDailyGoal(
  institutionId: string,
  dailyGoal: number
): Promise<Record<string, unknown>> {
  return apiCall('/gamification/daily-goal', {
    method: 'PUT',
    body: JSON.stringify({ institution_id: institutionId, daily_goal: dailyGoal }),
  });
}

export async function completeGoal(
  institutionId: string,
  goalType: string
): Promise<{ goal_type: string; xp_awarded: number; bonus_type: string | null }> {
  return apiCall('/gamification/goals/complete', {
    method: 'POST',
    body: JSON.stringify({ institution_id: institutionId, goal_type: goalType }),
  });
}

export async function initializeGamification(
  institutionId: string
): Promise<{ message: string; already_exists: boolean }> {
  return apiCall('/gamification/onboarding', {
    method: 'POST',
    body: JSON.stringify({ institution_id: institutionId }),
  });
}

// ── Study Queue (separate route file) ─────────────────────

export async function getStudyQueue(options?: {
  course_id?: string;
  limit?: number;
  include_future?: boolean;
}): Promise<StudyQueueResponse> {
  const params = new URLSearchParams();
  if (options?.course_id) params.set('course_id', options.course_id);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.include_future) params.set('include_future', '1');
  const qs = params.toString() ? `?${params}` : '';
  return apiCall<StudyQueueResponse>(`/study-queue${qs}`);
}
