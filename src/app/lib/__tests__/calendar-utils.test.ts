// ============================================================
// Axon -- Tests for calendar-utils.ts
//
// Pure utilities: no mocks required.
//   - formatDateISO  — YYYY-MM-DD output
//   - getEventColor  — lookup EVENT_COLORS with 'exam' fallback
//   - getTodayMidnight — Date at local 00:00:00
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  formatDateISO,
  getEventColor,
  getTodayMidnight,
} from '@/app/lib/calendar-utils';
import { EVENT_COLORS } from '@/app/lib/calendar-constants';

describe('formatDateISO', () => {
  it('formats a date in YYYY-MM-DD with zero padding', () => {
    const d = new Date(2024, 0, 5); // Jan 5 2024
    expect(formatDateISO(d)).toBe('2024-01-05');
  });

  it('pads month correctly for single-digit months', () => {
    expect(formatDateISO(new Date(2026, 3, 9))).toBe('2026-04-09');
  });

  it('pads day correctly for single-digit days', () => {
    expect(formatDateISO(new Date(2026, 10, 1))).toBe('2026-11-01');
  });

  it('handles December (month index 11) as "12"', () => {
    expect(formatDateISO(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('handles January (month index 0) as "01"', () => {
    expect(formatDateISO(new Date(2026, 0, 1))).toBe('2026-01-01');
  });

  it('outputs a 10-char string', () => {
    expect(formatDateISO(new Date(2026, 5, 15))).toHaveLength(10);
  });
});

describe('getEventColor', () => {
  it('returns the color set for a known type ("exam")', () => {
    expect(getEventColor('exam')).toBe(EVENT_COLORS.exam);
  });

  it('returns color for "review"', () => {
    expect(getEventColor('review')).toBe(EVENT_COLORS.review);
  });

  it('returns color for "study"', () => {
    expect(getEventColor('study')).toBe(EVENT_COLORS.study);
  });

  it('returns color for "oral"', () => {
    expect(getEventColor('oral')).toBe(EVENT_COLORS.oral);
  });

  it('falls back to EVENT_COLORS.exam for an unknown type', () => {
    expect(getEventColor('not-a-type')).toBe(EVENT_COLORS.exam);
  });

  it('falls back to EVENT_COLORS.exam for empty string', () => {
    expect(getEventColor('')).toBe(EVENT_COLORS.exam);
  });

  it('returned object always has bg/text/border/dot keys', () => {
    const result = getEventColor('practical');
    expect(result).toHaveProperty('bg');
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('border');
    expect(result).toHaveProperty('dot');
  });
});

describe('getTodayMidnight', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a Date with hours/min/sec/ms zeroed', () => {
    vi.setSystemTime(new Date(2026, 3, 18, 14, 33, 22, 555));
    const result = getTodayMidnight();
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it('preserves the current Y/M/D', () => {
    vi.setSystemTime(new Date(2026, 3, 18, 14, 33, 22, 555));
    const result = getTodayMidnight();
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(3);
    expect(result.getDate()).toBe(18);
  });

  it('returns a Date instance', () => {
    expect(getTodayMidnight()).toBeInstanceOf(Date);
  });
});
