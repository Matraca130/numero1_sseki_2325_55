// ============================================================
// Axon — TopicSessionGrid (Premium Study Session Blocks)
//
// Grid of "study session blocks" for a Topic. Each block is a
// card split 50/50: left = summary session, right = video session.
// Blocks arrange in a responsive grid (2-col desktop, 1-col mobile).
//
// Click left half  → enters reader (Contenido tab)
// Click right half → enters reader (Videos tab)
//
// Palette: Axon Medical Academy
// ============================================================
import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  FileText, Play, CheckCircle2, Clock, BookOpen,
  Video as VideoIcon, Sparkles,
} from 'lucide-react';
import type { Summary } from '@/app/services/summariesApi';
import type { ReadingState } from '@/app/services/studentSummariesApi';
import { useVideoListQuery } from '@/app/hooks/queries/useVideoPlayerQueries';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import {
  ProgressBar,
  focusRing,
} from '@/app/components/design-kit';
import { axon, tint } from '@/app/lib/palette';
import { stripMarkdown } from '@/app/components/content/summary-helpers';
import { AVG_READING_WPM, MAX_TIME_BASED_PROGRESS } from '@/app/lib/xp-constants';

// ── Default video placeholder images ─────────────────────────
const VIDEO_PLACEHOLDER = 'https://images.unsplash.com/photo-1691935152212-596d5ee37383?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwbGVjdHVyZSUyMHZpZGVvJTIwZWR1Y2F0aW9ufGVufDF8fHx8MTc3MzQwOTU3OXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral';
const SUMMARY_PLACEHOLDER = 'https://images.unsplash.com/photo-1652787544912-137c7f92f99b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwdGV4dGJvb2slMjBzdHVkeSUyMHJlYWRpbmd8ZW58MXx8fHwxNzczNDA5NTgwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral';

// ── Video thumbnail helper ───────────────────────────────────
function getVideoThumbnail(video: { thumbnail_url?: string | null; mux_playback_id?: string | null; url?: string }): string {
  if (video.thumbnail_url) return video.thumbnail_url;
  if (video.mux_playback_id) {
    return `https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg?width=480&height=270&fit_mode=smartcrop`;
  }
  // YouTube thumbnail extraction
  const ytMatch = video.url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
  return VIDEO_PLACEHOLDER;
}

// ── Format duration ──────────────────────────────────────────
function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── SessionBlock (one card split in half) ────────────────────

interface SessionBlockProps {
  summary: Summary;
  readingState: ReadingState | undefined;
  isNext: boolean;
  index: number;
  onClickSummary: (summaryId: string) => void;
  onClickVideo: (summaryId: string) => void;
}

function SessionBlock({
  summary,
  readingState,
  isNext,
  index,
  onClickSummary,
  onClickVideo,
}: SessionBlockProps) {
  const shouldReduce = useReducedMotion();
  const { data: videos, isLoading: videosLoading } = useVideoListQuery(summary.id);
  const firstVideo = videos?.[0] ?? null;
  const videoCount = videos?.length ?? 0;

  const isCompleted = readingState?.completed === true;
  const isInProgress = !!readingState && !isCompleted;
  const timeSpent = readingState?.time_spent_seconds ?? 0;

  // Preview text (QA-3 FIX: share stripped text with estimatedReadSeconds)
  const { preview, estimatedReadSeconds } = React.useMemo(() => {
    if (!summary.content_markdown) return { preview: '', estimatedReadSeconds: 300 };
    const stripped = stripMarkdown(summary.content_markdown);
    const wordCount = stripped.split(/\s+/).filter(Boolean).length;
    return {
      preview: stripped.substring(0, 100),
      estimatedReadSeconds: wordCount > 0 ? (wordCount / AVG_READING_WPM) * 60 : 300,
    };
  }, [summary.content_markdown]);

  // Card border color based on status
  const borderColor = isCompleted
    ? tint.successBorder
    : isNext
      ? tint.tealBorder
      : isInProgress
        ? `${axon.tealAccent}60`
        : tint.neutralBorder;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="rounded-2xl border-2 overflow-hidden bg-white"
      style={{
        borderColor,
        ...(isNext ? { boxShadow: `0 4px 16px ${axon.tealAccent}18, 0 0 0 1px ${tint.tealBorder}` } : {}),
      }}
    >
      {/* Next badge */}
      {isNext && (
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
          <Sparkles className="w-3.5 h-3.5" style={{ color: axon.tealAccent }} />
          <span
            className="text-[10px] px-2 py-0.5 rounded-full border"
            style={{
              color: axon.hoverTeal,
              backgroundColor: tint.tealBg,
              borderColor: tint.tealBorder,
              fontWeight: 700,
            }}
          >
            Siguiente
          </span>
        </div>
      )}

      {/* ── Two-half layout ── */}
      <div className="flex min-h-[180px]">
        {/* ── LEFT: Summary Session ── */}
        <motion.button
          onClick={() => onClickSummary(summary.id)}
          className={`flex-1 text-left p-4 flex flex-col justify-between relative group cursor-pointer transition-colors ${focusRing}`}
          whileHover={shouldReduce ? undefined : { backgroundColor: '#f8fffe' }}
        >
          {/* Summary icon + status */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: isCompleted ? tint.successBg : isInProgress ? tint.tealBg : tint.neutralBg,
                  borderColor: isCompleted ? tint.successBorder : isInProgress ? tint.tealBorder : tint.neutralBorder,
                }}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" style={{ color: tint.successAccent }} />
                ) : isInProgress ? (
                  <Clock className="w-4 h-4" style={{ color: axon.tealAccent }} />
                ) : (
                  <FileText className="w-4 h-4" style={{ color: tint.neutralText }} />
                )}
              </div>
              {isCompleted && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full border"
                  style={{ color: tint.successText, backgroundColor: tint.successBg, borderColor: tint.successBorder, fontWeight: 600 }}
                >
                  Leído
                </span>
              )}
              {isInProgress && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full border"
                  style={{ color: tint.amberText, backgroundColor: tint.amberBg, borderColor: tint.amberBorder, fontWeight: 600 }}
                >
                  En progreso
                </span>
              )}
            </div>

            <h3 className="text-sm mb-1 line-clamp-2" style={{ color: '#18181b', fontWeight: 700 }}>
              {summary.title || 'Sin título'}
            </h3>
            {preview && (
              <p className="text-[11px] line-clamp-2" style={{ color: tint.subtitleText }}>
                {preview}
              </p>
            )}
          </div>

          {/* Bottom: meta + progress */}
          <div className="mt-3">
            <div className="flex items-center gap-2 text-[10px]" style={{ color: tint.neutralText }}>
              <BookOpen className="w-3 h-3" />
              <span>Resumen</span>
              {timeSpent > 0 && (
                <>
                  <span style={{ color: tint.neutralBorder }}>·</span>
                  <Clock className="w-3 h-3" />
                  <span>{Math.round(timeSpent / 60)} min</span>
                </>
              )}
            </div>
            {isInProgress && timeSpent > 0 && (
              <div className="mt-2">
                {/* D-12 FIX: word-count based progress instead of arbitrary 300s threshold */}
                <ProgressBar value={Math.min(timeSpent / estimatedReadSeconds, MAX_TIME_BASED_PROGRESS)} className="h-1" />
              </div>
            )}
          </div>

          {/* Hover arrow overlay */}
          <div
            className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: tint.tealBg }}
          >
            <FileText className="w-3 h-3" style={{ color: axon.tealAccent }} />
          </div>
        </motion.button>

        {/* ── Divider ── */}
        <div className="w-px" style={{ backgroundColor: tint.neutralBorder }} />

        {/* ── RIGHT: Video Session ── */}
        <motion.button
          onClick={() => onClickVideo(summary.id)}
          className={`flex-1 relative group cursor-pointer overflow-hidden ${focusRing}`}
          whileHover={shouldReduce ? undefined : { scale: 1.01 }}
          disabled={videoCount === 0 && !videosLoading}
        >
          {/* Thumbnail background */}
          <div className="absolute inset-0">
            {videosLoading ? (
              <div className="w-full h-full animate-pulse" style={{ backgroundColor: '#e2e8f0' }} />
            ) : firstVideo ? (
              <ImageWithFallback
                src={getVideoThumbnail(firstVideo)}
                alt={firstVideo.title || 'Video'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center gap-2"
                style={{ backgroundColor: tint.neutralBg }}
              >
                <VideoIcon className="w-8 h-8" style={{ color: tint.neutralBorder }} />
                <span className="text-[10px]" style={{ color: tint.neutralText, fontWeight: 500 }}>
                  Sin video
                </span>
              </div>
            )}
          </div>

          {/* Dark overlay gradient */}
          {firstVideo && (
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to top, rgba(27,59,54,0.85) 0%, rgba(27,59,54,0.3) 50%, rgba(27,59,54,0.1) 100%)',
              }}
            />
          )}

          {/* Play button (center) */}
          {firstVideo && (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-white/40 group-hover:border-white/80 transition-colors"
                style={{ backgroundColor: `${axon.tealAccent}cc` }}
                whileHover={shouldReduce ? undefined : { scale: 1.1 }}
              >
                <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
              </motion.div>
            </div>
          )}

          {/* Bottom info overlay */}
          {firstVideo && (
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-[11px] text-white line-clamp-1" style={{ fontWeight: 600 }}>
                {firstVideo.title || 'Video'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {firstVideo.duration_seconds && (
                  <span className="text-[10px] text-white/70">
                    {formatDuration(firstVideo.duration_seconds)}
                  </span>
                )}
                {videoCount > 1 && (
                  <span className="text-[10px] text-white/70">
                    +{videoCount - 1} mas
                  </span>
                )}
              </div>
            </div>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Main Grid ────────────────────────────────────────────────

export interface TopicSessionGridProps {
  summaries: Summary[];
  readingStates: Record<string, ReadingState>;
  nextSummaryId: string | null;
  onSelectSummary: (summaryId: string, tab?: string) => void;
}

export function TopicSessionGrid({
  summaries,
  readingStates,
  nextSummaryId,
  onSelectSummary,
}: TopicSessionGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {summaries.map((s, i) => (
        <SessionBlock
          key={s.id}
          summary={s}
          readingState={readingStates[s.id]}
          isNext={s.id === nextSummaryId}
          index={i}
          onClickSummary={(id) => onSelectSummary(id, 'chunks')}
          onClickVideo={(id) => onSelectSummary(id, 'videos')}
        />
      ))}
    </div>
  );
}
