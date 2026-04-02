// ============================================================
// Axon — Legacy Stubs
//
// Minimal type definitions and empty data stubs that replace
// the deleted data/ folder (courses, lessonData, keywords,
// studyContent, sectionImages). No mock data — just enough
// for kept components to compile without redesign.
//
// TODO: Migrate remaining student views to use ContentTreeContext
//       and real API data, then delete this file.
// ============================================================

// ── Old "courses" types (nested, camelCase — NOT backend types) ──

export interface Topic {
  id: string;
  title: string;
  summary: string;
  imageUrl?: string;
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
  color: string;
  icon?: string;
  accentColor?: string;
  semesters: Semester[];
}

export interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'reading' | 'practice';
  duration: string;
  completed: boolean;
  topicId: string;
}

export interface Model3D {
  id: string;
  name: string;
  url?: string;
}

// ── Empty data arrays ────────────────────────────────────────

export const courses: Course[] = [];

// ── Stub functions (lessonData) ──────────────────────────────

export function getLessonsForTopic(_topicId: string): Lesson[] {
  return [];
}

// ── Stub functions (studyContent) ────────────────────────────

export interface StudyContentChunk {
  id: string;
  type: 'text' | 'heading' | 'image' | 'list';
  content: string;
  keywords?: string[];
}

export interface StudyContent {
  topicId: string;
  title: string;
  chunks: StudyContentChunk[];
}

export function getStudyContent(_topicId: string): StudyContent | null {
  return null;
}

// ── Stub functions (sectionImages) ───────────────────────────

export function getSectionImage(_sectionId: string): string {
  return '';
}

// ── Keyword types + stubs ────────────────────────────────────

export interface AIQuestion {
  id: string;
  question: string;
  answer: string;
}

