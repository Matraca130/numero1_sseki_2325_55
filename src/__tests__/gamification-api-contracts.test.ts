// ============================================================
// API Contract Guards — Gamification Domain
//
// PURPOSE: Prevent API layer regressions that cause runtime
// crashes. Specifically guards against:
//   - PR #58/S1: Hook imports non-existent API functions
//   - PR #58/S3: Function signature misalignment
//   - Level system invariants (12 levels, sorted thresholds)
//   - XP table completeness (every XPAction has a value)
//
// APPROACH: Import the actual modules and verify exports,
// constants, and pure function behavior. No network calls.
//
// RUN: pnpm test
// ============================================================

import { describe, it, expect } from 'vitest';
import * as gamificationApi from '@/app/services/gamificationApi';
import {
  LEVEL_THRESHOLDS,
  XP_TABLE,
  XP_DAILY_CAP,
} from '@/app/types/gamification';
import { getLevelInfo } from '@/app/utils/gamification-helpers';
import type { XPAction } from '@/app/types/gamification';

// ══════════════════════════════════════════════════════════════
// SUITE 1: gamificationApi exports all required functions
//
// Guards against: PR #58/S1 (hooks import undefined functions)
// ══════════════════════════════════════════════════════════════

describe('gamificationApi required exports', () => {
  // Core functions (used directly by hooks via import *)
  const requiredFunctions = [
    'getProfile',
    'getXPHistory',
    'getStreakStatus',
    'dailyCheckIn',
    'repairStreak',
    'buyStreakFreeze',
    'updateDailyGoal',
    'getBadges',
    'checkBadges',
    'getLeaderboard',
    'getNotifications',
    'getStudyQueue',
    'completeGoal',
    'onboarding',
  ] as const;

  for (const fnName of requiredFunctions) {
    it(`exports ${fnName} as a function`, () => {
      expect(typeof (gamificationApi as any)[fnName]).toBe('function');
    });
  }

  // Aliases (backward compat for old hook imports)
  const aliasExports = [
    'getGamificationProfile',
    'getGamificationNotifications',
    'initializeGamification',
  ] as const;

  for (const aliasName of aliasExports) {
    it(`exports alias ${aliasName} as a function`, () => {
      expect(typeof (gamificationApi as any)[aliasName]).toBe('function');
    });
  }
});

// ══════════════════════════════════════════════════════════════
// SUITE 2: Level System Invariants
//
// Guards against: accidental modification of level thresholds
// ══════════════════════════════════════════════════════════════

describe('Level system invariants', () => {
  it('has exactly 12 levels', () => {
    expect(LEVEL_THRESHOLDS).toHaveLength(12);
  });

  it('levels are numbered 1 through 12', () => {
    const levels = LEVEL_THRESHOLDS.map(t => t.level);
    expect(levels).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('XP thresholds are sorted ascending', () => {
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
      expect(LEVEL_THRESHOLDS[i].xp).toBeGreaterThan(LEVEL_THRESHOLDS[i - 1].xp);
    }
  });

  it('first level starts at 0 XP', () => {
    expect(LEVEL_THRESHOLDS[0].xp).toBe(0);
  });

  it('each level has a non-empty title', () => {
    for (const t of LEVEL_THRESHOLDS) {
      expect(t.title.length).toBeGreaterThan(0);
    }
  });

  // getLevelInfo edge cases
  it('getLevelInfo(0) returns level 1', () => {
    const info = getLevelInfo(0);
    expect(info.level).toBe(1);
    expect(info.progress).toBe(0);
  });

  it('getLevelInfo(10000+) returns max level 12 with progress=1', () => {
    const info = getLevelInfo(99999);
    expect(info.level).toBe(12);
    expect(info.progress).toBe(1);
    expect(info.next).toBeNull();
  });

  it('getLevelInfo mid-level returns correct progress', () => {
    // Level 2 starts at 100, level 3 at 300 -> 200 XP range
    // At 200 XP: (200-100)/(300-100) = 100/200 = 0.5
    const info = getLevelInfo(200);
    expect(info.level).toBe(2);
    expect(info.progress).toBeCloseTo(0.5);
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 3: XP Table Completeness
//
// Guards against: new XPAction added without XP value
// ══════════════════════════════════════════════════════════════

describe('XP table completeness', () => {
  const ALL_ACTIONS: XPAction[] = [
    'review_flashcard',
    'review_correct',
    'quiz_answer',
    'quiz_correct',
    'complete_session',
    'complete_reading',
    'complete_video',
    'streak_daily',
    'complete_plan_task',
    'complete_plan',
    'rag_question',
  ];

  it('XP_TABLE covers all known XPAction types', () => {
    for (const action of ALL_ACTIONS) {
      expect(XP_TABLE[action]).toBeDefined();
    }
  });

  it('all XP values are positive integers', () => {
    for (const [action, xp] of Object.entries(XP_TABLE)) {
      expect(xp).toBeGreaterThan(0);
      expect(Number.isInteger(xp)).toBe(true);
    }
  });

  it('XP_DAILY_CAP is a reasonable positive number', () => {
    expect(XP_DAILY_CAP).toBeGreaterThanOrEqual(100);
    expect(XP_DAILY_CAP).toBeLessThanOrEqual(2000);
  });

  it('no single action exceeds daily cap', () => {
    for (const [, xp] of Object.entries(XP_TABLE)) {
      expect(xp).toBeLessThanOrEqual(XP_DAILY_CAP);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 4: API Endpoint Path Format
//
// Guards against: wrong endpoint paths, missing institution_id
// ══════════════════════════════════════════════════════════════

describe('gamificationApi endpoint path conventions', () => {
  // Verify that function source code uses correct path prefixes.
  // This is a defense-in-depth check that catches typos like
  // '/gamificacion/' or '/game/' before they hit the network.

  const fnPathChecks = [
    { fn: 'getProfile',       contains: '/gamification/profile' },
    { fn: 'getXPHistory',     contains: '/gamification/xp-history' },
    { fn: 'getLeaderboard',   contains: '/gamification/leaderboard' },
    { fn: 'getStreakStatus',  contains: '/gamification/streak-status' },
    { fn: 'dailyCheckIn',     contains: '/gamification/daily-check-in' },
    { fn: 'buyStreakFreeze',  contains: '/gamification/streak-freeze/buy' },
    { fn: 'repairStreak',     contains: '/gamification/streak-repair' },
    { fn: 'getBadges',        contains: '/gamification/badges' },
    { fn: 'checkBadges',      contains: '/gamification/check-badges' },
    { fn: 'getNotifications', contains: '/gamification/notifications' },
    { fn: 'getStudyQueue',    contains: '/study-queue' },
  ] as const;

  for (const { fn, contains } of fnPathChecks) {
    it(`${fn}() source includes "${contains}"`, () => {
      const source = (gamificationApi as any)[fn].toString();
      expect(source).toContain(contains);
    });
  }
});
