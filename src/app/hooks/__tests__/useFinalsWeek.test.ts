// ============================================================
// Hook Tests -- useFinalsWeek
//
// Boundary tests: verifies that >= 2 finals in the same
// ISO week triggers finals week mode, and 1 final does not.
//
// RUN: npx vitest run src/app/hooks/__tests__/useFinalsWeek.test.ts
// ============================================================

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFinalsWeek, toISOWeekKey } from '@/app/hooks/useFinalsWeek';
import type { CalendarEvent } from '@/app/hooks/useCalendarEvents';

// ── Fixture Helper ─────────────────────────────────────────────

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: crypto.randomUUID(),
    student_id: 'student-1',
    course_id: 'course-1',
    institution_id: 'inst-1',
    title: 'Examen',
    date: '2026-06-15',
    time: null,
    location: null,
    is_final: true,
    exam_type: 'written',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('useFinalsWeek', () => {
  it('returns empty set when no events', () => {
    const { result } = renderHook(() => useFinalsWeek([]));
    expect(result.current.size).toBe(0);
  });

  it('returns empty set with 1 final (boundary: below threshold)', () => {
    const events = [
      makeEvent({ date: '2026-06-15', is_final: true }),
    ];

    const { result } = renderHook(() => useFinalsWeek(events));
    expect(result.current.size).toBe(0);
  });

  it('activates finals week with exactly 2 finals in same ISO week (boundary: at threshold)', () => {
    // 2026-06-15 (Monday) and 2026-06-17 (Wednesday) are in the same ISO week
    const events = [
      makeEvent({ date: '2026-06-15', is_final: true }),
      makeEvent({ date: '2026-06-17', is_final: true }),
    ];

    const { result } = renderHook(() => useFinalsWeek(events));
    expect(result.current.size).toBe(1);

    const weekKey = toISOWeekKey('2026-06-15');
    expect(result.current.has(weekKey)).toBe(true);
  });

  it('ignores non-final events', () => {
    const events = [
      makeEvent({ date: '2026-06-15', is_final: false }),
      makeEvent({ date: '2026-06-17', is_final: false }),
    ];

    const { result } = renderHook(() => useFinalsWeek(events));
    expect(result.current.size).toBe(0);
  });

  it('handles finals in different ISO weeks separately', () => {
    // Week 25: 2026-06-15 (Mon)
    // Week 26: 2026-06-22 (Mon)
    const events = [
      makeEvent({ date: '2026-06-15', is_final: true }),
      makeEvent({ date: '2026-06-22', is_final: true }),
    ];

    const { result } = renderHook(() => useFinalsWeek(events));
    // Each week only has 1 final, so neither qualifies
    expect(result.current.size).toBe(0);
  });

  it('activates multiple weeks when each has >= 2 finals', () => {
    const events = [
      // Week 25
      makeEvent({ date: '2026-06-15', is_final: true }),
      makeEvent({ date: '2026-06-16', is_final: true }),
      // Week 26
      makeEvent({ date: '2026-06-22', is_final: true }),
      makeEvent({ date: '2026-06-23', is_final: true }),
    ];

    const { result } = renderHook(() => useFinalsWeek(events));
    expect(result.current.size).toBe(2);
  });
});

describe('toISOWeekKey', () => {
  it('returns correct ISO week format YYYY-WNN', () => {
    const key = toISOWeekKey('2026-06-15');
    expect(key).toMatch(/^\d{4}-W\d{2}$/);
  });
});
