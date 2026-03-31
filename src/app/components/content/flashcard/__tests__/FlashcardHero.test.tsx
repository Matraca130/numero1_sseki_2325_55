// ============================================================
// FlashcardHero -- Unit Tests
//
// Tests the hero section: title, stats, CTA button, empty state,
// animation props passthrough.
//
// Mocks: motion/react (plain elements via Proxy), lucide-react
//        (spans with data-testid), ProgressBar, focusRing.
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
    useReducedMotion: () => false,
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
    Layers: iconFactory('Layers'),
    Clock: iconFactory('Clock'),
    Brain: iconFactory('Brain'),
    ChevronRight: iconFactory('ChevronRight'),
  };
});

// ProgressBar — simple stub
vi.mock('../ProgressBar', () => ({
  ProgressBar: (props: Record<string, unknown>) => (
    <div data-testid="progress-bar" data-value={props.value} />
  ),
}));

// focusRing constant
vi.mock('../constants', () => ({
  focusRing: 'focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none',
}));

// ── Import SUT ────────────────────────────────────────────────
import { FlashcardHero } from '../FlashcardHero';
import type { FlashcardHeroProps } from '../FlashcardHero';

// ── Helpers ───────────────────────────────────────────────────

const defaultProps = (): FlashcardHeroProps => ({
  userName: 'Dr. Test',
  totalDue: 15,
  totalCards: 100,
  totalMastered: 60,
  globalAccuracy: 85,
  longestStreak: 7,
  decksWithDue: 3,
  totalNewCards: 5,
  deckSpine: [
    { id: 'deck-1', hasDue: true },
    { id: 'deck-2', hasDue: true },
    { id: 'deck-3', hasDue: false },
  ],
  onStartReview: vi.fn(),
});

// ── Tests ─────────────────────────────────────────────────────

describe('FlashcardHero', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Renders hero section with correct title
  it('renders the due count in the heading', () => {
    render(<FlashcardHero {...defaultProps()} />);
    expect(screen.getByText('15 cards pendientes')).toBeInTheDocument();
  });

  it('renders the "Repaso del d\u00EDa" label', () => {
    render(<FlashcardHero {...defaultProps()} />);
    expect(screen.getByText('Repaso del d\u00EDa')).toBeInTheDocument();
  });

  // 2. Shows deck and card breakdown
  it('displays deck count and card breakdown', () => {
    render(<FlashcardHero {...defaultProps()} />);
    // 3 mazos appears in both subtitle and CTA sub-text
    const mazosMatches = screen.getAllByText(/3 mazos/);
    expect(mazosMatches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/5 nuevas/)).toBeInTheDocument();
    expect(screen.getByText(/10 repaso/)).toBeInTheDocument();
  });

  it('uses singular "mazo" when decksWithDue is 1', () => {
    const props = defaultProps();
    props.decksWithDue = 1;
    render(<FlashcardHero {...props} />);
    const mazoMatches = screen.getAllByText(/1 mazo/);
    expect(mazoMatches.length).toBeGreaterThanOrEqual(1);
  });

  // 3. Time estimate
  it('shows time estimate based on totalDue', () => {
    render(<FlashcardHero {...defaultProps()} />);
    // 15 * 0.2 = 3 min
    expect(screen.getByText('~3 min')).toBeInTheDocument();
  });

  it('shows at least 1 min for small due counts', () => {
    const props = defaultProps();
    props.totalDue = 1;
    render(<FlashcardHero {...props} />);
    expect(screen.getByText('~1 min')).toBeInTheDocument();
  });

  // 4. Mastery progress section
  it('displays mastery progress fraction and percentage', () => {
    render(<FlashcardHero {...defaultProps()} />);
    // 60/100 = 60%
    expect(screen.getByText('60/100 \u00B7 60%')).toBeInTheDocument();
  });

  it('renders the ProgressBar component', () => {
    render(<FlashcardHero {...defaultProps()} />);
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
  });

  it('shows "Dominio global" label', () => {
    render(<FlashcardHero {...defaultProps()} />);
    expect(screen.getByText('Dominio global')).toBeInTheDocument();
  });

  // 5. CTA button
  it('renders "Comenzar repaso" when totalDue > 0', () => {
    render(<FlashcardHero {...defaultProps()} />);
    expect(screen.getByText('Comenzar repaso')).toBeInTheDocument();
  });

  it('calls onStartReview when CTA is clicked', () => {
    const props = defaultProps();
    render(<FlashcardHero {...props} />);
    const btn = screen.getByText('Comenzar repaso').closest('button');
    expect(btn).toBeTruthy();
    fireEvent.click(btn!);
    expect(props.onStartReview).toHaveBeenCalledTimes(1);
  });

  it('shows CTA sub-text with due count and deck info', () => {
    render(<FlashcardHero {...defaultProps()} />);
    expect(screen.getByText(/15 cards \u00B7 3 mazos/)).toBeInTheDocument();
  });

  // 6. Empty state: totalDue = 0
  it('renders "Sin cards pendientes" when totalDue is 0', () => {
    const props = defaultProps();
    props.totalDue = 0;
    render(<FlashcardHero {...props} />);
    expect(screen.getByText('Sin cards pendientes')).toBeInTheDocument();
  });

  it('disables the CTA button when totalDue is 0', () => {
    const props = defaultProps();
    props.totalDue = 0;
    render(<FlashcardHero {...props} />);
    const btn = screen.getByText('Sin cards pendientes').closest('button');
    expect(btn).toBeDisabled();
  });

  it('does not show CTA sub-text when totalDue is 0', () => {
    const props = defaultProps();
    props.totalDue = 0;
    render(<FlashcardHero {...props} />);
    expect(screen.queryByText(/cards \u00B7/)).not.toBeInTheDocument();
  });

  // 7. Edge case: totalCards = 0 (mastery should be 0%)
  it('handles totalCards=0 gracefully (0% mastery)', () => {
    const props = defaultProps();
    props.totalCards = 0;
    props.totalMastered = 0;
    render(<FlashcardHero {...props} />);
    expect(screen.getByText('0/0 \u00B7 0%')).toBeInTheDocument();
  });

  // 8. Icons render
  it('renders lucide icons', () => {
    render(<FlashcardHero {...defaultProps()} />);
    expect(screen.getByTestId('icon-Brain')).toBeInTheDocument();
    expect(screen.getByTestId('icon-Clock')).toBeInTheDocument();
    expect(screen.getByTestId('icon-ChevronRight')).toBeInTheDocument();
    // Layers appears multiple times (header + CTA)
    expect(screen.getAllByTestId('icon-Layers').length).toBeGreaterThanOrEqual(1);
  });

  // 9. Heading text changes with different due counts
  it('renders 0 cards pendientes when totalDue is 0', () => {
    const props = defaultProps();
    props.totalDue = 0;
    render(<FlashcardHero {...props} />);
    expect(screen.getByText('0 cards pendientes')).toBeInTheDocument();
  });

  // 10. Review cards calculation: max(totalDue - totalNewCards, 0)
  it('shows 0 repaso when totalNewCards exceeds totalDue', () => {
    const props = defaultProps();
    props.totalDue = 3;
    props.totalNewCards = 5;
    render(<FlashcardHero {...props} />);
    expect(screen.getByText(/0 repaso/)).toBeInTheDocument();
  });
});
