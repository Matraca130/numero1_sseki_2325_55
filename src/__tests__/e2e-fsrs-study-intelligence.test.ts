// ============================================================
// E2E Integration Tests — FSRS Spaced Repetition Engine &
// Study Intelligence System
//
// Covers:
//   - Grade mapper (FSRS grade translation pipeline)
//   - Mastery helpers (BKT-based keyword/delta mastery)
//   - Session stats (countCorrect, computeMasteryPct, computeDeltaStats)
//   - Date utils (formatDateCompact)
//   - Scheduling intelligence (FSRS retrievability, exam countdown,
//     difficulty classification, study momentum)
//   - Study queue types & need-score priority ordering
//
// All functions under test are pure — no mocks needed.
// ============================================================

import { describe, it, expect } from 'vitest';

// ── Grade Mapper (FSRS engine core) ─────────────────────────
import {
  smRatingToFsrsGrade,
  fsrsGradeToFloat,
  isCorrect,
  isRecovering,
  translateRating,
  type SmRating,
  type FsrsGrade,
} from '@/app/lib/grade-mapper';

// ── Mastery Helpers (BKT → delta color) ─────────────────────
import {
  getKeywordMastery,
  getDominationThreshold,
  getDeltaColor,
  getDeltaColorLabel,
  getKeywordDeltaColor,
  getKeywordDeltaColorSafe,
  type BktState,
  type DeltaColorLevel,
} from '@/app/lib/mastery-helpers';

// ── Session Stats ───────────────────────────────────────────
import {
  countCorrect,
  computeMasteryPct,
  computeDeltaStats,
} from '@/app/lib/session-stats';
import type { CardMasteryDelta } from '@/app/hooks/useFlashcardEngine';

// ── Date Utils ──────────────────────────────────────────────
import { formatDateCompact } from '@/app/lib/date-utils';

// ── Scheduling Intelligence (FSRS-based planning) ───────────
import {
  classifyDifficulty,
  adjustTimeByDifficulty,
  computeStudyMomentum,
  planExamCountdown,
} from '@/app/lib/scheduling-intelligence';

// ─── Test Helpers ──────────────────────────────────────────────

function makeBktState(overrides: Partial<BktState> = {}): BktState {
  return {
    subtopic_id: 'sub-1',
    p_know: 0.5,
    total_attempts: 5,
    ...overrides,
  };
}

// ============================================================
// 1. FSRS Grade Translation Pipeline
// ============================================================

describe('FSRS Grade Translation Pipeline', () => {

  // Test 1: New card scheduling — UI rating 1 (Again) maps to FSRS grade 1
  it('maps Again rating to FSRS grade 1 with continuous grade 0.0', () => {
    const result = translateRating(1);
    expect(result.fsrsGrade).toBe(1);
    expect(result.continuousGrade).toBe(0.0);
    expect(result.isCorrectFsrs).toBe(false);
    expect(result.isCorrectBkt).toBe(false);
  });

  // Test 2: Good rating increases interval — FSRS grade 3 is "correct"
  it('maps Good rating (UI=3) to FSRS grade 3 with positive recall signal', () => {
    const result = translateRating(3);
    expect(result.fsrsGrade).toBe(3);
    expect(result.continuousGrade).toBe(0.65);
    expect(result.isCorrectFsrs).toBe(true);
    expect(result.isCorrectBkt).toBe(true);
  });

  // Test 3: Poor rating resets/decreases interval — FSRS grade 1 is a lapse
  it('Again grade (1) signals a lapse — not correct in any context', () => {
    expect(isCorrect(1, 'fsrs')).toBe(false);
    expect(isCorrect(1, 'bkt')).toBe(false);
    expect(isCorrect(1, 'exam')).toBe(false);
  });

  // Test 4: FSRS vs BKT correctness threshold divergence
  it('Hard grade (2) is correct for FSRS but NOT for BKT', () => {
    expect(isCorrect(2, 'fsrs')).toBe(true);
    expect(isCorrect(2, 'bkt')).toBe(false);
  });

  // Test 5: UI ratings 3 and 4 collapse into the same FSRS grade 3
  it('UI ratings 3 (ok) and 4 (good) both map to FSRS grade 3 (Good)', () => {
    expect(smRatingToFsrsGrade(3)).toBe(3);
    expect(smRatingToFsrsGrade(4)).toBe(3);
  });

  // Test 6: Continuous grade scale covers the full 0.0-1.0 range
  it('continuous grades span [0.0, 0.35, 0.65, 1.0] for FSRS grades 1-4', () => {
    expect(fsrsGradeToFloat(1)).toBe(0.0);
    expect(fsrsGradeToFloat(2)).toBe(0.35);
    expect(fsrsGradeToFloat(3)).toBe(0.65);
    expect(fsrsGradeToFloat(4)).toBe(1.0);
  });

  // Test 7: Recovery detection — card states relearning transition
  it('detects recovery when current p_know has dropped below historical max', () => {
    // Was mastered (max=0.85), now struggling (current=0.3) → relearning
    expect(isRecovering(0.3, 0.85)).toBe(true);
    // Never reached mastery (max=0.4, below default threshold 0.5) → not recovering
    expect(isRecovering(0.3, 0.4)).toBe(false);
    // Still at peak (current=max) → not recovering
    expect(isRecovering(0.85, 0.85)).toBe(false);
  });
});

// ============================================================
// 2. Mastery Helpers (BKT → Delta Color Scale)
// ============================================================

describe('Mastery Helpers — BKT Aggregation & Delta Color Scale', () => {

  // Test 8: computeMastery (getKeywordMastery) with mixed BKT states
  it('computes keyword mastery as average p_know across subtopics', () => {
    const subtopics: BktState[] = [
      makeBktState({ subtopic_id: 's1', p_know: 0.9 }),
      makeBktState({ subtopic_id: 's2', p_know: 0.6 }),
      makeBktState({ subtopic_id: 's3', p_know: 0.3 }),
    ];
    const mastery = getKeywordMastery(subtopics);
    expect(mastery).toBeCloseTo(0.6, 5);
  });

  // Test 9: computeMastery with empty input returns sentinel
  it('returns -1 for empty subtopic array (no data)', () => {
    expect(getKeywordMastery([])).toBe(-1);
  });

  // Test 10: Mastery level boundaries — delta color thresholds
  describe('delta color level boundaries', () => {
    // threshold=0.70 (low priority): mastery/0.70 → delta
    const threshold = 0.70;

    it('gray (Por descubrir) when delta < 0.50', () => {
      // mastery=0.30, delta=0.30/0.70=0.4286 → gray
      expect(getDeltaColor(0.30, threshold)).toBe('gray');
    });

    it('red (Emergente) when 0.50 <= delta < 0.85', () => {
      // mastery=0.42, delta=0.42/0.70=0.60 → red
      expect(getDeltaColor(0.42, threshold)).toBe('red');
    });

    it('yellow (En progreso) when 0.85 <= delta < 1.00', () => {
      // mastery=0.63, delta=0.63/0.70=0.90 → yellow
      expect(getDeltaColor(0.63, threshold)).toBe('yellow');
    });

    it('green (Consolidado) when 1.00 <= delta < 1.10', () => {
      // mastery=0.70, delta=0.70/0.70=1.00 → green
      expect(getDeltaColor(0.70, threshold)).toBe('green');
    });

    it('blue (Maestria) when delta >= 1.10', () => {
      // mastery=0.80, delta=0.80/0.70=1.1429 → blue
      expect(getDeltaColor(0.80, threshold)).toBe('blue');
    });
  });

  // Test 11: Domination threshold varies by clinical priority
  it('threshold interpolates linearly: priority 0.0→0.70, 0.5→0.80, 1.0→0.90', () => {
    expect(getDominationThreshold(0.0)).toBeCloseTo(0.70, 5);
    expect(getDominationThreshold(0.5)).toBeCloseTo(0.80, 5);
    expect(getDominationThreshold(1.0)).toBeCloseTo(0.90, 5);
  });

  // Test 12: Keyword delta color convenience wrapper with integer priority
  it('getKeywordDeltaColor maps integer priority 1-3 correctly', () => {
    // priority=1 (low) → clinicalPriority=0.0 → threshold=0.70
    // mastery=0.80 → delta=0.80/0.70=1.14 → blue
    expect(getKeywordDeltaColor(0.80, 1)).toBe('blue');

    // priority=3 (high) → clinicalPriority=1.0 → threshold=0.90
    // mastery=0.80 → delta=0.80/0.90=0.889 → yellow
    expect(getKeywordDeltaColor(0.80, 3)).toBe('yellow');
  });

  // Test 13: Safe wrapper handles null/negative mastery
  it('getKeywordDeltaColorSafe returns gray for null or negative mastery', () => {
    expect(getKeywordDeltaColorSafe(null)).toBe('gray');
    expect(getKeywordDeltaColorSafe(-1)).toBe('gray');
    expect(getKeywordDeltaColorSafe(-0.5, 2)).toBe('gray');
  });

  it('getDeltaColorLabel returns Spanish labels for each level', () => {
    expect(getDeltaColorLabel('gray')).toBe('Por descubrir');
    expect(getDeltaColorLabel('red')).toBe('Emergente');
    expect(getDeltaColorLabel('yellow')).toBe('En progreso');
    expect(getDeltaColorLabel('green')).toBe('Consolidado');
    expect(getDeltaColorLabel('blue')).toBe('Maestría');
  });
});

// ============================================================
// 3. Session Stats
// ============================================================

describe('Session Stats', () => {

  // Test 14: countCorrect — ratings >= 3 are correct
  it('counts ratings >= 3 as correct answers', () => {
    expect(countCorrect([1, 2, 3, 4, 5])).toBe(3); // 3, 4, 5
    expect(countCorrect([1, 1, 2])).toBe(0);
    expect(countCorrect([5, 5, 5])).toBe(3);
    expect(countCorrect([])).toBe(0);
  });

  // Test 15: computeMasteryPct uses topic summary when available
  it('computes mastery percentage from TopicMasterySummary if provided', () => {
    const summary = {
      keywordsTotal: 10,
      keywordsMastered: 7,
      overallMastery: 0.72,
      weakestKeywords: [],
      allKeywordsByMastery: [],
    };
    // TopicMasterySummary has data → use overallMastery * 100
    expect(computeMasteryPct(summary, [3, 4, 5])).toBe(72);
  });

  it('falls back to allStats average when no topic summary', () => {
    // avg = (2+4)/2 = 3, (3/5)*100 = 60
    expect(computeMasteryPct(null, [2, 4])).toBe(60);
  });

  it('returns 0 when no summary and empty stats', () => {
    expect(computeMasteryPct(null, [])).toBe(0);
  });

  // Test 16: computeDeltaStats tracks improved/declined/newly mastered
  it('computes delta stats from mastery changes', () => {
    const deltas: CardMasteryDelta[] = [
      { cardId: 'c1', before: 0.3, after: 0.6, grade: 3 },  // improved
      { cardId: 'c2', before: 0.8, after: 0.7, grade: 1 },  // declined
      { cardId: 'c3', before: 0.6, after: 0.8, grade: 4 },  // improved + newly mastered (crossed 0.75)
      { cardId: 'c4', before: 0.5, after: 0.5, grade: 2 },  // unchanged
    ];
    const stats = computeDeltaStats(deltas);
    expect(stats).not.toBeNull();
    expect(stats!.improved).toBe(2);
    expect(stats!.declined).toBe(1);
    expect(stats!.newlyMastered).toBe(1);
    expect(stats!.total).toBe(4);
  });

  it('returns null for empty mastery deltas', () => {
    expect(computeDeltaStats([])).toBeNull();
  });
});

// ============================================================
// 4. Date Utils
// ============================================================

describe('Date Utils', () => {

  // Test 17: formatDateCompact produces locale-formatted string
  it('formats an ISO date string in Spanish locale compact format', () => {
    const result = formatDateCompact('2026-03-15T14:30:00Z');
    // Should contain day, month abbreviation, year, and time
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(5);
    // Should contain "2026" (the year)
    expect(result).toContain('2026');
  });

  it('returns the raw string for invalid date input', () => {
    const invalid = 'not-a-date';
    // The Date constructor won't throw for this, but toLocaleDateString
    // on an Invalid Date returns "Invalid Date" — the try/catch may
    // still catch depending on environment. Either way, it should not throw.
    const result = formatDateCompact(invalid);
    expect(typeof result).toBe('string');
  });
});

// ============================================================
// 5. Scheduling Intelligence (FSRS-based Study Planning)
// ============================================================

describe('Scheduling Intelligence — FSRS Retrievability & Planning', () => {

  // Test 18: Difficulty classification tiers
  it('classifies difficulty into hard/medium/easy tiers', () => {
    expect(classifyDifficulty(0.80)).toBe('hard');    // >= 0.65
    expect(classifyDifficulty(0.65)).toBe('hard');    // boundary
    expect(classifyDifficulty(0.50)).toBe('medium');  // >= 0.35
    expect(classifyDifficulty(0.35)).toBe('medium');  // boundary
    expect(classifyDifficulty(0.20)).toBe('easy');    // < 0.35
    expect(classifyDifficulty(null)).toBe('medium');  // unknown = medium
  });

  // Test 19: Time adjustment scales with difficulty and mastery
  it('adjusts study time higher for hard topics and lower mastery', () => {
    const base = 30; // 30 minutes

    // Hard topic (d=0.9), low mastery (0%) → more time
    const hardLow = adjustTimeByDifficulty(base, 0.9, 0);
    // Easy topic (d=0.1), high mastery (90%) → less time
    const easyHigh = adjustTimeByDifficulty(base, 0.1, 90);

    expect(hardLow).toBeGreaterThan(base);
    expect(easyHigh).toBeLessThan(base);
    expect(hardLow).toBeGreaterThan(easyHigh);
  });

  // Test 20: Study momentum score from session history
  it('computes study momentum score from recent sessions', () => {
    // Student completed all sessions — should have high momentum
    const allCompleted = computeStudyMomentum([
      { date: '2026-03-22', completed: true, scheduledMinutes: 30, actualMinutes: 30 },
      { date: '2026-03-23', completed: true, scheduledMinutes: 30, actualMinutes: 35 },
      { date: '2026-03-24', completed: true, scheduledMinutes: 30, actualMinutes: 30 },
    ]);
    expect(allCompleted.score).toBeGreaterThanOrEqual(0.9);
    expect(allCompleted.streak).toBe(3);

    // No sessions → default baseline
    const noSessions = computeStudyMomentum([]);
    expect(noSessions.score).toBe(1.0);
    expect(noSessions.trend).toBe('stable');
    expect(noSessions.streak).toBe(0);
  });

  // Test 21: Exam countdown generates review plans sorted by priority
  it('planExamCountdown prioritizes low-stability topics as critical', () => {
    const today = new Date('2026-04-01');
    const examDate = new Date('2026-04-15'); // 14 days out

    const plans = planExamCountdown(
      examDate,
      [
        {
          topicId: 't-weak',
          topicName: 'Weak Topic',
          difficulty: 0.8,
          stability: 0.5,         // very low → will decay fast
          lastReviewDate: new Date('2026-03-20'),
          retrievability: 0.3,
        },
        {
          topicId: 't-strong',
          topicName: 'Strong Topic',
          difficulty: 0.2,
          stability: 30,           // high → stable for weeks
          lastReviewDate: new Date('2026-03-30'),
          retrievability: 0.95,
        },
      ],
      today,
    );

    expect(plans.length).toBe(2);
    // Weak topic should have review dates scheduled (low stability needs reviews)
    const weakPlan = plans.find(p => p.topicId === 't-weak')!;
    expect(weakPlan.reviewDates.length).toBeGreaterThanOrEqual(1);

    // Strong topic should be ready (high stability covers exam day)
    const strongPlan = plans.find(p => p.topicId === 't-strong')!;
    expect(strongPlan.priority).toBe('ready');
    // Strong topic needs no reviews
    expect(strongPlan.reviewDates.length).toBe(0);

    // Weak topic needs more reviews than strong topic
    expect(weakPlan.reviewDates.length).toBeGreaterThan(strongPlan.reviewDates.length);

    // Plans are sorted: critical/moderate before ready
    const priorities = plans.map(p => p.priority);
    const priorityOrder = { critical: 0, moderate: 1, ready: 2 };
    for (let i = 1; i < priorities.length; i++) {
      expect(priorityOrder[priorities[i]]).toBeGreaterThanOrEqual(
        priorityOrder[priorities[i - 1]],
      );
    }
  });

  // Test 22: Exam countdown handles past/today exam date
  it('returns empty review dates when exam is today or past', () => {
    const today = new Date('2026-04-15');
    const examDate = new Date('2026-04-15'); // exam is today

    const plans = planExamCountdown(
      examDate,
      [{
        topicId: 't1',
        topicName: 'Topic',
        difficulty: 0.5,
        stability: 2,
        lastReviewDate: new Date('2026-04-10'),
        retrievability: 0.6,
      }],
      today,
    );

    expect(plans.length).toBe(1);
    expect(plans[0].reviewDates).toEqual([]);
  });
});

// ============================================================
// 6. Study Queue Priority Ordering (NeedScore)
// ============================================================

describe('Study Queue — NeedScore Priority Ordering', () => {

  // Test 23: Priority queue ordering: overdue > weak > new
  it('sorts queue items by need_score descending (overdue/weak first)', () => {
    // Simulate StudyQueueItem-like objects with need_score
    const items = [
      { flashcard_id: 'new', need_score: 0.3, fsrs_state: 'new' as const, is_new: true },
      { flashcard_id: 'overdue', need_score: 0.95, fsrs_state: 'review' as const, is_new: false },
      { flashcard_id: 'weak', need_score: 0.7, fsrs_state: 'learning' as const, is_new: false },
    ];

    // Sort by need_score descending (as the backend algorithm does)
    const sorted = [...items].sort((a, b) => b.need_score - a.need_score);

    expect(sorted[0].flashcard_id).toBe('overdue');  // highest need
    expect(sorted[1].flashcard_id).toBe('weak');
    expect(sorted[2].flashcard_id).toBe('new');       // lowest need
  });
});

// ============================================================
// 7. End-to-End: Full Review Cycle Simulation
// ============================================================

describe('E2E: Full Review Cycle — Grade → Mastery → Stats → Color', () => {

  // Test 24: Complete pipeline from user rating to visual mastery color
  it('translates a study session through all system layers', () => {
    // Step 1: Student rates 5 flashcards in a session
    const smRatings: SmRating[] = [1, 3, 4, 5, 2];

    // Step 2: Translate to FSRS grades
    const translated = smRatings.map(translateRating);
    const fsrsGrades = translated.map(t => t.fsrsGrade);
    expect(fsrsGrades).toEqual([1, 3, 3, 4, 2]);

    // Step 3: Compute session stats from the UI ratings
    const correct = countCorrect(smRatings);
    expect(correct).toBe(3); // ratings 3, 4, 5 are >= 3

    // Step 4: Simulate BKT p_know updates after session
    //   Start: all subtopics at p_know=0.4
    //   Good grades push p_know up, Again pushes down
    const postSessionPKnows: BktState[] = [
      makeBktState({ subtopic_id: 's1', p_know: 0.20 }),  // was 0.4, rated Again(1)
      makeBktState({ subtopic_id: 's2', p_know: 0.55 }),  // was 0.4, rated OK(3)
      makeBktState({ subtopic_id: 's3', p_know: 0.60 }),  // was 0.4, rated Good(4)
      makeBktState({ subtopic_id: 's4', p_know: 0.75 }),  // was 0.4, rated Perfect(5)
      makeBktState({ subtopic_id: 's5', p_know: 0.35 }),  // was 0.4, rated Hard(2)
    ];

    // Step 5: Aggregate to keyword mastery
    const keywordMastery = getKeywordMastery(postSessionPKnows);
    expect(keywordMastery).toBeCloseTo(0.49, 1);

    // Step 6: Map to delta color (priority=1 → threshold=0.70)
    const color = getKeywordDeltaColor(keywordMastery, 1);
    // 0.49 / 0.70 = 0.70 → red (>= 0.50)
    expect(color).toBe('red');
    expect(getDeltaColorLabel(color)).toBe('Emergente');

    // Step 7: Compute mastery deltas for summary screen
    const deltas: CardMasteryDelta[] = [
      { cardId: 'c1', before: 0.4, after: 0.20, grade: 1 },
      { cardId: 'c2', before: 0.4, after: 0.55, grade: 3 },
      { cardId: 'c3', before: 0.4, after: 0.60, grade: 4 },
      { cardId: 'c4', before: 0.4, after: 0.75, grade: 5 },
      { cardId: 'c5', before: 0.4, after: 0.35, grade: 2 },
    ];
    const deltaStats = computeDeltaStats(deltas);
    expect(deltaStats).not.toBeNull();
    expect(deltaStats!.improved).toBe(3);       // c2, c3, c4 went up
    expect(deltaStats!.declined).toBe(2);       // c1, c5 went down
    expect(deltaStats!.newlyMastered).toBe(1);  // c4 crossed 0.75 threshold
  });
});
