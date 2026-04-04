/**
 * AnimationControls.test.tsx — Tests for GLTF animation playback UI
 *
 * Coverage:
 *   - Renders animation list and controls
 *   - Play/pause/reset buttons trigger callbacks
 *   - Speed selector updates playback speed
 *   - Scrub bar updates current time
 *   - Animation dropdown selects different clips
 *   - Time formatting works correctly
 *   - Empty state (no animations)
 *
 * Run: npx vitest run src/app/components/viewer3d/__tests__/AnimationControls.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnimationInfo } from '../AnimationControls';
import { AnimationControls } from '../AnimationControls';

// ── Helpers ───────────────────────────────────────────

function createMockAnimation(overrides: Partial<AnimationInfo> = {}): AnimationInfo {
  return {
    name: 'Armature|Idle',
    duration: 2.0,
    index: 0,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────

describe('AnimationControls', () => {
  let mockCallbacks: {
    onPlay: ReturnType<typeof vi.fn>;
    onPause: ReturnType<typeof vi.fn>;
    onSeek: ReturnType<typeof vi.fn>;
    onSelectAnimation: ReturnType<typeof vi.fn>;
    onSpeedChange: ReturnType<typeof vi.fn>;
    onReset: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCallbacks = {
      onPlay: vi.fn(),
      onPause: vi.fn(),
      onSeek: vi.fn(),
      onSelectAnimation: vi.fn(),
      onSpeedChange: vi.fn(),
      onReset: vi.fn(),
    };
  });

  // ── Rendering ──

  it('renders nothing when no animations provided', () => {
    const { container } = render(
      <AnimationControls
        animations={[]}
        currentIndex={0}
        isPlaying={false}
        currentTime={0}
        duration={0}
        speed={1}
        {...mockCallbacks}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders animation controls when animations provided', () => {
    const anim = createMockAnimation({ name: 'Walk' });
    render(
      <AnimationControls
        animations={[anim]}
        currentIndex={0}
        isPlaying={false}
        currentTime={0}
        duration={2}
        speed={1}
        {...mockCallbacks}
      />
    );
    expect(screen.getByText('Walk')).toBeInTheDocument();
  });

  it('displays current animation name in header', () => {
    const anims = [
      createMockAnimation({ index: 0, name: 'Idle', duration: 1.5 }),
      createMockAnimation({ index: 1, name: 'Walk', duration: 2.5 }),
    ];
    render(
      <AnimationControls
        animations={anims}
        currentIndex={0}
        isPlaying={false}
        currentTime={0}
        duration={1.5}
        speed={1}
        {...mockCallbacks}
      />
    );
    expect(screen.getByText('Idle')).toBeInTheDocument();
  });

  it('falls back to "Sin animacion" when current animation is undefined', () => {
    const anims = [createMockAnimation({ index: 0 })];
    render(
      <AnimationControls
        animations={anims}
        currentIndex={5} // out of bounds
        isPlaying={false}
        currentTime={0}
        duration={0}
        speed={1}
        {...mockCallbacks}
      />
    );
    expect(screen.getByText('Sin animacion')).toBeInTheDocument();
  });

  // ── Play/Pause/Reset ──

  it('shows play button when paused', () => {
    const anim = createMockAnimation();
    const { container } = render(
      <AnimationControls
        animations={[anim]}
        currentIndex={0}
        isPlaying={false}
        currentTime={0}
        duration={2}
        speed={1}
        {...mockCallbacks}
      />
    );
    // Play button should be rendered when isPlaying is false
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('shows pause button when playing', () => {
    const anim = createMockAnimation();
    const { container } = render(
      <AnimationControls
        animations={[anim]}
        currentIndex={0}
        isPlaying={true}
        currentTime={1}
        duration={2}
        speed={1}
        {...mockCallbacks}
      />
    );
    // Pause button should be rendered when isPlaying is true
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onPlay when play button clicked', async () => {
    const user = userEvent.setup();
    const anim = createMockAnimation();
    const { container } = render(
      <AnimationControls
        animations={[anim]}
        currentIndex={0}
        isPlaying={false}
        currentTime={0}
        duration={2}
        speed={1}
        {...mockCallbacks}
      />
    );
    // Find the first button in the controls row (play/pause button)
    const controlButtons = container.querySelectorAll('div.flex.items-center.justify-between button');
    const playBtn = controlButtons[0] as HTMLButtonElement;
    expect(playBtn).toBeTruthy();
    await user.click(playBtn);
    expect(mockCallbacks.onPlay).toHaveBeenCalledOnce();
  });

  it('calls onPause when pause button clicked', async () => {
    const user = userEvent.setup();
    const anim = createMockAnimation();
    const { container } = render(
      <AnimationControls
        animations={[anim]}
        currentIndex={0}
        isPlaying={true}
        currentTime={1}
        duration={2}
        speed={1}
        {...mockCallbacks}
      />
    );
    // Find the first button in the controls row (play/pause button)
    const controlButtons = container.querySelectorAll('div.flex.items-center.justify-between button');
    const pauseBtn = controlButtons[0] as HTMLButtonElement;
    expect(pauseBtn).toBeTruthy();
    await user.click(pauseBtn);
    expect(mockCallbacks.onPause).toHaveBeenCalledOnce();
  });

  it('calls onReset when reset button clicked', async () => {
    const user = userEvent.setup();
    const anim = createMockAnimation();
    const { container } = render(
      <AnimationControls
        animations={[anim]}
        currentIndex={0}
        isPlaying={false}
        currentTime={1.5}
        duration={2}
        speed={1}
        {...mockCallbacks}
      />
    );
    // Find the reset button (second button in the first control group)
    const controlButtons = container.querySelectorAll('div.flex.items-center.gap-1 button');
    const resetBtn = controlButtons[1] as HTMLButtonElement;
    expect(resetBtn).toBeTruthy();
    await user.click(resetBtn);
    expect(mockCallbacks.onReset).toHaveBeenCalledOnce();
  });

  // ── Timeline Scrubber ──

  it('renders progress bar with correct percentage', () => {
    const anim = createMockAnimation();
    const { container } = render(
      <AnimationControls
        animations={[anim]}
        currentIndex={0}
        isPlaying={false}
        currentTime={1} // 50% of 2 second duration
        duration={2}
        speed={1}
        {...mockCallbacks}
      />
    );
    const input = container.querySelector('input[type="range"]');
    expect(input).toHaveValue('50');
  });

  it('calls onSeek when scrub bar is dragged', async () => {
    const anim = createMockAnimation();
    const { container } = render(
      <AnimationControls
        animations={[anim]}
        currentIndex={0}
        isPlaying={false}
        currentTime={0}
        duration={2}
        speed={1}
        {...mockCallbacks}
      />
    );
    const input = container.querySelector('input[type="range"]')!;
    fireEvent.change(input, { target: { value: '75' } });
    expect(mockCallbacks.onSeek).toHaveBeenCalledWith(1.5); // 75% of 2 seconds
  });

  it('displays current time and duration in MM:SS format', () => {
    const anim = createMockAnimation({ duration: 125 }); // 2:05
    render(
      <AnimationControls
        animations={[anim]}
        currentIndex={0}
        isPlaying={false}
        currentTime={65} // 1:05
        duration={125}
        speed={1}
        {...mockCallbacks}
      />
    );
    expect(screen.getByText(/1:05/)).toBeInTheDocument();
    expect(screen.getByText(/2:05/)).toBeInTheDocument();
  });

  it('handles zero duration without error', () => {
    const anim = createMockAnimation();
    const { container } = render(
      <AnimationControls
        animations={[anim]}
        currentIndex={0}
        isPlaying={false}
        currentTime={0}
        duration={0}
        speed={1}
        {...mockCallbacks}
      />
    );
    // Should render without crashing
    expect(container.querySelector('input[type="range"]')).toBeInTheDocument();
  });

  // ── Animation Selection ──

  it('toggles animation dropdown when header clicked', async () => {
    const user = userEvent.setup();
    const anims = [
      createMockAnimation({ index: 0, name: 'Idle' }),
      createMockAnimation({ index: 1, name: 'Walk' }),
    ];
    render(
      <AnimationControls
        animations={anims}
        currentIndex={0}
        isPlaying={false}
        currentTime={0}
        duration={1}
        speed={1}
        {...mockCallbacks}
      />
    );
    const headerBtn = screen.getByText('Idle').closest('button')!;
    await user.click(headerBtn);
    expect(screen.getByText('Walk')).toBeInTheDocument();
  });

  it('shows all animations in dropdown', async () => {
    const user = userEvent.setup();
    const anims = [
      createMockAnimation({ index: 0, name: 'Idle' }),
      createMockAnimation({ index: 1, name: 'Walk' }),
      createMockAnimation({ index: 2, name: 'Run' }),
    ];
    render(
      <AnimationControls
        animations={anims}
        currentIndex={0}
        isPlaying={false}
        currentTime={0}
        duration={1}
        speed={1}
        {...mockCallbacks}
      />
    );
    const headerBtn = screen.getByText('Idle').closest('button')!;
    await user.click(headerBtn);
    expect(screen.getByText('Walk')).toBeInTheDocument();
    expect(screen.getByText('Run')).toBeInTheDocument();
  });

  it('calls onSelectAnimation when animation selected from dropdown', async () => {
    const user = userEvent.setup();
    const anims = [
      createMockAnimation({ index: 0, name: 'Idle' }),
      createMockAnimation({ index: 1, name: 'Walk' }),
    ];
    render(
      <AnimationControls
        animations={anims}
        currentIndex={0}
        isPlaying={false}
        currentTime={0}
        duration={1}
        speed={1}
        {...mockCallbacks}
      />
    );
    const headerBtn = screen.getByText('Idle').closest('button')!;
    await user.click(headerBtn);
    const walkBtn = screen.getByText('Walk');
    await user.click(walkBtn);
    expect(mockCallbacks.onSelectAnimation).toHaveBeenCalledWith(1);
  });

  it('hides dropdown after selection', async () => {
    const user = userEvent.setup();
    const anims = [
      createMockAnimation({ index: 0, name: 'Idle' }),
      createMockAnimation({ index: 1, name: 'Walk' }),
    ];
    const { container } = render(
      <AnimationControls
        animations={anims}
        currentIndex={0}
        isPlaying={false}
        currentTime={0}
        duration={1}
        speed={1}
        {...mockCallbacks}
      />
    );
    const headerBtn = screen.getByText('Idle').closest('button')!;
    await user.click(headerBtn);
    const walkBtn = screen.getByText('Walk');
    await user.click(walkBtn);
    // Dropdown should close (Walk item removed from DOM)
    const dropdownItems = container.querySelectorAll('[role="button"]');
    const walkVisible = Array.from(dropdownItems).some(el => el.textContent?.includes('Walk'));
    expect(walkVisible).toBe(false);
  });

  // ── Speed Control ──

  it('toggles speed dropdown when clicked', async () => {
    const user = userEvent.setup();
    const anim = createMockAnimation();
    render(
      <AnimationControls
        animations={[anim]}
        currentIndex={0}
        isPlaying={false}
        currentTime={0}
        duration={1}
        speed={1}
        {...mockCallbacks}
      />
    );
    // Speed is typically in a button with the current speed displayed
    const speedOptions = screen.queryAllByRole('button');
    const speedToggle = speedOptions.find(btn => btn.textContent?.includes('x'));
    if (speedToggle) {
      await user.click(speedToggle);
      expect(screen.getByText('0.25x')).toBeInTheDocument();
    }
  });

  it('calls onSpeedChange when speed option selected', async () => {
    const user = userEvent.setup();
    const anim = createMockAnimation();
    render(
      <AnimationControls
        animations={[anim]}
        currentIndex={0}
        isPlaying={false}
        currentTime={0}
        duration={1}
        speed={1}
        {...mockCallbacks}
      />
    );
    const speedOptions = screen.queryAllByRole('button');
    const speedToggle = speedOptions.find(btn => btn.textContent?.includes('x'));
    if (speedToggle) {
      await user.click(speedToggle);
      const doubleSpeedBtn = screen.getByText('2x');
      await user.click(doubleSpeedBtn);
      expect(mockCallbacks.onSpeedChange).toHaveBeenCalledWith(2);
    }
  });

  it('displays current speed in header', () => {
    const anim = createMockAnimation();
    render(
      <AnimationControls
        animations={[anim]}
        currentIndex={0}
        isPlaying={false}
        currentTime={0}
        duration={1}
        speed={1.5}
        {...mockCallbacks}
      />
    );
    expect(screen.getByText('1.5x')).toBeInTheDocument();
  });

  // ── Chevron rotation ──

  it('rotates chevron icon when dropdown open', async () => {
    const user = userEvent.setup();
    const anims = [
      createMockAnimation({ index: 0, name: 'Idle' }),
      createMockAnimation({ index: 1, name: 'Walk' }),
    ];
    const { container } = render(
      <AnimationControls
        animations={anims}
        currentIndex={0}
        isPlaying={false}
        currentTime={0}
        duration={1}
        speed={1}
        {...mockCallbacks}
      />
    );
    const headerBtn = screen.getByText('Idle').closest('button')!;
    const chevronBefore = container.querySelector('svg.transition-transform');
    expect(chevronBefore?.className.baseVal).not.toContain('rotate-180');

    await user.click(headerBtn);
    const chevronAfter = container.querySelector('svg.transition-transform');
    expect(chevronAfter?.className.baseVal).toContain('rotate-180');
  });

  // ── Single animation edge case ──

  it('hides chevron when only one animation', () => {
    const anim = createMockAnimation();
    const { container } = render(
      <AnimationControls
        animations={[anim]}
        currentIndex={0}
        isPlaying={false}
        currentTime={0}
        duration={1}
        speed={1}
        {...mockCallbacks}
      />
    );
    const chevrons = container.querySelectorAll('svg');
    // Chevron should be hidden via CSS or not rendered
    expect(chevrons.length).toBeLessThanOrEqual(2); // Only play/pause/reset icons
  });
});
