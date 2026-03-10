// ============================================================
// Axon — PersistentAnnotationsPanel (v4.4.6)
//
// Bridge component that connects the useTextAnnotations hook
// (backend persistence via textAnnotationsApi) to the existing
// TextAnnotationsPanel (presentation).
//
// RESPONSIBILITIES:
//   1. Load annotations from backend on mount (by summaryId)
//   2. Map TextAnnotation (API) → TextAnnotationEntry (UI)
//   3. Wire onDelete to removeAnnotation (optimistic)
//   4. Provide creation UI: user selects text → creates annotation
//   5. Optional: MedBot questions → POST /ai/rag-chat
//
// USAGE:
//   <PersistentAnnotationsPanel summaryId="uuid-..." />
//
// ARCHITECTURE:
//   PersistentAnnotationsPanel
//     ├── useTextAnnotations (hook → backend CRUD)
//     ├── TextAnnotationsPanel (presentation, unchanged)
//     └── AnnotationCreator (inline form for new annotations)
//
// This file does NOT modify TextAnnotationsPanel.tsx.
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Highlighter,
  Edit3,
  MessageCircleQuestion,
  Plus,
  X,
  Loader2,
  AlertCircle,
  Check,
  StickyNote,
} from 'lucide-react';
import { useTextAnnotations } from '@/app/hooks/useTextAnnotations';
import type { TextAnnotation, CreateAnnotationInput } from '@/app/services/textAnnotationsApi';
import { TextAnnotationsPanel, type TextAnnotationEntry } from './TextAnnotationsPanel';

// ── Props ─────────────────────────────────────────────────

interface PersistentAnnotationsPanelProps {
  summaryId: string;
  /** Optional: pass selected text from parent for quick annotation */
  selectedText?: string;
  /** Called when annotation is created (parent might want to update highlights) */
  onAnnotationCreated?: (annotation: TextAnnotation) => void;
  /** Called when annotation is deleted */
  onAnnotationDeleted?: (annotationId: string) => void;
  /** Optional class name */
  className?: string;
}

// ── Mapper: TextAnnotation (API) → TextAnnotationEntry (UI) ──

function mapToEntry(annotation: TextAnnotation): TextAnnotationEntry {
  return {
    id: annotation.id,
    originalText: annotation.selected_text,
    displayText: annotation.selected_text.length > 120
      ? annotation.selected_text.slice(0, 120) + '...'
      : annotation.selected_text,
    color: annotation.color || 'yellow',
    note: annotation.note || '',
    type: annotation.annotation_type || 'highlight',
    botReply: undefined, // MedBot replies stored separately (future)
    timestamp: new Date(annotation.created_at).getTime(),
  };
}

// ── Annotation Creator (inline form) ────────────────────

type NewAnnotationType = 'highlight' | 'note' | 'question';

const TYPE_OPTIONS: { value: NewAnnotationType; label: string; icon: React.ReactNode }[] = [
  { value: 'highlight', label: 'Destaque', icon: <Highlighter size={12} /> },
  { value: 'note', label: 'Nota', icon: <Edit3 size={12} /> },
  { value: 'question', label: 'Pregunta', icon: <MessageCircleQuestion size={12} /> },
];

const COLOR_OPTIONS: { value: 'yellow' | 'blue' | 'green' | 'pink'; bg: string }[] = [
  { value: 'yellow', bg: 'bg-yellow-400' },
  { value: 'blue', bg: 'bg-blue-400' },
  { value: 'green', bg: 'bg-emerald-400' },
  { value: 'pink', bg: 'bg-pink-400' },
];

function AnnotationCreator({
  summaryId,
  initialText,
  onSubmit,
  onCancel,
}: {
  summaryId: string;
  initialText: string;
  onSubmit: (input: CreateAnnotationInput) => Promise<TextAnnotation | null>;
  onCancel: () => void;
}) {
  const [type, setType] = useState<NewAnnotationType>('highlight');
  const [color, setColor] = useState<'yellow' | 'blue' | 'green' | 'pink'>('yellow');
  const [note, setNote] = useState('');
  const [selectedText, setSelectedText] = useState(initialText);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!selectedText.trim()) return;
    setSubmitting(true);
    const result = await onSubmit({
      summary_id: summaryId,
      selected_text: selectedText.trim(),
      note: note.trim() || undefined,
      annotation_type: type,
      color,
    });
    setSubmitting(false);
    if (result) {
      // Reset form
      setNote('');
      setSelectedText('');
      onCancel();
    }
  }, [summaryId, selectedText, note, type, color, onSubmit, onCancel]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 space-y-3">
        {/* Selected text input */}
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block" style={{ fontWeight: 600 }}>
            Texto seleccionado
          </label>
          <textarea
            value={selectedText}
            onChange={(e) => setSelectedText(e.target.value)}
            rows={2}
            className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
            placeholder="Pega o escribe el texto que quieres anotar..."
          />
        </div>

        {/* Type selector */}
        <div className="flex items-center gap-1.5">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setType(opt.value)}
              className={`flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg border transition-colors ${
                type === opt.value
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
              }`}
              style={{ fontWeight: type === opt.value ? 600 : 400 }}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>

        {/* Color selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500" style={{ fontWeight: 500 }}>Color:</span>
          {COLOR_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setColor(opt.value)}
              className={`w-5 h-5 rounded-full ${opt.bg} transition-transform ${
                color === opt.value ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'
              }`}
            />
          ))}
        </div>

        {/* Note (for 'note' and 'question' types) */}
        {(type === 'note' || type === 'question') && (
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block" style={{ fontWeight: 600 }}>
              {type === 'question' ? 'Tu pregunta' : 'Tu nota'}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
              placeholder={type === 'question' ? 'Escribe tu pregunta...' : 'Escribe tu nota...'}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="text-[11px] text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            style={{ fontWeight: 500 }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedText.trim() || submitting}
            className="flex items-center gap-1.5 text-[11px] text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 px-3 py-1.5 rounded-lg transition-colors"
            style={{ fontWeight: 600 }}
          >
            {submitting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Check size={12} />
            )}
            Guardar
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Component ──────────────────────────────────────

export function PersistentAnnotationsPanel({
  summaryId,
  selectedText = '',
  onAnnotationCreated,
  onAnnotationDeleted,
  className = '',
}: PersistentAnnotationsPanelProps) {
  const {
    annotations,
    phase,
    error,
    loadAnnotations,
    addAnnotation,
    removeAnnotation,
    reset,
  } = useTextAnnotations();

  const [showCreator, setShowCreator] = useState(false);
  const [botLoading] = useState(false); // Future: MedBot integration

  // ── Load on mount / summaryId change ────────────────
  useEffect(() => {
    if (summaryId) {
      loadAnnotations(summaryId);
    }
    return () => reset();
  }, [summaryId, loadAnnotations, reset]);

  // ── Auto-open creator when parent passes selectedText ───
  useEffect(() => {
    if (selectedText && selectedText.trim().length > 0) {
      setShowCreator(true);
    }
  }, [selectedText]);

  // ── Handlers ────────────────────────────────────────

  const handleCreate = useCallback(async (input: CreateAnnotationInput) => {
    const result = await addAnnotation(input);
    if (result) {
      onAnnotationCreated?.(result);
    }
    return result;
  }, [addAnnotation, onAnnotationCreated]);

  const handleDelete = useCallback(async (id: string) => {
    const success = await removeAnnotation(id);
    if (success) {
      onAnnotationDeleted?.(id);
    }
  }, [removeAnnotation, onAnnotationDeleted]);

  // ── Map API annotations → UI entries ──────────────────
  const entries: TextAnnotationEntry[] = annotations.map(mapToEntry);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* ── Loading state ── */}
      {phase === 'loading' && annotations.length === 0 && (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={16} className="animate-spin text-blue-400" />
          <span className="text-xs text-gray-400 ml-2">Cargando anotaciones...</span>
        </div>
      )}

      {/* ── Error state ── */}
      {phase === 'error' && (
        <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Existing annotations panel ── */}
      {entries.length > 0 && (
        <TextAnnotationsPanel
          annotations={entries}
          onDelete={handleDelete}
          botLoading={botLoading}
        />
      )}

      {/* ── Empty state ── */}
      {phase === 'ready' && entries.length === 0 && !showCreator && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
          <StickyNote size={24} className="text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-400 mb-2">
            Sin anotaciones aun. Selecciona texto para crear una.
          </p>
        </div>
      )}

      {/* ── Add button ── */}
      {!showCreator && (
        <button
          onClick={() => setShowCreator(true)}
          className="flex items-center justify-center gap-1.5 w-full text-[11px] text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl py-2.5 transition-colors"
          style={{ fontWeight: 600 }}
        >
          <Plus size={12} />
          Nueva anotacion
        </button>
      )}

      {/* ── Creator form ── */}
      <AnimatePresence>
        {showCreator && (
          <AnnotationCreator
            summaryId={summaryId}
            initialText={selectedText}
            onSubmit={handleCreate}
            onCancel={() => setShowCreator(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
