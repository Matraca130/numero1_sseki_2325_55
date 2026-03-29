// ============================================================
// E2E Integration Tests — Flashcard Session Flow
//
// Tests the FULL flashcard session journey: start → reveal →
// rate → progress → summary → restart/exit.
//
// Components under test:
//   - SessionScreen (FlashcardSessionScreen.tsx)
//   - SummaryScreen (FlashcardSummaryScreen.tsx)
//
// RUN: npx vitest run src/__tests__/e2e-flashcard-session.test.tsx
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import type { Flashcard } from '@/app/types/content';

// ── Mock motion/react ──────────────────────────────────────
// Explicit component map (NOT Proxy — Proxy causes vitest to hang
// due to infinite property enumeration during module interop).
vi.mock('motion/react', () => {
  const React = require('react');
  function m(tag: string) {
    return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
      const {
        initial, animate, exit, transition, whileHover, whileTap,
        whileInView, variants, layout, layoutId, onAnimationComplete,
        ...rest
      } = props;
      return React.createElement(tag, { ...rest, ref });
    });
  }
  return {
    motion: {
      div: m('div'), span: m('span'), p: m('p'), h3: m('h3'),
      button: m('button'), img: m('img'), circle: m('circle'),
      section: m('section'), article: m('article'), a: m('a'),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// ── Mock lucide-react ──────────────────────────────────────
// Explicit named exports (NOT Proxy — same hang issue).
vi.mock('lucide-react', () => {
  const React = require('react');
  const icon = (props: Record<string, unknown>) =>
    React.createElement('span', { 'data-testid': `icon`, ...props });
  return {
    CheckCircle: icon, Brain: icon, X: icon, Eye: icon,
    AlertTriangle: icon, Stethoscope: icon, Keyboard: icon,
    Trophy: icon, TrendingUp: icon, TrendingDown: icon,
    Star: icon, Sparkles: icon,
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

// ── Mock AxonLogo ──────────────────────────────────────────
vi.mock('@/app/components/shared/AxonLogo', () => ({
  AxonLogo: () => <span data-testid="axon-logo" />,
}));

// ── Mock ErrorBoundary ─────────────────────────────────────
vi.mock('@/app/components/shared/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Mock mastery-colors (real logic is small, mock for isolation) ──
vi.mock('@/app/components/content/flashcard/mastery-colors', () => ({
  getMasteryColor: (m: number) => ({
    level: m,
    hex: '#14b8a6',
    accent: 'bg-teal-500',
    accentLight: 'bg-teal-50',
    dot: 'bg-teal-500',
    text: 'text-teal-600',
    border: 'border-teal-300',
    hoverAccent: 'hover:bg-teal-600',
    label: 'Bien',
  }),
  getMasteryColorFromPct: () => ({
    level: 4,
    hex: '#14b8a6',
    accent: 'bg-teal-500',
    accentLight: 'bg-teal-50',
    dot: 'bg-teal-500',
    text: 'text-teal-600',
    border: 'border-teal-300',
    hoverAccent: 'hover:bg-teal-600',
    label: 'Bien',
  }),
}));

// ── Import components AFTER mocks ──────────────────────────
import { SessionScreen } from '@/app/components/content/flashcard/FlashcardSessionScreen';
import { SummaryScreen } from '@/app/components/content/flashcard/FlashcardSummaryScreen';

// ── Fixture helpers ────────────────────────────────────────

function makeCard(id: string, front = 'Q', back = 'A', mastery = 0): Flashcard {
  return {
    id,
    question: front,
    answer: back,
    front,
    back,
    mastery,
    keyword_id: 'kw-1',
    summary_id: 'sum-1',
  };
}

const THREE_CARDS: Flashcard[] = [
  makeCard('card-1', 'What is mitosis?', 'Cell division process'),
  makeCard('card-2', 'What is ATP?', 'Energy molecule'),
  makeCard('card-3', 'What is DNA?', 'Genetic material'),
];

const ONE_CARD: Flashcard[] = [
  makeCard('card-only', 'Solo question?', 'Solo answer'),
];

// ── Default props factories ────────────────────────────────

function makeSessionProps(overrides: Partial<Parameters<typeof SessionScreen>[0]> = {}) {
  return {
    cards: THREE_CARDS,
    currentIndex: 0,
    isRevealed: false,
    setIsRevealed: vi.fn(),
    handleRate: vi.fn(),
    sessionStats: [] as number[],
    courseColor: '#14b8a6',
    onBack: vi.fn(),
    ...overrides,
  };
}

function makeSummaryProps(overrides: Partial<Parameters<typeof SummaryScreen>[0]> = {}) {
  return {
    stats: [4, 3, 5],
    onRestart: vi.fn(),
    courseColor: '#14b8a6',
    courseId: 'course-1',
    courseName: 'Biology 101',
    topicId: 'topic-1',
    topicTitle: 'Cell Biology',
    onExit: vi.fn(),
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════
// TESTS
// ════════════════════════════════════════════════════════════

describe('E2E Flashcard Session Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════
  // 1. Student starts session -> sees first card question
  // ════════════════════════════════════════════════════════

  it('1. shows the first card question when session starts', () => {
    const props = makeSessionProps();
    render(<SessionScreen {...props} />);

    // The question text should be visible
    expect(screen.getByText('What is mitosis?')).toBeInTheDocument();
    // The "Pregunta" label should be visible
    expect(screen.getByText('Pregunta')).toBeInTheDocument();
    // Progress counter shows 1 / 3
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/\/ 3/)).toBeInTheDocument();
    // Reveal button should be present
    expect(screen.getByText('Mostrar Respuesta')).toBeInTheDocument();
    // Answer should NOT be visible yet
    expect(screen.queryByText('Cell division process')).not.toBeInTheDocument();
  });

  // ════════════════════════════════════════════════════════
  // 2. Student reveals answer -> sees answer content
  // ════════════════════════════════════════════════════════

  it('2. shows answer content and rating buttons when revealed', () => {
    const props = makeSessionProps({ isRevealed: true });
    render(<SessionScreen {...props} />);

    // Answer should now be visible
    expect(screen.getByText('Cell division process')).toBeInTheDocument();
    // "Respuesta" label
    expect(screen.getByText('Respuesta')).toBeInTheDocument();
    // Rating buttons (1-5) should be present
    expect(screen.getByText('No sé')).toBeInTheDocument();
    expect(screen.getByText('Difícil')).toBeInTheDocument();
    expect(screen.getByText('Regular')).toBeInTheDocument();
    expect(screen.getByText('Fácil')).toBeInTheDocument();
    expect(screen.getByText('Perfecto')).toBeInTheDocument();
    // Reveal button should NOT be visible when already revealed
    expect(screen.queryByText('Mostrar Respuesta')).not.toBeInTheDocument();
  });

  // ════════════════════════════════════════════════════════
  // 3. Student rates card (1-5) -> handleRate called
  // ════════════════════════════════════════════════════════

  it('3. calls handleRate with correct value when rating button clicked', () => {
    const handleRate = vi.fn();
    const props = makeSessionProps({ isRevealed: true, handleRate });
    render(<SessionScreen {...props} />);

    // Find the rating button that contains "Perfecto" (value=5)
    const ratingButtons = screen.getAllByRole('button');
    const perfectoBtn = ratingButtons.find(
      (btn) => btn.textContent?.includes('Perfecto'),
    );
    expect(perfectoBtn).toBeDefined();
    fireEvent.click(perfectoBtn!);

    expect(handleRate).toHaveBeenCalledWith(5);
  });

  // ════════════════════════════════════════════════════════
  // 4. Keyboard shortcuts: Space/Enter to reveal, 1-5 to rate
  // ════════════════════════════════════════════════════════

  it('4a. Space key reveals the answer', () => {
    const setIsRevealed = vi.fn();
    const props = makeSessionProps({ setIsRevealed });
    render(<SessionScreen {...props} />);

    fireEvent.keyDown(window, { key: ' ' });

    expect(setIsRevealed).toHaveBeenCalledWith(true);
  });

  it('4b. Enter key reveals the answer', () => {
    const setIsRevealed = vi.fn();
    const props = makeSessionProps({ setIsRevealed });
    render(<SessionScreen {...props} />);

    fireEvent.keyDown(window, { key: 'Enter' });

    expect(setIsRevealed).toHaveBeenCalledWith(true);
  });

  it('4c. Number keys 1-5 rate the card when revealed', () => {
    const handleRate = vi.fn();
    const props = makeSessionProps({ isRevealed: true, handleRate });
    render(<SessionScreen {...props} />);

    fireEvent.keyDown(window, { key: '3' });
    expect(handleRate).toHaveBeenCalledWith(3);

    fireEvent.keyDown(window, { key: '1' });
    expect(handleRate).toHaveBeenCalledWith(1);

    fireEvent.keyDown(window, { key: '5' });
    expect(handleRate).toHaveBeenCalledWith(5);
  });

  it('4d. Number keys do NOT rate when card is NOT revealed', () => {
    const handleRate = vi.fn();
    const props = makeSessionProps({ isRevealed: false, handleRate });
    render(<SessionScreen {...props} />);

    fireEvent.keyDown(window, { key: '3' });
    expect(handleRate).not.toHaveBeenCalled();
  });

  // ════════════════════════════════════════════════════════
  // 5. Progress bar updates as cards are rated
  // ════════════════════════════════════════════════════════

  it('5. progress counter updates when advancing to next card', () => {
    // Simulate being on card 2 of 3 after rating card 1
    const props = makeSessionProps({
      currentIndex: 1,
      sessionStats: [4],
    });
    render(<SessionScreen {...props} />);

    // Should show card 2 question
    expect(screen.getByText('What is ATP?')).toBeInTheDocument();
    // Counter shows 2 / 3
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/\/ 3/)).toBeInTheDocument();
    // Remaining count
    expect(screen.getByText(/1 restantes/)).toBeInTheDocument();
  });

  // ════════════════════════════════════════════════════════
  // 6. Last card rated -> session summary shown
  // ════════════════════════════════════════════════════════

  it('6. SummaryScreen renders after all cards rated', () => {
    const props = makeSummaryProps({ stats: [4, 3, 5] });
    render(<SummaryScreen {...props} />);

    // Session complete heading
    expect(screen.getByText(/Completada/)).toBeInTheDocument();
    // Card count
    expect(screen.getByText(/3 flashcards/)).toBeInTheDocument();
  });

  // ════════════════════════════════════════════════════════
  // 7. Summary shows mastery %, deltas, rating distribution
  // ════════════════════════════════════════════════════════

  it('7. summary shows mastery percentage and delta stats', () => {
    const props = makeSummaryProps({
      stats: [4, 3, 5],
      realMasteryPercent: 72,
      totalMastered: 15,
      totalCards: 25,
      masteryDeltas: [
        { cardId: 'c1', before: 0.4, after: 0.8, grade: 4 },  // improved + newly mastered
        { cardId: 'c2', before: 0.7, after: 0.6, grade: 3 },  // declined
        { cardId: 'c3', before: 0.9, after: 0.95, grade: 5 },  // improved
      ],
    });
    render(<SummaryScreen {...props} />);

    // Mastery percentage from realMasteryPercent
    expect(screen.getByText('72%')).toBeInTheDocument();
    // Delta badges
    expect(screen.getByText(/2 mejoraron/)).toBeInTheDocument();
    expect(screen.getByText(/1 nueva dominada/)).toBeInTheDocument();
    expect(screen.getByText(/1 bajaron/)).toBeInTheDocument();
    // Total mastered context
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText(/cards dominadas en total/)).toBeInTheDocument();
  });

  // ════════════════════════════════════════════════════════
  // 8. Restart session -> resets state and creates new session
  // ════════════════════════════════════════════════════════

  it('8. clicking "Practicar de Nuevo" calls onRestart', () => {
    const onRestart = vi.fn();
    const props = makeSummaryProps({ onRestart });
    render(<SummaryScreen {...props} />);

    const restartBtn = screen.getByText('Practicar de Nuevo');
    fireEvent.click(restartBtn);

    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  // ════════════════════════════════════════════════════════
  // 9. Exit session -> returns to deck view
  // ════════════════════════════════════════════════════════

  it('9. clicking "Volver al Deck" calls onExit', () => {
    const onExit = vi.fn();
    const props = makeSummaryProps({ onExit });
    render(<SummaryScreen {...props} />);

    const exitBtn = screen.getByText('Volver al Deck');
    fireEvent.click(exitBtn);

    expect(onExit).toHaveBeenCalledTimes(1);
  });

  // ════════════════════════════════════════════════════════
  // 10. Edge case: single card session
  // ════════════════════════════════════════════════════════

  it('10. single card session shows 1/1 progress and no remaining count', () => {
    const props = makeSessionProps({
      cards: ONE_CARD,
      currentIndex: 0,
    });
    render(<SessionScreen {...props} />);

    // Question visible
    expect(screen.getByText('Solo question?')).toBeInTheDocument();
    // Counter: 1 / 1
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/\/ 1/)).toBeInTheDocument();
    // No "restantes" text since remaining = 0
    expect(screen.queryByText(/restantes/)).not.toBeInTheDocument();
  });

  // ════════════════════════════════════════════════════════
  // 11. Edge case: all cards rated 5 (perfect score)
  // ════════════════════════════════════════════════════════

  it('11. perfect score summary shows 100% mastery', () => {
    const props = makeSummaryProps({
      stats: [5, 5, 5],
      realMasteryPercent: 100,
      masteryDeltas: [
        { cardId: 'c1', before: 0.5, after: 0.95, grade: 5 },
        { cardId: 'c2', before: 0.6, after: 0.92, grade: 5 },
        { cardId: 'c3', before: 0.8, after: 0.98, grade: 5 },
      ],
    });
    render(<SummaryScreen {...props} />);

    // 100% mastery
    expect(screen.getByText('100%')).toBeInTheDocument();
    // All improved
    expect(screen.getByText(/3 mejoraron/)).toBeInTheDocument();
    // 2 newly mastered (c1 and c2 crossed 0.75 threshold)
    expect(screen.getByText(/2 nuevas dominadas/)).toBeInTheDocument();
    // No "bajaron" badge
    expect(screen.queryByText(/bajaron/)).not.toBeInTheDocument();
  });

  // ════════════════════════════════════════════════════════
  // 12. Edge case: empty stats renders fallback in summary
  // ════════════════════════════════════════════════════════

  it('12. SummaryScreen with empty stats shows fallback message', () => {
    const onExit = vi.fn();
    const props = makeSummaryProps({ stats: [], onExit });
    render(<SummaryScreen {...props} />);

    // Fallback message
    expect(screen.getByText(/No hay datos/)).toBeInTheDocument();
    // "Volver al Deck" button still available
    const exitBtn = screen.getByText('Volver al Deck');
    fireEvent.click(exitBtn);
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
