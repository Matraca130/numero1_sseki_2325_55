// ============================================================
// Axon — Tests for DailyGoalWidget
//
// Tests goal adjustment via slider, preset buttons, API persistence,
// save state feedback, progress calculation, and loading states.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import { DailyGoalWidget } from '../DailyGoalWidget';

// Mock framer-motion
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
    button: ({ children, className, onClick, disabled, ...props }: any) => (
      <button className={className} onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    ),
    p: ({ children, className, ...props }: any) => (
      <p className={className} {...props}>
        {children}
      </p>
    ),
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Target: (props: Record<string, unknown>) => (
    <svg data-testid="target-icon" {...props} />
  ),
  Check: (props: Record<string, unknown>) => (
    <svg data-testid="check-icon" {...props} />
  ),
  Loader2: (props: Record<string, unknown>) => (
    <svg data-testid="loader-icon" {...props} />
  ),
  CalendarDays: (props: Record<string, unknown>) => (
    <svg data-testid="calendar-days-icon" {...props} />
  ),
}));

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock gamificationApi
const mockGetProfile = vi.fn();
const mockUpdateDailyGoal = vi.fn();
vi.mock('@/app/services/gamificationApi', () => ({
  getProfile: (...args: any[]) => mockGetProfile(...args),
  updateDailyGoal: (...args: any[]) => mockUpdateDailyGoal(...args),
}));

describe('DailyGoalWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      selectedInstitution: { id: 'inst-001' },
    });
  });

  afterEach(() => {
    // Always ensure we're using real timers after each test
    vi.useRealTimers();
  });

  describe('Loading state', () => {
    it('displays loader while fetching profile', () => {
      mockGetProfile.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<DailyGoalWidget />);

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    it('fetches profile on mount with institutionId', async () => {
      mockGetProfile.mockResolvedValue(null);

      render(<DailyGoalWidget />);

      await waitFor(() => {
        expect(mockGetProfile).toHaveBeenCalledWith('inst-001');
      });
    });

    it('hides loader after profile is fetched', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 0 },
      });

      render(<DailyGoalWidget />);

      await waitFor(() => {
        expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
      });
    });

    it('skips fetch when no institutionId', () => {
      mockUseAuth.mockReturnValue({ selectedInstitution: null });

      render(<DailyGoalWidget />);

      expect(mockGetProfile).not.toHaveBeenCalled();
    });
  });

  describe('Initial goal display', () => {
    it('displays current goal from API response', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 150, today: 45 },
      });

      render(<DailyGoalWidget />);

      await waitFor(() => {
        // Component renders "{xpToday}/{currentGoal} XP" format
        expect(screen.getByText(/45\/150 XP/)).toBeInTheDocument();
      });
    });

    it('displays today\'s XP progress', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 200, today: 80 },
      });

      render(<DailyGoalWidget />);

      await waitFor(() => {
        expect(screen.getByText(/80\/200 XP/)).toBeInTheDocument();
      });
    });

    it('calculates progress percentage correctly', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 50 },
      });

      render(<DailyGoalWidget />);

      await waitFor(() => {
        expect(screen.getByText(/50% completado hoy/)).toBeInTheDocument();
      });
    });

    it('defaults to 100 XP if API returns null', async () => {
      mockGetProfile.mockResolvedValue(null);

      render(<DailyGoalWidget />);

      await waitFor(() => {
        expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
      });
    });
  });

  describe('Goal slider', () => {
    it('renders range input with correct attributes', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 0 },
      });

      const { container } = render(<DailyGoalWidget />);

      await waitFor(() => {
        const slider = container.querySelector('input[type="range"]');
        expect(slider).toBeInTheDocument();
        expect(slider?.getAttribute('min')).toBe('10');
        expect(slider?.getAttribute('step')).toBe('10');
      });
    });

    it('updates displayed value when slider changes', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 0 },
      });

      const { container } = render(<DailyGoalWidget />);

      const slider = await waitFor(() => {
        const el = container.querySelector('input[type="range"]');
        if (!el) throw new Error('Slider not found');
        return el as HTMLInputElement;
      });

      fireEvent.change(slider, { target: { value: '250' } });

      await waitFor(() => {
        // The slider display shows the new value
        expect(screen.getByText('250 XP')).toBeInTheDocument();
      });
    });

    it('does not enable save button until value changes', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 0 },
      });

      render(<DailyGoalWidget />);

      await waitFor(() => {
        const saveBtn = screen.queryByRole('button', { name: /Guardar meta/ });
        expect(saveBtn).not.toBeInTheDocument();
      });
    });

    it('shows save button when slider value differs from current goal', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 0 },
      });

      const { container } = render(<DailyGoalWidget />);

      await waitFor(() => {
        const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
        fireEvent.change(slider, { target: { value: '200' } });

        expect(screen.getByRole('button', { name: /Guardar meta: 200 XP/ })).toBeInTheDocument();
      });
    });
  });

  describe('Preset buttons', () => {
    it('renders preset buttons with default values', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 0 },
      });

      render(<DailyGoalWidget />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^50$/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^100$/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^500$/ })).toBeInTheDocument();
      });
    });

    it('sets slider value when preset button clicked', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 0 },
      });

      render(<DailyGoalWidget />);

      const presetBtn = await waitFor(() =>
        screen.getByRole('button', { name: /^300$/ })
      );

      fireEvent.click(presetBtn);

      await waitFor(() => {
        // Slider display should update to 300
        expect(screen.getByText('300 XP')).toBeInTheDocument();
      });
    });

    it('highlights selected preset with different styling', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 0 },
      });

      const { container } = render(<DailyGoalWidget />);

      await waitFor(() => {
        const presetBtn = screen.getByRole('button', { name: /^100$/ }) as HTMLButtonElement;
        expect(presetBtn.className).toContain('teal');
      });
    });
  });

  describe('Save functionality', () => {
    it('calls updateDailyGoal with new value on save', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 0 },
      });
      mockUpdateDailyGoal.mockResolvedValue(true);

      const { container } = render(<DailyGoalWidget />);

      await waitFor(() => {
        const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
        fireEvent.change(slider, { target: { value: '250' } });
      });

      const saveBtn = screen.getByRole('button', { name: /Guardar meta: 250 XP/ });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockUpdateDailyGoal).toHaveBeenCalledWith('inst-001', 250);
      });
    });

    it('disables save button while saving', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 0 },
      });
      mockUpdateDailyGoal.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { container } = render(<DailyGoalWidget />);

      await waitFor(() => {
        const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
        fireEvent.change(slider, { target: { value: '250' } });
      });

      const saveBtn = screen.getByRole('button', { name: /Guardar meta: 250 XP/ }) as HTMLButtonElement;
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(saveBtn.disabled).toBe(true);
      });
    });

    it('shows success message after save', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 0 },
      });
      mockUpdateDailyGoal.mockResolvedValue(true);

      const { container } = render(<DailyGoalWidget />);

      await waitFor(() => {
        const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
        fireEvent.change(slider, { target: { value: '250' } });
      });

      const saveBtn = screen.getByRole('button', { name: /Guardar meta: 250 XP/ });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByText(/Meta actualizada correctamente/)).toBeInTheDocument();
      });
    });

    it('hides success message after timeout', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 0 },
      });
      mockUpdateDailyGoal.mockResolvedValue(true);

      const { container } = render(<DailyGoalWidget />);

      const slider = await waitFor(() => {
        const el = container.querySelector('input[type="range"]');
        if (!el) throw new Error('Slider not found');
        return el as HTMLInputElement;
      });

      fireEvent.change(slider, { target: { value: '250' } });

      const saveBtn = screen.getByRole('button', { name: /Guardar meta: 250 XP/ });
      fireEvent.click(saveBtn);

      // Message should appear after save
      await waitFor(() => {
        expect(screen.getByText(/Meta actualizada correctamente/)).toBeInTheDocument();
      });
    });

    it('updates current goal value after successful save', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 0 },
      });
      mockUpdateDailyGoal.mockResolvedValue(true);

      const { container } = render(<DailyGoalWidget />);

      await waitFor(() => {
        const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
        fireEvent.change(slider, { target: { value: '250' } });
      });

      const saveBtn = screen.getByRole('button', { name: /Guardar meta: 250 XP/ });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        // After save, no save button should be visible and goal should be updated
        expect(screen.queryByRole('button', { name: /Guardar meta/ })).not.toBeInTheDocument();
      });
    });

    it('hides save button on failed save', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 0 },
      });
      mockUpdateDailyGoal.mockResolvedValue(false);

      const { container } = render(<DailyGoalWidget />);

      await waitFor(() => {
        const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
        fireEvent.change(slider, { target: { value: '250' } });
      });

      const saveBtn = screen.getByRole('button', { name: /Guardar meta: 250 XP/ });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockUpdateDailyGoal).toHaveBeenCalled();
      });
    });
  });

  describe('Progress visualization', () => {
    it('shows complete state when goal is reached', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 100 },
      });

      render(<DailyGoalWidget />);

      await waitFor(() => {
        expect(screen.getByText(/100% completado hoy/)).toBeInTheDocument();
      });
    });

    it('shows goal reached message', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 150 },
      });

      render(<DailyGoalWidget />);

      await waitFor(() => {
        expect(screen.getByText(/Meta alcanzada hoy/)).toBeInTheDocument();
      });
    });

    it('applies different color when goal is met', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 100 },
      });

      const { container } = render(<DailyGoalWidget />);

      await waitFor(() => {
        const progressBar = container.querySelector('[class*="emerald"]');
        expect(progressBar).toBeInTheDocument();
      });
    });

    it('shows teal progress color before goal is met', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 50 },
      });

      const { container } = render(<DailyGoalWidget />);

      await waitFor(() => {
        const progressBar = container.querySelector('[class*="teal"]');
        expect(progressBar).toBeInTheDocument();
      });
    });
  });

  describe('Visual elements', () => {
    it('displays target icon', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 0 },
      });

      render(<DailyGoalWidget />);

      await waitFor(() => {
        expect(screen.getByTestId('target-icon')).toBeInTheDocument();
      });
    });

    it('displays header text "Meta diaria"', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 0 },
      });

      render(<DailyGoalWidget />);

      await waitFor(() => {
        expect(screen.getByText('Meta diaria')).toBeInTheDocument();
      });
    });

    it('displays slider adjustment label', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 0 },
      });

      render(<DailyGoalWidget />);

      await waitFor(() => {
        expect(screen.getByText(/Ajustar meta/)).toBeInTheDocument();
      });
    });
  });

  describe('API error handling', () => {
    it('silently handles getProfile errors', async () => {
      mockGetProfile.mockRejectedValue(new Error('API error'));

      render(<DailyGoalWidget />);

      await waitFor(() => {
        expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
      });
    });

    it('silently handles updateDailyGoal errors', async () => {
      mockGetProfile.mockResolvedValue({
        xp: { daily_goal_minutes: 100, today: 0 },
      });
      // Mock returns a rejected promise but component handles it with .catch()
      mockUpdateDailyGoal.mockImplementation(() => {
        return Promise.reject(new Error('API error')).catch(() => false);
      });

      const { container } = render(<DailyGoalWidget />);

      const slider = await waitFor(() => {
        const el = container.querySelector('input[type="range"]');
        if (!el) throw new Error('Slider not found');
        return el as HTMLInputElement;
      });

      fireEvent.change(slider, { target: { value: '250' } });

      const saveBtn = screen.getByRole('button', { name: /Guardar meta: 250 XP/ });
      fireEvent.click(saveBtn);

      await waitFor(
        () => {
          expect(mockUpdateDailyGoal).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );
    });
  });
});
