// ============================================================
// Axon — TextHighlighter (wraps ChunkRenderer for student)
//
// Detects text selection → shows HighlightToolbar → creates
// text_annotations via POST /text-annotations.
// Renders existing highlights as colored backgrounds.
//
// Routes (all FLAT):
//   GET  /text-annotations?summary_id=xxx (loaded by parent)
//   POST /text-annotations { summary_id, start_offset, end_offset, color }
//   PUT  /text-annotations/:id { note, color }
//   DELETE /text-annotations/:id (soft delete)
//
// Offsets are character offsets within the concatenated plain-text
// of ALL chunks (sorted by order_index), joined by '\n'.
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import {
  StickyNote, Trash2, X, Save, Loader2, MessageSquare,
} from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { HighlightToolbar } from './HighlightToolbar';
import type { HighlightColor } from './HighlightToolbar';
import type { TextAnnotation } from '@/app/services/studentSummariesApi';
import type { Chunk, SummaryKeyword } from '@/app/services/summariesApi';
import { replaceKeywordPlaceholders } from '@/app/components/student/blocks/renderTextWithKeywords';
import {
  useCreateAnnotationMutation,
  useUpdateAnnotationMutation,
  useDeleteAnnotationMutation,
} from '@/app/hooks/queries/useAnnotationMutations';

// ── Color map for highlight backgrounds ───────────────────
const colorMap: Record<string, { bg: string; bgHover: string; border: string }> = {
  yellow: { bg: 'bg-yellow-200/50', bgHover: 'bg-yellow-200/70', border: 'border-yellow-300' },
  green:  { bg: 'bg-emerald-200/50', bgHover: 'bg-emerald-200/70', border: 'border-emerald-300' },
  blue:   { bg: 'bg-blue-200/50',   bgHover: 'bg-blue-200/70',   border: 'border-blue-300' },
  pink:   { bg: 'bg-pink-200/50',   bgHover: 'bg-pink-200/70',   border: 'border-pink-300' },
  orange: { bg: 'bg-orange-200/50', bgHover: 'bg-orange-200/70', border: 'border-orange-300' },
};

// ── Build plain text from chunks ──────────────────────────
export function buildPlainText(chunks: Chunk[]): string {
  const sorted = [...chunks].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  return sorted.map(c => c.content).join('\n');
}

// ── Split text into segments with highlights ──────────────
export interface Segment {
  text: string;
  annotation?: TextAnnotation;
}

export function buildSegments(fullText: string, annotations: TextAnnotation[]): Segment[] {
  if (annotations.length === 0) return [{ text: fullText }];

  // Sort by start_offset
  const sorted = [...annotations]
    .filter(a => !a.deleted_at)
    .sort((a, b) => a.start_offset - b.start_offset);

  const segments: Segment[] = [];
  let cursor = 0;

  for (const ann of sorted) {
    const start = Math.max(ann.start_offset, cursor);
    const end = Math.min(ann.end_offset, fullText.length);
    if (start >= end) continue;

    // Text before this annotation
    if (cursor < start) {
      segments.push({ text: fullText.slice(cursor, start) });
    }

    // Highlighted text
    segments.push({
      text: fullText.slice(start, end),
      annotation: ann,
    });
    cursor = end;
  }

  // Remaining text
  if (cursor < fullText.length) {
    segments.push({ text: fullText.slice(cursor) });
  }

  return segments;
}

// ── Props ─────────────────────────────────────────────────
interface TextHighlighterProps {
  chunks: Chunk[];
  keywords?: SummaryKeyword[];
  loading?: boolean;
  summaryId: string;
  annotations: TextAnnotation[];
}

export function TextHighlighter({
  chunks,
  keywords = [],
  loading,
  summaryId,
  annotations,
}: TextHighlighterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<{ top: number; left: number } | null>(null);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);

  // Note editing
  const [editingAnnotation, setEditingAnnotation] = useState<TextAnnotation | null>(null);
  const [noteText, setNoteText] = useState('');

  // Annotate mode: select color + add note simultaneously
  const [annotateMode, setAnnotateMode] = useState(false);

  // ── React Query mutations ───────────────────────────────
  const createMutation = useCreateAnnotationMutation(summaryId);
  const updateMutation = useUpdateAnnotationMutation(summaryId);
  const deleteMutation = useDeleteAnnotationMutation(summaryId);

  const fullText = buildPlainText(chunks);
  const liveAnnotations = annotations.filter(a => !a.deleted_at);

  // ── Handle text selection ───────────────────────────────
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) {
      // Only hide toolbar if not in annotate mode
      if (!annotateMode) {
        setToolbar(null);
        setSelectionRange(null);
      }
      return;
    }

    const selectedText = sel.toString().trim();
    if (!selectedText) {
      setToolbar(null);
      setSelectionRange(null);
      return;
    }

    // Calculate offset within fullText
    const container = containerRef.current;
    const textContent = container.textContent || '';

    // Find the selection's position within the container's text
    const range = sel.getRangeAt(0);
    const preRange = document.createRange();
    preRange.setStart(container, 0);
    preRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preRange.toString().length;
    const endOffset = startOffset + sel.toString().length;

    setSelectionRange({ start: startOffset, end: endOffset });

    // Position toolbar above selection
    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop || 0;
    setToolbar({
      top: rect.top - containerRect.top + scrollTop - 42,
      left: rect.left - containerRect.left + rect.width / 2 - 90,
    });
  }, [annotateMode]);

  // ── Listen for mouseup ──────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('mouseup', handleMouseUp);
    return () => container.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  // ── Hide toolbar on click outside ───────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setToolbar(null);
        setSelectionRange(null);
        setAnnotateMode(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Create highlight ────────────────────────────────────
  const handleSelectColor = (color: HighlightColor) => {
    if (!selectionRange) return;
    createMutation.mutate(
      {
        summary_id: summaryId,
        start_offset: selectionRange.start,
        end_offset: selectionRange.end,
        color,
      },
      {
        onSuccess: () => {
          toast.success('Subrayado creado');
          window.getSelection()?.removeAllRanges();
          setToolbar(null);
          setSelectionRange(null);
        },
      },
    );
  };

  // ── Create highlight with note ──────────────────────────
  const handleAnnotate = () => {
    if (!selectionRange) return;
    setAnnotateMode(true);
    createMutation.mutate(
      {
        summary_id: summaryId,
        start_offset: selectionRange.start,
        end_offset: selectionRange.end,
        color: 'yellow',
      },
      {
        onSuccess: (ann) => {
          window.getSelection()?.removeAllRanges();
          setToolbar(null);
          setSelectionRange(null);
          setAnnotateMode(false);
          // Open note editor immediately
          setEditingAnnotation(ann);
          setNoteText('');
        },
      },
    );
  };

  // ── Save note on annotation ─────────────────────────────
  const handleSaveNote = () => {
    if (!editingAnnotation) return;
    updateMutation.mutate(
      { id: editingAnnotation.id, data: { note: noteText.trim() || null } },
      {
        onSuccess: () => {
          setEditingAnnotation(null);
          setNoteText('');
        },
      },
    );
  };

  // ── Delete annotation ───────────────────────────────────
  const handleDeleteAnnotation = (ann: TextAnnotation) => {
    deleteMutation.mutate(ann.id, {
      onSuccess: () => {
        setEditingAnnotation(null);
        setNoteText('');
      },
    });
  };

  // ── Loading / Empty states ──────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 p-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-full mb-2" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  if (chunks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-400">Este resumen aun no tiene contenido</p>
      </div>
    );
  }

  const segments = buildSegments(fullText, liveAnnotations);

  return (
    <div ref={containerRef} className="relative p-6 select-text">
      {/* Floating toolbar on selection */}
      <AnimatePresence>
        {toolbar && selectionRange && (
          <HighlightToolbar
            top={toolbar.top}
            left={Math.max(0, toolbar.left)}
            onSelectColor={handleSelectColor}
            onAnnotate={handleAnnotate}
          />
        )}
      </AnimatePresence>

      {/* Rendered text with highlights */}
      <div className="text-gray-600 leading-relaxed whitespace-pre-wrap">
        {segments.map((seg, idx) => {
          if (!seg.annotation) {
            return <span key={idx}>{replaceKeywordPlaceholders(seg.text, keywords)}</span>;
          }

          const ann = seg.annotation;
          const colors = colorMap[ann.color || 'yellow'] || colorMap.yellow;
          const hasNote = ann.note && ann.note.trim().length > 0;

          return (
            <span
              key={`hl-${ann.id}-${idx}`}
              className={clsx(
                "relative cursor-pointer rounded-sm px-0.5 -mx-0.5 transition-colors",
                colors.bg,
                "hover:" + colors.bgHover,
              )}
              title={hasNote ? ann.note! : 'Click derecho para opciones'}
              onContextMenu={(e) => {
                e.preventDefault();
                setEditingAnnotation(ann);
                setNoteText(ann.note || '');
              }}
            >
              {replaceKeywordPlaceholders(seg.text, keywords)}
              {hasNote && (
                <span className="inline-block align-top ml-0.5">
                  <MessageSquare size={8} className="text-amber-500 inline" />
                </span>
              )}
            </span>
          );
        })}
      </div>

      {/* Annotation edit popup */}
      <AnimatePresence>
        {editingAnnotation && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
            onClick={() => { setEditingAnnotation(null); setNoteText(''); }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-xl border border-gray-200 shadow-xl p-5 w-full max-w-sm mx-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm text-gray-800 flex items-center gap-1.5">
                  <StickyNote size={14} className="text-amber-500" />
                  Nota del subrayado
                </h4>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDeleteAnnotation(editingAnnotation)}
                    className="p-1 text-red-400 hover:text-red-600 transition-colors"
                    title="Eliminar subrayado"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    onClick={() => { setEditingAnnotation(null); setNoteText(''); }}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Preview of highlighted text */}
              <div className={clsx(
                "rounded-lg px-3 py-2 mb-3 text-xs text-gray-600 border",
                colorMap[editingAnnotation.color || 'yellow']?.bg || 'bg-yellow-200/50',
                colorMap[editingAnnotation.color || 'yellow']?.border || 'border-yellow-300',
              )}>
                <span className="line-clamp-2">
                  {replaceKeywordPlaceholders(fullText.slice(editingAnnotation.start_offset, editingAnnotation.end_offset), keywords)}
                </span>
              </div>

              <Textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Escribe una nota sobre este texto..."
                className="text-xs min-h-[80px] mb-3"
                maxLength={500}
                autoFocus
              />

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">{noteText.length}/500</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => { setEditingAnnotation(null); setNoteText(''); }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={handleSaveNote}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? <Loader2 size={12} className="animate-spin mr-1" /> : <Save size={12} className="mr-1" />}
                    Guardar
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}