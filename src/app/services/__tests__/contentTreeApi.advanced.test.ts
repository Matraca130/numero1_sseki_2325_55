// ============================================================
// Axon -- Advanced Tests for contentTreeApi service
//
// PURPOSE: Comprehensive testing of edge cases, error scenarios,
// and complex interactions in the API layer.
//
// APPROACH: Mock apiCall() and verify:
//   1. Error handling and propagation
//   2. Null/undefined parameter handling
//   3. Large payload handling
//   4. Request batching (reorder with many items)
//   5. Type safety and type coercion
//   6. Concurrent request scenarios (no actual concurrency, but testing serial correctness)
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// -- Mock apiCall BEFORE importing API module --
const mockApiCall = vi.fn();
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: any[]) => mockApiCall(...args),
}));

import {
  getContentTree,
  createCourse,
  updateCourse,
  deleteCourse,
  createSemester,
  updateSemester,
  deleteSemester,
  createSection,
  updateSection,
  deleteSection,
  createTopic,
  updateTopic,
  deleteTopic,
  reorder,
  type TreeCourse,
  type TreeSemester,
  type TreeSection,
  type TreeTopic,
} from '@/app/services/contentTreeApi';

beforeEach(() => {
  mockApiCall.mockClear();
});

// ================================================================
// SUITE 1: Error Handling & Rejection
// ================================================================

describe('Error handling and rejection propagation', () => {
  it('propagates network errors from getContentTree', async () => {
    const error = new Error('Network timeout');
    mockApiCall.mockRejectedValueOnce(error);

    await expect(getContentTree('inst-001')).rejects.toThrow('Network timeout');
  });

  it('propagates validation errors from createCourse', async () => {
    const error = new Error('Invalid institution_id');
    mockApiCall.mockRejectedValueOnce(error);

    await expect(
      createCourse({ institution_id: '', name: 'Empty Inst' })
    ).rejects.toThrow('Invalid institution_id');
  });

  it('propagates 404 errors on deleteCourse', async () => {
    const error = new Error('Course not found');
    mockApiCall.mockRejectedValueOnce(error);

    await expect(deleteCourse('nonexistent-id')).rejects.toThrow('Course not found');
  });

  it('propagates 401 unauthorized errors', async () => {
    const error = new Error('Unauthorized');
    mockApiCall.mockRejectedValueOnce(error);

    await expect(
      updateCourse('course-001', { name: 'Unauthorized Edit' })
    ).rejects.toThrow('Unauthorized');
  });

  it('handles errors from reorder endpoint', async () => {
    const error = new Error('Reorder failed: invalid order indices');
    mockApiCall.mockRejectedValueOnce(error);

    await expect(
      reorder('courses', [{ id: 'c1', order_index: 0 }])
    ).rejects.toThrow('Reorder failed');
  });
});

// ================================================================
// SUITE 2: Null/Undefined Parameter Handling
// ================================================================

describe('Null and undefined parameter handling', () => {
  it('handles empty string institutionId in getContentTree', async () => {
    mockApiCall.mockResolvedValueOnce([]);

    await getContentTree('');

    expect(mockApiCall).toHaveBeenCalledWith('/content-tree?institution_id=');
  });

  it('handles undefined values in createCourse optional fields', async () => {
    mockApiCall.mockResolvedValueOnce({});

    await createCourse({
      institution_id: 'inst-001',
      name: 'Course A',
      description: undefined,
    });

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body).not.toHaveProperty('description');
  });

  it('handles null description in createCourse', async () => {
    mockApiCall.mockResolvedValueOnce({});

    await createCourse({
      institution_id: 'inst-001',
      name: 'Course B',
      description: null as any,
    });

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    // null gets serialized to null in JSON
    expect(body.description).toBeNull();
  });

  it('handles undefined order_index in createSemester', async () => {
    mockApiCall.mockResolvedValueOnce({});

    await createSemester({
      course_id: 'c-001',
      name: 'Fall 2025',
      order_index: undefined,
    });

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body).not.toHaveProperty('order_index');
  });

  it('handles empty string as valid ID in updateCourse', async () => {
    mockApiCall.mockResolvedValueOnce({});

    await updateCourse('', { name: 'Update Empty ID' });

    expect(mockApiCall).toHaveBeenCalledWith('/courses/', {
      method: 'PUT',
      body: expect.any(String),
    });
  });

  it('handles order_index of 0 (falsy but valid)', async () => {
    mockApiCall.mockResolvedValueOnce({});

    await createCourse({
      institution_id: 'inst-001',
      name: 'First Course',
      order_index: 0,
    });

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.order_index).toBe(0);
  });
});

// ================================================================
// SUITE 3: Large Payload Handling
// ================================================================

describe('Large payload handling (reorder with many items)', () => {
  it('handles reorder with 100 items', async () => {
    mockApiCall.mockResolvedValueOnce({});

    const items = Array.from({ length: 100 }, (_, i) => ({
      id: `item-${i}`,
      order_index: i,
    }));

    await reorder('courses', items);

    expect(mockApiCall).toHaveBeenCalledTimes(1);

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.items).toHaveLength(100);
    expect(body.items[0].id).toBe('item-0');
    expect(body.items[99].id).toBe('item-99');
  });

  it('handles reorder with 1000 items', async () => {
    mockApiCall.mockResolvedValueOnce({});

    const items = Array.from({ length: 1000 }, (_, i) => ({
      id: `topic-${i}`,
      order_index: i,
    }));

    await reorder('topics', items);

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.items).toHaveLength(1000);
  });

  it('handles reorder with duplicate IDs (backend validation)', async () => {
    mockApiCall.mockResolvedValueOnce({});

    const items = [
      { id: 'item-1', order_index: 0 },
      { id: 'item-1', order_index: 1 }, // duplicate
    ];

    await reorder('courses', items);

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    // API sends duplicates as-is; backend validates
    expect(body.items).toHaveLength(2);
  });

  it('handles reorder with gaps in order_index', async () => {
    mockApiCall.mockResolvedValueOnce({});

    const items = [
      { id: 'item-1', order_index: 0 },
      { id: 'item-2', order_index: 5 }, // gap to 5
      { id: 'item-3', order_index: 10 }, // gap to 10
    ];

    await reorder('courses', items);

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.items).toEqual(items);
  });

  it('handles reorder with negative order_index (backend validation)', async () => {
    mockApiCall.mockResolvedValueOnce({});

    const items = [
      { id: 'item-1', order_index: -1 },
      { id: 'item-2', order_index: 0 },
    ];

    await reorder('courses', items);

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.items[0].order_index).toBe(-1);
  });

  it('handles createCourse with very long name', async () => {
    mockApiCall.mockResolvedValueOnce({});

    const longName = 'A'.repeat(1000);
    await createCourse({
      institution_id: 'inst-001',
      name: longName,
    });

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.name).toHaveLength(1000);
  });

  it('handles createCourse with very long description', async () => {
    mockApiCall.mockResolvedValueOnce({});

    const longDesc = 'Lorem ipsum '.repeat(500);
    await createCourse({
      institution_id: 'inst-001',
      name: 'Course',
      description: longDesc,
    });

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.description.length).toBeGreaterThan(5000);
  });
});

// ================================================================
// SUITE 4: Special Characters & Escaping
// ================================================================

describe('Special characters and JSON escaping', () => {
  it('handles names with quotes', async () => {
    mockApiCall.mockResolvedValueOnce({});

    await createCourse({
      institution_id: 'inst-001',
      name: 'Course "Special" Edition',
    });

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.name).toBe('Course "Special" Edition');
  });

  it('handles names with backslashes', async () => {
    mockApiCall.mockResolvedValueOnce({});

    await createCourse({
      institution_id: 'inst-001',
      name: 'Path\\to\\course',
    });

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.name).toBe('Path\\to\\course');
  });

  it('handles names with newlines', async () => {
    mockApiCall.mockResolvedValueOnce({});

    await createCourse({
      institution_id: 'inst-001',
      name: 'Course\nWith\nNewlines',
    });

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.name).toBe('Course\nWith\nNewlines');
  });

  it('handles names with unicode characters', async () => {
    mockApiCall.mockResolvedValueOnce({});

    await createCourse({
      institution_id: 'inst-001',
      name: '数学 101 Matemática الرياضيات',
    });

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.name).toBe('数学 101 Matemática الرياضيات');
  });

  it('handles names with emoji', async () => {
    mockApiCall.mockResolvedValueOnce({});

    await createCourse({
      institution_id: 'inst-001',
      name: 'Science 🔬 Lab 🧬',
    });

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.name).toContain('🔬');
    expect(body.name).toContain('🧬');
  });

  it('handles names with HTML-like content', async () => {
    mockApiCall.mockResolvedValueOnce({});

    await createCourse({
      institution_id: 'inst-001',
      name: '<script>alert("xss")</script>',
    });

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.name).toBe('<script>alert("xss")</script>');
  });
});

// ================================================================
// SUITE 5: Type Coercion & Strictness
// ================================================================

describe('Type coercion and type safety', () => {
  it('accepts number as order_index when passed as such', async () => {
    mockApiCall.mockResolvedValueOnce({});

    await createCourse({
      institution_id: 'inst-001',
      name: 'Course',
      order_index: 42,
    });

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.order_index).toBe(42);
    expect(typeof body.order_index).toBe('number');
  });

  it('preserves boolean value for is_active in updateCourse', async () => {
    mockApiCall.mockResolvedValueOnce({});

    await updateCourse('course-001', { is_active: true });

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.is_active).toBe(true);
    expect(typeof body.is_active).toBe('boolean');
  });

  it('handles is_active: false (falsy value)', async () => {
    mockApiCall.mockResolvedValueOnce({});

    await updateCourse('course-001', { is_active: false });

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.is_active).toBe(false);
    expect(body.is_active !== true).toBe(true);
  });

  it('preserves partial updates without spreading defaults', async () => {
    mockApiCall.mockResolvedValueOnce({});

    // Only send name, not other fields
    await updateCourse('course-001', { name: 'Only Name' });

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(Object.keys(body)).toEqual(['name']);
    expect(body).not.toHaveProperty('description');
    expect(body).not.toHaveProperty('order_index');
    expect(body).not.toHaveProperty('is_active');
  });

  it('can send multiple fields in partial update', async () => {
    mockApiCall.mockResolvedValueOnce({});

    await updateCourse('course-001', {
      name: 'New Name',
      description: 'New desc',
      order_index: 5,
    });

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(Object.keys(body)).toContain('name');
    expect(Object.keys(body)).toContain('description');
    expect(Object.keys(body)).toContain('order_index');
    expect(Object.keys(body)).not.toContain('is_active');
  });
});

// ================================================================
// SUITE 6: Request URL Construction Edge Cases
// ================================================================

describe('Request URL construction edge cases', () => {
  it('handles institutionId with special characters in getContentTree', async () => {
    mockApiCall.mockResolvedValueOnce([]);

    await getContentTree('inst-001:special?chars');

    // Note: URL encoding should be handled by apiCall or fetch layer
    expect(mockApiCall).toHaveBeenCalledWith(
      '/content-tree?institution_id=inst-001:special?chars'
    );
  });

  it('handles ID with special characters in updateCourse', async () => {
    mockApiCall.mockResolvedValueOnce({});

    await updateCourse('course:special/id', { name: 'Update' });

    expect(mockApiCall).toHaveBeenCalledWith(
      expect.stringContaining('/courses/course:special/id'),
      expect.any(Object)
    );
  });

  it('handles very long ID in deleteCourse', async () => {
    mockApiCall.mockResolvedValueOnce({});

    const longId = 'x'.repeat(500);
    await deleteCourse(longId);

    expect(mockApiCall).toHaveBeenCalledWith(
      `/courses/${longId}`,
      { method: 'DELETE' }
    );
  });
});

// ================================================================
// SUITE 7: Reorder Edge Cases
// ================================================================

describe('Reorder edge cases and special scenarios', () => {
  it('handles reorder with empty items array', async () => {
    mockApiCall.mockResolvedValueOnce({});

    await reorder('courses', []);

    expect(mockApiCall).toHaveBeenCalledWith('/reorder', {
      method: 'PUT',
      body: JSON.stringify({ table: 'courses', items: [] }),
    });
  });

  it('handles reorder with single item', async () => {
    mockApiCall.mockResolvedValueOnce({});

    await reorder('sections', [{ id: 'sec-1', order_index: 0 }]);

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.items).toHaveLength(1);
    expect(body.table).toBe('sections');
  });

  it('preserves item order in reorder payload', async () => {
    mockApiCall.mockResolvedValueOnce({});

    const items = [
      { id: 'z', order_index: 2 },
      { id: 'a', order_index: 0 },
      { id: 'm', order_index: 1 },
    ];

    await reorder('courses', items);

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    // Should preserve the order sent, not sort them
    expect(body.items[0].id).toBe('z');
    expect(body.items[1].id).toBe('a');
    expect(body.items[2].id).toBe('m');
  });

  it('handles reorder with very large order_index values', async () => {
    mockApiCall.mockResolvedValueOnce({});

    const items = [
      { id: 'item-1', order_index: 999999999 },
      { id: 'item-2', order_index: 1000000000 },
    ];

    await reorder('courses', items);

    const body = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(body.items[0].order_index).toBe(999999999);
    expect(body.items[1].order_index).toBe(1000000000);
  });
});

// ================================================================
// SUITE 8: Sequential Request Patterns
// ================================================================

describe('Sequential request patterns', () => {
  it('can perform create then update in sequence', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'new-course' });
    mockApiCall.mockResolvedValueOnce({ id: 'new-course' });

    await createCourse({
      institution_id: 'inst-001',
      name: 'New Course',
    });

    await updateCourse('new-course', { description: 'Updated desc' });

    expect(mockApiCall).toHaveBeenCalledTimes(2);
    expect(mockApiCall.mock.calls[0][0]).toBe('/courses');
    expect(mockApiCall.mock.calls[1][0]).toBe('/courses/new-course');
  });

  it('can perform update then delete in sequence', async () => {
    mockApiCall.mockResolvedValueOnce({});
    mockApiCall.mockResolvedValueOnce({});

    await updateCourse('course-001', { name: 'Renamed' });
    await deleteCourse('course-001');

    expect(mockApiCall).toHaveBeenCalledTimes(2);
    expect(mockApiCall.mock.calls[0][1].method).toBe('PUT');
    expect(mockApiCall.mock.calls[1][1].method).toBe('DELETE');
  });

  it('can create multiple related items in sequence', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'course-001' });
    mockApiCall.mockResolvedValueOnce({ id: 'sem-001' });
    mockApiCall.mockResolvedValueOnce({ id: 'sec-001' });
    mockApiCall.mockResolvedValueOnce({ id: 'topic-001' });

    await createCourse({ institution_id: 'inst-001', name: 'Math' });
    await createSemester({ course_id: 'course-001', name: 'Fall' });
    await createSection({ semester_id: 'sem-001', name: 'Algebra' });
    await createTopic({ section_id: 'sec-001', name: 'Quadratics' });

    expect(mockApiCall).toHaveBeenCalledTimes(4);
  });
});

// ================================================================
// SUITE 9: All CRUD tables consistency
// ================================================================

describe('CRUD consistency across all entity types', () => {
  const entityTests = [
    {
      name: 'Semester',
      create: () => createSemester({ course_id: 'c-1', name: 'Sem' }),
      update: () => updateSemester('sem-1', { name: 'Sem Updated' }),
      delete: () => deleteSemester('sem-1'),
      endpoint: '/semesters',
    },
    {
      name: 'Section',
      create: () => createSection({ semester_id: 's-1', name: 'Sec' }),
      update: () => updateSection('sec-1', { name: 'Sec Updated' }),
      delete: () => deleteSection('sec-1'),
      endpoint: '/sections',
    },
    {
      name: 'Topic',
      create: () => createTopic({ section_id: 'sc-1', name: 'Top' }),
      update: () => updateTopic('t-1', { name: 'Top Updated' }),
      delete: () => deleteTopic('t-1'),
      endpoint: '/topics',
    },
  ];

  entityTests.forEach(({ name, create, update, delete: deleteOp, endpoint }) => {
    it(`${name}: POST creates correctly`, async () => {
      mockApiCall.mockResolvedValueOnce({});
      await create();
      expect(mockApiCall.mock.calls[0][0]).toBe(endpoint);
      expect(mockApiCall.mock.calls[0][1].method).toBe('POST');
    });

    it(`${name}: PUT updates correctly`, async () => {
      mockApiCall.mockResolvedValueOnce({});
      await update();
      const url = mockApiCall.mock.calls[0][0];
      expect(url).toContain(endpoint);
      expect(url).toContain('-1');
      expect(mockApiCall.mock.calls[0][1].method).toBe('PUT');
    });

    it(`${name}: DELETE deletes correctly`, async () => {
      mockApiCall.mockResolvedValueOnce({});
      await deleteOp();
      expect(mockApiCall.mock.calls[0][0]).toContain(endpoint);
      expect(mockApiCall.mock.calls[0][1].method).toBe('DELETE');
    });
  });
});
