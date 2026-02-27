// ============================================================
// Axon — Mux API Helper
//
// Wraps the 6 backend Mux routes via apiCall().
// All routes are FLAT (no nested paths).
//
// Backend routes:
//   POST /mux/create-upload
//   POST /webhooks/mux  (backend only — not called from frontend)
//   GET  /mux/playback-token?video_id=xxx
//   POST /mux/track-view
//   GET  /mux/video-stats?video_id=xxx
//   DELETE /mux/asset/:video_id
// ============================================================

import { apiCall } from './api';

// ── Types ─────────────────────────────────────────────────

export interface MuxUploadResult {
  video_id: string;
  upload_url: string;
}

export interface PlaybackTokenResult {
  token: string;
  thumbnail_token: string;
  storyboard_token: string;
  playback_id: string;
}

export interface TrackViewPayload {
  video_id: string;
  institution_id: string;
  session_id: string;
  watch_time_seconds: number;
  total_watch_time_seconds: number;
  completion_percentage: number;
  completed: boolean;
  last_position_seconds: number;
}

export interface VideoStats {
  video_id: string;
  total_viewers: number;
  total_views: number;
  completed_count: number;
  completion_rate: number;
  avg_completion_pct: number;
  avg_watch_time_sec: number;
}

// ── API calls ─────────────────────────────────────────────

export const createMuxUpload = (summary_id: string, title: string) =>
  apiCall<MuxUploadResult>('/mux/create-upload', {
    method: 'POST',
    body: JSON.stringify({ summary_id, title }),
  });

export const getPlaybackToken = (video_id: string) =>
  apiCall<PlaybackTokenResult>(`/mux/playback-token?video_id=${video_id}`);

export const trackView = (payload: TrackViewPayload) =>
  apiCall<any>('/mux/track-view', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getVideoStats = (video_id: string) =>
  apiCall<VideoStats>(`/mux/video-stats?video_id=${video_id}`);

export const deleteMuxAsset = (video_id: string) =>
  apiCall<{ deleted: string }>(`/mux/asset/${video_id}`, { method: 'DELETE' });