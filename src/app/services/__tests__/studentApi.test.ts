/**
 * studentApi.test.ts — Tests for student API service layer
 *
 * Coverage:
 *   - sa-infra.ts: isCacheValid, invalidateStudentCaches, parallelWithLimit,
 *                  mapProfileFromBackend, mapStatsFromBackend, mapDailyActivityFromBackend,
 *                  mapSessionFromBackend
 *   - sa-profile-stats.ts: getProfile, updateProfile, getStats, updateStats
 *   - studentApi.ts: fetchStudyIntelligence
 * Mocks: apiCall
 *
 * Run: npx vitest run src/app/services/__tests__/studentApi.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/app/lib/api', () => ({
  apiCall: vi.fn(),
}));

import { apiCall } from '@/app/lib/api';
const mockApiCall = vi.mocked(apiCall);

// ═══ sa-infra.ts — Pure utilities ═══

import {
  isCacheValid,
  invalidateStudentCaches,
  parallelWithLimit,
  mapProfileFromBackend,
  mapStatsFromBackend,
  mapDailyActivityFromBackend,
  mapSessionFromBackend,
  _courseProgressCache,
  _keywordCache,
  CACHE_TTL_MS,
  type CacheEntry,
} from '../student-api/sa-infra';

describe('sa-infra: isCacheValid', () => {
  it('returns false for null', () => {
    expect(isCacheValid(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isCacheValid(undefined)).toBe(false);
  });

  it('returns false for expired entry', () => {
    const entry: CacheEntry<string> = { data: 'test', expiresAt: Date.now() - 1000 };
    expect(isCacheValid(entry)).toBe(false);
  });

  it('returns true for valid entry', () => {
    const entry: CacheEntry<string> = { data: 'test', expiresAt: Date.now() + 60000 };
    expect(isCacheValid(entry)).toBe(true);
  });
});

describe('sa-infra: invalidateStudentCaches', () => {
  it('clears course progress cache and keyword cache', () => {
    _courseProgressCache.entry = { data: [] as any, expiresAt: Date.now() + 60000 };
    _keywordCache.set('test', { data: {}, expiresAt: Date.now() + 60000 });

    invalidateStudentCaches();

    expect(_courseProgressCache.entry).toBeNull();
    expect(_keywordCache.size).toBe(0);
  });
});

describe('sa-infra: parallelWithLimit', () => {
  it('runs all tasks and returns results', async () => {
    const tasks = [
      () => Promise.resolve(1),
      () => Promise.resolve(2),
      () => Promise.resolve(3),
    ];
    const results = await parallelWithLimit(tasks, 2);
    expect(results).toHaveLength(3);
    expect(results.every(r => r.status === 'fulfilled')).toBe(true);
    expect((results[0] as PromiseFulfilledResult<number>).value).toBe(1);
  });

  it('captures rejected tasks', async () => {
    const tasks = [
      () => Promise.resolve('ok'),
      () => Promise.reject(new Error('fail')),
    ];
    const results = await parallelWithLimit(tasks, 2);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
  });

  it('handles empty task list', async () => {
    const results = await parallelWithLimit([], 5);
    expect(results).toEqual([]);
  });

  it('respects concurrency limit', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;
    const tasks = Array.from({ length: 10 }, () => async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise(r => setTimeout(r, 10));
      concurrent--;
      return 'done';
    });

    await parallelWithLimit(tasks, 3);
    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });
});

describe('sa-infra: mapProfileFromBackend', () => {
  it('maps snake_case to camelCase', () => {
    const raw = {
      id: 'u1',
      full_name: 'Test User',
      email: 'test@test.com',
      avatar_url: 'https://img.test/avatar.png',
      created_at: '2025-01-01T00:00:00Z',
    };
    const result = mapProfileFromBackend(raw);
    expect(result.id).toBe('u1');
    expect(result.name).toBe('Test User');
    expect(result.email).toBe('test@test.com');
    expect(result.avatarUrl).toBe('https://img.test/avatar.png');
  });

  it('falls back to email prefix when no full_name', () => {
    const raw = { id: 'u1', email: 'john@test.com' };
    const result = mapProfileFromBackend(raw);
    expect(result.name).toBe('john');
  });

  it('provides default preferences', () => {
    const raw = { id: 'u1', email: 'test@test.com' };
    const result = mapProfileFromBackend(raw);
    expect(result.preferences.language).toBe('es-AR');
    expect(result.preferences.dailyGoalMinutes).toBe(60);
  });
});

describe('sa-infra: mapStatsFromBackend', () => {
  it('converts seconds to minutes', () => {
    const raw = { total_time_seconds: 3600 };
    const result = mapStatsFromBackend(raw);
    expect(result.totalStudyMinutes).toBe(60);
  });

  it('handles missing fields with defaults', () => {
    const result = mapStatsFromBackend({});
    expect(result.totalStudyMinutes).toBe(0);
    expect(result.totalSessions).toBe(0);
    expect(result.currentStreak).toBe(0);
    expect(result.weeklyActivity).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('sa-infra: mapDailyActivityFromBackend', () => {
  it('calculates retention percent', () => {
    const raw = { reviews_count: 10, correct_count: 8, time_spent_seconds: 1800 };
    const result = mapDailyActivityFromBackend(raw);
    expect(result.retentionPercent).toBe(80);
    expect(result.studyMinutes).toBe(30);
    expect(result.cardsReviewed).toBe(10);
  });

  it('returns undefined retention when no reviews', () => {
    const result = mapDailyActivityFromBackend({ reviews_count: 0 });
    expect(result.retentionPercent).toBeUndefined();
  });
});

describe('sa-infra: mapSessionFromBackend', () => {
  it('calculates duration from timestamps', () => {
    const raw = {
      id: 's1',
      started_at: '2025-01-01T10:00:00Z',
      completed_at: '2025-01-01T10:30:00Z',
      session_type: 'flashcard',
      total_reviews: 20,
      correct_reviews: 15,
    };
    const result = mapSessionFromBackend(raw);
    expect(result.durationMinutes).toBe(30);
    expect(result.type).toBe('flashcard');
    expect(result.quizScore).toBe(75);
  });

  it('handles missing completed_at', () => {
    const raw = { id: 's1', started_at: '2025-01-01T10:00:00Z' };
    const result = mapSessionFromBackend(raw);
    expect(result.durationMinutes).toBe(0);
  });
});

// ═══ sa-profile-stats.ts ═══

import { getProfile, updateProfile, getStats } from '../student-api/sa-profile-stats';

describe('sa-profile-stats: getProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls /me and maps the response', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'u1', full_name: 'Test', email: 'test@test.com' });
    const result = await getProfile();
    expect(mockApiCall).toHaveBeenCalledWith('/me');
    expect(result?.name).toBe('Test');
  });

  it('returns null on 404', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('404'));
    const result = await getProfile();
    expect(result).toBeNull();
  });

  it('returns null on 401', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('401 Unauthorized'));
    const result = await getProfile();
    expect(result).toBeNull();
  });

  it('throws on other errors', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('500 Internal'));
    await expect(getProfile()).rejects.toThrow('500');
  });
});

describe('sa-profile-stats: updateProfile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls PUT /me with mapped fields', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'u1', full_name: 'New Name', email: 'test@test.com' });
    await updateProfile({ name: 'New Name', avatarUrl: 'https://img.test/new.png' });
    expect(mockApiCall).toHaveBeenCalledWith('/me', {
      method: 'PUT',
      body: JSON.stringify({ full_name: 'New Name', avatar_url: 'https://img.test/new.png' }),
    });
  });
});

describe('sa-profile-stats: getStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls /student-stats and maps response', async () => {
    mockApiCall.mockResolvedValueOnce({ total_time_seconds: 7200, total_sessions: 5 });
    const result = await getStats();
    expect(result?.totalStudyMinutes).toBe(120);
    expect(result?.totalSessions).toBe(5);
  });

  it('returns null on 404', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('404'));
    const result = await getStats();
    expect(result).toBeNull();
  });
});

// ═══ studentApi.ts barrel: fetchStudyIntelligence ═══

import { fetchStudyIntelligence } from '../studentApi';

describe('fetchStudyIntelligence', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls /study-intelligence with course_id', async () => {
    mockApiCall.mockResolvedValueOnce({ recommendations: [] });
    await fetchStudyIntelligence('course-1');
    expect(mockApiCall).toHaveBeenCalledWith(
      expect.stringContaining('/study-intelligence?course_id=course-1'),
    );
  });

  it('includes optional flags', async () => {
    mockApiCall.mockResolvedValueOnce({ recommendations: [] });
    await fetchStudyIntelligence('course-1', { includePrerequisites: true, includeSimilar: true });
    const url = mockApiCall.mock.calls[0][0] as string;
    expect(url).toContain('include_prerequisites=true');
    expect(url).toContain('include_similar=true');
  });
});
