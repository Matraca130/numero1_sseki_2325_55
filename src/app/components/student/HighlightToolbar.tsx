// ============================================================
// Axon — HighlightToolbar (floating toolbar on text selection)
//
// Appears above the selection when the student selects text.
// 4 color circles + "Anotar" button.
// Auto-hides when selection is lost.
// ============================================================
import React from 'react';
import { motion } from 'motion/react';
import { StickyNote } from 'lucide-react';
import clsx from 'clsx';

const HIGHLIGHT_COLORS = [
  { key: 'yellow', bg: 'bg-yellow-400', ring: 'ring-yellow-500' },
  { key: 'green',  bg: 'bg-emerald-400', ring: 'ring-emerald-500' },
  { key: 'blue',   bg: 'bg-blue-400',   ring: 'ring-blue-500' },
  { key: 'pink',   bg: 'bg-pink-400',   ring: 'ring-pink-500' },
] as const;

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

interface HighlightToolbarProps {
  /** Absolute position (relative to the scroll container) */
  top: number;
  left: number;
  onSelectColor: (color: HighlightColor) => void;
  onAnnotate: () => void;
}

export function HighlightToolbar({ top, left, onSelectColor, onAnnotate }: HighlightToolbarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.9 }}
      transition={{ duration: 0.12 }}
      style={{ top, left, position: 'absolute', zIndex: 60 }}
      className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 shadow-xl"
    >
      {HIGHLIGHT_COLORS.map(c => (
        <button
          key={c.key}
          onClick={() => onSelectColor(c.key)}
          className={clsx(
            "w-5 h-5 rounded-full border-2 border-zinc-700 transition-all",
            "hover:scale-110 hover:border-zinc-500 active:scale-95",
            c.bg,
          )}
          title={`Subrayar ${c.key}`}
        />
      ))}
      <div className="w-px h-4 bg-zinc-700 mx-0.5" />
      <button
        onClick={onAnnotate}
        className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors px-1"
        title="Subrayar + agregar nota"
      >
        <StickyNote size={11} />
        <span>Anotar</span>
      </button>
    </motion.div>
  );
}

export { HIGHLIGHT_COLORS };
