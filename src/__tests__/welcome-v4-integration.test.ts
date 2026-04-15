// ============================================================
// Integration Contract Guards — Welcome v4 + Gamification Merge
//
// PURPOSE: Prevent regressions from the Welcome v4 rewrite,
// course mastery hook, recent sessions hook, and SVG gradient
// ID uniqueness fixes.
//
// Guards against:
//   - WelcomeView reverting to old version without gamification data
//   - useCourseMastery or useRecentSessions being deleted
//   - LeaderboardEntry type regressing to Record<string, unknown>
//   - gamificationApi.ts losing daily_goal_minutes (B-001 fix)
//   - Hardcoded SVG gradient IDs (collision when multiple instances)
//
// APPROACH: Import actual modules, check exports, read source
// strings for anti-pattern detection. No network, no DOM.
//
// RUN: pnpm test
// ============================================================

import { describe, it, expect } from 'vitest';
import * as gamificationApi from '@/app/services/gamificationApi';
import * as gamificationTypes from '@/app/types/gamification';
import * as gamificationHelpers from '@/app/utils/gamification-helpers';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Helper: read source file as string ─────────────────────
function readSource(relPath: string): string {
  return readFileSync(resolve(__dirname, '..', relPath), 'utf-8');
}

// ══════════════════════════════════════════════════════════════
// SUITE 1: Welcome v4 required module exports
// ══════════════════════════════════════════════════════════════

describe('Welcome v4 module exports', () => {
  it('gamificationApi exports LeaderboardEntry interface (not Record<string,unknown>)', () => {
    const source = readSource('app/services/gamificationApi.ts');
    expect(source).toContain('interface LeaderboardEntry');
    expect(source).toContain('leaderboard: LeaderboardEntry[]');
    expect(source).not.toMatch(/leaderboard:\s*Array<Record<string,\s*unknown>>/);
  });

  it('gamificationApi uses daily_goal_minutes (B-001 fix)', () => {
    const source = readSource('app/services/gamificationApi.ts');
    expect(source).toContain('daily_goal_minutes');
    const lines = source.split('\n');
    const typeFieldLines = lines.filter(
      l => l.includes('daily_goal') && !l.includes('daily_goal_minutes') && !l.trim().startsWith('//')  && !l.trim().startsWith('*')
    );
    const problematic = typeFieldLines.filter(
      l => !l.includes('updateDailyGoal') && !l.includes('dailyGoal') && !l.includes('daily_goal_minutes')
    );
    expect(problematic).toHaveLength(0);
  });

  it('getLevelInfo exists and returns expected shape', () => {
    const info = gamificationHelpers.getLevelInfo(500);
    expect(info).toHaveProperty('level');
    expect(info).toHaveProperty('title');
    expect(info).toHaveProperty('progress');
    expect(info).toHaveProperty('xpInLevel');
    expect(info).toHaveProperty('xpForNext');
    expect(info).toHaveProperty('next');
  });

  it('LEVEL_THRESHOLDS has 12 levels', () => {
    expect(gamificationTypes.LEVEL_THRESHOLDS).toHaveLength(12);
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 2: New hooks exist and export correctly
// ══════════════════════════════════════════════════════════════

describe('New hooks module existence', () => {
  it('useCourseMastery.ts exports useCourseMastery and CourseMasteryInfo', () => {
    const source = readSource('app/hooks/useCourseMastery.ts');
    expect(source).toContain('export function useCourseMastery');
    expect(source).toContain('export interface CourseMasteryInfo');
    expect(source).toContain('useMemo');
    expect(source).toContain('ContentTree');
  });

  it('useRecentSessions.ts exports useRecentSessions', () => {
    const source = readSource('app/hooks/useRecentSessions.ts');
    expect(source).toContain('export function useRecentSessions');
    expect(source).toContain('useQuery');
    expect(source).toContain('studySessionApi');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 3: SVG Gradient ID Uniqueness (no hardcoded IDs)
// ══════════════════════════════════════════════════════════════

describe('SVG gradient ID uniqueness', () => {
  const FORBIDDEN_PATTERNS = [
    { pattern: /id="daily-ring-g"/, desc: 'hardcoded daily-ring-g in DailyGoalRing' },
    { pattern: /id="axon-ring-v3"/, desc: 'hardcoded axon-ring-v3 in StudentLandingView' },
    { pattern: /gradId\s*=\s*`ring-grad-\$\{size\}`/, desc: 'size-based ring-grad-${size} in ProgressRing' },
  ];

  const filesToCheck = [
    { path: 'app/components/content/GamificationView.tsx', name: 'GamificationView' },
    { path: 'app/components/content/WelcomeView.tsx', name: 'WelcomeView' },
  ];

  for (const file of filesToCheck) {
    for (const { pattern, desc } of FORBIDDEN_PATTERNS) {
      it(`${file.name} does not contain ${desc}`, () => {
        const source = readSource(file.path);
        expect(source).not.toMatch(pattern);
      });
    }
  }

  it('GamificationView imports useId from react', () => {
    const source = readSource('app/components/content/GamificationView.tsx');
    expect(source).toMatch(/import\s*\{[^}]*useId[^}]*\}\s*from\s*['"]react['"]/);
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 4: LeaderboardCard type safety
// ══════════════════════════════════════════════════════════════

describe('LeaderboardCard type safety', () => {
  it('does not use unsafe casts on leaderboard row data', () => {
    const source = readSource('app/components/student/gamification/LeaderboardCard.tsx');
    const castLines = source.split('\n').filter(l =>
      (l.includes('as string') || l.includes('as number')) &&
      !l.trim().startsWith('//') &&
      !l.trim().startsWith('*')
    );
    expect(castLines).toHaveLength(0);
  });

  it('imports LeaderboardEntry from gamificationApi', () => {
    const source = readSource('app/components/student/gamification/LeaderboardCard.tsx');
    expect(source).toContain('LeaderboardEntry');
  });

  it('does not use Record<string, unknown> for row mapping', () => {
    const source = readSource('app/components/student/gamification/LeaderboardCard.tsx');
    expect(source).not.toContain('Record<string, unknown>');
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 5: WelcomeView v4 contract — real data, not hardcoded
// ══════════════════════════════════════════════════════════════

describe('WelcomeView v4 real data contract', () => {
  // NOTE: Since WelcomeView was split into a shell + `welcome/useWelcomeData.ts`
  // + section components, we check the combined surface of the shell and
  // the data hook for the real-data invariants.
  const welcomeSurface = () =>
    readSource('app/components/content/WelcomeView.tsx') +
    '\n' +
    readSource('app/components/welcome/useWelcomeData.ts');

  it('imports useGamificationProfile hook', () => {
    expect(welcomeSurface()).toContain('useGamificationProfile');
  });

  it('imports useStreakStatus hook', () => {
    expect(welcomeSurface()).toContain('useStreakStatus');
  });

  it('imports useXPHistory hook', () => {
    expect(welcomeSurface()).toContain('useXPHistory');
  });

  it('imports useStudyQueue hook', () => {
    expect(welcomeSurface()).toContain('useStudyQueue');
  });

  it('imports useCourseMastery hook', () => {
    expect(welcomeSurface()).toContain('useCourseMastery');
  });

  it('imports useRecentSessions hook', () => {
    expect(welcomeSurface()).toContain('useRecentSessions');
  });

  it('uses daily_goal_minutes (not daily_goal)', () => {
    const source = welcomeSurface();
    expect(source).toContain('daily_goal_minutes');
    const lines = source.split('\n').filter(
      l => /daily_goal(?!_minutes)/.test(l) && !l.trim().startsWith('//') && !l.trim().startsWith('*')
    );
    expect(lines).toHaveLength(0);
  });

  it('uses getLevelInfo for XP level bar', () => {
    expect(welcomeSurface()).toContain('getLevelInfo');
  });

  it('does NOT use hardcoded/mock study data', () => {
    const source = welcomeSurface();
    expect(source).not.toContain("'Dr. Reed'");
    expect(source).not.toContain("Video de Anatomia");
    expect(source).not.toContain("Quiz de Histologia");
    expect(source).not.toContain("Nota: 9.5/10");
  });

  it('exports WelcomeView as named and default export', () => {
    const source = readSource('app/components/content/WelcomeView.tsx');
    expect(source).toContain('export function WelcomeView');
    expect(source).toContain('export default WelcomeView');
  });
});
