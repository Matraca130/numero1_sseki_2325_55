// ============================================================
// E2E Integration Tests — Quiz Session Flow
//
// Tests the FULL quiz session journey: start -> question displayed ->
// answer selected -> feedback shown -> advance through questions ->
// results summary -> BKT mastery update -> retry/review flow.
//
// Components under test:
//   - QuizTaker (src/app/components/student/QuizTaker.tsx)
//   - QuizResults (src/app/components/student/QuizResults.tsx)
//   - QuizProgressBar, QuizTopBar, QuizBottomBar (sub-components)
//   - useQuizSession (session lifecycle hook)
//   - useQuizBkt (BKT mastery computation)
//
// RUN: npx vitest run src/__tests__/e2e-quiz-session.test.tsx
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

// ── Mock @supabase/supabase-js (prevents network init) ─────
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ data: [], error: null }) }),
  }),
}));

// ── Mock supabase singleton ────────────────────────────────
vi.mock('@/app/lib/supabase', () => ({
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon-key',
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

// ── Mock AuthContext ────────────────────────────────────────
vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    institutionId: 'inst-1',
    role: 'student',
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Mock contexts used by useStudyPlanBridge ────────────────
vi.mock('@/app/context/NavigationContext', () => ({
  useNavigation: () => ({
    currentTopic: null,
    currentCourse: null,
    navigateTo: vi.fn(),
  }),
}));

vi.mock('@/app/context/StudyPlansContext', () => ({
  useStudyPlansContext: () => ({
    findPendingTask: vi.fn().mockReturnValue(null),
    toggleTaskComplete: vi.fn(),
  }),
}));

// ── Mock gamificationApi (used by GamificationContext) ──────
vi.mock('@/app/services/gamificationApi', () => ({
  getProfile: vi.fn().mockResolvedValue({ total_xp: 100, level: 3 }),
  getStreakStatus: vi.fn().mockResolvedValue(null),
  checkBadges: vi.fn().mockResolvedValue([]),
}));

// ── Mock motion/react ──────────────────────────────────────
vi.mock('motion/react', () => {
  const React = require('react');
  const motion = new Proxy(
    {},
    {
      get(_target: unknown, prop: string) {
        return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
          const {
            initial, animate, exit, transition, whileHover, whileTap,
            whileInView, variants, layout, layoutId, onAnimationComplete,
            ...rest
          } = props;
          return React.createElement(prop, { ...rest, ref });
        });
      },
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

// ── Mock lucide-react (explicit, not Proxy — Proxy causes infinite loop) ──
vi.mock('lucide-react', () => {
  const React = require('react');
  const i = (props: Record<string, unknown>) => React.createElement('span', { 'data-testid': 'icon', ...props });
  return {
    __esModule: true,
    AlertCircle: i, AlertTriangle: i, BookOpen: i, Bookmark: i, BookmarkCheck: i,
    Brain: i, Check: i, CheckCircle2: i, ChevronDown: i, ChevronLeft: i,
    ChevronRight: i, Clock: i, Eye: i, Flame: i, Highlighter: i, Image: i,
    ImageIcon: i, Layers: i, Lightbulb: i, Link2: i, Loader2: i,
    MessageSquare: i, Minus: i, Moon: i, Pause: i, Play: i, PlayCircle: i,
    Plus: i, RotateCcw: i, RotateCw: i, Save: i, Search: i, Sparkles: i,
    StickyNote: i, Sun: i, Tag: i, Target: i, Trash2: i, TrendingDown: i,
    TrendingUp: i, Trophy: i, Volume2: i, VolumeX: i, X: i, XCircle: i,
    ZoomIn: i, ZoomOut: i,
  };
});

// ── Mock sonner ────────────────────────────────────────────
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  Toaster: () => null,
}));

// ── Mock recharts ──────────────────────────────────────────
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => children,
  PieChart: ({ children }: { children: React.ReactNode }) => children,
  Pie: () => null,
  Cell: () => null,
}));

// ── Mock clsx (passthrough) ────────────────────────────────
vi.mock('clsx', () => ({
  default: (...args: unknown[]) => args.filter(Boolean).join(' '),
  __esModule: true,
}));

// ── Mock design-kit ────────────────────────────────────────
vi.mock('@/app/components/design-kit', () => ({
  Confetti: () => null,
  focusRing: 'focus-ring-mock',
}));

// ── Mock ErrorBoundary ─────────────────────────────────────
vi.mock('@/app/components/shared/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Mock QuizErrorBoundary ─────────────────────────────────
vi.mock('@/app/components/student/QuizErrorBoundary', () => ({
  QuizErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Mock GamificationContext ───────────────────────────────
vi.mock('@/app/context/GamificationContext', () => ({
  useGamification: () => ({
    loading: false,
    totalXp: 100,
    level: 3,
    xpDelta: 0,
    streak: null,
    newBadges: [],
    levelUpEvent: null,
    refresh: vi.fn(),
    triggerBadgeCheck: vi.fn(),
    dismissLevelUp: vi.fn(),
    dismissNewBadges: vi.fn(),
  }),
}));

// ── Mock useQuizGamificationFeedback ───────────────────────
vi.mock('@/app/components/student/useQuizGamificationFeedback', () => ({
  useQuizGamificationFeedback: () => ({
    confirmedXpDelta: 50,
    isConfirmed: true,
    isLoading: false,
    earnedBadges: [],
    levelUp: null,
    showLevelCelebration: false,
    dismissBadges: vi.fn(),
    dismissLevelUp: vi.fn(),
  }),
}));

// ── Mock gamification sub-components ───────────────────────
vi.mock('@/app/components/gamification/BadgeEarnedToast', () => ({
  BadgeEarnedToast: () => null,
}));
vi.mock('@/app/components/gamification/LevelUpCelebration', () => ({
  LevelUpCelebration: () => null,
}));

// ── Mock XP_TABLE ──────────────────────────────────────────
vi.mock('@/app/types/gamification', () => ({
  XP_TABLE: { quiz_answer: 5, quiz_correct: 15 },
}));

// ── Mock QuizXpConfirmedCard ───────────────────────────────
vi.mock('@/app/components/student/QuizXpConfirmedCard', () => ({
  QuizXpConfirmedCard: (props: { xpEstimate: number; confirmedXp: number }) =>
    <div data-testid="xp-card">XP: {props.confirmedXp}</div>,
}));

// ── Mock QuizScoreCircle ───────────────────────────────────
vi.mock('@/app/components/student/QuizScoreCircle', () => ({
  QuizScoreCircle: (props: { percentage: number; correctCount: number; totalCount: number }) =>
    <div data-testid="score-circle">{props.correctCount}/{props.totalCount} ({Math.round(props.percentage)}%)</div>,
}));

// ── Mock QuizHistoryPanel ──────────────────────────────────
vi.mock('@/app/components/student/QuizHistoryPanel', () => ({
  QuizHistoryPanel: () => null,
}));

// ── Mock QuizCertificate ───────────────────────────────────
vi.mock('@/app/components/student/QuizCertificate', () => ({
  QuizCertificate: () => null,
}));

// ── Mock KeywordMasterySection ─────────────────────────────
vi.mock('@/app/components/student/KeywordMasterySection', () => ({
  KeywordMasterySection: () => <div data-testid="keyword-mastery" />,
}));

// ── Mock SubtopicResultsSection ────────────────────────────
vi.mock('@/app/components/student/SubtopicResultsSection', () => ({
  SubtopicResultsSection: () => null,
}));

// ── Mock AdaptiveQuizModal + hook ──────────────────────────
vi.mock('@/app/components/student/AdaptiveQuizModal', () => ({
  AdaptiveQuizModal: () => null,
}));
vi.mock('@/app/components/student/useAdaptiveQuiz', () => ({
  useAdaptiveQuiz: () => ({
    phase: 'idle',
    count: 5,
    result: null,
    error: null,
    quizId: null,
    setCount: vi.fn(),
    generate: vi.fn(),
    reset: vi.fn(),
    setPhase: vi.fn(),
  }),
}));

// ── Mock AiPracticeModal ───────────────────────────────────
vi.mock('@/app/components/student/AiPracticeModal', () => ({
  AiPracticeModal: () => null,
}));

// ── Mock QuizAnswerDetail ──────────────────────────────────
vi.mock('@/app/components/student/QuizAnswerDetail', () => ({
  QuizAnswerDetail: () => <div data-testid="answer-detail">Answer details</div>,
}));

// ── Mock QuizRecoveryPrompt ────────────────────────────────
vi.mock('@/app/components/student/QuizRecoveryPrompt', () => ({
  QuizRecoveryPrompt: ({ onAccept, onDismiss }: { onAccept: () => void; onDismiss: () => void }) => (
    <div data-testid="recovery-prompt">
      <button onClick={onAccept}>Recuperar</button>
      <button onClick={onDismiss}>Empezar de nuevo</button>
    </div>
  ),
}));

// ── Mock TimerDisplay ──────────────────────────────────────
vi.mock('@/app/components/student/TimerDisplay', () => ({
  TimerDisplay: ({ startTime }: { startTime: number }) =>
    <span data-testid="timer">0:00</span>,
}));

// ── Mock QuizCountdownTimer ────────────────────────────────
vi.mock('@/app/components/student/QuizCountdownTimer', () => ({
  QuizCountdownTimer: ({ onTimeout }: { onTimeout?: () => void }) =>
    <span data-testid="countdown">Countdown</span>,
}));

// ── Mock logger ────────────────────────────────────────────
vi.mock('@/app/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

// ── Mock error-utils ───────────────────────────────────────
vi.mock('@/app/lib/error-utils', () => ({
  getErrorMsg: (e: unknown) => (e as Error)?.message || 'unknown error',
}));

// ── Mock useQuizBackup ─────────────────────────────────────
vi.mock('@/app/components/student/useQuizBackup', () => ({
  saveQuizBackup: vi.fn(),
  clearQuizBackup: vi.fn(),
  loadQuizBackup: vi.fn().mockReturnValue(null),
  cleanExpiredBackups: vi.fn(),
  validateAndReorderBackup: vi.fn().mockReturnValue(null),
}));

// ── Mock useStudyPlanBridge ────────────────────────────────
vi.mock('@/app/hooks/useStudyPlanBridge', () => ({
  useStudyPlanBridge: () => ({
    markSessionComplete: vi.fn(),
  }),
}));

// ── Mock quizApi ───────────────────────────────────────────
const mockCreateStudySession = vi.fn();
const mockCloseStudySession = vi.fn();
const mockGetQuizQuestions = vi.fn();
const mockCreateQuizAttempt = vi.fn();
const mockCreateReview = vi.fn();
const mockUpsertBktState = vi.fn();

vi.mock('@/app/services/quizApi', () => ({
  createStudySession: (...args: unknown[]) => mockCreateStudySession(...args),
  closeStudySession: (...args: unknown[]) => mockCloseStudySession(...args),
  getQuizQuestions: (...args: unknown[]) => mockGetQuizQuestions(...args),
  createQuizAttempt: (...args: unknown[]) => mockCreateQuizAttempt(...args),
  createReview: (...args: unknown[]) => mockCreateReview(...args),
  upsertBktState: (...args: unknown[]) => mockUpsertBktState(...args),
}));

// ── Mock apiCall (for keyword loading + fallback question fetch) ──
const mockApiCall = vi.fn();
vi.mock('@/app/lib/api', () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

// ── Import components AFTER mocks ──────────────────────────
import { QuizTaker } from '@/app/components/student/QuizTaker';
import { QuizResults } from '@/app/components/student/QuizResults';
import { computeBktMastery } from '@/app/components/student/useQuizBkt';
import type { QuizQuestion } from '@/app/services/quizApi';
import type { SavedAnswer } from '@/app/components/student/quiz-types';

// ── Fixture helpers ────────────────────────────────────────

function makeQuestion(overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    id: 'q-1',
    summary_id: 'sum-1',
    keyword_id: 'kw-1',
    question_type: 'mcq',
    question: 'What is the powerhouse of the cell?',
    options: ['Mitochondria', 'Nucleus', 'Ribosome', 'Golgi'],
    correct_answer: 'Mitochondria',
    explanation: 'Mitochondria produce ATP via oxidative phosphorylation.',
    difficulty: 2,
    source: 'ai',
    is_active: true,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

const MCQ_QUESTIONS: QuizQuestion[] = [
  makeQuestion({
    id: 'q-1',
    question: 'What is the powerhouse of the cell?',
    options: ['Mitochondria', 'Nucleus', 'Ribosome', 'Golgi'],
    correct_answer: 'Mitochondria',
    keyword_id: 'kw-1',
  }),
  makeQuestion({
    id: 'q-2',
    question: 'What carries genetic information?',
    options: ['DNA', 'Protein', 'Lipid', 'Carbohydrate'],
    correct_answer: 'DNA',
    keyword_id: 'kw-1',
  }),
  makeQuestion({
    id: 'q-3',
    question: 'What is the basic unit of life?',
    options: ['Cell', 'Atom', 'Molecule', 'Organ'],
    correct_answer: 'Cell',
    keyword_id: 'kw-2',
  }),
];

const TF_QUESTION: QuizQuestion = makeQuestion({
  id: 'q-tf',
  question_type: 'true_false',
  question: 'DNA is a double helix.',
  options: null,
  correct_answer: 'true',
});

const MIXED_QUESTIONS: QuizQuestion[] = [
  MCQ_QUESTIONS[0],
  TF_QUESTION,
  makeQuestion({
    id: 'q-open',
    question_type: 'open',
    question: 'Describe the function of ribosomes.',
    options: null,
    correct_answer: 'protein synthesis',
  }),
];

// ── Default mock setup ─────────────────────────────────────

function setupDefaultMocks() {
  mockCreateStudySession.mockResolvedValue({ id: 'session-123' });
  mockCloseStudySession.mockResolvedValue({});
  mockGetQuizQuestions.mockResolvedValue({ items: MCQ_QUESTIONS });
  mockCreateQuizAttempt.mockResolvedValue({ id: 'attempt-1' });
  mockCreateReview.mockResolvedValue({ id: 'review-1' });
  mockUpsertBktState.mockResolvedValue({});
  mockApiCall.mockResolvedValue({ items: [] }); // keywords
}

// ════════════════════════════════════════════════════════════
// TESTS
// ════════════════════════════════════════════════════════════

describe('E2E Quiz Session Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
    // Fix Math.random to prevent Fisher-Yates shuffle: 0.999 means j=i always (no swap)
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
  });

  // ════════════════════════════════════════════════════════
  // 1. Quiz starts -> first question displayed
  // ════════════════════════════════════════════════════════

  it('1. shows loading state then first question when quiz starts', async () => {
    render(
      <QuizTaker
        quizId="quiz-1"
        quizTitle="Biology Quiz"
        summaryId="sum-1"
        onBack={vi.fn()}
      />,
    );

    // Loading state shown initially
    expect(screen.getByText('Preparando quiz...')).toBeInTheDocument();

    // Wait for the session to load and question to appear
    await waitFor(() => {
      expect(screen.getByText('Biology Quiz')).toBeInTheDocument();
    });

    // Session was created
    expect(mockCreateStudySession).toHaveBeenCalledWith({ session_type: 'quiz' });
    // Questions were fetched
    expect(mockGetQuizQuestions).toHaveBeenCalledWith('sum-1', { quiz_id: 'quiz-1' });

    // First question text should appear (one of the MCQ questions, shuffled)
    await waitFor(() => {
      const questionTexts = MCQ_QUESTIONS.map(q => q.question);
      const displayed = questionTexts.some(text => screen.queryByText(text));
      expect(displayed).toBe(true);
    });

    // Confirm button should be present but disabled (no answer selected)
    const confirmBtn = screen.getByText('Confirmar');
    expect(confirmBtn).toBeInTheDocument();
    expect(confirmBtn.closest('button')).toBeDisabled();
  });

  // ════════════════════════════════════════════════════════
  // 2. Student selects MCQ answer -> feedback shown
  // ════════════════════════════════════════════════════════

  it('2. selecting an MCQ option enables confirm and shows feedback after submit', async () => {
    // Use preloaded questions to skip shuffle and ensure deterministic order
    render(
      <QuizTaker
        preloadedQuestions={MCQ_QUESTIONS}
        quizTitle="Cell Bio Quiz"
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(MCQ_QUESTIONS[0].question)).toBeInTheDocument();
    });

    // MCQ options should be visible
    expect(screen.getByText('Mitochondria')).toBeInTheDocument();
    expect(screen.getByText('Nucleus')).toBeInTheDocument();

    // Select the correct answer
    fireEvent.click(screen.getByText('Mitochondria'));

    // Confirm button should now be enabled
    const confirmBtn = screen.getByText('Confirmar');
    expect(confirmBtn.closest('button')).not.toBeDisabled();

    // Submit the answer
    fireEvent.click(confirmBtn);

    // Wait for submit to complete — the button should change
    await waitFor(() => {
      // After submitting, the question should show as "Respondida"
      expect(screen.getByText('Respondida')).toBeInTheDocument();
    });

    // Quiz attempt API should have been called
    expect(mockCreateQuizAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        quiz_question_id: 'q-1',
        answer: 'Mitochondria',
        is_correct: true,
        session_id: 'session-123',
      }),
    );
  });

  // ════════════════════════════════════════════════════════
  // 3. Student advances through questions
  // ════════════════════════════════════════════════════════

  it('3. student can navigate through questions after answering', async () => {
    render(
      <QuizTaker
        preloadedQuestions={MCQ_QUESTIONS}
        quizTitle="Navigation Quiz"
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(MCQ_QUESTIONS[0].question)).toBeInTheDocument();
    });

    // Progress indicator shows "1 de 3"
    expect(screen.getByText('1 de 3')).toBeInTheDocument();

    // Select and submit first answer
    fireEvent.click(screen.getByText('Mitochondria'));
    fireEvent.click(screen.getByText('Confirmar'));

    await waitFor(() => {
      expect(screen.getByText('Respondida')).toBeInTheDocument();
    });

    // Click "Siguiente" to advance
    const nextBtn = screen.getByText('Siguiente');
    fireEvent.click(nextBtn);

    // Second question should now be displayed
    await waitFor(() => {
      expect(screen.getByText(MCQ_QUESTIONS[1].question)).toBeInTheDocument();
    });

    // Progress shows "2 de 3"
    expect(screen.getByText('2 de 3')).toBeInTheDocument();
  });

  // ════════════════════════════════════════════════════════
  // 4. Quiz completes -> results summary shown
  // ════════════════════════════════════════════════════════

  it('4. shows results screen after answering all questions and finishing', async () => {
    render(
      <QuizTaker
        preloadedQuestions={[MCQ_QUESTIONS[0]]}
        quizTitle="Single Q Quiz"
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(MCQ_QUESTIONS[0].question)).toBeInTheDocument();
    });

    // Answer the only question
    fireEvent.click(screen.getByText('Mitochondria'));
    fireEvent.click(screen.getByText('Confirmar'));

    await waitFor(() => {
      expect(screen.getByText('Respondida')).toBeInTheDocument();
    });

    // Click "Ver resultados" to finish (only question, all answered)
    const finishBtn = screen.getByText('Ver resultados');
    fireEvent.click(finishBtn);

    // Wait for results screen
    await waitFor(() => {
      // Results should show the quiz title
      expect(screen.getByText('Single Q Quiz')).toBeInTheDocument();
      // Score should be visible
      expect(screen.getByTestId('score-circle')).toBeInTheDocument();
    });

    // Session should have been closed
    expect(mockCloseStudySession).toHaveBeenCalledWith(
      'session-123',
      expect.objectContaining({
        total_reviews: 1,
        correct_reviews: 1,
      }),
    );
  });

  // ════════════════════════════════════════════════════════
  // 5. BKT computation updates mastery
  // ════════════════════════════════════════════════════════

  it('5. BKT mastery increases on correct answers and decreases on wrong', () => {
    // Starting from zero mastery
    const afterCorrect = computeBktMastery(0, true);
    expect(afterCorrect).toBeGreaterThan(0);

    // Correct answer yields higher mastery than wrong
    const afterWrong = computeBktMastery(0.5, false);
    const afterCorrectMid = computeBktMastery(0.5, true);
    expect(afterCorrectMid).toBeGreaterThan(afterWrong);

    // Multiple correct answers should approach mastery >= 0.8
    let mastery = 0;
    for (let i = 0; i < 15; i++) {
      mastery = computeBktMastery(mastery, true);
    }
    expect(mastery).toBeGreaterThanOrEqual(0.8);

    // Recovery factor boosts mastery when previousMax is higher
    const withoutRecovery = computeBktMastery(0.3, false);
    const withRecovery = computeBktMastery(0.3, false, 0.9);
    expect(withRecovery).toBeGreaterThan(withoutRecovery);
  });

  // ════════════════════════════════════════════════════════
  // 6. MCQ correct/incorrect handling
  // ════════════════════════════════════════════════════════

  it('6. handles both correct and incorrect MCQ answers with proper API calls', async () => {
    const twoQuestions = [MCQ_QUESTIONS[0], MCQ_QUESTIONS[1]];

    render(
      <QuizTaker
        preloadedQuestions={twoQuestions}
        quizTitle="Correct/Incorrect Quiz"
        onBack={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(twoQuestions[0].question)).toBeInTheDocument();
    });

    // Answer Q1 correctly
    fireEvent.click(screen.getByText('Mitochondria'));
    fireEvent.click(screen.getByText('Confirmar'));

    await waitFor(() => {
      expect(mockCreateQuizAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          quiz_question_id: 'q-1',
          is_correct: true,
        }),
      );
    });

    // Navigate to Q2
    fireEvent.click(screen.getByText('Siguiente'));

    await waitFor(() => {
      expect(screen.getByText(twoQuestions[1].question)).toBeInTheDocument();
    });

    // Answer Q2 incorrectly (select Protein instead of DNA)
    fireEvent.click(screen.getByText('Protein'));
    fireEvent.click(screen.getByText('Confirmar'));

    await waitFor(() => {
      expect(mockCreateQuizAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          quiz_question_id: 'q-2',
          is_correct: false,
        }),
      );
    });

    // Also verify review was created for both
    expect(mockCreateReview).toHaveBeenCalledTimes(2);
  });

  // ════════════════════════════════════════════════════════
  // 7. Quiz timer display
  // ════════════════════════════════════════════════════════

  it('7. renders timer components in the top bar during session', async () => {
    render(
      <QuizTaker
        preloadedQuestions={MCQ_QUESTIONS}
        quizTitle="Timer Quiz"
        onBack={vi.fn()}
        timeLimitSeconds={30}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(MCQ_QUESTIONS[0].question)).toBeInTheDocument();
    });

    // Per-question timer should be present
    expect(screen.getByTestId('timer')).toBeInTheDocument();

    // Countdown timer should be present (since timeLimitSeconds is provided)
    expect(screen.getByTestId('countdown')).toBeInTheDocument();

    // Quiz title in top bar
    expect(screen.getByText('Timer Quiz')).toBeInTheDocument();
  });

  // ════════════════════════════════════════════════════════
  // 8. Score calculation and grade display
  // ════════════════════════════════════════════════════════

  it('8. results screen shows correct score, percentage, and performance message', async () => {
    // Render QuizResults directly with known data
    const savedAnswers: Record<number, SavedAnswer> = {
      0: { answer: 'Mitochondria', selectedOption: 'Mitochondria', correct: true, answered: true, timeTakenMs: 5000 },
      1: { answer: 'Protein', selectedOption: 'Protein', correct: false, answered: true, timeTakenMs: 8000 },
      2: { answer: 'Cell', selectedOption: 'Cell', correct: true, answered: true, timeTakenMs: 3000 },
    };

    render(
      <QuizResults
        questions={MCQ_QUESTIONS}
        savedAnswers={savedAnswers}
        sessionStartTime={Date.now() - 60000}
        quizTitle="Biology Final"
        correctCount={2}
        wrongCount={1}
        answeredCount={3}
        onRestart={vi.fn()}
        onBack={vi.fn()}
        onReview={vi.fn()}
      />,
    );

    // Score circle shows 2/3 (67%)
    expect(screen.getByTestId('score-circle')).toHaveTextContent('2/3 (67%)');

    // Correct/incorrect badges
    expect(screen.getByText('2 correctas')).toBeInTheDocument();
    expect(screen.getByText('1 incorrectas')).toBeInTheDocument();

    // Performance message for 67% (>= 60, < 80)
    expect(screen.getByText('Buen trabajo, sigue practicando!')).toBeInTheDocument();

    // Quiz title
    expect(screen.getByText('Biology Final')).toBeInTheDocument();

    // XP card should be present
    expect(screen.getByTestId('xp-card')).toBeInTheDocument();
  });

  // ════════════════════════════════════════════════════════
  // 9. Retry/review flow
  // ════════════════════════════════════════════════════════

  it('9. results screen provides restart and review buttons', async () => {
    const onRestart = vi.fn();
    const onBack = vi.fn();
    const onReview = vi.fn();

    const savedAnswers: Record<number, SavedAnswer> = {
      0: { answer: 'Mitochondria', selectedOption: 'Mitochondria', correct: true, answered: true, timeTakenMs: 3000 },
    };

    render(
      <QuizResults
        questions={[MCQ_QUESTIONS[0]]}
        savedAnswers={savedAnswers}
        sessionStartTime={Date.now() - 30000}
        quizTitle="Retry Quiz"
        correctCount={1}
        wrongCount={0}
        answeredCount={1}
        onRestart={onRestart}
        onBack={onBack}
        onReview={onReview}
      />,
    );

    // "Repetir quiz" button
    const restartBtn = screen.getByText('Repetir quiz');
    fireEvent.click(restartBtn);
    expect(onRestart).toHaveBeenCalledTimes(1);

    // "Volver" button
    const backBtn = screen.getByText('Volver');
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalledTimes(1);

    // "Revisar respuestas" button
    const reviewBtn = screen.getByText('Revisar respuestas');
    fireEvent.click(reviewBtn);
    expect(onReview).toHaveBeenCalledTimes(1);
  });

  // ════════════════════════════════════════════════════════
  // 10. Error state when quiz has no questions
  // ════════════════════════════════════════════════════════

  it('10. shows error state when quiz has no active questions', async () => {
    mockGetQuizQuestions.mockResolvedValue({ items: [] });
    const onBack = vi.fn();

    render(
      <QuizTaker
        quizId="empty-quiz"
        quizTitle="Empty Quiz"
        summaryId="sum-1"
        onBack={onBack}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Quiz no disponible')).toBeInTheDocument();
    });

    expect(screen.getByText('Este quiz no tiene preguntas activas.')).toBeInTheDocument();

    // Retry button
    const retryBtn = screen.getByText('Reintentar');
    expect(retryBtn).toBeInTheDocument();

    // Back button
    const backBtn = screen.getByText('Volver');
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  // ════════════════════════════════════════════════════════
  // 11. Results detail toggle shows answer breakdown
  // ════════════════════════════════════════════════════════

  it('11. toggling detail section shows answer breakdown in results', async () => {
    const savedAnswers: Record<number, SavedAnswer> = {
      0: { answer: 'Mitochondria', selectedOption: 'Mitochondria', correct: true, answered: true, timeTakenMs: 4000 },
    };

    render(
      <QuizResults
        questions={[MCQ_QUESTIONS[0]]}
        savedAnswers={savedAnswers}
        sessionStartTime={Date.now() - 20000}
        quizTitle="Detail Quiz"
        correctCount={1}
        wrongCount={0}
        answeredCount={1}
        onRestart={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    // Detail section should not be visible initially
    expect(screen.queryByTestId('answer-detail')).not.toBeInTheDocument();

    // Click "Ver detalle de respuestas"
    const detailToggle = screen.getByText('Ver detalle de respuestas');
    fireEvent.click(detailToggle);

    // Detail should now be visible
    await waitFor(() => {
      expect(screen.getByTestId('answer-detail')).toBeInTheDocument();
    });

    // Click again to hide — button text changed to "Ocultar detalle"
    const hideToggle = screen.getByText('Ocultar detalle');
    fireEvent.click(hideToggle);

    await waitFor(() => {
      expect(screen.queryByTestId('answer-detail')).not.toBeInTheDocument();
    });
  });

  // ════════════════════════════════════════════════════════
  // 12. Performance message categories
  // ════════════════════════════════════════════════════════

  it('12. results show correct performance messages for different score ranges', () => {
    const baseProps = {
      questions: MCQ_QUESTIONS,
      sessionStartTime: Date.now() - 30000,
      quizTitle: 'Score Test',
      onRestart: vi.fn(),
      onBack: vi.fn(),
    };

    // Excellent (>= 80%)
    const { unmount: u1 } = render(
      <QuizResults
        {...baseProps}
        savedAnswers={{
          0: { answer: 'A', selectedOption: 'A', correct: true, answered: true, timeTakenMs: 1000 },
          1: { answer: 'B', selectedOption: 'B', correct: true, answered: true, timeTakenMs: 1000 },
          2: { answer: 'C', selectedOption: 'C', correct: true, answered: true, timeTakenMs: 1000 },
        }}
        correctCount={3}
        wrongCount={0}
        answeredCount={3}
      />,
    );
    expect(screen.getByText('Excelente resultado!')).toBeInTheDocument();
    expect(screen.getByText('Excelente!')).toBeInTheDocument();
    u1();

    // Needs review (< 40%)
    const { unmount: u2 } = render(
      <QuizResults
        {...baseProps}
        savedAnswers={{
          0: { answer: 'A', selectedOption: 'A', correct: true, answered: true, timeTakenMs: 1000 },
          1: { answer: 'B', selectedOption: 'B', correct: false, answered: true, timeTakenMs: 1000 },
          2: { answer: 'C', selectedOption: 'C', correct: false, answered: true, timeTakenMs: 1000 },
        }}
        correctCount={1}
        wrongCount={2}
        answeredCount={3}
      />,
    );
    expect(screen.getByText('Necesitas repasar este tema.')).toBeInTheDocument();
    u2();
  });
});
