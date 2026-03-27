// ============================================================
// EventBadge — Component Tests
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { EventBadge, EventBadgeOverflow } from '../EventBadge';
import type { CalendarEvent } from '@/app/hooks/useCalendarEvents';

// ── Mock useMediaQuery (default: desktop) ───────────────────

vi.mock('@/app/hooks/useMediaQuery', () => ({
  useMediaQuery: () => true,
}));

// ── Helpers ─────────────────────────────────────────────────

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'evt-1',
    student_id: 'stu-1',
    course_id: 'crs-1',
    institution_id: 'inst-1',
    title: 'Parcial Algebra',
    date: '2026-03-15',
    time: null,
    location: null,
    is_final: false,
    exam_type: 'exam',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── EventBadge Tests ────────────────────────────────────────

describe('EventBadge', () => {
  it('renders event title', () => {
    render(<EventBadge event={makeEvent({ title: 'Parcial Historia' })} />);
    expect(screen.getByText('Parcial Historia')).toBeInTheDocument();
  });

  it('calls onTap when badge is clicked', () => {
    const onTap = vi.fn();
    const event = makeEvent();
    render(<EventBadge event={event} onTap={onTap} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onTap).toHaveBeenCalledWith(event);
  });

  it('renders as a button element', () => {
    render(<EventBadge event={makeEvent()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('sets title attribute for tooltip', () => {
    render(<EventBadge event={makeEvent({ title: 'Final Quimica' })} />);
    expect(screen.getByRole('button')).toHaveAttribute('title', 'Final Quimica');
  });
});

// ── EventBadgeOverflow Tests ────────────────────────────────

describe('EventBadgeOverflow', () => {
  it('shows "+N" badge when totalEvents > 1', () => {
    render(<EventBadgeOverflow totalEvents={4} />);
    expect(screen.getByText('+3')).toBeInTheDocument();
  });

  it('returns null when totalEvents <= 1', () => {
    const { container } = render(<EventBadgeOverflow totalEvents={1} />);
    expect(container.innerHTML).toBe('');
  });

  it('calls onTap when overflow badge is clicked', () => {
    const onTap = vi.fn();
    render(<EventBadgeOverflow totalEvents={3} onTap={onTap} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('has correct aria-label for accessibility', () => {
    render(<EventBadgeOverflow totalEvents={5} />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toContain('adicionales');
  });
});
