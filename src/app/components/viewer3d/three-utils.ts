// ============================================================
// Axon — Three.js Utility Helpers
//
// Shared utilities for proper Three.js resource cleanup.
//
// WHY THIS EXISTS:
//   material.dispose() does NOT dispose its textures.
//   Textures must be explicitly disposed to free GPU VRAM.
//   A single 2048×2048 RGBA texture = ~16MB GPU memory.
//   Without disposal, toggling layers accumulates leaked textures.
//
// USAGE:
//   import { disposeMaterialTextures } from './three-utils';
//   disposeMaterialTextures(mesh.material); // then material.dispose()
// ============================================================

import * as THREE from 'three';

// All material properties that can hold a THREE.Texture reference.
// Covers MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, etc.
const TEXTURE_KEYS = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'emissiveMap',
  'displacementMap',
  'alphaMap',
  'envMap',
  'lightMap',
  'bumpMap',
  'specularMap',
  'clearcoatMap',
  'clearcoatNormalMap',
  'clearcoatRoughnessMap',
  'sheenColorMap',
  'sheenRoughnessMap',
  'transmissionMap',
  'thicknessMap',
] as const;

/**
 * Dispose all textures referenced by a material.
 *
 * THREE.Material.dispose() only frees the shader program, NOT textures.
 * This function iterates all known texture-holding properties and calls
 * texture.dispose() on each, freeing the underlying WebGL texture from VRAM.
 *
 * Safe to call multiple times — texture.dispose() is idempotent.
 * Safe if textures are shared — Three.js handles refcounting internally
 * for textures created by GLTFLoader.
 *
 * @param material - The Three.js material whose textures should be disposed
 */
export function disposeMaterialTextures(material: THREE.Material): void {
  for (const key of TEXTURE_KEYS) {
    const tex = (material as any)[key];
    if (tex && tex instanceof THREE.Texture) {
      tex.dispose();
    }
  }
}

/**
 * Fully dispose a material: first its textures, then the material itself.
 * Convenience wrapper combining disposeMaterialTextures + material.dispose().
 *
 * @param material - The Three.js material to fully dispose
 */
export function disposeFullMaterial(material: THREE.Material): void {
  disposeMaterialTextures(material);
  material.dispose();
}
