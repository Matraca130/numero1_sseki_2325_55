// ============================================================
// KeywordRow — Component tests for mastery row display
//
// Tests:
//   1. Renders keyword name, p_know percentage, progress bar
//   2. Shows mastery color dot based on p_know and priority
//   3. Expands/collapses subtopic list
//   4. Shows repeat button for keywords needing review
//   5. Subtopic rendering (color, percentage, progress)
//   6. Truncates long names with ellipsis
//   7. Shows "—" for null p_know (not started)
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeywordRow } from '../KeywordRow';

// ── Mock motion/react ──────────────────────────────────────
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ── Mock lucide-react ──────────────────────────────────────
vi.mock('lucide-react', () => ({
  ChevronDown: () => <div data-testid="icon-chevron-down" />,
  ChevronRight: () => <div data-testid="icon-chevron-right" />,
  RotateCcw: () => <div data-testid="icon-repeat" />,
}));

// ── Mock logger ────────────────────────────────────────────
vi.mock('@/app/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
  },
}));

// ── Mock masteryOverviewTypes ──────────────────────────────
vi.mock('../masteryOverviewTypes', () => ({
  getMasteryColor: (pKnow: number | null, priority?: string) => {
    if (pKnow === null || pKnow < 0.3) {
      return { text: 'text-gray-400', bar: 'bg-gray-400' };
    }
    if (pKnow < 0.5) {
      return { text: 'text-red-500', bar: 'bg-red-500' };
    }
    if (pKnow < 0.7) {
      return { text: 'text-amber-500', bar: 'bg-amber-500' };
    }
    if (pKnow < 0.9) {
      return { text: 'text-cyan-500', bar: 'bg-cyan-500' };
    }
    return { text: 'text-emerald-500', bar: 'bg-emerald-500' };
  },
  getMasteryDot: (pKnow: number | null, priority?: string) => {
    if (pKnow === null || pKnow < 0.3) {
      return 'bg-zinc-400';
    }
    if (pKnow < 0.5) {
      return 'bg-red-500';
    }
    if (pKnow < 0.7) {
      return 'bg-amber-500';
    }
    if (pKnow < 0.9) {
      return 'bg-cyan-500';
    }
    return 'bg-emerald-500';
  },
}));

// ── Mock data ──────────────────────────────────────────────

function createMockKeywordMastery(overrides = {}) {
  return {
    keyword: {
      id: 'kw-001',
      name: 'Mitosis',
      priority: 'high',
      summary_id: 'sum-001',
      ...overrides.keyword,
    },
    pKnow: 0.5,
    subtopicCount: 2,
    topicId: 'topic-001',
    topicName: 'Celula',
    courseName: 'Biologia',
    ...overrides,
  };
}

describe('KeywordRow — Keyword mastery row display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders keyword name and metadata', () => {
    const item = createMockKeywordMastery({
      keyword: { id: 'kw-001', name: 'Mitosis' },
      pKnow: 0.65,
      subtopicCount: 2,
    });

    const { container } = render(
      <KeywordRow item={item} expanded={false} onToggle={vi.fn()} subtopics={[]} />
    );

    // Find the keyword name (should be in the row somewhere)
    expect(container.textContent).toContain('Mitosis');
    expect(container.textContent).toContain('65%');
  });

  it('shows mastery color dot based on p_know', () => {
    const item = createMockKeywordMastery({
      pKnow: 0.75,
      keyword: { id: 'kw-001', name: 'Test Keyword' },
    });

    const { container } = render(<KeywordRow item={item} expanded={false} onToggle={vi.fn()} subtopics={[]} />);

    // The color dot should be cyan-500 for 0.75 mastery (between 0.7 and 0.9)
    const dotElement = container.querySelector('.bg-cyan-500');
    expect(dotElement).toBeInTheDocument();
  });

  it('displays percentage bar matching p_know value', () => {
    const item = createMockKeywordMastery({
      pKnow: 0.45,
      keyword: { id: 'kw-001', name: 'Test' },
    });

    const { container } = render(
      <KeywordRow item={item} expanded={false} onToggle={vi.fn()} subtopics={[]} />
    );

    const progressBar = container.querySelector('.bg-red-500'); // 45% is red
    expect(progressBar).toBeInTheDocument();
  });

  it('shows "—" for null p_know (not started)', () => {
    const item = createMockKeywordMastery({
      pKnow: null,
      keyword: { id: 'kw-001', name: 'New Topic' },
    });

    const { container } = render(
      <KeywordRow item={item} expanded={false} onToggle={vi.fn()} subtopics={[]} />
    );

    // Should show em dash instead of percentage
    expect(container.textContent).toContain('—');
  });

  it('shows chevron icon when keyword has subtopics', () => {
    const item = createMockKeywordMastery({
      subtopicCount: 2,
      keyword: { id: 'kw-001', name: 'Test' },
    });

    render(<KeywordRow item={item} expanded={false} onToggle={vi.fn()} subtopics={[]} />);

    // Should show chevron right (collapsed)
    expect(screen.getByTestId('icon-chevron-right')).toBeInTheDocument();
  });

  it('shows chevron down when expanded', () => {
    const item = createMockKeywordMastery({
      subtopicCount: 2,
      keyword: { id: 'kw-001', name: 'Test' },
    });

    render(<KeywordRow item={item} expanded={true} onToggle={vi.fn()} subtopics={[]} />);

    // Should show chevron down (expanded)
    expect(screen.getByTestId('icon-chevron-down')).toBeInTheDocument();
  });

  it('hides chevron when no subtopics', () => {
    const item = createMockKeywordMastery({
      subtopicCount: 0,
      keyword: { id: 'kw-001', name: 'Test' },
    });

    render(<KeywordRow item={item} expanded={false} onToggle={vi.fn()} subtopics={[]} />);

    // Should not show either chevron
    expect(screen.queryByTestId('icon-chevron-right')).not.toBeInTheDocument();
    expect(screen.queryByTestId('icon-chevron-down')).not.toBeInTheDocument();
  });

  it('calls onToggle when clicking row with subtopics', async () => {
    const mockToggle = vi.fn();
    const item = createMockKeywordMastery({
      subtopicCount: 2,
      keyword: { id: 'kw-001', name: 'Test' },
    });

    const { container } = render(
      <KeywordRow item={item} expanded={false} onToggle={mockToggle} subtopics={[]} />
    );

    // Click the main row
    const mainRow = container.querySelector('.cursor-pointer');
    if (mainRow) {
      await userEvent.click(mainRow);
    }

    expect(mockToggle).toHaveBeenCalled();
  });

  it('shows repeat button for keywords needing review (p_know < 0.7)', () => {
    const item = createMockKeywordMastery({
      pKnow: 0.5,
      keyword: { id: 'kw-001', name: 'Test' },
    });

    render(<KeywordRow item={item} expanded={false} onToggle={vi.fn()} subtopics={[]} />);

    const repeatBtn = screen.getByRole('button', { name: /repetir/i });
    expect(repeatBtn).toBeInTheDocument();
    expect(screen.getByTestId('icon-repeat')).toBeInTheDocument();
  });

  it('hides repeat button for mastered keywords (p_know >= 0.7)', () => {
    const item = createMockKeywordMastery({
      pKnow: 0.85,
      keyword: { id: 'kw-001', name: 'Mastered' },
    });

    const { container } = render(
      <KeywordRow item={item} expanded={false} onToggle={vi.fn()} subtopics={[]} />
    );

    const repeatBtn = screen.queryByRole('button', { name: /repetir/i });
    expect(repeatBtn).not.toBeInTheDocument();
  });

  it('renders subtopics when expanded', () => {
    const item = createMockKeywordMastery({
      subtopicCount: 2,
      keyword: { id: 'kw-001', name: 'Test' },
    });

    const subtopics = [
      {
        subtopic: { id: 'sub-001', name: 'Prophase' },
        pKnow: 0.4,
      },
      {
        subtopic: { id: 'sub-002', name: 'Metaphase' },
        pKnow: 0.6,
      },
    ];

    const { container } = render(
      <KeywordRow item={item} expanded={true} onToggle={vi.fn()} subtopics={subtopics} />
    );

    // Should show subtopic names
    expect(container.textContent).toContain('Prophase');
    expect(container.textContent).toContain('Metaphase');
    expect(container.textContent).toContain('40%');
    expect(container.textContent).toContain('60%');
  });

  it('shows "Sin subtopics" when expanded but no subtopics provided', () => {
    const item = createMockKeywordMastery({
      subtopicCount: 0,
      keyword: { id: 'kw-001', name: 'Test' },
    });

    render(<KeywordRow item={item} expanded={true} onToggle={vi.fn()} subtopics={[]} />);

    expect(screen.getByText('Sin subtopics')).toBeInTheDocument();
  });

  it('displays subtopic count on desktop', () => {
    const item = createMockKeywordMastery({
      subtopicCount: 3,
      keyword: { id: 'kw-001', name: 'Test' },
    });

    const { container } = render(
      <KeywordRow item={item} expanded={false} onToggle={vi.fn()} subtopics={[]} />
    );

    // Should show "3 subtopics"
    expect(container.textContent).toContain('3 subtopic');
  });

  it('uses singular "subtopic" for count of 1', () => {
    const item = createMockKeywordMastery({
      subtopicCount: 1,
      keyword: { id: 'kw-001', name: 'Test' },
    });

    const { container } = render(
      <KeywordRow item={item} expanded={false} onToggle={vi.fn()} subtopics={[]} />
    );

    expect(container.textContent).toContain('1 subtopic');
  });

  it('handles null p_know for subtopics', () => {
    const item = createMockKeywordMastery({
      pKnow: 0.5,
      keyword: { id: 'kw-001', name: 'Test' },
    });

    const subtopics = [
      {
        subtopic: { id: 'sub-001', name: 'Unstarted' },
        pKnow: null,
      },
    ];

    const { container } = render(
      <KeywordRow item={item} expanded={true} onToggle={vi.fn()} subtopics={subtopics} />
    );

    // Should show em dash for null p_know in subtopics
    expect(container.textContent).toContain('—');
  });

  it('highlights expanded row with background color', () => {
    const item = createMockKeywordMastery({
      keyword: { id: 'kw-001', name: 'Test' },
    });

    const { container } = render(
      <KeywordRow item={item} expanded={true} onToggle={vi.fn()} subtopics={[]} />
    );

    // Check for expanded background class
    const mainDiv = container.querySelector('[class*="bg-"]');
    expect(mainDiv?.className).toContain('bg-[#F0F2F5]');
  });
});
