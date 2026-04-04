/**
 * Maps StudySessionRecord[] from the backend into the AI schedule-agent payload format.
 * Used by plan-generation.ts and reschedule-runner.ts to populate sessionHistory
 * in the StudentProfilePayload sent to the AI.
 */

import type { StudySessionRecord } from '@/app/services/platformApi';

export interface MappedSessionHistory {
  sessionType: string;
  durationMinutes: number;
  createdAt: string;
  topicId?: string;
}

/**
 * Convert backend StudySessionRecords into the AI payload format.
 * Only includes completed sessions. Duration is estimated from total_reviews
 * since per-session time tracking is not yet available.
 */
export function mapSessionHistoryForAI(
  records: StudySessionRecord[],
): MappedSessionHistory[] {
  return records
    .filter(r => r.completed_at)
    .map(r => ({
      sessionType: r.session_type,
      durationMinutes: Math.round((r.total_reviews || 1) * 1.5),
      createdAt: r.completed_at!,
      topicId: undefined,
    }));
}
