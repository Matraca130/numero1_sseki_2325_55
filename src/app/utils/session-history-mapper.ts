/**
 * Maps StudySessionRecord[] to the AI schedule-agent's sessionHistory payload.
 */

import type { StudySessionRecord } from '@/app/services/studySessionApi';

interface SessionHistoryEntry {
  sessionType: string;
  durationMinutes: number;
  createdAt: string;
  topicId?: string;
}

/**
 * Convert backend StudySessionRecords into the shape expected by
 * StudentProfilePayload.sessionHistory.
 */
export function mapSessionHistoryForAI(
  sessions: StudySessionRecord[],
): SessionHistoryEntry[] {
  return sessions.map((s) => {
    // Compute duration from started_at → completed_at if both exist
    let durationMinutes = 0;
    if (s.started_at && s.completed_at) {
      const start = new Date(s.started_at).getTime();
      const end = new Date(s.completed_at).getTime();
      if (end > start) {
        durationMinutes = Math.round((end - start) / 60_000);
      }
    }

    return {
      sessionType: s.session_type,
      durationMinutes,
      createdAt: s.created_at ?? s.started_at,
    };
  });
}
