// ============================================================
// FlashcardSessionScreen — Unit Tests
//
// Tests the active flashcard review session screen: card
// rendering, reveal/rate flow, progress bar, loading, empty.
//
// Mocks: motion/react (plain elements), lucide-react (spans),
//        AxonLogo, mastery-colors, flashcard-types RATINGS.
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// clsx — passthrough
vi.mock('clsx', () => ({
  default: (...args: unknown[]) =>
    args
      .flat()
      .filter((a) => typeof a === 'string' && a.length > 0)
      .join(' '),
}));

// lucide-react — render simple spans with data-testid
vi.mock('lucide-react', () => {
  const iconFactory = (name: string) =>
    function MockIcon(props: Record<string, unknown>) {
      return <span data-testid={`icon-${name}`} {...props} />;
    };
  return {
    CheckCircle: iconFactory('CheckCircle'),
    Brain: iconFactory('Brain'),
    X: iconFactory('X'),
    Eye: iconFactory('Eye'),
    AlertTriangle: iconFactory('AlertTriangle'),
    Stethoscope: iconFactory('Stethoscope'),
    Keyboard: iconFactory('Keyboard'),
  };
});

// AxonLogo — simple stub
vi.mock('@/app/components/shared/AxonLogo', () => ({
  AxonLogo: () => <span data-testid="axon-logo" />,
}));

// mastery-colors — deterministic hex per mastery level
vi.mock('../mastery-colors', () => ({
  getMasteryColor: (mastery: number) => ({
    hex: mastery >= 4 ? '#10b981' : mastery >= 2 ? '#f59e0b' : '#94a3b8',
  }),
}));

// flashcard-types — real RATINGS constant (small, pure data)
vi.mock('@/app/hooks/flashcard-types', () => ({
  RATINGS: [
    { value: 1, label: 'No se', color: 'bg-rose-500', hover: 'hover:bg-rose-600', text: 'text-rose-500', desc: 'Repetir pronto' },
    { value: 2, label: 'Dificil', color: 'bg-orange-500', hover: 'hover:bg-orange-600', text: 'text-orange-500', desc: 'Necesito repasar' },
    { value: 3, label: 'Regular', color: 'bg-yellow-400', hover: 'hover:bg-yellow-500', text: 'text-yellow-500', desc: 'Algo de duda' },
    { value: 4, label: 'Facil', color: 'bg-lime-500', hover: 'hover:bg-lime-600', text: 'text-lime-600', desc: 'Lo entendi bien' },
    { value: 5, label: 'Perfecto', color: 'bg-emerald-500', hover: 'hover:bg-emerald-600', text: 'text-emerald-500', desc: 'Memorizado' },
  ] as const,
}));

// ── Import SUT ────────────────────────────────────────────────
import { SessionScreen } from '../FlashcardSessionScreen';
import type { Flashcard } from '@/app/types/content';

// ── Helpers ───────────────────────────────────────────────────

function createCard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 'card-1',
    front: 'What is mitosis?',
    back: 'Cell division producing two identical daughter cells.',
    question: 'What is mitosis?',
    answer: 'Cell division producing two identical daughter cells.',
    mastery: 3,
    ...overrides,
  } as Flashcard;
}

const defaultProps = () => ({
  cards: [
    createCard({ id: 'card-1', question: 'Question 1', answer: 'Answer 1' }),
    createCard({ id: 'card-2', question: 'Question 2', answer: 'Answer 2' }),
    createCard({ id: 'card-3', question: 'Question 3', answer: 'Answer 3' }),
  ],
  currentIndex: 0,
  isRevealed: false,
  setIsRevealed: vi.fn(),
  handleRate: vi.fn(),
  sessionStats: [0, 0, 0],
  courseColor: '#14b8a6',
  onBack: vi.fn(),
});

// ── Tests ─────────────────────────────────────────────────────

describe('FlashcardSessionScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Renders the current card correctly (front side)
  it('renders the current card question when not revealed', () => {
    const props = defaultProps();
    render(<SessionScreen {...props} />);

    expect(screen.getByText('Question 1')).toBeInTheDocument();
    // Answer should NOT be visible when not revealed
    expect(screen.queryByText('Answer 1')).not.toBeInTheDocument();
  });

  // 1b. Renders the answer when revealed
  it('renders both question and answer when revealed', () => {
    const props = defaultProps();
    props.isRevealed = true;
    render(<SessionScreen {...props} />);

    expect(screen.getByText('Question 1')).toBeInTheDocument();
    expect(screen.getByText('Answer 1')).toBeInTheDocument();
  });

  // 2. Flip button reveals the answer
  it('calls setIsRevealed(true) when "Mostrar Respuesta" button is clicked', () => {
    const props = defaultProps();
    render(<SessionScreen {...props} />);

    const revealButton = screen.getByText('Mostrar Respuesta');
    fireEvent.click(revealButton);

    expect(props.setIsRevealed).toHaveBeenCalledWith(true);
  });

  // 3. Rating buttons appear after flip
  it('shows rating buttons when card is revealed', () => {
    const props = defaultProps();
    props.isRevealed = true;
    render(<SessionScreen {...props} />);

    // All 5 rating labels should be visible
    expect(screen.getByText('No se')).toBeInTheDocument();
    expect(screen.getByText('Dificil')).toBeInTheDocument();
    expect(screen.getByText('Regular')).toBeInTheDocument();
    expect(screen.getByText('Facil')).toBeInTheDocument();
    expect(screen.getByText('Perfecto')).toBeInTheDocument();
  });

  it('does not show rating buttons when card is not revealed', () => {
    const props = defaultProps();
    render(<SessionScreen {...props} />);

    expect(screen.queryByText('No se')).not.toBeInTheDocument();
    expect(screen.queryByText('Perfecto')).not.toBeInTheDocument();
  });

  it('calls handleRate with the correct value when a rating button is clicked', () => {
    const props = defaultProps();
    props.isRevealed = true;
    render(<SessionScreen {...props} />);

    // Click the "Perfecto" (value=5) rating button
    const perfectoButton = screen.getByText('Perfecto').closest('button');
    expect(perfectoButton).toBeTruthy();
    fireEvent.click(perfectoButton!);

    expect(props.handleRate).toHaveBeenCalledWith(5);
  });

  // 4. Progress bar shows correct progress
  it('displays the progress counter with current position and total', () => {
    const props = defaultProps();
    props.currentIndex = 1;
    render(<SessionScreen {...props} />);

    // Current index is 1, so display should be "2" / "3"
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('/ 3')).toBeInTheDocument();
  });

  it('displays remaining count when there are cards left', () => {
    const props = defaultProps();
    props.currentIndex = 0;
    render(<SessionScreen {...props} />);

    // 3 cards, index 0 → 2 remaining
    expect(screen.getByText('(2 restantes)')).toBeInTheDocument();
  });

  it('does not display remaining count on last card', () => {
    const props = defaultProps();
    props.currentIndex = 2;
    render(<SessionScreen {...props} />);

    expect(screen.queryByText(/restantes/)).not.toBeInTheDocument();
  });

  // 5. Empty cards list triggers onBack
  it('calls onBack when cards array is empty', () => {
    const props = defaultProps();
    props.cards = [];
    props.currentIndex = 0;
    render(<SessionScreen {...props} />);

    expect(props.onBack).toHaveBeenCalled();
  });

  it('renders nothing (null) when cards are empty', () => {
    const props = defaultProps();
    props.cards = [];
    props.currentIndex = 0;
    const { container } = render(<SessionScreen {...props} />);

    // Component returns null for empty cards
    expect(container.innerHTML).toBe('');
  });

  // 6. Exit button calls onBack
  it('calls onBack when the exit button is clicked', () => {
    const props = defaultProps();
    render(<SessionScreen {...props} />);

    // The X button has title "Salir de la sesion (Esc)"
    const exitButton = screen.getByTitle(/Salir/);
    fireEvent.click(exitButton);

    expect(props.onBack).toHaveBeenCalledTimes(1);
  });

  // 7. Keyboard shortcut: Space reveals the card
  it('reveals card on Space keydown when not revealed', () => {
    const props = defaultProps();
    render(<SessionScreen {...props} />);

    fireEvent.keyDown(window, { key: ' ' });

    expect(props.setIsRevealed).toHaveBeenCalledWith(true);
  });

  // 8. Keyboard shortcut: number keys rate when revealed
  it('rates card with number key when revealed', () => {
    const props = defaultProps();
    props.isRevealed = true;
    render(<SessionScreen {...props} />);

    fireEvent.keyDown(window, { key: '3' });

    expect(props.handleRate).toHaveBeenCalledWith(3);
  });

  it('does not rate with number key when not revealed', () => {
    const props = defaultProps();
    render(<SessionScreen {...props} />);

    fireEvent.keyDown(window, { key: '3' });

    expect(props.handleRate).not.toHaveBeenCalled();
  });

  // 9. Pregunta label is visible
  it('shows "Pregunta" label on the question area', () => {
    const props = defaultProps();
    render(<SessionScreen {...props} />);

    expect(screen.getByText('Pregunta')).toBeInTheDocument();
  });

  // 10. Respuesta label visible when revealed
  it('shows "Respuesta" label when card is revealed', () => {
    const props = defaultProps();
    props.isRevealed = true;
    render(<SessionScreen {...props} />);

    expect(screen.getByText('Respuesta')).toBeInTheDocument();
  });

  // 11. Image rendering when card has image
  it('renders image when card has frontImageUrl', () => {
    const props = defaultProps();
    props.cards = [
      createCard({
        id: 'img-card',
        question: 'Image Question',
        answer: 'Image Answer',
        frontImageUrl: 'https://example.com/front.jpg',
      }),
    ];
    render(<SessionScreen {...props} />);

    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThanOrEqual(1);
    // At least one image should have the frontImageUrl src
    const hasCorrectSrc = images.some(
      (img) => (img as HTMLImageElement).src === 'https://example.com/front.jpg',
    );
    expect(hasCorrectSrc).toBe(true);
  });

  // 12. AxonLogo renders in the header
  it('renders the AxonLogo in the header', () => {
    const props = defaultProps();
    render(<SessionScreen {...props} />);

    expect(screen.getByTestId('axon-logo')).toBeInTheDocument();
  });
});
