// ============================================================
// Axon — Student API: Profile & Stats
// Extracted from studentApi.ts (zero functional changes)
// ============================================================

import { apiCall } from '@/app/lib/api';
import type { StudentProfile, StudentStats } from '@/app/types/student';
import { mapProfileFromBackend, mapStatsFromBackend } from './sa-infra';

// ═══════════════════════ PROFILE ═══════════════════════

export async function getProfile(_studentId?: string): Promise<StudentProfile | null> {
  try {
    const raw = await apiCall<any>('/me');
    if (!raw) return null;
    return mapProfileFromBackend(raw);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('404') || msg.includes('401')) return null;
    throw err;
  }
}

export async function updateProfile(
  data: Partial<StudentProfile>,
  _studentId?: string
): Promise<StudentProfile> {
  const payload: Record<string, any> = {};
  if (data.name !== undefined) payload.full_name = data.name;
  if (data.avatarUrl !== undefined) payload.avatar_url = data.avatarUrl;

  const raw = await apiCall<any>('/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return mapProfileFromBackend(raw);
}

// ════════════════════════ STATS ════════════════════════

export async function getStats(_studentId?: string): Promise<StudentStats | null> {
  try {
    const raw = await apiCall<any>('/student-stats');
    if (!raw) return null;
    return mapStatsFromBackend(raw);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('404')) return null;
    throw err;
  }
}

export async function updateStats(
  data: Partial<StudentStats>,
  _studentId?: string
): Promise<StudentStats> {
  const payload: Record<string, any> = {};
  if (data.currentStreak !== undefined) payload.current_streak = data.currentStreak;
  if (data.longestStreak !== undefined) payload.longest_streak = data.longestStreak;
  if (data.totalCardsReviewed !== undefined) payload.total_reviews = data.totalCardsReviewed;
  if (data.totalStudyMinutes !== undefined) payload.total_time_seconds = data.totalStudyMinutes * 60;
  if (data.totalSessions !== undefined) payload.total_sessions = data.totalSessions;
  if (data.lastStudyDate !== undefined) payload.last_study_date = data.lastStudyDate;

  const raw = await apiCall<any>('/student-stats', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapStatsFromBackend(raw);
}
