// ============================================================
// Axon — PinMarker3D
//
// Manages Three.js mesh objects that represent pins in 3D space.
// Creates sphere + ring markers with color coding by pin type.
// Used by PinSystem to render pins inside the Three.js scene.
//
// NOT a React component that renders JSX — it's a utility class
// that imperatively manages THREE objects in an existing scene.
//
// PERFORMANCE (Paso 2):
//   - Sphere + ring geometries are SHARED statics (lazy singleton)
//     → 50 pins = 2 geometries total, not 100
//   - Materials remain per-pin (each pin has unique color)
//   - _sphereCache array rebuilt on add/remove/clear
//     → getHitPin() uses cached array (zero allocation per call)
//   - removePin() disposes materials only, not shared geometry
// ============================================================

import * as THREE from 'three';

// ── Pin type → color mapping ──
// Supports both DB types (point/line/area) and UI semantic types for backward compat
const PIN_TYPE_COLORS: Record<string, number> = {
  // DB types (canonical)
  point:      0x60a5fa, // blue
  line:       0xa78bfa, // violet
  area:       0x34d399, // emerald
  // Legacy UI types (kept for any cached/old data)
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

  // ── Shared geometries (lazy singletons — ~2KB GPU total) ──
  // All pins use identical sphere + ring geometry.
  // Created on first addPin(), shared across ALL PinMarkerManager instances.
  // Never disposed — lifetime = app lifetime (negligible memory).
  private static _sharedSphereGeo: THREE.SphereGeometry | null = null;
  private static _sharedRingGeo: THREE.RingGeometry | null = null;

  private static getSphereGeo(): THREE.SphereGeometry {
    if (!PinMarkerManager._sharedSphereGeo) {
      PinMarkerManager._sharedSphereGeo = new THREE.SphereGeometry(PIN_RADIUS, 16, 16);
    }
    return PinMarkerManager._sharedSphereGeo;
  }

  private static getRingGeo(): THREE.RingGeometry {
    if (!PinMarkerManager._sharedRingGeo) {
      PinMarkerManager._sharedRingGeo = new THREE.RingGeometry(RING_RADIUS - 0.02, RING_RADIUS, 24);
    }
    return PinMarkerManager._sharedRingGeo;
  }

  // ── Cached sphere array for raycasting (rebuilt on add/remove/clear) ──
  // Avoids allocating a new array on every getHitPin() call (~120 calls/sec).
  private _sphereCache: THREE.Mesh[] = [];
  private _sphereCacheDirty = true;

  private rebuildSphereCache(): void {
    this._sphereCache.length = 0;
    for (const [, pin] of this.pins) {
      this._sphereCache.push(pin.sphere);
    }
    this._sphereCacheDirty = false;
  }

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

    // Sphere (core) — SHARED geometry, per-pin material
    const sphereMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: 0x000000,
      roughness: 0.3,
      metalness: 0.2,
    });
    const sphere = new THREE.Mesh(PinMarkerManager.getSphereGeo(), sphereMat);
    sphere.userData = { pinId: data.id, isPinMarker: true };
    group.add(sphere);

    // Ring (halo) — SHARED geometry, per-pin material
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(PinMarkerManager.getRingGeo(), ringMat);
    ring.userData = { pinId: data.id, isPinMarker: true };
    group.add(ring);

    this.scene.add(group);
    this.pins.set(data.id, { id: data.id, group, sphere, ring, data });
    this._sphereCacheDirty = true;
  }

  /** Remove a pin by id — disposes materials only (geometry is shared) */
  removePin(id: string): void {
    const pin = this.pins.get(id);
    if (!pin) return;

    this.scene.remove(pin.group);

    // Dispose materials only — geometry is shared static, never disposed per-pin
    (pin.sphere.material as THREE.Material).dispose();
    (pin.ring.material as THREE.Material).dispose();

    this.pins.delete(id);
    this._sphereCacheDirty = true;
  }

  /** Remove all pins — disposes materials only */
  clear(): void {
    // Snapshot keys to avoid mutating Map during iteration
    const ids = Array.from(this.pins.keys());
    for (const id of ids) {
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

  /** Raycast against all pin spheres. Returns pinId or null. Uses cached array. */
  getHitPin(raycaster: THREE.Raycaster): string | null {
    if (this._sphereCacheDirty) {
      this.rebuildSphereCache();
    }
    if (this._sphereCache.length === 0) return null;

    const hits = raycaster.intersectObjects(this._sphereCache, false);
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

  /** Dispose all pins (materials only — shared geometry persists) */
  dispose(): void {
    this.clear();
    this._sphereCache.length = 0;
  }
}
