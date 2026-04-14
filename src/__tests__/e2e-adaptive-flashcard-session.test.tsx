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
  AdaptivePartialSummary: ({
    allStats,
    completedRounds,
    lastGenerationResult,
    onGenerateMore,
    onFinish,
  }: any) => (
    <div data-testid="partial-summary">
      <span data-testid="partial-stats-count">{allStats?.length ?? 0}</span>
      <span data-testid="partial-rounds-count">{completedRounds?.length ?? 0}</span>
      <span data-testid="partial-last-gen">
        {lastGenerationResult ? 'has-gen' : 'no-gen'}
      </span>
      <button data-testid="partial-generate-more" onClick={() => onGenerateMore?.(10)}>
        Generar más
      </button>
      <button data-testid="partial-finish" onClick={() => onFinish?.()}>
        Finalizar
      </button>
    </div>
  ),
  AdaptiveCompletedScreen: ({
    allStats,
    completedRounds,
    onRestart,
    onExit,
  }: any) => (
    <div data-testid="completed-screen">
      <span data-testid="completed-stats-count">{allStats?.length ?? 0}</span>
      <span data-testid="completed-rounds-count">{completedRounds?.length ?? 0}</span>
      <button data-testid="completed-restart" onClick={() => onRestart?.()}>
        Reiniciar
      </button>
      <button data-testid="completed-exit" onClick={() => onExit?.()}>
        Salir
      </button>
    </div>
  ),
}));

// SessionScreen stub: mirrors the real component's public surface enough
// for wiring assertions. We expose rate buttons that forward to the
// `handleRate` prop so tests can verify the host → hook round-trip.
// (We intentionally do NOT import the real FlashcardSessionScreen: its
// transitive deps — AxonLogo, design-system, flashcard-types — would
// balloon the mock surface. The host imports SessionScreen from this
// exact barrel, so asserting against the stub still proves wiring.)
vi.mock('@/app/components/content/flashcard', () => ({
  SessionScreen: (props: any) => (
    <div data-testid="session-screen">
      <span data-testid="session-card-count">{props.cards?.length ?? 0}</span>
      <span data-testid="session-current-index">{props.currentIndex}</span>
      <span data-testid="session-course-color">{props.courseColor}</span>
      <button data-testid="session-show-answer" onClick={() => props.setIsRevealed?.(true)}>
        Mostrar respuesta
      </button>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          data-testid={`session-rate-${n}`}
          onClick={() => props.handleRate?.(n)}
        >
          Rate {n}
        </button>
      ))}
      <button data-testid="session-back" onClick={() => props.onBack?.()}>
        Back
      </button>
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
    mockHandleRate.mockClear();
    mockSetIsRevealed.mockClear();
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

  // ══ Phase coverage: reviewing / partial-summary / completed ══
  //
  // These 3 tests pin the phase→screen mapping and wire-through of the
  // hook's callbacks. They mock useAdaptiveSession with a fixed phase
  // payload BEFORE render, then interact with the stubbed screens to
  // assert that the expected hook method (or navigate) is invoked.

  it('phase=reviewing renders SessionScreen and forwards rating to hook.handleRate', async () => {
    const reviewingCards = [
      { id: 'fc-1', front: 'q1', back: 'a1', question: 'q1', answer: 'a1', mastery: 0 },
      { id: 'fc-2', front: 'q2', back: 'a2', question: 'q2', answer: 'a2', mastery: 0 },
    ];

    mockGetFlashcardsByTopic.mockResolvedValueOnce({
      items: [
        { id: 'fc-1', summary_id: 's1', keyword_id: 'k1', front: 'q1', back: 'a1', source: 'manual', is_active: true, deleted_at: null, created_at: '', updated_at: '' },
        { id: 'fc-2', summary_id: 's1', keyword_id: 'k2', front: 'q2', back: 'a2', source: 'manual', is_active: true, deleted_at: null, created_at: '', updated_at: '' },
      ],
      total: 2,
      limit: 100,
      offset: 0,
    });

    mockSessionState = {
      ...mockSessionState,
      phase: 'reviewing',
      currentCard: reviewingCards[0],
      currentIndex: 0,
      isRevealed: false,
      sessionCards: reviewingCards,
      sessionStats: [],
      currentRound: { roundNumber: 1, source: 'professor', cardCount: 2, ratings: [] },
      currentRoundSource: 'professor',
    };

    render(<AdaptiveFlashcardView />);

    // The real FlashcardSessionScreen is imported from the flashcard
    // barrel; our stub renders under data-testid="session-screen".
    await waitFor(() => {
      expect(screen.getByTestId('session-screen')).toBeTruthy();
    });

    // Host must pass through the session state to the screen props.
    expect(screen.getByTestId('session-card-count').textContent).toBe('2');
    expect(screen.getByTestId('session-current-index').textContent).toBe('0');
    // Host passes ADAPTIVE_ACCENT (teal #14b8a6) as courseColor.
    expect(screen.getByTestId('session-course-color').textContent).toBe('#14b8a6');

    // Simulate rating "3" via the stub's rate button, which calls the
    // handleRate prop the host wired to session.handleRate.
    fireEvent.click(screen.getByTestId('session-rate-3'));
    expect(mockHandleRate).toHaveBeenCalledTimes(1);
    expect(mockHandleRate).toHaveBeenCalledWith(3);

    // Back button should still navigate to /student/flashcards.
    fireEvent.click(screen.getByTestId('session-back'));
    expect(mockNavigate).toHaveBeenCalledWith('/student/flashcards');
  });

  it('phase=partial-summary renders AdaptivePartialSummary and wires onGenerateMore/onFinish', async () => {
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
      phase: 'partial-summary',
      allStats: [3, 4, 3, 5],
      completedRounds: [
        { roundNumber: 1, source: 'professor', cardCount: 4, ratings: [3, 4, 3, 5] },
      ],
      lastGenerationResult: {
        cards: [],
        errors: [],
        stats: {
          requested: 10,
          generated: 8,
          failed: 2,
          uniqueKeywords: 5,
          avgPKnow: 0.6,
          totalTokens: 1000,
          elapsedMs: 4200,
        },
      },
    };

    render(<AdaptiveFlashcardView />);

    await waitFor(() => {
      expect(screen.getByTestId('partial-summary')).toBeTruthy();
    });
    // Hook state travelled through the host into the screen.
    expect(screen.getByTestId('partial-stats-count').textContent).toBe('4');
    expect(screen.getByTestId('partial-rounds-count').textContent).toBe('1');
    expect(screen.getByTestId('partial-last-gen').textContent).toBe('has-gen');

    // onGenerateMore → hook.generateMore(count)
    fireEvent.click(screen.getByTestId('partial-generate-more'));
    expect(mockGenerateMore).toHaveBeenCalledTimes(1);
    expect(mockGenerateMore).toHaveBeenCalledWith(10);

    // onFinish → host.handleFinishAndExit → hook.finishSession()
    fireEvent.click(screen.getByTestId('partial-finish'));
    await waitFor(() => {
      expect(mockFinishSession).toHaveBeenCalledTimes(1);
    });
    // finishSession is the hook's responsibility; host does NOT navigate
    // away synchronously (the hook flips phase → completed on its own).
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('phase=completed renders AdaptiveCompletedScreen and wires onRestart/onExit', async () => {
    mockGetFlashcardsByTopic.mockResolvedValueOnce({
      items: [
        { id: 'fc-1', summary_id: 's1', keyword_id: 'k1', front: 'q1', back: 'a1', source: 'manual', is_active: true, deleted_at: null, created_at: '', updated_at: '' },
        { id: 'fc-2', summary_id: 's1', keyword_id: 'k2', front: 'q2', back: 'a2', source: 'manual', is_active: true, deleted_at: null, created_at: '', updated_at: '' },
      ],
      total: 2,
      limit: 100,
      offset: 0,
    });

    mockSessionState = {
      ...mockSessionState,
      phase: 'completed',
      allStats: [3, 4, 5, 3, 4],
      completedRounds: [
        { roundNumber: 1, source: 'professor', cardCount: 2, ratings: [3, 4] },
        { roundNumber: 2, source: 'ai', cardCount: 3, ratings: [5, 3, 4] },
      ],
    };

    render(<AdaptiveFlashcardView />);

    await waitFor(() => {
      expect(screen.getByTestId('completed-screen')).toBeTruthy();
    });
    expect(screen.getByTestId('completed-stats-count').textContent).toBe('5');
    expect(screen.getByTestId('completed-rounds-count').textContent).toBe('2');

    // onRestart: the hook does NOT expose a `restart` method. The host
    // re-invokes session.startSession(cards) with the previously loaded
    // professor cards. Assert that, not a non-existent hook.restart().
    fireEvent.click(screen.getByTestId('completed-restart'));
    expect(mockStartSession).toHaveBeenCalledTimes(1);
    const passed = mockStartSession.mock.calls[0][0];
    expect(Array.isArray(passed)).toBe(true);
    expect(passed).toHaveLength(2);
    expect(passed[0].id).toBe('fc-1');

    // onExit → navigate back to /student/flashcards
    fireEvent.click(screen.getByTestId('completed-exit'));
    expect(mockNavigate).toHaveBeenCalledWith('/student/flashcards');
  });
});
