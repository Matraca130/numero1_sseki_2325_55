// ============================================================
// Hook Tests -- useCalendarEvents
//
// Tests that the hook exports the correct shape (types and
// query key factory). Since the hook depends on React Query
// and apiCall, we test the pure parts: types and query keys.
//
// RUN: npx vitest run src/app/hooks/__tests__/useCalendarEvents.test.ts
// ============================================================

import { describe, it, expect } from 'vitest';
import { calendarKeys } from '@/app/hooks/useCalendarEvents';
import type {
  CalendarEvent,
  HeatmapEntry,
  CalendarTask,
  CalendarData,
} from '@/app/types/calendar';

describe('useCalendarEvents — query keys', () => {
  it('calendarKeys.data returns a tuple with correct structure', () => {
    const key = calendarKeys.data('2026-03-01', '2026-03-31');
    expect(key).toEqual(['calendar-data', '2026-03-01', '2026-03-31']);
  });

  it('different date ranges produce different keys', () => {
    const key1 = calendarKeys.data('2026-03-01', '2026-03-31');
    const key2 = calendarKeys.data('2026-04-01', '2026-04-30');
    expect(key1).not.toEqual(key2);
  });
});

describe('useCalendarEvents — type shape validation', () => {
  it('CalendarEvent has required fields', () => {
    const event: CalendarEvent = {
      id: 'test-id',
      student_id: 'student-1',
      course_id: 'course-1',
      institution_id: 'inst-1',
      title: 'Parcial Algebra',
      date: '2026-04-15',
      time: '10:00',
      location: 'Aula 3',
      is_final: false,
      exam_type: 'written',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    expect(event.id).toBeDefined();
    expect(event.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof event.is_final).toBe('boolean');
  });

  it('HeatmapEntry has date and minutes', () => {
    const entry: HeatmapEntry = { date: '2026-03-15', minutes: 45 };
    expect(entry.date).toBeDefined();
    expect(typeof entry.minutes).toBe('number');
  });

  it('CalendarData has all three arrays', () => {
    const data: CalendarData = {
      events: [],
      heatmap: [],
      tasks: [],
    };
    expect(Array.isArray(data.events)).toBe(true);
    expect(Array.isArray(data.heatmap)).toBe(true);
    expect(Array.isArray(data.tasks)).toBe(true);
  });
});
