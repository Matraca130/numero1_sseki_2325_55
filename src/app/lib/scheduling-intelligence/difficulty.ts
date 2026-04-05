/**
 * Difficulty classification and time adjustment functions.
 * Pure functions for categorizing topic difficulty and scaling study time.
 */

import type { DifficultyTier } from './types';
import {
  DIFFICULTY_THRESHOLDS,
  BASE_TIME_MULTIPLIER,
  DIFFICULTY_TIME_SCALE,
} from './constants';

export function classifyDifficulty(estimate: number | null): DifficultyTier {
  if (estimate === null) return 'medium'; // unknown = assume medium
  if (estimate >= DIFFICULTY_THRESHOLDS.hard) return 'hard';
  if (estimate >= DIFFICULTY_THRESHOLDS.medium) return 'medium';
  return 'easy';
}

/**
 * Adjust estimated study minutes based on topic difficulty.
 * Hard topics get more time, easy topics get less.
 *
 * Based on Bjork & Bjork (2011) desirable difficulties framework:
 * - Hard topics need ~40% more time for adequate encoding
 * - Easy topics can be covered ~25% faster
 */
export function adjustTimeByDifficulty(
  baseMinutes: number,
  difficulty: number | null,
  masteryPercent: number = 0,
): number {
  const safeBase = Math.max(0, baseMinutes);
  const d = difficulty ?? 0.5;

  // Base multiplier from difficulty (0.75 to 1.4)
  const difficultyMultiplier = BASE_TIME_MULTIPLIER + (d * DIFFICULTY_TIME_SCALE);

  // Mastery adjustment: high mastery = less time needed
  const masteryMultiplier = masteryPercent >= 80 ? 0.7
    : masteryPercent >= 60 ? 0.85
    : masteryPercent >= 40 ? 1.0
    : masteryPercent >= 20 ? 1.15
    : 1.3; // very low mastery = more time

  return Math.round(safeBase * difficultyMultiplier * masteryMultiplier);
}

/**
 * Get a difficulty badge configuration for UI display.
 * Classification thresholds match DIFFICULTY_THRESHOLDS.
 */
export function getDifficultyBadge(
  difficulty: number | null,
): { label: string; color: string; emoji: string } {
  if (difficulty === null || difficulty === undefined) {
    return { label: '?', color: '#9ca3af', emoji: '\u2753' }; // gray, question mark
  }

  if (difficulty >= DIFFICULTY_THRESHOLDS.hard) {
    return { label: 'Difícil', color: '#ef4444', emoji: '🔴' }; // red circle
  }

  if (difficulty >= DIFFICULTY_THRESHOLDS.medium) {
    return { label: 'Moderado', color: '#f59e0b', emoji: '\uD83D\uDFE1' }; // yellow circle
  }

  return { label: 'Fácil', color: '#22c55e', emoji: '🟢' }; // green circle
}
