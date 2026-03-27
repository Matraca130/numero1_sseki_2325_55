// ============================================================
// Hook Tests -- useHeatmap
//
// Tests the useHeatmap hook with empty input and with data.
// Validates level computation and streak logic.
//
// RUN: npx vitest run src/app/hooks/__tests__/useHeatmap.test.ts
// ============================================================

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHeatmap } from '@/app/hooks/useHeatmap';
import type { HeatmapEntry } from '@/app/hooks/useCalendarEvents';

describe('useHeatmap', () => {
  it('returns empty map and 0 streak for empty input', () => {
    const { result } = renderHook(() => useHeatmap([]));

    expect(result.current.heatmapMap.size).toBe(0);
    expect(result.current.days).toEqual([]);
    expect(result.current.currentStreak).toBe(0);
  });

  it('computes correct levels for various minute thresholds', () => {
    const entries: HeatmapEntry[] = [
      { date: '2026-01-01', minutes: 0 },   // level 0
      { date: '2026-01-02', minutes: 5 },   // level 1
      { date: '2026-01-03', minutes: 20 },  // level 2
      { date: '2026-01-04', minutes: 45 },  // level 3
      { date: '2026-01-05', minutes: 90 },  // level 4
    ];

    const { result } = renderHook(() => useHeatmap(entries));

    expect(result.current.days).toHaveLength(5);
    expect(result.current.days[0].level).toBe(0);
    expect(result.current.days[1].level).toBe(1);
    expect(result.current.days[2].level).toBe(2);
    expect(result.current.days[3].level).toBe(3);
    expect(result.current.days[4].level).toBe(4);
  });

  it('marks streakDay correctly based on 30-minute threshold', () => {
    const entries: HeatmapEntry[] = [
      { date: '2026-01-01', minutes: 29 },  // not a streak day
      { date: '2026-01-02', minutes: 30 },  // streak day
      { date: '2026-01-03', minutes: 60 },  // streak day
    ];

    const { result } = renderHook(() => useHeatmap(entries));

    expect(result.current.days[0].streakDay).toBe(false);
    expect(result.current.days[1].streakDay).toBe(true);
    expect(result.current.days[2].streakDay).toBe(true);
  });

  it('populates heatmapMap keyed by date', () => {
    const entries: HeatmapEntry[] = [
      { date: '2026-03-15', minutes: 45 },
    ];

    const { result } = renderHook(() => useHeatmap(entries));

    expect(result.current.heatmapMap.has('2026-03-15')).toBe(true);
    const day = result.current.heatmapMap.get('2026-03-15')!;
    expect(day.minutes).toBe(45);
    expect(day.level).toBe(3);
    expect(day.label).toBeDefined();
  });
});
