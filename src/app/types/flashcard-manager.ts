// ============================================================
// Shared types for FlashcardsManager sub-components
// ============================================================

export interface Subtopic {
  id: string;
  keyword_id: string;
  name: string;
  order_index: number;
  is_active?: boolean;
  deleted_at?: string | null;
}
