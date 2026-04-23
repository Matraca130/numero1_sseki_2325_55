// ============================================================
// Axon — useModelLoader (extracted from ModelViewer3D.tsx)
//
// Owns both effects that bootstrap the Three.js scene and load
// the model (stored multi-part, remote GLB, or fallback geometry).
//
// God-component split (finding #21): logic moved verbatim from
// ModelViewer3D.tsx — behavior is unchanged.
// ============================================================
import { useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  ModelPartLoader,
  getStoredParts,
  getStoredLayers,
  fetchPartsFromAPI,
  fetchLayersFromAPI,
} from '@/app/components/viewer3d/ModelPartMesh';
import { disposeMaterialTextures } from '@/app/components/viewer3d/three-utils';
import { logger } from '@/app/lib/logger';
import type { ModelConfig } from '@/app/components/viewer3d/model-builders';
import type { useAnimationControls } from '@/app/components/viewer3d/useAnimationControls';
import type { ViewerState } from './useViewerState';

const MAX_CONTEXT_LOSSES = 2;
const CONTEXT_LOSS_WINDOW_MS = 30000;

export interface ModelLoaderOptions {
  modelId: string;
  fileUrl?: string;
  config: ModelConfig;
  state: ViewerState;
  anim: ReturnType<typeof useAnimationControls>;
  captureThumbnail: () => void;
}

/**
 * Mirrors the original two useEffect hooks inside ModelViewer3D —
 * scene bootstrap + async API parts/layers fetch. Runs for the
 * lifetime of the component and re-runs when modelId/fileUrl/sceneKey
 * change.
 */
export function useModelLoader({ modelId, fileUrl, config, state, anim, captureThumbnail }: ModelLoaderOptions) {
  const {
    containerRef,
    rendererRef,
    sceneRef,
    cameraRef,
    controlsRef,
    animFrameRef,
    modelMeshesRef,
    partLoaderRef,
    frameCallbacksRef,
    setSceneReady,
    setLayerUpdateKey,
    setStoredLayersState,
    setHasMultiPart,
    setGlbLoading,
    setContextLost,
    sceneReady,
    sceneKey,
    setSceneKey,
    contextLossCountRef,
    contextLossTimestampRef,
  } = state;

  // ── Scene bootstrap + model loading ──
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111118);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(...config.cameraPos);
    camera.lookAt(0, 0.5, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.5, 0);
    controls.minDistance = 2;
    controls.maxDistance = 12;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controlsRef.current = controls;

    // Lighting
    const ambLight = new THREE.AmbientLight(0x404060, 0.8);
    scene.add(ambLight);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    fillLight.position.set(-3, 2, -3);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0x4488ff, 0.6);
    rimLight.position.set(0, -2, -5);
    scene.add(rimLight);

    // Ground grid
    const gridHelper = new THREE.GridHelper(8, 16, 0x222233, 0x1a1a2a);
    gridHelper.position.y = -3;
    scene.add(gridHelper);

    const storedParts = getStoredParts(modelId);
    const layers = getStoredLayers(modelId);
    setStoredLayersState(layers);

    if (storedParts.length > 0) {
      setHasMultiPart(true);
      const loader = new ModelPartLoader(scene, () => {
        setLayerUpdateKey(k => k + 1);
        modelMeshesRef.current = loader.getAllMeshes();
      });
      loader.init(storedParts);
      loader.loadAllVisible();
      partLoaderRef.current = loader;
      setTimeout(captureThumbnail, 1500);
    } else if (fileUrl) {
      setHasMultiPart(false);
      setGlbLoading(true);

      const gltfLoader = new GLTFLoader();
      gltfLoader.load(
        fileUrl,
        (gltf) => {
          const modelGroup = gltf.scene;
          scene.add(modelGroup);

          const meshes: THREE.Object3D[] = [];
          modelGroup.traverse((obj) => {
            if (obj instanceof THREE.Mesh) meshes.push(obj);
          });
          modelMeshesRef.current = meshes;

          // F3: Detect and setup GLTF animations via extracted hook
          if (gltf.animations && gltf.animations.length > 0) {
            anim.initAnimations(modelGroup, gltf.animations);
          }

          // Auto-fit camera to model bounding box
          const box = new THREE.Box3().setFromObject(modelGroup);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const distance = maxDim * 2;

          camera.position.set(
            center.x + distance * 0.5,
            center.y + distance * 0.3,
            center.z + distance * 0.5,
          );
          controls.target.copy(center);
          controls.minDistance = maxDim * 0.5;
          controls.maxDistance = maxDim * 5;
          controls.update();

          gridHelper.position.y = box.min.y - 0.1;

          setGlbLoading(false);
          logger.info('ModelViewer3D', `GLB loaded: ${fileUrl}`);
          setTimeout(captureThumbnail, 500);
        },
        undefined,
        (err) => {
          logger.error('ModelViewer3D', 'GLB load error:', err);
          setGlbLoading(false);
          const fallbackGroup = new THREE.Group();
          config.buildModel(fallbackGroup);
          scene.add(fallbackGroup);
          const meshes: THREE.Object3D[] = [];
          fallbackGroup.traverse((obj) => {
            if (obj instanceof THREE.Mesh) meshes.push(obj);
          });
          modelMeshesRef.current = meshes;
        },
      );
    } else {
      setHasMultiPart(false);
      const modelGroup = new THREE.Group();
      config.buildModel(modelGroup);
      scene.add(modelGroup);

      const meshes: THREE.Object3D[] = [];
      modelGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          meshes.push(obj);
        }
      });
      modelMeshesRef.current = meshes;
    }

    setSceneReady(true);

    // Animation loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);

      // F3: Update animation mixer via extracted hook
      anim.updateAnimation();

      // Call projection callbacks from PinSystem and StudentNotes3D
      frameCallbacksRef.current.forEach(cb => {
        try {
          cb();
        } catch (e) {
          logger.error('ModelViewer3D', 'Frame callback error:', e);
        }
      });
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // ── WebGL context loss/restore handlers ──
    const canvas = renderer.domElement;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(animFrameRef.current);
      setSceneReady(false);
      setContextLost(true);
      logger.warn('ModelViewer3D', 'WebGL context lost');

      const now = Date.now();
      if (now - contextLossTimestampRef.current > CONTEXT_LOSS_WINDOW_MS) {
        contextLossCountRef.current = 0;
        contextLossTimestampRef.current = now;
      }
      contextLossCountRef.current++;
    };

    const handleContextRestored = () => {
      logger.info('ModelViewer3D', 'WebGL context restored — remounting scene');
      setContextLost(false);

      if (contextLossCountRef.current <= MAX_CONTEXT_LOSSES) {
        setSceneKey(k => k + 1);
      }
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      setSceneReady(false);
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();
      renderer.dispose();
      partLoaderRef.current?.dispose();
      partLoaderRef.current = null;
      // Cleanup animation mixer
      anim.mixerRef.current?.stopAllAction();
      anim.mixerRef.current = null;
      anim.animActionsRef.current = [];
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => {
            disposeMaterialTextures(m);
            m.dispose();
          });
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, fileUrl, config, sceneKey]);

  // ── Async API fetch: update parts/layers from backend ──
  useEffect(() => {
    if (!sceneReady || !sceneRef.current) return;
    let cancelled = false;

    (async () => {
      const [apiParts, apiLayers] = await Promise.all([
        fetchPartsFromAPI(modelId),
        fetchLayersFromAPI(modelId),
      ]);
      if (cancelled) return;

      setStoredLayersState(apiLayers);

      if (apiParts.length > 0 && sceneRef.current) {
        setHasMultiPart(true);
        const scene = sceneRef.current;

        if (partLoaderRef.current) {
          partLoaderRef.current.dispose();
        }

        const loader = new ModelPartLoader(scene, () => {
          setLayerUpdateKey(k => k + 1);
          modelMeshesRef.current = loader.getAllMeshes();
        });
        loader.init(apiParts);
        loader.loadAllVisible();
        partLoaderRef.current = loader;
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, sceneReady, sceneKey]);
}

export { MAX_CONTEXT_LOSSES };
