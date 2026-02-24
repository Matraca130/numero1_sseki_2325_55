// ============================================================
// Axon — AnnotationTimeline (Student: visual timeline markers)
//
// Shows annotation markers proportional to timestamp on a
// vertical timeline. Hover = preview, Click = seek to time.
// ============================================================
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import type { VideoNote } from '@/app/services/studentSummariesApi';

// ── Helpers ───────────────────────────────────────────────
function formatTimestamp(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Props ─────────────────────────────────────────────────
interface AnnotationTimelineProps {
  notes: VideoNote[];
  /** Total duration of the video in seconds (if known) */
  videoDuration: number | null;
  onSeek: (seconds: number) => void;
}

export function AnnotationTimeline({
  notes,
  videoDuration,
  onSeek,
}: AnnotationTimelineProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Filter only notes with a timestamp, sort ascending
  const timedNotes = useMemo(
    () =>
      notes
        .filter(n => n.timestamp_seconds !== null && n.timestamp_seconds >= 0)
        .sort((a, b) => (a.timestamp_seconds ?? 0) - (b.timestamp_seconds ?? 0)),
    [notes]
  );

  if (timedNotes.length === 0) return null;

  // Max time for proportional positioning
  const maxTime = videoDuration
    ? videoDuration
    : Math.max(...timedNotes.map(n => n.timestamp_seconds ?? 0), 60);

  return (
    <div className="relative flex flex-col items-center py-2 h-full min-h-[120px]">
      {/* Track line */}
      <div className="absolute left-1/2 top-2 bottom-2 w-px bg-zinc-700/60 -translate-x-1/2" />

      {/* Markers */}
      {timedNotes.map(n => {
        const ts = n.timestamp_seconds ?? 0;
        const pct = Math.min((ts / maxTime) * 100, 100);
        const isHovered = hoveredId === n.id;

        return (
          <div
            key={n.id}
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: `${Math.max(pct, 2)}%` }}
            onMouseEnter={() => setHoveredId(n.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Marker dot */}
            <button
              onClick={() => onSeek(ts)}
              className={clsx(
                'w-3.5 h-3.5 rounded-full border-2 transition-all cursor-pointer',
                isHovered
                  ? 'bg-amber-400 border-amber-300 scale-125'
                  : 'bg-amber-500/60 border-amber-500/40 hover:bg-amber-400/80'
              )}
              title={`${formatTimestamp(ts)} — ${n.note.slice(0, 40)}`}
            />

            {/* Hover tooltip */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  className="absolute left-5 top-1/2 -translate-y-1/2 z-20 w-44 bg-zinc-800 border border-zinc-700 rounded-lg p-2 shadow-xl pointer-events-none"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 rounded px-1 py-0.5">
                      {formatTimestamp(ts)}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-300 line-clamp-3 break-words">
                    {n.note}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Bottom label */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[8px] text-zinc-600">
        <MessageSquare size={7} />
        {timedNotes.length}
      </div>
    </div>
  );
}
