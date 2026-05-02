import { useState, useCallback } from 'react';

/**
 * Hook for managing 3D model spatial notes.
 * TODO: Connect to backend API when note endpoints are available.
 * Currently uses local state only.
 */

interface Note {
  id: string;
  modelId: string;
  /** Optional 3D placement; absent when the note is text-only. */
  geometry?: { x: number; y: number; z: number };
  note: string;
  createdAt: Date;
}

interface AddNoteInput {
  note: string;
  geometry?: { x: number; y: number; z: number };
}

export function useNoteData(modelId: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading] = useState(false);

  const addNote = useCallback((input: AddNoteInput) => {
    const note: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      modelId,
      geometry: input.geometry,
      note: input.note,
      createdAt: new Date(),
    };
    setNotes(prev => [...prev, note]);
    return note;
  }, [modelId]);

  const editNote = useCallback((noteId: string, text: string) => {
    setNotes(prev => prev.map(n => (n.id === noteId ? { ...n, note: text } : n)));
    return true;
  }, []);

  const deleteNote = useCallback((noteId: string) => {
    setNotes(prev => prev.filter(n => n.id !== noteId));
  }, []);

  return { notes, loading, addNote, editNote, deleteNote };
}
