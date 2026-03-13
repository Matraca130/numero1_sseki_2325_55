// ============================================================
// Axon — keyword-manager-helpers.ts
//
// Shared constants for KeywordsManager, KeywordListItem, and
// KeywordFormDialog. Extracted to avoid duplication.
// ============================================================

/** Priority badge configuration. priority is INTEGER: 1 (baja), 2 (media), 3 (alta). */
export const priorityLabels: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Baja',  color: 'text-gray-500',    bg: 'bg-gray-100' },
  2: { label: 'Media', color: 'text-amber-600',   bg: 'bg-amber-50' },
  3: { label: 'Alta',  color: 'text-red-600',     bg: 'bg-red-50' },
};

/** The three expandable panel types per keyword row. */
export type ExpandablePanel = 'subtopics' | 'connections' | 'notes';
