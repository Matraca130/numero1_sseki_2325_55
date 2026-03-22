/**
 * AXON v4.4 — Design Kit: Video components
 * Extracted from design-kit.tsx (zero functional changes)
 */
import { motion } from "motion/react";
import { Play, Clock, CheckCircle2, Eye, Video, X } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════
   6. VIDEO — Integrar con tu Mux E2E existente
   ═══════════════════════════════════════════════════════════════════════ */

/** VideoThumbnail — estilo YouTube con progreso, duracion, badge de "visto". */
export function VideoThumbnail({
  title,
  thumbnailUrl,
  duration,
  watchedPercent = 0,
  onClick,
}: {
  title: string;
  thumbnailUrl: string;
  duration: string;
  watchedPercent?: number;
  onClick?: () => void;
}) {
  return (
    <motion.div
      onClick={onClick}
      className="flex gap-3 p-1.5 -mx-1.5 rounded-lg hover:bg-zinc-100 cursor-pointer group/video transition-colors"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="relative w-28 h-16 rounded-lg overflow-hidden bg-zinc-900 shrink-0">
        <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover/video:bg-black/40 transition-colors">
          <motion.div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg" whileHover={{ scale: 1.15 }}>
            <Play className="w-3.5 h-3.5 text-zinc-900 ml-0.5" />
          </motion.div>
        </div>
        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-white text-[10px] rounded" style={{ fontWeight: 600 }}>{duration}</span>
        {watchedPercent > 0 && watchedPercent < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-600">
            <div className="h-full bg-red-500" style={{ width: `${watchedPercent}%` }} />
          </div>
        )}
        {watchedPercent === 100 && (
          <div className="absolute top-1 right-1 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 py-0.5">
        <p className="text-xs text-zinc-900 leading-snug line-clamp-2" style={{ fontWeight: 600 }}>{title}</p>
        <div className="flex items-center gap-2 mt-1.5">
          {watchedPercent === 100 ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded" style={{ fontWeight: 600 }}><Eye className="w-3 h-3" />Visto</span>
          ) : watchedPercent > 0 ? (
            <span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded" style={{ fontWeight: 600 }}><Clock className="w-3 h-3" />{watchedPercent}% visto</span>
          ) : (
            <span className="text-[10px] text-zinc-500" style={{ fontWeight: 500 }}>{duration}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/** VideoBanner — banner teala para SummaryReader. */
export function VideoBanner({
  title,
  duration,
  subtitle,
  onPlay,
  onDismiss,
}: {
  title: string;
  duration: string;
  subtitle?: string;
  onPlay?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div className="bg-teal-700 px-8">
      <div className="max-w-2xl mx-auto py-3 flex items-center gap-4">
        <div className="w-10 h-10 bg-white/15 rounded-lg flex items-center justify-center shrink-0">
          <Video className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate" style={{ fontWeight: 600 }}>Video disponible: {title}</p>
          {subtitle && <p className="text-xs text-teal-200" style={{ fontWeight: 500 }}>{duration} · {subtitle}</p>}
        </div>
        <motion.button onClick={onPlay} className="flex items-center gap-2 px-4 py-2 bg-white text-teal-800 rounded-lg text-sm cursor-pointer shadow-md hover:bg-teal-50 shrink-0" style={{ fontWeight: 700 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Play className="w-4 h-4" />Ver video
        </motion.button>
        {onDismiss && (
          <button onClick={onDismiss} className="p-1 hover:bg-white/10 rounded cursor-pointer"><X className="w-4 h-4 text-teal-200" /></button>
        )}
      </div>
    </div>
  );
}
