import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TipTapToolbar } from '../TipTapToolbar';
import type { Editor } from '@tiptap/react';

// Mock lucide-react icons to avoid jsdom issues
vi.mock('lucide-react', () => ({
  Bold: () => <div data-testid="icon-bold" />,
  Italic: () => <div data-testid="icon-italic" />,
  Underline: () => <div data-testid="icon-underline" />,
  Strikethrough: () => <div data-testid="icon-strikethrough" />,
  Heading1: () => <div data-testid="icon-h1" />,
  Heading2: () => <div data-testid="icon-h2" />,
  Heading3: () => <div data-testid="icon-h3" />,
  List: () => <div data-testid="icon-list" />,
  ListOrdered: () => <div data-testid="icon-list-ordered" />,
  AlignLeft: () => <div data-testid="icon-align-left" />,
  AlignCenter: () => <div data-testid="icon-align-center" />,
  AlignRight: () => <div data-testid="icon-align-right" />,
  ImagePlus: () => <div data-testid="icon-image-plus" />,
  Undo2: () => <div data-testid="icon-undo" />,
  Redo2: () => <div data-testid="icon-redo" />,
  Save: () => <div data-testid="icon-save" />,
  Loader2: () => <div data-testid="icon-loader" />,
  Check: () => <div data-testid="icon-check" />,
  ArrowLeft: () => <div data-testid="icon-arrow-left" />,
  Video: () => <div data-testid="icon-video" />,
  Tag: () => <div data-testid="icon-tag" />,
  Settings: () => <div data-testid="icon-settings" />,
}));

// Mock clsx to simplify testing
vi.mock('clsx', () => ({
  default: (...args: any[]) => args.filter(Boolean).join(' '),
}));

function createMockEditor(overrides: Partial<Editor> = {}): Editor {
  return {
    chain: vi.fn().mockReturnValue({
      focus: vi.fn().mockReturnValue({
        toggleBold: vi.fn().mockReturnValue({ run: vi.fn() }),
        toggleItalic: vi.fn().mockReturnValue({ run: vi.fn() }),
        toggleUnderline: vi.fn().mockReturnValue({ run: vi.fn() }),
        toggleStrike: vi.fn().mockReturnValue({ run: vi.fn() }),
        toggleHeading: vi.fn().mockReturnValue({ run: vi.fn() }),
        toggleBulletList: vi.fn().mockReturnValue({ run: vi.fn() }),
        toggleOrderedList: vi.fn().mockReturnValue({ run: vi.fn() }),
        setTextAlign: vi.fn().mockReturnValue({ run: vi.fn() }),
        undo: vi.fn().mockReturnValue({ run: vi.fn() }),
        redo: vi.fn().mockReturnValue({ run: vi.fn() }),
      }),
    }),
    isActive: vi.fn().mockReturnValue(false),
    can: vi.fn().mockReturnValue({
      undo: vi.fn().mockReturnValue(true),
      redo: vi.fn().mockReturnValue(true),
    }),
    state: {
      selection: {
        empty: true,
      },
      doc: {
        textBetween: vi.fn().mockReturnValue(''),
      },
    },
    ...overrides,
  } as any;
}

describe('TipTapToolbar', () => {
  let mockEditor: Editor;

  beforeEach(() => {
    mockEditor = createMockEditor();
  });

  it('renders null when editor is null', () => {
    const { container } = render(
      <TipTapToolbar
        editor={null}
        onImageClick={vi.fn()}
        onSave={vi.fn()}
        saveStatus="idle"
        hasUnsaved={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders all formatting buttons when editor is provided', () => {
    render(
      <TipTapToolbar
        editor={mockEditor}
        onImageClick={vi.fn()}
        onSave={vi.fn()}
        saveStatus="idle"
        hasUnsaved={false}
      />
    );

    expect(screen.getByTestId('icon-bold')).toBeInTheDocument();
    expect(screen.getByTestId('icon-italic')).toBeInTheDocument();
    expect(screen.getByTestId('icon-underline')).toBeInTheDocument();
    expect(screen.getByTestId('icon-strikethrough')).toBeInTheDocument();
    expect(screen.getByTestId('icon-h1')).toBeInTheDocument();
    expect(screen.getByTestId('icon-h2')).toBeInTheDocument();
    expect(screen.getByTestId('icon-h3')).toBeInTheDocument();
    expect(screen.getByTestId('icon-list')).toBeInTheDocument();
    expect(screen.getByTestId('icon-list-ordered')).toBeInTheDocument();
  });

  it('calls onImageClick when image button is clicked', () => {
    const onImageClick = vi.fn();
    render(
      <TipTapToolbar
        editor={mockEditor}
        onImageClick={onImageClick}
        onSave={vi.fn()}
        saveStatus="idle"
        hasUnsaved={false}
      />
    );

    const imageButtons = screen.getAllByTestId('icon-image-plus');
    fireEvent.click(imageButtons[0].closest('button')!);
    expect(onImageClick).toHaveBeenCalled();
  });

  it('calls onSave when save button is clicked', () => {
    const onSave = vi.fn();
    render(
      <TipTapToolbar
        editor={mockEditor}
        onImageClick={vi.fn()}
        onSave={onSave}
        saveStatus="idle"
        hasUnsaved={false}
      />
    );

    const saveButton = screen.getByRole('button', { name: /guardar/i });
    fireEvent.click(saveButton);
    expect(onSave).toHaveBeenCalled();
  });

  it('shows save button in idle state', () => {
    render(
      <TipTapToolbar
        editor={mockEditor}
        onImageClick={vi.fn()}
        onSave={vi.fn()}
        saveStatus="idle"
        hasUnsaved={true}
      />
    );

    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
  });

  it('shows saving state with loader', () => {
    render(
      <TipTapToolbar
        editor={mockEditor}
        onImageClick={vi.fn()}
        onSave={vi.fn()}
        saveStatus="saving"
        hasUnsaved={false}
      />
    );

    expect(screen.getByText(/guardando/i)).toBeInTheDocument();
    expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
  });

  it('shows saved state with check icon', () => {
    render(
      <TipTapToolbar
        editor={mockEditor}
        onImageClick={vi.fn()}
        onSave={vi.fn()}
        saveStatus="saved"
        hasUnsaved={false}
      />
    );

    expect(screen.getByText(/guardado/i)).toBeInTheDocument();
    expect(screen.getByTestId('icon-check')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(
      <TipTapToolbar
        editor={mockEditor}
        onImageClick={vi.fn()}
        onSave={vi.fn()}
        saveStatus="error"
        hasUnsaved={false}
      />
    );

    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });

  it('disables save button when saving', () => {
    render(
      <TipTapToolbar
        editor={mockEditor}
        onImageClick={vi.fn()}
        onSave={vi.fn()}
        saveStatus="saving"
        hasUnsaved={false}
      />
    );

    const saveButton = screen.getByText(/guardando/i).closest('button')!;
    expect(saveButton).toBeDisabled();
  });

  it('shows unsaved indicator when hasUnsaved is true and status is idle', () => {
    render(
      <TipTapToolbar
        editor={mockEditor}
        onImageClick={vi.fn()}
        onSave={vi.fn()}
        saveStatus="idle"
        hasUnsaved={true}
      />
    );

    expect(screen.getByText(/sin guardar/i)).toBeInTheDocument();
  });

  it('renders back button when onBack is provided', () => {
    const onBack = vi.fn();
    render(
      <TipTapToolbar
        editor={mockEditor}
        onImageClick={vi.fn()}
        onSave={vi.fn()}
        saveStatus="idle"
        hasUnsaved={false}
        onBack={onBack}
      />
    );

    const backButton = screen.getByTestId('icon-arrow-left').closest('button')!;
    fireEvent.click(backButton);
    expect(onBack).toHaveBeenCalled();
  });

  it('displays summary title when provided', () => {
    render(
      <TipTapToolbar
        editor={mockEditor}
        onImageClick={vi.fn()}
        onSave={vi.fn()}
        saveStatus="idle"
        hasUnsaved={false}
        summaryTitle="Mi Resumen"
      />
    );

    expect(screen.getByText('Mi Resumen')).toBeInTheDocument();
  });

  it('displays status badge when summaryStatus is provided', () => {
    render(
      <TipTapToolbar
        editor={mockEditor}
        onImageClick={vi.fn()}
        onSave={vi.fn()}
        saveStatus="idle"
        hasUnsaved={false}
        summaryStatus="draft"
        onStatusChange={vi.fn()}
      />
    );

    expect(screen.getByText(/borrador/i)).toBeInTheDocument();
  });

  it('calls onStatusChange when status badge is clicked', () => {
    const onStatusChange = vi.fn();
    render(
      <TipTapToolbar
        editor={mockEditor}
        onImageClick={vi.fn()}
        onSave={vi.fn()}
        saveStatus="idle"
        hasUnsaved={false}
        summaryStatus="draft"
        onStatusChange={onStatusChange}
      />
    );

    const statusBadge = screen.getByText(/borrador/i);
    fireEvent.click(statusBadge);
    expect(onStatusChange).toHaveBeenCalledWith('published');
  });

  it('toggles status between draft and published', () => {
    const onStatusChange = vi.fn();
    const { rerender } = render(
      <TipTapToolbar
        editor={mockEditor}
        onImageClick={vi.fn()}
        onSave={vi.fn()}
        saveStatus="idle"
        hasUnsaved={false}
        summaryStatus="published"
        onStatusChange={onStatusChange}
      />
    );

    expect(screen.getByText(/publicado/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/publicado/i));
    expect(onStatusChange).toHaveBeenCalledWith('draft');
  });

  it('shows keywords count badge', () => {
    render(
      <TipTapToolbar
        editor={mockEditor}
        onImageClick={vi.fn()}
        onSave={vi.fn()}
        saveStatus="idle"
        hasUnsaved={false}
        onKeywordsClick={vi.fn()}
        keywordsCount={5}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onKeywordsClick when keywords button is clicked', () => {
    const onKeywordsClick = vi.fn();
    render(
      <TipTapToolbar
        editor={mockEditor}
        onImageClick={vi.fn()}
        onSave={vi.fn()}
        saveStatus="idle"
        hasUnsaved={false}
        onKeywordsClick={onKeywordsClick}
      />
    );

    const keywordButtons = screen.getAllByTestId('icon-tag');
    fireEvent.click(keywordButtons[0].closest('button')!);
    expect(onKeywordsClick).toHaveBeenCalled();
  });

  it('shows videos count badge', () => {
    render(
      <TipTapToolbar
        editor={mockEditor}
        onImageClick={vi.fn()}
        onSave={vi.fn()}
        saveStatus="idle"
        hasUnsaved={false}
        onVideosClick={vi.fn()}
        videosCount={3}
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls onVideosClick when videos button is clicked', () => {
    const onVideosClick = vi.fn();
    render(
      <TipTapToolbar
        editor={mockEditor}
        onImageClick={vi.fn()}
        onSave={vi.fn()}
        saveStatus="idle"
        hasUnsaved={false}
        onVideosClick={onVideosClick}
      />
    );

    const videoButtons = screen.getAllByTestId('icon-video');
    fireEvent.click(videoButtons[0].closest('button')!);
    expect(onVideosClick).toHaveBeenCalled();
  });

  it('disables undo button when editor cannot undo', () => {
    const editor = createMockEditor({
      can: vi.fn().mockReturnValue({
        undo: vi.fn().mockReturnValue(false),
        redo: vi.fn().mockReturnValue(true),
      }),
    });

    render(
      <TipTapToolbar
        editor={editor}
        onImageClick={vi.fn()}
        onSave={vi.fn()}
        saveStatus="idle"
        hasUnsaved={false}
      />
    );

    const undoButtons = screen.getAllByTestId('icon-undo');
    const undoButton = undoButtons[0].closest('button')!;
    expect(undoButton).toBeDisabled();
  });

  it('disables redo button when editor cannot redo', () => {
    const editor = createMockEditor({
      can: vi.fn().mockReturnValue({
        undo: vi.fn().mockReturnValue(true),
        redo: vi.fn().mockReturnValue(false),
      }),
    });

    render(
      <TipTapToolbar
        editor={editor}
        onImageClick={vi.fn()}
        onSave={vi.fn()}
        saveStatus="idle"
        hasUnsaved={false}
      />
    );

    const redoButtons = screen.getAllByTestId('icon-redo');
    const redoButton = redoButtons[0].closest('button')!;
    expect(redoButton).toBeDisabled();
  });

  it('toggles bold formatting when bold button clicked', () => {
    const mockChain = {
      focus: vi.fn().mockReturnValue({
        toggleBold: vi.fn().mockReturnValue({ run: vi.fn() }),
        toggleItalic: vi.fn().mockReturnValue({ run: vi.fn() }),
        toggleUnderline: vi.fn().mockReturnValue({ run: vi.fn() }),
        toggleStrike: vi.fn().mockReturnValue({ run: vi.fn() }),
        toggleHeading: vi.fn().mockReturnValue({ run: vi.fn() }),
        toggleBulletList: vi.fn().mockReturnValue({ run: vi.fn() }),
        toggleOrderedList: vi.fn().mockReturnValue({ run: vi.fn() }),
        setTextAlign: vi.fn().mockReturnValue({ run: vi.fn() }),
        undo: vi.fn().mockReturnValue({ run: vi.fn() }),
        redo: vi.fn().mockReturnValue({ run: vi.fn() }),
      }),
    };

    const editor = createMockEditor({
      chain: vi.fn().mockReturnValue(mockChain),
    });

    render(
      <TipTapToolbar
        editor={editor}
        onImageClick={vi.fn()}
        onSave={vi.fn()}
        saveStatus="idle"
        hasUnsaved={false}
      />
    );

    const boldButtons = screen.getAllByTestId('icon-bold');
    fireEvent.click(boldButtons[0].closest('button')!);

    expect(mockChain.focus).toHaveBeenCalled();
  });
});
