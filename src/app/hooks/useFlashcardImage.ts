// ============================================================
// Axon — useFlashcardImage Hook
// Handles AI image generation for flashcards via backend endpoint.
// ============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCall } from '@/app/lib/api';
import { toast } from 'sonner';

interface GenerateImageOpts {
  imagePrompt?: string;
  stylePackId?: string;
}

interface GenerateImageResponse {
  image_url: string;
  model: string;
}

interface UseFlashcardImageReturn {
  generateImage: (flashcardId: string, opts?: GenerateImageOpts) => Promise<void>;
  isGenerating: boolean;
  error: string | null;
}

export function useFlashcardImage(): UseFlashcardImageReturn {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      flashcardId,
      opts,
    }: {
      flashcardId: string;
      opts?: GenerateImageOpts;
    }) => {
      return apiCall<GenerateImageResponse>(
        `/content/flashcards/${flashcardId}/generate-image`,
        {
          method: 'POST',
          body: JSON.stringify({
            imagePrompt: opts?.imagePrompt,
            stylePackId: opts?.stylePackId,
          }),
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards'] });
      toast.success('Imagen generada exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error generando imagen: ${error.message}`);
    },
  });

  return {
    generateImage: async (flashcardId: string, opts?: GenerateImageOpts) => {
      await mutation.mutateAsync({ flashcardId, opts });
    },
    isGenerating: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
}
