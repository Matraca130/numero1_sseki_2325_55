/**
 * test-setup.ts — Shared test utilities and configuration for viewer3d tests
 *
 * Provides:
 *   - Mock factory functions for common objects
 *   - Three.js mock helpers
 *   - API call mocks
 *   - Async helper utilities
 *
 * Import and use in any viewer3d test file.
 */

import { vi } from 'vitest';
import * as THREE from 'three';
import type { ModelPartLoader, ModelLayerConfig } from '../ModelPartMesh';

// ── Three.js Mock Helpers ──────────────────────────────

/**
 * Create a mock Three.js Scene with optional parts.
 * Useful for tests that need spatial calculations.
 */
export function createMockScene(partCount = 2): THREE.Scene {
  const scene = new THREE.Scene();

  for (let i = 0; i < partCount; i++) {
    const group = new THREE.Group();
    group.userData = { partId: `part-${i}` };

    // Add a mesh with geometry so bounding box works
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geometry, material);

    // Distribute parts spatially
    mesh.position.set(i * 2 - (partCount - 1), 0, 0);
    group.add(mesh);
    scene.add(group);
  }

  return scene;
}

/**
 * Create a mock WebGLRenderer with clipping plane support.
 * Used for tests involving clipping controls.
 */
export function createMockRenderer(): THREE.WebGLRenderer {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(800, 600);
  return renderer;
}

/**
 * Create a mock camera at standard position.
 */
export function createMockCamera(
  fov = 75,
  aspect = 16 / 9,
  near = 0.1,
  far = 1000
): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 5;
  return camera;
}

/**
 * Create a bounding box for an object.
 */
export function createBoundingBox(
  min = { x: -1, y: -1, z: -1 },
  max = { x: 1, y: 1, z: 1 }
): THREE.Box3 {
  const box = new THREE.Box3();
  box.setFromCenterAndSize(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(
      max.x - min.x,
      max.y - min.y,
      max.z - min.z
    )
  );
  return box;
}

// ── Model Part Loader Mocks ────────────────────────────

/**
 * Create a mock ModelPartLoader with default behavior.
 * Override specific methods as needed per test.
 */
export function createMockPartLoader(
  overrides: Partial<ModelPartLoader> = {}
): ModelPartLoader {
  return {
    getPartStates: vi.fn().mockReturnValue([
      { id: 'part-1', name: 'Part 1', layer: 'Layer A', visible: true },
      { id: 'part-2', name: 'Part 2', layer: 'Layer A', visible: true },
      { id: 'part-3', name: 'Part 3', layer: 'Layer B', visible: false },
    ]),
    isLayerVisible: vi.fn().mockReturnValue(true),
    setLayerVisible: vi.fn(),
    setPartVisible: vi.fn(),
    setLayerOpacity: vi.fn(),
    getLayerOpacity: vi.fn().mockReturnValue(1),
    ...overrides,
  };
}

/**
 * Create a mock layer configuration.
 */
export function createMockLayerConfig(
  overrides: Partial<ModelLayerConfig> = {}
): ModelLayerConfig {
  return {
    id: 'layer-' + Math.random().toString(36).substring(7),
    name: 'Layer A',
    color_hex: '#FF0000',
    order_index: 0,
    ...overrides,
  };
}

/**
 * Create multiple layers with sequential names and order indices.
 */
export function createMockLayers(
  count: number,
  baseColor = 0xff0000
): ModelLayerConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `layer-${i}`,
    name: `Layer ${String.fromCharCode(65 + i)}`, // A, B, C, ...
    color_hex: '#' + (baseColor + i * 0x00ff00).toString(16).padStart(6, '0'),
    order_index: i,
  }));
}

// ── Animation Mocks ────────────────────────────────────

/**
 * Create a mock AnimationInfo object.
 */
export function createMockAnimation(
  overrides: Partial<import('../AnimationControls').AnimationInfo> = {}
) {
  return {
    name: 'Armature|Idle',
    duration: 2.0,
    index: 0,
    ...overrides,
  };
}

/**
 * Create multiple animations with sequential names.
 */
export function createMockAnimations(
  count: number
): import('../AnimationControls').AnimationInfo[] {
  const names = ['Idle', 'Walk', 'Run', 'Jump', 'Fall'];
  return Array.from({ length: count }, (_, i) => ({
    name: names[i] || `Animation ${i + 1}`,
    duration: 1 + Math.random() * 3,
    index: i,
  }));
}

// ── API Mock Helpers ───────────────────────────────────

/**
 * Setup mock for searchKeywords API call.
 */
export function mockSearchKeywords(
  keywords: Array<{ id: string; name: string; color?: string }> = []
) {
  return vi.fn().mockResolvedValue({
    items: keywords.length ? keywords : [
      { id: 'kw-1', name: 'Keyword One', color: '#FF0000' },
      { id: 'kw-2', name: 'Keyword Two', color: '#00FF00' },
      { id: 'kw-3', name: 'Another Keyword', color: '#0000FF' },
    ],
  });
}

/**
 * Setup mock for getModel3DPins API call.
 */
export function mockGetModel3DPins(
  pins: Array<{
    id: string;
    title: string;
    geometry: { x: number; y: number; z: number };
    pin_type: string;
    color: string;
    normal?: { x: number; y: number; z: number };
  }> = []
) {
  return vi.fn().mockResolvedValue({
    items: pins.length ? pins : [
      {
        id: 'pin-1',
        title: 'Pin 1',
        geometry: { x: 0, y: 0, z: 0 },
        pin_type: 'info',
        color: '#60a5fa',
        normal: { x: 0, y: 1, z: 0 },
      },
    ],
  });
}

/**
 * Setup mock for createModel3DPin API call.
 */
export function mockCreateModel3DPin() {
  return vi.fn().mockResolvedValue({
    id: 'pin-' + Math.random().toString(36).substring(7),
    title: 'New Pin',
    geometry: { x: 0, y: 0, z: 0 },
    pin_type: 'info',
    color: '#60a5fa',
  });
}

/**
 * Setup mock for deleteModel3DPin API call.
 */
export function mockDeleteModel3DPin() {
  return vi.fn().mockResolvedValue(undefined);
}

// ── Async Helpers ──────────────────────────────────────

/**
 * Wait for a condition to be true.
 * Useful for testing state that updates asynchronously.
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout = 1000,
  interval = 50
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Condition did not become true within timeout');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/**
 * Wait for mock to be called with specific arguments.
 */
export async function waitForMockCall(
  mock: ReturnType<typeof vi.fn>,
  expectedArgs?: any,
  timeout = 1000
): Promise<void> {
  const start = Date.now();
  while (mock.mock.calls.length === 0) {
    if (Date.now() - start > timeout) {
      throw new Error('Mock was not called within timeout');
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  if (expectedArgs) {
    const actualArgs = mock.mock.calls[0];
    if (JSON.stringify(actualArgs) !== JSON.stringify(expectedArgs)) {
      throw new Error(
        `Mock called with unexpected args: ${JSON.stringify(actualArgs)} vs ${JSON.stringify(expectedArgs)}`
      );
    }
  }
}

// ── DOM Helpers ────────────────────────────────────────

/**
 * Get all visible text content from a container.
 */
export function getVisibleText(container: HTMLElement): string {
  return Array.from(container.querySelectorAll('*'))
    .filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    })
    .map(el => el.textContent?.trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Find an input element by label text.
 */
export function findInputByLabel(
  container: HTMLElement,
  labelText: string
): HTMLInputElement | null {
  const label = Array.from(container.querySelectorAll('label')).find(l =>
    l.textContent?.includes(labelText)
  );
  if (!label) return null;
  const inputId = label.getAttribute('for');
  return inputId
    ? (container.querySelector(`#${inputId}`) as HTMLInputElement)
    : (label.querySelector('input') as HTMLInputElement);
}

/**
 * Trigger a slider change event with a specific value (0-100).
 */
export function setSliderValue(
  slider: HTMLInputElement,
  percentage: number
): void {
  slider.value = percentage.toString();
  slider.dispatchEvent(new Event('input', { bubbles: true }));
  slider.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Get the computed style of an element as a CSS string.
 */
export function getComputedStyles(
  element: HTMLElement
): Record<string, string> {
  const styles = window.getComputedStyle(element);
  const result: Record<string, string> = {};
  for (let i = 0; i < styles.length; i++) {
    const prop = styles[i];
    result[prop] = styles.getPropertyValue(prop);
  }
  return result;
}

// ── Reset Helpers ──────────────────────────────────────

/**
 * Clear all mocks after a test.
 * Useful in afterEach hooks to prevent cross-test pollution.
 */
export function clearAllMocks(): void {
  vi.clearAllMocks();
}

/**
 * Reset all mocks to pristine state.
 * Useful when you want to re-use the same mock across multiple test runs.
 */
export function resetAllMocks(): void {
  vi.resetAllMocks();
}

/**
 * Restore all mocks to their original implementations.
 */
export function restoreAllMocks(): void {
  vi.restoreAllMocks();
}
