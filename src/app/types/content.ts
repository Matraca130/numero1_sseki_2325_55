// ============================================================
// Axon — Legacy Nested Content Types (UI layer)
//
// These types mirror the OLD data/courses.ts nested structure
// used by the student-facing UI components (FlashcardView,
// StudyHubView, WelcomeView, etc.).
//
// NOTE: platform.ts contains the FLAT DB-row types used by
// the backend API. These nested types are for the UI only.
// ============================================================

// ── Nested UI Types ──────────────────────────────────────────

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  mastery: number;
  difficulty?: string;
  keywords?: string[];
  // UI aliases — SessionScreen/DeckScreen reference these names.
  // When loading from API, set question=front, answer=back.
  question: string;
  answer: string;
  image?: string;
  // Real backend fields (optional, for FSRS tracking)
  summary_id?: string;
  keyword_id?: string;
  source?: string;
  fsrs_state?: 'new' | 'learning' | 'review' | 'relearning';
  due_at?: string;
}

export interface Lesson {
  id: string;
  title: string;
  completed: boolean;
  duration?: number;
}

export interface Topic {
  id: string;
  title: string;
  summary: string;
  flashcards: Flashcard[];
  lessons?: Lesson[];
}

export interface Section {
  id: string;
  title: string;
  imageUrl?: string;
  topics: Topic[];
}

export interface Semester {
  id: string;
  title: string;
  sections: Section[];
}

export interface Course {
  id: string;
  name: string;
  color: string;       // Tailwind bg class, e.g. "bg-teal-500"
  accentColor: string;  // Tailwind text class, e.g. "text-teal-500"
  semesters: Semester[];
}

// ── Minimal stub courses array ───────────────────────────────
// Provides a non-crashing default for AppContext and CourseSwitcher.
// Real data comes from ContentTreeContext / backend API.

export const courses: Course[] = [
  {
    id: 'anatomy',
    name: 'Anatomia Humana',
    color: 'bg-teal-500',
    accentColor: 'text-teal-500',
    semesters: [
      {
        id: 'sem-1',
        title: 'Semestre 1',
        sections: [
          {
            id: 'sec-1',
            title: 'Introducao',
            topics: [
              {
                id: 'topic-1',
                title: 'Introducao a Anatomia',
                summary: 'Fundamentos da anatomia humana.',
                flashcards: [],
              },
            ],
          },
        ],
      },
    ],
  },
];

// ── Stub: getLessonsForTopic ─────────���────────────────────────
// Previously in data/lessonData.ts. Returns empty array since
// real lesson data will come from the backend.

export function getLessonsForTopic(_topicId: string): Lesson[] {
  return [];
}