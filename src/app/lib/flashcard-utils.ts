// ============================================================
// Flashcard Utilities — Shared pure functions
//
// Single source of truth for:
//   - CardType union type
//   - Content parsing (extractImageUrl, extractText)
//   - Card type auto-detection (detectCardType)
//
// Consumed by: FlashcardCard, FlashcardPreview,
//   FlashcardTypeSelector, FlashcardReviewer, FlashcardsManager
// ============================================================

// ── CardType ──────────────────────────────────────────────

export type CardType =
  | 'text'
  | 'text_image'
  | 'image_text'
  | 'image_image'
  | 'text_both'
  | 'cloze';

// ── Content Parsing ───────────────────────────────────────

/** Extract image URL from content: ![img](URL) or standalone URL */
export function extractImageUrl(content: string): string | null {
  const mdMatch = content.match(/!\[img\]\(([^)]+)\)/);
  if (mdMatch) return mdMatch[1];
  const trimmed = content.trim();
  if (trimmed.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg|bmp)/i)) {
    return trimmed;
  }
  return null;
}

/** Extract text content (removing image markdown) */
export function extractText(content: string): string {
  return content.replace(/!\[img\]\([^)]+\)/g, '').trim();
}

// ── Card Type Detection ───────────────────────────────────

/** Auto-detect card type from front/back content encoding */
export function detectCardType(front: string, back: string): CardType {
  if (/\{\{.+?\}\}/.test(front)) return 'cloze';
  const fImg = extractImageUrl(front);
  const bImg = extractImageUrl(back);
  const fTxt = extractText(front);
  const bTxt = extractText(back);
  if (fImg && bImg && fTxt && bTxt) return 'text_both';
  if (fImg && bImg) return 'image_image';
  if (fImg && !bImg) return 'image_text';
  if (!fImg && bImg) return 'text_image';
  return 'text';
}
