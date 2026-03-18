import { useState, useCallback } from 'react';

/**
 * Hook for managing 3D model spatial notes.
 * TODO: Connect to backend API when note endpoints are available.
 * Currently uses local state only.
 */

interface Note {
  id: string;
  modelId: string;
  position: { x: number; y: number; z: number };
  text: string;
  createdAt: Date;
}

export function useNoteData(modelId: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading] = useState(false);

  const addNote = useCallback((position: { x: number; y: number; z: number }, text: string) => {
    const note: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      modelId,
      position,
      text,
      createdAt: new Date(),
    };
    setNotes(prev => [...prev, note]);
    return note;
  }, [modelId]);

  const editNote = useCallback((noteId: string, text: string) => {
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, text } : n));
  }, []);

  const deleteNote = useCallback((noteId: string) => {
    setNotes(prev => prev.filter(n => n.id !== noteId));
  }, []);

  return { notes, loading, addNote, editNote, deleteNote };
}
