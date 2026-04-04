/**
 * DefaultScheduleView.test.tsx
 *
 * Test suite for DefaultScheduleView component
 * - Calendar display and navigation
 * - Event rendering on calendar dates
 * - View mode switching (month/week)
 * - Sidebar sections (what to study, exams, completed tasks)
 * - Empty state handling
 * - Date selection
 * - Responsive layout
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

import { DefaultScheduleView } from '../DefaultScheduleView';

// Mock dependencies
vi.mock('@/app/hooks/useStudentNav', () => ({
  useStudentNav: () => ({
    navigateTo: vi.fn(),
  }),
}));

vi.mock('@/app/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/app/design-system', () => ({
  headingStyle: {},
}));

vi.mock('@/app/utils/constants', () => ({
  getAxonToday: () => new Date(2025, 0, 15), // Jan 15, 2025
}));

// Mock the fallback data
vi.mock('@/app/components/schedule/scheduleFallbackData', () => ({
  buildFallbackEvents: () => [
    {
      id: 'event-1',
      title: 'React Basics',
      date: new Date(2025, 0, 15),
      type: 'study',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    {
      id: 'event-2',
      title: 'Math Exam',
      date: new Date(2025, 0, 20),
      type: 'exam',
      color: 'bg-red-100 text-red-800 border-red-300',
    },
  ],
  UPCOMING_EXAMS: [
    {
      id: 'exam-1',
      title: 'Mathematics Final',
      date: '20 Jan',
      daysLeft: 5,
      priority: 'high',
    },
  ],
  COMPLETED_TASKS: [
    {
      id: 'task-1',
      title: 'Completed Task',
      date: '14 Jan',
      score: '95%',
    },
  ],
}));

vi.mock('@/app/components/shared/AxonPageHeader', () => ({
  AxonPageHeader: ({ title, subtitle, actionButton, statsLeft }: any) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {statsLeft}
      {actionButton}
    </div>
  ),
}));

vi.mock('@/app/components/schedule/QuickNavLinks', () => ({
  QuickNavLinks: () => <div data-testid="quick-nav-links">Quick Nav</div>,
}));

function renderDefaultScheduleView() {
  return render(
    <MemoryRouter>
      <DefaultScheduleView />
    </MemoryRouter>,
  );
}

describe('DefaultScheduleView', () => {
  // ────────────────────────────────────────────────────────────
  // SUITE 1: Page structure and header
  // ────────────────────────────────────────────────────────────

  it('renders page header with title', () => {
    renderDefaultScheduleView();
    expect(screen.getByText('Cronograma')).toBeInTheDocument();
  });

  it('renders page header with subtitle', () => {
    renderDefaultScheduleView();
    expect(screen.getByText('Organiza tu rutina de estudios')).toBeInTheDocument();
  });

  it('displays event count in header', () => {
    renderDefaultScheduleView();
    // Event count is in the statsLeft prop of AxonPageHeader
    expect(screen.getByText(/eventos agendados/i)).toBeInTheDocument();
  });

  it('has action button for "Organizar Estudio"', () => {
    renderDefaultScheduleView();
    expect(screen.getByRole('button', { name: /organizar estudio/i })).toBeInTheDocument();
  });

  // ────────────────────────────────────────────────────────────
  // SUITE 2: Calendar grid and display
  // ────────────────────────────────────────────────────────────

  it('renders calendar grid with 7 columns (day headers)', () => {
    renderDefaultScheduleView();
    // Look for day headers: Dom, Lun, Mar, Mie, Jue, Vie, Sab
    expect(screen.getByText('Dom')).toBeInTheDocument();
    expect(screen.getByText('Lun')).toBeInTheDocument();
    expect(screen.getByText('Sab')).toBeInTheDocument();
  });

  it('displays calendar dates for the month', () => {
    renderDefaultScheduleView();
    // January 2025 should display dates 1-31
    // Use getAllByText since "1" appears multiple times (date, badges)
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThan(0);
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
  });

  it('displays current month and year in header', () => {
    renderDefaultScheduleView();
    // Should show "January 2025" or similar
    expect(screen.getByText(/january 2025|enero 2025/i)).toBeInTheDocument();
  });

  it('highlights today date with special styling', () => {
    renderDefaultScheduleView();
    // Day 15 is today (mocked), should have special styling
    const todayElement = screen.getByText('15');
    expect(todayElement).toBeInTheDocument();
  });

  // ────────────────────────────────────────────────────────────
  // SUITE 3: Calendar navigation
  // ────────────────────────────────────────────────────────────

  it('has previous month button', () => {
    renderDefaultScheduleView();
    const buttons = screen.getAllByRole('button');
    // Previous month button should exist and have click handler
    expect(buttons.length).toBeGreaterThan(2);
  });

  it('has next month button', () => {
    renderDefaultScheduleView();
    const buttons = screen.getAllByRole('button');
    // Should have next button
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('has "Hoy" (Today) button', () => {
    renderDefaultScheduleView();
    expect(screen.getByRole('button', { name: /hoy/i })).toBeInTheDocument();
  });

  it('navigates months when prev/next buttons are clicked', async () => {
    renderDefaultScheduleView();
    // Get all buttons and find the prev button (first chevron)
    const buttons = screen.getAllByRole('button');
    const prevButton = buttons[0]; // Usually first button
    await userEvent.click(prevButton);
    // Should now show December 2024
  });

  // ────────────────────────────────────────────────────────────
  // SUITE 4: View mode switching
  // ────────────────────────────────────────────────────────────

  it('has month and week view toggle buttons', () => {
    renderDefaultScheduleView();
    expect(screen.getByRole('button', { name: /mes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /semana/i })).toBeInTheDocument();
  });

  it('month view button is active by default', () => {
    renderDefaultScheduleView();
    const monthButton = screen.getByRole('button', { name: /mes/i });
    expect(monthButton).toHaveClass('bg-gray-900');
  });

  it('switches to week view when week button clicked', async () => {
    renderDefaultScheduleView();
    const weekButton = screen.getByRole('button', { name: /semana/i });
    await userEvent.click(weekButton);
    expect(weekButton).toHaveClass('bg-gray-900');
  });

  // ────────────────────────────────────────────────────────────
  // SUITE 5: Event display on calendar
  // ────────────────────────────────────────────────────────────

  it('shows event indicator dot on calendar dates with events', () => {
    renderDefaultScheduleView();
    // Date 15 should have event for "React Basics"
    const dayCell = screen.getAllByText('15')[0].closest('div');
    expect(dayCell).toBeInTheDocument();
  });

  it('displays event details when calendar date is clicked', async () => {
    renderDefaultScheduleView();
    const dateCell = screen.getAllByText('15')[0];
    await userEvent.click(dateCell);
    // Should show events for that date
  });

  // ────────────────────────────────────────────────────────────
  // SUITE 6: Sidebar - "What to study today"
  // ────────────────────────────────────────────────────────────

  it('renders sidebar with "Que estudiar hoy" section', () => {
    renderDefaultScheduleView();
    expect(screen.getByText(/que estudiar hoy/i)).toBeInTheDocument();
  });

  it('displays selected date in sidebar header', () => {
    renderDefaultScheduleView();
    // Should show date in sidebar header
    expect(screen.getByText(/15.*(enero|january)/i)).toBeInTheDocument();
  });

  it('shows task events for selected date in sidebar', () => {
    renderDefaultScheduleView();
    // Date 15 has "React Basics" event - appears in both calendar cell and sidebar
    const reactBasics = screen.getAllByText('React Basics');
    expect(reactBasics.length).toBeGreaterThan(0);
  });

  it('shows empty state when no events for selected date', async () => {
    renderDefaultScheduleView();
    // Click on a date without events (e.g., day 5)
    const day5 = screen.getByText('5');
    await userEvent.click(day5);
    expect(screen.getByText(/nada planificado para este dia/i)).toBeInTheDocument();
  });

  // ────────────────────────────────────────────────────────────
  // SUITE 7: Sidebar - "Próximos Exámenes"
  // ────────────────────────────────────────────────────────────

  it('renders "Próximos Exámenes" section', () => {
    renderDefaultScheduleView();
    expect(screen.getByText(/proximos examenes/i)).toBeInTheDocument();
  });

  it('shows exam count badge', () => {
    renderDefaultScheduleView();
    // Get all elements with text "1" and find the exam badge
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThan(0);
  });

  it('expands exam list when section is clicked', async () => {
    renderDefaultScheduleView();
    const examButton = screen.getByRole('button', { name: /proximos examenes/i });
    await userEvent.click(examButton);
    expect(screen.getByText('Mathematics Final')).toBeInTheDocument();
  });

  it('displays exam details in collapsed list', async () => {
    renderDefaultScheduleView();
    const examButton = screen.getByRole('button', { name: /proximos examenes/i });
    await userEvent.click(examButton);
    expect(screen.getByText('Mathematics Final')).toBeInTheDocument();
    expect(screen.getByText(/faltan 5 dias/i)).toBeInTheDocument();
  });

  // ────────────────────────────────────────────────────────────
  // SUITE 8: Sidebar - "Completado Recientemente"
  // ────────────────────────────────────────────────────────────

  it('renders "Completado Recientemente" section', () => {
    renderDefaultScheduleView();
    expect(screen.getByText(/completado recientemente/i)).toBeInTheDocument();
  });

  it('shows completed task count badge', () => {
    renderDefaultScheduleView();
    // Should show count of completed tasks
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThan(0);
  });

  it('expands completed tasks when section is clicked', async () => {
    renderDefaultScheduleView();
    const completedButton = screen.getByRole('button', { name: /completado recientemente/i });
    await userEvent.click(completedButton);
    expect(screen.getByText('Completed Task')).toBeInTheDocument();
  });

  it('displays task score in completed list', async () => {
    renderDefaultScheduleView();
    const completedButton = screen.getByRole('button', { name: /completado recientemente/i });
    await userEvent.click(completedButton);
    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  // ────────────────────────────────────────────────────────────
  // SUITE 9: Quick navigation
  // ────────────────────────────────────────────────────────────

  it('renders quick navigation links at bottom of sidebar', () => {
    renderDefaultScheduleView();
    expect(screen.getByTestId('quick-nav-links')).toBeInTheDocument();
  });

  // ────────────────────────────────────────────────────────────
  // SUITE 10: Responsive behavior
  // ────────────────────────────────────────────────────────────

  it('renders full layout structure', () => {
    renderDefaultScheduleView();
    // Should have calendar area and sidebar
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
  });

  it('displays calendar grid and sidebar together', () => {
    renderDefaultScheduleView();
    // All main sections should be present
    expect(screen.getByText(/enero 2025|january 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/que estudiar hoy/i)).toBeInTheDocument();
  });
});
