// ============================================================
// Axon — PinMarker3D
//
// Manages Three.js mesh objects that represent pins in 3D space.
// Creates sphere + ring markers with color coding by pin type.
// Used by PinSystem to render pins inside the Three.js scene.
//
// NOT a React component that renders JSX — it's a utility class
// that imperatively manages THREE objects in an existing scene.
// ============================================================

import * as THREE from 'three';

// ── Pin type → color mapping ──
const PIN_TYPE_COLORS: Record<string, number> = {
  info:       0x60a5fa, // blue
  keyword:    0xa78bfa, // violet
  annotation: 0x34d399, // emerald
  quiz:       0xfbbf24, // amber
  label:      0x60a5fa, // blue (alias)
  link:       0xf472b6, // pink
};

const DEFAULT_PIN_COLOR = 0x60a5fa;
const HOVER_EMISSIVE = 0x444444;
const PIN_RADIUS = 0.08;
const RING_RADIUS = 0.14;

export interface PinMarkerData {
  id: string;
  position: THREE.Vector3;
  normal?: THREE.Vector3;
  color?: string;
  pinType?: string;
  label?: string;
}

interface ManagedPin {
  id: string;
  group: THREE.Group;
  sphere: THREE.Mesh;
  ring: THREE.Mesh;
  data: PinMarkerData;
}

/**
 * Manages a set of 3D pin markers in a Three.js scene.
 * Call addPin/removePin/clear to manage; call getHitPin with raycaster for interaction.
 */
export class PinMarkerManager {
  private scene: THREE.Scene;
  private pins: Map<string, ManagedPin> = new Map();
  private hoveredId: string | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Add a pin marker to the scene */
  addPin(data: PinMarkerData): void {
    if (this.pins.has(data.id)) return;

    const colorHex = data.color
      ? parseInt(data.color.replace('#', ''), 16)
      : (PIN_TYPE_COLORS[data.pinType || ''] || DEFAULT_PIN_COLOR);

    const group = new THREE.Group();
    group.position.copy(data.position);
    group.userData = { pinId: data.id };

    // Offset slightly along normal to avoid z-fighting
    if (data.normal) {
      group.position.addScaledVector(data.normal, 0.05);
    }

    // Sphere (core)
    const sphereGeo = new THREE.SphereGeometry(PIN_RADIUS, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: 0x000000,
      roughness: 0.3,
      metalness: 0.2,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.userData = { pinId: data.id, isPinMarker: true };
    group.add(sphere);

    // Ring (halo)
    const ringGeo = new THREE.RingGeometry(RING_RADIUS - 0.02, RING_RADIUS, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.userData = { pinId: data.id, isPinMarker: true };
    group.add(ring);

    this.scene.add(group);
    this.pins.set(data.id, { id: data.id, group, sphere, ring, data });
  }

  /** Remove a pin by id */
  removePin(id: string): void {
    const pin = this.pins.get(id);
    if (!pin) return;
    this.scene.remove(pin.group);
    pin.sphere.geometry.dispose();
    (pin.sphere.material as THREE.Material).dispose();
    pin.ring.geometry.dispose();
    (pin.ring.material as THREE.Material).dispose();
    this.pins.delete(id);
  }

  /** Remove all pins */
  clear(): void {
    for (const [id] of this.pins) {
      this.removePin(id);
    }
  }

  /** Update all ring rotations to face camera (billboard effect) */
  updateBillboards(camera: THREE.Camera): void {
    for (const [, pin] of this.pins) {
      pin.ring.quaternion.copy(camera.quaternion);
    }
  }

  /** Set hover state on a pin */
  setHover(id: string | null): void {
    // Unhover previous
    if (this.hoveredId && this.hoveredId !== id) {
      const prev = this.pins.get(this.hoveredId);
      if (prev) {
        (prev.sphere.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
        prev.group.scale.setScalar(1);
      }
    }

    // Hover new
    if (id) {
      const pin = this.pins.get(id);
      if (pin) {
        (pin.sphere.material as THREE.MeshStandardMaterial).emissive.setHex(HOVER_EMISSIVE);
        pin.group.scale.setScalar(1.4);
      }
    }

    this.hoveredId = id;
  }

  /** Raycast against all pin spheres. Returns pinId or null. */
  getHitPin(raycaster: THREE.Raycaster): string | null {
    const meshes: THREE.Mesh[] = [];
    for (const [, pin] of this.pins) {
      meshes.push(pin.sphere);
    }
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      return hits[0].object.userData.pinId || null;
    }
    return null;
  }

  /** Get all pin meshes for raycasting exclusion */
  getAllMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    for (const [, pin] of this.pins) {
      meshes.push(pin.sphere, pin.ring);
    }
    return meshes;
  }

  /** Get position of a specific pin */
  getPinPosition(id: string): THREE.Vector3 | null {
    const pin = this.pins.get(id);
    return pin ? pin.group.position.clone() : null;
  }

  /** Get count */
  get count(): number {
    return this.pins.size;
  }

  dispose(): void {
    this.clear();
  }
}
