// ============================================================
// Tests for calendar-utils.ts — date / event-color helpers
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  formatDateISO,
  getEventColor,
  getTodayMidnight,
} from '@/app/lib/calendar-utils';
import { EVENT_COLORS } from '@/app/lib/calendar-constants';

describe('formatDateISO', () => {
  it('formats a date as YYYY-MM-DD using local fields', () => {
    expect(formatDateISO(new Date(2024, 0, 5))).toBe('2024-01-05');
    expect(formatDateISO(new Date(2024, 11, 31))).toBe('2024-12-31');
  });

  it('zero-pads single-digit months and days', () => {
    expect(formatDateISO(new Date(2025, 2, 9))).toBe('2025-03-09');
  });

  it('handles end-of-year boundary', () => {
    expect(formatDateISO(new Date(2024, 11, 1))).toBe('2024-12-01');
  });
});

describe('getEventColor', () => {
  it('returns the matching color set for known event types', () => {
    expect(getEventColor('exam')).toBe(EVENT_COLORS.exam);
    expect(getEventColor('review')).toBe(EVENT_COLORS.review);
    expect(getEventColor('quiz')).toBe(EVENT_COLORS.quiz);
    expect(getEventColor('practical')).toBe(EVENT_COLORS.practical);
  });

  it('falls back to "exam" for unknown types', () => {
    expect(getEventColor('unknown_type')).toBe(EVENT_COLORS.exam);
    expect(getEventColor('')).toBe(EVENT_COLORS.exam);
  });

  it('returns a frozen color shape with bg/text/border/dot', () => {
    const color = getEventColor('review');
    expect(color).toHaveProperty('bg');
    expect(color).toHaveProperty('text');
    expect(color).toHaveProperty('border');
    expect(color).toHaveProperty('dot');
  });
});

describe('getTodayMidnight', () => {
  it('returns a Date with hours/minutes/seconds/ms zeroed', () => {
    const d = getTodayMidnight();
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });

  it('matches today\'s local Y/M/D', () => {
    const d = getTodayMidnight();
    const now = new Date();
    expect(d.getFullYear()).toBe(now.getFullYear());
    expect(d.getMonth()).toBe(now.getMonth());
    expect(d.getDate()).toBe(now.getDate());
  });

  it('is consistent with formatDateISO for "today"', () => {
    const d = getTodayMidnight();
    const now = new Date();
    expect(formatDateISO(d)).toBe(formatDateISO(now));
  });
});
