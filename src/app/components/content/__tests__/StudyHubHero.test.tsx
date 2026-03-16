// ============================================================
// Axon — StudyHubHero Unit Tests
//
// Renders the hero with different prop combinations and asserts
// that key text, callbacks, and conditional branches work.
//
// Mocks: motion/react (to plain elements), design-kit (stubs),
//        lucide-react (to spans), FadeIn + ImageWithFallback.
// ============================================================
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudyHubHero, type StudyHubHeroProps } from '../StudyHubHero';

// ── Mocks ─────────────────────────────────────────────────────

// motion/react — render plain elements, ignore animation props
vi.mock('motion/react', () => {
  const motion = new Proxy(
    {},
    {
      get(_target, prop: string) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return React.forwardRef((props: any, ref: any) => {
          const {
            initial, animate, transition, whileHover, whileTap,
            onMouseEnter, onMouseLeave, ...rest
          } = props;
          return React.createElement(prop, { ...rest, ref, onMouseEnter, onMouseLeave });
        });
      },
    },
  );
  return {
    motion,
    useReducedMotion: () => false,
  };
});

// design-kit — minimal stubs
vi.mock('@/app/components/design-kit', () => ({
  HeroSection: ({ children }: { children: React.ReactNode }) =>
    React.createElement('section', { 'data-testid': 'hero-section' }, children),
  ProgressBar: () => React.createElement('div', { 'data-testid': 'progress-bar' }),
  Breadcrumb: ({ items }: { items: string[] }) =>
    React.createElement('nav', { 'data-testid': 'breadcrumb' }, items.join(' / ')),
  focusRing: '',
}));

// FadeIn shared hook
vi.mock('@/app/components/shared/FadeIn', () => ({
  useMotionPresets: () => ({
    fadeUp: () => ({}),
  }),
}));

// ImageWithFallback
vi.mock('@/app/components/figma/ImageWithFallback', () => ({
  ImageWithFallback: (props: { src: string; alt: string; className?: string }) =>
    React.createElement('img', { src: props.src, alt: props.alt, className: props.className }),
}));

// lucide-react — render spans with the icon name as text
vi.mock('lucide-react', () => {
  const iconFactory = (name: string) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (props: any) => React.createElement('span', { 'data-icon': name, ...props }, name);
  return {
    BookOpen: iconFactory('BookOpen'),
    Clock: iconFactory('Clock'),
    Sparkles: iconFactory('Sparkles'),
    Play: iconFactory('Play'),
    ArrowRight: iconFactory('ArrowRight'),
    Video: iconFactory('Video'),
    FileText: iconFactory('FileText'),
  };
});

// ── Helpers ───────────────────────────────────────────────────

const defaultProps: StudyHubHeroProps = {
  greeting: 'Buenos dias',
  userName: 'Carlos',
  effectiveTopic: { id: 't1', title: 'Anatomia del Corazon' },
  isAutoSelected: false,
  heroReadingSessions: 3,
  heroProgressPct: 60,
  heroProgress: 0.6,
  heroLastActivity: 'Hace 2h',
  estimatedRemaining: 12,
  streakDays: 5,
  courseName: 'Medicina I',
  sectionName: 'Cardiologia',
  todayStats: { minutes: 45, summaries: 2, flashcards: 10, videos: 1 },
  studyMinutesToday: 45,
  totalCardsReviewed: 100,
  dailyGoalMinutes: 120,
  onContinue: vi.fn(),
  onGoToVideos: vi.fn(),
  onGoToSummaries: vi.fn(),
};

function renderHero(overrides: Partial<StudyHubHeroProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<StudyHubHero {...props} />);
}

// ── Tests ─────────────────────────────────────────────────────

describe('StudyHubHero', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the greeting with user name', () => {
    renderHero();
    expect(screen.getByText(/Buenos dias, Carlos/)).toBeInTheDocument();
  });

  it('shows "Retoma donde dejaste" when heroReadingSessions > 0', () => {
    renderHero({ heroReadingSessions: 3 });
    expect(screen.getByText('Retoma donde dejaste')).toBeInTheDocument();
  });

  it('shows "Empezar a estudiar" when heroReadingSessions is 0', () => {
    renderHero({ heroReadingSessions: 0 });
    expect(screen.getByText('Empezar a estudiar')).toBeInTheDocument();
  });

  it('displays streak days when > 0', () => {
    renderHero({ streakDays: 5 });
    expect(screen.getByText('5 dias seguidos')).toBeInTheDocument();
  });

  it('does not display streak when streakDays is 0', () => {
    renderHero({ streakDays: 0 });
    expect(screen.queryByText(/dias seguidos/)).not.toBeInTheDocument();
  });

  it('shows estimated remaining minutes', () => {
    renderHero({ estimatedRemaining: 12 });
    const matches = screen.getAllByText(/~12 min/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('shows the topic title in the study card', () => {
    renderHero();
    // Topic title appears in the hero card and in ZONE 2
    const matches = screen.getAllByText(/Anatomia del Corazon/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the breadcrumb with course/section/topic', () => {
    renderHero();
    const breadcrumb = screen.getByTestId('breadcrumb');
    expect(breadcrumb.textContent).toContain('Medicina I');
    expect(breadcrumb.textContent).toContain('Cardiologia');
  });

  it('calls onContinue when study card is clicked', () => {
    const onContinue = vi.fn();
    renderHero({ onContinue });
    // The study card is a button with the topic title
    const card = screen.getByText('Anatomia del Corazon', { selector: 'h3' });
    fireEvent.click(card.closest('button')!);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('shows fallback message when no topic is selected', () => {
    renderHero({ effectiveTopic: null });
    expect(screen.getByText('Explora las secciones abajo y elige tu primer tema')).toBeInTheDocument();
  });

  it('renders today stats row', () => {
    renderHero();
    expect(screen.getByText('Hoy')).toBeInTheDocument();
    expect(screen.getByText('Resumenes')).toBeInTheDocument();
    expect(screen.getByText('Flashcards')).toBeInTheDocument();
    expect(screen.getByText('Videos')).toBeInTheDocument();
  });

  it('renders ZONE 2 study path cards when topic is set', () => {
    renderHero();
    expect(screen.getByText('Ver Videos')).toBeInTheDocument();
    expect(screen.getByText('Leer Resumenes')).toBeInTheDocument();
  });

  it('shows discovery mode when no topic selected', () => {
    renderHero({ effectiveTopic: null });
    expect(screen.getByText('ELIGE COMO ESTUDIAR')).toBeInTheDocument();
    expect(screen.getByText('Estudiar por Videos')).toBeInTheDocument();
    expect(screen.getByText('Ir a Resumenes')).toBeInTheDocument();
  });

  it('shows progress percentage in hero card', () => {
    renderHero({ heroProgressPct: 60 });
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('renders HeroSection wrapper', () => {
    renderHero();
    expect(screen.getByTestId('hero-section')).toBeInTheDocument();
  });
});
