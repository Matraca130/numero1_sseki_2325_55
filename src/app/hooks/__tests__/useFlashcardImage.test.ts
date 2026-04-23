// ============================================================
// Hook Tests — useFlashcardImage
//
// Coverage: initial idle state, mutation happy-path (POST endpoint +
// body), query invalidation, toast success + error, error exposure,
// isGenerating flag lifecycle.
//
// Mocks:
//   - @/app/lib/api (apiCall)
//   - sonner (toast.success / toast.error)
//
// Run: npx vitest run src/app/hooks/__tests__/useFlashcardImage.test.ts
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks ─────────────────────────────────────────────────

vi.mock('@/app/lib/api', () => ({
  apiCall: vi.fn(),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...a: unknown[]) => mockToastSuccess(...a),
    error: (...a: unknown[]) => mockToastError(...a),
  },
}));

// ── Import AFTER mocks ────────────────────────────────────

import { apiCall } from '@/app/lib/api';
import { useFlashcardImage } from '@/app/hooks/useFlashcardImage';

const mockApiCall = vi.mocked(apiCall);

// ── Wrapper factory ──────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { wrapper, queryClient };
}

// ── Tests ─────────────────────────────────────────────────

describe('useFlashcardImage', () => {
  beforeEach(() => {
    // reset to drop mockResolvedValueOnce queues
    mockApiCall.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
  });

  it('returns idle state with null error and isGenerating=false', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFlashcardImage(), { wrapper });
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.generateImage).toBe('function');
  });

  it('POSTs to /content/flashcards/:id/generate-image with the flashcardId', async () => {
    mockApiCall.mockResolvedValueOnce({
      image_url: 'https://img/url',
      model: 'gemini-img-1',
    });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFlashcardImage(), { wrapper });

    await act(async () => {
      await result.current.generateImage('fc-42');
    });

    expect(mockApiCall).toHaveBeenCalledTimes(1);
    const [path, options] = mockApiCall.mock.calls[0];
    expect(path).toBe('/content/flashcards/fc-42/generate-image');
    expect((options as RequestInit).method).toBe('POST');
  });

  it('forwards imagePrompt and stylePackId in the JSON body', async () => {
    mockApiCall.mockResolvedValueOnce({ image_url: 'u', model: 'm' });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFlashcardImage(), { wrapper });

    await act(async () => {
      await result.current.generateImage('fc-1', {
        imagePrompt: 'a red heart',
        stylePackId: 'pack-anatomy',
      });
    });

    const options = mockApiCall.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(options.body as string);
    expect(body).toEqual({
      imagePrompt: 'a red heart',
      stylePackId: 'pack-anatomy',
    });
  });

  it('sends body with undefined fields when opts is omitted', async () => {
    mockApiCall.mockResolvedValueOnce({ image_url: 'u', model: 'm' });
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFlashcardImage(), { wrapper });

    await act(async () => {
      await result.current.generateImage('fc-1');
    });

    const options = mockApiCall.mock.calls[0][1] as RequestInit;
    const parsed = JSON.parse(options.body as string);
    // JSON.stringify drops undefined keys → object may be empty {}
    expect(parsed.imagePrompt).toBeUndefined();
    expect(parsed.stylePackId).toBeUndefined();
  });

  it('shows success toast and invalidates flashcards queries on success', async () => {
    mockApiCall.mockResolvedValueOnce({ image_url: 'u', model: 'm' });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useFlashcardImage(), { wrapper });

    await act(async () => {
      await result.current.generateImage('fc-1');
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Imagen generada exitosamente');
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['flashcards'] }),
    );
  });

  it('shows error toast with message on failure and rejects', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('AI quota exceeded'));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFlashcardImage(), { wrapper });

    let caught: unknown = null;
    await act(async () => {
      try {
        await result.current.generateImage('fc-1');
      } catch (e) {
        caught = e;
      }
    });

    expect(caught).toBeInstanceOf(Error);
    expect(mockToastError).toHaveBeenCalledWith(
      'Error generando imagen: AI quota exceeded',
    );
  });

  it('exposes error.message via the `error` field after a failure', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('bad request'));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFlashcardImage(), { wrapper });

    await act(async () => {
      try {
        await result.current.generateImage('fc-1');
      } catch {
        /* noop */
      }
    });

    await waitFor(() => expect(result.current.error).toBe('bad request'));
  });

  it('does not call toast.success when the request fails', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('x'));
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFlashcardImage(), { wrapper });

    await act(async () => {
      try {
        await result.current.generateImage('fc-1');
      } catch {
        /* noop */
      }
    });

    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('flips isGenerating during an in-flight request', async () => {
    let resolveApi!: (value: unknown) => void;
    mockApiCall.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveApi = resolve;
        }),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useFlashcardImage(), { wrapper });

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.generateImage('fc-1');
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(true));

    await act(async () => {
      resolveApi({ image_url: 'u', model: 'm' });
      await pending;
    });

    await waitFor(() => expect(result.current.isGenerating).toBe(false));
  });
});
