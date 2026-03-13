// ============================================================
// Axon — Platform API Service (BARREL RE-EXPORTER)
// ============================================================
//
// This file re-exports everything from platform-api/ sub-files.
// Existing imports are preserved:
//   import { getInstitution, FlashcardCard } from '@/app/services/platformApi';
//
// For NEW code, prefer direct imports to reduce coupling:
//   import { getFlashcards } from '@/app/services/platform-api/pa-flashcards';
//
// SUB-FILES:
// ├── pa-institutions.ts  — institutions + members + health
// ├── pa-plans.ts         — platform plans + institution plans + subscriptions
// ├── pa-admin.ts         — admin scopes + access rules + admin students
// ├── pa-content.ts       — courses + summaries + keywords
// ├── pa-flashcards.ts    — flashcard CRUD + FlashcardCard type
// ├── pa-student-data.ts  — reviews + daily activities + stats + BKT + FSRS
// └── pa-study-plans.ts   — study plans + tasks + sessions + reorder
// ============================================================

// Institutions & Members & Health
export {
  PlatformApiError,
  getInstitutions,
  getInstitution,
  getInstitutionBySlug,
  checkSlugAvailability,
  getInstitutionDashboardStats,
  createInstitution,
  updateInstitution,
  deleteInstitution,
  getMembers,
  createMember,
  changeMemberRole,
  changeMemberPlan,
  toggleMemberActive,
  deleteMember,
  healthCheck,
} from './platform-api/pa-institutions';

// Plans & Subscriptions
export {
  getPlatformPlans,
  getPlatformPlan,
  createPlatformPlan,
  updatePlatformPlan,
  deletePlatformPlan,
  getInstitutionPlans,
  getInstitutionPlan,
  createInstitutionPlan,
  updateInstitutionPlan,
  deleteInstitutionPlan,
  setDefaultInstitutionPlan,
  getInstitutionSubscription,
  getSubscription,
  createSubscription,
  updateSubscription,
  cancelSubscription,
} from './platform-api/pa-plans';

// Admin Scopes, Access Rules, Admin Students
export {
  getAdminScopes,
  getAdminScope,
  getAllAdminScopes,
  getInstitutionAdminScopes,
  createAdminScope,
  deleteAdminScope,
  bulkReplaceAdminScopes,
  getPlanAccessRules,
  createAccessRules,
  deleteAccessRule,
  bulkReplaceAccessRules,
  checkAccess,
  getAdminStudents,
  searchAdminStudents,
  getAdminStudentDetail,
  toggleStudentStatus,
  changeStudentPlan,
} from './platform-api/pa-admin';
export type { AdminStudentListItem, AdminStudentDetail, PaginatedResponse } from './platform-api/pa-admin';

// Content: Courses, Summaries, Keywords
export {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getTopicSummaries,
  createSummary,
  updateSummary,
  deleteSummary,
  getKeywords,
  createKeyword,
  updateKeyword,
  deleteKeyword,
} from './platform-api/pa-content';

// Flashcards
export {
  getFlashcardsBySummary,
  getFlashcards,
  getFlashcardsByKeyword,
  getFlashcard,
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
} from './platform-api/pa-flashcards';
export type { FlashcardCard } from './platform-api/pa-flashcards';

// Student Data: Reviews, Stats, BKT, FSRS
export {
  submitReview,
  getDailyActivities,
  upsertDailyActivity,
  getStudentStatsReal,
  upsertStudentStats,
  getAllBktStates,
  upsertBktState,
  getFsrsStates,
  upsertFsrsState,
} from './platform-api/pa-student-data';
export type {
  ReviewRequest,
  ReviewResponse,
  DailyActivityRecord,
  StudentStatsRecord,
  BktStateRecord,
  FsrsStateRecord,
} from './platform-api/pa-student-data';

// Study Plans, Tasks, Sessions
export {
  getStudyPlans,
  getStudyPlan,
  createStudyPlan,
  updateStudyPlan,
  deleteStudyPlan,
  getStudyPlanTasks,
  createStudyPlanTask,
  updateStudyPlanTask,
  deleteStudyPlanTask,
  batchUpdateTasks,
  reorderItems,
  createStudySession,
  updateStudySession,
  getStudySessions,
} from './platform-api/pa-study-plans';
export type {
  StudyPlanRecord,
  StudyPlanTaskRecord,
  BatchUpdateTasksPayload,
  BatchUpdateTasksResult,
  StudySessionRecord,
} from './platform-api/pa-study-plans';
