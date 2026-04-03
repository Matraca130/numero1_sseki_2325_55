// ============================================================
// FlashcardSummaryScreen — Unit Tests
//
// Tests the post-session summary screen: mastery display,
// action buttons, keyboard shortcuts (R → onRestart, Escape → onExit),
// empty stats guard, delta stats, adaptive CTA.
//
// Mocks: motion/react (plain elements via Proxy), lucide-react
//        (spans with data-testid), mastery-colors, useFlashcardEngine.
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────

// motion/react — render plain elements, strip animation props (Proxy pattern from SessionScreen)
vi.mock('motion/react', () => {
  const motion = new Proxy(
    {},
    {
      get(_target, prop: string) {
        return React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
          const {
            initial, animate, transition, whileHover, whileTap,
            exit, layout, ...rest
          } = props;
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

// lucide-react — render simple spans with data-testid
vi.mock('lucide-react', () => {
  const iconFactory = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return <span data-testid={`icon-${name}`} {...props} />;
    };
  return {
    Trophy: iconFactory('Trophy'),
    TrendingUp: iconFactory('TrendingUp'),
    TrendingDown: iconFactory('TrendingDown'),
    Star: iconFactory('Star'),
    Sparkles: iconFactory('Sparkles'),
  };
});

// mastery-colors — deterministic hex per mastery level
vi.mock('../mastery-colors', () => ({
  getMasteryColorFromPct: (pct: number) => ({
    hex: pct >= 0.8 ? '#10b981' : pct >= 0.5 ? '#14b8a6' : '#f59e0b',
    accent: 'bg-teal-500',
    text: 'text-teal-600',
  }),
}));

// useFlashcardEngine — just need the CardMasteryDelta type (mocked inline)
vi.mock('@/app/hooks/useFlashcardEngine', () => ({}));

// ── Import SUT ────────────────────────────────────────────────
import { SummaryScreen } from '../FlashcardSummaryScreen';
import type { SummaryScreenProps } from '../FlashcardSummaryScreen';

// ── Helpers ───────────────────────────────────────────────────

const defaultProps = (): SummaryScreenProps => ({
  stats: [4, 3, 5, 4, 3],
  onRestart: vi.fn(),
  courseColor: '#14b8a6',
  courseId: 'course-1',
  courseName: 'Anatomia',
  topicId: 'topic-1',
  topicTitle: 'Sistema Nervioso',
  onExit: vi.fn(),
});

// ── Tests ─────────────────────────────────────────────────────

describe('SummaryScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Renders the completion heading
  it('renders the completion heading', () => {
    render(<SummaryScreen {...defaultProps()} />);
    expect(screen.getByText(/Completada/)).toBeInTheDocument();
  });

  // 2. Shows card count in description
  it('shows the number of flashcards completed', () => {
    render(<SummaryScreen {...defaultProps()} />);
    expect(screen.getByText(/Completaste 5 flashcards/)).toBeInTheDocument();
  });

  // 3. Mastery percentage display
  it('displays mastery percentage', () => {
    render(<SummaryScreen {...defaultProps()} />);
    // average = (4+3+5+4+3)/5 = 3.8 → mastery = 3.8/5*100 = 76
    // The percentage is rendered as {mastery.toFixed(0)}% which may split into separate text nodes
    expect(screen.getByText('Dominio')).toBeInTheDocument();
    // Check that 76 appears in the mastery display
    expect(screen.getByText(/76/)).toBeInTheDocument();
  });

  // 4. Action buttons
  it('renders "Volver al Deck" and "Practicar de Nuevo" buttons', () => {
    render(<SummaryScreen {...defaultProps()} />);
    expect(screen.getByText('Volver al Deck')).toBeInTheDocument();
    expect(screen.getByText('Practicar de Nuevo')).toBeInTheDocument();
  });

  it('calls onExit when "Volver al Deck" is clicked', () => {
    const props = defaultProps();
    render(<SummaryScreen {...props} />);
    fireEvent.click(screen.getByText('Volver al Deck'));
    expect(props.onExit).toHaveBeenCalledTimes(1);
  });

  it('calls onRestart when "Practicar de Nuevo" is clicked', () => {
    const props = defaultProps();
    render(<SummaryScreen {...props} />);
    fireEvent.click(screen.getByText('Practicar de Nuevo'));
    expect(props.onRestart).toHaveBeenCalledTimes(1);
  });

  // 5. Keyboard shortcuts
  it('calls onRestart when "r" key is pressed', () => {
    const props = defaultProps();
    render(<SummaryScreen {...props} />);
    fireEvent.keyDown(window, { key: 'r' });
    expect(props.onRestart).toHaveBeenCalledTimes(1);
  });

  it('calls onRestart when "R" key is pressed', () => {
    const props = defaultProps();
    render(<SummaryScreen {...props} />);
    fireEvent.keyDown(window, { key: 'R' });
    expect(props.onRestart).toHaveBeenCalledTimes(1);
  });

  it('calls onExit when Escape key is pressed', () => {
    const props = defaultProps();
    render(<SummaryScreen {...props} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(props.onExit).toHaveBeenCalledTimes(1);
  });

  it('does not call handlers for unrelated keys', () => {
    const props = defaultProps();
    render(<SummaryScreen {...props} />);
    fireEvent.keyDown(window, { key: 'a' });
    expect(props.onRestart).not.toHaveBeenCalled();
    expect(props.onExit).not.toHaveBeenCalled();
  });

  // 6. Cleanup: keyboard listener removed on unmount
  it('removes keyboard listener on unmount', () => {
    const props = defaultProps();
    const { unmount } = render(<SummaryScreen {...props} />);
    unmount();
    fireEvent.keyDown(window, { key: 'r' });
    expect(props.onRestart).not.toHaveBeenCalled();
  });

  // 7. Empty stats guard
  it('shows empty state message when stats is empty', () => {
    const props = defaultProps();
    props.stats = [];
    render(<SummaryScreen {...props} />);
    expect(screen.getByText(/No hay datos de la sesi/)).toBeInTheDocument();
  });

  it('shows "Volver al Deck" button in empty state', () => {
    const props = defaultProps();
    props.stats = [];
    render(<SummaryScreen {...props} />);
    fireEvent.click(screen.getByText('Volver al Deck'));
    expect(props.onExit).toHaveBeenCalledTimes(1);
  });

  // 8. Keyboard shortcuts still work with empty stats
  it('calls onExit via Escape even with empty stats', () => {
    const props = defaultProps();
    props.stats = [];
    render(<SummaryScreen {...props} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(props.onExit).toHaveBeenCalledTimes(1);
  });

  // 9. Delta stats
  it('shows delta stats when masteryDeltas are provided', () => {
    const props = defaultProps();
    props.masteryDeltas = [
      { cardId: 'c1', before: 0.5, after: 0.8, grade: 4 },
      { cardId: 'c2', before: 0.7, after: 0.6, grade: 2 },
      { cardId: 'c3', before: 0.6, after: 0.85, grade: 5 },
    ];
    render(<SummaryScreen {...props} />);
    // 2 improved, 1 declined, 2 newly mastered (before<0.75, after>=0.75)
    expect(screen.getByText(/2 mejoraron/)).toBeInTheDocument();
    expect(screen.getByText(/1 bajaron/)).toBeInTheDocument();
  });

  // 10. Total mastered context
  it('shows total mastered context when provided', () => {
    const props = defaultProps();
    props.totalMastered = 45;
    props.totalCards = 100;
    render(<SummaryScreen {...props} />);
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText(/cards dominadas en total/)).toBeInTheDocument();
  });

  // 11. Uses realMasteryPercent when provided
  it('uses realMasteryPercent instead of average when provided', () => {
    const props = defaultProps();
    props.realMasteryPercent = 85;
    render(<SummaryScreen {...props} />);
    expect(screen.getByText(/85/)).toBeInTheDocument();
  });

  // 12. Trophy icon renders
  it('renders the Trophy icon', () => {
    render(<SummaryScreen {...defaultProps()} />);
    expect(screen.getByTestId('icon-Trophy')).toBeInTheDocument();
  });

  // 13. Adaptive CTA shown when mastery < 90 and onStartAdaptive provided
  it('shows adaptive CTA when mastery < 90 and onStartAdaptive is provided', () => {
    const props = defaultProps();
    props.onStartAdaptive = vi.fn();
    // mastery = 76% (from default stats average)
    render(<SummaryScreen {...props} />);
    expect(screen.getByText(/Refuerza tus puntos/)).toBeInTheDocument();
  });

  it('does not show adaptive CTA when onStartAdaptive is undefined', () => {
    render(<SummaryScreen {...defaultProps()} />);
    expect(screen.queryByText(/Refuerza tus puntos/)).not.toBeInTheDocument();
  });
});
