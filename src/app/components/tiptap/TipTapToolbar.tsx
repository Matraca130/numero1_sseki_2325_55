// ============================================================
// Axon — TipTapToolbar
//
// Compact toolbar: [← Back | Title | Status] + [Format tools] + [Save | Actions]
// Designed for full-page editor experience.
// ============================================================
import React from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight,
  ImagePlus,
  Undo2, Redo2,
  Save, Loader2, Check,
  ArrowLeft,
  Video as VideoIcon,
  Tag,
  Settings,
} from 'lucide-react';
import clsx from 'clsx';

// ── Types ─────────────────────────────────────────────────
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface TipTapToolbarProps {
  editor: Editor | null;
  onImageClick: () => void;
  onSave: () => void;
  saveStatus: SaveStatus;
  hasUnsaved: boolean;
  // Summary metadata (optional - for full-page mode)
  summaryTitle?: string;
  summaryStatus?: 'draft' | 'published' | 'rejected';
  onBack?: () => void;
  onStatusChange?: (status: 'draft' | 'published') => void;
  // Action buttons
  onKeywordsClick?: () => void;
  onVideosClick?: () => void;
  onSettingsClick?: () => void;
  keywordsCount?: number;
  videosCount?: number;
  /** Called when user clicks Tag button with text selected in editor */
  onCreateKeywordFromSelection?: (text: string, rect: DOMRect) => void;
}

// ── ToolbarButton ─────────────────────────────────────────
function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        'p-1.5 rounded-md transition-colors',
        active
          ? 'bg-teal-100 text-teal-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
        disabled && 'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-gray-500'
      )}
    >
      {children}
    </button>
  );
}

// ── Separator ─────────────────────────────────────────────
function Sep() {
  return <div className="w-px h-5 bg-gray-200 mx-1" />;
}

// ── Status badge config ───────────────────────────────────
const statusStyles: Record<string, { label: string; cls: string }> = {
  published: { label: 'Publicado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  draft: { label: 'Borrador', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  rejected: { label: 'Rechazado', cls: 'bg-red-50 text-red-700 border-red-200' },
};

// ── Toolbar component ─────────────────────────────────────
export function TipTapToolbar({
  editor,
  onImageClick,
  onSave,
  saveStatus,
  hasUnsaved,
  summaryTitle,
  summaryStatus,
  onBack,
  onStatusChange,
  onKeywordsClick,
  onVideosClick,
  onSettingsClick,
  keywordsCount,
  videosCount,
  onCreateKeywordFromSelection,
}: TipTapToolbarProps) {
  if (!editor) return null;

  const iconSize = 15;
  const status = summaryStatus ? statusStyles[summaryStatus] || statusStyles.draft : null;

  return (
    <div className="flex items-center gap-0.5 px-3 py-2 border-b border-gray-200 bg-white/95 backdrop-blur-sm flex-wrap">
      {/* ── Back + Title + Status ──────────────────────── */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          title="Volver"
          className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors mr-1"
        >
          <ArrowLeft size={16} />
        </button>
      )}

      {summaryTitle && (
        <span className="text-sm text-gray-700 truncate max-w-[200px] mr-1.5" title={summaryTitle}>
          {summaryTitle}
        </span>
      )}

      {status && onStatusChange && (
        <button
          type="button"
          onClick={() => onStatusChange(summaryStatus === 'published' ? 'draft' : 'published')}
          className={clsx(
            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border cursor-pointer hover:opacity-80 transition-opacity mr-1',
            status.cls
          )}
          title={`Click para cambiar a ${summaryStatus === 'published' ? 'borrador' : 'publicado'}`}
        >
          {status.label}
        </button>
      )}

      {(onBack || summaryTitle) && <Sep />}

      {/* ── Text Formatting ────────────────────────────── */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Negrita (Ctrl+B)"
      >
        <Bold size={iconSize} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Cursiva (Ctrl+I)"
      >
        <Italic size={iconSize} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        title="Subrayado (Ctrl+U)"
      >
        <Underline size={iconSize} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        title="Tachado"
      >
        <Strikethrough size={iconSize} />
      </ToolbarButton>

      <Sep />

      {/* ── Headings ───────────────────────────────────── */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })}
        title="Titulo 1"
      >
        <Heading1 size={iconSize} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="Titulo 2"
      >
        <Heading2 size={iconSize} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="Titulo 3"
      >
        <Heading3 size={iconSize} />
      </ToolbarButton>

      <Sep />

      {/* ── Lists ──────────────────────────────────────── */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="Lista con vinetas"
      >
        <List size={iconSize} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="Lista numerada"
      >
        <ListOrdered size={iconSize} />
      </ToolbarButton>

      <Sep />

      {/* ── Alignment ──────────────────────────────────── */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        active={editor.isActive({ textAlign: 'left' })}
        title="Alinear izquierda"
      >
        <AlignLeft size={iconSize} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        active={editor.isActive({ textAlign: 'center' })}
        title="Alinear centro"
      >
        <AlignCenter size={iconSize} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        active={editor.isActive({ textAlign: 'right' })}
        title="Alinear derecha"
      >
        <AlignRight size={iconSize} />
      </ToolbarButton>

      <Sep />

      {/* ── Image ──────────────────────────────────────── */}
      <ToolbarButton
        onClick={onImageClick}
        title="Insertar imagen"
      >
        <ImagePlus size={iconSize} />
      </ToolbarButton>

      <Sep />

      {/* ── History ────────────────────────────────────── */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Deshacer (Ctrl+Z)"
      >
        <Undo2 size={iconSize} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Rehacer (Ctrl+Shift+Z)"
      >
        <Redo2 size={iconSize} />
      </ToolbarButton>

      {/* ── Spacer ──────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Action buttons (Keywords, Videos, Settings) ── */}
      {onKeywordsClick && (
        <button
          type="button"
          onClick={() => {
            // If text is selected and handler exists, create keyword from selection
            if (onCreateKeywordFromSelection && editor) {
              const { from, to } = editor.state.selection;
              const selectedText = editor.state.doc.textBetween(from, to, ' ').trim();
              if (selectedText && selectedText.length >= 2 && selectedText.length <= 100) {
                // Get the DOM selection rect for positioning
                const domSel = window.getSelection();
                if (domSel && !domSel.isCollapsed) {
                  const range = domSel.getRangeAt(0);
                  const rect = range.getBoundingClientRect();
                  onCreateKeywordFromSelection(selectedText, rect);
                  return;
                }
              }
            }
            // Default: open keywords panel
            onKeywordsClick();
          }}
          title={editor && !editor.state.selection.empty ? 'Crear keyword desde seleccion' : 'Palabras clave'}
          className={clsx(
            'flex items-center gap-1 p-1.5 rounded-md transition-colors',
            editor && !editor.state.selection.empty
              ? 'text-teal-600 bg-teal-50 hover:bg-teal-100 ring-1 ring-teal-200'
              : 'text-gray-500 hover:bg-teal-50 hover:text-teal-600'
          )}
        >
          <Tag size={14} />
          {keywordsCount != null && keywordsCount > 0 && (
            <span className="text-[10px] bg-teal-100 text-teal-600 rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {keywordsCount}
            </span>
          )}
        </button>
      )}

      {onVideosClick && (
        <button
          type="button"
          onClick={onVideosClick}
          title="Videos"
          className="flex items-center gap-1 p-1.5 rounded-md text-gray-500 hover:bg-teal-50 hover:text-teal-600 transition-colors"
        >
          <VideoIcon size={14} />
          {videosCount != null && videosCount > 0 && (
            <span className="text-[10px] bg-teal-100 text-teal-600 rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {videosCount}
            </span>
          )}
        </button>
      )}

      {onKeywordsClick && <Sep />}

      {/* Unsaved indicator */}
      {hasUnsaved && saveStatus === 'idle' && (
        <span className="text-[10px] text-amber-500 mr-2">Sin guardar</span>
      )}

      <button
        type="button"
        onClick={onSave}
        disabled={saveStatus === 'saving'}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors',
          saveStatus === 'saved'
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
            : saveStatus === 'saving'
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : saveStatus === 'error'
                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                : 'bg-teal-600 hover:bg-teal-700 text-white'
        )}
      >
        {saveStatus === 'saving' ? (
          <>
            <Loader2 size={12} className="animate-spin" />
            Guardando...
          </>
        ) : saveStatus === 'saved' ? (
          <>
            <Check size={12} />
            Guardado
          </>
        ) : saveStatus === 'error' ? (
          <>
            <Save size={12} />
            Reintentar
          </>
        ) : (
          <>
            <Save size={12} />
            Guardar
          </>
        )}
      </button>
    </div>
  );
}