// ============================================================
// E2E Integration Tests — Study Hub Flow
//
// Tests the FULL student study hub journey: hero greeting,
// section cards, topic selection, continue studying, stats
// display, empty states, content tree, section progress,
// and topic status badges.
//
// Components under test:
//   - StudyHubHero (StudyHubHero.tsx)
//   - StudyHubSectionCards (StudyHubSectionCards.tsx)
//   - studyhub-helpers (computeSectionProgress, formatRelativeTime)
//
// RUN: npx vitest run src/__tests__/e2e-study-hub-flow.test.tsx
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';

// ── Mock motion/react ─────────────────────────────────────────
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
            onMouseEnter, onMouseLeave,
            ...rest
          } = props;
          return React.createElement(prop, { ...rest, ref, onMouseEnter, onMouseLeave });
        });
      },
    },
  );
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useReducedMotion: () => false,
  };
});

// ── Mock lucide-react ─────────────────────────────────────────
// NOTE: Do NOT use a Proxy here -- it causes vitest to hang during
// module resolution. Explicitly list every icon used by the components.
vi.mock('lucide-react', () => {
  const React = require('react');
  const iconFactory = (name: string) =>
    (props: Record<string, unknown>) =>
      React.createElement('span', { 'data-testid': `icon-${name}`, 'data-icon': name, ...props }, name);
  return {
    BookOpen: iconFactory('BookOpen'),
    Clock: iconFactory('Clock'),
    Sparkles: iconFactory('Sparkles'),
    Play: iconFactory('Play'),
    ArrowRight: iconFactory('ArrowRight'),
    Video: iconFactory('Video'),
    FileText: iconFactory('FileText'),
    ChevronLeft: iconFactory('ChevronLeft'),
    Folder: iconFactory('Folder'),
    CheckCircle2: iconFactory('CheckCircle2'),
    AlertCircle: iconFactory('AlertCircle'),
    BarChart3: iconFactory('BarChart3'),
    TrendingUp: iconFactory('TrendingUp'),
    Target: iconFactory('Target'),
  };
});

// ── Mock sonner ───────────────────────────────────────────────
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  Toaster: () => null,
}));

// ── Mock recharts ─────────────────────────────────────────────
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => children,
  BarChart: ({ children }: { children: React.ReactNode }) => children,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  PieChart: ({ children }: { children: React.ReactNode }) => children,
  Pie: () => null,
  Cell: () => null,
}));

// ── Mock design-kit ───────────────────────────────────────────
vi.mock('@/app/components/design-kit', () => ({
  HeroSection: ({ children }: { children: React.ReactNode }) =>
    React.createElement('section', { 'data-testid': 'hero-section' }, children),
  ProgressBar: ({ value }: { value: number }) =>
    React.createElement('div', { 'data-testid': 'progress-bar', 'data-value': value }),
  Breadcrumb: ({ items }: { items: string[] }) =>
    React.createElement('nav', { 'data-testid': 'breadcrumb' }, items.join(' / ')),
  focusRing: '',
}));

// ── Mock FadeIn shared hook ───────────────────────────────────
vi.mock('@/app/components/shared/FadeIn', () => ({
  useMotionPresets: () => ({
    fadeUp: () => ({}),
  }),
}));

// ── Mock ImageWithFallback ────────────────────────────────────
vi.mock('@/app/components/figma/ImageWithFallback', () => ({
  ImageWithFallback: (props: { src: string; alt: string; className?: string }) =>
    React.createElement('img', { src: props.src, alt: props.alt, className: props.className }),
}));

// ── Mock palette ──────────────────────────────────────────────
vi.mock('@/app/lib/palette', () => ({
  axon: {
    darkTeal: '#1B3B36',
    tealAccent: '#2a8c7a',
    hoverTeal: '#244e47',
    darkPanel: '#1a2e2a',
    pageBg: '#F0F2F5',
    cardBg: '#FFFFFF',
    progressStart: '#2dd4a8',
    progressEnd: '#0d9488',
    sidebarText: '#8fbfb3',
    labelOk: '#5cbdaa',
  },
  tint: {
    tealBg: '#e6f5f0',
    tealBorder: '#b3ddd0',
    amberBg: '#fef9ee',
    amberBorder: '#fcd34d',
    amberIcon: '#d97706',
    neutralBg: '#f9fafb',
    neutralBorder: '#e5e7eb',
    neutralText: '#9ca3af',
    subtitleText: '#6b7280',
  },
}));

// ── Imports (after mocks) ─────────────────────────────────────
import { StudyHubHero, type StudyHubHeroProps, type TodayStats } from '@/app/components/content/StudyHubHero';
import { StudyHubSectionCards, type StudyHubSectionCardsProps } from '@/app/components/content/StudyHubSectionCards';
import {
  computeSectionProgress,
  formatRelativeTime,
  type TopicStatus,
  type SectionProgress,
} from '@/app/components/content/studyhub-helpers';
import type { TreeSection } from '@/app/services/contentTreeApi';

// ── Mock data ─────────────────────────────────────────────────

const mockTodayStats: TodayStats = {
  minutes: 45,
  summaries: 2,
  flashcards: 10,
  videos: 1,
};

const defaultHeroProps: StudyHubHeroProps = {
  greeting: 'Buenos dias',
  userName: 'Test Student',
  effectiveTopic: { id: 'topic-1', title: 'Huesos del Craneo' },
  isAutoSelected: false,
  heroReadingSessions: 3,
  heroProgressPct: 65,
  heroProgress: 0.65,
  heroLastActivity: 'hace 2h',
  estimatedRemaining: 8,
  streakDays: 12,
  courseName: 'Anatomia Medica',
  sectionName: 'Sistema Esqueletico',
  todayStats: mockTodayStats,
  studyMinutesToday: 45,
  totalCardsReviewed: 500,
  dailyGoalMinutes: 60,
  onContinue: vi.fn(),
  onGoToVideos: vi.fn(),
  onGoToSummaries: vi.fn(),
};

const mockSection: TreeSection = {
  id: 'sec-1',
  name: 'Sistema Esqueletico',
  order_index: 1,
  topics: [
    { id: 'topic-1', name: 'Huesos', order_index: 1 },
    { id: 'topic-2', name: 'Articulaciones', order_index: 2 },
    { id: 'topic-3', name: 'Cartilago', order_index: 3 },
    { id: 'topic-4', name: 'Ligamentos', order_index: 4 },
  ],
};

const mockSection2: TreeSection = {
  id: 'sec-2',
  name: 'Sistema Muscular',
  order_index: 2,
  topics: [
    { id: 'topic-5', name: 'Musculos Esqueleticos', order_index: 1 },
    { id: 'topic-6', name: 'Musculos Lisos', order_index: 2 },
  ],
};

function buildSectionProgress(overrides: Partial<SectionProgress> = {}): SectionProgress {
  return {
    completedTopics: 2,
    progress: 50,
    lastActivity: 'hace 1 dia',
    nextTopicName: 'Cartilago',
    touchedTopicIds: ['topic-1', 'topic-2'],
    nextTopicId: 'topic-3',
    ...overrides,
  };
}

function buildTopicStatusMap(statuses: Record<string, TopicStatus>): Map<string, TopicStatus> {
  return new Map(Object.entries(statuses));
}

function buildSectionProgressMap(entries: Record<string, SectionProgress>): Map<string, SectionProgress> {
  return new Map(Object.entries(entries));
}

// ── Helpers ───────────────────────────────────────────────────

function renderHero(overrides: Partial<StudyHubHeroProps> = {}) {
  const props = { ...defaultHeroProps, ...overrides };
  return render(<StudyHubHero {...props} />);
}

function renderSectionCards(overrides: Partial<StudyHubSectionCardsProps> = {}) {
  const selectTopic = vi.fn();
  const navigate = vi.fn();

  const defaultSectionCardsProps: StudyHubSectionCardsProps = {
    allSections: [
      { section: mockSection, accentIdx: 0 },
      { section: mockSection2, accentIdx: 1 },
    ],
    sectionProgressMap: buildSectionProgressMap({
      'sec-1': buildSectionProgress(),
      'sec-2': buildSectionProgress({
        completedTopics: 0,
        progress: 0,
        lastActivity: undefined,
        nextTopicName: 'Musculos Esqueleticos',
        touchedTopicIds: [],
        nextTopicId: 'topic-5',
      }),
    }),
    topicStatusMap: buildTopicStatusMap({
      'topic-1': 'mastered',
      'topic-2': 'in-progress',
      'topic-3': 'not-started',
      'topic-4': 'not-started',
      'topic-5': 'not-started',
      'topic-6': 'not-started',
    }),
    totalSections: 2,
    totalTopics: 6,
    selectTopic,
    navigate,
    ...overrides,
  };

  const result = render(<StudyHubSectionCards {...defaultSectionCardsProps} />);
  return { ...result, selectTopic, navigate };
}

// ── Tests ─────────────────────────────────────────────────────

describe('E2E Study Hub Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────
  // 1. Student navigates to study hub -> sees hero greeting + stats
  // ─────────────────────────────────────────────────────────
  describe('1. Hero greeting and stats display', () => {
    it('renders the personalized greeting with student name', () => {
      renderHero();
      expect(screen.getByText(/Buenos dias, Test Student/)).toBeInTheDocument();
    });

    it('shows "Retoma donde dejaste" title when there are reading sessions', () => {
      renderHero({ heroReadingSessions: 3 });
      expect(screen.getByText('Retoma donde dejaste')).toBeInTheDocument();
    });

    it('shows "Empezar a estudiar" title for fresh start (0 sessions)', () => {
      renderHero({ heroReadingSessions: 0 });
      expect(screen.getByText('Empezar a estudiar')).toBeInTheDocument();
    });

    it('displays the streak badge when streakDays > 0', () => {
      renderHero({ streakDays: 12 });
      expect(screen.getByText('12 dias seguidos')).toBeInTheDocument();
    });

    it('renders the four today-stats cards (Hoy, Resumenes, Flashcards, Videos)', () => {
      renderHero();
      expect(screen.getByText('Hoy')).toBeInTheDocument();
      expect(screen.getByText('Resumenes')).toBeInTheDocument();
      expect(screen.getByText('Flashcards')).toBeInTheDocument();
      expect(screen.getByText('Videos')).toBeInTheDocument();
    });

    it('shows correct stat values from todayStats', () => {
      renderHero({
        todayStats: { minutes: 75, summaries: 5, flashcards: 30, videos: 3 },
      });
      expect(screen.getByText('75m')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('shows daily goal in Hoy stat sub-label', () => {
      renderHero({ dailyGoalMinutes: 60 });
      expect(screen.getByText('meta 60m')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────
  // 2. Student sees section cards with topics and progress
  // ─────────────────────────────────────────────────────────
  describe('2. Section cards with topics and progress', () => {
    it('renders the course content heading with section/topic counts', () => {
      renderSectionCards();
      expect(screen.getByText('Contenido del Curso')).toBeInTheDocument();
      expect(screen.getByText(/2 secciones/)).toBeInTheDocument();
      expect(screen.getByText(/6 resumenes disponibles/)).toBeInTheDocument();
    });

    it('renders all section cards with their names', () => {
      renderSectionCards();
      expect(screen.getByText('Sistema Esqueletico')).toBeInTheDocument();
      expect(screen.getByText('Sistema Muscular')).toBeInTheDocument();
    });

    it('shows completed/total topic counts on section cards', () => {
      renderSectionCards();
      // Section 1: 2/4 topics completed
      expect(screen.getByText('2/4 Resumenes')).toBeInTheDocument();
      // Section 2: 0/2 topics completed
      expect(screen.getByText('0/2 Resumenes')).toBeInTheDocument();
    });

    it('shows topic preview in collapsed section cards', () => {
      renderSectionCards();
      // First 3 topics of sec-1 should be visible as previews
      expect(screen.getByText('Huesos')).toBeInTheDocument();
      expect(screen.getByText('Articulaciones')).toBeInTheDocument();
      expect(screen.getByText('Cartilago')).toBeInTheDocument();
      // The 4th topic shows as "+1 resumen mas"
      expect(screen.getByText('+1 resumen mas')).toBeInTheDocument();
    });

    it('marks the next suggested topic with "Siguiente" badge', () => {
      renderSectionCards();
      // topic-3 (Cartilago) is the nextTopicId for sec-1
      const siguienteBadges = screen.getAllByText('Siguiente');
      expect(siguienteBadges.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─────────────────────────────────────────────────────────
  // 3. Student selects a topic -> navigation to summaries
  // ─────────────────────────────────────────────────────────
  describe('3. Topic selection navigates to summaries', () => {
    it('expands a section card when clicked and shows all topics', () => {
      renderSectionCards();
      // Click on section card to expand it
      const sectionCard = screen.getByText('Sistema Esqueletico').closest('[class*="rounded-3xl"]');
      expect(sectionCard).toBeTruthy();
      fireEvent.click(sectionCard!);

      // After expanding, all 4 topics should be visible as clickable buttons
      expect(screen.getByText('Huesos')).toBeInTheDocument();
      expect(screen.getByText('Articulaciones')).toBeInTheDocument();
      expect(screen.getByText('Cartilago')).toBeInTheDocument();
      expect(screen.getByText('Ligamentos')).toBeInTheDocument();
    });

    it('calls selectTopic and navigate when a topic is clicked in expanded section', () => {
      const { selectTopic, navigate } = renderSectionCards();
      // First expand the section
      const sectionCard = screen.getByText('Sistema Esqueletico').closest('[class*="rounded-3xl"]');
      fireEvent.click(sectionCard!);

      // Now click on a topic — find the topic button by its text
      const topicButton = screen.getByText('Huesos').closest('button');
      expect(topicButton).toBeTruthy();
      fireEvent.click(topicButton!);

      expect(selectTopic).toHaveBeenCalledWith('topic-1');
      expect(navigate).toHaveBeenCalledWith('/student/summaries');
    });
  });

  // ─────────────────────────────────────────────────────────
  // 4. Continue studying flow -> resumes last topic
  // ─────────────────────────────────────────────────────────
  describe('4. Continue studying flow', () => {
    it('renders the continue reading card with topic title and breadcrumb', () => {
      renderHero();
      // The topic title appears in the hero card
      const topicHeadings = screen.getAllByText(/Huesos del Craneo/);
      expect(topicHeadings.length).toBeGreaterThanOrEqual(1);
      // Breadcrumb contains course and section
      const breadcrumb = screen.getByTestId('breadcrumb');
      expect(breadcrumb.textContent).toContain('Anatomia Medica');
      expect(breadcrumb.textContent).toContain('Sistema Esqueletico');
    });

    it('shows "Continuar leyendo" badge when there are reading sessions', () => {
      renderHero({ heroReadingSessions: 3 });
      expect(screen.getByText('Continuar leyendo')).toBeInTheDocument();
    });

    it('shows "Sugerencia de estudio" badge when heroReadingSessions is 0', () => {
      renderHero({ heroReadingSessions: 0 });
      expect(screen.getByText('Sugerencia de estudio')).toBeInTheDocument();
    });

    it('displays progress percentage and reading sessions count', () => {
      renderHero({ heroProgressPct: 65, heroReadingSessions: 3 });
      expect(screen.getByText('65%')).toBeInTheDocument();
      expect(screen.getByText('3 sesiones de lectura')).toBeInTheDocument();
    });

    it('shows estimated remaining time', () => {
      renderHero({ estimatedRemaining: 8 });
      const matches = screen.getAllByText(/~8 min/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('calls onContinue when the study card is clicked', () => {
      const onContinue = vi.fn();
      renderHero({ onContinue });
      // Click the study card (button containing the topic title)
      const topicTitle = screen.getByText('Huesos del Craneo', { selector: 'h3' });
      const studyCard = topicTitle.closest('button');
      expect(studyCard).toBeTruthy();
      fireEvent.click(studyCard!);
      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it('renders ZONE 2 study path cards (Videos + Resumenes) when topic is set', () => {
      renderHero();
      expect(screen.getByText('Ver Videos')).toBeInTheDocument();
      expect(screen.getByText('Leer Resumenes')).toBeInTheDocument();
      // Shows the "ESTUDIANDO AHORA" context header
      expect(screen.getByText('ESTUDIANDO AHORA')).toBeInTheDocument();
    });

    it('calls onGoToSummaries when Leer Resumenes path card is clicked', () => {
      const onGoToSummaries = vi.fn();
      renderHero({ onGoToSummaries });
      const summariesCard = screen.getByText('Leer Resumenes').closest('button');
      expect(summariesCard).toBeTruthy();
      fireEvent.click(summariesCard!);
      expect(onGoToSummaries).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────────────────────────────────────
  // 5. Study stats display (streak, daily minutes, cards reviewed)
  // ─────────────────────────────────────────────────────────
  describe('5. Study stats display', () => {
    it('shows streak days in the hero subtitle', () => {
      renderHero({ streakDays: 25 });
      expect(screen.getByText('25 dias seguidos')).toBeInTheDocument();
    });

    it('hides streak text when streakDays is 0', () => {
      renderHero({ streakDays: 0 });
      expect(screen.queryByText(/dias seguidos/)).not.toBeInTheDocument();
    });

    it('displays totalCardsReviewed when todayStats.flashcards is 0', () => {
      renderHero({
        todayStats: { minutes: 0, summaries: 0, flashcards: 0, videos: 0 },
        totalCardsReviewed: 500,
      });
      // When todayStats.flashcards is 0, it falls back to totalCardsReviewed
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('total')).toBeInTheDocument();
    });

    it('displays todayStats.flashcards when > 0', () => {
      renderHero({
        todayStats: { minutes: 0, summaries: 0, flashcards: 15, videos: 0 },
        totalCardsReviewed: 500,
      });
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('hoy')).toBeInTheDocument();
    });

    it('uses studyMinutesToday when todayStats.minutes is 0 but studyMinutesToday > 0', () => {
      renderHero({
        todayStats: { minutes: 0, summaries: 0, flashcards: 0, videos: 0 },
        studyMinutesToday: 30,
      });
      expect(screen.getByText('30m')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────
  // 6. Empty state: new student with no activity
  // ─────────────────────────────────────────────────────────
  describe('6. Empty state for new student', () => {
    it('shows fallback message when no topic is selected', () => {
      renderHero({ effectiveTopic: null });
      expect(screen.getByText('Explora las secciones abajo y elige tu primer tema')).toBeInTheDocument();
      expect(screen.getByText('Tu progreso aparecera aqui')).toBeInTheDocument();
    });

    it('shows discovery mode (ELIGE COMO ESTUDIAR) when no topic selected', () => {
      renderHero({ effectiveTopic: null });
      expect(screen.getByText('ELIGE COMO ESTUDIAR')).toBeInTheDocument();
      expect(screen.getByText('Estudiar por Videos')).toBeInTheDocument();
      expect(screen.getByText('Ir a Resumenes')).toBeInTheDocument();
    });

    it('shows explore message in subtitle when effectiveTopic is null', () => {
      renderHero({ effectiveTopic: null, streakDays: 0 });
      expect(screen.getByText('Explora las secciones y elige un tema.')).toBeInTheDocument();
    });

    it('renders zero stats gracefully', () => {
      renderHero({
        todayStats: { minutes: 0, summaries: 0, flashcards: 0, videos: 0 },
        studyMinutesToday: 0,
        totalCardsReviewed: 0,
        streakDays: 0,
        heroReadingSessions: 0,
        effectiveTopic: null,
      });
      // Should render stat cards with 0 values
      expect(screen.getByText('0m')).toBeInTheDocument();
      expect(screen.getByText('Empezar a estudiar')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────
  // 7. Content tree loading and display
  // ─────────────────────────────────────────────────────────
  describe('7. Content tree display in section cards', () => {
    it('renders sections from content tree with correct topic counts', () => {
      renderSectionCards({
        totalSections: 2,
        totalTopics: 6,
      });
      expect(screen.getByText(/2 secciones/)).toBeInTheDocument();
      expect(screen.getByText(/6 resumenes disponibles/)).toBeInTheDocument();
    });

    it('renders semester group headers when provided', () => {
      const { container } = render(
        <StudyHubSectionCards
          semesterGroups={[
            {
              semesterId: 'sem-1',
              semesterName: 'Semestre 1',
              sections: [{ section: mockSection, accentIdx: 0 }],
            },
            {
              semesterId: 'sem-2',
              semesterName: 'Semestre 2',
              sections: [{ section: mockSection2, accentIdx: 1 }],
            },
          ]}
          allSections={[
            { section: mockSection, accentIdx: 0 },
            { section: mockSection2, accentIdx: 1 },
          ]}
          sectionProgressMap={buildSectionProgressMap({
            'sec-1': buildSectionProgress(),
            'sec-2': buildSectionProgress({ completedTopics: 0, progress: 0 }),
          })}
          totalSections={2}
          totalTopics={6}
          selectTopic={vi.fn()}
          navigate={vi.fn()}
        />,
      );
      expect(screen.getByText('Semestre 1')).toBeInTheDocument();
      expect(screen.getByText('Semestre 2')).toBeInTheDocument();
    });

    it('hides other sections when one is expanded', () => {
      renderSectionCards();
      // Both sections visible initially
      expect(screen.getByText('Sistema Esqueletico')).toBeInTheDocument();
      expect(screen.getByText('Sistema Muscular')).toBeInTheDocument();

      // Click to expand first section
      const firstSection = screen.getByText('Sistema Esqueletico').closest('[class*="rounded-3xl"]');
      fireEvent.click(firstSection!);

      // Second section should be hidden when first is expanded
      // (renderSectionCard returns null for isHidden sections)
      expect(screen.queryByText('Sistema Muscular')).not.toBeInTheDocument();
    });

    it('can collapse an expanded section back to grid view', () => {
      renderSectionCards();
      // Expand section
      const sectionCard = screen.getByText('Sistema Esqueletico').closest('[class*="rounded-3xl"]');
      fireEvent.click(sectionCard!);

      // Find and click the "Cerrar" button
      const closeButton = screen.getByText('Cerrar');
      fireEvent.click(closeButton);

      // Both sections should be visible again
      expect(screen.getByText('Sistema Esqueletico')).toBeInTheDocument();
      expect(screen.getByText('Sistema Muscular')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────
  // 8. Section progress computation
  // ─────────────────────────────────────────────────────────
  describe('8. Section progress computation (studyhub-helpers)', () => {
    it('computes section progress from sessions and courseProgress', () => {
      const sessions = [
        {
          id: 's1', studentId: 'student-1', courseId: 'c1', topicId: 'topic-1',
          type: 'reading' as const, startedAt: '2025-03-27T10:00:00Z', endedAt: '2025-03-27T10:30:00Z',
          durationMinutes: 30,
        },
        {
          id: 's2', studentId: 'student-1', courseId: 'c1', topicId: 'topic-2',
          type: 'reading' as const, startedAt: '2025-03-28T14:00:00Z', endedAt: '2025-03-28T14:45:00Z',
          durationMinutes: 45,
        },
      ];
      const courseProgressTopicIds = new Set<string>();

      const result = computeSectionProgress(mockSection, sessions, courseProgressTopicIds);

      expect(result.completedTopics).toBe(2);
      expect(result.progress).toBe(50); // 2/4 = 50%
      expect(result.touchedTopicIds).toContain('topic-1');
      expect(result.touchedTopicIds).toContain('topic-2');
      expect(result.nextTopicId).toBe('topic-3');
      expect(result.nextTopicName).toBe('Cartilago');
    });

    it('returns 0% progress when no sessions exist', () => {
      const result = computeSectionProgress(mockSection, [], new Set());
      expect(result.completedTopics).toBe(0);
      expect(result.progress).toBe(0);
      expect(result.nextTopicId).toBe('topic-1');
      expect(result.nextTopicName).toBe('Huesos');
    });

    it('counts courseProgress topic IDs as touched', () => {
      const courseProgressTopicIds = new Set(['topic-3', 'topic-4']);
      const result = computeSectionProgress(mockSection, [], courseProgressTopicIds);
      expect(result.completedTopics).toBe(2);
      expect(result.progress).toBe(50);
      expect(result.touchedTopicIds).toContain('topic-3');
      expect(result.touchedTopicIds).toContain('topic-4');
      // Next topic should be the first untouched one
      expect(result.nextTopicId).toBe('topic-1');
    });

    it('returns 100% when all topics are touched', () => {
      const sessions = mockSection.topics.map((t, i) => ({
        id: `s${i}`, studentId: 'student-1', courseId: 'c1', topicId: t.id,
        type: 'reading' as const, startedAt: `2025-03-2${i}T10:00:00Z`, endedAt: `2025-03-2${i}T10:30:00Z`,
        durationMinutes: 30,
      }));
      const result = computeSectionProgress(mockSection, sessions, new Set());
      expect(result.completedTopics).toBe(4);
      expect(result.progress).toBe(100);
      expect(result.nextTopicId).toBeUndefined();
    });

    it('formatRelativeTime returns human-readable relative time', () => {
      // "justo ahora" for very recent
      const now = new Date().toISOString();
      expect(formatRelativeTime(now)).toBe('justo ahora');

      // undefined for null/undefined
      expect(formatRelativeTime(null)).toBeUndefined();
      expect(formatRelativeTime(undefined)).toBeUndefined();
      expect(formatRelativeTime('')).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────
  // 9. Topic status badges (not-started, in-progress, mastered)
  // ─────────────────────────────────────────────────────────
  describe('9. Topic status badges in expanded section', () => {
    it('shows status labels for each topic when section is expanded', () => {
      renderSectionCards();
      // Expand the first section
      const sectionCard = screen.getByText('Sistema Esqueletico').closest('[class*="rounded-3xl"]');
      fireEvent.click(sectionCard!);

      // Each topic should display its status label
      expect(screen.getByText('Dominado')).toBeInTheDocument();     // topic-1: mastered
      expect(screen.getByText('En progreso')).toBeInTheDocument();  // topic-2: in-progress
      // topic-3 and topic-4 are not-started
      const sinEmpezar = screen.getAllByText('Sin empezar');
      expect(sinEmpezar.length).toBe(2);
    });

    it('shows "Siguiente" badge on the next suggested topic in expanded view', () => {
      renderSectionCards();
      const sectionCard = screen.getByText('Sistema Esqueletico').closest('[class*="rounded-3xl"]');
      fireEvent.click(sectionCard!);

      // topic-3 (Cartilago) is the nextTopicId, should have "Siguiente" badge
      const siguienteBadges = screen.getAllByText('Siguiente');
      expect(siguienteBadges.length).toBeGreaterThanOrEqual(1);
    });

    it('shows section completion count in expanded header', () => {
      renderSectionCards();
      const sectionCard = screen.getByText('Sistema Esqueletico').closest('[class*="rounded-3xl"]');
      fireEvent.click(sectionCard!);

      // The expanded header shows "4 resumenes . 2 completados"
      expect(screen.getByText(/4 resumenes/)).toBeInTheDocument();
      expect(screen.getByText(/2 completados/)).toBeInTheDocument();
    });

    it('displays sequential numbering for topics in expanded view', () => {
      renderSectionCards();
      const sectionCard = screen.getByText('Sistema Esqueletico').closest('[class*="rounded-3xl"]');
      fireEvent.click(sectionCard!);

      // Topics should show sequential numbers: 1, 2, 3, 4
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });
});
