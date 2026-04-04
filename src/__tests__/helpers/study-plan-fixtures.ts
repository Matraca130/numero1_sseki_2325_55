/**
 * Reusable test fixtures for study plan E2E tests.
 * Provides consistent mock data for plans, mastery, sessions, and difficulty.
 */

import type { StudyPlan, StudyPlanTask } from '@/app/context/AppContext';
import type { TopicMasteryInfo } from '@/app/hooks/useTopicMastery';
import type { StudySessionRecord, DailyActivityRecord, StudentStatsRecord } from '@/app/services/platformApi';
import type { TopicDifficultyData, StudyIntelligenceResponse } from '@/app/types/student';

// ── Topic IDs ─────────────────────────────────────────────

export const TOPIC_IDS = {
  anatomy: 'topic-anatomy-001',
  physiology: 'topic-physiology-002',
  pathology: 'topic-pathology-003',
  pharmacology: 'topic-pharma-004',
  biochemistry: 'topic-biochem-005',
  histology: 'topic-histo-006',
};

export const COURSE_IDS = {
  medicine: 'course-med-001',
  biology: 'course-bio-002',
  chemistry: 'course-chem-003',
};

// ── Study Plan ────────────────────────────────────────────

export function mockStudyPlanTasks(): StudyPlanTask[] {
  const topics = [
    { id: TOPIC_IDS.anatomy, title: 'Anatomía del corazón', course: 'Medicina', courseId: COURSE_IDS.medicine },
    { id: TOPIC_IDS.physiology, title: 'Fisiología cardíaca', course: 'Medicina', courseId: COURSE_IDS.medicine },
    { id: TOPIC_IDS.pathology, title: 'Patología vascular', course: 'Medicina', courseId: COURSE_IDS.medicine },
  ];
  const methods = ['flashcards', 'resumo'];

  let idx = 0;
  const tasks: StudyPlanTask[] = [];
  const baseDate = new Date('2026-04-05');

  for (const topic of topics) {
    for (const method of methods) {
      tasks.push({
        id: `task-${idx}`,
        date: new Date(baseDate.getTime() + Math.floor(idx / 2) * 86400000),
        title: topic.title,
        subject: topic.course,
        subjectColor: 'bg-teal-500',
        method,
        estimatedMinutes: method === 'flashcards' ? 25 : 35,
        completed: false,
        topicId: topic.id,
      });
      idx++;
    }
  }

  return tasks;
}

export function mockStudyPlan(overrides?: Partial<StudyPlan>): StudyPlan {
  return {
    id: 'plan-test-001',
    name: 'Plan de Estudio 1',
    subjects: [
      { id: COURSE_IDS.medicine, name: 'Medicina', color: 'bg-teal-500' },
    ],
    methods: ['flashcards', 'resumo'],
    selectedTopics: [
      { courseId: COURSE_IDS.medicine, courseName: 'Medicina', sectionTitle: 'Cardiología', topicTitle: 'Anatomía del corazón', topicId: TOPIC_IDS.anatomy },
      { courseId: COURSE_IDS.medicine, courseName: 'Medicina', sectionTitle: 'Cardiología', topicTitle: 'Fisiología cardíaca', topicId: TOPIC_IDS.physiology },
      { courseId: COURSE_IDS.medicine, courseName: 'Medicina', sectionTitle: 'Cardiología', topicTitle: 'Patología vascular', topicId: TOPIC_IDS.pathology },
    ],
    completionDate: new Date('2026-04-30'),
    weeklyHours: [2, 2, 2, 2, 2, 1, 1],
    tasks: mockStudyPlanTasks(),
    createdAt: new Date('2026-04-01'),
    totalEstimatedHours: 3,
    ...overrides,
  };
}

// ── Topic Mastery ─────────────────────────────────────────

export function mockTopicMastery(): Map<string, TopicMasteryInfo> {
  return new Map([
    [TOPIC_IDS.anatomy, { masteryPercent: 75, pKnow: 0.75, needsReview: false, totalAttempts: 20, priorityScore: 40 }],
    [TOPIC_IDS.physiology, { masteryPercent: 30, pKnow: 0.30, needsReview: true, totalAttempts: 5, priorityScore: 80 }],
    [TOPIC_IDS.pathology, { masteryPercent: 10, pKnow: 0.10, needsReview: true, totalAttempts: 2, priorityScore: 90 }],
    [TOPIC_IDS.pharmacology, { masteryPercent: 50, pKnow: 0.50, needsReview: false, totalAttempts: 15, priorityScore: 55 }],
    [TOPIC_IDS.biochemistry, { masteryPercent: 60, pKnow: 0.60, needsReview: false, totalAttempts: 12, priorityScore: 45 }],
    [TOPIC_IDS.histology, { masteryPercent: 5, pKnow: 0.05, needsReview: true, totalAttempts: 1, priorityScore: 95 }],
  ]);
}

// ── Session History ───────────────────────────────────────

export function mockSessionHistory(): StudySessionRecord[] {
  const records: StudySessionRecord[] = [];
  const baseDate = new Date('2026-03-25');

  for (let i = 0; i < 10; i++) {
    const date = new Date(baseDate.getTime() + i * 86400000);
    records.push({
      id: `session-${i}`,
      session_type: i % 3 === 0 ? 'quiz' : i % 2 === 0 ? 'reading' : 'flashcard',
      completed_at: date.toISOString(),
      course_id: COURSE_IDS.medicine,
      total_reviews: 10 + i * 3,
      correct_reviews: 8 + i * 2,
      created_at: date.toISOString(),
    });
  }

  return records;
}

// ── Daily Activity ────────────────────────────────────────

export function mockDailyActivity(): DailyActivityRecord[] {
  const records: DailyActivityRecord[] = [];
  const baseDate = new Date('2026-03-25');

  for (let i = 0; i < 10; i++) {
    const date = new Date(baseDate.getTime() + i * 86400000);
    records.push({
      activity_date: date.toISOString().slice(0, 10),
      reviews_count: 15 + i * 2,
      correct_count: 12 + i,
      time_spent_seconds: (30 + i * 5) * 60,
      sessions_count: 1 + (i % 3 === 0 ? 1 : 0),
    });
  }

  return records;
}

// ── Student Stats ─────────────────────────────────────────

export function mockStudentStats(): StudentStatsRecord {
  return {
    current_streak: 7,
    longest_streak: 14,
    total_reviews: 200,
    total_time_seconds: 36000, // 10 hours
    total_sessions: 25,
    last_study_date: '2026-04-03',
  };
}

// ── Study Intelligence (Difficulty Data) ──────────────────

export function mockStudyIntelligenceResponse(): StudyIntelligenceResponse {
  return {
    topics: [
      {
        id: TOPIC_IDS.anatomy,
        name: 'Anatomía del corazón',
        section_name: 'Cardiología',
        difficulty_estimate: null,
        estimated_study_minutes: 45,
        bloom_level: null,
        abstraction_level: null,
        concept_density: null,
        interrelation_score: null,
        cohort_difficulty: null,
        prerequisite_topic_ids: [],
      },
      {
        id: TOPIC_IDS.physiology,
        name: 'Fisiología cardíaca',
        section_name: 'Cardiología',
        difficulty_estimate: null,
        estimated_study_minutes: 60,
        bloom_level: null,
        abstraction_level: null,
        concept_density: null,
        interrelation_score: null,
        cohort_difficulty: null,
        prerequisite_topic_ids: [TOPIC_IDS.anatomy], // physiology depends on anatomy
      },
      {
        id: TOPIC_IDS.pathology,
        name: 'Patología vascular',
        section_name: 'Cardiología',
        difficulty_estimate: null,
        estimated_study_minutes: 50,
        bloom_level: null,
        abstraction_level: null,
        concept_density: null,
        interrelation_score: null,
        cohort_difficulty: null,
        prerequisite_topic_ids: [TOPIC_IDS.anatomy, TOPIC_IDS.physiology], // depends on both
      },
    ],
    course_stats: {
      avg_difficulty: 0,
      total_estimated_minutes: 155,
      topics_analyzed: 0,
      topics_pending_analysis: 3,
    },
  };
}

// ── Difficulty Map ────────────────────────────────────────

export function mockDifficultyMap(): Map<string, number> {
  return new Map([
    [TOPIC_IDS.anatomy, 0.3],
    [TOPIC_IDS.physiology, 0.6],
    [TOPIC_IDS.pathology, 0.8],
  ]);
}

export function mockFullDifficultyMap(): Map<string, TopicDifficultyData> {
  const response = mockStudyIntelligenceResponse();
  return new Map(response.topics.map(t => [t.id, t]));
}
