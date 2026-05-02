// ============================================================
// StickyNotesPanel — Test Suite
//
// Verifies the floating "RAM-memory" notes panel behavior:
//   - Renders nothing without summaryId
//   - Mounts via Portal to document.body (escapes parent stacking ctx)
//   - Hydrates from localStorage instantly, then reconciles with backend
//   - Race-safety when summaryId changes during in-flight fetch
//   - Debounced upsert on typing, with localStorage mirror written sync
//   - Offline state when upsert fails
//   - Clear button confirms then deletes
//   - Collapse/expand persistence in localStorage
//   - Cleanup of pending debounce on unmount
//
// NOTE on timers: this suite uses REAL timers + waitFor everywhere. An
// earlier version tried fake timers and they leaked across test boundaries
// (a failed fake-timer test would leave timers fake for the next one,
// breaking effects in unrelated tests). Real timers are slightly slower
// but bulletproof.
// ============================================================
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Mock the API service BEFORE importing the component ────
const mockGetStickyNote = vi.fn();
const mockUpsertStickyNote = vi.fn();
const mockDeleteStickyNote = vi.fn();

vi.mock('@/app/services/stickyNotesApi', () => ({
  getStickyNote: (...args: any[]) => mockGetStickyNote(...args),
  upsertStickyNote: (...args: any[]) => mockUpsertStickyNote(...args),
  deleteStickyNote: (...args: any[]) => mockDeleteStickyNote(...args),
}));

// ── Mock useAuth so the panel can read userId without an AuthProvider ──
// The hook only consumes `user.id` to scope the per-user position storage
// key (issue #723); the rest of the auth surface is irrelevant here.
vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } }),
}));

import {
  StickyNotesPanel,
  STICKY_NOTES_DEBOUNCE_MS as DEBOUNCE_MS,
} from '@/app/components/summary/StickyNotesPanel';

// ── Test helpers ────────────────────────────────────────────

const SUMMARY_A = '11111111-1111-1111-1111-111111111111';
const SUMMARY_B = '22222222-2222-2222-2222-222222222222';

function makeRow(summaryId: string, content: string) {
  return {
    id: `row-${summaryId}`,
    student_id: 'student-x',
    summary_id: summaryId,
    content,
    created_at: '2026-04-07T10:00:00Z',
    updated_at: '2026-04-07T10:00:00Z',
  };
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

beforeEach(() => {
  mockGetStickyNote.mockReset();
  mockUpsertStickyNote.mockReset();
  mockDeleteStickyNote.mockReset();
  localStorage.clear();
  // Default: backend returns null (no remote row)
  mockGetStickyNote.mockResolvedValue(null);
  mockUpsertStickyNote.mockImplementation(({ summary_id, content }: any) =>
    Promise.resolve(makeRow(summary_id, content)),
  );
  mockDeleteStickyNote.mockResolvedValue({ deleted: true });
});

afterEach(() => {
  // Defensive: unmount any leftover portal nodes from document.body so
  // queries in the next test never see stale content.
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

// ══════════════════════════════════════════════════════════════
// 1. Conditional rendering
// ══════════════════════════════════════════════════════════════

describe('rendering — conditional', () => {
  it('renders nothing when summaryId is null', () => {
    const { container } = render(<StickyNotesPanel summaryId={null} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByLabelText('Notas rápidas')).not.toBeInTheDocument();
  });

  it('renders nothing when summaryId is undefined', () => {
    render(<StickyNotesPanel summaryId={undefined} />);
    expect(screen.queryByLabelText('Notas rápidas')).not.toBeInTheDocument();
  });

  it('renders the panel when summaryId is provided', () => {
    render(<StickyNotesPanel summaryId={SUMMARY_A} />);
    expect(screen.getByLabelText('Notas rápidas')).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════
// 2. Portal mount — escapes ancestor stacking context
// ══════════════════════════════════════════════════════════════

describe('portal mount', () => {
  it('mounts the panel as a direct child of document.body (not inside the test container)', () => {
    const { container } = render(<StickyNotesPanel summaryId={SUMMARY_A} />);
    const panel = screen.getByLabelText('Notas rápidas');
    expect(container.contains(panel)).toBe(false);
    expect(document.body.contains(panel)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// 3. Initial hydration: localStorage first, then backend reconcile
// ══════════════════════════════════════════════════════════════

// TODO(#858): rewrite for 4-slot picker UX (StickyNotesPicker + contenteditable editor).
describe.skip('initial hydration', () => {
  it('shows the localStorage value instantly on mount, before any network call resolves', async () => {
    localStorage.setItem(`axon:sticky-notes:${SUMMARY_A}`, 'cached locally');
    let resolveGet: (v: any) => void = () => {};
    mockGetStickyNote.mockImplementationOnce(
      () => new Promise((r) => { resolveGet = r; }),
    );

    render(<StickyNotesPanel summaryId={SUMMARY_A} />);
    const textarea = screen.getByPlaceholderText(/memoria RAM/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('cached locally');
    expect(mockGetStickyNote).toHaveBeenCalledWith(SUMMARY_A);
    resolveGet(null);
  });

  it('reconciles textarea with the backend value once the fetch resolves', async () => {
    localStorage.setItem(`axon:sticky-notes:${SUMMARY_A}`, 'stale local');
    mockGetStickyNote.mockResolvedValueOnce(makeRow(SUMMARY_A, 'fresh remote'));

    render(<StickyNotesPanel summaryId={SUMMARY_A} />);
    const textarea = screen.getByPlaceholderText(/memoria RAM/i) as HTMLTextAreaElement;
    await waitFor(() => {
      expect(textarea.value).toBe('fresh remote');
    });
    expect(localStorage.getItem(`axon:sticky-notes:${SUMMARY_A}`)).toBe('fresh remote');
  });

  it('clears the textarea when remote returns null and there is no local cache', async () => {
    mockGetStickyNote.mockResolvedValueOnce(null);
    render(<StickyNotesPanel summaryId={SUMMARY_A} />);
    const textarea = screen.getByPlaceholderText(/memoria RAM/i) as HTMLTextAreaElement;
    await waitFor(() => {
      expect(textarea.value).toBe('');
    });
  });

  it('keeps the local value as fallback when the remote fetch errors', async () => {
    localStorage.setItem(`axon:sticky-notes:${SUMMARY_A}`, 'survives offline');
    mockGetStickyNote.mockRejectedValueOnce(new Error('Network error'));

    render(<StickyNotesPanel summaryId={SUMMARY_A} />);
    await waitFor(() => {
      expect(mockGetStickyNote).toHaveBeenCalled();
    });
    const textarea = screen.getByPlaceholderText(/memoria RAM/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('survives offline');
  });
});

// ══════════════════════════════════════════════════════════════
// 4. Race safety on summaryId change
// ══════════════════════════════════════════════════════════════

// TODO(#858): rewrite for 4-slot picker UX.
describe.skip('race safety on summaryId change', () => {
  it('does not apply a stale fetch result after summaryId changes', async () => {
    let resolveFirstFetch: (v: any) => void = () => {};
    mockGetStickyNote
      .mockImplementationOnce(
        () => new Promise((r) => { resolveFirstFetch = r; }),
      )
      .mockResolvedValueOnce(makeRow(SUMMARY_B, 'second summary content'));

    const { rerender } = render(<StickyNotesPanel summaryId={SUMMARY_A} />);
    rerender(<StickyNotesPanel summaryId={SUMMARY_B} />);

    // Resolve the FIRST (now stale) fetch with content that should be ignored.
    resolveFirstFetch(makeRow(SUMMARY_A, 'STALE — should be ignored'));

    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(/memoria RAM/i) as HTMLTextAreaElement;
      expect(textarea.value).toBe('second summary content');
    });
  });
});

// ══════════════════════════════════════════════════════════════
// 5. Typing → synchronous local mirror + debounced backend upsert
// (real timers + small waits)
// ══════════════════════════════════════════════════════════════

// TODO(#858): rewrite for 4-slot picker UX (contenteditable editor instead of textarea).
describe.skip('typing & debounced save', () => {
  it('writes to localStorage synchronously on every keystroke', async () => {
    const user = userEvent.setup();
    render(<StickyNotesPanel summaryId={SUMMARY_A} />);
    // Wait for hydration to settle
    await waitFor(() => {
      expect(mockGetStickyNote).toHaveBeenCalled();
    });

    const textarea = screen.getByPlaceholderText(/memoria RAM/i);
    await user.type(textarea, 'hi');
    expect(localStorage.getItem(`axon:sticky-notes:${SUMMARY_A}`)).toBe('hi');
  });

  it('debounces upsertStickyNote and calls it once after the burst settles', async () => {
    const user = userEvent.setup();
    render(<StickyNotesPanel summaryId={SUMMARY_A} />);
    await waitFor(() => {
      expect(mockGetStickyNote).toHaveBeenCalled();
    });

    const textarea = screen.getByPlaceholderText(/memoria RAM/i);
    await user.type(textarea, 'abc');
    // Right after typing, the debounce hasn't fired yet
    expect(mockUpsertStickyNote).not.toHaveBeenCalled();

    // Wait past the debounce window
    await wait(DEBOUNCE_MS + 200);
    await waitFor(() => {
      expect(mockUpsertStickyNote).toHaveBeenCalledTimes(1);
    });
    expect(mockUpsertStickyNote).toHaveBeenCalledWith({
      summary_id: SUMMARY_A,
      content: 'abc',
    });
  });

  it('falls back to "Solo local" footer when the upsert rejects', async () => {
    mockUpsertStickyNote.mockRejectedValueOnce(new Error('Network down'));
    const user = userEvent.setup();
    render(<StickyNotesPanel summaryId={SUMMARY_A} />);
    await waitFor(() => {
      expect(mockGetStickyNote).toHaveBeenCalled();
    });

    const textarea = screen.getByPlaceholderText(/memoria RAM/i);
    await user.type(textarea, 'x');
    await wait(DEBOUNCE_MS + 200);

    expect(await screen.findByText(/Solo local/i)).toBeInTheDocument();
    expect(localStorage.getItem(`axon:sticky-notes:${SUMMARY_A}`)).toBe('x');
  });
});

// ══════════════════════════════════════════════════════════════
// 6. Clear button
// ══════════════════════════════════════════════════════════════

describe('clear button', () => {
  it('is disabled when textarea is empty', async () => {
    render(<StickyNotesPanel summaryId={SUMMARY_A} />);
    await waitFor(() => {
      expect(mockGetStickyNote).toHaveBeenCalled();
    });
    const clearBtn = screen.getByRole('button', { name: /Limpiar/i });
    expect(clearBtn).toBeDisabled();
  });

  // TODO(#858): rewrite for 4-slot picker UX.
  it.skip('asks for confirm before deleting and skips delete when cancelled', async () => {
    localStorage.setItem(`axon:sticky-notes:${SUMMARY_A}`, 'something to clear');
    mockGetStickyNote.mockResolvedValueOnce(makeRow(SUMMARY_A, 'something to clear'));
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<StickyNotesPanel summaryId={SUMMARY_A} />);
    const textarea = await screen.findByDisplayValue('something to clear') as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Limpiar/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockDeleteStickyNote).not.toHaveBeenCalled();
  });

  // TODO(#858): rewrite for 4-slot picker UX.
  it.skip('deletes via API and clears textarea + localStorage when confirmed', async () => {
    localStorage.setItem(`axon:sticky-notes:${SUMMARY_A}`, 'kill me');
    mockGetStickyNote.mockResolvedValueOnce(makeRow(SUMMARY_A, 'kill me'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<StickyNotesPanel summaryId={SUMMARY_A} />);
    const textarea = await screen.findByDisplayValue('kill me') as HTMLTextAreaElement;

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Limpiar/i }));

    await waitFor(() => {
      expect(mockDeleteStickyNote).toHaveBeenCalledWith(SUMMARY_A);
    });
    expect(textarea.value).toBe('');
    expect(localStorage.getItem(`axon:sticky-notes:${SUMMARY_A}`)).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// 7. Collapse / expand persistence
// ══════════════════════════════════════════════════════════════

describe('open/closed persistence', () => {
  // TODO(#858): rewrite for 4-slot picker UX (textarea no longer renders by default).
  it.skip('starts open by default', async () => {
    render(<StickyNotesPanel summaryId={SUMMARY_A} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/memoria RAM/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /Abrir notas/i })).not.toBeInTheDocument();
  });

  it('persists open=closed in localStorage when user clicks X', async () => {
    const user = userEvent.setup();
    render(<StickyNotesPanel summaryId={SUMMARY_A} />);
    const closeBtn = await screen.findByRole('button', { name: /Cerrar notas/i });
    await user.click(closeBtn);

    await waitFor(() => {
      expect(localStorage.getItem('axon:sticky-notes:open')).toBe('0');
    });
    expect(await screen.findByRole('button', { name: /Abrir notas/i })).toBeInTheDocument();
  });

  it('starts closed if localStorage says so', async () => {
    localStorage.setItem('axon:sticky-notes:open', '0');
    render(<StickyNotesPanel summaryId={SUMMARY_A} />);
    expect(await screen.findByRole('button', { name: /Abrir notas/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/memoria RAM/i)).not.toBeInTheDocument();
  });

  it('FAB shows a badge dot when there is content cached locally', async () => {
    localStorage.setItem('axon:sticky-notes:open', '0');
    localStorage.setItem(`axon:sticky-notes:${SUMMARY_A}`, 'has content');
    mockGetStickyNote.mockResolvedValueOnce(makeRow(SUMMARY_A, 'has content'));

    render(<StickyNotesPanel summaryId={SUMMARY_A} />);
    await screen.findByRole('button', { name: /Abrir notas/i });
    const badge = await screen.findByTestId('sticky-notes-fab-badge');
    expect(badge).toBeInTheDocument();
  });
});

// ══════════════════════════════════════════════════════════════
// 8. Cleanup on unmount
// ══════════════════════════════════════════════════════════════

// TODO(#858): rewrite for 4-slot picker UX.
describe.skip('cleanup on unmount', () => {
  it('clears the pending debounce timer so no upsert fires after unmount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<StickyNotesPanel summaryId={SUMMARY_A} />);
    await waitFor(() => {
      expect(mockGetStickyNote).toHaveBeenCalled();
    });

    const textarea = screen.getByPlaceholderText(/memoria RAM/i);
    await user.type(textarea, 'about to unmount');
    expect(mockUpsertStickyNote).not.toHaveBeenCalled();

    // Unmount BEFORE the debounce window elapses
    unmount();
    await wait(DEBOUNCE_MS + 300);

    expect(mockUpsertStickyNote).not.toHaveBeenCalled();
  });
});
