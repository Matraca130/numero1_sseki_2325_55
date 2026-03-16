// ============================================================
// Axon — StudyHubHero Contract Tests
//
// Pure TypeScript structural tests — no DOM, no rendering.
// Verifies that the exported types and prop interface conform
// to the contract expected by StudyHubView (the consumer).
// ============================================================
import { describe, it, expect } from 'vitest';
import type { StudyHubHeroProps, TodayStats } from '../StudyHubHero';

describe('StudyHubHero — contract', () => {
  // ── TodayStats shape ────────────────────────────────────────

  it('TodayStats has all required numeric fields', () => {
    const stats: TodayStats = {
      minutes: 30,
      summaries: 2,
      flashcards: 10,
      videos: 1,
    };
    expect(stats.minutes).toBeTypeOf('number');
    expect(stats.summaries).toBeTypeOf('number');
    expect(stats.flashcards).toBeTypeOf('number');
    expect(stats.videos).toBeTypeOf('number');
  });

  // ── Required props ──────────────────────────────────────────

  it('requires all REPO-origin props', () => {
    const props: StudyHubHeroProps = {
      greeting: 'Buenos dias',
      userName: 'Carlos',
      effectiveTopic: { id: 't1', title: 'Anatomia' },
      isAutoSelected: false,
      heroReadingSessions: 3,
      heroProgressPct: 60,
      heroProgress: 0.6,
      heroLastActivity: 'Hace 2h',
      estimatedRemaining: 12,
      streakDays: 5,
      courseName: 'Medicina I',
      sectionName: 'Cardiologia',
      todayStats: { minutes: 30, summaries: 2, flashcards: 10, videos: 1 },
      studyMinutesToday: 30,
      totalCardsReviewed: 100,
      dailyGoalMinutes: 120,
      onContinue: () => {},
    };

    // All required keys must be present
    expect(props.greeting).toBeDefined();
    expect(props.userName).toBeDefined();
    expect(props.onContinue).toBeTypeOf('function');
    expect(props.heroProgress).toBeGreaterThanOrEqual(0);
    expect(props.heroProgress).toBeLessThanOrEqual(1);
    expect(props.heroProgressPct).toBeGreaterThanOrEqual(0);
    expect(props.heroProgressPct).toBeLessThanOrEqual(100);
  });

  // ── effectiveTopic can be null ──────────────────────────────

  it('effectiveTopic accepts null (no topic selected)', () => {
    const props: StudyHubHeroProps = {
      greeting: 'Buenas tardes',
      userName: '',
      effectiveTopic: null,
      isAutoSelected: false,
      heroReadingSessions: 0,
      heroProgressPct: 0,
      heroProgress: 0,
      heroLastActivity: undefined,
      estimatedRemaining: null,
      streakDays: 0,
      courseName: 'Curso',
      sectionName: '',
      todayStats: { minutes: 0, summaries: 0, flashcards: 0, videos: 0 },
      studyMinutesToday: 0,
      totalCardsReviewed: 0,
      dailyGoalMinutes: 120,
      onContinue: () => {},
    };

    expect(props.effectiveTopic).toBeNull();
  });

  // ── FM-origin props are optional ────────────────────────────

  it('FM-origin props (onGoToVideos, onGoToSummaries, images) are optional', () => {
    const minimal: StudyHubHeroProps = {
      greeting: 'Buenos dias',
      userName: 'Test',
      effectiveTopic: null,
      isAutoSelected: false,
      heroReadingSessions: 0,
      heroProgressPct: 0,
      heroProgress: 0,
      heroLastActivity: undefined,
      estimatedRemaining: null,
      streakDays: 0,
      courseName: 'Curso',
      sectionName: '',
      todayStats: { minutes: 0, summaries: 0, flashcards: 0, videos: 0 },
      studyMinutesToday: 0,
      totalCardsReviewed: 0,
      dailyGoalMinutes: 120,
      onContinue: () => {},
    };

    // These should be undefined (optional), not cause TS errors
    expect(minimal.onGoToVideos).toBeUndefined();
    expect(minimal.onGoToSummaries).toBeUndefined();
    expect(minimal.videoImage).toBeUndefined();
    expect(minimal.summaryImage).toBeUndefined();
  });

  // ── heroLastActivity and estimatedRemaining nullability ─────

  it('heroLastActivity accepts string or undefined', () => {
    const withActivity: StudyHubHeroProps['heroLastActivity'] = 'Hace 5 min';
    const withoutActivity: StudyHubHeroProps['heroLastActivity'] = undefined;
    expect(withActivity).toBeTypeOf('string');
    expect(withoutActivity).toBeUndefined();
  });

  it('estimatedRemaining accepts number or null', () => {
    const withEstimate: StudyHubHeroProps['estimatedRemaining'] = 15;
    const withoutEstimate: StudyHubHeroProps['estimatedRemaining'] = null;
    expect(withEstimate).toBeTypeOf('number');
    expect(withoutEstimate).toBeNull();
  });
});
