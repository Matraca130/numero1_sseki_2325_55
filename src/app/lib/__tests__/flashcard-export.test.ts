// ============================================================
// TEST: flashcard-export.ts — CSV export for professors
//
// csvEscape is module-private, tested indirectly via flashcardsToCSV.
// Covers: special characters, null fields, header structure,
//         multi-card correctness.
// ============================================================

import { describe, it, expect } from 'vitest';
import { flashcardsToCSV } from '../flashcard-export';
import type { FlashcardItem } from '@/app/services/flashcardApi';

// ── helpers ───────────────────────────────────────────────

function makeFlashcard(overrides: Partial<FlashcardItem> = {}): FlashcardItem {
  return {
    id: 'fc-001',
    summary_id: 'sum-1',
    keyword_id: 'kw-1',
    subtopic_id: null,
    front: 'What is ATP?',
    back: 'Adenosine triphosphate',
    source: 'manual' as const,
    is_active: true,
    deleted_at: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    ...overrides,
  };
}

function csvRows(csv: string): string[] {
  return csv.split('\n');
}

// ── Header structure ──────────────────────────────────────

describe('flashcardsToCSV — headers', () => {
  it('first row should contain expected column headers', () => {
    const csv = flashcardsToCSV([makeFlashcard()]);
    const header = csvRows(csv)[0];
    expect(header).toBe('id,front,back,keyword_id,subtopic_id,source,is_active,created_at');
  });

  it('empty array → header only (no data rows)', () => {
    const csv = flashcardsToCSV([]);
    const rows = csvRows(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain('id');
  });
});

// ── Basic export ──────────────────────────────────────────

describe('flashcardsToCSV — data rows', () => {
  it('single card exports correct values', () => {
    const csv = flashcardsToCSV([makeFlashcard()]);
    const rows = csvRows(csv);
    expect(rows).toHaveLength(2); // header + 1 data row
    const dataRow = rows[1];
    expect(dataRow).toContain('fc-001');
    expect(dataRow).toContain('What is ATP?');
    expect(dataRow).toContain('Adenosine triphosphate');
    expect(dataRow).toContain('manual');
    expect(dataRow).toContain('true');
  });

  it('multiple cards → correct row count', () => {
    const cards = [
      makeFlashcard({ id: 'a' }),
      makeFlashcard({ id: 'b' }),
      makeFlashcard({ id: 'c' }),
    ];
    const csv = flashcardsToCSV(cards);
    expect(csvRows(csv)).toHaveLength(4); // header + 3
  });

  it('is_active=false → exports "false"', () => {
    const csv = flashcardsToCSV([makeFlashcard({ is_active: false })]);
    expect(csvRows(csv)[1]).toContain('false');
  });

  it('null subtopic_id → exports empty string', () => {
    const csv = flashcardsToCSV([makeFlashcard({ subtopic_id: null })]);
    const row = csvRows(csv)[1];
    // id,front,back,keyword_id,,source  ← empty between commas
    expect(row).toMatch(/kw-1,,manual/);
  });
});

// ── CSV escaping (via flashcardsToCSV) ────────────────────

describe('flashcardsToCSV — CSV escaping', () => {
  it('commas in content → value is quoted', () => {
    const csv = flashcardsToCSV([makeFlashcard({ front: 'A, B, C' })]);
    expect(csvRows(csv)[1]).toContain('"A, B, C"');
  });

  it('double quotes in content → doubled and quoted', () => {
    const csv = flashcardsToCSV([makeFlashcard({ back: 'The "powerhouse"' })]);
    expect(csvRows(csv)[1]).toContain('"The ""powerhouse"""');
  });

  it('newlines in content → value is quoted', () => {
    const csv = flashcardsToCSV([makeFlashcard({ front: 'Line 1\nLine 2' })]);
    // The value should be wrapped in quotes
    expect(csvRows(csv).join('\n')).toContain('"Line 1\nLine 2"');
  });

  it('content with commas AND quotes → properly escaped', () => {
    const csv = flashcardsToCSV([makeFlashcard({ front: 'He said, "hello"' })]);
    expect(csv).toContain('"He said, ""hello"""');
  });

  it('plain text without special chars → no quoting', () => {
    const csv = flashcardsToCSV([makeFlashcard({ front: 'Simple text' })]);
    const row = csvRows(csv)[1];
    // Should NOT be wrapped in quotes
    expect(row).not.toContain('"Simple text"');
    expect(row).toContain('Simple text');
  });
});
