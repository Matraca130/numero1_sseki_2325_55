// ============================================================
// Axon — useThumbnailCapture hook
//
// Extracted from ModelViewer3D.tsx for <500 line rule.
// Auto-captures a PNG thumbnail from the 3D viewport
// and uploads it via the model3d-api.
// ============================================================

import { useCallback, useRef } from 'react';
import * as THREE from 'three';
import { uploadThumbnail, updateModel3D } from '@/app/lib/model3d-api';
import { logger } from '@/app/lib/logger';
import type { PinMode } from '@/app/components/viewer3d/PinSystem';

interface UseThumbnailCaptureOptions {
  modelId: string;
  mode: PinMode;
  rendererRef: React.MutableRefObject<THREE.WebGLRenderer | null>;
  sceneRef: React.MutableRefObject<THREE.Scene | null>;
  cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
}

export function useThumbnailCapture({
  modelId,
  mode,
  rendererRef,
  sceneRef,
  cameraRef,
}: UseThumbnailCaptureOptions) {
  const capturedRef = useRef(false);

  const captureThumbnail = useCallback(() => {
    if (mode !== 'edit' || capturedRef.current) return;
    capturedRef.current = true;

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;

    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');

    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `thumb-${modelId}.png`, { type: 'image/png' });
        return uploadThumbnail(file, modelId);
      })
      .then(thumbnailUrl => updateModel3D(modelId, { thumbnail_url: thumbnailUrl }))
      .then(() => logger.info('useThumbnailCapture', `Thumbnail auto-captured for model ${modelId}`))
      .catch(err => logger.warn('useThumbnailCapture', 'Auto-thumbnail capture failed (non-critical):', err));
  }, [modelId, mode, rendererRef, sceneRef, cameraRef]);

  /** Reset so a new capture can happen (e.g. after scene remount) */
  const resetCapture = useCallback(() => {
    capturedRef.current = false;
  }, []);

  return { captureThumbnail, resetCapture };
}
