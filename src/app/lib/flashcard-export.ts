// ============================================================
// Axon — Flashcard Export Utility
//
// Exports flashcards to CSV format for professor download.
// Works client-side (no backend endpoint needed).
//
// Usage:
//   import { exportFlashcardsCSV } from '@/app/lib/flashcard-export';
//   exportFlashcardsCSV(flashcards, 'mis-flashcards');
// ============================================================

import type { FlashcardItem } from '@/app/services/flashcardApi';

// ── CSV Helper ──────────────────────────────────────────────

/**
 * Escape a value for CSV format.
 * Wraps in quotes if contains comma, newline, or double-quote.
 * Doubles any existing double-quotes.
 */
function csvEscape(value: string | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('\n') || str.includes('"') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ── Export Functions ─────────────────────────────────────────

/**
 * Convert flashcards array to CSV string.
 */
export function flashcardsToCSV(flashcards: FlashcardItem[]): string {
  const headers = [
    'id',
    'front',
    'back',
    'keyword_id',
    'subtopic_id',
    'source',
    'is_active',
    'created_at',
  ];

  const rows = flashcards.map((card) => [
    csvEscape(card.id),
    csvEscape(card.front),
    csvEscape(card.back),
    csvEscape(card.keyword_id),
    csvEscape(card.subtopic_id),
    csvEscape(card.source),
    card.is_active !== false ? 'true' : 'false',
    csvEscape(card.created_at),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Download flashcards as a CSV file.
 * Triggers a browser download with the given filename.
 */
export function exportFlashcardsCSV(
  flashcards: FlashcardItem[],
  filename: string = 'flashcards',
): void {
  const csv = flashcardsToCSV(flashcards);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Export flashcards as JSON file.
 */
export function exportFlashcardsJSON(
  flashcards: FlashcardItem[],
  filename: string = 'flashcards',
): void {
  const json = JSON.stringify(flashcards, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}