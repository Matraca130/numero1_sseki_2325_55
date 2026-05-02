/**
 * TipTapEditor — Main component.
 * Full-page WYSIWYG editor for Summary content.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Dropcursor from '@tiptap/extension-dropcursor';
import { toast } from 'sonner';

import { ImageWithPosition, type ImagePosition } from '../extensions/ImageWithPosition';
import { KeywordHighlightPlugin, refreshKeywordDecorations, setKeywordList } from '../extensions/KeywordHighlightPlugin';
import { TipTapToolbar } from '../TipTapToolbar';
import { ImageUploadDialog } from '../ImageUploadDialog';
import { apiCall } from '@/app/lib/api';
import { useAuth } from '@/app/context/AuthContext';

import { editorStyles } from './editor-styles';
import { uploadToStorage, uploadAndInsertImage as uploadAndInsert, handleDropImage as handleDrop } from './image-handling';
import { SelectionKeywordBubble } from './SelectionKeywordBubble';
import { ImagePopover } from './ImagePopover';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface TipTapEditorProps {
  summaryId: string;
  contentMarkdown?: string | null;
  onContentUpdated?: () => void;
  summaryTitle?: string;
  summaryStatus?: 'draft' | 'published' | 'rejected';
  onBack?: () => void;
  onStatusChange?: (status: 'draft' | 'published') => void;
  onKeywordsClick?: () => void;
  onVideosClick?: () => void;
  keywordsCount?: number;
  videosCount?: number;
  onCreateKeywordFromSelection?: (text: string, rect: DOMRect) => void;
  keywordNames?: string[];
  onKeywordClick?: (keywordName: string, anchorEl: HTMLElement) => void;
}

export function TipTapEditor({
  summaryId, contentMarkdown, onContentUpdated,
  summaryTitle, summaryStatus, onBack, onStatusChange,
  onKeywordsClick, onVideosClick, keywordsCount, videosCount,
  onCreateKeywordFromSelection, keywordNames, onKeywordClick,
}: TipTapEditorProps) {
  const { user } = useAuth();
  const userId = user?.id || '';

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedImageNode, setSelectedImageNode] = useState<{
    pos: number; attrs: Record<string, any>;
  } | null>(null);

  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveStatusTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dirtyRef = useRef(false);
  const initialLoadRef = useRef(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, dropcursor: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      ImageWithPosition.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: 'Empieza a escribir tu resumen aqui...' }),
      Dropcursor.configure({ color: '#8b5cf6', width: 2 }),
      KeywordHighlightPlugin,
    ],
    editorProps: {
      attributes: { class: 'tiptap' },
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            handleDrop(file, editor!, userId);
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
              if (file && editor) {
                event.preventDefault();
                uploadAndInsert(file, editor, userId);
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
      const { from } = ed.state.selection;
      const node = ed.state.doc.nodeAt(from);
      if (node?.type.name === 'image') {
        setSelectedImageNode({ pos: from, attrs: { ...node.attrs } });
      } else {
        setSelectedImageNode(null);
      }
    },
  });

  // Load initial content
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
        if (mounted) { toast.error('Error al cargar contenido del resumen'); initialLoadRef.current = false; }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryId, editor, contentMarkdown]);

  // Sync keyword highlights
  useEffect(() => {
    if (!editor || !keywordNames) return;
    setKeywordList(keywordNames);
    refreshKeywordDecorations(editor);
  }, [editor, keywordNames]);

  // Keyword click handler
  useEffect(() => {
    if (!onKeywordClick) return;
    const contentEl = document.querySelector('.axon-editor-content');
    if (!contentEl) return;
    const handler = (e: Event) => {
      const kwEl = ((e as MouseEvent).target as HTMLElement).closest('.axon-keyword-highlight') as HTMLElement | null;
      if (!kwEl) return;
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;
      const kwName = kwEl.getAttribute('data-keyword');
      if (kwName) onKeywordClick(kwName, kwEl);
    };
    contentEl.addEventListener('click', handler);
    return () => contentEl.removeEventListener('click', handler);
  }, [onKeywordClick]);

  // Save
  const handleSave = useCallback(async () => {
    if (!editor) return;
    setSaveStatus('saving');
    try {
      await apiCall(`/summaries/${summaryId}`, {
        method: 'PUT',
        body: JSON.stringify({ content_markdown: editor.getHTML() }),
      });
      dirtyRef.current = false;
      setHasUnsaved(false);
      setSaveStatus('saved');
      onContentUpdated?.();
      clearTimeout(saveStatusTimerRef.current);
      saveStatusTimerRef.current = setTimeout(() => {
        setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
      }, 3000);
    } catch (err: any) {
      console.error('[TipTapEditor] Save error:', err);
      setSaveStatus('error');
      toast.error(err.message || 'Error al guardar');
    }
  }, [editor, summaryId, onContentUpdated]);

  // Auto-save every 30s
  useEffect(() => {
    autoSaveTimerRef.current = setInterval(() => {
      if (dirtyRef.current && editor) handleSave();
    }, 30000);
    return () => { if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current); };
  }, [handleSave, editor]);

  // Cleanup saveStatus timer on unmount to prevent setState on dead component
  useEffect(() => () => clearTimeout(saveStatusTimerRef.current), []);

  // Ctrl+S
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  // Image controls
  const handleImagePosition = (pos: ImagePosition) => {
    if (!editor || !selectedImageNode) return;
    editor.commands.updateAttributes('image', { position: pos });
    setSelectedImageNode((prev) => prev ? { ...prev, attrs: { ...prev.attrs, position: pos } } : null);
  };

  const handleImageDelete = () => {
    if (!editor || !selectedImageNode) return;
    editor.chain().focus().deleteSelection().run();
    setSelectedImageNode(null);
  };

  const handleDialogInsert = (url: string, position: ImagePosition) => {
    if (!editor) return;
    editor.chain().focus().setImage({ src: url, alt: 'Imagen del resumen', position } as any).run();
  };

  if (loading) {
    return (
      <div className="axon-editor-fullpage">
        <style>{editorStyles}</style>
        <div className="px-3 py-2 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <div className="h-7 w-8 bg-gray-200 rounded animate-pulse" />
            <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
            <div className="flex-1" />
            <div className="h-7 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex-1 bg-[#F0F2F5]/80 overflow-y-auto">
          <div className="max-w-[780px] mx-auto p-10 space-y-4">
            <div className="h-8 w-2/3 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{editorStyles}</style>
      <div className="axon-editor-fullpage">
        <div className="sticky top-0 z-10">
          <TipTapToolbar
            editor={editor} onImageClick={() => setShowImageDialog(true)}
            onSave={handleSave} saveStatus={saveStatus} hasUnsaved={hasUnsaved}
            summaryTitle={summaryTitle} summaryStatus={summaryStatus}
            onBack={onBack} onStatusChange={onStatusChange}
            onKeywordsClick={onKeywordsClick} onVideosClick={onVideosClick}
            keywordsCount={keywordsCount} videosCount={videosCount}
            onCreateKeywordFromSelection={onCreateKeywordFromSelection}
          />
        </div>

        <div className="axon-editor-scroll" ref={scrollContainerRef}>
          <div className="axon-editor-content relative">
            <EditorContent editor={editor} />
            {onCreateKeywordFromSelection && editor && (
              <SelectionKeywordBubble
                editor={editor} scrollContainer={scrollContainerRef.current}
                onCreateKeyword={onCreateKeywordFromSelection} existingKeywordNames={keywordNames}
              />
            )}
            {selectedImageNode && editor && (
              <ImagePopover
                position={selectedImageNode.attrs.position || 'center'}
                onChangePosition={handleImagePosition} onDelete={handleImageDelete}
              />
            )}
          </div>
        </div>
      </div>

      <ImageUploadDialog
        open={showImageDialog} onClose={() => setShowImageDialog(false)}
        onInsert={handleDialogInsert} userId={userId}
      />
    </>
  );
}

export default TipTapEditor;
