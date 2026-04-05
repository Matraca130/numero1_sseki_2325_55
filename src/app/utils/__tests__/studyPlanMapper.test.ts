// ============================================================
// Unit Tests — studyPlanMapper.ts
//
// Tests pure data transformation functions:
//   - buildTopicMap: content tree → id→lookup map
//   - mapBackendTaskToFrontend: backend record → frontend model
//
// RUN: npx vitest run src/app/utils/__tests__/studyPlanMapper.test.ts
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildTopicMap,
  mapBackendTaskToFrontend,
  type TopicLookup,
} from '@/app/utils/studyPlanMapper';
import type { StudyPlanTaskRecord } from '@/app/services/platformApi';

// ── buildTopicMap Tests ──────────────────────────────────────

describe('buildTopicMap', () => {
  it('returns empty map for null tree', () => {
    const map = buildTopicMap(null);
    expect(map.size).toBe(0);
  });

  it('returns empty map for undefined tree', () => {
    const map = buildTopicMap(undefined);
    expect(map.size).toBe(0);
  });

  it('returns empty map when tree has no courses', () => {
    const tree = { courses: null };
    const map = buildTopicMap(tree);
    expect(map.size).toBe(0);
  });

  it('returns empty map for empty courses array', () => {
    const tree = { courses: [] };
    const map = buildTopicMap(tree);
    expect(map.size).toBe(0);
  });

  it('maps single topic with all fields', () => {
    const tree = {
      courses: [
        {
          id: 'course-1',
          name: 'Calculus I',
          semesters: [
            {
              id: 'sem-1',
              sections: [
                {
                  id: 'sec-1',
                  name: 'Limits',
                  topics: [
                    { id: 'topic-1', name: 'Epsilon-delta definition' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const map = buildTopicMap(tree);

    expect(map.size).toBe(1);
    const lookup = map.get('topic-1');
    expect(lookup).toEqual({
      topicTitle: 'Epsilon-delta definition',
      sectionTitle: 'Limits',
      courseName: 'Calculus I',
      courseId: 'course-1',
      courseColor: 'bg-teal-500', // First course gets first color
    });
  });

  it('maps multiple topics in same course', () => {
    const tree = {
      courses: [
        {
          id: 'course-1',
          name: 'Calculus I',
          semesters: [
            {
              id: 'sem-1',
              sections: [
                {
                  id: 'sec-1',
                  name: 'Limits',
                  topics: [
                    { id: 'topic-1', name: 'Epsilon-delta' },
                    { id: 'topic-2', name: 'Continuity' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const map = buildTopicMap(tree);

    expect(map.size).toBe(2);
    expect(map.get('topic-1')?.topicTitle).toBe('Epsilon-delta');
    expect(map.get('topic-2')?.topicTitle).toBe('Continuity');
    expect(map.get('topic-1')?.courseName).toBe('Calculus I');
    expect(map.get('topic-2')?.courseName).toBe('Calculus I');
  });

  it('assigns different colors to different courses', () => {
    const tree = {
      courses: [
        {
          id: 'course-1',
          name: 'Math',
          semesters: [
            {
              id: 'sem-1',
              sections: [
                {
                  id: 'sec-1',
                  name: 'Calculus',
                  topics: [{ id: 'topic-math', name: 'Derivatives' }],
                },
              ],
            },
          ],
        },
        {
          id: 'course-2',
          name: 'Physics',
          semesters: [
            {
              id: 'sem-2',
              sections: [
                {
                  id: 'sec-2',
                  name: 'Mechanics',
                  topics: [{ id: 'topic-phys', name: 'Forces' }],
                },
              ],
            },
          ],
        },
      ],
    };

    const map = buildTopicMap(tree);

    const mathColor = map.get('topic-math')?.courseColor;
    const physColor = map.get('topic-phys')?.courseColor;
    expect(mathColor).toBe('bg-teal-500');
    expect(physColor).toBe('bg-blue-500');
    expect(mathColor).not.toEqual(physColor);
  });

  it('cycles through color palette for many courses', () => {
    const courses = Array.from({ length: 8 }, (_, i) => ({
      id: `course-${i}`,
      name: `Course ${i}`,
      semesters: [
        {
          id: `sem-${i}`,
          sections: [
            {
              id: `sec-${i}`,
              name: 'Section',
              topics: [{ id: `topic-${i}`, name: `Topic ${i}` }],
            },
          ],
        },
      ],
    }));

    const tree = { courses };
    const map = buildTopicMap(tree);

    expect(map.size).toBe(8);
    // Colors should cycle back after palette end
    const color7 = map.get('topic-7')?.courseColor;
    const color0 = map.get('topic-0')?.courseColor;
    expect(color7).toBe('bg-blue-500'); // 7 % 6 = 1 → blue
    // Palette: [teal, blue, purple, amber, pink, emerald] (6 colors)
    // 0 % 6 = 0 → teal
    // 7 % 6 = 1 → blue
  });

  it('handles missing name/title fields with fallback to id', () => {
    const tree = {
      courses: [
        {
          id: 'course-no-name',
          semesters: [
            {
              id: 'sem-1',
              sections: [
                {
                  id: 'sec-no-name',
                  topics: [
                    { id: 'topic-no-name' }, // No name field
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const map = buildTopicMap(tree);

    expect(map.size).toBe(1);
    const lookup = map.get('topic-no-name');
    expect(lookup?.topicTitle).toBe('topic-no-name');
    expect(lookup?.sectionTitle).toBe('sec-no-name');
    expect(lookup?.courseName).toBe('course-no-name');
  });

  it('handles title field as fallback to name', () => {
    const tree = {
      courses: [
        {
          id: 'course-1',
          title: 'Course with title', // Uses title instead of name
          semesters: [
            {
              id: 'sem-1',
              sections: [
                {
                  id: 'sec-1',
                  title: 'Section with title',
                  topics: [
                    { id: 'topic-1', title: 'Topic with title' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const map = buildTopicMap(tree);

    const lookup = map.get('topic-1');
    expect(lookup?.topicTitle).toBe('Topic with title');
    expect(lookup?.sectionTitle).toBe('Section with title');
    expect(lookup?.courseName).toBe('Course with title');
  });

  it('handles nested semester and section structures', () => {
    const tree = {
      courses: [
        {
          id: 'course-1',
          name: 'CS 101',
          semesters: [
            {
              id: 'sem-1',
              sections: [
                {
                  id: 'sec-1',
                  name: 'Basics',
                  topics: [{ id: 'topic-1', name: 'Variables' }],
                },
                {
                  id: 'sec-2',
                  name: 'Advanced',
                  topics: [{ id: 'topic-2', name: 'Pointers' }],
                },
              ],
            },
            {
              id: 'sem-2',
              sections: [
                {
                  id: 'sec-3',
                  name: 'OOP',
                  topics: [{ id: 'topic-3', name: 'Classes' }],
                },
              ],
            },
          ],
        },
      ],
    };

    const map = buildTopicMap(tree);

    expect(map.size).toBe(3);
    expect(map.get('topic-1')?.sectionTitle).toBe('Basics');
    expect(map.get('topic-2')?.sectionTitle).toBe('Advanced');
    expect(map.get('topic-3')?.sectionTitle).toBe('OOP');
  });
});

// ── mapBackendTaskToFrontend Tests ───────────────────────────

describe('mapBackendTaskToFrontend', () => {
  let topicMap: Map<string, TopicLookup>;
  const planCreatedAt = new Date('2026-03-20T00:00:00Z');

  beforeEach(() => {
    topicMap = new Map([
      [
        'topic-1',
        {
          topicTitle: 'Epsilon-delta',
          sectionTitle: 'Limits',
          courseName: 'Calculus I',
          courseId: 'course-1',
          courseColor: 'bg-blue-500',
        },
      ],
    ]);
  });

  it('maps backend task with all fields present', () => {
    const backendTask: StudyPlanTaskRecord = {
      id: 'task-1',
      study_plan_id: 'plan-1',
      item_type: 'flashcard',
      item_id: 'topic-1',
      status: 'pending',
      order_index: 0,
      original_method: 'flashcard',
      scheduled_date: '2026-03-26',
      estimated_minutes: 25,
    };

    const result = mapBackendTaskToFrontend(backendTask, 0, planCreatedAt, topicMap);

    expect(result.id).toBe('task-1');
    expect(result.title).toBe('Epsilon-delta');
    expect(result.subject).toBe('Calculus I');
    expect(result.subjectColor).toBe('bg-blue-500');
    expect(result.method).toBe('flashcard');
    expect(result.estimatedMinutes).toBe(25);
    expect(result.completed).toBe(false);
    expect(result.topicId).toBe('topic-1');
    expect(result.date).toEqual(new Date('2026-03-26'));
  });

  it('maps completed task', () => {
    const backendTask: StudyPlanTaskRecord = {
      id: 'task-1',
      study_plan_id: 'plan-1',
      item_type: 'flashcard',
      item_id: 'topic-1',
      status: 'completed',
      order_index: 0,
      original_method: 'flashcard',
      scheduled_date: '2026-03-26',
      estimated_minutes: 25,
    };

    const result = mapBackendTaskToFrontend(backendTask, 0, planCreatedAt, topicMap);

    expect(result.completed).toBe(true);
  });

  it('uses original_method when present', () => {
    const backendTask: StudyPlanTaskRecord = {
      id: 'task-1',
      study_plan_id: 'plan-1',
      item_type: 'reading',
      item_id: 'topic-1',
      status: 'pending',
      order_index: 0,
      original_method: 'video',
      scheduled_date: '2026-03-26',
      estimated_minutes: null,
    };

    const result = mapBackendTaskToFrontend(backendTask, 0, planCreatedAt, topicMap);

    expect(result.method).toBe('video');
  });

  it('falls back to BACKEND_ITEM_TYPE_TO_METHOD when original_method is null', () => {
    const backendTask: StudyPlanTaskRecord = {
      id: 'task-1',
      study_plan_id: 'plan-1',
      item_type: 'reading',
      item_id: 'topic-1',
      status: 'pending',
      order_index: 0,
      original_method: null,
      scheduled_date: '2026-03-26',
      estimated_minutes: 25,
    };

    const result = mapBackendTaskToFrontend(backendTask, 0, planCreatedAt, topicMap);

    // reading → resumo (from BACKEND_ITEM_TYPE_TO_METHOD)
    expect(result.method).toBe('resumo');
  });

  it('falls back to item_type when method mapping not found', () => {
    const backendTask: StudyPlanTaskRecord = {
      id: 'task-1',
      study_plan_id: 'plan-1',
      item_type: 'unknown-type' as any, // Not in the mapping
      item_id: 'topic-1',
      status: 'pending',
      order_index: 0,
      original_method: null,
      scheduled_date: '2026-03-26',
      estimated_minutes: 25,
    };

    const result = mapBackendTaskToFrontend(backendTask, 0, planCreatedAt, topicMap);

    expect(result.method).toBe('unknown-type');
  });

  it('uses estimated_minutes when present', () => {
    const backendTask: StudyPlanTaskRecord = {
      id: 'task-1',
      study_plan_id: 'plan-1',
      item_type: 'flashcard',
      item_id: 'topic-1',
      status: 'pending',
      order_index: 0,
      original_method: 'flashcard',
      scheduled_date: '2026-03-26',
      estimated_minutes: 45,
    };

    const result = mapBackendTaskToFrontend(backendTask, 0, planCreatedAt, topicMap);

    expect(result.estimatedMinutes).toBe(45);
  });

  it('falls back to METHOD_TIME_DEFAULTS when estimated_minutes is null', () => {
    const backendTask: StudyPlanTaskRecord = {
      id: 'task-1',
      study_plan_id: 'plan-1',
      item_type: 'flashcard',
      item_id: 'topic-1',
      status: 'pending',
      order_index: 0,
      original_method: 'flashcard',
      scheduled_date: '2026-03-26',
      estimated_minutes: null,
    };

    const result = mapBackendTaskToFrontend(backendTask, 0, planCreatedAt, topicMap);

    // flashcard default is 20 minutes
    expect(result.estimatedMinutes).toBe(20);
  });

  it('falls back to METHOD_TIME_DEFAULTS using original_method', () => {
    const backendTask: StudyPlanTaskRecord = {
      id: 'task-1',
      study_plan_id: 'plan-1',
      item_type: 'reading',
      item_id: 'topic-1',
      status: 'pending',
      order_index: 0,
      original_method: 'video',
      scheduled_date: '2026-03-26',
      estimated_minutes: null,
    };

    const result = mapBackendTaskToFrontend(backendTask, 0, planCreatedAt, topicMap);

    // item_type is 'reading' (30min) — checked BEFORE original_method ('video' 35min)
    expect(result.estimatedMinutes).toBe(30);
  });

  it('falls back to 25 minutes when no defaults available', () => {
    const backendTask: StudyPlanTaskRecord = {
      id: 'task-1',
      study_plan_id: 'plan-1',
      item_type: 'unknown-type' as any,
      item_id: 'topic-1',
      status: 'pending',
      order_index: 0,
      original_method: null,
      scheduled_date: '2026-03-26',
      estimated_minutes: null,
    };

    const result = mapBackendTaskToFrontend(backendTask, 0, planCreatedAt, topicMap);

    expect(result.estimatedMinutes).toBe(25);
  });

  it('uses scheduled_date when present', () => {
    const backendTask: StudyPlanTaskRecord = {
      id: 'task-1',
      study_plan_id: 'plan-1',
      item_type: 'flashcard',
      item_id: 'topic-1',
      status: 'pending',
      order_index: 0,
      original_method: 'flashcard',
      scheduled_date: '2026-04-15',
      estimated_minutes: 25,
    };

    const result = mapBackendTaskToFrontend(backendTask, 0, planCreatedAt, topicMap);

    expect(result.date).toEqual(new Date('2026-04-15'));
  });

  it('calculates legacy date when scheduled_date is null', () => {
    // idx=0: 0/3 = 0 days offset
    const backendTask: StudyPlanTaskRecord = {
      id: 'task-1',
      study_plan_id: 'plan-1',
      item_type: 'flashcard',
      item_id: 'topic-1',
      status: 'pending',
      order_index: 0,
      original_method: 'flashcard',
      scheduled_date: null,
      estimated_minutes: 25,
    };

    const result = mapBackendTaskToFrontend(backendTask, 0, planCreatedAt, topicMap);

    // idx=0 => floor(0/3) = 0 => same day as plan created
    expect(result.date.toISOString().slice(0, 10)).toBe('2026-03-20');
  });

  it('calculates legacy date with offset for higher indices', () => {
    // idx=3: 3/3 = 1 day offset
    const backendTask: StudyPlanTaskRecord = {
      id: 'task-4',
      study_plan_id: 'plan-1',
      item_type: 'flashcard',
      item_id: 'topic-1',
      status: 'pending',
      order_index: 3,
      original_method: 'flashcard',
      scheduled_date: null,
      estimated_minutes: 25,
    };

    const result = mapBackendTaskToFrontend(backendTask, 3, planCreatedAt, topicMap);

    // idx=3 => floor(3/3) = 1 => 1 day after plan created
    const expectedDate = new Date('2026-03-20');
    expectedDate.setDate(expectedDate.getDate() + 1);
    expect(result.date.toISOString().slice(0, 10)).toBe(expectedDate.toISOString().slice(0, 10));
  });

  it('uses topic lookup when available', () => {
    const backendTask: StudyPlanTaskRecord = {
      id: 'task-1',
      study_plan_id: 'plan-1',
      item_type: 'flashcard',
      item_id: 'topic-1',
      status: 'pending',
      order_index: 0,
      original_method: 'flashcard',
      scheduled_date: '2026-03-26',
      estimated_minutes: 25,
    };

    const result = mapBackendTaskToFrontend(backendTask, 0, planCreatedAt, topicMap);

    expect(result.title).toBe('Epsilon-delta');
    expect(result.subject).toBe('Calculus I');
    expect(result.subjectColor).toBe('bg-blue-500');
  });

  it('falls back to item_id when topic not in map', () => {
    const backendTask: StudyPlanTaskRecord = {
      id: 'task-1',
      study_plan_id: 'plan-1',
      item_type: 'flashcard',
      item_id: 'unknown-topic',
      status: 'pending',
      order_index: 0,
      original_method: 'flashcard',
      scheduled_date: '2026-03-26',
      estimated_minutes: 25,
    };

    const result = mapBackendTaskToFrontend(backendTask, 0, planCreatedAt, topicMap);

    expect(result.title).toBe('unknown-topic');
    expect(result.subject).toBe('Materia'); // Fallback subject
    expect(result.subjectColor).toBe('bg-gray-500'); // Fallback color
  });

  it('handles topic without color in lookup', () => {
    const customTopicMap = new Map([
      [
        'topic-custom',
        {
          topicTitle: 'Custom Topic',
          sectionTitle: 'Custom Section',
          courseName: 'Custom Course',
          courseId: 'course-custom',
          courseColor: '', // Empty color (edge case)
        },
      ],
    ]);

    const backendTask: StudyPlanTaskRecord = {
      id: 'task-1',
      study_plan_id: 'plan-1',
      item_type: 'flashcard',
      item_id: 'topic-custom',
      status: 'pending',
      order_index: 0,
      original_method: 'flashcard',
      scheduled_date: '2026-03-26',
      estimated_minutes: 25,
    };

    const result = mapBackendTaskToFrontend(backendTask, 0, planCreatedAt, customTopicMap);

    expect(result.subjectColor).toBe('bg-gray-500'); // Empty string is falsy → falls back to default
  });
});
