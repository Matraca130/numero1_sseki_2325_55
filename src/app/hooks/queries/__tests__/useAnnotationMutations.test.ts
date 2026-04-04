// ============================================================
// Hook Tests — useAnnotationMutations
//
// Tests create/update/delete mutation hooks for text annotations.
// Verifies API calls, cache invalidation, and toast messages.
//
// RUN: npx vitest run src/app/hooks/queries/__tests__/useAnnotationMutations.test.ts
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mock studentSummariesApi ─────────────────────────────────

const mockCreateTextAnnotation = vi.fn();
const mockUpdateTextAnnotation = vi.fn();
const mockDeleteTextAnnotation = vi.fn();

vi.mock('@/app/services/studentSummariesApi', () => ({
  createTextAnnotation: (...args: unknown[]) => mockCreateTextAnnotation(...args),
  updateTextAnnotation: (...args: unknown[]) => mockUpdateTextAnnotation(...args),
  deleteTextAnnotation: (...args: unknown[]) => mockDeleteTextAnnotation(...args),
}));

// ── Mock sonner toast ────────────────────────────────────────

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// ── Import after mocks ──────────────────────────────────────

import {
  useCreateAnnotationMutation,
  useUpdateAnnotationMutation,
  useDeleteAnnotationMutation,
} from '../useAnnotationMutations';

// ── Helpers ─────────────────────────────────────────────────

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

const SUMMARY_ID = 'sum-001';

const MOCK_ANNOTATION = {
  id: 'ann-001',
  student_id: 'stu-001',
  summary_id: SUMMARY_ID,
  start_offset: 10,
  end_offset: 25,
  color: 'yellow',
  note: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  deleted_at: null,
};

// ── Tests ───────────────────────────────────────────────────

describe('useCreateAnnotationMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls createTextAnnotation with provided data', async () => {
    mockCreateTextAnnotation.mockResolvedValueOnce(MOCK_ANNOTATION);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateAnnotationMutation(SUMMARY_ID), { wrapper });

    act(() => {
      result.current.mutate({
        summary_id: SUMMARY_ID,
        start_offset: 10,
        end_offset: 25,
        color: 'yellow',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockCreateTextAnnotation).toHaveBeenCalledWith({
      summary_id: SUMMARY_ID,
      start_offset: 10,
      end_offset: 25,
      color: 'yellow',
    });
  });

  it('invalidates summaryAnnotations cache on success', async () => {
    mockCreateTextAnnotation.mockResolvedValueOnce(MOCK_ANNOTATION);
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateAnnotationMutation(SUMMARY_ID), { wrapper });

    act(() => {
      result.current.mutate({
        summary_id: SUMMARY_ID,
        start_offset: 0,
        end_offset: 5,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['summary-annotations', SUMMARY_ID],
      }),
    );
  });

  it('shows error toast on failure', async () => {
    mockCreateTextAnnotation.mockRejectedValueOnce(new Error('Server error'));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateAnnotationMutation(SUMMARY_ID), { wrapper });

    act(() => {
      result.current.mutate({
        summary_id: SUMMARY_ID,
        start_offset: 0,
        end_offset: 5,
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockToastError).toHaveBeenCalledWith('Server error');
  });

  it('shows default error message when error has no message', async () => {
    mockCreateTextAnnotation.mockRejectedValueOnce({});
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateAnnotationMutation(SUMMARY_ID), { wrapper });

    act(() => {
      result.current.mutate({
        summary_id: SUMMARY_ID,
        start_offset: 0,
        end_offset: 5,
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockToastError).toHaveBeenCalledWith('Error al crear subrayado');
  });
});

describe('useUpdateAnnotationMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls updateTextAnnotation with id and data', async () => {
    mockUpdateTextAnnotation.mockResolvedValueOnce({ ...MOCK_ANNOTATION, note: 'Updated' });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateAnnotationMutation(SUMMARY_ID), { wrapper });

    act(() => {
      result.current.mutate({ id: 'ann-001', data: { note: 'Updated' } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdateTextAnnotation).toHaveBeenCalledWith('ann-001', { note: 'Updated' });
  });

  it('shows "Nota guardada" toast on success', async () => {
    mockUpdateTextAnnotation.mockResolvedValueOnce(MOCK_ANNOTATION);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateAnnotationMutation(SUMMARY_ID), { wrapper });

    act(() => {
      result.current.mutate({ id: 'ann-001', data: { note: 'Test' } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockToastSuccess).toHaveBeenCalledWith('Nota guardada');
  });

  it('invalidates cache on success', async () => {
    mockUpdateTextAnnotation.mockResolvedValueOnce(MOCK_ANNOTATION);
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateAnnotationMutation(SUMMARY_ID), { wrapper });

    act(() => {
      result.current.mutate({ id: 'ann-001', data: { color: 'blue' } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['summary-annotations', SUMMARY_ID],
      }),
    );
  });

  it('shows error toast on failure', async () => {
    mockUpdateTextAnnotation.mockRejectedValueOnce(new Error('Update failed'));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useUpdateAnnotationMutation(SUMMARY_ID), { wrapper });

    act(() => {
      result.current.mutate({ id: 'ann-001', data: { note: 'X' } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockToastError).toHaveBeenCalledWith('Update failed');
  });
});

describe('useDeleteAnnotationMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls deleteTextAnnotation with the annotation id', async () => {
    mockDeleteTextAnnotation.mockResolvedValueOnce({ success: true });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteAnnotationMutation(SUMMARY_ID), { wrapper });

    act(() => {
      result.current.mutate('ann-001');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDeleteTextAnnotation).toHaveBeenCalledWith('ann-001');
  });

  it('shows "Subrayado eliminado" toast on success', async () => {
    mockDeleteTextAnnotation.mockResolvedValueOnce({ success: true });
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteAnnotationMutation(SUMMARY_ID), { wrapper });

    act(() => {
      result.current.mutate('ann-001');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockToastSuccess).toHaveBeenCalledWith('Subrayado eliminado');
  });

  it('invalidates cache on success', async () => {
    mockDeleteTextAnnotation.mockResolvedValueOnce({ success: true });
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteAnnotationMutation(SUMMARY_ID), { wrapper });

    act(() => {
      result.current.mutate('ann-001');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['summary-annotations', SUMMARY_ID],
      }),
    );
  });

  it('shows error toast on failure', async () => {
    mockDeleteTextAnnotation.mockRejectedValueOnce(new Error('Delete failed'));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteAnnotationMutation(SUMMARY_ID), { wrapper });

    act(() => {
      result.current.mutate('ann-001');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockToastError).toHaveBeenCalledWith('Delete failed');
  });
});
