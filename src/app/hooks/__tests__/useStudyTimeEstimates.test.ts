// ============================================================
// Axon -- Tests for useStudyTimeEstimates
//
// Tests the exported sessionDurationMinutes function and the
// useStudyTimeEstimates hook behavior (via renderHook).
//
// Covers:
//   1. sessionDurationMinutes: valid sessions, outliers, nulls
//   2. Hook: fallback estimates when no real data
//   3. Hook: per-type estimates with real session data
//   4. Hook: confidence levels (high, medium, low, fallback)
//   5. Hook: computeTotalHours and computeWeeklyHours
//   6. Hook: error handling when sessions fetch fails
//   7. Hook: hasRealData detection
//
// RUN: npx vitest run src/app/hooks/__tests__/useStudyTimeEstimates.test.ts
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { StudySessionRecord } from '@/app/services/platformApi';

// -- Mock StudentDataContext --------------------------------

let mockStudentContext = {
  stats: null as { totalStudyMinutes: number; totalSessions: number } | null,
  dailyActivity: [] as Array<{ studyMinutes: number; sessionsCount: number }>,
  loading: false,
};

vi.mock('@/app/context/StudentDataContext', () => ({
  useStudentDataContext: () => mockStudentContext,
}));

// -- Mock platformApi (getStudySessions) --------------------

const mockGetStudySessions = vi.fn();

vi.mock('@/app/services/platformApi', () => ({
  getStudySessions: (...args: unknown[]) => mockGetStudySessions(...args),
}));

// -- Mock constants -----------------------------------------

vi.mock('@/app/utils/constants', () => ({
  getAxonToday: () => new Date(2026, 1, 7), // Feb 7, 2026
  METHOD_TIME_DEFAULTS: {
    flashcard: 20,
    quiz: 15,
    video: 35,
    resumo: 40,
    '3d': 15,
    reading: 30,
  },
}));

// -- Import AFTER mocks ------------------------------------

import { sessionDurationMinutes } from '../useStudyTimeEstimates';
import { useStudyTimeEstimates } from '../useStudyTimeEstimates';

// -- Fixture Helpers ----------------------------------------

function makeSession(
  overrides: Partial<StudySessionRecord> & { created_at: string; completed_at: string | null; session_type: string },
): StudySessionRecord {
  return {
    id: `session-${Math.random().toString(36).slice(2, 8)}`,
    student_id: 'user-001',
    session_type: overrides.session_type,
    created_at: overrides.created_at,
    completed_at: overrides.completed_at,
    reviews_count: 10,
    correct_count: 8,
    time_spent_seconds: 600,
    ...overrides,
  } as StudySessionRecord;
}

/** Create N sessions of a given type with specified duration in minutes */
function makeSessionsOfType(type: string, count: number, durationMinutes: number): StudySessionRecord[] {
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(2026, 1, 1 + i, 10, 0);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    return makeSession({
      session_type: type,
      created_at: start.toISOString(),
      completed_at: end.toISOString(),
    });
  });
}

// ============================================================
// SUITE 1: sessionDurationMinutes (pure function)
// ============================================================

describe('sessionDurationMinutes', () => {
  it('computes duration in minutes from created_at and completed_at', () => {
    const session = makeSession({
      session_type: 'flashcard',
      created_at: '2026-02-07T10:00:00Z',
      completed_at: '2026-02-07T10:30:00Z',
    });
    expect(sessionDurationMinutes(session)).toBe(30);
  });

  it('returns null when completed_at is null', () => {
    const session = makeSession({
      session_type: 'flashcard',
      created_at: '2026-02-07T10:00:00Z',
      completed_at: null,
    });
    expect(sessionDurationMinutes(session)).toBeNull();
  });

  it('returns null when completed_at is before created_at', () => {
    const session = makeSession({
      session_type: 'flashcard',
      created_at: '2026-02-07T10:30:00Z',
      completed_at: '2026-02-07T10:00:00Z',
    });
    expect(sessionDurationMinutes(session)).toBeNull();
  });

  it('returns null for sessions shorter than 2 minutes (outlier)', () => {
    const session = makeSession({
      session_type: 'flashcard',
      created_at: '2026-02-07T10:00:00Z',
      completed_at: '2026-02-07T10:01:30Z', // 1.5 min
    });
    expect(sessionDurationMinutes(session)).toBeNull();
  });

  it('returns null for sessions longer than 120 minutes (outlier)', () => {
    const session = makeSession({
      session_type: 'flashcard',
      created_at: '2026-02-07T10:00:00Z',
      completed_at: '2026-02-07T12:01:00Z', // 121 min
    });
    expect(sessionDurationMinutes(session)).toBeNull();
  });

  it('returns valid duration at boundary (exactly 2 minutes)', () => {
    const session = makeSession({
      session_type: 'flashcard',
      created_at: '2026-02-07T10:00:00Z',
      completed_at: '2026-02-07T10:02:00Z',
    });
    expect(sessionDurationMinutes(session)).toBe(2);
  });

  it('returns valid duration at boundary (exactly 120 minutes)', () => {
    const session = makeSession({
      session_type: 'flashcard',
      created_at: '2026-02-07T10:00:00Z',
      completed_at: '2026-02-07T12:00:00Z',
    });
    expect(sessionDurationMinutes(session)).toBe(120);
  });
});

// ============================================================
// SUITE 2: useStudyTimeEstimates hook
// ============================================================

describe('useStudyTimeEstimates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStudentContext = {
      stats: null,
      dailyActivity: [],
      loading: false,
    };
    mockGetStudySessions.mockResolvedValue([]);
  });

  // -- Fallback estimates (no real data) -------------------

  describe('when no real data exists', () => {
    it('returns static defaults with fallback confidence', async () => {
      const { result } = renderHook(() => useStudyTimeEstimates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const flashcard = result.current.getEstimate('flashcard');
      expect(flashcard.estimatedMinutes).toBe(20);
      expect(flashcard.confidence).toBe('fallback');
      expect(flashcard.sampleSize).toBe(0);

      expect(result.current.overallConfidence).toBe('fallback');
      expect(result.current.hasRealData).toBe(false);
    });

    it('getEstimate returns fallback for unknown method', async () => {
      const { result } = renderHook(() => useStudyTimeEstimates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const unknown = result.current.getEstimate('teleportation');
      expect(unknown.estimatedMinutes).toBe(25); // default fallback
      expect(unknown.confidence).toBe('fallback');
    });
  });

  // -- High confidence (5+ sessions) ----------------------

  describe('when 5+ sessions of a type exist', () => {
    it('returns high confidence estimate with trimmed mean', async () => {
      const sessions = makeSessionsOfType('flashcard', 6, 15);
      mockGetStudySessions.mockResolvedValue(sessions);

      const { result } = renderHook(() => useStudyTimeEstimates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const flashcard = result.current.getEstimate('flashcard');
      expect(flashcard.confidence).toBe('high');
      expect(flashcard.sampleSize).toBe(6);
      expect(flashcard.estimatedMinutes).toBe(15);
    });
  });

  // -- Medium confidence (2-4 sessions) -------------------

  describe('when 2-4 sessions of a type exist', () => {
    it('returns medium confidence estimate', async () => {
      const sessions = makeSessionsOfType('flashcard', 3, 18);
      mockGetStudySessions.mockResolvedValue(sessions);

      const { result } = renderHook(() => useStudyTimeEstimates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const flashcard = result.current.getEstimate('flashcard');
      expect(flashcard.confidence).toBe('medium');
      expect(flashcard.sampleSize).toBe(3);
      expect(flashcard.estimatedMinutes).toBe(18);
    });
  });

  // -- Low confidence (1 session) -------------------------

  describe('when only 1 session of a type exists', () => {
    it('returns low confidence with blended estimate (70% real, 30% static)', async () => {
      const sessions = makeSessionsOfType('flashcard', 1, 30);
      mockGetStudySessions.mockResolvedValue(sessions);

      const { result } = renderHook(() => useStudyTimeEstimates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const flashcard = result.current.getEstimate('flashcard');
      expect(flashcard.confidence).toBe('low');
      expect(flashcard.sampleSize).toBe(1);
      // Blended: 30 * 0.7 + 20 * 0.3 = 21 + 6 = 27
      expect(flashcard.estimatedMinutes).toBe(27);
    });
  });

  // -- computeTotalHours ----------------------------------

  describe('computeTotalHours', () => {
    it('returns 0 when topicCount is 0', async () => {
      const { result } = renderHook(() => useStudyTimeEstimates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.computeTotalHours(0, ['flashcard'])).toBe(0);
    });

    it('returns 0 when methodIds is empty', async () => {
      const { result } = renderHook(() => useStudyTimeEstimates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.computeTotalHours(5, [])).toBe(0);
    });

    it('computes total hours from estimates', async () => {
      const { result } = renderHook(() => useStudyTimeEstimates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // 3 topics * (flashcard:20min + quiz:15min) = 3 * 35 = 105 min = ceil(1.75) = 2 hours
      const hours = result.current.computeTotalHours(3, ['flashcard', 'quiz']);
      expect(hours).toBe(2);
    });
  });

  // -- computeWeeklyHours ---------------------------------

  describe('computeWeeklyHours', () => {
    it('returns null when completionDate is null', async () => {
      const { result } = renderHook(() => useStudyTimeEstimates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.computeWeeklyHours(3, ['flashcard'], null)).toBeNull();
    });

    it('returns null when total hours is 0', async () => {
      const { result } = renderHook(() => useStudyTimeEstimates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.computeWeeklyHours(0, ['flashcard'], '2026-03-07')).toBeNull();
    });

    it('computes weekly hours based on deadline', async () => {
      const { result } = renderHook(() => useStudyTimeEstimates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // 10 topics * flashcard:20min = 200 min = ceil(3.33) = 4 hours total
      // Deadline 4 weeks from Feb 7 = Mar 7 = 28 days = 4 weeks
      // Weekly = ceil(4 / 4) = 1
      const weekly = result.current.computeWeeklyHours(10, ['flashcard'], '2026-03-07');
      expect(weekly).toBeGreaterThan(0);
      expect(typeof weekly).toBe('number');
    });
  });

  // -- Error handling -------------------------------------

  describe('error handling', () => {
    it('sets error but still returns estimates when sessions fetch fails', async () => {
      mockGetStudySessions.mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useStudyTimeEstimates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      // Estimates still available (fallback)
      const flashcard = result.current.getEstimate('flashcard');
      expect(flashcard.estimatedMinutes).toBe(20);
      expect(flashcard.confidence).toBe('fallback');

      consoleSpy.mockRestore();
    });
  });

  // -- summary stats --------------------------------------

  describe('summary', () => {
    it('reports 0 sessions analyzed when no real data', async () => {
      const { result } = renderHook(() => useStudyTimeEstimates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.summary.totalSessionsAnalyzed).toBe(0);
      expect(result.current.summary.daysOfActivityAnalyzed).toBe(0);
      expect(result.current.summary.avgMinutesPerSession).toBeNull();
    });

    it('reports correct count of analyzed sessions', async () => {
      const sessions = makeSessionsOfType('flashcard', 5, 20);
      mockGetStudySessions.mockResolvedValue(sessions);

      const { result } = renderHook(() => useStudyTimeEstimates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.summary.totalSessionsAnalyzed).toBe(5);
    });
  });

  // -- Loading state --------------------------------------

  describe('loading state', () => {
    it('starts loading and finishes after fetch', async () => {
      mockGetStudySessions.mockResolvedValue([]);

      const { result } = renderHook(() => useStudyTimeEstimates());

      // Eventually loading becomes false
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('reflects studentLoading from context', async () => {
      mockStudentContext.loading = true;
      mockGetStudySessions.mockResolvedValue([]);

      const { result } = renderHook(() => useStudyTimeEstimates());

      await waitFor(() => {
        // Even after sessions load, if student context is loading, overall is loading
        expect(result.current.loading).toBe(true);
      });
    });
  });
});
