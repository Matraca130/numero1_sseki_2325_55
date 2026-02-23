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

export type MasteryLevel = 'none' | 'seen' | 'learning' | 'familiar' | 'mastered';

export interface AIQuestion {
  id: string;
  question: string;
  answer: string;
}

export interface KeywordData {
  id: string;
  term: string;
  definition: string;
  category?: string;
  relatedTerms?: string[];
  aiQuestions?: AIQuestion[];
  model3d?: Model3D;
  masteryLevel?: MasteryLevel;
}

export const masteryConfig: Record<MasteryLevel, { label: string; color: string; bgColor: string; textColor: string; borderColor: string; icon: string }> = {
  none:      { label: 'Nuevo',      color: 'gray',   bgColor: 'bg-gray-100',   textColor: 'text-gray-600',   borderColor: 'border-gray-200', icon: '○' },
  seen:      { label: 'Visto',      color: 'blue',   bgColor: 'bg-blue-100',   textColor: 'text-blue-600',   borderColor: 'border-blue-200', icon: '◔' },
  learning:  { label: 'Aprendiendo', color: 'amber',  bgColor: 'bg-amber-100',  textColor: 'text-amber-600',  borderColor: 'border-amber-200', icon: '◑' },
  familiar:  { label: 'Familiar',   color: 'teal',   bgColor: 'bg-teal-100',   textColor: 'text-teal-600',   borderColor: 'border-teal-200', icon: '◕' },
  mastered:  { label: 'Dominado',   color: 'green',  bgColor: 'bg-green-100',  textColor: 'text-green-600',  borderColor: 'border-green-200', icon: '●' },
};

export function findKeyword(_term: string): KeywordData | undefined {
  return undefined;
}

export function getAllKeywordTerms(): string[] {
  return [];
}