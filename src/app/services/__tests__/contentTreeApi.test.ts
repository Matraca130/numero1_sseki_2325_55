// ============================================================
// Axon -- Tests for contentTreeApi service
//
// PURPOSE: Verify API functions construct correct URLs, methods,
// and payloads without making real network requests.
//
// APPROACH: Mock apiCall() and inspect what URL/options were passed.
//
// Covers:
//   1. getContentTree — URL with institution_id param
//   2. createCourse / updateCourse / deleteCourse — CRUD
//   3. createSemester / updateSemester / deleteSemester — CRUD
//   4. createSection / updateSection / deleteSection — CRUD
//   5. createTopic / updateTopic / deleteTopic — CRUD
//   6. reorder — batch reorder payload
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// -- Mock apiCall BEFORE importing API module --
const mockApiCall = vi.fn().mockResolvedValue([]);
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
} from '@/app/services/contentTreeApi';

beforeEach(() => {
  mockApiCall.mockClear();
});

// ================================================================
// SUITE 1: getContentTree
// ================================================================

describe('getContentTree — URL construction', () => {
  it('calls /content-tree with institution_id query param', async () => {
    await getContentTree('inst-001');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toBe('/content-tree?institution_id=inst-001');
  });

  it('uses GET method (no options object)', async () => {
    await getContentTree('inst-001');
    expect(mockApiCall.mock.calls[0].length).toBe(1);
  });

  it('passes different institution IDs correctly', async () => {
    await getContentTree('inst-xyz-999');
    const url: string = mockApiCall.mock.calls[0][0];
    expect(url).toContain('institution_id=inst-xyz-999');
  });
});

// ================================================================
// SUITE 2: Course CRUD
// ================================================================

describe('createCourse — payload contract', () => {
  it('sends POST to /courses with correct JSON body', async () => {
    const payload = { institution_id: 'inst-001', name: 'Math 101', description: 'Intro to math' };
    await createCourse(payload);

    expect(mockApiCall).toHaveBeenCalledWith('/courses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('includes optional order_index in body', async () => {
    const payload = { institution_id: 'inst-001', name: 'Physics', order_index: 2 };
    await createCourse(payload);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody.order_index).toBe(2);
  });

  it('does not include description when omitted', async () => {
    const payload = { institution_id: 'inst-001', name: 'Chemistry' };
    await createCourse(payload);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody).not.toHaveProperty('description');
  });
});

describe('updateCourse — payload contract', () => {
  it('sends PUT to /courses/:id with partial update body', async () => {
    const data = { name: 'Updated Course' };
    await updateCourse('course-001', data);

    expect(mockApiCall).toHaveBeenCalledWith('/courses/course-001', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  });

  it('can send description and order_index', async () => {
    const data = { name: 'New Name', description: 'New desc', order_index: 5 };
    await updateCourse('course-001', data);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody.description).toBe('New desc');
    expect(sentBody.order_index).toBe(5);
  });

  it('can send is_active toggle', async () => {
    await updateCourse('course-001', { is_active: false });

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody.is_active).toBe(false);
  });
});

describe('deleteCourse — URL and method', () => {
  it('sends DELETE to /courses/:id', async () => {
    await deleteCourse('course-001');

    expect(mockApiCall).toHaveBeenCalledWith('/courses/course-001', {
      method: 'DELETE',
    });
  });

  it('does not send a request body', async () => {
    await deleteCourse('course-001');
    const opts = mockApiCall.mock.calls[0][1];
    expect(opts.body).toBeUndefined();
  });
});

// ================================================================
// SUITE 3: Semester CRUD
// ================================================================

describe('createSemester — payload contract', () => {
  it('sends POST to /semesters with course_id and name', async () => {
    const payload = { course_id: 'course-001', name: 'Fall 2025' };
    await createSemester(payload);

    expect(mockApiCall).toHaveBeenCalledWith('/semesters', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('includes optional order_index', async () => {
    const payload = { course_id: 'course-001', name: 'Spring 2026', order_index: 1 };
    await createSemester(payload);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody.order_index).toBe(1);
  });
});

describe('updateSemester — payload contract', () => {
  it('sends PUT to /semesters/:id', async () => {
    await updateSemester('sem-001', { name: 'Updated Semester' });

    expect(mockApiCall).toHaveBeenCalledWith('/semesters/sem-001', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Semester' }),
    });
  });
});

describe('deleteSemester — URL and method', () => {
  it('sends DELETE to /semesters/:id', async () => {
    await deleteSemester('sem-001');

    expect(mockApiCall).toHaveBeenCalledWith('/semesters/sem-001', {
      method: 'DELETE',
    });
  });
});

// ================================================================
// SUITE 4: Section CRUD
// ================================================================

describe('createSection — payload contract', () => {
  it('sends POST to /sections with semester_id and name', async () => {
    const payload = { semester_id: 'sem-001', name: 'Algebra' };
    await createSection(payload);

    expect(mockApiCall).toHaveBeenCalledWith('/sections', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });
});

describe('updateSection — payload contract', () => {
  it('sends PUT to /sections/:id', async () => {
    await updateSection('sec-001', { name: 'Updated Section' });

    expect(mockApiCall).toHaveBeenCalledWith('/sections/sec-001', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Section' }),
    });
  });

  it('can send is_active toggle', async () => {
    await updateSection('sec-001', { is_active: true });

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody.is_active).toBe(true);
  });
});

describe('deleteSection — URL and method', () => {
  it('sends DELETE to /sections/:id', async () => {
    await deleteSection('sec-001');

    expect(mockApiCall).toHaveBeenCalledWith('/sections/sec-001', {
      method: 'DELETE',
    });
  });
});

// ================================================================
// SUITE 5: Topic CRUD
// ================================================================

describe('createTopic — payload contract', () => {
  it('sends POST to /topics with section_id and name', async () => {
    const payload = { section_id: 'sec-001', name: 'Quadratic Equations' };
    await createTopic(payload);

    expect(mockApiCall).toHaveBeenCalledWith('/topics', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('includes optional order_index', async () => {
    const payload = { section_id: 'sec-001', name: 'Linear Equations', order_index: 0 };
    await createTopic(payload);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody.order_index).toBe(0);
  });
});

describe('updateTopic — payload contract', () => {
  it('sends PUT to /topics/:id', async () => {
    await updateTopic('topic-001', { name: 'Updated Topic' });

    expect(mockApiCall).toHaveBeenCalledWith('/topics/topic-001', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Topic' }),
    });
  });

  it('can send is_active and order_index', async () => {
    await updateTopic('topic-001', { is_active: false, order_index: 3 });

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody.is_active).toBe(false);
    expect(sentBody.order_index).toBe(3);
  });
});

describe('deleteTopic — URL and method', () => {
  it('sends DELETE to /topics/:id', async () => {
    await deleteTopic('topic-001');

    expect(mockApiCall).toHaveBeenCalledWith('/topics/topic-001', {
      method: 'DELETE',
    });
  });

  it('does not send a request body', async () => {
    await deleteTopic('topic-001');
    const opts = mockApiCall.mock.calls[0][1];
    expect(opts.body).toBeUndefined();
  });
});

// ================================================================
// SUITE 6: Reorder
// ================================================================

describe('reorder — batch reorder payload', () => {
  it('sends PUT to /reorder with table and items', async () => {
    const items = [
      { id: 'course-001', order_index: 0 },
      { id: 'course-002', order_index: 1 },
    ];
    await reorder('courses', items);

    expect(mockApiCall).toHaveBeenCalledWith('/reorder', {
      method: 'PUT',
      body: JSON.stringify({ table: 'courses', items }),
    });
  });

  it('works with semesters table', async () => {
    const items = [{ id: 'sem-001', order_index: 0 }];
    await reorder('semesters', items);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody.table).toBe('semesters');
  });

  it('works with sections table', async () => {
    const items = [{ id: 'sec-001', order_index: 0 }];
    await reorder('sections', items);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody.table).toBe('sections');
  });

  it('works with topics table', async () => {
    const items = [{ id: 'topic-001', order_index: 0 }];
    await reorder('topics', items);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody.table).toBe('topics');
  });

  it('preserves order of items array', async () => {
    const items = [
      { id: 'a', order_index: 2 },
      { id: 'b', order_index: 0 },
      { id: 'c', order_index: 1 },
    ];
    await reorder('courses', items);

    const sentBody = JSON.parse(mockApiCall.mock.calls[0][1].body);
    expect(sentBody.items).toEqual(items);
  });
});
