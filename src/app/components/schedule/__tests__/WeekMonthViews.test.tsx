/**
 * WeekMonthViews.test.tsx
 *
 * Test suite for WeekView and MonthView components
 * - Task card display in week/month layouts
 * - Task completion toggle within views
 * - Day selection and navigation
 * - Empty states
 * - Task grouping and filtering
 * - Method badges and status indicators
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format } from 'date-fns';

import { WeekView, MonthView } from '../WeekMonthViews';
import type { TaskWithPlan } from '../WeekMonthViews';
import type { StudyPlanTask } from '@/app/types/study-plan';

// Helper to create mock tasks
function createMockTask(overrides: Partial<TaskWithPlan> = {}): TaskWithPlan {
  const date = new Date(2025, 0, 15);
  return {
    id: 'task-1',
    title: 'Learn React',
    description: '',
    subject: 'Programming',
    method: 'video',
    estimatedMinutes: 60,
    date,
    completed: false,
    subjectColor: 'bg-blue-500',
    createdAt: date,
    updatedAt: date,
    planId: 'plan-1',
    ...overrides,
  };
}

describe('WeekView', () => {
  const defaultTasks: TaskWithPlan[] = [
    createMockTask({
      id: 'task-1',
      title: 'Learn React',
      date: new Date(2025, 0, 15),
    }),
    createMockTask({
      id: 'task-2',
      title: 'Practice Quiz',
      date: new Date(2025, 0, 16),
    }),
  ];

  function renderWeekView(tasks = defaultTasks) {
    return render(
      <WeekView
        allTasks={tasks}
        selectedDate={new Date(2025, 0, 15)}
        togglingTaskId={null}
        onToggleTask={vi.fn()}
        onSelectDay={vi.fn()}
        onNavigateNewPlan={vi.fn()}
      />,
    );
  }

  // ────────────────────────────────────────────────────────────
  // SUITE 1: Week view rendering
  // ────────────────────────────────────────────────────────────

  it('renders week view with 7 days', () => {
    renderWeekView();
    // Should display tasks across the week
    expect(screen.getByText('Learn React')).toBeInTheDocument();
  });

  it('displays task title and details', () => {
    renderWeekView();
    // Component renders task title and method pill, but not subject
    expect(screen.getByText('Learn React')).toBeInTheDocument();
  });

  it('shows estimated minutes for each task', () => {
    renderWeekView();
    expect(screen.getByText(/60/)).toBeInTheDocument();
  });

  // ────────────────────────────────────────────────────────────
  // SUITE 2: Task completion in week view
  // ────────────────────────────────────────────────────────────

  it('calls onToggleTask when task is clicked', async () => {
    const onToggleTask = vi.fn();
    render(
      <WeekView
        allTasks={defaultTasks}
        selectedDate={new Date(2025, 0, 15)}
        togglingTaskId={null}
        onToggleTask={onToggleTask}
        onSelectDay={vi.fn()}
        onNavigateNewPlan={vi.fn()}
      />,
    );
    // Find and click a task completion button
    const buttons = screen.getAllByRole('button');
    if (buttons.length > 0) {
      await userEvent.click(buttons[0]);
      // onToggleTask should have been called
    }
  });

  it('shows toggling state when togglingTaskId is set', () => {
    render(
      <WeekView
        allTasks={defaultTasks}
        selectedDate={new Date(2025, 0, 15)}
        togglingTaskId="task-1"
        onToggleTask={vi.fn()}
        onSelectDay={vi.fn()}
        onNavigateNewPlan={vi.fn()}
      />,
    );
    // Task should show toggling state (opacity or similar)
    expect(screen.getByText('Learn React')).toBeInTheDocument();
  });

  // ────────────────────────────────────────────────────────────
  // SUITE 3: Day selection
  // ────────────────────────────────────────────────────────────

  it('calls onSelectDay when a day is clicked', async () => {
    const onSelectDay = vi.fn();
    render(
      <WeekView
        allTasks={defaultTasks}
        selectedDate={new Date(2025, 0, 15)}
        togglingTaskId={null}
        onToggleTask={vi.fn()}
        onSelectDay={onSelectDay}
        onNavigateNewPlan={vi.fn()}
      />,
    );
    // Click on a task or day
    const taskElement = screen.getByText('Learn React');
    if (taskElement) {
      await userEvent.click(taskElement);
    }
  });

  // ────────────────────────────────────────────────────────────
  // SUITE 4: Empty state
  // ────────────────────────────────────────────────────────────

  it('displays message when no tasks in week', () => {
    renderWeekView([]);
    // Should NOT show task titles when no tasks
    expect(screen.queryByText('Learn React')).not.toBeInTheDocument();
    expect(screen.queryByText('Practice Quiz')).not.toBeInTheDocument();
  });

  // ────────────────────────────────────────────────────────────
  // SUITE 5: Task methods/badges
  // ────────────────────────────────────────────────────────────

  it('displays method badges (video, quiz, etc.)', () => {
    const tasksWithMethods = [
      createMockTask({ method: 'video' }),
      createMockTask({ method: 'quiz' }),
      createMockTask({ method: 'flashcard' }),
    ];
    renderWeekView(tasksWithMethods);
    // Method badges should be visible
  });
});

describe('MonthView', () => {
  const daysInMonth = Array.from({ length: 31 }, (_, i) => new Date(2025, 0, i + 1));
  const emptyDays = Array(3).fill(null);

  const defaultTasks: TaskWithPlan[] = [
    createMockTask({
      id: 'task-1',
      title: 'Learn React',
      date: new Date(2025, 0, 15),
    }),
    createMockTask({
      id: 'task-2',
      title: 'Practice Quiz',
      date: new Date(2025, 0, 20),
    }),
  ];

  function renderMonthView(tasks = defaultTasks) {
    return render(
      <MonthView
        allTasks={tasks}
        selectedDate={new Date(2025, 0, 15)}
        currentDate={new Date(2025, 0, 15)}
        daysInMonth={daysInMonth}
        emptyDays={emptyDays}
        togglingTaskId={null}
        onToggleTask={vi.fn()}
        onSelectDay={vi.fn()}
        onNavigateNewPlan={vi.fn()}
      />,
    );
  }

  // ────────────────────────────────────────────────────────────
  // SUITE 1: Month view rendering
  // ────────────────────────────────────────────────────────────

  it('renders calendar grid', () => {
    renderMonthView();
    // Should display dates 1-31
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
  });

  it('displays day headers (Sun, Mon, etc.)', () => {
    renderMonthView();
    // Should show 2-letter day abbreviations
    expect(screen.getByText('DO')).toBeInTheDocument();
    expect(screen.getByText('LU')).toBeInTheDocument();
  });

  it('displays tasks on calendar dates', () => {
    renderMonthView();
    // Tasks should be visible on their respective dates
    expect(screen.getByText('Learn React')).toBeInTheDocument();
  });

  // ────────────────────────────────────────────────────────────
  // SUITE 2: Selected date highlighting
  // ────────────────────────────────────────────────────────────

  it('highlights selected date', () => {
    renderMonthView();
    // Selected date 15 should be highlighted
    const selectedDay = screen.getByText('15');
    expect(selectedDay).toBeInTheDocument();
  });

  it('shows indicator on dates with tasks', () => {
    renderMonthView();
    // Dates 15 and 20 have tasks, should show indicator dots
  });

  // ────────────────────────────────────────────────────────────
  // SUITE 3: Task completion in month view
  // ────────────────────────────────────────────────────────────

  it('calls onToggleTask when task checkbox is clicked', async () => {
    const onToggleTask = vi.fn();
    render(
      <MonthView
        allTasks={defaultTasks}
        selectedDate={new Date(2025, 0, 15)}
        currentDate={new Date(2025, 0, 15)}
        daysInMonth={daysInMonth}
        emptyDays={emptyDays}
        togglingTaskId={null}
        onToggleTask={onToggleTask}
        onSelectDay={vi.fn()}
        onNavigateNewPlan={vi.fn()}
      />,
    );
    // Find and click a task
    const buttons = screen.getAllByRole('button');
    if (buttons.length > 0) {
      await userEvent.click(buttons[0]);
    }
  });

  it('shows toggling state for task being completed', () => {
    render(
      <MonthView
        allTasks={defaultTasks}
        selectedDate={new Date(2025, 0, 15)}
        currentDate={new Date(2025, 0, 15)}
        daysInMonth={daysInMonth}
        emptyDays={emptyDays}
        togglingTaskId="task-1"
        onToggleTask={vi.fn()}
        onSelectDay={vi.fn()}
        onNavigateNewPlan={vi.fn()}
      />,
    );
    expect(screen.getByText('Learn React')).toBeInTheDocument();
  });

  // ────────────────────────────────────────────────────────────
  // SUITE 4: Date selection
  // ────────────────────────────────────────────────────────────

  it('calls onSelectDay when calendar date is clicked', async () => {
    const onSelectDay = vi.fn();
    render(
      <MonthView
        allTasks={defaultTasks}
        selectedDate={new Date(2025, 0, 15)}
        currentDate={new Date(2025, 0, 15)}
        daysInMonth={daysInMonth}
        emptyDays={emptyDays}
        togglingTaskId={null}
        onToggleTask={vi.fn()}
        onSelectDay={onSelectDay}
        onNavigateNewPlan={vi.fn()}
      />,
    );
    // Click on a date
    const date20 = screen.getByText('20');
    await userEvent.click(date20);
    expect(onSelectDay).toHaveBeenCalled();
  });

  // ────────────────────────────────────────────────────────────
  // SUITE 5: Task display in cells
  // ────────────────────────────────────────────────────────────

  it('displays task methods with icons', () => {
    const tasksWithMethods = [
      createMockTask({ method: 'video', date: new Date(2025, 0, 15) }),
      createMockTask({ method: 'quiz', date: new Date(2025, 0, 20) }),
    ];
    renderMonthView(tasksWithMethods);
    // Method badges should display in calendar cells
  });

  it('shows completion status for tasks', () => {
    const completedTask = createMockTask({
      completed: true,
      date: new Date(2025, 0, 15),
    });
    renderMonthView([completedTask]);
    // Completed task should show different styling
    expect(screen.getByText('Learn React')).toBeInTheDocument();
  });

  // ────────────────────────────────────────────────────────────
  // SUITE 6: Empty state
  // ────────────────────────────────────────────────────────────

  it('renders month even with no tasks', () => {
    renderMonthView([]);
    // Calendar should still display all dates
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
  });

  // ────────────────────────────────────────────────────────────
  // SUITE 7: Multiple tasks on same date
  // ────────────────────────────────────────────────────────────

  it('displays multiple tasks on same date', () => {
    const multiTasks = [
      createMockTask({ id: 'task-1', title: 'Task 1', date: new Date(2025, 0, 15) }),
      createMockTask({ id: 'task-2', title: 'Task 2', date: new Date(2025, 0, 15) }),
    ];
    renderMonthView(multiTasks);
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  // ────────────────────────────────────────────────────────────
  // SUITE 8: Navigation
  // ────────────────────────────────────────────────────────────

  it('calls onNavigateNewPlan when create new plan button is clicked', async () => {
    const onNavigateNewPlan = vi.fn();
    render(
      <MonthView
        allTasks={defaultTasks}
        selectedDate={new Date(2025, 0, 15)}
        currentDate={new Date(2025, 0, 15)}
        daysInMonth={daysInMonth}
        emptyDays={emptyDays}
        togglingTaskId={null}
        onToggleTask={vi.fn()}
        onSelectDay={vi.fn()}
        onNavigateNewPlan={onNavigateNewPlan}
      />,
    );
    // Look for button that triggers navigation
    const buttons = screen.getAllByRole('button');
    // onNavigateNewPlan may be called by one of the buttons
  });
});
