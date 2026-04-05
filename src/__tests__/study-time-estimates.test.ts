// Tests for sessionDurationMinutes (useStudyTimeEstimates)
//
// Validates the core duration calculation that was broken by
// the started_at -> created_at field mismatch.

import { describe, it, expect } from 'vitest';
import { sessionDurationMinutes } from '@/app/hooks/useStudyTimeEstimates';
import type { StudySessionRecord } from '@/app/services/studySessionApi';

function makeSession(
  overrides: Partial<StudySessionRecord> & { created_at: string },
): StudySessionRecord {
  return {
    id: 'test-session-1',
    session_type: 'flashcard',
    started_at: overrides.created_at,
    total_reviews: 10,
    correct_reviews: 8,
    ...overrides,
  };
}

describe('sessionDurationMinutes', () => {
  it('returns ~25 for a 25-minute session', () => {
    const session = makeSession({
      created_at: '2025-06-01T10:00:00Z',
      completed_at: '2025-06-01T10:25:00Z',
    });
    expect(sessionDurationMinutes(session)).toBeCloseTo(25, 1);
  });

  it('returns null when created_at is missing (empty string)', () => {
    const session = makeSession({
      created_at: '',
      completed_at: '2025-06-01T10:25:00Z',
    });
    expect(sessionDurationMinutes(session)).toBeNull();
  });

  it('returns null when completed_at is missing', () => {
    const session = makeSession({
      created_at: '2025-06-01T10:00:00Z',
      completed_at: null,
    });
    expect(sessionDurationMinutes(session)).toBeNull();
  });

  it('returns null for sessions shorter than 2 minutes (outlier)', () => {
    const session = makeSession({
      created_at: '2025-06-01T10:00:00Z',
      completed_at: '2025-06-01T10:01:30Z',
    });
    expect(sessionDurationMinutes(session)).toBeNull();
  });

  it('returns null for sessions longer than 120 minutes (outlier)', () => {
    const session = makeSession({
      created_at: '2025-06-01T10:00:00Z',
      completed_at: '2025-06-01T12:30:00Z',
    });
    expect(sessionDurationMinutes(session)).toBeNull();
  });

  it('returns null when completed_at is before created_at', () => {
    const session = makeSession({
      created_at: '2025-06-01T11:00:00Z',
      completed_at: '2025-06-01T10:00:00Z',
    });
    expect(sessionDurationMinutes(session)).toBeNull();
  });

  it('accepts sessions exactly at the 2-minute boundary', () => {
    const session = makeSession({
      created_at: '2025-06-01T10:00:00Z',
      completed_at: '2025-06-01T10:02:00Z',
    });
    expect(sessionDurationMinutes(session)).toBeCloseTo(2, 1);
  });

  it('accepts sessions exactly at the 120-minute boundary', () => {
    const session = makeSession({
      created_at: '2025-06-01T10:00:00Z',
      completed_at: '2025-06-01T12:00:00Z',
    });
    expect(sessionDurationMinutes(session)).toBeCloseTo(120, 1);
  });
});
