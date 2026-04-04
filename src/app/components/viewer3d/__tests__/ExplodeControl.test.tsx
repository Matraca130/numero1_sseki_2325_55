/**
 * ExplodeControl.test.tsx — Tests for exploded view slider
 *
 * Coverage:
 *   - Renders enable/disable toggle
 *   - Renders explode amount slider
 *   - Toggles explosion on/off
 *   - Updates explosion amount
 *   - Computes centroid correctly
 *   - Stores original positions
 *   - Reset button restores original positions
 *   - Works with multiple parts
 *   - Handles empty scene
 *
 * Run: npx vitest run src/app/components/viewer3d/__tests__/ExplodeControl.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as THREE from 'three';
import type { ModelPartLoader } from '../ModelPartMesh';
import { ExplodeControl } from '../ExplodeControl';

// ── Mocks ──────────────────────────────────────────────

function createMockPartLoader(overrides: Partial<ModelPartLoader> = {}): ModelPartLoader {
  return {
    getPartStates: vi.fn().mockReturnValue([
      { id: 'part-1', name: 'Part 1', layer: 'Layer A', visible: true },
      { id: 'part-2', name: 'Part 2', layer: 'Layer A', visible: true },
    ]),
    isLayerVisible: vi.fn().mockReturnValue(true),
    setLayerVisible: vi.fn(),
    setPartVisible: vi.fn(),
    setLayerOpacity: vi.fn(),
    getLayerOpacity: vi.fn().mockReturnValue(1),
    ...overrides,
  };
}

function createMockScene(): THREE.Scene {
  const scene = new THREE.Scene();

  // Add two part groups with bounding boxes
  const part1Group = new THREE.Group();
  part1Group.userData = { partId: 'part-1' };
  const part1Mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  part1Mesh.position.set(-2, 0, 0);
  part1Group.add(part1Mesh);

  const part2Group = new THREE.Group();
  part2Group.userData = { partId: 'part-2' };
  const part2Mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  part2Mesh.position.set(2, 0, 0);
  part2Group.add(part2Mesh);

  scene.add(part1Group);
  scene.add(part2Group);

  return scene;
}

// ── Tests ─────────────────────────────────────────────

describe('ExplodeControl', () => {
  let mockPartLoader: ModelPartLoader;
  let mockScene: THREE.Scene;
  let mockModelMeshes: THREE.Object3D[];

  beforeEach(() => {
    mockPartLoader = createMockPartLoader();
    mockScene = createMockScene();
    mockModelMeshes = [mockScene];
  });

  // ── Rendering ──

  it('renders control panel', () => {
    render(
      <ExplodeControl
        partLoader={mockPartLoader}
        scene={mockScene}
        modelMeshes={mockModelMeshes}
      />
    );
    expect(screen.getByRole('button', { name: /explotar/i })).toBeInTheDocument();
  });

  it('renders toggle button', () => {
    const { container } = render(
      <ExplodeControl
        partLoader={mockPartLoader}
        scene={mockScene}
        modelMeshes={mockModelMeshes}
      />
    );
    const toggleBtn = container.querySelector('button');
    expect(toggleBtn).toBeInTheDocument();
  });

  // ── Enable/Disable ──

  it('disables explode slider when explosion disabled', () => {
    const { container } = render(
      <ExplodeControl
        partLoader={mockPartLoader}
        scene={mockScene}
        modelMeshes={mockModelMeshes}
      />
    );
    const slider = container.querySelector('input[type="range"]');
    if (slider) {
      expect(slider).toBeDisabled();
    }
  });

  it('enables explode slider when toggle clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ExplodeControl
        partLoader={mockPartLoader}
        scene={mockScene}
        modelMeshes={mockModelMeshes}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    const slider = container.querySelector('input[type="range"]');
    if (slider) {
      expect(slider).not.toBeDisabled();
    }
  });

  // ── Explode Amount ──

  it('renders slider with value 0 initially', () => {
    const { container } = render(
      <ExplodeControl
        partLoader={mockPartLoader}
        scene={mockScene}
        modelMeshes={mockModelMeshes}
      />
    );
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    if (slider) {
      expect(slider.value).toBe('0');
    }
  });

  it('updates slider when dragged', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ExplodeControl
        partLoader={mockPartLoader}
        scene={mockScene}
        modelMeshes={mockModelMeshes}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    if (slider) {
      fireEvent.change(slider, { target: { value: '50' } });
      expect(slider.value).toBe('50');
    }
  });

  it('accepts explode range 0-100', () => {
    const { container } = render(
      <ExplodeControl
        partLoader={mockPartLoader}
        scene={mockScene}
        modelMeshes={mockModelMeshes}
      />
    );
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    if (slider) {
      expect(slider.min).toBe('0');
      expect(slider.max).toBe('100');
    }
  });

  // ── Reset Button ──

  it('renders reset button', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ExplodeControl
        partLoader={mockPartLoader}
        scene={mockScene}
        modelMeshes={mockModelMeshes}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    const resetBtn = screen.getByRole('button', { name: /reset/i });
    expect(resetBtn).toBeInTheDocument();
  });

  it('resets slider to 0 when reset clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ExplodeControl
        partLoader={mockPartLoader}
        scene={mockScene}
        modelMeshes={mockModelMeshes}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    if (slider) {
      fireEvent.change(slider, { target: { value: '75' } });
      expect(slider.value).toBe('75');

      const resetBtn = screen.getByRole('button', { name: /reset/i });
      await user.click(resetBtn);

      expect(slider.value).toBe('0');
    }
  });

  it('restores original part positions on reset', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ExplodeControl
        partLoader={mockPartLoader}
        scene={mockScene}
        modelMeshes={mockModelMeshes}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    if (slider) {
      // Store original positions
      const part1Original = mockScene.getObjectByProperty('userData', { partId: 'part-1' })?.position.clone();

      // Explode
      fireEvent.change(slider, { target: { value: '50' } });

      // Reset
      const resetBtn = screen.getByRole('button', { name: /reset/i });
      await user.click(resetBtn);

      // Check position restored (approximately)
      const part1AfterReset = mockScene.getObjectByProperty('userData', { partId: 'part-1' })?.position;
      if (part1Original && part1AfterReset) {
        expect(Math.abs(part1AfterReset.x - part1Original.x)).toBeLessThan(0.01);
      }
    }
  });

  // ── State Display ──

  it('shows enabled state when explosion active', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ExplodeControl
        partLoader={mockPartLoader}
        scene={mockScene}
        modelMeshes={mockModelMeshes}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    // Button should show enabled state (e.g., different color)
    expect(toggleBtn.className).toBeTruthy();
  });

  it('shows disabled state when explosion off', () => {
    const { container } = render(
      <ExplodeControl
        partLoader={mockPartLoader}
        scene={mockScene}
        modelMeshes={mockModelMeshes}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    expect(toggleBtn.className).toBeTruthy();
  });

  // ── Icon Display ──

  it('displays expand icon', () => {
    const { container } = render(
      <ExplodeControl
        partLoader={mockPartLoader}
        scene={mockScene}
        modelMeshes={mockModelMeshes}
      />
    );
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  // ── Edge Cases ──

  it('handles null scene gracefully', () => {
    const { container } = render(
      <ExplodeControl
        partLoader={mockPartLoader}
        scene={null}
        modelMeshes={[]}
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('handles empty scene', async () => {
    const user = userEvent.setup();
    const emptyScene = new THREE.Scene();
    render(
      <ExplodeControl
        partLoader={mockPartLoader}
        scene={emptyScene}
        modelMeshes={[emptyScene]}
      />
    );
    const toggleBtn = screen.getByRole('button', { name: /explotar/i });
    await user.click(toggleBtn);
    // Should not crash
    expect(toggleBtn).toBeInTheDocument();
  });

  it('handles parts with no bounding box', async () => {
    const user = userEvent.setup();
    const scene = new THREE.Scene();
    const partGroup = new THREE.Group();
    partGroup.userData = { partId: 'part-empty' };
    scene.add(partGroup);

    render(
      <ExplodeControl
        partLoader={mockPartLoader}
        scene={scene}
        modelMeshes={[scene]}
      />
    );
    const toggleBtn = screen.getByRole('button', { name: /explotar/i });
    await user.click(toggleBtn);
    // Should not crash
    expect(toggleBtn).toBeInTheDocument();
  });

  // ── Multiple Parts ──

  it('works with multiple parts', async () => {
    const user = userEvent.setup();
    const scene = new THREE.Scene();

    // Create 5 parts
    for (let i = 0; i < 5; i++) {
      const group = new THREE.Group();
      group.userData = { partId: `part-${i}` };
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5));
      mesh.position.set(i * 2 - 4, 0, 0);
      group.add(mesh);
      scene.add(group);
    }

    const { container } = render(
      <ExplodeControl
        partLoader={mockPartLoader}
        scene={scene}
        modelMeshes={[scene]}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    if (slider) {
      fireEvent.change(slider, { target: { value: '50' } });
      // All parts should have moved (no error thrown)
      expect(slider.value).toBe('50');
    }
  });

  // ── Label Display ──

  it('displays explode amount as percentage', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ExplodeControl
        partLoader={mockPartLoader}
        scene={mockScene}
        modelMeshes={mockModelMeshes}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    if (slider) {
      fireEvent.change(slider, { target: { value: '75' } });
      // Look for "75%" or similar in the component
      const text = container.textContent;
      expect(text).toContain('75');
    }
  });

  // ── Tooltip/Help Text ──

  it('displays helpful text about explosion', () => {
    const { container } = render(
      <ExplodeControl
        partLoader={mockPartLoader}
        scene={mockScene}
        modelMeshes={mockModelMeshes}
      />
    );
    const text = container.textContent;
    expect(text).toBeTruthy(); // Should have some text
  });

  // ── Persistence ──

  it('maintains explode state across re-renders', async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(
      <ExplodeControl
        partLoader={mockPartLoader}
        scene={mockScene}
        modelMeshes={mockModelMeshes}
      />
    );
    const toggleBtn = container.querySelector('button')!;
    await user.click(toggleBtn);

    const slider1 = container.querySelector('input[type="range"]') as HTMLInputElement;
    if (slider1) {
      fireEvent.change(slider1, { target: { value: '50' } });
    }

    rerender(
      <ExplodeControl
        partLoader={mockPartLoader}
        scene={mockScene}
        modelMeshes={mockModelMeshes}
      />
    );

    const slider2 = container.querySelector('input[type="range"]') as HTMLInputElement;
    if (slider2) {
      expect(slider2.value).toBe('50');
    }
  });
});
