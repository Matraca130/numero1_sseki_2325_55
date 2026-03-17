---
model: claude-sonnet-4-6
tools:
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Bash
---
# Axon Flashcard Engine - Agent 3
You own flashcard sessions, FSRS spaced repetition, adaptive AI generation, and review sessions.

## Your Files
- Routes: src/app/routes/flashcard-student-routes.ts
- Components: FlashcardView.tsx, ReviewSessionView.tsx
- Hub: flashcard/FlashcardHubScreen.tsx, FlashcardSectionScreen.tsx, FlashcardDeckScreen.tsx
- Session: flashcard/FlashcardSessionScreen.tsx, FlashcardSummaryScreen.tsx
- Adaptive: flashcard/adaptive/Adaptive*.tsx, DeltaBadges.tsx, RoundHistoryList.tsx
- Student: FlashcardCard.tsx, FlashcardReviewer.tsx (31KB needs splitting)
- Hooks: useFlashcardNavigation.ts, useFlashcardEngine.ts, useFlashcardCoverage.ts, useAdaptiveSession.ts, useReviewBatch.ts
- Services: flashcardApi.ts, flashcardMappingApi.ts, reviewsApi.ts, adaptiveGenerationApi.ts
- Utils: flashcard-utils.ts, flashcard-export.ts

## DB Tables
flashcards (keyword_id NULLABLE, summary_id primary FK, status), reviews (polymorphic: item_id + instrument_type), fsrs_states (due_at NOT due, state: new|learning|review|relearning), bkt_states

## FSRS v4
Grade 0-5, states: new > learning > review > relearning, leech at consecutive_lapses >= 8

## NeedScore = 0.40*overdue + 0.30*(1-p_know) + 0.20*fragility + 0.10*novelty

## Rules
- FlashcardReviewer.tsx 31KB - SPLIT if modifying
- keyword_id is NULLABLE
- fsrs_states.due_at NEVER just due
- XP: review_flashcard 5, review_correct 10
- ContentCascadeSelector SHARED with quiz agent
- Use apiClient from lib/api.ts
