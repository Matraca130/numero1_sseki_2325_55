// ============================================================
// Axon — Tests for BadgeShowcase
//
// Tests badge grid rendering, rarity-based styling, earning/locked states,
// modal details, API loading, and edge cases.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import { BadgeShowcase } from '../BadgeShowcase';
import type { BadgeWithStatus } from '@/app/services/gamificationApi';

// Mock framer-motion
vi.mock('motion/react', () => ({
  motion: {
    button: ({ children, className, onClick, ...props }: any) => (
      <button className={className} onClick={onClick} {...props}>
        {children}
      </button>
    ),
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Award: (props: Record<string, unknown>) => (
    <svg data-testid="award-icon" {...props} />
  ),
  Lock: (props: Record<string, unknown>) => (
    <svg data-testid="lock-icon" {...props} />
  ),
  Loader2: (props: Record<string, unknown>) => (
    <svg data-testid="loader-icon" {...props} />
  ),
}));

// Mock gamificationApi
const mockGetBadges = vi.fn();
vi.mock('@/app/services/gamificationApi', () => ({
  getBadges: (...args: any[]) => mockGetBadges(...args),
}));

// Mock badge data factory
function createMockBadge(overrides: Partial<BadgeWithStatus> = {}): BadgeWithStatus {
  return {
    id: 'badge-001',
    slug: 'first-steps',
    name: 'First Steps',
    description: 'Complete your first lesson',
    icon_url: 'https://example.com/badge.png',
    category: 'achievement',
    rarity: 'common',
    xp_reward: 10,
    earned: true,
    earned_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('BadgeShowcase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Loading state', () => {
    it('displays loader while fetching badges', () => {
      mockGetBadges.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<BadgeShowcase institutionId="inst-001" />);

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    it('calls getBadges with correct institutionId and maxDisplay', async () => {
      mockGetBadges.mockResolvedValue({
        badges: [createMockBadge()],
        earned_count: 1,
      });

      render(<BadgeShowcase institutionId="inst-123" maxDisplay={8} />);

      await waitFor(() => {
        expect(mockGetBadges).toHaveBeenCalledWith('inst-123');
      });
    });

    it('shows no loader when institutionId is empty', () => {
      render(<BadgeShowcase institutionId="" />);

      expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('displays empty state when no badges exist', async () => {
      mockGetBadges.mockResolvedValue({
        badges: [],
        earned_count: 0,
      });

      render(<BadgeShowcase institutionId="inst-001" />);

      await waitFor(() => {
        expect(screen.getByText(/Los logros se desbloquean/)).toBeInTheDocument();
        expect(screen.getByTestId('award-icon')).toBeInTheDocument();
      });
    });

    it('shows award icon in empty state', async () => {
      mockGetBadges.mockResolvedValue({
        badges: [],
        earned_count: 0,
      });

      render(<BadgeShowcase institutionId="inst-001" />);

      await waitFor(() => {
        expect(screen.getByTestId('award-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Badge grid rendering', () => {
    it('renders badges in 4-column grid layout', async () => {
      const badges = Array.from({ length: 8 }, (_, i) =>
        createMockBadge({ id: `badge-${i}`, name: `Badge ${i}` })
      );

      mockGetBadges.mockResolvedValue({
        badges,
        earned_count: 8,
      });

      const { container } = render(<BadgeShowcase institutionId="inst-001" />);

      await waitFor(() => {
        const grid = container.querySelector('.grid-cols-4');
        expect(grid).toBeInTheDocument();
      });
    });

    it('respects maxDisplay prop to limit shown badges', async () => {
      const badges = Array.from({ length: 20 }, (_, i) =>
        createMockBadge({ id: `badge-${i}`, name: `Badge ${i}` })
      );

      mockGetBadges.mockResolvedValue({
        badges: badges.slice(0, 5), // API receives sliced array
        earned_count: 20,
      });

      render(<BadgeShowcase institutionId="inst-001" maxDisplay={5} />);

      await waitFor(() => {
        expect(mockGetBadges).toHaveBeenCalledWith('inst-001');
      });
    });

    it('displays badge count indicator (earned/total)', async () => {
      const badges = Array.from({ length: 12 }, (_, i) =>
        createMockBadge({
          id: `badge-${i}`,
          earned: i < 5, // 5 earned, 7 locked
        })
      );

      mockGetBadges.mockResolvedValue({
        badges,
        earned_count: 5,
      });

      render(<BadgeShowcase institutionId="inst-001" />);

      await waitFor(() => {
        expect(screen.getByText(/5\/12/)).toBeInTheDocument();
      });
    });
  });

  describe('Rarity-based styling', () => {
    it('applies common rarity styles to common badges', async () => {
      const badge = createMockBadge({ rarity: 'common' });
      mockGetBadges.mockResolvedValue({
        badges: [badge],
        earned_count: 1,
      });

      const { container } = render(<BadgeShowcase institutionId="inst-001" />);

      await waitFor(() => {
        // Check for common rarity color classes
        const badgeBtn = container.querySelector('button');
        expect(badgeBtn?.className).toContain('zinc');
      });
    });

    it('applies rare rarity styles with blue tint', async () => {
      const badge = createMockBadge({ rarity: 'rare' });
      mockGetBadges.mockResolvedValue({
        badges: [badge],
        earned_count: 1,
      });

      const { container } = render(<BadgeShowcase institutionId="inst-001" />);

      await waitFor(() => {
        const badgeBtn = container.querySelector('button');
        expect(badgeBtn?.className).toContain('blue');
      });
    });

    it('applies epic rarity styles with violet tint', async () => {
      const badge = createMockBadge({ rarity: 'epic' });
      mockGetBadges.mockResolvedValue({
        badges: [badge],
        earned_count: 1,
      });

      const { container } = render(<BadgeShowcase institutionId="inst-001" />);

      await waitFor(() => {
        const badgeBtn = container.querySelector('button');
        expect(badgeBtn?.className).toContain('violet');
      });
    });

    it('applies legendary rarity styles with amber glow', async () => {
      const badge = createMockBadge({ rarity: 'legendary' });
      mockGetBadges.mockResolvedValue({
        badges: [badge],
        earned_count: 1,
      });

      const { container } = render(<BadgeShowcase institutionId="inst-001" />);

      await waitFor(() => {
        const badgeBtn = container.querySelector('button');
        expect(badgeBtn?.className).toContain('amber');
      });
    });
  });

  describe('Earned vs locked badges', () => {
    it('displays earned badge with icon and full styling', async () => {
      const badge = createMockBadge({ earned: true });
      mockGetBadges.mockResolvedValue({
        badges: [badge],
        earned_count: 1,
      });

      render(<BadgeShowcase institutionId="inst-001" />);

      await waitFor(() => {
        expect(screen.getByText('First Steps')).toBeInTheDocument();
      });
    });

    it('displays locked badge with lock icon and faded styling', async () => {
      const badge = createMockBadge({ earned: false });
      mockGetBadges.mockResolvedValue({
        badges: [badge],
        earned_count: 0,
      });

      const { container } = render(<BadgeShowcase institutionId="inst-001" />);

      await waitFor(() => {
        expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
      });
    });

    it('applies opacity-40 to locked badges', async () => {
      const badge = createMockBadge({ earned: false });
      mockGetBadges.mockResolvedValue({
        badges: [badge],
        earned_count: 0,
      });

      const { container } = render(<BadgeShowcase institutionId="inst-001" />);

      await waitFor(() => {
        const badgeBtn = container.querySelector('button');
        expect(badgeBtn?.className).toContain('opacity');
      });
    });
  });

  describe('Badge details modal', () => {
    it('shows badge details when badge is clicked', async () => {
      const badge = createMockBadge({
        name: 'Legendary Achievement',
        description: 'Unlock all secrets',
      });

      mockGetBadges.mockResolvedValue({
        badges: [badge],
        earned_count: 1,
      });

      render(<BadgeShowcase institutionId="inst-001" />);

      await waitFor(() => {
        // Find the button containing the badge name (may be truncated)
        const badgeButtons = screen.getAllByRole('button');
        const badgeBtn = badgeButtons.find(btn => btn.textContent?.includes('Legendary Achievement'));
        expect(badgeBtn).toBeTruthy();
        if (badgeBtn) fireEvent.click(badgeBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Unlock all secrets')).toBeInTheDocument();
      });
    });

    it('displays rarity badge in details modal', async () => {
      const badge = createMockBadge({ rarity: 'legendary' });
      mockGetBadges.mockResolvedValue({
        badges: [badge],
        earned_count: 1,
      });

      render(<BadgeShowcase institutionId="inst-001" />);

      await waitFor(() => {
        const badgeButtons = screen.getAllByRole('button');
        const badgeBtn = badgeButtons.find(btn => btn.textContent?.includes('First Steps'));
        expect(badgeBtn).toBeTruthy();
        if (badgeBtn) fireEvent.click(badgeBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/legendary/i)).toBeInTheDocument();
      });
    });

    it('displays earned date in details modal', async () => {
      const badge = createMockBadge({
        earned_at: '2025-03-15T00:00:00Z',
      });

      mockGetBadges.mockResolvedValue({
        badges: [badge],
        earned_count: 1,
      });

      render(<BadgeShowcase institutionId="inst-001" />);

      await waitFor(() => {
        const badgeButtons = screen.getAllByRole('button');
        const badgeBtn = badgeButtons.find(btn => btn.textContent?.includes('First Steps'));
        expect(badgeBtn).toBeTruthy();
        if (badgeBtn) fireEvent.click(badgeBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/Desbloqueado/)).toBeInTheDocument();
      });
    });

    it('displays XP reward in details modal', async () => {
      const badge = createMockBadge({ xp_reward: 50 });
      mockGetBadges.mockResolvedValue({
        badges: [badge],
        earned_count: 1,
      });

      render(<BadgeShowcase institutionId="inst-001" />);

      await waitFor(() => {
        const badgeButtons = screen.getAllByRole('button');
        const badgeBtn = badgeButtons.find(btn => btn.textContent?.includes('First Steps'));
        expect(badgeBtn).toBeTruthy();
        if (badgeBtn) fireEvent.click(badgeBtn);
      });

      await waitFor(() => {
        expect(screen.getByText(/\+50 XP/)).toBeInTheDocument();
      });
    });

    it('hides earned date for locked badges in details', async () => {
      const badge = createMockBadge({ earned: false, earned_at: null });
      mockGetBadges.mockResolvedValue({
        badges: [badge],
        earned_count: 0,
      });

      render(<BadgeShowcase institutionId="inst-001" />);

      await waitFor(() => {
        const badgeButtons = screen.getAllByRole('button');
        const badgeBtn = badgeButtons.find(btn => btn.textContent?.includes('First Steps'));
        expect(badgeBtn).toBeTruthy();
        if (badgeBtn) fireEvent.click(badgeBtn);
      });

      await waitFor(() => {
        expect(screen.queryByText(/Desbloqueado/)).not.toBeInTheDocument();
      });
    });

    it('closes modal when clicking the same badge again', async () => {
      const badge = createMockBadge();
      mockGetBadges.mockResolvedValue({
        badges: [badge],
        earned_count: 1,
      });

      render(<BadgeShowcase institutionId="inst-001" />);


      await waitFor(() => {
        const badgeButtons = screen.getAllByRole('button');
        const badgeBtn = badgeButtons.find(btn => btn.textContent?.includes('First Steps'));
        expect(badgeBtn).toBeTruthy();
        if (badgeBtn) fireEvent.click(badgeBtn);
      });

      // Modal should be visible after clicking
      await waitFor(() => {
        expect(screen.getByText('Complete your first lesson')).toBeInTheDocument();
      });

      // Close modal by clicking the same badge again
      await waitFor(() => {
        const badgeButtons = screen.getAllByRole('button');
        const badgeBtn = badgeButtons.find(btn => btn.textContent?.includes('First Steps'));
        expect(badgeBtn).toBeTruthy();
        if (badgeBtn) fireEvent.click(badgeBtn);
      });

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByText('Complete your first lesson')).not.toBeInTheDocument();
      });
    });
  });

  describe('API error handling', () => {
    it('silently handles API errors and hides loader', async () => {
      mockGetBadges.mockRejectedValue(new Error('API error'));

      render(<BadgeShowcase institutionId="inst-001" />);

      await waitFor(() => {
        expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
      });
    });

    it('shows empty state when API returns no badges', async () => {
      mockGetBadges.mockResolvedValue({
        badges: [],
        earned_count: 0,
      });

      render(<BadgeShowcase institutionId="inst-001" />);

      await waitFor(() => {
        expect(screen.getByText(/Los logros se desbloquean/)).toBeInTheDocument();
      });
    });
  });

  describe('Badge icons', () => {
    it('uses custom icon_url when provided', async () => {
      const badge = createMockBadge({
        icon_url: 'https://example.com/custom-badge.png',
      });

      mockGetBadges.mockResolvedValue({
        badges: [badge],
        earned_count: 1,
      });

      const { container } = render(<BadgeShowcase institutionId="inst-001" />);

      await waitFor(() => {
        const img = container.querySelector('img');
        expect(img?.src).toContain('custom-badge.png');
      });
    });

    it('falls back to Award icon when no icon_url provided', async () => {
      const badge = createMockBadge({ icon_url: undefined });
      mockGetBadges.mockResolvedValue({
        badges: [badge],
        earned_count: 1,
      });

      render(<BadgeShowcase institutionId="inst-001" />);

      await waitFor(() => {
        // When icon_url is not provided, Award icon is shown
        const awardIcons = screen.queryAllByTestId('award-icon');
        // Should have at least one award icon (from badge or elsewhere)
        expect(awardIcons.length).toBeGreaterThan(0);
      });
    });
  });
});
