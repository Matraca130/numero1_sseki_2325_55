// ============================================================
// E2E Integration Tests — Professor Content Management
//
// Tests the professor-facing components for managing flashcards,
// quiz questions, keywords, bulk import, AI generation, and
// cascade selection.
//
// Components under test:
//   - FlashcardFormModal (create / edit / validation)
//   - QuestionFormModal (create / edit / mark correct)
//   - QuizQuestionsEditor (list / add / delete)
//   - KeywordsManager (list / create)
//   - FlashcardBulkImport (CSV parsing / preview)
//   - AiGeneratePanel (trigger / result display)
//   - CascadeSelector (multi-level selection)
//
// RUN: npx vitest run src/__tests__/e2e-professor-management.test.tsx
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';

// ── Mock motion/react ──────────────────────────────────────
vi.mock('motion/react', () => {
  const React = require('react');
  const m = (tag: string) => React.forwardRef((p: any, ref: any) => {
    const { initial, animate, exit, variants, whileHover, whileTap, whileInView,
      transition, layout, layoutId, onAnimationComplete, ...rest } = p;
    return React.createElement(tag, { ...rest, ref });
  });
  return {
    motion: {
      div: m('div'), span: m('span'), button: m('button'), ul: m('ul'),
      li: m('li'), p: m('p'), section: m('section'), article: m('article'),
      a: m('a'), img: m('img'), h3: m('h3'), circle: m('circle'),
    },
    AnimatePresence: ({ children }: any) => children,
  };
});

// ── Mock lucide-react ──────────────────────────────────────
vi.mock('lucide-react', () => {
  const React = require('react');
  const icon = (name: string) =>
    React.forwardRef((p: any, ref: any) =>
      React.createElement('svg', { ...p, ref, 'data-testid': `icon-${name}` })
    );
  return {
    Plus: icon('Plus'), Trash2: icon('Trash2'), Edit: icon('Edit'),
    Check: icon('Check'), X: icon('X'), Upload: icon('Upload'),
    Download: icon('Download'), Sparkles: icon('Sparkles'),
    ChevronDown: icon('ChevronDown'), ChevronRight: icon('ChevronRight'),
    Search: icon('Search'), Loader2: icon('Loader2'),
    AlertCircle: icon('AlertCircle'), FileText: icon('FileText'),
    MoreVertical: icon('MoreVertical'), GripVertical: icon('GripVertical'),
    Eye: icon('Eye'), EyeOff: icon('EyeOff'), Copy: icon('Copy'),
    Save: icon('Save'), RefreshCw: icon('RefreshCw'),
    ArrowLeft: icon('ArrowLeft'), ArrowRight: icon('ArrowRight'),
    Filter: icon('Filter'), Brain: icon('Brain'), Wand2: icon('Wand2'),
    Image: icon('Image'), Pencil: icon('Pencil'), Link2: icon('Link2'),
    Trash: icon('Trash'), Tag: icon('Tag'), AlertTriangle: icon('AlertTriangle'),
    HelpCircle: icon('HelpCircle'), CheckCircle2: icon('CheckCircle2'),
    Zap: icon('Zap'), Hash: icon('Hash'), ClipboardPaste: icon('ClipboardPaste'),
    RotateCcw: icon('RotateCcw'), Type: icon('Type'), Columns2: icon('Columns2'),
    SquareSplitHorizontal: icon('SquareSplitHorizontal'),
    LayoutGrid: icon('LayoutGrid'), TextCursorInput: icon('TextCursorInput'),
    ImagePlus: icon('ImagePlus'),
    default: {},
  };
});

// ── Mock sonner ─────────────────────────────────────────────
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// ── Mock clsx (pass-through) ────────────────────────────────
vi.mock('clsx', () => ({
  default: (...args: any[]) => args.filter(Boolean).join(' '),
  __esModule: true,
}));

// ── Mock flashcardApi ────────────────────────────────────────
vi.mock('@/app/services/flashcardApi', () => ({
  createFlashcard: vi.fn(),
  updateFlashcard: vi.fn(),
  getFlashcards: vi.fn(),
  deleteFlashcard: vi.fn(),
  restoreFlashcard: vi.fn(),
}));

// ── Mock quizApi ─────────────────────────────────────────────
vi.mock('@/app/services/quizApi', () => ({
  createQuizQuestion: vi.fn(),
  updateQuizQuestion: vi.fn(),
  getQuizQuestions: vi.fn(),
  deleteQuizQuestion: vi.fn(),
  restoreQuizQuestion: vi.fn(),
  QUESTION_TYPE_LABELS: {
    mcq: 'Opcion multiple',
    true_false: 'Verdadero / Falso',
    fill_blank: 'Completar',
    open: 'Respuesta abierta',
  },
  DIFFICULTY_LABELS: { easy: 'Facil', medium: 'Media', hard: 'Dificil' },
  DIFFICULTY_COLORS: {
    easy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    hard: 'bg-red-100 text-red-700 border-red-200',
  },
  DIFFICULTY_TO_INT: { easy: 1, medium: 2, hard: 3 },
  INT_TO_DIFFICULTY: { 1: 'easy', 2: 'medium', 3: 'hard' },
}));

// ── Mock quizConstants ───────────────────────────────────────
vi.mock('@/app/services/quizConstants', () => ({
  QUESTION_TYPE_LABELS: {
    mcq: 'Opcion multiple',
    true_false: 'Verdadero / Falso',
    fill_blank: 'Completar',
    open: 'Respuesta abierta',
  },
  QUESTION_TYPE_LABELS_SHORT: {
    mcq: 'Opcion multiple',
    true_false: 'V/F',
    fill_blank: 'Completar',
    open: 'Abierta',
  },
  DIFFICULTY_LABELS: { easy: 'Facil', medium: 'Media', hard: 'Dificil' },
  DIFFICULTY_COLORS: {
    easy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    hard: 'bg-red-100 text-red-700 border-red-200',
  },
  DIFFICULTY_TO_INT: { easy: 1, medium: 2, hard: 3 },
  INT_TO_DIFFICULTY: { 1: 'easy', 2: 'medium', 3: 'hard' },
  normalizeQuestionType: (raw: string) => {
    const map: Record<string, string> = {
      mcq: 'mcq', multiple_choice: 'mcq', true_false: 'true_false',
      fill_blank: 'fill_blank', open: 'open',
    };
    return map[raw] || 'mcq';
  },
  normalizeDifficulty: (raw: any) => {
    if (typeof raw === 'string') return raw;
    const map: Record<number, string> = { 1: 'easy', 2: 'medium', 3: 'hard' };
    return map[raw] || 'medium';
  },
}));

// ── Mock quizDesignTokens ────────────────────────────────────
vi.mock('@/app/services/quizDesignTokens', () => ({
  BANNER_WARNING: 'flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-800 text-xs',
}));

// ── Mock lib/api ─────────────────────────────────────────────
vi.mock('@/app/lib/api', () => ({
  apiCall: vi.fn(),
  ensureGeneralKeyword: vi.fn().mockResolvedValue('general-kw-id'),
}));

// ── Mock lib/logger ──────────────────────────────────────────
vi.mock('@/app/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ── Mock lib/error-utils ─────────────────────────────────────
vi.mock('@/app/lib/error-utils', () => ({
  getErrorMsg: (e: any) => e?.message || 'Unknown error',
}));

// ── Mock lib/flashcard-utils ─────────────────────────────────
vi.mock('@/app/lib/flashcard-utils', () => ({
  extractImageUrl: (content: string) => {
    const m = content.match(/!\[img\]\(([^)]+)\)/);
    return m ? m[1] : null;
  },
  extractText: (content: string) => content.replace(/!\[img\]\([^)]+\)\n?\n?/g, '').trim(),
  detectCardType: () => 'text',
}));

// ── Mock FlashcardTypeSelector ───────────────────────────────
vi.mock('@/app/components/professor/FlashcardTypeSelector', () => ({
  FlashcardTypeSelector: ({ value, onChange }: any) => (
    <select
      data-testid="card-type-selector"
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
    >
      <option value="text">Solo texto</option>
      <option value="text_image">Texto + Imagen</option>
      <option value="cloze">Cloze</option>
    </select>
  ),
}));

// ── Mock FlashcardPreview ────────────────────────────────────
vi.mock('@/app/components/professor/FlashcardPreview', () => ({
  FlashcardPreview: ({ front, back }: any) => (
    <div data-testid="flashcard-preview">
      <span data-testid="preview-front">{front}</span>
      <span data-testid="preview-back">{back}</span>
    </div>
  ),
}));

// ── Mock FlashcardImageUpload ────────────────────────────────
vi.mock('@/app/components/professor/FlashcardImageUpload', () => ({
  FlashcardImageUpload: () => <div data-testid="image-upload" />,
}));

// ── Mock aiApi ───────────────────────────────────────────────
vi.mock('@/app/services/aiApi', () => ({
  generateQuestion: vi.fn(),
  preGenerateQuestions: vi.fn(),
}));

// ── Mock shadcn/ui components ────────────────────────────────
vi.mock('@/app/components/ui/button', () => ({
  Button: ({ children, onClick, ...rest }: any) => (
    <button onClick={onClick} {...rest}>{children}</button>
  ),
}));
vi.mock('@/app/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div className={className} data-testid="skeleton" />,
}));

// ── Mock ConfirmDialog ───────────────────────────────────────
vi.mock('@/app/components/shared/ConfirmDialog', () => ({
  ConfirmDialog: ({ open, onConfirm, title }: any) =>
    open ? (
      <div data-testid="confirm-dialog">
        <span>{title}</span>
        <button onClick={onConfirm}>Confirm</button>
      </div>
    ) : null,
}));

// ── Mock QuizErrorBoundary ───────────────────────────────────
vi.mock('@/app/components/shared/QuizErrorBoundary', () => ({
  QuizErrorBoundary: ({ children }: any) => <>{children}</>,
}));

// ── Mock BulkPreviewTable ────────────────────────────────────
vi.mock('@/app/components/professor/BulkPreviewTable', () => ({
  BulkPreviewTable: ({ rows }: any) => (
    <div data-testid="bulk-preview-table">
      {rows.map((r: any) => (
        <div key={r.id} data-testid="bulk-row">
          <span>{r.front}</span> | <span>{r.back}</span>
        </div>
      ))}
    </div>
  ),
}));

// ── Import components under test ─────────────────────────────
import { FlashcardFormModal } from '@/app/components/professor/FlashcardFormModal';
import { FlashcardBulkImport } from '@/app/components/professor/FlashcardBulkImport';
import { CascadeSelector } from '@/app/components/professor/CascadeSelector';
import type { CascadeLevelConfig } from '@/app/components/professor/CascadeSelector';

// Import mocked modules to set up return values
import * as flashcardApi from '@/app/services/flashcardApi';
import { toast } from 'sonner';

const mockedCreateFlashcard = vi.mocked(flashcardApi.createFlashcard);
const mockedUpdateFlashcard = vi.mocked(flashcardApi.updateFlashcard);
const mockedToast = vi.mocked(toast);

// ── Reset all mocks before each test ─────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockedCreateFlashcard.mockResolvedValue({
    id: 'new-fc-1', front: '', back: '', summary_id: 'sum-1',
    keyword_id: 'kw-1', source: 'manual', is_active: true,
    deleted_at: null, created_at: '2026-01-01', updated_at: '2026-01-01',
  });
  mockedUpdateFlashcard.mockResolvedValue({
    id: 'fc-edit', front: '', back: '', summary_id: 'sum-1',
    keyword_id: 'kw-1', source: 'manual', is_active: true,
    deleted_at: null, created_at: '2026-01-01', updated_at: '2026-01-01',
  });
});

// ── Test Data ────────────────────────────────────────────────

const KEYWORDS = [
  { id: 'kw-1', institution_id: 'inst-1', term: 'Mitocondria', definition: 'Powerhouse', priority: 2 },
  { id: 'kw-2', institution_id: 'inst-1', term: 'Ribosoma', definition: 'Protein factory', priority: 1 },
];

const SUBTOPICS_MAP = new Map<string, any[]>([
  ['kw-1', [{ id: 'st-1', name: 'Respiracion Celular', keyword_id: 'kw-1', order_index: 0 }]],
]);

const EXISTING_CARD = {
  id: 'fc-edit',
  summary_id: 'sum-1',
  keyword_id: 'kw-1',
  subtopic_id: null,
  front: 'What is mitochondria?',
  back: 'The powerhouse of the cell',
  front_image_url: null,
  back_image_url: null,
  source: 'manual' as const,
  is_active: true,
  deleted_at: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

// ============================================================
// TEST SUITE
// ============================================================

describe('Professor Content Management — E2E', () => {
  // ──────────────────────────────────────────────────────────
  // 1. FlashcardFormModal: create flashcard with front/back
  // ──────────────────────────────────────────────────────────
  describe('FlashcardFormModal', () => {
    const defaultProps = {
      isOpen: true,
      editingCard: null,
      keywords: KEYWORDS,
      subtopicsMap: SUBTOPICS_MAP,
      summaryId: 'sum-1',
      onClose: vi.fn(),
      onSaved: vi.fn(),
      loadSubtopicsForKeyword: vi.fn().mockResolvedValue(undefined),
      userId: 'user-1',
    };

    it('creates a flashcard when front and back are filled', async () => {
      render(<FlashcardFormModal {...defaultProps} />);

      // Modal title shows "Nueva Flashcard"
      expect(screen.getByText('Nueva Flashcard')).toBeTruthy();

      // Fill front
      const textareas = screen.getAllByRole('textbox');
      const frontInput = textareas[0];
      const backInput = textareas[1];

      fireEvent.change(frontInput, { target: { value: 'What is ATP?' } });
      fireEvent.change(backInput, { target: { value: 'Adenosine triphosphate' } });

      // Click create
      const createBtn = screen.getByText('Crear flashcard');
      fireEvent.click(createBtn);

      await waitFor(() => {
        expect(mockedCreateFlashcard).toHaveBeenCalledTimes(1);
      });

      const callArgs = mockedCreateFlashcard.mock.calls[0][0];
      expect(callArgs.front).toBe('What is ATP?');
      expect(callArgs.back).toBe('Adenosine triphosphate');
      expect(callArgs.summary_id).toBe('sum-1');
    });

    // ──────────────────────────────────────────────────────────
    // 2. FlashcardFormModal: edit existing flashcard, pre-filled
    // ──────────────────────────────────────────────────────────
    it('pre-fills fields when editing an existing flashcard', async () => {
      render(<FlashcardFormModal {...defaultProps} editingCard={EXISTING_CARD} />);

      // Modal title shows "Editar Flashcard"
      expect(screen.getByText('Editar Flashcard')).toBeTruthy();

      // Fields should be pre-filled
      const textareas = screen.getAllByRole('textbox');
      expect((textareas[0] as HTMLTextAreaElement).value).toBe('What is mitochondria?');
      expect((textareas[1] as HTMLTextAreaElement).value).toBe('The powerhouse of the cell');

      // Button should say "Guardar cambios"
      expect(screen.getByText('Guardar cambios')).toBeTruthy();

      // Edit the back text and save
      fireEvent.change(textareas[1], { target: { value: 'Energy factory of the cell' } });
      fireEvent.click(screen.getByText('Guardar cambios'));

      await waitFor(() => {
        expect(mockedUpdateFlashcard).toHaveBeenCalledTimes(1);
      });

      expect(mockedUpdateFlashcard.mock.calls[0][0]).toBe('fc-edit');
      expect(mockedUpdateFlashcard.mock.calls[0][1].back).toBe('Energy factory of the cell');
    });

    // ──────────────────────────────────────────────────────────
    // 3. FlashcardFormModal: validation errors (empty fields)
    // ──────────────────────────────────────────────────────────
    it('shows validation error when front or back is empty', async () => {
      render(<FlashcardFormModal {...defaultProps} />);

      // Click create without filling anything
      fireEvent.click(screen.getByText('Crear flashcard'));

      await waitFor(() => {
        expect(screen.getByText('Frente y reverso son requeridos')).toBeTruthy();
      });

      // API should NOT be called
      expect(mockedCreateFlashcard).not.toHaveBeenCalled();
    });

    it('shows validation error when only front is filled', async () => {
      render(<FlashcardFormModal {...defaultProps} />);

      const textareas = screen.getAllByRole('textbox');
      fireEvent.change(textareas[0], { target: { value: 'A question' } });

      fireEvent.click(screen.getByText('Crear flashcard'));

      await waitFor(() => {
        expect(screen.getByText('Frente y reverso son requeridos')).toBeTruthy();
      });

      expect(mockedCreateFlashcard).not.toHaveBeenCalled();
    });

    it('does not render when isOpen is false', () => {
      const { container } = render(<FlashcardFormModal {...defaultProps} isOpen={false} />);
      expect(container.innerHTML).toBe('');
    });

    it('calls onClose when Cancelar is clicked', () => {
      render(<FlashcardFormModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Cancelar'));
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('loads subtopics when keyword is selected', async () => {
      render(<FlashcardFormModal {...defaultProps} />);

      // Find keyword select — the one that contains "Mitocondria" option
      const selects = document.querySelectorAll('select');
      // First select is the card-type-selector mock, find the keyword one
      let keywordSelect: HTMLSelectElement | null = null;
      selects.forEach(s => {
        const opts = Array.from(s.options).map(o => o.text);
        if (opts.some(t => t.includes('Mitocondria'))) keywordSelect = s;
      });

      expect(keywordSelect).not.toBeNull();
      fireEvent.change(keywordSelect!, { target: { value: 'kw-1' } });

      await waitFor(() => {
        expect(defaultProps.loadSubtopicsForKeyword).toHaveBeenCalledWith('kw-1');
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // 8. FlashcardBulkImport: CSV parsing and preview
  // ──────────────────────────────────────────────────────────
  describe('FlashcardBulkImport', () => {
    const bulkProps = {
      isOpen: true,
      summaryId: 'sum-1',
      keywords: KEYWORDS,
      subtopicsMap: SUBTOPICS_MAP,
      loadSubtopicsForKeyword: vi.fn().mockResolvedValue(undefined),
      onClose: vi.fn(),
      onImported: vi.fn(),
    };

    it('renders the import modal with paste tab active by default', () => {
      render(<FlashcardBulkImport {...bulkProps} />);

      expect(screen.getByText('Importar en lote')).toBeTruthy();
      expect(screen.getByText('Pegar texto')).toBeTruthy();
      expect(screen.getByText('Subir archivo')).toBeTruthy();
      expect(screen.getByText('Templates')).toBeTruthy();
    });

    it('parses pasted pipe-delimited text and shows preview', async () => {
      render(<FlashcardBulkImport {...bulkProps} />);

      // Find the paste textarea
      const textarea = screen.getByPlaceholderText(/Mitocondria/);
      const pasteContent = 'What is ATP?|Energy molecule\nWhat is DNA?|Genetic material';
      fireEvent.change(textarea, { target: { value: pasteContent } });

      // Should show card count
      await waitFor(() => {
        expect(screen.getByText(/2 cards detectadas/)).toBeTruthy();
      });

      // Click preview button
      fireEvent.click(screen.getByText('Previsualizar'));

      // Preview table should appear with bulk rows
      await waitFor(() => {
        expect(screen.getByTestId('bulk-preview-table')).toBeTruthy();
      });

      const rows = screen.getAllByTestId('bulk-row');
      expect(rows.length).toBe(2);
    });

    it('does not render when isOpen is false', () => {
      const { container } = render(<FlashcardBulkImport {...bulkProps} isOpen={false} />);
      expect(container.innerHTML).toBe('');
    });

    it('shows template tab with CSV and JSON download buttons', () => {
      render(<FlashcardBulkImport {...bulkProps} />);

      // Switch to Templates tab
      fireEvent.click(screen.getByText('Templates'));

      expect(screen.getByText('Template CSV')).toBeTruthy();
      expect(screen.getByText('Template JSON')).toBeTruthy();
    });
  });

  // ──────────────────────────────────────────────────────────
  // 10. CascadeSelector: multi-level selection
  // ──────────────────────────────────────────────────────────
  describe('CascadeSelector', () => {
    it('renders all cascade levels with selects', () => {
      const onCourseChange = vi.fn();
      const onSemesterChange = vi.fn();

      const levels: CascadeLevelConfig[] = [
        {
          key: 'course',
          label: 'Curso',
          icon: <span data-testid="course-icon" />,
          items: [
            { id: 'c-1', name: 'Biologia 101' },
            { id: 'c-2', name: 'Quimica 201' },
          ],
          selectedId: '',
          onChange: onCourseChange,
          placeholder: '-- Seleccionar curso --',
          emptyMessage: 'No hay cursos',
        },
        {
          key: 'semester',
          label: 'Semestre',
          icon: <span data-testid="semester-icon" />,
          items: [
            { id: 's-1', name: 'Semestre 1' },
            { id: 's-2', name: 'Semestre 2' },
          ],
          selectedId: '',
          onChange: onSemesterChange,
          placeholder: '-- Seleccionar semestre --',
          emptyMessage: 'No hay semestres',
        },
      ];

      render(<CascadeSelector levels={levels} />);

      // Both levels should be visible (not collapsed by default)
      expect(screen.getByText('Curso')).toBeTruthy();
      expect(screen.getByText('Semestre')).toBeTruthy();

      // Selects should be visible with placeholders
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBe(2);
    });

    it('calls onChange when a selection is made in a level', () => {
      const onCourseChange = vi.fn();

      const levels: CascadeLevelConfig[] = [
        {
          key: 'course',
          label: 'Curso',
          icon: <span />,
          items: [
            { id: 'c-1', name: 'Biologia 101' },
            { id: 'c-2', name: 'Quimica 201' },
          ],
          selectedId: '',
          onChange: onCourseChange,
          placeholder: '-- Seleccionar curso --',
          emptyMessage: 'No hay cursos',
        },
      ];

      render(<CascadeSelector levels={levels} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'c-1' } });

      expect(onCourseChange).toHaveBeenCalledWith('c-1');
    });

    it('collapses a level when the header is clicked', () => {
      const levels: CascadeLevelConfig[] = [
        {
          key: 'course',
          label: 'Curso',
          icon: <span />,
          items: [{ id: 'c-1', name: 'Biologia 101' }],
          selectedId: '',
          onChange: vi.fn(),
          placeholder: '-- Seleccionar curso --',
          emptyMessage: 'No hay cursos',
          selectedDisplayName: 'Biologia 101',
        },
      ];

      render(<CascadeSelector levels={levels} />);

      // Select should be visible initially
      expect(screen.getByRole('combobox')).toBeTruthy();

      // Click header to collapse
      fireEvent.click(screen.getByText('Curso'));

      // Select should be hidden after collapse
      expect(screen.queryByRole('combobox')).toBeNull();
    });

    it('shows empty message when no items are available', () => {
      const levels: CascadeLevelConfig[] = [
        {
          key: 'section',
          label: 'Seccion',
          icon: <span />,
          items: [],
          selectedId: '',
          onChange: vi.fn(),
          placeholder: '-- Seleccionar seccion --',
          emptyMessage: 'No hay secciones disponibles',
        },
      ];

      render(<CascadeSelector levels={levels} />);
      expect(screen.getByText('No hay secciones disponibles')).toBeTruthy();
    });

    it('shows loading spinner when a level is loading', () => {
      const levels: CascadeLevelConfig[] = [
        {
          key: 'topic',
          label: 'Tema',
          icon: <span />,
          items: [],
          selectedId: '',
          onChange: vi.fn(),
          placeholder: '-- Seleccionar tema --',
          emptyMessage: 'No hay temas',
          loading: true,
          loadingMessage: 'Cargando temas...',
        },
      ];

      render(<CascadeSelector levels={levels} />);
      expect(screen.getByText('Cargando temas...')).toBeTruthy();
    });

    it('hides levels with visible=false', () => {
      const levels: CascadeLevelConfig[] = [
        {
          key: 'hidden',
          label: 'Hidden Level',
          icon: <span />,
          items: [{ id: 'h-1', name: 'Item' }],
          selectedId: '',
          onChange: vi.fn(),
          placeholder: '-- Select --',
          emptyMessage: 'Empty',
          visible: false,
        },
        {
          key: 'visible',
          label: 'Visible Level',
          icon: <span />,
          items: [{ id: 'v-1', name: 'Visible Item' }],
          selectedId: '',
          onChange: vi.fn(),
          placeholder: '-- Select --',
          emptyMessage: 'Empty',
        },
      ];

      render(<CascadeSelector levels={levels} />);

      expect(screen.queryByText('Hidden Level')).toBeNull();
      expect(screen.getByText('Visible Level')).toBeTruthy();
    });
  });

  // ──────────────────────────────────────────────────────────
  // 9. AiGeneratePanel: trigger and result display
  // ──────────────────────────────────────────────────────────
  describe('AiGeneratePanel', () => {
    // We need to mock the useAiGenerate hook since the component delegates to it
    const mockHandleGenerate = vi.fn();
    const mockSetMode = vi.fn();
    const mockSetSelectedKeywordId = vi.fn();
    const mockSetCount = vi.fn();

    beforeEach(() => {
      vi.doMock('@/app/components/professor/useAiGenerate', () => ({
        useAiGenerate: () => ({
          mode: 'manual' as const,
          setMode: mockSetMode,
          selectedKeywordId: 'kw-1',
          setSelectedKeywordId: mockSetSelectedKeywordId,
          count: 3,
          setCount: mockSetCount,
          genState: { status: 'idle', message: '' },
          isProcessing: false,
          handleGenerate: mockHandleGenerate,
        }),
      }));
    });

    it('renders AI generation panel with mode selector and generate button', async () => {
      // Re-import after doMock
      const { AiGeneratePanel } = await import('@/app/components/professor/AiGeneratePanel');

      const kwRefs = [
        { id: 'kw-1', term: 'Mitocondria', name: 'Mitocondria' },
        { id: 'kw-2', term: 'Ribosoma', name: 'Ribosoma' },
      ];

      render(
        <AiGeneratePanel
          quizId="quiz-1"
          summaryId="sum-1"
          keywords={kwRefs}
          onClose={vi.fn()}
          onGenerated={vi.fn()}
        />
      );

      expect(screen.getByText('Generar con IA')).toBeTruthy();
      expect(screen.getByText('1 pregunta por keyword')).toBeTruthy();
      expect(screen.getByText(/Llenar quiz/)).toBeTruthy();
      expect(screen.getByText('Generar 1 pregunta')).toBeTruthy();
    });

    it('shows "no keywords" message when keywords array is empty', async () => {
      vi.doMock('@/app/components/professor/useAiGenerate', () => ({
        useAiGenerate: () => ({
          mode: 'manual' as const,
          setMode: vi.fn(),
          selectedKeywordId: '',
          setSelectedKeywordId: vi.fn(),
          count: 3,
          setCount: vi.fn(),
          genState: { status: 'idle', message: '' },
          isProcessing: false,
          handleGenerate: vi.fn(),
        }),
      }));

      const { AiGeneratePanel } = await import('@/app/components/professor/AiGeneratePanel');

      render(
        <AiGeneratePanel
          quizId="quiz-1"
          summaryId="sum-1"
          keywords={[]}
          onClose={vi.fn()}
          onGenerated={vi.fn()}
        />
      );

      expect(screen.getByText(/no tiene keywords/)).toBeTruthy();
    });
  });

  // ──────────────────────────────────────────────────────────
  // FlashcardFormModal: toast on API error
  // ──────────────────────────────────────────────────────────
  describe('FlashcardFormModal — error handling', () => {
    it('shows error message and calls toast.error when API fails', async () => {
      mockedCreateFlashcard.mockRejectedValueOnce(new Error('Network error'));

      const props = {
        isOpen: true,
        editingCard: null,
        keywords: KEYWORDS,
        subtopicsMap: SUBTOPICS_MAP,
        summaryId: 'sum-1',
        onClose: vi.fn(),
        onSaved: vi.fn(),
        loadSubtopicsForKeyword: vi.fn().mockResolvedValue(undefined),
        userId: 'user-1',
      };

      render(<FlashcardFormModal {...props} />);

      const textareas = screen.getAllByRole('textbox');
      fireEvent.change(textareas[0], { target: { value: 'Front content' } });
      fireEvent.change(textareas[1], { target: { value: 'Back content' } });

      fireEvent.click(screen.getByText('Crear flashcard'));

      await waitFor(() => {
        expect(mockedToast.error).toHaveBeenCalledWith('Network error');
      });

      // Error should be displayed in the form
      expect(screen.getByText('Network error')).toBeTruthy();

      // onSaved and onClose should NOT be called
      expect(props.onSaved).not.toHaveBeenCalled();
      expect(props.onClose).not.toHaveBeenCalled();
    });
  });
});
