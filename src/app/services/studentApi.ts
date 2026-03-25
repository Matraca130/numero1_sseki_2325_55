// ============================================================
// Axon — Student API Service (BARREL RE-EXPORTER)
// ============================================================
//
// This file re-exports everything from student-api/ sub-files.
// Existing imports are preserved:
//   import { getProfile, getAllCourseProgress } from '@/app/services/studentApi';
//
// For NEW code, prefer direct imports to reduce coupling:
//   import { getAllCourseProgress } from '@/app/services/student-api/sa-course-progress';
//
// SUB-FILES:
// ├── sa-infra.ts              — cache utils, mappers, parallelWithLimit
// ├── sa-profile-stats.ts      — profile + stats CRUD
// ├── sa-course-progress.ts    — frontend aggregation (BIG)
// ├── sa-activity-sessions.ts  — daily activity + sessions + reviews
// ├── sa-content.ts            — summaries + keywords with BKT enrichment
// └── sa-ai-legacy.ts          — deprecated AI + backward compat aliases
// ============================================================

// Infrastructure (cache invalidation is the main public export)
export { invalidateStudentCaches } from './student-api/sa-infra';

// Profile & Stats
export {
  getProfile,
  updateProfile,
  getStats,
  updateStats,
} from './student-api/sa-profile-stats';

// Course Progress (frontend aggregation)
export {
  getAllCourseProgress,
  getCourseProgress,
  updateCourseProgress,
} from './student-api/sa-course-progress';

// Daily Activity, Sessions, Reviews
export {
  getDailyActivity,
  getSessions,
  logSession,
  getReviews,
  getReviewsByCourse,
  saveReviews,
} from './student-api/sa-activity-sessions';

// Content: Summaries + Keywords
export {
  getStudySummary,
  getAllSummaries,
  getCourseSummaries,
  saveStudySummary,
  deleteStudySummary,
  getKeywords,
  getTopicKeywords,
  saveKeywords,
  saveCourseKeywords,
} from './student-api/sa-content';

// AI (deprecated) + Backward Compat Aliases
export {
  aiChat,
  aiGenerateFlashcards,
  aiGenerateQuiz,
  aiExplain,
  seedDemoData,
  getCourseKeywords,
  saveTopicKeywords,
  getSummary,
  saveSummary,
} from './student-api/sa-ai-legacy';

// Telegram Integration
export {
  getTelegramLinkStatus,
  generateTelegramLinkCode,
  unlinkTelegram,
} from './student-api/sa-telegram';
