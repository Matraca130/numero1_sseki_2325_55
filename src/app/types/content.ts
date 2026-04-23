// ============================================================
// Axon — Legacy Nested Content Types (UI layer)
//
// These types mirror the OLD data/courses.ts nested structure
// used by the student-facing UI components (FlashcardView,
// StudyHubView, WelcomeView, etc.).
//
// NOTE: platform.ts contains the FLAT DB-row types used by the
// backend API (same names: Course / Semester / Section / Topic
// but with `name`+`order_index` instead of `title`+nested arrays).
//
// DUPLICATION AUDIT 2026-04-23:
// To disambiguate, the canonical names here are `UiCourse`,
// `UiSemester`, `UiSection`, `UiTopic` (nested UI shape).
// The legacy aliases `Course`, `Semester`, `Section`, `Topic`
// are re-exported at the bottom for backward compat with ~20
// student-side consumers that still use the nested names.
// New code SHOULD prefer the Ui* names (or platform.ts for the
// flat DB shape).
// ============================================================

// ── Nested UI Types ──────────────────────────────────────────

/** Flashcard used by student-side UI (front/back + UI aliases). */
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
  // Explicit image URLs from backend (front/back separate)
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
  // Real backend fields (optional, for FSRS tracking)
  summary_id?: string;
  keyword_id?: string;
  subtopic_id?: string | null;
  source?: string;
  // Uses FsrsCardState from platform.ts (canonical). Kept inline here
  // to avoid circular imports — keep in sync with platform.ts.
  fsrs_state?: 'new' | 'learning' | 'review' | 'relearning';
  due_at?: string;
}

/** Lesson unit shown inside a nested Topic. */
export interface Lesson {
  id: string;
  title: string;
  completed: boolean;
  duration?: number;
}

/** Nested UI Topic — carries flashcards + lessons inline. */
export interface UiTopic {
  id: string;
  title: string;
  summary: string;
  flashcards: Flashcard[];
  lessons?: Lesson[];
}

/** Nested UI Section — carries topics inline. */
export interface UiSection {
  id: string;
  title: string;
  imageUrl?: string;
  topics: UiTopic[];
}

/** Nested UI Semester — carries sections inline. */
export interface UiSemester {
  id: string;
  title: string;
  sections: UiSection[];
}

/** Nested UI Course — carries semesters inline (tailwind colors baked in). */
export interface UiCourse {
  id: string;
  name: string;
  color: string;       // Tailwind bg class, e.g. "bg-[#2a8c7a]"
  accentColor: string;  // Tailwind text class, e.g. "text-[#2a8c7a]"
  semesters: UiSemester[];
}

// ── Legacy aliases (backward compat) ─────────────────────────
// Do NOT remove without migrating ~20 consumer files to Ui* names.

/** @deprecated Use `UiTopic` from `types/content` (nested UI) or `Topic` from `types/platform` (flat DB row). */
export type Topic = UiTopic;
/** @deprecated Use `UiSection` from `types/content` (nested UI) or `Section` from `types/platform` (flat DB row). */
export type Section = UiSection;
/** @deprecated Use `UiSemester` from `types/content` (nested UI) or `Semester` from `types/platform` (flat DB row). */
export type Semester = UiSemester;
/** @deprecated Use `UiCourse` from `types/content` (nested UI) or `Course` from `types/platform` (flat DB row). */
export type Course = UiCourse;

// ── Minimal stub courses array ───────────────────────────────
// Provides a non-crashing default for AppContext and CourseSwitcher.
// Real data comes from ContentTreeContext / backend API.

export const courses: UiCourse[] = [
  {
    id: 'anatomy',
    name: 'Anatomía Humana',
    color: 'bg-[#2a8c7a]',
    accentColor: 'text-[#2a8c7a]',
    semesters: [
      {
        id: 'sem-1',
        title: 'Semestre 1',
        sections: [
          {
            id: 'sec-1',
            title: 'Introducción',
            topics: [
              {
                id: 'topic-1',
                title: 'Introducción a la Anatomía',
                summary: 'Fundamentos de la anatomía humana.',
                flashcards: [],
              },
            ],
          },
        ],
      },
    ],
  },
];

// ── Stub: getLessonsForTopic ─────────────────────────────────
// Previously in data/lessonData.ts. Returns empty array since
// real lesson data will come from the backend.

export function getLessonsForTopic(_topicId: string): Lesson[] {
  return [];
}
