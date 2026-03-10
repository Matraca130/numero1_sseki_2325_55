// ============================================================
// Axon — useStudentNotes Hook
//
// Manages student personal notes on keywords.
// CRUD operations with optimistic updates.
//
// Backend: kw-student-notes CRUD via studentNotesApi.ts
// ============================================================

import { useState, useCallback, useRef } from 'react';
import {
  getNotesByKeyword,
  createNote,
  updateNote,
  deleteNote,
  type StudentNote,
  type CreateStudentNoteInput,
  type UpdateStudentNoteInput,
} from '@/app/services/studentNotesApi';

export type NotesPhase = 'idle' | 'loading' | 'ready' | 'error';

export function useStudentNotes() {
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [phase, setPhase] = useState<NotesPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const activeKeywordRef = useRef<string | null>(null);

  const loadNotes = useCallback(async (keywordId: string) => {
    activeKeywordRef.current = keywordId;
    setPhase('loading');
    setError(null);
    try {
      const result = await getNotesByKeyword(keywordId);
      if (activeKeywordRef.current !== keywordId) return;
      setNotes(result);
      setPhase('ready');
    } catch (err: any) {
      if (activeKeywordRef.current !== keywordId) return;
      setError(err.message || 'Error al cargar notas');
      setPhase('error');
    }
  }, []);

  const addNote = useCallback(async (input: CreateStudentNoteInput): Promise<StudentNote | null> => {
    try {
      const newNote = await createNote(input);
      setNotes(prev => [newNote, ...prev]);
      return newNote;
    } catch (err: any) {
      console.error('[useStudentNotes] Create error:', err);
      return null;
    }
  }, []);

  const editNote = useCallback(async (noteId: string, input: UpdateStudentNoteInput): Promise<boolean> => {
    try {
      const updated = await updateNote(noteId, input);
      setNotes(prev => prev.map(n => n.id === noteId ? updated : n));
      return true;
    } catch (err: any) {
      console.error('[useStudentNotes] Update error:', err);
      return false;
    }
  }, []);

  const removeNote = useCallback(async (noteId: string): Promise<boolean> => {
    const previous = notes;
    setNotes(prev => prev.filter(n => n.id !== noteId));
    try {
      await deleteNote(noteId);
      return true;
    } catch (err: any) {
      console.error('[useStudentNotes] Delete error:', err);
      setNotes(previous);
      return false;
    }
  }, [notes]);

  const reset = useCallback(() => {
    setNotes([]);
    setPhase('idle');
    setError(null);
    activeKeywordRef.current = null;
  }, []);

  return {
    notes,
    phase,
    error,
    loadNotes,
    addNote,
    editNote,
    removeNote,
    reset,
  };
}
