// ============================================================
// Axon — useVideoPlayerQueries
//
// React Query hooks for the VideoPlayer component:
//
//   1. useVideoListQuery   — cached video list per summary
//   2. useVideoNotesQuery  — cached student notes per video
//   3. useVideoNoteMutations — create/update/delete with
//                              automatic cache invalidation
//
// The video list query uses queryKeys.summaryVideos, which is
// also reusable by parent components that need a video count
// badge without mounting the full VideoPlayer.
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import * as summariesApi from '@/app/services/summariesApi';
import * as studentApi from '@/app/services/studentSummariesApi';
import type { Video as VideoType } from '@/app/services/summariesApi';
import type { VideoNote } from '@/app/services/studentSummariesApi';
import { extractItems } from '@/app/lib/api-helpers';
import { PROFESSOR_CONTENT_STALE, STUDENT_DATA_STALE } from './staleTimes';

// ── 1. Video list (professor content) ─────────────────────

export function useVideoListQuery(
  summaryId: string,
  initialVideos?: VideoType[],
) {
  return useQuery({
    queryKey: queryKeys.summaryVideos(summaryId),
    queryFn: async () => {
      const result = await summariesApi.getVideos(summaryId);
      return extractItems<VideoType>(result)
        .filter(v => v.is_active && !v.deleted_at)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    },
    staleTime: PROFESSOR_CONTENT_STALE,
    enabled: !!summaryId && !initialVideos,
    ...(initialVideos ? { initialData: initialVideos } : {}),
  });
}

// ── 2. Video notes (student data, per-video) ─────────────
// A-1 FIX: queryKey now includes userId to prevent stale cross-user cache.
// The backend already filters by student_id (scopeToUser), but without
// userId in the key, a cached response from student A could be served
// to student B if they share a browser session without full page refresh.

export function useVideoNotesQuery(
  videoId: string | null,
  userId: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.videoNotes(videoId!, userId),
    queryFn: async () => {
      const result = await studentApi.getVideoNotes(videoId!);
      return extractItems<VideoNote>(result)
        .filter(n => !n.deleted_at && n.student_id === userId)
        .sort((a, b) => (a.timestamp_seconds ?? 0) - (b.timestamp_seconds ?? 0));
    },
    staleTime: STUDENT_DATA_STALE,
    enabled: !!videoId && !!userId,
  });
}

// ── 3. Video note mutations (CRUD + cache invalidation) ──
// A-1 FIX: Mutations use prefix key (without userId) so invalidation
// matches ALL userId variants: ['video-notes', videoId] prefix matches
// both ['video-notes', videoId] and ['video-notes', videoId, userId].

export function useVideoNoteMutations() {
  const queryClient = useQueryClient();

  const createNote = useMutation({
    mutationFn: (data: {
      video_id: string;
      note: string;
      timestamp_seconds?: number;
    }) => studentApi.createVideoNote(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.videoNotes(variables.video_id) });
    },
    onError: (err) => {
      console.error('Error creating video note:', err);
    },
  });

  const updateNote = useMutation({
    mutationFn: ({ id, videoId, data }: {
      id: string;
      videoId: string;
      data: { note?: string; timestamp_seconds?: number };
    }) => studentApi.updateVideoNote(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.videoNotes(variables.videoId) });
    },
    onError: (err) => {
      console.error('Error updating video note:', err);
    },
  });

  const deleteNote = useMutation({
    mutationFn: ({ noteId, videoId }: { noteId: string; videoId: string }) =>
      studentApi.deleteVideoNote(noteId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.videoNotes(variables.videoId) });
    },
    onError: (err) => {
      console.error('Error deleting video note:', err);
    },
  });

  return { createNote, updateNote, deleteNote };
}