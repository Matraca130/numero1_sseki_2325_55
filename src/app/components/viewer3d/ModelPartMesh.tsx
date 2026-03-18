// ============================================================
// Axon — ModelPartMesh
//
// Utility class to load individual .glb/.gltf parts into a
// Three.js scene with translucency support.
//
// NOT a React component — imperative Three.js management.
// Supports lazy loading (load on activate, dispose on deactivate),
// material override for opacity/color, and visibility toggling.
//
// Used by ModelViewer3D when parts config exists (multi-part mode).
//
// Persistence: API-first (GET /model-parts, /model-layers) with
// localStorage cache as offline fallback.
// ============================================================

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { logger } from '@/app/lib/logger';
import { disposeMaterialTextures } from './three-utils';
import {
  getModelLayers as apiGetLayers,
  getModelParts as apiGetParts,
} from '@/app/lib/model3d-api';
import type { ModelLayer as APIModelLayer, ModelPart as APIModelPart } from '@/app/types/model3d';

// ── Part config (used by viewer + professor UI) ──
export interface ModelPartConfig {
  id: string;
  name: string;
  layer_group: string;         // e.g. "Huesos", "Musculos", "Nervios"
  file_url: string;
  color_hex: string;           // e.g. "#f5e6d3"
  opacity_default: number;     // 0-1
  order_index: number;
}

// ── Layer config ──
export interface ModelLayerConfig {
  id: string;
  name: string;
  color_hex: string;
  order_index: number;
}

// ── Runtime part state ──
interface LoadedPart {
  config: ModelPartConfig;
  group: THREE.Group | null;
  loading: boolean;
  visible: boolean;
  opacity: number;
  meshes: THREE.Mesh[];
  originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]>;
}

// ── localStorage keys (cache) ──
const PARTS_KEY = (modelId: string) => `model_parts:${modelId}`;
const LAYERS_KEY = (modelId: string) => `model_layers:${modelId}`;

// ══════════════════════════════════════════════
// ── Adapters: DB shape → frontend shape ──
// ══════════════════════════════════════════════

function adaptPartFromDB(row: APIModelPart): ModelPartConfig {
  return {
    id: row.id,
    name: row.name,
    layer_group: row.layer_group || '',
    file_url: row.file_url || '',
    color_hex: row.color_hex || '#cccccc',
    opacity_default: row.opacity_default ?? 1.0,
    order_index: row.order_index,
  };
}

function adaptLayerFromDB(row: APIModelLayer): ModelLayerConfig {
  return {
    id: row.id,
    name: row.name,
    color_hex: row.color_hex || '#888888',
    order_index: row.order_index,
  };
}

// ══════════════════════════════════════════════
// ── Persistence helpers (API-first, localStorage fallback) ──
// ══════════════════════════════════════════════

/** Sync getter from localStorage cache (for instant init) */
export function getStoredParts(modelId: string): ModelPartConfig[] {
  try {
    const raw = localStorage.getItem(PARTS_KEY(modelId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/** Sync getter from localStorage cache (for instant init) */
export function getStoredLayers(modelId: string): ModelLayerConfig[] {
  try {
    const raw = localStorage.getItem(LAYERS_KEY(modelId));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/** Write-through to localStorage (keeps cache fresh) */
export function setStoredParts(modelId: string, parts: ModelPartConfig[]): void {
  localStorage.setItem(PARTS_KEY(modelId), JSON.stringify(parts));
}

/** Write-through to localStorage (keeps cache fresh) */
export function setStoredLayers(modelId: string, layers: ModelLayerConfig[]): void {
  localStorage.setItem(LAYERS_KEY(modelId), JSON.stringify(layers));
}

/**
 * Fetch parts from API, cache to localStorage, return adapted configs.
 * Falls back to localStorage if API is unavailable.
 */
export async function fetchPartsFromAPI(modelId: string): Promise<ModelPartConfig[]> {
  try {
    const res = await apiGetParts(modelId);
    const parts = (res?.items || []).map(adaptPartFromDB);
    setStoredParts(modelId, parts); // cache
    return parts;
  } catch (err) {
    logger.warn('ModelPartMesh', 'API fetch parts failed, using localStorage cache:', err);
    return getStoredParts(modelId);
  }
}

/**
 * Fetch layers from API, cache to localStorage, return adapted configs.
 * Falls back to localStorage if API is unavailable.
 */
export async function fetchLayersFromAPI(modelId: string): Promise<ModelLayerConfig[]> {
  try {
    const res = await apiGetLayers(modelId);
    const layers = (res?.items || []).map(adaptLayerFromDB);
    setStoredLayers(modelId, layers); // cache
    return layers;
  } catch (err) {
    logger.warn('ModelPartMesh', 'API fetch layers failed, using localStorage cache:', err);
    return getStoredLayers(modelId);
  }
}

// ═════════════════════════════════════════════
// ── ModelPartLoader class ──
// ══════════════════════════════════════════════

export class ModelPartLoader {
  private scene: THREE.Scene;
  private loader: GLTFLoader;
  private parts: Map<string, LoadedPart> = new Map();
  private onUpdate: () => void; // callback to trigger React re-render

  constructor(scene: THREE.Scene, onUpdate: () => void) {
    this.scene = scene;
    this.loader = new GLTFLoader();
    this.onUpdate = onUpdate;
  }

  /** Initialize from part configs (doesn't load GLBs yet — lazy) */
  init(configs: ModelPartConfig[]): void {
    this.clear();
    for (const config of configs) {
      this.parts.set(config.id, {
        config,
        group: null,
        loading: false,
        visible: true,
        opacity: config.opacity_default,
        meshes: [],
        originalMaterials: new Map(),
      });
    }
  }

  /** Load a specific part's GLB (lazy) */
  async loadPart(partId: string): Promise<THREE.Group | null> {
    const part = this.parts.get(partId);
    if (!part || part.group || part.loading) return part?.group || null;

    part.loading = true;
    this.onUpdate();

    try {
      const gltf = await new Promise<any>((resolve, reject) => {
        this.loader.load(part.config.file_url, resolve, undefined, reject);
      });

      const group = gltf.scene as THREE.Group;
      group.userData = { partId: part.config.id, partName: part.config.name };

      // Collect meshes and store original materials
      const meshes: THREE.Mesh[] = [];
      group.traverse((obj: THREE.Object3D) => {
        if (obj instanceof THREE.Mesh) {
          meshes.push(obj);
          part.originalMaterials.set(obj, obj.material);
        }
      });

      part.group = group;
      part.meshes = meshes;
      part.loading = false;

      // Apply initial visibility + opacity
      this.applyMaterialOverrides(partId);
      group.visible = part.visible;

      this.scene.add(group);
      this.onUpdate();

      return group;
    } catch (err) {
      logger.error('ModelPartLoader', `Error loading part "${part.config.name}":`, err);
      part.loading = false;
      this.onUpdate();
      return null;
    }
  }

  /** Load all visible parts */
  async loadAllVisible(): Promise<void> {
    const promises: Promise<any>[] = [];
    for (const [id, part] of this.parts) {
      if (part.visible && !part.group && !part.loading) {
        promises.push(this.loadPart(id));
      }
    }
    await Promise.allSettled(promises);
  }

  /** Set visibility of a part */
  setPartVisible(partId: string, visible: boolean): void {
    const part = this.parts.get(partId);
    if (!part) return;
    part.visible = visible;
    if (part.group) {
      part.group.visible = visible;
    }
    // Lazy load if becoming visible
    if (visible && !part.group && !part.loading) {
      this.loadPart(partId);
    }
    this.onUpdate();
  }

  /** Set visibility of an entire layer */
  setLayerVisible(layerName: string, visible: boolean): void {
    for (const [, part] of this.parts) {
      if (part.config.layer_group === layerName) {
        this.setPartVisible(part.config.id, visible);
      }
    }
  }

  /** Set opacity of a part (0-1) */
  setPartOpacity(partId: string, opacity: number): void {
    const part = this.parts.get(partId);
    if (!part) return;
    part.opacity = Math.max(0, Math.min(1, opacity));
    this.applyMaterialOverrides(partId);
    this.onUpdate();
  }

  /** Set opacity for all parts in a layer */
  setLayerOpacity(layerName: string, opacity: number): void {
    for (const [id, part] of this.parts) {
      if (part.config.layer_group === layerName) {
        this.setPartOpacity(id, opacity);
      }
    }
  }

  /** Apply translucency material overrides */
  private applyMaterialOverrides(partId: string): void {
    const part = this.parts.get(partId);
    if (!part) return;

    for (const mesh of part.meshes) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
          mat.transparent = part.opacity < 1;
          mat.opacity = part.opacity;
          mat.depthWrite = part.opacity >= 0.99;
          mat.needsUpdate = true;
        }
      }
    }
  }

  /** Get all loaded meshes for raycasting */
  getAllMeshes(): THREE.Object3D[] {
    const meshes: THREE.Object3D[] = [];
    for (const [, part] of this.parts) {
      if (part.visible && part.group) {
        meshes.push(...part.meshes);
      }
    }
    return meshes;
  }

  /** Get part states for UI */
  getPartStates(): PartState[] {
    const states: PartState[] = [];
    for (const [, part] of this.parts) {
      states.push({
        id: part.config.id,
        name: part.config.name,
        layer: part.config.layer_group,
        visible: part.visible,
        opacity: part.opacity,
        loaded: !!part.group,
        loading: part.loading,
      });
    }
    return states.sort((a, b) => {
      const pa = this.parts.get(a.id)!.config.order_index;
      const pb = this.parts.get(b.id)!.config.order_index;
      return pa - pb;
    });
  }

  /** Check if any parts are configured */
  get hasParts(): boolean {
    return this.parts.size > 0;
  }

  /** Get unique layer names */
  get layerNames(): string[] {
    const names = new Set<string>();
    for (const [, part] of this.parts) {
      names.add(part.config.layer_group);
    }
    return Array.from(names);
  }

  /** Check if a layer is fully visible */
  isLayerVisible(layerName: string): boolean {
    for (const [, part] of this.parts) {
      if (part.config.layer_group === layerName && !part.visible) return false;
    }
    return true;
  }

  /** Get average opacity of a layer */
  getLayerOpacity(layerName: string): number {
    let sum = 0, count = 0;
    for (const [, part] of this.parts) {
      if (part.config.layer_group === layerName) {
        sum += part.opacity;
        count++;
      }
    }
    return count > 0 ? sum / count : 1;
  }

  /** Dispose a single part */
  disposePart(partId: string): void {
    const part = this.parts.get(partId);
    if (!part || !part.group) return;

    this.scene.remove(part.group);
    part.meshes.forEach(mesh => {
      mesh.geometry.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach(m => {
        disposeMaterialTextures(m);
        m.dispose();
      });
    });
    part.group = null;
    part.meshes = [];
    part.originalMaterials.clear();
  }

  /** Clear all parts */
  clear(): void {
    for (const [id] of this.parts) {
      this.disposePart(id);
    }
    this.parts.clear();
  }

  /** Dispose everything */
  dispose(): void {
    this.clear();
  }
}

export interface PartState {
  id: string;
  name: string;
  layer: string;
  visible: boolean;
  opacity: number;
  loaded: boolean;
  loading: boolean;
}