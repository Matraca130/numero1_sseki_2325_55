// ============================================================
// Axon — MuxVideoPlayer (Student: Mux signed playback + tracking)
//
// Uses @mux/mux-player-react for HLS playback.
// On mount: getPlaybackToken(videoId) → signed JWT + playback_id
// Every 30s + on unmount: trackView() to backend
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import { Loader2, AlertCircle, RefreshCw, Video } from 'lucide-react';
import * as muxApi from '@/app/lib/muxApi';
import { supabase } from '@/app/lib/supabase';

// ── Suppress non-fatal "Unknown runtime error" from esm.sh mux polyfill ──
// This error comes from esm.sh/node/events.mjs used internally by
// @mux/mux-player-react. The video works fine; the error is cosmetic.
if (typeof window !== 'undefined' && !(window as any).__muxErrorSuppressed) {
  (window as any).__muxErrorSuppressed = true;
  window.addEventListener('error', (e: ErrorEvent) => {
    if (
      e.message === 'Unknown runtime error' &&
      e.filename?.includes('esm.sh')
    ) {
      e.preventDefault();
    }
  });
}

// ── Props ─────────────────────────────────────────────────

interface MuxVideoPlayerProps {
  videoId: string;
  institutionId: string;
  title?: string;
  thumbnailUrl?: string | null;
  onComplete?: () => void;
}

// ── Duration formatter ────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function MuxVideoPlayer({
  videoId,
  institutionId,
  title,
  thumbnailUrl,
  onComplete,
}: MuxVideoPlayerProps) {
  const [playbackId, setPlaybackId] = useState<string | null>(null);
  const [tokens, setTokens] = useState<{
    playback: string;
    thumbnail: string;
    storyboard: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable session UUID for track-view (generated once per mount)
  const [sessionId] = useState(() => crypto.randomUUID());

  // Tracking state
  const sessionStartRef = useRef(Date.now());
  const watchTimeRef = useRef(0);
  const lastPositionRef = useRef(0);
  const durationRef = useRef(0);
  const completedRef = useRef(false);
  const trackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerRef = useRef<any>(null);

  // ── Fetch playback token ────────────────────────────────
  const fetchToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await muxApi.getPlaybackToken(videoId);
      setPlaybackId(result.playback_id);
      setTokens({
        playback: result.token,
        thumbnail: result.thumbnail_token,
        storyboard: result.storyboard_token,
      });
    } catch (err: any) {
      console.error('[MuxVideoPlayer] token error:', err);
      setError(err.message || 'Error al obtener token de reproduccion');
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // ── Track view helper ───────────────────────────────────
  const sendTracking = useCallback(async () => {
    if (!durationRef.current || durationRef.current <= 0) return;
    if (watchTimeRef.current === 0) return;
    const completionPct = Math.min(
      100,
      Math.round((lastPositionRef.current / durationRef.current) * 100)
    );
    const isCompleted = completionPct >= 90;

    if (isCompleted && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }

    try {
      await muxApi.trackView({
        video_id: videoId,
        institution_id: institutionId,
        session_id: sessionId,
        watch_time_seconds: Math.round(
          (Date.now() - sessionStartRef.current) / 1000
        ),
        total_watch_time_seconds: Math.round(watchTimeRef.current),
        completion_percentage: completionPct,
        completed: isCompleted,
        last_position_seconds: Math.round(lastPositionRef.current),
      });
    } catch {
      // Silently fail tracking — not critical
    }
  }, [videoId, institutionId, sessionId, onComplete]);

  // ── Tracking interval (every 30s) ──────────────────────
  useEffect(() => {
    trackIntervalRef.current = setInterval(() => {
      sendTracking();
    }, 30_000);

    return () => {
      if (trackIntervalRef.current) clearInterval(trackIntervalRef.current);
      // Final tracking on unmount — only if session still valid (avoids 401 on sign-out)
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session && watchTimeRef.current > 0) {
          sendTracking().catch(() => {});
        }
      }).catch(() => {});
    };
  }, [sendTracking]);

  // ── Player event handlers ──────────────────────────────
  const handleTimeUpdate = useCallback((e: any) => {
    const el = e?.target as HTMLMediaElement | undefined;
    if (el) {
      lastPositionRef.current = el.currentTime;
      if (el.duration && el.duration > 0) {
        durationRef.current = el.duration;
      }
    }
  }, []);

  const handlePlay = useCallback(() => {
    // Track cumulative watch time via intervals
  }, []);

  const handleLoadedMetadata = useCallback((e: any) => {
    const el = e?.target as HTMLMediaElement | undefined;
    if (el?.duration) {
      durationRef.current = el.duration;
    }
  }, []);

  // ── Loading state ──────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full aspect-video rounded-xl bg-black flex flex-col items-center justify-center gap-3">
        <Loader2 size={28} className="text-violet-400 animate-spin" />
        <span className="text-xs text-zinc-500">Preparando video...</span>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────
  if (error || !playbackId || !tokens) {
    return (
      <div className="w-full aspect-video rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center gap-3">
        <AlertCircle size={24} className="text-red-400" />
        <p className="text-xs text-zinc-400 text-center max-w-xs px-4">
          {error || 'No se pudo cargar el video'}
        </p>
        <button
          onClick={fetchToken}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg transition-colors"
        >
          <RefreshCw size={12} /> Reintentar
        </button>
      </div>
    );
  }

  // ── Player ─────────────────────────────────────────────
  return (
    <div className="w-full">
      <div className="w-full rounded-xl bg-black">
        <MuxPlayer
          ref={playerRef}
          playbackId={playbackId}
          tokens={tokens}
          metadata={{
            video_id: videoId,
            video_title: title || '',
          }}
          streamType="on-demand"
          defaultHiddenCaptions
          thumbnailTime={0}
          accentColor="#8b5cf6"
          title={title || undefined}
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlay}
          onLoadedMetadata={handleLoadedMetadata}
          style={{ width: '100%', aspectRatio: '16/9', borderRadius: '0.75rem' }}
        />
      </div>

      {/* Progress info bar */}
      <div className="flex items-center gap-3 mt-2 px-1">
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <Video size={10} className="text-violet-400" />
          <span>{title || 'Video Mux'}</span>
        </div>
        {completedRef.current && (
          <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">
            Completado
          </span>
        )}
      </div>
    </div>
  );
}