/**
 * Constants for scheduling intelligence algorithms.
 * Thresholds, multipliers, and cognitive load targets.
 */

export const BASE_TIME_MULTIPLIER = 0.75;
export const DIFFICULTY_TIME_SCALE = 0.65;
export const TIME_OVERFLOW_TOLERANCE_MIN = 10;
export const SPACING_RATIO = 0.6;
export const GAIN_FACTOR_DEFAULT = 2.5;
export const GAIN_FACTOR_HARD = 1.8;

export const DIFFICULTY_THRESHOLDS = {
  hard: 0.65,    // >= 0.65 is hard
  medium: 0.35,  // >= 0.35 is medium
  // < 0.35 is easy
};

/** Max consecutive tasks of the same difficulty tier */
export const MAX_CONSECUTIVE_SAME_TIER = 2;

/** Target daily cognitive load (0.5 = balanced mix of hard/easy) */
export const TARGET_DAILY_COGNITIVE_LOAD = 0.5;

/** Tolerance band around target (±0.15) */
export const COGNITIVE_LOAD_TOLERANCE = 0.15;
