// ============================================================
// Axon — useVideosManagerQueries (Professor: Mux video CRUD)
//
// React Query hooks for the VideosManager component:
//
//   1. useProfessorVideosQuery  — video list (ALL, professor sees
//                                  active + inactive, no is_active filter)
//   2. useUpdateVideoMutation   — PUT  /videos/:id + invalidate
//   3. useDeleteVideoMutation   — DELETE /videos/:id + invalidate
//
// Cache key: queryKeys.summaryVideos(summaryId) — shared with
// student useVideoListQuery, but no runtime conflict because
// professor and student roles never coexist in the same session.
//
// Professor queryFn returns ALL non-deleted videos (includes
// inactive). Student queryFn filters is_active in queryFn.
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from './queryKeys';
import { PROFESSOR_CONTENT_STALE } from './staleTimes';
import * as api from '@/app/services/summariesApi';
import type { Video as VideoType } from '@/app/services/summariesApi';
import { extractItems } from '@/app/lib/api-helpers';

// ── 1. Video list (professor: ALL non-deleted) ────────────

export function useProfessorVideosQuery(summaryId: string) {
  return useQuery({
    queryKey: queryKeys.summaryVideos(summaryId),
    queryFn: async () => {
      const result = await api.getVideos(summaryId);
      return extractItems<VideoType>(result)
        .filter(v => !v.deleted_at)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    },
    staleTime: PROFESSOR_CONTENT_STALE,
    enabled: !!summaryId,
  });
}

// ── 2. Update video mutation ──────────────────────────────

export function useUpdateVideoMutation(summaryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: {
      videoId: string;
      data: { title?: string; is_active?: boolean };
    }) => api.updateVideo(vars.videoId, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.summaryVideos(summaryId),
      });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error al actualizar video');
    },
  });
}

// ── 3. Delete video mutation ──────────────────────────────

export function useDeleteVideoMutation(summaryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (videoId: string) => api.deleteVideo(videoId),
    onSuccess: () => {
      toast.success('Video eliminado');
      queryClient.invalidateQueries({
        queryKey: queryKeys.summaryVideos(summaryId),
      });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error al eliminar video');
    },
  });
}
