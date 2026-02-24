// ============================================================
// Axon — VideoNoteForm (Student: create/edit video annotations)
//
// Input: note (required), timestamp MM:SS picker (pre-filled).
// POST /video-notes { video_id, student_id, note, timestamp_seconds }
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Save, X, Clock } from 'lucide-react';
import type { VideoNote } from '@/app/services/studentSummariesApi';

// ── Helpers ───────────────────────────────────────────────
function secondsToMM_SS(totalSec: number | null): { mm: string; ss: string } {
  const t = Math.max(0, totalSec ?? 0);
  const mm = Math.floor(t / 60);
  const ss = t % 60;
  return {
    mm: String(mm).padStart(2, '0'),
    ss: String(ss).padStart(2, '0'),
  };
}

function mmssToSeconds(mm: string, ss: string): number {
  const m = Math.max(0, parseInt(mm, 10) || 0);
  const s = Math.min(59, Math.max(0, parseInt(ss, 10) || 0));
  return m * 60 + s;
}

// ── Props ─────────────────────────────────────────────────
interface VideoNoteFormProps {
  initialTimestamp: number | null;
  /** If provided, we're editing */
  editingNote?: VideoNote | null;
  onSubmit: (data: { note: string; timestamp_seconds: number | null }) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

export function VideoNoteForm({
  initialTimestamp,
  editingNote,
  onSubmit,
  onCancel,
  saving = false,
}: VideoNoteFormProps) {
  const ts = editingNote
    ? secondsToMM_SS(editingNote.timestamp_seconds)
    : secondsToMM_SS(initialTimestamp);

  const [note, setNote] = useState(editingNote?.note ?? '');
  const [mm, setMm] = useState(ts.mm);
  const [ss, setSs] = useState(ts.ss);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Reset when editingNote changes
  useEffect(() => {
    if (editingNote) {
      setNote(editingNote.note);
      const t = secondsToMM_SS(editingNote.timestamp_seconds);
      setMm(t.mm);
      setSs(t.ss);
    }
  }, [editingNote]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = note.trim();
    if (!trimmed) return;
    const seconds = mmssToSeconds(mm, ss);
    await onSubmit({
      note: trimmed,
      timestamp_seconds: seconds > 0 ? seconds : null,
    });
  };

  const handleMmChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 3);
    setMm(cleaned);
  };

  const handleSsChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 2);
    const num = parseInt(cleaned, 10);
    if (!isNaN(num) && num > 59) {
      setSs('59');
    } else {
      setSs(cleaned);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onSubmit={handleSubmit}
      className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg p-3 space-y-2.5"
    >
      {/* Timestamp picker */}
      <div className="flex items-center gap-2">
        <Clock size={12} className="text-amber-400 shrink-0" />
        <span className="text-[10px] text-zinc-500">Timestamp:</span>
        <div className="flex items-center gap-0.5 bg-zinc-900 rounded px-2 py-1">
          <input
            type="text"
            value={mm}
            onChange={e => handleMmChange(e.target.value)}
            onBlur={() => setMm(prev => prev.padStart(2, '0'))}
            className="w-7 bg-transparent text-xs text-zinc-200 text-center outline-none"
            placeholder="00"
            maxLength={3}
          />
          <span className="text-xs text-zinc-500">:</span>
          <input
            type="text"
            value={ss}
            onChange={e => handleSsChange(e.target.value)}
            onBlur={() => setSs(prev => prev.padStart(2, '0'))}
            className="w-6 bg-transparent text-xs text-zinc-200 text-center outline-none"
            placeholder="00"
            maxLength={2}
          />
        </div>
        <span className="text-[9px] text-zinc-600">(MM:SS)</span>
      </div>

      {/* Note textarea */}
      <textarea
        ref={textareaRef}
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Escribe tu anotacion..."
        rows={2}
        className="w-full bg-zinc-900 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 resize-none outline-none focus:border-amber-500/40 transition-colors"
      />

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-3 py-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 rounded-md hover:bg-zinc-700/40 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!note.trim() || saving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 text-amber-300 text-[10px] rounded-md hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Save size={10} />
          {saving ? 'Guardando...' : editingNote ? 'Actualizar' : 'Guardar'}
        </button>
      </div>
    </motion.form>
  );
}
