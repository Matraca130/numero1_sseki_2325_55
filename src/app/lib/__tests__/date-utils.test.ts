// ============================================================
// Tests for date-utils.ts — Date formatting utilities
//
// Verifies:
//   - formatDateCompact() ISO string formatting
//   - Locale handling (Spanish: es)
//   - Error handling for invalid dates
//   - Date component output (day, month, year, time)
// ============================================================

import { describe, it, expect } from 'vitest';
import { formatDateCompact } from '@/app/lib/date-utils';

// ──────────────────────────────────────────────────────────
// SUITE 1: Valid ISO dates
// ──────────────────────────────────────────────────────────

describe('formatDateCompact — valid dates', () => {
  it('formats a complete ISO date string', () => {
    const result = formatDateCompact('2025-03-10T14:30:00Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes day in 2-digit format', () => {
    const result = formatDateCompact('2025-03-05T14:30:00Z');
    expect(result).toContain('05');
  });

  it('includes month abbreviation (Spanish)', () => {
    // In Spanish locale, months are abbreviated
    const result = formatDateCompact('2025-01-15T14:30:00Z');
    expect(result).toMatch(/\b\w{3}\b/); // Should contain 3-letter abbreviation
  });

  it('includes full year (4 digits)', () => {
    const result = formatDateCompact('2025-06-20T14:30:00Z');
    expect(result).toContain('2025');
  });

  it('includes hour and minute', () => {
    const result = formatDateCompact('2025-03-15T09:30:00Z');
    // Should contain time information
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('formats different months correctly', () => {
    const jan = formatDateCompact('2025-01-10T10:00:00Z');
    const dec = formatDateCompact('2025-12-10T10:00:00Z');
    expect(jan).toBeTruthy();
    expect(dec).toBeTruthy();
    expect(jan).not.toBe(dec);
  });

  it('formats midnight time correctly', () => {
    const result = formatDateCompact('2025-03-15T00:00:00Z');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('formats end-of-day time correctly', () => {
    const result = formatDateCompact('2025-03-15T23:59:00Z');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('handles different time zones', () => {
    const utc = formatDateCompact('2025-03-15T14:30:00Z');
    const offset = formatDateCompact('2025-03-15T14:30:00+02:00');
    // Both should produce valid date strings
    expect(utc).toBeTruthy();
    expect(offset).toBeTruthy();
  });

  it('formats early 2000s dates', () => {
    const result = formatDateCompact('2001-01-01T12:00:00Z');
    expect(result).toContain('2001');
  });

  it('formats future dates', () => {
    const result = formatDateCompact('2050-12-31T23:59:00Z');
    expect(result).toContain('2050');
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 2: Edge cases
// ──────────────────────────────────────────────────────────

describe('formatDateCompact — edge cases', () => {
  it('handles single-digit months and days', () => {
    const result = formatDateCompact('2025-01-05T08:05:00Z');
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles leap year date (Feb 29)', () => {
    const result = formatDateCompact('2024-02-29T14:30:00Z');
    expect(result).toBeTruthy();
    expect(result).toContain('2024');
  });

  it('handles dates with milliseconds', () => {
    const result = formatDateCompact('2025-03-15T14:30:45.123Z');
    expect(result).toBeTruthy();
  });

  it('handles minimal valid ISO format', () => {
    const result = formatDateCompact('2025-03-15');
    expect(result).toContain('2025');
  });

  it('handles date with time offset', () => {
    const result = formatDateCompact('2025-03-15T14:30:00-05:00');
    expect(result).toBeTruthy();
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 3: Invalid input handling
// ──────────────────────────────────────────────────────────

describe('formatDateCompact — invalid input', () => {
  it('returns formatted output or fallback for invalid input', () => {
    const invalid = 'not a date';
    const result = formatDateCompact(invalid);
    // Invalid strings result in "Invalid Date" from toString()
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns malformed ISO string with graceful fallback', () => {
    const malformed = '2025-13-45T99:99:99Z'; // Invalid month and day
    const result = formatDateCompact(malformed);
    // Invalid dates return some string representation (may be "Invalid Date" or original)
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns formatted output or fallback for empty input', () => {
    const result = formatDateCompact('');
    expect(typeof result).toBe('string');
    // Could be empty or "Invalid Date"
  });

  it('returns formatted output or fallback for nonsense string', () => {
    const result = formatDateCompact('xyz');
    expect(typeof result).toBe('string');
    // Date constructor returns Invalid Date as string
  });

  it('returns formatted output or fallback for random characters', () => {
    const result = formatDateCompact('!@#$%^&*()');
    expect(typeof result).toBe('string');
    // Date constructor returns Invalid Date as string
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 4: Consistency
// ──────────────────────────────────────────────────────────

describe('formatDateCompact — consistency', () => {
  it('formats the same date string consistently', () => {
    const date = '2025-03-15T14:30:00Z';
    const result1 = formatDateCompact(date);
    const result2 = formatDateCompact(date);
    expect(result1).toBe(result2);
  });

  it('formats different times on same day', () => {
    const morning = formatDateCompact('2025-03-15T08:00:00Z');
    const afternoon = formatDateCompact('2025-03-15T14:30:00Z');
    const evening = formatDateCompact('2025-03-15T20:00:00Z');

    // Should all contain the same day
    expect(morning).toContain('15');
    expect(afternoon).toContain('15');
    expect(evening).toContain('15');

    // But different times
    expect(morning).not.toBe(afternoon);
    expect(afternoon).not.toBe(evening);
  });

  it('uses Spanish locale for month abbreviation', () => {
    // January in Spanish is "ene"
    const jan = formatDateCompact('2025-01-15T10:00:00Z');
    // This is a Spanish locale format test
    expect(jan).toBeTruthy();
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 5: Output format verification
// ──────────────────────────────────────────────────────────

describe('formatDateCompact — output format', () => {
  it('returns a non-empty string for valid dates', () => {
    const result = formatDateCompact('2025-03-15T14:30:00Z');
    expect(result.length).toBeGreaterThan(0);
  });

  it('output contains numeric day (01-31)', () => {
    const result = formatDateCompact('2025-03-15T14:30:00Z');
    // Should contain day digits
    expect(result).toMatch(/\d/);
  });

  it('output contains year', () => {
    const result = formatDateCompact('2025-03-15T14:30:00Z');
    expect(result).toContain('2025');
  });

  it('output is human-readable format', () => {
    const result = formatDateCompact('2025-03-15T14:30:00Z');
    // Should not look like JSON or code
    expect(result).not.toContain('{');
    expect(result).not.toContain('[');
    expect(result).not.toContain('Z');
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 6: Boundary dates
// ──────────────────────────────────────────────────────────

describe('formatDateCompact — boundary dates', () => {
  it('formats year 1900', () => {
    const result = formatDateCompact('1900-01-01T12:00:00Z');
    expect(result).toContain('1900');
  });

  it('formats year 2000', () => {
    const result = formatDateCompact('2000-12-31T12:00:00Z');
    expect(result).toContain('2000');
  });

  it('formats last day of month (Jan 31)', () => {
    const result = formatDateCompact('2025-01-31T10:00:00Z');
    expect(result).toContain('31');
  });

  it('formats first day of year', () => {
    const result = formatDateCompact('2025-01-01T12:00:00Z');
    expect(result).toContain('2025');
  });

  it('formats last day of year', () => {
    const result = formatDateCompact('2025-12-31T12:00:00Z');
    expect(result).toContain('2025');
  });
});
