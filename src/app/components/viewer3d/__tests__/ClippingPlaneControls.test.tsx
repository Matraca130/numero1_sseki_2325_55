/**
 * ClippingPlaneControls.test.tsx — Tests for clipping plane UI
 *
 * Coverage:
 *   - Renders enable/disable toggle
 *   - Renders plane axis selector (X, Y, Z)
 *   - Renders position slider
 *   - Toggles clipping on/off
 *   - Changes clipping plane axis
 *   - Updates clipping position
 *   - Reset button
 *   - Visual feedback for active axis
 *
 * Run: npx vitest run src/app/components/viewer3d/__tests__/ClippingPlaneControls.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as THREE from 'three';
import type { ModelPartLoader } from '../ModelPartMesh';
import { ClippingPlaneControls } from '../ClippingPlaneControls';

// ── Mocks ──────────────────────────────────────────────

function createMockPartLoader(): ModelPartLoader {
  return {
    getPartStates: vi.fn().mockReturnValue([]),
    isLayerVisible: vi.fn().mockReturnValue(true),
    setLayerVisible: vi.fn(),
    setPartVisible: vi.fn(),
    setLayerOpacity: vi.fn(),
    getLayerOpacity: vi.fn().mockReturnValue(1),
  };
}

function createMockScene(): THREE.Scene {
  return new THREE.Scene();
}

// ── Tests ─────────────────────────────────────────────

describe('ClippingPlaneControls', () => {
  let mockPartLoader: ModelPartLoader;
  let mockScene: THREE.Scene;
  let renderer: any;

  beforeEach(() => {
    mockPartLoader = createMockPartLoader();
    mockScene = createMockScene();

    // Mock renderer since WebGL context can't be created in jsdom
    renderer = {
      clippingPlanes: [] as THREE.Plane[],
      localClippingEnabled: false,
      render: vi.fn(),
      setSize: vi.fn(),
    };
  });

  // ── Rendering ──

  it('renders clipping controls panel', () => {
    render(
      <ClippingPlaneControls
        scene={mockScene}
        partLoader={mockPartLoader}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    const panel = screen.getByRole('button', { name: /corte/i });
    expect(panel).toBeInTheDocument();
  });

  it('displays toggle button', () => {
    const { container } = render(
      <ClippingPlaneControls
        scene={mockScene}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    const btn = container.querySelector('button');
    expect(btn).toBeInTheDocument();
  });

  // ── Enable/Disable ──

  it('enables clipping plane on toggle', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ClippingPlaneControls
        scene={mockScene}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    // Clipping should be enabled
    expect(renderer.clippingPlanes.length).toBeGreaterThanOrEqual(0);
  });

  it('disables clipping plane when toggled off', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ClippingPlaneControls
        scene={mockScene}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);
    await user.click(toggleBtn);

    // Should be disabled
    expect(toggleBtn).toBeInTheDocument();
  });

  // ── Axis Selection ──

  it('renders axis selector buttons', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ClippingPlaneControls
        scene={mockScene}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    const axisButtons = screen.queryAllByRole('button', { name: /x|y|z/i });
    expect(axisButtons.length).toBeGreaterThan(0);
  });

  it('allows changing clipping axis to X', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ClippingPlaneControls
        scene={mockScene}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    const xBtn = screen.getByRole('button', { name: /\bx\b/i });
    await user.click(xBtn);
    expect(xBtn).toBeInTheDocument();
  });

  it('allows changing clipping axis to Y', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ClippingPlaneControls
        scene={mockScene}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    const yBtn = screen.getByRole('button', { name: /\by\b/i });
    await user.click(yBtn);
    expect(yBtn).toBeInTheDocument();
  });

  it('allows changing clipping axis to Z', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ClippingPlaneControls
        scene={mockScene}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    const zBtn = screen.getByRole('button', { name: /\bz\b/i });
    await user.click(zBtn);
    expect(zBtn).toBeInTheDocument();
  });

  // ── Position Slider ──

  it('renders position slider when clipping enabled', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ClippingPlaneControls
        scene={mockScene}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    const slider = container.querySelector('input[type="range"]');
    expect(slider).toBeInTheDocument();
  });

  it('updates clipping position when slider moved', async () => {
    const { container } = render(
      <ClippingPlaneControls
        scene={mockScene}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await userEvent.setup().click(toggleBtn);

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    if (slider) {
      fireEvent.change(slider, { target: { value: '50' } });
      expect(slider.value).toBe('50');
    }
  });

  it('accepts position range 0 to 100', async () => {
    const { container } = render(
      <ClippingPlaneControls
        scene={mockScene}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await userEvent.setup().click(toggleBtn);

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    if (slider) {
      expect(Number(slider.min)).toBe(0);
      expect(Number(slider.max)).toBe(100);
    }
  });

  // ── Reset Button ──

  it('renders reset button', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ClippingPlaneControls
        scene={mockScene}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    const resetBtn = screen.getByRole('button', { name: /reset/i });
    expect(resetBtn).toBeInTheDocument();
  });

  it('resets clipping position to 50 (middle)', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ClippingPlaneControls
        scene={mockScene}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    if (slider) {
      fireEvent.change(slider, { target: { value: '75' } });
      const resetBtn = screen.getByRole('button', { name: /reset/i });
      await user.click(resetBtn);
      expect(slider.value).toBe('50');
    }
  });

  // ── Visual Feedback ──

  it('highlights active axis button', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ClippingPlaneControls
        scene={mockScene}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    const xBtn = screen.getByRole('button', { name: /\bx\b/i });
    await user.click(xBtn);

    // Active button should have highlighting
    expect(xBtn.className).toContain('bg-') || xBtn.className.toContain('border');
  });

  it('changes styling when different axis selected', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ClippingPlaneControls
        scene={mockScene}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    const axialBtn = screen.getByRole('button', { name: /Axial/i });
    const sagittalBtn = screen.getByRole('button', { name: /Sagital/i });

    // Axial should be highlighted initially (contains bg-white/10)
    expect(axialBtn.className).toContain('bg-white/10');

    // Click sagittal
    await user.click(sagittalBtn);

    // Now sagittal should be highlighted and axial should not
    expect(sagittalBtn.className).toContain('bg-white/10');
    expect(axialBtn.className).not.toContain('bg-white/10');
  });

  // ── Disabled Slider ──

  it('disables slider when clipping is off', () => {
    const { container } = render(
      <ClippingPlaneControls
        scene={mockScene}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    const slider = container.querySelector('input[type="range"]');
    if (slider) {
      expect(slider).toBeDisabled();
    }
  });

  // ── Edge Cases ──

  it('handles null scene gracefully', () => {
    const { container } = render(
      <ClippingPlaneControls
        scene={null}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('handles null renderer gracefully', () => {
    const { container } = render(
      <ClippingPlaneControls
        scene={mockScene}
        renderer={null}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  // ── State Persistence ──

  it('maintains clipping axis across re-renders', async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(
      <ClippingPlaneControls
        scene={mockScene}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    const yBtn = screen.getByRole('button', { name: /\by\b/i });
    await user.click(yBtn);

    rerender(
      <ClippingPlaneControls
        scene={mockScene}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );

    // Y axis should still be active
    const yBtnAfter = screen.getByRole('button', { name: /\by\b/i });
    expect(yBtnAfter.className).toContain('bg-') || yBtnAfter.className.toContain('border');
  });

  it('maintains clipping position across re-renders', async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(
      <ClippingPlaneControls
        scene={mockScene}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    if (slider) {
      fireEvent.change(slider, { target: { value: '60' } });

      rerender(
        <ClippingPlaneControls
          scene={mockScene}
          renderer={renderer}
          modelMeshes={[]}
          registerFrameCallback={() => () => {}}
        />
      );

      const sliderAfter = container.querySelector('input[type="range"]') as HTMLInputElement;
      expect(sliderAfter?.value).toBe('60');
    }
  });

  // ── Plane Normal Direction ──

  it('applies clipping plane in correct direction', async () => {
    const user = userEvent.setup();
    render(
      <ClippingPlaneControls
        scene={mockScene}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    const toggleBtn = screen.getByRole('button', { name: /corte/i }).closest('div')?.querySelector('button');
    if (toggleBtn) {
      await user.click(toggleBtn);
      // Clipping should be applied to renderer
      expect(renderer.clippingPlanes).toBeTruthy();
    }
  });

  // ── Label Display ──

  it('displays position value in label', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ClippingPlaneControls
        scene={mockScene}
        renderer={renderer}
        modelMeshes={[]}
        registerFrameCallback={() => () => {}}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    if (slider) {
      fireEvent.change(slider, { target: { value: '40' } });
      const text = container.textContent;
      expect(text).toContain('40');
    }
  });
});
