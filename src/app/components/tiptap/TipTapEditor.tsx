// ============================================================
// Axon — TipTapEditor (Professor WYSIWYG Editor)
//
// Full-page rich-text editor for Summary content.
// Layout: sticky toolbar → full-height editor that mirrors student view
//
// Features:
//   - Full-page editing (fills container, looks like what student sees)
//   - Sticky formatting toolbar with summary metadata
//   - Image upload to Supabase Storage with position (float)
//   - Drag images within the editor to reorder (draggable nodes)
//   - Drag-and-drop / paste images from desktop
//   - Auto-save every 30s + Ctrl+S + manual save button
//   - Image selection popover for reposition/delete
//
// Auth is obtained from useAuth() context + ANON_KEY from lib/api.
// ============================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Dropcursor from '@tiptap/extension-dropcursor';
import { toast } from 'sonner';
import {
  AlignLeft, AlignCenter, AlignRight, Trash2, Loader2,
  GripVertical, Tag, Check,
} from 'lucide-react';
import clsx from 'clsx';

import { ImageWithPosition, type ImagePosition } from './extensions/ImageWithPosition';
import { KeywordHighlightPlugin, refreshKeywordDecorations, setKeywordList } from './extensions/KeywordHighlightPlugin';
import { TipTapToolbar } from './TipTapToolbar';
import { ImageUploadDialog } from './ImageUploadDialog';
import { apiCall } from '@/app/lib/api';
import { supabase } from '@/app/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';

// ── Types ─────────────────────────────────────────────────
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface TipTapEditorProps {
  summaryId: string;
  contentMarkdown?: string | null;
  onContentUpdated?: () => void;
  // Full-page mode props (summary info in toolbar)
  summaryTitle?: string;
  summaryStatus?: 'draft' | 'published' | 'rejected';
  onBack?: () => void;
  onStatusChange?: (status: 'draft' | 'published') => void;
  onKeywordsClick?: () => void;
  onVideosClick?: () => void;
  keywordsCount?: number;
  videosCount?: number;
  /** Called when user wants to create a keyword from selected text */
  onCreateKeywordFromSelection?: (text: string, rect: DOMRect) => void;
  /** List of keyword names to highlight in editor */
  keywordNames?: string[];
  /** Called when professor clicks on a highlighted keyword */
  onKeywordClick?: (keywordName: string, anchorEl: HTMLElement) => void;
}

// ── Editor CSS ────────────────────────────────────────────
const editorStyles = `
  /* ── Full-page editor container ─────────────────── */
  .axon-editor-fullpage {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .axon-editor-scroll {
    flex: 1;
    overflow-y: auto;
    background: #fafafa;
  }

  .axon-editor-content {
    max-width: 780px;
    margin: 0 auto;
    padding: 2rem 2.5rem 4rem;
    min-height: 100%;
  }

  /* ── TipTap content area ─────────────────────────── */
  .axon-editor-content .tiptap {
    outline: none;
    min-height: calc(100vh - 200px);
    color: #1f2937;
    line-height: 1.8;
  }
  .axon-editor-content .tiptap p {
    margin-bottom: 0.75rem;
  }
  .axon-editor-content .tiptap h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 0.75rem;
    margin-top: 1.25rem;
    color: #111827;
  }
  .axon-editor-content .tiptap h2 {
    font-size: 1.375rem;
    font-weight: 600;
    margin-bottom: 0.625rem;
    margin-top: 1rem;
    color: #1f2937;
  }
  .axon-editor-content .tiptap h3 {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    margin-top: 0.875rem;
    color: #374151;
  }
  .axon-editor-content .tiptap ul {
    list-style-type: disc;
    padding-left: 1.5rem;
    margin-bottom: 0.75rem;
  }
  .axon-editor-content .tiptap ol {
    list-style-type: decimal;
    padding-left: 1.5rem;
    margin-bottom: 0.75rem;
  }
  .axon-editor-content .tiptap li {
    margin-bottom: 0.25rem;
  }
  .axon-editor-content .tiptap blockquote {
    border-left: 3px solid #e5e7eb;
    padding-left: 1rem;
    color: #6b7280;
    margin-bottom: 0.75rem;
  }
  .axon-editor-content .tiptap hr {
    border-color: #e5e7eb;
    margin: 1.5rem 0;
  }
  .axon-editor-content .tiptap code {
    background: #f3f4f6;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
  }
  .axon-editor-content .tiptap pre {
    background: #1f2937;
    color: #e5e7eb;
    border-radius: 0.5rem;
    padding: 1rem;
    margin-bottom: 0.75rem;
    overflow-x: auto;
  }
  .axon-editor-content .tiptap pre code {
    background: none;
    padding: 0;
    color: inherit;
  }

  /* ── Image styles ────────────────────────────────── */
  .axon-editor-content .tiptap img {
    border-radius: 0.5rem;
    cursor: grab;
    transition: box-shadow 0.15s ease, opacity 0.15s ease;
  }
  .axon-editor-content .tiptap img:hover {
    box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.25);
  }
  .axon-editor-content .tiptap img:active {
    cursor: grabbing;
    opacity: 0.7;
  }
  .axon-editor-content .tiptap img.ProseMirror-selectednode {
    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.6);
  }

  /* ── Drag handle indicator ── */
  .axon-editor-content .tiptap [data-drag-handle] {
    cursor: grab;
  }

  /* ── Placeholder ─────────────────────────────────── */
  .axon-editor-content .tiptap p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    color: #9ca3af;
    pointer-events: none;
    height: 0;
    font-style: italic;
  }

  /* ── Clearfix for floated images ─────────────────── */
  .axon-editor-content .tiptap::after {
    content: '';
    display: table;
    clear: both;
  }

  /* ── Dropcursor (teal line when dragging) ────────── */
  .ProseMirror-dropcursor {
    border-color: #14b8a6 !important;
    border-width: 2px !important;
  }

  /* ── Keyword highlight decorations ────────────────── */
  .axon-keyword-highlight {
    background: linear-gradient(to bottom, rgba(20, 184, 166, 0.08), rgba(20, 184, 166, 0.15));
    border-bottom: 2px solid rgba(20, 184, 166, 0.5);
    border-radius: 2px;
    padding: 0 1px;
    transition: background 0.15s ease, border-color 0.15s ease;
    cursor: pointer;
  }
  .axon-keyword-highlight:hover {
    background: rgba(20, 184, 166, 0.22);
    border-bottom-color: rgba(20, 184, 166, 0.8);
  }
`;

// ── Component ─────────────────────────────────────────────
export function TipTapEditor({
  summaryId,
  contentMarkdown,
  onContentUpdated,
  summaryTitle,
  summaryStatus,
  onBack,
  onStatusChange,
  onKeywordsClick,
  onVideosClick,
  keywordsCount,
  videosCount,
  onCreateKeywordFromSelection,
  keywordNames,
  onKeywordClick,
}: TipTapEditorProps) {
  const { user, accessToken } = useAuth();
  const userId = user?.id || '';
  const token = accessToken || '';

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedImageNode, setSelectedImageNode] = useState<{
    pos: number;
    attrs: Record<string, any>;
  } | null>(null);

  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dirtyRef = useRef(false);
  const initialLoadRef = useRef(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ── TipTap Editor Instance ──────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        dropcursor: false,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      ImageWithPosition.configure({
        inline: false,
        allowBase64: false,
      }),
      Placeholder.configure({
        placeholder: 'Empieza a escribir tu resumen aqui...',
      }),
      Dropcursor.configure({
        color: '#14b8a6',
        width: 2,
      }),
      KeywordHighlightPlugin,
    ],
    editorProps: {
      attributes: {
        class: 'tiptap',
      },
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            handleDropImage(file, view, event);
            return true;
          }
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
              const file = items[i].getAsFile();
              if (file) {
                event.preventDefault();
                uploadAndInsertImage(file);
                return true;
              }
            }
          }
        }
        return false;
      },
    },
    onUpdate: () => {
      if (!initialLoadRef.current) {
        dirtyRef.current = true;
        setHasUnsaved(true);
        setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
      }
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { state } = ed;
      const { from } = state.selection;
      const node = state.doc.nodeAt(from);
      if (node?.type.name === 'image') {
        setSelectedImageNode({ pos: from, attrs: { ...node.attrs } });
      } else {
        setSelectedImageNode(null);
      }
    },
  });

  // ── Load initial content ────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (contentMarkdown) {
          if (mounted && editor) {
            editor.commands.setContent(contentMarkdown || '');
            setTimeout(() => { initialLoadRef.current = false; }, 100);
          }
        } else {
          const summary = await apiCall<any>(`/summaries/${summaryId}`);
          if (mounted && editor) {
            editor.commands.setContent(summary.content_markdown || '');
            setTimeout(() => { initialLoadRef.current = false; }, 100);
          }
        }
      } catch (err: any) {
        console.error('[TipTapEditor] Load error:', err);
        if (mounted) {
          toast.error('Error al cargar contenido del resumen');
          initialLoadRef.current = false;
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryId, editor, contentMarkdown]);

  // ── Sync keyword highlights ─────────────────────────────
  useEffect(() => {
    if (!editor || !keywordNames) return;
    // Update module-level store FIRST, then trigger decoration rebuild
    setKeywordList(keywordNames);
    refreshKeywordDecorations(editor);
  }, [editor, keywordNames]);

  // ── Click on highlighted keyword → invoke onKeywordClick ─
  useEffect(() => {
    if (!onKeywordClick) return;
    const contentEl = document.querySelector('.axon-editor-content');
    if (!contentEl) return;

    const handler = (e: Event) => {
      const target = (e as MouseEvent).target as HTMLElement;
      const kwEl = target.closest('.axon-keyword-highlight') as HTMLElement | null;
      if (!kwEl) return;

      // Only trigger if it's a simple click (no text selection)
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;

      const kwName = kwEl.getAttribute('data-keyword');
      if (!kwName) return;

      onKeywordClick(kwName, kwEl);
    };

    contentEl.addEventListener('click', handler);
    return () => contentEl.removeEventListener('click', handler);
  }, [onKeywordClick]);

  // ── Save function ───────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!editor) return;
    setSaveStatus('saving');
    try {
      const html = editor.getHTML();
      await apiCall(`/summaries/${summaryId}`, {
        method: 'PUT',
        body: JSON.stringify({ content_markdown: html }),
      });
      dirtyRef.current = false;
      setHasUnsaved(false);
      setSaveStatus('saved');
      onContentUpdated?.();
      setTimeout(() => {
        setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
      }, 3000);
    } catch (err: any) {
      console.error('[TipTapEditor] Save error:', err);
      setSaveStatus('error');
      toast.error(err.message || 'Error al guardar');
    }
  }, [editor, summaryId, onContentUpdated]);

  // ── Auto-save every 30s if dirty ────────────────────────
  useEffect(() => {
    autoSaveTimerRef.current = setInterval(() => {
      if (dirtyRef.current && editor) {
        handleSave();
      }
    }, 30000);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [handleSave, editor]);

  // ── Ctrl+S shortcut ─────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  // ── Upload helper (for drag-and-drop / paste) ───────────
  const uploadToStorage = useCallback(
    async (file: File): Promise<string> => {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipo de archivo no permitido. Solo: JPG, PNG, WebP, GIF');
      }
      // Validate size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('La imagen excede el tamano maximo de 10MB');
      }

      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `summaries/${userId}/${Date.now()}_${sanitizedName}`;

      // Upload via Supabase JS client (handles auth headers automatically)
      const { data, error } = await supabase.storage
        .from('axon-images')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.error('[Storage] Upload error:', error);
        throw new Error(`Error al subir imagen: ${error.message}`);
      }

      // Get public URL (bucket is PUBLIC for reads)
      const { data: urlData } = supabase.storage
        .from('axon-images')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    },
    [userId]
  );

  const uploadAndInsertImage = useCallback(
    async (file: File) => {
      if (!editor) return;
      try {
        toast.info('Subiendo imagen...');
        const url = await uploadToStorage(file);
        editor
          .chain()
          .focus()
          .setImage({ src: url, alt: file.name } as any)
          .run();
        const { state } = editor;
        const { from } = state.selection;
        const node = state.doc.nodeAt(from - 1);
        if (node?.type.name === 'image') {
          editor.chain().setNodeSelection(from - 1).run();
          editor.commands.updateAttributes('image', { position: 'center' });
        }
        toast.success('Imagen insertada');
      } catch (err: any) {
        toast.error(err.message || 'Error al subir imagen');
      }
    },
    [editor, uploadToStorage]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDropImage = useCallback(
    async (file: File, _view: any, _event: DragEvent) => {
      try {
        toast.info('Subiendo imagen...');
        const url = await uploadToStorage(file);
        if (editor) {
          editor
            .chain()
            .focus()
            .setImage({ src: url, alt: file.name } as any)
            .run();
          toast.success('Imagen insertada');
        }
      } catch (err: any) {
        toast.error(err.message || 'Error al subir imagen');
      }
    },
    [editor, uploadToStorage]
  );

  // ── Image controls ──────────────────────────────────────
  const handleImagePosition = (pos: ImagePosition) => {
    if (!editor || !selectedImageNode) return;
    editor.commands.updateAttributes('image', { position: pos });
    setSelectedImageNode((prev) =>
      prev ? { ...prev, attrs: { ...prev.attrs, position: pos } } : null
    );
  };

  const handleImageDelete = () => {
    if (!editor || !selectedImageNode) return;
    editor.chain().focus().deleteSelection().run();
    setSelectedImageNode(null);
  };

  // ── Insert from dialog ──────────────────────────────────
  const handleDialogInsert = (url: string, position: ImagePosition) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .setImage({ src: url, alt: 'Imagen del resumen', position } as any)
      .run();
  };

  // ── Loading state ───────────────────────────────────────
  if (loading) {
    return (
      <div className="axon-editor-fullpage">
        <style>{editorStyles}</style>
        {/* Toolbar skeleton */}
        <div className="px-3 py-2 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <div className="h-7 w-8 bg-gray-200 rounded animate-pulse" />
            <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
            <div className="flex-1" />
            <div className="h-7 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        {/* Content skeleton */}
        <div className="flex-1 bg-[#faf9f6]/80 overflow-y-auto">
          <div className="max-w-[780px] mx-auto p-10 space-y-4">
            <div className="h-8 w-2/3 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
            <div className="h-40 w-64 bg-gray-100 rounded animate-pulse mx-auto mt-6" />
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Inject editor styles */}
      <style>{editorStyles}</style>

      <div className="axon-editor-fullpage">
        {/* ── Sticky Toolbar ───────────────────────────── */}
        <div className="sticky top-0 z-10">
          <TipTapToolbar
            editor={editor}
            onImageClick={() => setShowImageDialog(true)}
            onSave={handleSave}
            saveStatus={saveStatus}
            hasUnsaved={hasUnsaved}
            summaryTitle={summaryTitle}
            summaryStatus={summaryStatus}
            onBack={onBack}
            onStatusChange={onStatusChange}
            onKeywordsClick={onKeywordsClick}
            onVideosClick={onVideosClick}
            keywordsCount={keywordsCount}
            videosCount={videosCount}
            onCreateKeywordFromSelection={onCreateKeywordFromSelection}
          />
        </div>

        {/* ── Full-page scrollable editor ──────────────── */}
        <div className="axon-editor-scroll" ref={scrollContainerRef}>
          <div className="axon-editor-content relative">
            <EditorContent editor={editor} />

            {/* Floating "Keyword" bubble on text selection */}
            {onCreateKeywordFromSelection && editor && (
              <SelectionKeywordBubble
                editor={editor}
                scrollContainer={scrollContainerRef.current}
                onCreateKeyword={onCreateKeywordFromSelection}
                existingKeywordNames={keywordNames}
              />
            )}

            {/* Image Selection Popover */}
            {selectedImageNode && editor && (
              <ImagePopover
                position={selectedImageNode.attrs.position || 'center'}
                onChangePosition={handleImagePosition}
                onDelete={handleImageDelete}
              />
            )}
          </div>
        </div>
      </div>

      {/* Image Upload Dialog */}
      <ImageUploadDialog
        open={showImageDialog}
        onClose={() => setShowImageDialog(false)}
        onInsert={handleDialogInsert}
        userId={userId}
      />
    </>
  );
}

// ── Selection Keyword Bubble (floating on text selection) ──
function SelectionKeywordBubble({
  editor,
  scrollContainer,
  onCreateKeyword,
  existingKeywordNames,
}: {
  editor: Editor;
  scrollContainer: HTMLDivElement | null;
  onCreateKeyword: (text: string, rect: DOMRect) => void;
  existingKeywordNames?: string[];
}) {
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');

  const updateBubble = useCallback(() => {
    const { from, to } = editor.state.selection;
    if (from === to) {
      setBubblePos(null);
      setSelectedText('');
      return;
    }
    const text = editor.state.doc.textBetween(from, to, ' ').trim();
    if (!text || text.length < 2 || text.length > 100) {
      setBubblePos(null);
      setSelectedText('');
      return;
    }

    // Check if text is already a keyword
    if (existingKeywordNames && existingKeywordNames.some(
      kn => kn.toLowerCase() === text.toLowerCase()
    )) {
      // Show a disabled "already exists" indicator instead of hiding
      const domSel = window.getSelection();
      if (!domSel || domSel.isCollapsed) {
        setBubblePos(null);
        return;
      }
      const contentEl = document.querySelector('.axon-editor-content');
      if (!contentEl) return;
      const range = domSel.getRangeAt(0);
      const rangeRect = range.getBoundingClientRect();
      const contentRect = contentEl.getBoundingClientRect();
      setSelectedText(text);
      setBubblePos({
        top: rangeRect.top - contentRect.top - 36,
        left: rangeRect.left - contentRect.left + rangeRect.width / 2,
      });
      return;
    }

    // Get DOM rect of selection
    const domSel = window.getSelection();
    if (!domSel || domSel.isCollapsed) {
      setBubblePos(null);
      return;
    }

    const contentEl = document.querySelector('.axon-editor-content');
    if (!contentEl) return;

    const range = domSel.getRangeAt(0);
    const rangeRect = range.getBoundingClientRect();
    const contentRect = contentEl.getBoundingClientRect();

    setSelectedText(text);
    setBubblePos({
      top: rangeRect.top - contentRect.top - 36,
      left: rangeRect.left - contentRect.left + rangeRect.width / 2,
    });
  }, [editor, existingKeywordNames]);

  // Listen to editor selection changes
  useEffect(() => {
    const handleBlur = () => {
      // Delay to allow button click before hiding
      setTimeout(() => {
        if (!editor.isFocused) {
          setBubblePos(null);
          setSelectedText('');
        }
      }, 200);
    };

    editor.on('selectionUpdate', updateBubble);
    editor.on('blur', handleBlur);
    return () => {
      editor.off('selectionUpdate', updateBubble);
      editor.off('blur', handleBlur);
    };
  }, [editor, updateBubble]);

  // Hide on scroll
  useEffect(() => {
    if (!scrollContainer || !bubblePos) return;
    const handler = () => updateBubble();
    scrollContainer.addEventListener('scroll', handler, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handler);
  }, [scrollContainer, bubblePos, updateBubble]);

  if (!bubblePos || !selectedText) return null;

  const isExisting = !!(existingKeywordNames && existingKeywordNames.some(
    kn => kn.toLowerCase() === selectedText.toLowerCase()
  ));

  return (
    <div
      className="absolute z-30 -translate-x-1/2"
      style={{ top: Math.max(4, bubblePos.top), left: bubblePos.left }}
    >
      {isExisting ? (
        <div
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 text-[11px] whitespace-nowrap cursor-default"
          style={{ fontWeight: 600 }}
          title="Esta palabra ya es keyword"
        >
          <Check size={11} />
          Ya es keyword
        </div>
      ) : (
        <button
          onMouseDown={(e) => {
            e.preventDefault(); // Prevent editor blur
            const domSel = window.getSelection();
            if (domSel && !domSel.isCollapsed) {
              const range = domSel.getRangeAt(0);
              const rect = range.getBoundingClientRect();
              onCreateKeyword(selectedText, rect);
            }
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 text-white shadow-lg shadow-teal-600/25 text-[11px] hover:bg-teal-700 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          style={{ fontWeight: 600 }}
          title="Crear keyword desde seleccion"
        >
          <Tag size={11} />
          Keyword
        </button>
      )}
    </div>
  );
}

// ── Image Popover (position controls) ─────────────────────
function ImagePopover({
  position,
  onChangePosition,
  onDelete,
}: {
  position: ImagePosition;
  onChangePosition: (pos: ImagePosition) => void;
  onDelete: () => void;
}) {
  const imgEl = document.querySelector<HTMLImageElement>(
    '.axon-editor-content .tiptap img.ProseMirror-selectednode'
  );
  if (!imgEl) return null;

  const contentEl = document.querySelector('.axon-editor-content');
  if (!contentEl) return null;

  const imgRect = imgEl.getBoundingClientRect();
  const contentRect = contentEl.getBoundingClientRect();
  const top = imgRect.top - contentRect.top - 48;
  const left = imgRect.left - contentRect.left + imgRect.width / 2;

  return (
    <div
      className="absolute z-20 -translate-x-1/2"
      style={{ top: Math.max(8, top), left }}
    >
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-lg px-2 py-1.5">
        {/* Drag hint */}
        <div className="flex items-center gap-1 pr-1.5 border-r border-gray-200 mr-0.5">
          <GripVertical size={12} className="text-gray-300" />
          <span className="text-[9px] text-gray-400">Arrastra</span>
        </div>

        {/* Position controls */}
        {([
          { value: 'left' as ImagePosition, icon: AlignLeft, title: 'Izquierda' },
          { value: 'center' as ImagePosition, icon: AlignCenter, title: 'Centro' },
          { value: 'right' as ImagePosition, icon: AlignRight, title: 'Derecha' },
        ]).map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChangePosition(opt.value)}
            title={opt.title}
            className={clsx(
              'p-1.5 rounded transition-colors',
              position === opt.value
                ? 'bg-teal-100 text-teal-700'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            )}
          >
            <opt.icon size={14} />
          </button>
        ))}
        <div className="w-px h-5 bg-gray-200 mx-0.5" />
        <button
          onClick={onDelete}
          title="Eliminar imagen"
          className="p-1.5 rounded text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default TipTapEditor;