// ============================================================
// Axon — useMapStickyNotes
//
// Manages sticky notes state and operations for KnowledgeMapView.
// Extracted from KnowledgeMapView to reduce state explosion.
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { loadStickyNotes, createStickyNote, saveStickyNotes } from './StickyNote';
import type { StickyNoteData } from './StickyNote';
import type { MapViewI18nStrings } from './mapViewI18n';

export interface MapStickyNotesState {
  stickyNotes: StickyNoteData[];
  setStickyNotes: React.Dispatch<React.SetStateAction<StickyNoteData[]>>;
  handleAddStickyNote: () => void;
  handleUpdateStickyNote: (noteId: string, updates: Partial<StickyNoteData>) => void;
  handleDeleteStickyNote: (noteId: string) => void;
}

export function useMapStickyNotes(
  effectiveTopicId: string,
  i18n?: Pick<MapViewI18nStrings, 'maxStickyNotes'>,
): MapStickyNotesState {
  const [stickyNotes, setStickyNotes] = useState<StickyNoteData[]>([]);

  // Track current effectiveTopicId to detect stale callbacks during rapid navigation
  const topicIdRef = useRef(effectiveTopicId);
  topicIdRef.current = effectiveTopicId;

  // Load sticky notes when topic changes
  useEffect(() => {
    if (effectiveTopicId) {
      setStickyNotes(loadStickyNotes(effectiveTopicId));
    } else {
      setStickyNotes([]);
    }
  }, [effectiveTopicId]);

  const handleAddStickyNote = useCallback(() => {
    if (!effectiveTopicId) return;
    setStickyNotes(prev => {
      // If topic changed since callback was queued, bail
      if (topicIdRef.current !== effectiveTopicId) return prev;
      if (prev.length >= 10) {
        toast.error(i18n?.maxStickyNotes ?? 'Máximo 10 notas por tema');
        return prev;
      }
      const note = createStickyNote();
      const next = [...prev, note];
      saveStickyNotes(effectiveTopicId, next);
      return next;
    });
  }, [effectiveTopicId]);

  const handleUpdateStickyNote = useCallback((noteId: string, updates: Partial<StickyNoteData>) => {
    if (!effectiveTopicId) return;
    setStickyNotes(prev => {
      // If topic changed since callback was queued, bail
      if (topicIdRef.current !== effectiveTopicId) return prev;
      const next = prev.map(n => n.id === noteId ? { ...n, ...updates } : n);
      saveStickyNotes(effectiveTopicId, next);
      return next;
    });
  }, [effectiveTopicId]);

  const handleDeleteStickyNote = useCallback((noteId: string) => {
    if (!effectiveTopicId) return;
    setStickyNotes(prev => {
      // If topic changed since callback was queued, bail
      if (topicIdRef.current !== effectiveTopicId) return prev;
      const next = prev.filter(n => n.id !== noteId);
      saveStickyNotes(effectiveTopicId, next);
      return next;
    });
  }, [effectiveTopicId]);

  return {
    stickyNotes,
    setStickyNotes,
    handleAddStickyNote,
    handleUpdateStickyNote,
    handleDeleteStickyNote,
  };
}
