// ============================================================
// Axon — Summary shared helpers
// Extracted from StudentSummariesView.tsx (Sprint 1)
//
// Pure functions with zero side-effects.
// ============================================================

/**
 * Strip markdown syntax for plain-text preview.
 * 12 regex transforms: headers, images, links, bold, italic,
 * strikethrough, code, lists, blockquotes, rules, tables, whitespace.
 */
export function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')           // headers: # ## ###
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '') // images: ![alt](url)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links: [text](url) → text
    .replace(/(\*\*|__)(.*?)\1/g, '$2')     // bold: **text** or __text__
    .replace(/(\*|_)(.*?)\1/g, '$2')        // italic: *text* or _text_
    .replace(/~~(.*?)~~/g, '$1')            // strikethrough
    .replace(/`{1,3}[^`]*`{1,3}/g, '')     // inline/block code
    .replace(/^[-*+]\s+/gm, '')             // unordered list markers
    .replace(/^\d+\.\s+/gm, '')             // ordered list markers
    .replace(/^>\s+/gm, '')                 // blockquotes
    .replace(/^---+$/gm, '')                // horizontal rules
    .replace(/\|/g, ' ')                    // table pipes
    .replace(/\n+/g, ' ')                   // newlines → spaces
    .replace(/\s{2,}/g, ' ')               // collapse whitespace
    .trim();
}

/** Motivational text based on completed/total progress */
export function getMotivation(progress: number, total: number): string {
  if (total === 0) return '';
  if (progress === 0) return 'Dale, empeza!';
  if (progress / total >= 1) return 'Excelente! Completaste todo!';
  if (progress / total >= 0.7) return 'Ya casi terminas!';
  if (progress / total >= 0.3) return 'Vas muy bien, segui asi!';
  return 'Buen comienzo!';
}
