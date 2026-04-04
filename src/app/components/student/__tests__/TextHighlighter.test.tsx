// ============================================================
// Tests — TextHighlighter (pure functions + component rendering)
//
// Coverage:
//   - buildPlainText: chunk concatenation with ordering
//   - buildSegments: offset-based text segmentation
//   - Component: loading/empty states, highlight rendering,
//     annotation editing, note modal, delete flow
//
// RUN: npx vitest run src/app/components/student/__tests__/TextHighlighter.test.tsx
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ── Mock dependencies ────────────────────────────────────────

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock('@/app/hooks/queries/useAnnotationMutations', () => ({
  useCreateAnnotationMutation: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useUpdateAnnotationMutation: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
  }),
  useDeleteAnnotationMutation: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
  }),
}));

vi.mock('@/app/components/student/blocks/renderTextWithKeywords', () => ({
  replaceKeywordPlaceholders: (text: string) => text,
}));

// ── Import after mocks ──────────────────────────────────────

import {
  TextHighlighter,
  buildPlainText,
  buildSegments,
} from '../TextHighlighter';
import type { Segment } from '../TextHighlighter';
import type { TextAnnotation } from '@/app/services/studentSummariesApi';

// ── Fixtures ────────────────────────────────────────────────

interface MockChunk {
  id: string;
  summary_id: string;
  content: string;
  order_index: number;
}

function createMockChunk(overrides: Partial<MockChunk> = {}): MockChunk {
  return {
    id: 'chunk-001',
    summary_id: 'sum-001',
    content: 'Lorem ipsum dolor sit amet',
    order_index: 0,
    ...overrides,
  };
}

function createMockAnnotation(overrides: Partial<TextAnnotation> = {}): TextAnnotation {
  return {
    id: 'ann-001',
    student_id: 'stu-001',
    summary_id: 'sum-001',
    start_offset: 0,
    end_offset: 10,
    color: 'yellow',
    note: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    deleted_at: null,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════
// PURE FUNCTION TESTS
// ═══════════════════════════════════════════════════════════

describe('buildPlainText', () => {
  it('concatenates single chunk content', () => {
    const chunks = [createMockChunk({ content: 'Hello world' })];
    expect(buildPlainText(chunks)).toBe('Hello world');
  });

  it('concatenates multiple chunks with newlines', () => {
    const chunks = [
      createMockChunk({ content: 'Line one', order_index: 0 }),
      createMockChunk({ content: 'Line two', order_index: 1 }),
    ];
    expect(buildPlainText(chunks)).toBe('Line one\nLine two');
  });

  it('sorts chunks by order_index', () => {
    const chunks = [
      createMockChunk({ content: 'Second', order_index: 1 }),
      createMockChunk({ content: 'First', order_index: 0 }),
      createMockChunk({ content: 'Third', order_index: 2 }),
    ];
    expect(buildPlainText(chunks)).toBe('First\nSecond\nThird');
  });

  it('handles chunks with null order_index (treats as 0)', () => {
    const chunks = [
      createMockChunk({ content: 'B', order_index: 1 }),
      { ...createMockChunk({ content: 'A' }), order_index: undefined as any },
    ];
    expect(buildPlainText(chunks)).toBe('A\nB');
  });

  it('returns empty string for empty chunks array', () => {
    expect(buildPlainText([])).toBe('');
  });

  it('preserves whitespace in chunk content', () => {
    const chunks = [createMockChunk({ content: '  spaced  content  ' })];
    expect(buildPlainText(chunks)).toBe('  spaced  content  ');
  });
});

describe('buildSegments', () => {
  it('returns single segment for text with no annotations', () => {
    const segments = buildSegments('Hello world', []);
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe('Hello world');
    expect(segments[0].annotation).toBeUndefined();
  });

  it('splits text into 3 segments for one middle annotation', () => {
    const ann = createMockAnnotation({ start_offset: 6, end_offset: 11 });
    const segments = buildSegments('Hello world test', [ann]);

    expect(segments).toHaveLength(3);
    expect(segments[0].text).toBe('Hello ');
    expect(segments[0].annotation).toBeUndefined();
    expect(segments[1].text).toBe('world');
    expect(segments[1].annotation).toBe(ann);
    expect(segments[2].text).toBe(' test');
    expect(segments[2].annotation).toBeUndefined();
  });

  it('handles annotation at start of text', () => {
    const ann = createMockAnnotation({ start_offset: 0, end_offset: 5 });
    const segments = buildSegments('Hello world', [ann]);

    expect(segments).toHaveLength(2);
    expect(segments[0].text).toBe('Hello');
    expect(segments[0].annotation).toBe(ann);
    expect(segments[1].text).toBe(' world');
  });

  it('handles annotation at end of text', () => {
    const ann = createMockAnnotation({ start_offset: 6, end_offset: 11 });
    const segments = buildSegments('Hello world', [ann]);

    expect(segments).toHaveLength(2);
    expect(segments[0].text).toBe('Hello ');
    expect(segments[1].text).toBe('world');
    expect(segments[1].annotation).toBe(ann);
  });

  it('handles annotation covering entire text', () => {
    const ann = createMockAnnotation({ start_offset: 0, end_offset: 11 });
    const segments = buildSegments('Hello world', [ann]);

    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe('Hello world');
    expect(segments[0].annotation).toBe(ann);
  });

  it('handles multiple non-overlapping annotations', () => {
    const ann1 = createMockAnnotation({ id: 'a1', start_offset: 0, end_offset: 5 });
    const ann2 = createMockAnnotation({ id: 'a2', start_offset: 6, end_offset: 11 });
    const segments = buildSegments('Hello world', [ann1, ann2]);

    expect(segments).toHaveLength(3);
    expect(segments[0].text).toBe('Hello');
    expect(segments[0].annotation?.id).toBe('a1');
    expect(segments[1].text).toBe(' ');
    expect(segments[1].annotation).toBeUndefined();
    expect(segments[2].text).toBe('world');
    expect(segments[2].annotation?.id).toBe('a2');
  });

  it('filters out annotations with deleted_at set', () => {
    const ann = createMockAnnotation({ deleted_at: '2025-01-02T00:00:00Z' });
    const segments = buildSegments('Hello world', [ann]);

    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe('Hello world');
    expect(segments[0].annotation).toBeUndefined();
  });

  it('clamps annotation end_offset to text length', () => {
    const ann = createMockAnnotation({ start_offset: 6, end_offset: 999 });
    const segments = buildSegments('Hello world', [ann]);

    const highlighted = segments.find(s => s.annotation);
    expect(highlighted?.text).toBe('world');
  });

  it('sorts annotations by start_offset regardless of input order', () => {
    const ann1 = createMockAnnotation({ id: 'a1', start_offset: 6, end_offset: 11 });
    const ann2 = createMockAnnotation({ id: 'a2', start_offset: 0, end_offset: 5 });
    // Pass in reverse order
    const segments = buildSegments('Hello world', [ann1, ann2]);

    expect(segments[0].annotation?.id).toBe('a2');
    expect(segments[2].annotation?.id).toBe('a1');
  });

  it('skips annotations with start >= end (zero-width)', () => {
    const ann = createMockAnnotation({ start_offset: 5, end_offset: 5 });
    const segments = buildSegments('Hello world', [ann]);

    expect(segments).toHaveLength(1);
    expect(segments[0].annotation).toBeUndefined();
  });

  it('handles adjacent annotations with no gap', () => {
    const ann1 = createMockAnnotation({ id: 'a1', start_offset: 0, end_offset: 5 });
    const ann2 = createMockAnnotation({ id: 'a2', start_offset: 5, end_offset: 11 });
    const segments = buildSegments('Hello world', [ann1, ann2]);

    expect(segments).toHaveLength(2);
    expect(segments[0].text).toBe('Hello');
    expect(segments[0].annotation?.id).toBe('a1');
    expect(segments[1].text).toBe(' world');
    expect(segments[1].annotation?.id).toBe('a2');
  });
});

// ═══════════════════════════════════════════════════════════
// COMPONENT TESTS
// ═══════════════════════════════════════════════════════════

describe('TextHighlighter component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    chunks: [createMockChunk({ content: 'Hello world test content' })] as any[],
    summaryId: 'sum-001',
    annotations: [] as TextAnnotation[],
  };

  it('renders loading skeleton when loading=true', () => {
    const { container } = render(
      <TextHighlighter {...defaultProps} loading={true} />,
    );
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when chunks=[]', () => {
    render(
      <TextHighlighter {...defaultProps} chunks={[]} />,
    );
    expect(screen.getByText('Este resumen aun no tiene contenido')).toBeInTheDocument();
  });

  it('renders plain text from chunks', () => {
    render(<TextHighlighter {...defaultProps} />);
    expect(screen.getByText('Hello world test content')).toBeInTheDocument();
  });

  it('renders highlighted text with correct annotation', () => {
    const annotations = [
      createMockAnnotation({
        start_offset: 0,
        end_offset: 5,
        color: 'yellow',
      }),
    ];
    const { container } = render(
      <TextHighlighter {...defaultProps} annotations={annotations} />,
    );
    // The highlighted span should have yellow background class
    const highlighted = container.querySelector('.bg-yellow-200\\/50');
    expect(highlighted).toBeInTheDocument();
    expect(highlighted?.textContent).toBe('Hello');
  });

  it('renders multiple highlights with different colors', () => {
    const annotations = [
      createMockAnnotation({ id: 'a1', start_offset: 0, end_offset: 5, color: 'yellow' }),
      createMockAnnotation({ id: 'a2', start_offset: 6, end_offset: 11, color: 'green' }),
    ];
    const { container } = render(
      <TextHighlighter {...defaultProps} annotations={annotations} />,
    );
    expect(container.querySelector('.bg-yellow-200\\/50')).toBeInTheDocument();
    expect(container.querySelector('.bg-emerald-200\\/50')).toBeInTheDocument();
  });

  it('shows note icon for annotations with notes', () => {
    const annotations = [
      createMockAnnotation({
        start_offset: 0,
        end_offset: 5,
        note: 'Important note here',
      }),
    ];
    render(
      <TextHighlighter {...defaultProps} annotations={annotations} />,
    );
    // The MessageSquare icon should be rendered
    const highlighted = screen.getByTitle('Important note here');
    expect(highlighted).toBeInTheDocument();
  });

  it('shows default title for highlights without notes', () => {
    const annotations = [
      createMockAnnotation({ start_offset: 0, end_offset: 5, note: null }),
    ];
    render(
      <TextHighlighter {...defaultProps} annotations={annotations} />,
    );
    expect(screen.getByTitle('Click derecho para opciones')).toBeInTheDocument();
  });

  it('does not render deleted annotations', () => {
    const annotations = [
      createMockAnnotation({
        start_offset: 0,
        end_offset: 5,
        deleted_at: '2025-06-01T00:00:00Z',
      }),
    ];
    const { container } = render(
      <TextHighlighter {...defaultProps} annotations={annotations} />,
    );
    expect(container.querySelector('.bg-yellow-200\\/50')).not.toBeInTheDocument();
  });

  it('opens note editor on context menu of a highlight', () => {
    const annotations = [
      createMockAnnotation({ start_offset: 0, end_offset: 5, note: 'Old note' }),
    ];
    render(
      <TextHighlighter {...defaultProps} annotations={annotations} />,
    );

    const highlighted = screen.getByTitle('Old note');
    fireEvent.contextMenu(highlighted);

    // The note editor modal should appear
    expect(screen.getByText('Nota del subrayado')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Escribe una nota sobre este texto...')).toBeInTheDocument();
  });

  it('shows the highlighted text preview in the note editor', () => {
    const annotations = [
      createMockAnnotation({ start_offset: 0, end_offset: 5 }),
    ];
    render(
      <TextHighlighter
        {...defaultProps}
        chunks={[createMockChunk({ content: 'Hello world' })] as any[]}
        annotations={annotations}
      />,
    );

    const highlighted = screen.getByTitle('Click derecho para opciones');
    fireEvent.contextMenu(highlighted);

    // Preview should show the highlighted text (may appear multiple times: main text + preview)
    expect(screen.getAllByText('Hello').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Nota del subrayado')).toBeInTheDocument();
  });

  it('closes note editor on Cancel button', async () => {
    const annotations = [
      createMockAnnotation({ start_offset: 0, end_offset: 5 }),
    ];
    render(
      <TextHighlighter {...defaultProps} annotations={annotations} />,
    );

    // Open editor
    fireEvent.contextMenu(screen.getByTitle('Click derecho para opciones'));
    expect(screen.getByText('Nota del subrayado')).toBeInTheDocument();

    // Close — AnimatePresence may delay unmount, so wait for it
    fireEvent.click(screen.getByText('Cancelar'));
    await waitFor(() => {
      expect(screen.queryByText('Nota del subrayado')).not.toBeInTheDocument();
    });
  });

  it('calls update mutation when saving a note', async () => {
    const ann = createMockAnnotation({ id: 'ann-123', start_offset: 0, end_offset: 5 });
    render(
      <TextHighlighter {...defaultProps} annotations={[ann]} />,
    );

    // Open editor
    fireEvent.contextMenu(screen.getByTitle('Click derecho para opciones'));

    // Type note
    const textarea = screen.getByPlaceholderText('Escribe una nota sobre este texto...');
    fireEvent.change(textarea, { target: { value: 'My new note' } });

    // Save
    fireEvent.click(screen.getByText('Guardar'));

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      { id: 'ann-123', data: { note: 'My new note' } },
      expect.any(Object),
    );
  });

  it('calls delete mutation when clicking delete button in editor', () => {
    const ann = createMockAnnotation({ id: 'ann-456', start_offset: 0, end_offset: 5 });
    render(
      <TextHighlighter {...defaultProps} annotations={[ann]} />,
    );

    // Open editor
    fireEvent.contextMenu(screen.getByTitle('Click derecho para opciones'));

    // Click delete (Trash2 icon button)
    const deleteBtn = screen.getByTitle('Eliminar subrayado');
    fireEvent.click(deleteBtn);

    expect(mockDeleteMutate).toHaveBeenCalledWith('ann-456', expect.any(Object));
  });

  it('shows character count in note editor', () => {
    const ann = createMockAnnotation({ start_offset: 0, end_offset: 5 });
    render(
      <TextHighlighter {...defaultProps} annotations={[ann]} />,
    );

    fireEvent.contextMenu(screen.getByTitle('Click derecho para opciones'));
    expect(screen.getByText('0/500')).toBeInTheDocument();

    // Type some text
    const textarea = screen.getByPlaceholderText('Escribe una nota sobre este texto...');
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    expect(screen.getByText('5/500')).toBeInTheDocument();
  });

  it('saves empty note as null', () => {
    const ann = createMockAnnotation({ id: 'ann-789', start_offset: 0, end_offset: 5, note: 'Old' });
    render(
      <TextHighlighter {...defaultProps} annotations={[ann]} />,
    );

    // Open editor (note is pre-filled with 'Old')
    fireEvent.contextMenu(screen.getByTitle('Old'));

    // Clear note
    const textarea = screen.getByPlaceholderText('Escribe una nota sobre este texto...');
    fireEvent.change(textarea, { target: { value: '' } });

    // Save
    fireEvent.click(screen.getByText('Guardar'));

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      { id: 'ann-789', data: { note: null } },
      expect.any(Object),
    );
  });

  it('falls back to yellow colorMap for unknown color', () => {
    const annotations = [
      createMockAnnotation({ start_offset: 0, end_offset: 5, color: 'unknown-color' }),
    ];
    const { container } = render(
      <TextHighlighter {...defaultProps} annotations={annotations} />,
    );
    // Should fallback to yellow
    expect(container.querySelector('.bg-yellow-200\\/50')).toBeInTheDocument();
  });
});
