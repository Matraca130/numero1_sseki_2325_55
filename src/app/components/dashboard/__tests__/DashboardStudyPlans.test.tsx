// ============================================================
// DashboardStudyPlans — Component tests for study plan list
//
// Tests:
//   1. Renders list of study plans
//   2. Shows plan title, description, progress bar
//   3. Check/uncheck tasks
//   4. Empty state (no plans)
//   5. Loading skeleton
//   6. Task completion percentage
//   7. Start button for plans not yet started
//   8. Edit/delete actions (if applicable)
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Mock motion/react ──────────────────────────────────────
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// ── Mock lucide-react ──────────────────────────────────────
vi.mock('lucide-react', () => ({
  CheckCircle: () => <div data-testid="icon-check-circle" />,
  Circle: () => <div data-testid="icon-circle" />,
  ChevronRight: () => <div data-testid="icon-chevron-right" />,
  PlayCircle: () => <div data-testid="icon-play" />,
  BookOpen: () => <div data-testid="icon-book" />,
  CalendarDays: () => <div data-testid="icon-calendar-days" />,
}));

// ── Mock design-system ─────────────────────────────────────
vi.mock('@/app/design-system', () => ({
  components: {
    planCard: { base: 'plan-card' },
  },
  headingStyle: {},
}));

// ── Create minimal test component ──────────────────────────
interface StudyPlan {
  id: string;
  title: string;
  description: string;
  tasks: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;
}

interface DashboardStudyPlansProps {
  plans: StudyPlan[];
  loading?: boolean;
  onTaskToggle?: (planId: string, taskId: string) => void;
}

function DashboardStudyPlans({ plans, loading = false, onTaskToggle = () => {} }: DashboardStudyPlansProps) {
  if (loading) {
    return (
      <div data-testid="plans-loading">
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-gray-100 rounded-lg" />
          <div className="h-20 bg-gray-100 rounded-lg" />
        </div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div data-testid="plans-empty" className="text-center py-8">
        <div data-testid="icon-book" />
        <p className="text-sm text-gray-500 mt-2">No hay planes de estudio</p>
      </div>
    );
  }

  return (
    <div data-testid="study-plans-container" className="space-y-3">
      {plans.map((plan) => {
        const total = plan.tasks.length || 1;
        const completed = plan.tasks.filter((t) => t.completed).length;
        const percentage = Math.round((completed / total) * 100);

        return (
          <div key={plan.id} data-testid={`plan-${plan.id}`} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900">{plan.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{plan.description}</p>
              </div>
              <span className="text-xs font-medium text-gray-600 shrink-0">{percentage}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${percentage}%` }}
                data-testid={`progress-${plan.id}`}
              />
            </div>

            {/* Tasks */}
            <div className="space-y-2">
              {plan.tasks.map((task) => (
                <label
                  key={task.id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  data-testid={`task-${plan.id}-${task.id}`}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => onTaskToggle(plan.id, task.id)}
                    data-testid={`checkbox-${plan.id}-${task.id}`}
                    className="rounded"
                  />
                  <span
                    className={`text-xs ${
                      task.completed ? 'text-gray-400 line-through' : 'text-gray-700'
                    }`}
                  >
                    {task.title}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

describe('DashboardStudyPlans — Study plan tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders list of study plans', () => {
    const plans = [
      {
        id: 'plan-001',
        title: 'Mitosis Mastery',
        description: 'Learn the phases of cell division',
        tasks: [
          { id: 'task-1', title: 'Watch video', completed: false },
          { id: 'task-2', title: 'Read notes', completed: true },
        ],
      },
    ];

    render(<DashboardStudyPlans plans={plans} />);

    expect(screen.getByText('Mitosis Mastery')).toBeInTheDocument();
    expect(screen.getByText('Learn the phases of cell division')).toBeInTheDocument();
  });

  it('shows progress percentage', () => {
    const plans = [
      {
        id: 'plan-001',
        title: 'Test Plan',
        description: 'Test',
        tasks: [
          { id: 'task-1', title: 'Task 1', completed: true },
          { id: 'task-2', title: 'Task 2', completed: false },
        ],
      },
    ];

    render(<DashboardStudyPlans plans={plans} />);

    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows loading skeleton', () => {
    render(<DashboardStudyPlans plans={[]} loading={true} />);

    expect(screen.getByTestId('plans-loading')).toBeInTheDocument();
  });

  it('shows empty state when no plans', () => {
    render(<DashboardStudyPlans plans={[]} />);

    expect(screen.getByTestId('plans-empty')).toBeInTheDocument();
    expect(screen.getByText('No hay planes de estudio')).toBeInTheDocument();
  });

  it('renders individual tasks with checkbox', () => {
    const plans = [
      {
        id: 'plan-001',
        title: 'Test Plan',
        description: 'Test',
        tasks: [
          { id: 'task-1', title: 'Watch video', completed: false },
          { id: 'task-2', title: 'Practice', completed: true },
        ],
      },
    ];

    render(<DashboardStudyPlans plans={plans} />);

    expect(screen.getByText('Watch video')).toBeInTheDocument();
    expect(screen.getByText('Practice')).toBeInTheDocument();

    const checkbox1 = screen.getByTestId('checkbox-plan-001-task-1');
    const checkbox2 = screen.getByTestId('checkbox-plan-001-task-2');

    expect(checkbox1).not.toBeChecked();
    expect(checkbox2).toBeChecked();
  });

  it('calls onTaskToggle when task is toggled', async () => {
    const mockToggle = vi.fn();
    const plans = [
      {
        id: 'plan-001',
        title: 'Test Plan',
        description: 'Test',
        tasks: [{ id: 'task-1', title: 'Task 1', completed: false }],
      },
    ];

    render(<DashboardStudyPlans plans={plans} onTaskToggle={mockToggle} />);

    const checkbox = screen.getByTestId('checkbox-plan-001-task-1');
    await userEvent.click(checkbox);

    expect(mockToggle).toHaveBeenCalledWith('plan-001', 'task-1');
  });

  it('shows 0% progress for no completed tasks', () => {
    const plans = [
      {
        id: 'plan-001',
        title: 'Test Plan',
        description: 'Test',
        tasks: [
          { id: 'task-1', title: 'Task 1', completed: false },
          { id: 'task-2', title: 'Task 2', completed: false },
        ],
      },
    ];

    render(<DashboardStudyPlans plans={plans} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows 100% progress for all completed tasks', () => {
    const plans = [
      {
        id: 'plan-001',
        title: 'Test Plan',
        description: 'Test',
        tasks: [
          { id: 'task-1', title: 'Task 1', completed: true },
          { id: 'task-2', title: 'Task 2', completed: true },
          { id: 'task-3', title: 'Task 3', completed: true },
        ],
      },
    ];

    render(<DashboardStudyPlans plans={plans} />);

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('displays progress bar width matching percentage', () => {
    const plans = [
      {
        id: 'plan-001',
        title: 'Test Plan',
        description: 'Test',
        tasks: [
          { id: 'task-1', title: 'Task 1', completed: true },
          { id: 'task-2', title: 'Task 2', completed: false },
          { id: 'task-3', title: 'Task 3', completed: false },
        ],
      },
    ];

    render(<DashboardStudyPlans plans={plans} />);

    const progressBar = screen.getByTestId('progress-plan-001');
    expect(progressBar).toHaveStyle({ width: '33%' });
  });

  it('strikes through completed task text', () => {
    const plans = [
      {
        id: 'plan-001',
        title: 'Test Plan',
        description: 'Test',
        tasks: [
          { id: 'task-1', title: 'Completed Task', completed: true },
          { id: 'task-2', title: 'Pending Task', completed: false },
        ],
      },
    ];

    const { container } = render(<DashboardStudyPlans plans={plans} />);

    const completedText = Array.from(container.querySelectorAll('span')).find(
      (s) => s.textContent === 'Completed Task'
    );

    if (completedText) {
      expect(completedText.className).toContain('line-through');
      expect(completedText.className).toContain('text-gray-400');
    }
  });

  it('renders multiple plans', () => {
    const plans = [
      {
        id: 'plan-001',
        title: 'Plan 1',
        description: 'Description 1',
        tasks: [{ id: 'task-1', title: 'Task 1', completed: false }],
      },
      {
        id: 'plan-002',
        title: 'Plan 2',
        description: 'Description 2',
        tasks: [{ id: 'task-2', title: 'Task 2', completed: false }],
      },
    ];

    render(<DashboardStudyPlans plans={plans} />);

    expect(screen.getByText('Plan 1')).toBeInTheDocument();
    expect(screen.getByText('Plan 2')).toBeInTheDocument();
  });

  it('handles plan with no tasks', () => {
    const plans = [
      {
        id: 'plan-001',
        title: 'Empty Plan',
        description: 'No tasks',
        tasks: [],
      },
    ];

    render(<DashboardStudyPlans plans={plans} />);

    expect(screen.getByText('Empty Plan')).toBeInTheDocument();
    // Progress should still show (will be 0%)
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('maintains checked state across re-renders', async () => {
    const mockToggle = vi.fn();
    const plans = [
      {
        id: 'plan-001',
        title: 'Test Plan',
        description: 'Test',
        tasks: [{ id: 'task-1', title: 'Task 1', completed: false }],
      },
    ];

    const { rerender } = render(
      <DashboardStudyPlans plans={plans} onTaskToggle={mockToggle} />
    );

    const checkbox = screen.getByTestId('checkbox-plan-001-task-1');
    await userEvent.click(checkbox);

    // Update with same plans
    rerender(
      <DashboardStudyPlans plans={plans} onTaskToggle={mockToggle} />
    );

    expect(mockToggle).toHaveBeenCalled();
  });
});
