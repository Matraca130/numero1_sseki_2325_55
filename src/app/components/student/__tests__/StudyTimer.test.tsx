// ============================================================
// Axon — StudyTimer Unit Tests
//
// Verifies: API integration (POST on start, PUT on complete),
// fire-and-forget behavior (UX not blocked on failure),
// and timer mode transitions.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StudyTimer } from '../StudyTimer';

// ── Mocks ──────────────────────────────────────────────

vi.mock('@/app/lib/api', () => ({
  apiCall: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: vi.fn(),
}));

import { apiCall } from '@/app/lib/api';

const mockApiCall = vi.mocked(apiCall);

// ── Tests ──────────────────────────────────────────────

describe('StudyTimer', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    mockApiCall.mockReset();
    onClose.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with 25:00 in study mode', () => {
    render(<StudyTimer onClose={onClose} />);
    expect(screen.getByText('25:00')).toBeTruthy();
    expect(screen.getByText('Estudio')).toBeTruthy();
  });

  it('POST /study-sessions on first play in study mode', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'session-123' });

    render(<StudyTimer onClose={onClose} />);

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Iniciar'));
    });

    expect(mockApiCall).toHaveBeenCalledWith('/study-sessions', expect.objectContaining({
      method: 'POST',
    }));

    const body = JSON.parse(mockApiCall.mock.calls[0][1]!.body as string);
    expect(body.session_type).toBe('reading');
    expect(body.started_at).toBeTruthy();
  });

  it('does not POST again on pause/resume', async () => {
    mockApiCall.mockResolvedValue({ id: 'session-123' });

    render(<StudyTimer onClose={onClose} />);

    // Play
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Iniciar'));
    });
    // Flush the promise
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockApiCall).toHaveBeenCalledTimes(1);

    // Pause
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Pausar'));
    });

    // Resume — should NOT call POST again (session already exists)
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Iniciar'));
    });
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });

  it('does not block UX when POST fails', async () => {
    mockApiCall.mockRejectedValueOnce(new Error('Network error'));

    render(<StudyTimer onClose={onClose} />);

    // Should not throw
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Iniciar'));
    });

    // Timer should still be running (UI not blocked)
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('24:59')).toBeTruthy();
  });

  it('calls onClose when X button clicked', () => {
    render(<StudyTimer onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('Cerrar timer'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('resets timer on reset button', async () => {
    mockApiCall.mockResolvedValueOnce({ id: 'session-123' });
    render(<StudyTimer onClose={onClose} />);

    // Start and advance
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Iniciar'));
    });
    act(() => { vi.advanceTimersByTime(5000); });

    // Reset
    fireEvent.click(screen.getByLabelText('Reiniciar'));
    expect(screen.getByText('25:00')).toBeTruthy();
  });

  it('does not PUT /study-sessions/pending when timer expires before POST resolves (regression #753)', async () => {
    // Arrange: POST never resolves during the test window (simulates a slow
    // network where the auto-switch fires while the create POST is in flight).
    let resolvePost: (value: { id: string }) => void = () => {};
    mockApiCall.mockImplementationOnce(
      () => new Promise((resolve) => { resolvePost = resolve; }),
    );

    render(<StudyTimer onClose={onClose} />);

    // Set the study minutes to the minimum (1 min = 60s) so we can fast-forward
    // past auto-switch quickly. Click "-" 24 times to go from 25 to 1.
    for (let i = 0; i < 24; i++) {
      fireEvent.click(screen.getByLabelText(/Reducir/));
    }
    expect(screen.getByText('01:00')).toBeTruthy();

    // Start the timer — POST is fired but stays pending.
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Iniciar'));
    });
    expect(mockApiCall).toHaveBeenCalledTimes(1);
    expect(mockApiCall.mock.calls[0][0]).toBe('/study-sessions');

    // Advance 60 seconds → timer reaches 0 → auto-switch effect runs.
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    // Assert: NO PUT to /study-sessions/pending was issued.
    const putCalls = mockApiCall.mock.calls.filter(
      ([, opts]) => (opts as RequestInit | undefined)?.method === 'PUT',
    );
    expect(putCalls).toHaveLength(0);

    // Cleanup: resolve the dangling promise so React/test-env doesn't warn.
    await act(async () => {
      resolvePost({ id: 'session-late' });
      await Promise.resolve();
    });
  });
});
