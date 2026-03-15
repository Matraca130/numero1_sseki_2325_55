# Quiz Domain File Ownership

> **Owner:** Agent 1 (Quiz Session)  
> **Last audited:** 2026-03-15  
> **Rule:** No other agent should modify these files without coordinating with the quiz owner.

## Quick Reference

- **Total quiz files:** 48
- **Guideline rules:** See `Guidelines.md` (9 reglas inquebrantables)
- **Tests:** `src/__tests__/quiz-route-integrity.test.ts` (22 test cases)

---

## 1. Professor — Pages & Managers

| File | Path | Description |
|---|---|---|
| `ProfessorQuizzesPage.tsx` | `src/app/components/roles/pages/professor/` | Top-level page (collapsible header + cascade selectors) |
| `QuizzesManager.tsx` | `src/app/components/roles/pages/professor/` | Quiz list CRUD grid |
| `QuizFormModal.tsx` | `src/app/components/roles/pages/professor/` | Create/edit quiz entity modal |
| `QuizEntityCard.tsx` | `src/app/components/roles/pages/professor/` | Quiz card in manager grid |
| `useQuizCascade.tsx` | `src/app/components/roles/pages/professor/` | Cascade selector hook (Institution>Course>...>Summary) |

## 2. Professor — Question Editor & Sub-components

| File | Path | Description |
|---|---|---|
| `QuizQuestionsEditor.tsx` | `src/app/components/professor/` | Question list + add/edit/delete |
| `QuestionCard.tsx` | `src/app/components/professor/` | Single question display card |
| `QuestionFormModal.tsx` | `src/app/components/professor/` | Create/edit question modal |
| `AnswerEditor.tsx` | `src/app/components/professor/` | MCQ answer option editor |
| `QuizAnalyticsPanel.tsx` | `src/app/components/professor/` | Quiz performance analytics |
| `QuizCard.tsx` | `src/app/components/professor/` | Quiz card (alternate layout) |
| `QuizExportImport.tsx` | `src/app/components/professor/` | JSON export/import functionality |
| `QuizFiltersBar.tsx` | `src/app/components/professor/` | Filter bar (type, difficulty, keyword) |
| `QuizStatsBar.tsx` | `src/app/components/professor/` | Question count / type distribution bar |
| `BulkEditToolbar.tsx` | `src/app/components/professor/` | Multi-select bulk operations toolbar |
| `BulkPreviewTable.tsx` | `src/app/components/professor/` | Preview table for bulk imports |

## 3. Professor — Quiz Hooks

| File | Path | Description |
|---|---|---|
| `useQuestionCrud.ts` | `src/app/components/professor/` | Question create/update/delete operations |
| `useQuestionForm.ts` | `src/app/components/professor/` | Question form state & validation |
| `useQuizAnalytics.ts` | `src/app/components/professor/` | Analytics data fetching |
| `useQuizBulkOps.ts` | `src/app/components/professor/` | Bulk delete/move/difficulty operations |
| `useQuizFilters.ts` | `src/app/components/professor/` | Filter state management |
| `useQuizQuestionsLoader.ts` | `src/app/components/professor/` | Questions pagination/loading |

## 4. Student — Quiz Taker & Results

| File | Path | Description |
|---|---|---|
| `QuizTaker.tsx` | `src/app/components/student/` | Main quiz-taking component |
| `QuizResults.tsx` | `src/app/components/student/` | Post-quiz results screen |
| `QuestionRenderer.tsx` | `src/app/components/student/` | Dispatches to type-specific renderers |
| `QuizAnswerDetail.tsx` | `src/app/components/student/` | Per-answer review detail |
| `QuizBottomBar.tsx` | `src/app/components/student/` | Navigation bar (prev/next/submit) |
| `QuizTopBar.tsx` | `src/app/components/student/` | Progress + timer header |
| `QuizProgressBar.tsx` | `src/app/components/student/` | Visual progress indicator |
| `QuizCountdownTimer.tsx` | `src/app/components/student/` | Countdown timer component |
| `QuizScoreCircle.tsx` | `src/app/components/student/` | Animated score donut |
| `QuizCertificate.tsx` | `src/app/components/student/` | Completion certificate card |
| `QuizHistoryPanel.tsx` | `src/app/components/student/` | Past attempts history |
| `QuizRecoveryPrompt.tsx` | `src/app/components/student/` | Session recovery dialog |
| `QuizErrorBoundary.tsx` | `src/app/components/student/` | Error boundary wrapper |
| `QuizXpConfirmedCard.tsx` | `src/app/components/student/` | XP earned confirmation (gamification) |
| `SubtopicResultsSection.tsx` | `src/app/components/student/` | Per-subtopic breakdown in results |
| `AdaptiveQuizModal.tsx` | `src/app/components/student/` | Adaptive quiz launcher modal |

## 5. Student — Question Type Renderers

| File | Path | Description |
|---|---|---|
| `McqRenderer.tsx` | `src/app/components/student/renderers/` | Multiple choice renderer |
| `TrueFalseRenderer.tsx` | `src/app/components/student/renderers/` | True/false renderer |
| `OpenRenderer.tsx` | `src/app/components/student/renderers/` | Open-ended text renderer |

## 6. Student — Quiz Hooks

| File | Path | Description |
|---|---|---|
| `useQuizSession.ts` | `src/app/components/student/` | Core session state machine |
| `useQuizNavigation.ts` | `src/app/components/student/` | Question navigation logic |
| `useQuizBkt.ts` | `src/app/components/student/` | BKT v3.1 inline calculation + fire-and-forget |
| `useQuizBackup.ts` | `src/app/components/student/` | LocalStorage session backup/recovery |
| `useQuizGamificationFeedback.ts` | `src/app/components/student/` | XP/badge/streak feedback |
| `useAdaptiveQuiz.ts` | `src/app/components/student/` | Adaptive difficulty selection |
| `useBktStates.ts` | `src/app/components/student/` | BKT state management |

## 7. Student — Quiz Helpers & Types

| File | Path | Description |
|---|---|---|
| `quiz-session-helpers.ts` | `src/app/components/student/` | Session utility functions |
| `quiz-types.ts` | `src/app/components/student/` | Quiz TypeScript interfaces |

## 8. Content Layer (Student Views)

| File | Path | Description |
|---|---|---|
| `QuizView.tsx` | `src/app/components/content/` | Route entry point (lazy-loaded by quiz-student-routes.ts) |
| `QuizOverview.tsx` | `src/app/components/content/` | Quiz overview / selection screen |
| `QuizSelection.tsx` | `src/app/components/content/` | Quiz picker with filters |
| `QuizSessionView.tsx` | `src/app/components/content/` | Active quiz session wrapper |
| `QuizResultsScreen.tsx` | `src/app/components/content/` | Results view wrapper |
| `quiz-helpers.ts` | `src/app/components/content/` | Content-layer quiz utilities |

## 9. Services (API Layer)

| File | Path | Description |
|---|---|---|
| `quizApi.ts` | `src/app/services/` | Core quiz CRUD API |
| `quizQuestionsApi.ts` | `src/app/services/` | Questions CRUD API |
| `quizzesEntityApi.ts` | `src/app/services/` | Quiz entity operations |
| `quizAttemptsApi.ts` | `src/app/services/` | Student attempts API |
| `quizConstants.ts` | `src/app/services/` | Shared constants (colors, labels, limits) |
| `quizDesignTokens.ts` | `src/app/services/` | Design tokens for quiz UI |

## 10. Routes

| File | Path | Description |
|---|---|---|
| `quiz-student-routes.ts` | `src/app/routes/` | Student quiz route registration |
| *(professor-routes.ts)* | `src/app/routes/` | Professor routes (shared file - quiz entry at path `quizzes`) |

## 11. Tests

| File | Path | Description |
|---|---|---|
| `quiz-route-integrity.test.ts` | `src/__tests__/` | 22 test cases: route integrity guards |

---

## Files NOT owned by quiz (do not touch)

These files are in the quiz neighborhood but owned by other agents:

| File | Owner | Reason |
|---|---|---|
| `student/gamification/BadgeShowcase.tsx` | Gamification agent | Shared gamification component |
| `student/gamification/LeaderboardCard.tsx` | Gamification agent | Shared gamification component |
| `student/gamification/StreakPanel.tsx` | Gamification agent | Shared gamification component |
| `student/gamification/StudyQueueCard.tsx` | Gamification agent | Shared gamification component |
| `student/gamification/XpHistoryFeed.tsx` | Gamification agent | Shared gamification component |
| `services/bktApi.ts` | Shared (BKT) | Used by quiz + flashcards |
| `services/gamificationApi.ts` | Gamification agent | Used by quiz + flashcards + study |
| `hooks/useStudentNav.ts` | Layout agent | Shared navigation (quiz has VIEW_TO_SLUG entry) |
| `routes/professor-routes.ts` | PROTECTED | Shared assembler (quiz owns only the `quizzes` entry) |
| `routes/student-routes.ts` | PROTECTED | Shared assembler (imports quiz-student-routes.ts) |
