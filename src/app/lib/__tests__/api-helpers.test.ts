// ============================================================
// TEST: api-helpers — extractItems and formatDuration
//
// Verifies:
//   - extractItems handles array, { items: [...] }, and edge cases
//   - formatDuration converts seconds to m:ss with fallback support
// ============================================================

import { describe, it, expect } from 'vitest';
import { extractItems, formatDuration } from '@/app/lib/api-helpers';

// ══════════════════════════════════════════════════════════════
// SUITE 1: extractItems
// ══════════════════════════════════════════════════════════════

describe('extractItems', () => {
  it('returns the array when given a direct array', () => {
    const input = [{ id: '1' }, { id: '2' }];
    expect(extractItems(input)).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('returns items from { items: [...] } wrapper', () => {
    const input = { items: [{ id: 'a' }, { id: 'b' }], count: 2 };
    expect(extractItems(input)).toEqual([{ id: 'a' }, { id: 'b' }]);
  });

  it('returns [] for null', () => {
    expect(extractItems(null)).toEqual([]);
  });

  it('returns [] for undefined', () => {
    expect(extractItems(undefined)).toEqual([]);
  });

  it('returns [] for object without items property', () => {
    expect(extractItems({ count: 5, total: 10 })).toEqual([]);
  });
});

// ══════════════════════════════════════════════════════════════
// SUITE 2: formatDuration
// ══════════════════════════════════════════════════════════════

describe('formatDuration', () => {
  it('formats 125 seconds as "2:05"', () => {
    expect(formatDuration(125)).toBe('2:05');
  });

  it('returns "--:--" for null (default fallback)', () => {
    expect(formatDuration(null)).toBe('--:--');
  });

  it('returns custom fallback for null when specified', () => {
    expect(formatDuration(null, '')).toBe('');
  });

  it('returns "--:--" for 0 (default fallback)', () => {
    expect(formatDuration(0)).toBe('--:--');
  });

  it('formats 59 seconds as "0:59"', () => {
    expect(formatDuration(59)).toBe('0:59');
  });
});
