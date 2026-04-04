// ============================================================
// AxonPageHeader — Test Suite
//
// Verifies rendering of title, subtitle, back button, action
// button, stats sections, and responsive behavior.
// ============================================================
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxonPageHeader } from '../AxonPageHeader';

describe('AxonPageHeader', () => {
  // 1. Basic rendering with title and subtitle -------------------------
  it('renders title and subtitle', () => {
    render(
      <AxonPageHeader
        title="Dashboard"
        subtitle="Welcome to your learning dashboard"
      />
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome to your learning dashboard')).toBeInTheDocument();
  });

  // 2. Renders back button when onBack is provided ----------------------
  it('renders back button when onBack callback is provided', () => {
    const handleBack = vi.fn();
    render(
      <AxonPageHeader
        title="Dashboard"
        subtitle="Welcome"
        onBack={handleBack}
      />
    );

    const backButton = screen.getByRole('button');
    expect(backButton).toBeInTheDocument();
  });

  // 3. Back button calls onBack callback --------------------------------
  it('calls onBack callback when back button is clicked', async () => {
    const handleBack = vi.fn();
    const user = userEvent.setup();

    render(
      <AxonPageHeader
        title="Dashboard"
        subtitle="Welcome"
        onBack={handleBack}
      />
    );

    const backButton = screen.getByRole('button');
    await user.click(backButton);

    expect(handleBack).toHaveBeenCalledOnce();
  });

  // 4. Back button uses custom label -----------------------------------
  it('uses custom back label when provided', () => {
    render(
      <AxonPageHeader
        title="Dashboard"
        subtitle="Welcome"
        onBack={() => {}}
        backLabel="Regresar"
      />
    );

    expect(screen.getByText('Regresar')).toBeInTheDocument();
  });

  // 5. Default back label is "Volver" ---------------------------------
  it('uses default "Volver" label when backLabel not provided', () => {
    render(
      <AxonPageHeader
        title="Dashboard"
        subtitle="Welcome"
        onBack={() => {}}
      />
    );

    expect(screen.getByText('Volver')).toBeInTheDocument();
  });

  // 6. Action button is rendered when provided -------------------------
  it('renders action button when provided', () => {
    render(
      <AxonPageHeader
        title="Dashboard"
        subtitle="Welcome"
        actionButton={<button>Export</button>}
      />
    );

    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  // 7. Action button is not rendered when not provided ------------------
  it('does not render action button when not provided', () => {
    render(
      <AxonPageHeader
        title="Dashboard"
        subtitle="Welcome"
      />
    );

    // Should not have a button (except back button in other test)
    const buttons = screen.queryAllByRole('button');
    expect(buttons.length).toBe(0);
  });

  // 8. Stats sections render when provided ------------------------------
  it('renders statsLeft when provided', () => {
    render(
      <AxonPageHeader
        title="Dashboard"
        subtitle="Welcome"
        statsLeft={<div data-testid="stats-left">Students: 25</div>}
      />
    );

    expect(screen.getByTestId('stats-left')).toBeInTheDocument();
  });

  // 9. Stats right section renders when provided ------------------------
  it('renders statsRight when provided', () => {
    render(
      <AxonPageHeader
        title="Dashboard"
        subtitle="Welcome"
        statsRight={<div data-testid="stats-right">Avg: 8.5</div>}
      />
    );

    expect(screen.getByTestId('stats-right')).toBeInTheDocument();
  });

  // 10. Both stats sections render together -----------------------------
  it('renders both statsLeft and statsRight together', () => {
    render(
      <AxonPageHeader
        title="Dashboard"
        subtitle="Welcome"
        statsLeft={<div data-testid="stats-left">Students: 25</div>}
        statsRight={<div data-testid="stats-right">Avg: 8.5</div>}
      />
    );

    expect(screen.getByTestId('stats-left')).toBeInTheDocument();
    expect(screen.getByTestId('stats-right')).toBeInTheDocument();
  });

  // 11. No stats section when neither provided --------------------------
  it('does not render stats section when neither statsLeft nor statsRight provided', () => {
    const { container } = render(
      <AxonPageHeader
        title="Dashboard"
        subtitle="Welcome"
      />
    );

    // Should not have the border-t element that indicates stats section
    const statsBorder = container.querySelector('.border-t');
    expect(statsBorder).not.toBeInTheDocument();
  });

  // 12. Title and subtitle text are properly displayed -------------------
  it('displays long title and subtitle correctly', () => {
    render(
      <AxonPageHeader
        title="Educational Analytics Dashboard for Advanced Students"
        subtitle="This is a comprehensive dashboard showing learning progress and performance metrics"
      />
    );

    expect(screen.getByText('Educational Analytics Dashboard for Advanced Students')).toBeInTheDocument();
    expect(screen.getByText('This is a comprehensive dashboard showing learning progress and performance metrics')).toBeInTheDocument();
  });

  // 13. All props work together -----------------------------------------
  it('renders all props together correctly', async () => {
    const handleBack = vi.fn();
    const user = userEvent.setup();

    render(
      <AxonPageHeader
        title="Classes"
        subtitle="Manage your courses"
        onBack={handleBack}
        backLabel="Go Back"
        actionButton={<button>New Class</button>}
        statsLeft={<div data-testid="left-stats">3 Classes</div>}
        statsRight={<div data-testid="right-stats">95 Students</div>}
      />
    );

    // Check all content
    expect(screen.getByText('Classes')).toBeInTheDocument();
    expect(screen.getByText('Manage your courses')).toBeInTheDocument();
    expect(screen.getByText('Go Back')).toBeInTheDocument();
    expect(screen.getByText('New Class')).toBeInTheDocument();
    expect(screen.getByTestId('left-stats')).toBeInTheDocument();
    expect(screen.getByTestId('right-stats')).toBeInTheDocument();

    // Check back button works
    const backButton = screen.getByRole('button', { name: /go back/i });
    await user.click(backButton);
    expect(handleBack).toHaveBeenCalledOnce();
  });

  // 14. Empty subtitle is handled ----------------------------------------
  it('handles empty subtitle gracefully', () => {
    render(
      <AxonPageHeader
        title="Dashboard"
        subtitle=""
      />
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  // 15. No back button when onBack not provided -------------------------
  it('renders empty placeholder when onBack not provided', () => {
    const { container } = render(
      <AxonPageHeader
        title="Dashboard"
        subtitle="Welcome"
      />
    );

    // Should have the back button area but no actual button
    const buttons = screen.queryAllByRole('button');
    expect(buttons.length).toBe(0);
  });
});
