// ============================================================
// FlashcardSummaryScreen — Unit Tests
//
// Tests the post-session summary screen: mastery display,
// action buttons, keyboard shortcuts (R = restart, Esc = exit),
// empty stats guard, and delta stats rendering.
//
// Mocks: motion/react (plain elements), lucide-react (spans),
//        mastery-colors, useFlashcardEngine types.
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────

// motion/react — render plain elements, strip animation props
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
  };
});

// lucide-react — render spans with data-testid
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

// mastery-colors — deterministic stub
vi.mock('../mastery-colors', () => ({
  getMasteryColorFromPct: (_ratio: number) => ({
    hex: '#14b8a6',
    accent: 'bg-teal-500',
    text: 'text-teal-600',
  }),
}));

// useFlashcardEngine — type-only import, mock the module
vi.mock('@/app/hooks/useFlashcardEngine', () => ({
  // CardMasteryDelta is a type, nothing to export at runtime
}));

// ── Import SUT ────────────────────────────────────────────────
import { SummaryScreen, type SummaryScreenProps } from '../FlashcardSummaryScreen';

// ── Helpers ───────────────────────────────────────────────────

const defaultProps = (): SummaryScreenProps => ({
  stats: [3, 4, 5, 4, 3],
  onRestart: vi.fn(),
  courseColor: '#14b8a6',
  courseId: 'course-1',
  courseName: 'Anatomía',
  topicId: 'topic-1',
  topicTitle: 'Sistema Nervioso',
  onExit: vi.fn(),
});

function renderSummary(overrides: Partial<SummaryScreenProps> = {}) {
  const props = { ...defaultProps(), ...overrides };
  return { ...render(<SummaryScreen {...props} />), props };
}

// ── Tests ─────────────────────────────────────────────────────

describe('SummaryScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // 1. Basic rendering
  it('renders the "Sesión Completada!" heading', () => {
    renderSummary();
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toContain('Completada');
  });

  it('renders the mastery percentage', () => {
    // stats [3,4,5,4,3] → average 3.8 → mastery = (3.8/5)*100 = 76%
    renderSummary();
    expect(screen.getByText('76%')).toBeInTheDocument();
  });

  it('uses realMasteryPercent when provided', () => {
    renderSummary({ realMasteryPercent: 85 });
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('shows total cards completed in description', () => {
    renderSummary({ stats: [3, 4, 5] });
    expect(screen.getByText(/3 flashcards/)).toBeInTheDocument();
  });

  // 2. Empty stats guard
  it('renders empty state when stats is empty', () => {
    renderSummary({ stats: [] });
    expect(screen.getByText((content) => content.includes('No hay datos'))).toBeInTheDocument();
  });

  it('shows exit button in empty state', () => {
    const { props } = renderSummary({ stats: [] });
    const exitButton = screen.getByText('Volver al Deck');
    fireEvent.click(exitButton);
    expect(props.onExit).toHaveBeenCalledTimes(1);
  });

  // 3. Action buttons
  it('calls onRestart when "Practicar de Nuevo" is clicked', () => {
    const { props } = renderSummary();
    const restartButton = screen.getByText('Practicar de Nuevo');
    fireEvent.click(restartButton);
    expect(props.onRestart).toHaveBeenCalledTimes(1);
  });

  it('calls onExit when "Volver al Deck" is clicked', () => {
    const { props } = renderSummary();
    const exitButton = screen.getByText('Volver al Deck');
    fireEvent.click(exitButton);
    expect(props.onExit).toHaveBeenCalledTimes(1);
  });

  // 4. Keyboard shortcuts
  it('calls onRestart when "R" key is pressed', () => {
    const { props } = renderSummary();
    fireEvent.keyDown(window, { key: 'R' });
    expect(props.onRestart).toHaveBeenCalledTimes(1);
  });

  it('calls onRestart when lowercase "r" key is pressed', () => {
    const { props } = renderSummary();
    fireEvent.keyDown(window, { key: 'r' });
    expect(props.onRestart).toHaveBeenCalledTimes(1);
  });

  it('calls onExit when Escape key is pressed', () => {
    const { props } = renderSummary();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(props.onExit).toHaveBeenCalledTimes(1);
  });

  it('does not call onRestart for unrelated keys', () => {
    const { props } = renderSummary();
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: '1' });
    expect(props.onRestart).not.toHaveBeenCalled();
  });

  it('does not call onExit for unrelated keys', () => {
    const { props } = renderSummary();
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(props.onExit).not.toHaveBeenCalled();
  });

  it('cleans up keyboard listeners on unmount', () => {
    const { props, unmount } = renderSummary();
    unmount();
    fireEvent.keyDown(window, { key: 'R' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(props.onRestart).not.toHaveBeenCalled();
    expect(props.onExit).not.toHaveBeenCalled();
  });

  // 5. Keyboard shortcuts work even with empty stats
  it('keyboard shortcuts work in empty stats state', () => {
    const { props } = renderSummary({ stats: [] });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(props.onExit).toHaveBeenCalledTimes(1);
  });

  // 6. Delta stats rendering
  it('renders improved count when masteryDeltas has improvements', () => {
    renderSummary({
      masteryDeltas: [
        { cardId: 'c1', before: 0.5, after: 0.8, grade: 4 },
        { cardId: 'c2', before: 0.6, after: 0.9, grade: 5 },
      ],
    });
    expect(screen.getByText(/2 mejoraron/)).toBeInTheDocument();
  });

  it('renders newly mastered count', () => {
    renderSummary({
      masteryDeltas: [
        { cardId: 'c1', before: 0.5, after: 0.8, grade: 4 },
      ],
    });
    expect(screen.getByText(/1 nueva dominada/)).toBeInTheDocument();
  });

  it('renders declined count when mastery dropped', () => {
    renderSummary({
      masteryDeltas: [
        { cardId: 'c1', before: 0.8, after: 0.6, grade: 1 },
      ],
    });
    expect(screen.getByText(/1 bajaron/)).toBeInTheDocument();
  });

  // 7. Total mastered context
  it('renders total mastered context when provided', () => {
    renderSummary({ totalMastered: 25, totalCards: 50 });
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  // 8. Adaptive CTA
  it('shows adaptive CTA when onStartAdaptive is provided and mastery < 90', () => {
    renderSummary({
      onStartAdaptive: vi.fn(),
      realMasteryPercent: 70,
    });
    const buttons = screen.getAllByRole('button');
    const adaptiveBtn = buttons.find(b => b.textContent?.includes('Adaptativa'));
    expect(adaptiveBtn).toBeTruthy();
  });

  it('hides adaptive CTA when mastery >= 90', () => {
    renderSummary({
      onStartAdaptive: vi.fn(),
      realMasteryPercent: 95,
    });
    const buttons = screen.getAllByRole('button');
    const adaptiveBtn = buttons.find(b => b.textContent?.includes('Adaptativa'));
    expect(adaptiveBtn).toBeUndefined();
  });
});
