// ============================================================
// Axon -- Tests for flashcard-export.ts
//
// Coverage: flashcardsToCSV (escape, headers, is_active default,
//           nulls/undefineds), exportFlashcardsCSV + exportFlashcardsJSON
//           (Blob creation, <a download> trigger, cleanup timing).
//
// Pure CSV logic has NO mocks. The DOM download flow uses jsdom and
// spies on document/URL APIs; no network or real file I/O.
//
// Run: npx vitest run src/app/lib/__tests__/flashcard-export.test.ts
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  flashcardsToCSV,
  exportFlashcardsCSV,
  exportFlashcardsJSON,
} from '@/app/lib/flashcard-export';
import type { FlashcardItem } from '@/app/services/flashcardApi';

// jsdom's Blob does not implement .text() or .arrayBuffer(). Instead of
// relying on those, we inspect the strings passed to `new Blob(parts, ...)`.
// The Blob constructor stores its parts as-is; we intercept by wrapping
// the global Blob with a passthrough that captures the parts argument.
function installBlobSpy(): {
  get lastParts(): BlobPart[];
  restore: () => void;
} {
  const OriginalBlob = globalThis.Blob;
  let captured: BlobPart[] = [];
  class SpyBlob extends OriginalBlob {
    constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
      super(parts, options);
      captured = parts ?? [];
    }
  }
  (globalThis as unknown as { Blob: typeof Blob }).Blob = SpyBlob as unknown as typeof Blob;
  return {
    get lastParts() {
      return captured;
    },
    restore: () => {
      (globalThis as unknown as { Blob: typeof Blob }).Blob = OriginalBlob;
    },
  };
}

function joinParts(parts: BlobPart[]): string {
  return parts
    .map((p) => (typeof p === 'string' ? p : ''))
    .join('');
}

// ── Fixture builder ───────────────────────────────────────

function makeCard(overrides: Partial<FlashcardItem> = {}): FlashcardItem {
  return {
    id: 'card-1',
    summary_id: 'sum-1',
    keyword_id: 'kw-1',
    subtopic_id: 'sub-1',
    front: 'What is mitosis?',
    back: 'Cell division',
    front_image_url: null,
    back_image_url: null,
    source: 'manual',
    is_active: true,
    deleted_at: null,
    created_by: 'user-1',
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-01-01T10:00:00Z',
    ...overrides,
  };
}

// ============================================================
// flashcardsToCSV — pure CSV generation
// ============================================================

describe('flashcardsToCSV', () => {
  it('emits the canonical header row first', () => {
    const csv = flashcardsToCSV([]);
    const firstLine = csv.split('\n')[0];
    expect(firstLine).toBe(
      'id,front,back,keyword_id,subtopic_id,source,is_active,created_at',
    );
  });

  it('produces header-only output for empty input', () => {
    const csv = flashcardsToCSV([]);
    expect(csv.split('\n')).toHaveLength(1);
  });

  it('serializes a simple row without quoting when no special chars', () => {
    const csv = flashcardsToCSV([makeCard({ front: 'Q', back: 'A' })]);
    const rows = csv.split('\n');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toBe('card-1,Q,A,kw-1,sub-1,manual,true,2026-01-01T10:00:00Z');
  });

  it('wraps values containing commas in double quotes', () => {
    const csv = flashcardsToCSV([makeCard({ front: 'Hola, mundo' })]);
    expect(csv).toContain('"Hola, mundo"');
  });

  it('wraps values containing newlines in double quotes', () => {
    const csv = flashcardsToCSV([makeCard({ back: 'Line1\nLine2' })]);
    expect(csv).toContain('"Line1\nLine2"');
  });

  it('wraps values containing carriage returns in double quotes', () => {
    const csv = flashcardsToCSV([makeCard({ back: 'Line1\rLine2' })]);
    expect(csv).toContain('"Line1\rLine2"');
  });

  it('escapes double quotes by doubling them and wraps the value', () => {
    const csv = flashcardsToCSV([makeCard({ front: 'He said "hi"' })]);
    // "He said ""hi"""
    expect(csv).toContain('"He said ""hi"""');
  });

  it('renders null/undefined string fields as empty cells', () => {
    // subtopic_id is optional → undefined should become empty
    const csv = flashcardsToCSV([
      makeCard({ subtopic_id: null, created_at: undefined as unknown as string }),
    ]);
    const row = csv.split('\n')[1];
    // subtopic_id is the 5th column (0: id, 1: front, 2: back, 3: keyword, 4: subtopic)
    const cells = row.split(',');
    expect(cells[4]).toBe('');
    // created_at is the 8th column
    expect(cells[7]).toBe('');
  });

  it('defaults is_active to "true" when not explicitly false', () => {
    const csv = flashcardsToCSV([
      makeCard({ is_active: undefined as unknown as boolean }),
    ]);
    const cells = csv.split('\n')[1].split(',');
    expect(cells[6]).toBe('true');
  });

  it('emits is_active "false" only when explicitly false', () => {
    const csv = flashcardsToCSV([makeCard({ is_active: false })]);
    const cells = csv.split('\n')[1].split(',');
    expect(cells[6]).toBe('false');
  });

  it('serializes multiple rows separated by \\n', () => {
    const csv = flashcardsToCSV([
      makeCard({ id: 'a' }),
      makeCard({ id: 'b' }),
      makeCard({ id: 'c' }),
    ]);
    const rows = csv.split('\n');
    // 1 header + 3 data
    expect(rows).toHaveLength(4);
    expect(rows[1]).toMatch(/^a,/);
    expect(rows[2]).toMatch(/^b,/);
    expect(rows[3]).toMatch(/^c,/);
  });

  it('preserves ordering of input array', () => {
    const csv = flashcardsToCSV([
      makeCard({ id: 'third', front: 'C' }),
      makeCard({ id: 'first', front: 'A' }),
      makeCard({ id: 'second', front: 'B' }),
    ]);
    const dataRows = csv.split('\n').slice(1);
    expect(dataRows[0]).toMatch(/^third,/);
    expect(dataRows[1]).toMatch(/^first,/);
    expect(dataRows[2]).toMatch(/^second,/);
  });
});

// ============================================================
// exportFlashcardsCSV — DOM + Blob download flow
// ============================================================

describe('exportFlashcardsCSV', () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    createObjectURLSpy = vi.fn(() => 'blob:mock-url');
    revokeObjectURLSpy = vi.fn();
    (globalThis.URL as unknown as { createObjectURL: unknown }).createObjectURL =
      createObjectURLSpy;
    (globalThis.URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL =
      revokeObjectURLSpy;
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    clickSpy.mockRestore();
  });

  it('creates a Blob via URL.createObjectURL and triggers a link click', () => {
    exportFlashcardsCSV([makeCard()], 'my-export');
    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toMatch(/text\/csv/);
  });

  it('prepends a BOM (\\uFEFF) for Excel compatibility', () => {
    const blobSpy = installBlobSpy();
    try {
      exportFlashcardsCSV([makeCard({ front: 'Hola' })], 'out');
      const text = joinParts(blobSpy.lastParts);
      expect(text.charCodeAt(0)).toBe(0xfeff);
    } finally {
      blobSpy.restore();
    }
  });

  it('uses the provided filename with .csv extension', () => {
    // Capture the anchor element created inside export
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    exportFlashcardsCSV([makeCard()], 'my-export');
    const appended = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(appended.download).toBe('my-export.csv');
    expect(appended.href).toContain('blob:');
    appendChildSpy.mockRestore();
  });

  it('defaults filename to "flashcards.csv" when omitted', () => {
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    exportFlashcardsCSV([makeCard()]);
    const appended = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(appended.download).toBe('flashcards.csv');
    appendChildSpy.mockRestore();
  });

  it('revokes the object URL and removes the link after 100ms', () => {
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');
    exportFlashcardsCSV([makeCard()], 'x');
    // Before timer: still appended, not revoked
    expect(revokeObjectURLSpy).not.toHaveBeenCalled();
    expect(removeChildSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    expect(removeChildSpy).toHaveBeenCalledTimes(1);
    removeChildSpy.mockRestore();
  });

  it('handles an empty flashcards array (headers-only download)', () => {
    const blobSpy = installBlobSpy();
    try {
      exportFlashcardsCSV([], 'empty');
      const text = joinParts(blobSpy.lastParts);
      // BOM + header row only
      expect(text).toContain('id,front,back');
      // Strip leading BOM before splitting to count rows
      const stripped = text.replace(/^\uFEFF/, '');
      expect(stripped.split('\n')).toHaveLength(1);
    } finally {
      blobSpy.restore();
    }
  });
});

// ============================================================
// exportFlashcardsJSON — DOM + Blob download flow
// ============================================================

describe('exportFlashcardsJSON', () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    createObjectURLSpy = vi.fn(() => 'blob:json-url');
    revokeObjectURLSpy = vi.fn();
    (globalThis.URL as unknown as { createObjectURL: unknown }).createObjectURL =
      createObjectURLSpy;
    (globalThis.URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL =
      revokeObjectURLSpy;
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    clickSpy.mockRestore();
  });

  it('creates a JSON-typed Blob', () => {
    exportFlashcardsJSON([makeCard()], 'x');
    const blob = createObjectURLSpy.mock.calls[0][0] as Blob;
    expect(blob.type).toMatch(/application\/json/);
  });

  it('writes JSON with 2-space indentation preserving input shape', () => {
    const blobSpy = installBlobSpy();
    try {
      const cards = [makeCard({ id: 'c1' }), makeCard({ id: 'c2' })];
      exportFlashcardsJSON(cards, 'x');
      const text = joinParts(blobSpy.lastParts);
      const parsed = JSON.parse(text);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].id).toBe('c1');
      // indentation → contains newlines
      expect(text).toContain('\n  ');
    } finally {
      blobSpy.restore();
    }
  });

  it('defaults filename to flashcards.json when omitted', () => {
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    exportFlashcardsJSON([makeCard()]);
    const appended = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(appended.download).toBe('flashcards.json');
    appendChildSpy.mockRestore();
  });

  it('uses provided filename with .json extension', () => {
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    exportFlashcardsJSON([makeCard()], 'backup-2026');
    const appended = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(appended.download).toBe('backup-2026.json');
    appendChildSpy.mockRestore();
  });

  it('cleans up the object URL after 100ms', () => {
    exportFlashcardsJSON([makeCard()], 'x');
    expect(revokeObjectURLSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:json-url');
  });
});
