// ============================================================
// AdaptiveFlashcardView — Smoke test
//
// Verifies that the Fase 5 host component:
//   1. renders without crashing
//   2. mounts AdaptiveIdleLanding on the initial 'idle' phase
//   3. calls the hook's startSession when onStart fires
//   4. swaps to AdaptiveGenerationScreen when phase flips to
//      'generating'
//
// Mocks: react-router, useAuth, useAdaptiveSession, flashcardApi,
//        motion/react, lucide-react, shared components. This keeps
//        the dependency surface tight.
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Router mocks ──────────────────────────────────────────
const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams({
  topicId: 'topic-xyz',
  courseId: 'course-abc',
  topicTitle: 'Neurología Básica',
});

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams, vi.fn()] as const,
}));

// ── Auth mock ─────────────────────────────────────────────
vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'student-1', name: 'Test' } }),
}));

// ── motion/react + lucide-react (minimal) ────────────────
vi.mock('motion/react', () => {
  const motion = new Proxy(
    {},
    {
      get(_t, prop: string) {
        return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
          const { initial, animate, transition, whileHover, whileTap, exit, layout, ...rest } = props;
          return React.createElement(prop as string, { ...rest, ref });
        });
      },
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock('lucide-react', () => {
  const factory = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return <span data-testid={`icon-${name}`} {...props} />;
    };
  return new Proxy(
    {},
    { get: (_t, prop: string) => factory(prop) },
  );
});

// ── Shared components (stub) ──────────────────────────────
vi.mock('@/app/components/shared/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/app/components/shared/PageStates', () => ({
  LoadingPage: () => <div data-testid="loading-page" />,
  EmptyState: ({ title, actionLabel, onAction }: any) => (
    <div data-testid="empty-state">
      <span>{title}</span>
      {actionLabel && <button onClick={onAction}>{actionLabel}</button>}
    </div>
  ),
  ErrorState: ({ message, onRetry }: any) => (
    <div data-testid="error-state">
      <span>{message}</span>
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

// ── Adaptive screens (stubs with test hooks) ──────────────
vi.mock('@/app/components/content/flashcard/adaptive', () => ({
  AdaptiveIdleLanding: ({ topicTitle, cardCount, onStart, onBack }: any) => (
    <div data-testid="idle-landing">
      <span data-testid="idle-title">{topicTitle}</span>
      <span data-testid="idle-count">{cardCount}</span>
      <button data-testid="idle-start" onClick={onStart}>Start</button>
      <button data-testid="idle-back" onClick={onBack}>Back</button>
    </div>
  ),
  AdaptiveGenerationScreen: ({ progress, onCancel }: any) => (
    <div data-testid="generating-screen">
      <span>{progress.completed}/{progress.total}</span>
      {onCancel && <button onClick={onCancel}>Cancel</button>}
    </div>
  ),
  AdaptivePartialSummary: () => <div data-testid="partial-summary" />,
  AdaptiveCompletedScreen: () => <div data-testid="completed-screen" />,
}));

vi.mock('@/app/components/content/flashcard', () => ({
  SessionScreen: (props: any) => (
    <div data-testid="session-screen">
      <span data-testid="session-card-count">{props.cards?.length ?? 0}</span>
    </div>
  ),
}));

// ── flashcardApi mock ─────────────────────────────────────
const mockGetFlashcardsByTopic = vi.fn();
vi.mock('@/app/services/flashcardApi', () => ({
  getFlashcardsByTopic: (...args: any[]) => mockGetFlashcardsByTopic(...args),
}));

// ── useAdaptiveSession mock — stateful, controllable ──────
const mockStartSession = vi.fn();
const mockGenerateMore = vi.fn();
const mockAbortGeneration = vi.fn();
const mockFinishSession = vi.fn().mockResolvedValue(undefined);
const mockHandleRate = vi.fn();
const mockSetIsRevealed = vi.fn();

let mockSessionState: any = {
  phase: 'idle',
  currentCard: null,
  currentIndex: 0,
  totalCards: 0,
  isRevealed: false,
  currentRound: null,
  currentRoundSource: null,
  completedRounds: [],
  roundCount: 0,
  allStats: [],
  allReviewCount: 0,
  allCorrectCount: 0,
  keywordMastery: new Map(),
  topicSummary: null,
  masteryLoading: false,
  generationProgress: null,
  lastGenerationResult: null,
  generationError: null,
  optimisticUpdates: { current: new Map() },
  masteryDeltas: { current: [] },
  sessionCards: [],
  sessionStats: [],
};

vi.mock('@/app/hooks/useAdaptiveSession', () => ({
  useAdaptiveSession: () => ({
    ...mockSessionState,
    startSession: mockStartSession,
    generateMore: mockGenerateMore,
    abortGeneration: mockAbortGeneration,
    finishSession: mockFinishSession,
    handleRate: mockHandleRate,
    setIsRevealed: mockSetIsRevealed,
  }),
}));

// Import AFTER mocks
import { AdaptiveFlashcardView } from '@/app/components/content/AdaptiveFlashcardView';

function resetSession() {
  mockSessionState = {
    ...mockSessionState,
    phase: 'idle',
    currentCard: null,
    generationProgress: null,
  };
}

describe('AdaptiveFlashcardView', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockStartSession.mockClear();
    mockGenerateMore.mockClear();
    mockAbortGeneration.mockClear();
    mockFinishSession.mockClear();
    mockGetFlashcardsByTopic.mockReset();
    mockSearchParams = new URLSearchParams({
      topicId: 'topic-xyz',
      courseId: 'course-abc',
      topicTitle: 'Neurología Básica',
    });
    resetSession();
  });

  it('renders the idle landing once professor cards load', async () => {
    mockGetFlashcardsByTopic.mockResolvedValueOnce({
      items: [
        { id: 'fc-1', summary_id: 's1', keyword_id: 'k1', front: 'q1', back: 'a1', source: 'manual', is_active: true, deleted_at: null, created_at: '', updated_at: '' },
        { id: 'fc-2', summary_id: 's1', keyword_id: 'k2', front: 'q2', back: 'a2', source: 'manual', is_active: true, deleted_at: null, created_at: '', updated_at: '' },
        { id: 'fc-3', summary_id: 's1', keyword_id: 'k3', front: 'q3', back: 'a3', source: 'manual', is_active: true, deleted_at: null, created_at: '', updated_at: '' },
      ],
      total: 3,
      limit: 100,
      offset: 0,
    });

    render(<AdaptiveFlashcardView />);

    await waitFor(() => {
      expect(screen.getByTestId('idle-landing')).toBeTruthy();
    });
    expect(screen.getByTestId('idle-title').textContent).toBe('Neurología Básica');
    expect(screen.getByTestId('idle-count').textContent).toBe('3');
  });

  it('triggers startSession with loaded cards when onStart fires', async () => {
    mockGetFlashcardsByTopic.mockResolvedValueOnce({
      items: [
        { id: 'fc-1', summary_id: 's1', keyword_id: 'k1', front: 'q1', back: 'a1', source: 'manual', is_active: true, deleted_at: null, created_at: '', updated_at: '' },
      ],
      total: 1,
      limit: 100,
      offset: 0,
    });

    render(<AdaptiveFlashcardView />);
    await waitFor(() => screen.getByTestId('idle-start'));

    fireEvent.click(screen.getByTestId('idle-start'));

    expect(mockStartSession).toHaveBeenCalledTimes(1);
    const passed = mockStartSession.mock.calls[0][0];
    expect(Array.isArray(passed)).toBe(true);
    expect(passed).toHaveLength(1);
    expect(passed[0].id).toBe('fc-1');
    expect(passed[0].question).toBe('q1');
    expect(passed[0].answer).toBe('a1');
  });

  it('renders AdaptiveGenerationScreen when phase is generating', async () => {
    mockGetFlashcardsByTopic.mockResolvedValueOnce({ items: [], total: 0, limit: 100, offset: 0 });
    // Empty cards short-circuits to empty-state — override with 1 card
    mockGetFlashcardsByTopic.mockReset();
    mockGetFlashcardsByTopic.mockResolvedValueOnce({
      items: [
        { id: 'fc-1', summary_id: 's1', keyword_id: 'k1', front: 'q1', back: 'a1', source: 'manual', is_active: true, deleted_at: null, created_at: '', updated_at: '' },
      ],
      total: 1,
      limit: 100,
      offset: 0,
    });

    mockSessionState = {
      ...mockSessionState,
      phase: 'generating',
      generationProgress: { completed: 2, total: 5, generated: 2, failed: 0 },
    };

    render(<AdaptiveFlashcardView />);

    await waitFor(() => {
      expect(screen.getByTestId('generating-screen')).toBeTruthy();
    });
    expect(screen.getByText('2/5')).toBeTruthy();
  });

  it('navigates back to /student/flashcards when idle onBack fires', async () => {
    mockGetFlashcardsByTopic.mockResolvedValueOnce({
      items: [
        { id: 'fc-1', summary_id: 's1', keyword_id: 'k1', front: 'q1', back: 'a1', source: 'manual', is_active: true, deleted_at: null, created_at: '', updated_at: '' },
      ],
      total: 1,
      limit: 100,
      offset: 0,
    });

    render(<AdaptiveFlashcardView />);
    await waitFor(() => screen.getByTestId('idle-back'));

    fireEvent.click(screen.getByTestId('idle-back'));
    expect(mockNavigate).toHaveBeenCalledWith('/student/flashcards');
  });

  it('shows empty-state when topicId is missing', async () => {
    mockSearchParams = new URLSearchParams({ courseId: 'c1' });
    render(<AdaptiveFlashcardView />);

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeTruthy();
    });
    expect(mockGetFlashcardsByTopic).not.toHaveBeenCalled();
  });

  it('shows error-state and supports retry when fetch fails', async () => {
    mockGetFlashcardsByTopic.mockRejectedValueOnce(new Error('boom'));

    render(<AdaptiveFlashcardView />);
    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeTruthy();
    });

    // Retry re-invokes the fetch
    mockGetFlashcardsByTopic.mockResolvedValueOnce({
      items: [
        { id: 'fc-1', summary_id: 's1', keyword_id: 'k1', front: 'q1', back: 'a1', source: 'manual', is_active: true, deleted_at: null, created_at: '', updated_at: '' },
      ],
      total: 1,
      limit: 100,
      offset: 0,
    });

    fireEvent.click(screen.getByText('Retry'));
    await waitFor(() => {
      expect(screen.getByTestId('idle-landing')).toBeTruthy();
    });
  });
});
