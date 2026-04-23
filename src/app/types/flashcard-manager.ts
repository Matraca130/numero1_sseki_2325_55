// ============================================================
// Shared types for FlashcardsManager sub-components
//
// DUPLICATION AUDIT 2026-04-23:
// `Subtopic` canonicalized in `types/platform.ts`. Re-exported
// here for backward compat with professor-side consumers
// (BulkPreviewTable, FlashcardManagerCard, FlashcardFormModal,
// FlashcardBulkImport, FlashcardsList, useFlashcardsManager).
// ============================================================

export type { Subtopic } from '@/app/types/platform';
