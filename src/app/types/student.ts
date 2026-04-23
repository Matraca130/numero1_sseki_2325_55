// ============================================================
// Axon — Student Data Types
// ============================================================

// ── KeywordState (canonical definition) ───────────────────
// Previously in spacedRepetition.ts. Moved here to decouple
// types from the spaced repetition algorithm (Phase 2 blocker).

/**
 * Complete state for a keyword across all learning contexts.
 * This enables sophisticated scheduling and need-based selection.
 */
export interface KeywordState {
  keyword: string;
  /** Consolidated mastery: 0 to 1 (0=novice, 1=expert) */
  mastery: number;
  /** Memory stability in days (S): how long memory lasts before decay */
  stability_days: number;
  /** Next scheduled review date (ISO string) */
  due_at: string | null;
  /** Number of significant failures/lapses */
  lapses: number;
  /** Number of actual recall tests (quiz/flashcard attempts) */
  exposures: number;
  /** Number of quality flashcards available for this keyword */
  card_coverage: number;
  /** Last time this keyword was reviewed */
  last_review_at: string | null;
  /** Color classification with hysteresis (matches DeltaColorLevel from mastery-helpers) */
  color: 'gray' | 'red' | 'yellow' | 'green' | 'blue';
  /** Internal counter for hysteresis stability */
  color_stability_counter: number;
}

/** Core student profile */
export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  university?: string;
  course?: string; // e.g. "Medicina"
  semester?: number;
  enrolledCourseIds: string[]; // matches Course.id from courses.ts
  createdAt: string; // ISO date
  preferences: StudentPreferences;
}

export interface StudentPreferences {
  theme: 'dark' | 'light';
  language: string; // 'es-AR', 'en', 'es'
  dailyGoalMinutes: number;
  notificationsEnabled: boolean;
  spacedRepetitionAlgorithm: 'fsrs' | 'simple';
}

/** Aggregate study statistics */
export interface StudentStats {
  totalStudyMinutes: number;
  totalSessions: number;
  totalCardsReviewed: number;
  totalQuizzesCompleted: number;
  currentStreak: number; // consecutive days
  longestStreak: number;
  averageDailyMinutes: number;
  lastStudyDate: string; // ISO date
  weeklyActivity: number[]; // [Mon..Sun] minutes per day this week
}

/** Progress per course/subject */
export interface CourseProgress {
  courseId: string;
  courseName: string;
  masteryPercent: number; // 0-100
  lessonsCompleted: number;
  lessonsTotal: number;
  flashcardsMastered: number;
  flashcardsTotal: number;
  quizAverageScore: number; // 0-100
  lastAccessedAt: string; // ISO date
  topicProgress: TopicProgress[];
}

export interface TopicProgress {
  topicId: string;
  topicTitle: string;
  sectionId: string;
  sectionTitle: string;
  masteryPercent: number;
  flashcardsDue: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  reviewCount: number;
  /** Keywords tracked for this topic */
  keywords?: Record<string, KeywordState>;
}

/** Individual flashcard review log (for spaced repetition) */
export interface FlashcardReview {
  /** Flashcard UUID (string) — audit 2026-04-23: was `number` (legacy pre-UUID). */
  cardId: string;
  topicId: string;
  courseId: string;
  reviewedAt: string; // ISO date
  rating: 1 | 2 | 3 | 4 | 5; // 1=again, 5=easy
  responseTimeMs: number;
  // Legacy scheduling fields (kept for historical review logs;
  // live scheduling is driven by FSRS v4 on the backend)
  ease: number;
  interval: number; // days until next review
  repetitions: number;
  /** Keywords associated with this card (for keyword-level tracking) */
  keywords?: {
    primary: string[];
    secondary: string[];
  };
}

/** Study session log */
export interface StudySession {
  id: string;
  studentId: string;
  courseId: string;
  topicId?: string;
  type: 'flashcards' | 'quiz' | 'reading' | 'video' | 'mixed';
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  cardsReviewed?: number;
  quizScore?: number;
  notes?: string;
}

/** Daily activity entry for heatmap/calendar views */
export interface DailyActivity {
  date: string; // YYYY-MM-DD
  studyMinutes: number;
  sessionsCount: number;
  cardsReviewed: number;
  retentionPercent?: number;
}

/** Summary/notes created during study sessions */
export interface StudySummary {
  id: string;
  studentId: string;
  courseId: string;
  topicId: string;
  courseName: string;
  topicTitle: string;
  /** User-written summary content (markdown) */
  content: string;
  /** Annotation blocks attached to the summary */
  annotations: SummaryAnnotation[];
  /** Keyword mastery levels tracked by the student */
  keywordMastery?: Record<string, string>;
  /** Personal keyword notes */
  keywordNotes?: Record<string, string[]>;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  /** Time spent writing/editing in minutes */
  editTimeMinutes: number;
  /** User-assigned tags */
  tags: string[];
  /** Is bookmarked for quick access */
  bookmarked: boolean;
}

export interface SummaryAnnotation {
  id: string;
  title: string;
  selectedText: string;
  note: string;
  timestamp: string;
  color: 'yellow' | 'blue' | 'green' | 'pink';
}

/** Keyword collection storage (per topic or course) */
export interface KeywordCollectionData {
  courseId: string;
  topicId?: string;
  keywords: Record<string, KeywordState>;
  lastUpdated: string; // ISO date
}

// ─── Study Intelligence (sessioncalendario) ─────────────────────

export interface TopicDifficultyData {
  id: string;
  name: string;
  section_name: string;
  difficulty_estimate: number | null;  // 0.0-1.0
  estimated_study_minutes: number | null;
  bloom_level: number | null;         // 1-6
  abstraction_level: number | null;   // 1-5
  concept_density: number | null;     // 1-5
  interrelation_score: number | null; // 1-5
  cohort_difficulty: number | null;
  prerequisite_topic_ids: string[];
  similar_topics?: Array<{
    topic_id: string;
    name: string;
    similarity: number;
  }>;
}

export interface CourseStudyStats {
  avg_difficulty: number;
  total_estimated_minutes: number;
  topics_analyzed: number;
  topics_pending_analysis: number;
}

export interface StudyIntelligenceResponse {
  topics: TopicDifficultyData[];
  course_stats: CourseStudyStats;
}