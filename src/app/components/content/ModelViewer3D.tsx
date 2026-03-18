// ============================================================
// Axon — ModelViewer3D Component (MODULARIZED)
//
// Three.js viewer for 3D anatomical models.
// Sub-modules extracted in Sprint 1:
//   - model-builders.ts: procedural fallback geometry
//   - useAnimationControls.ts: F3 GLTF animation hook
//   - useThumbnailCapture.ts: 3DP-2 auto-thumbnail hook
//   - useViewerKeyboard.ts: keyboard shortcuts hook
//
// Integrates:
//   - PinSystem, PinEditor, StudentNotes3D, LayerPanel
//   - AnimationControls, ClippingPlaneControls, CaptureViewDialog, ExplodeControl
// ============================================================

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import clsx from 'clsx';
import { Loader2, List, Layers, AlertTriangle, RefreshCw, Keyboard } from 'lucide-react';
import { PinSystem } from '@/app/components/viewer3d/PinSystem';
import type { PinMode } from '@/app/components/viewer3d/PinSystem';
import { PinEditor } from '@/app/components/viewer3d/PinEditor';
import { StudentNotes3D } from '@/app/components/viewer3d/StudentNotes3D';
import { LayerPanel } from '@/app/components/viewer3d/LayerPanel';
import { ModelPartLoader, getStoredParts, getStoredLayers, fetchPartsFromAPI, fetchLayersFromAPI } from '@/app/components/viewer3d/ModelPartMesh';
import type { ModelLayerConfig } from '@/app/components/viewer3d/ModelPartMesh';
import { disposeMaterialTextures } from '@/app/components/viewer3d/three-utils';
import { logger } from '@/app/lib/logger';
// F3/F4/F5/F6 feature components
import { AnimationControls } from '@/app/components/viewer3d/AnimationControls';
import { ClippingPlaneControls } from '@/app/components/viewer3d/ClippingPlaneControls';
import { CaptureViewDialog } from '@/app/components/viewer3d/CaptureViewDialog';
import { ExplodeControl } from '@/app/components/viewer3d/ExplodeControl';
// Sprint 1 extracted modules
import { MODEL_CONFIGS, DEFAULT_MODEL_CONFIG } from '@/app/components/viewer3d/model-builders';
import { useAnimationControls } from '@/app/components/viewer3d/useAnimationControls';
import { useThumbnailCapture } from '@/app/components/viewer3d/useThumbnailCapture';
import { useViewerKeyboard } from '@/app/components/viewer3d/useViewerKeyboard';

// ══════════════════════════════════════════════
// ── ModelViewer3D Component ──
// ══════════════════════════════════════════════

interface ModelViewer3DProps {
  modelId: string;
  modelName: string;
  /** Optional URL to a .glb/.gltf file for direct single-file loading */
  fileUrl?: string;
  mode?: PinMode; // "view" (student default) | "edit" (professor)
  /** Topic ID for keyword autocomplete (F1) + flashcard creation (F5) */
  topicId?: string;
}

export function ModelViewer3D({ modelId, modelName, fileUrl, mode = 'view', topicId }: ModelViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number>(0);
  const modelMeshesRef = useRef<THREE.Object3D[]>([]);
  const partLoaderRef = useRef<ModelPartLoader | null>(null);

  // ── Frame callback registry (replaces DOM hacking) ──
  const frameCallbacksRef = useRef<Set<() => void>>(new Set());

  const registerFrameCallback = useCallback((cb: () => void) => {
    frameCallbacksRef.current.add(cb);
    return () => { frameCallbacksRef.current.delete(cb); };
  }, []);

  // State for child components
  const [sceneReady, setSceneReady] = useState(false);
  const [showPinEditor, setShowPinEditor] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [layerUpdateKey, setLayerUpdateKey] = useState(0);
  const [storedLayers, setStoredLayersState] = useState<ModelLayerConfig[]>([]);
  const [hasMultiPart, setHasMultiPart] = useState(false);
  /** True while a single-file GLB is being downloaded */
  const [glbLoading, setGlbLoading] = useState(false);

  // ── Keyboard shortcut visibility toggles ──
  const [showPins, setShowPins] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [showShortcutHint, setShowShortcutHint] = useState(false);

  // ── F3: Animation (extracted hook) ──
  const anim = useAnimationControls();

  // ── 3DP-2: Auto-thumbnail (extracted hook) ──
  const { captureThumbnail } = useThumbnailCapture({ modelId, mode, rendererRef, sceneRef, cameraRef });

  // ── WebGL context loss recovery (G1) ──
  const [contextLost, setContextLost] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);
  const contextLossCountRef = useRef(0);
  const contextLossTimestampRef = useRef(0);
  const MAX_CONTEXT_LOSSES = 2;
  const CONTEXT_LOSS_WINDOW_MS = 30000;

  // ── Pin refresh key ──
  const [pinRefreshKey, setPinRefreshKey] = useState(0);
  const handlePinsChanged = useCallback(() => {
    setPinRefreshKey(k => k + 1);
  }, []);

  const config = MODEL_CONFIGS[modelId] || DEFAULT_MODEL_CONFIG;

  // ── Keyboard shortcuts (extracted hook) ──
  useViewerKeyboard({
    mode,
    hasMultiPart,
    contextLost,
    cameraRef,
    controlsRef,
    modelMeshesRef,
    cameraPos: config.cameraPos,
    setShowLayerPanel,
    setShowPinEditor,
    setShowPins,
    setShowNotes,
    setShowShortcutHint,
    handlePinsChanged,
  });

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
  }, [modelId, sceneReady, sceneKey]);

  return (
    <div className="relative w-full h-full">
      {/* Three.js canvas container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* ── Pin System (handles markers + overlays) ── */}
      {sceneReady && showPins && (
        <PinSystem
          modelId={modelId}
          topicId={topicId}
          mode={mode}
          scene={sceneRef.current}
          camera={cameraRef.current}
          containerRef={containerRef}
          modelMeshes={modelMeshesRef.current}
          registerFrameCallback={registerFrameCallback}
          refreshKey={pinRefreshKey}
        />
      )}

      {/* ── Student Notes (spatial + text) ── */}
      {sceneReady && mode === 'view' && showNotes && (
        <StudentNotes3D
          modelId={modelId}
          scene={sceneRef.current}
          camera={cameraRef.current}
          containerRef={containerRef}
          modelMeshes={modelMeshesRef.current}
          registerFrameCallback={registerFrameCallback}
        />
      )}

      {/* ── Professor: Pin Editor toggle ── */}
      {mode === 'edit' && (
        <button
          onClick={() => { setShowPinEditor(!showPinEditor); if (!showPinEditor) handlePinsChanged(); }}
          className={clsx(
            'absolute top-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all backdrop-blur-sm border',
            showPinEditor
              ? 'bg-[#2a8c7a]/20 text-[#5cbdaa] border-[#2a8c7a]/30'
              : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10',
          )}
          style={{ left: 170 }}
        >
          <List size={12} />
          Panel Pins
        </button>
      )}

      {/* ── Professor: Pin Editor panel ── */}
      {mode === 'edit' && showPinEditor && (
        <PinEditor
          modelId={modelId}
          onPinsChanged={handlePinsChanged}
          camera={cameraRef.current}
          controls={controlsRef.current}
          onClose={() => setShowPinEditor(false)}
        />
      )}

      {/* ── Layer Panel toggle (both modes, only if multi-part) ── */}
      {hasMultiPart && (
        <button
          onClick={() => setShowLayerPanel(!showLayerPanel)}
          className={clsx(
            'absolute top-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all backdrop-blur-sm border',
            showLayerPanel
              ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
              : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10',
          )}
          style={{ left: mode === 'edit' ? 270 : 170 }}
        >
          <Layers size={12} />
          Capas
        </button>
      )}

      {/* ── Layer Panel ── */}
      {hasMultiPart && showLayerPanel && partLoaderRef.current && (
        <LayerPanel
          partLoader={partLoaderRef.current}
          layers={storedLayers}
          updateKey={layerUpdateKey}
          onClose={() => setShowLayerPanel(false)}
        />
      )}

      {/* ── F3: Animation Controls ── */}
      {sceneReady && anim.animationInfos.length > 0 && (
        <AnimationControls
          animations={anim.animationInfos}
          currentIndex={anim.currentAnimIndex}
          isPlaying={anim.isAnimPlaying}
          currentTime={anim.animCurrentTime}
          duration={anim.animDuration}
          speed={anim.animSpeed}
          onPlay={anim.handleAnimPlay}
          onPause={anim.handleAnimPause}
          onSeek={anim.handleAnimSeek}
          onSelectAnimation={anim.handleAnimSelect}
          onSpeedChange={anim.handleAnimSpeedChange}
          onReset={anim.handleAnimReset}
        />
      )}

      {/* ── F4: Clipping Plane ── */}
      {sceneReady && (
        <ClippingPlaneControls
          renderer={rendererRef.current}
          scene={sceneRef.current}
          modelMeshes={modelMeshesRef.current}
          registerFrameCallback={registerFrameCallback}
        />
      )}

      {/* ── F5: Capture View (professor only) ── */}
      {mode === 'edit' && sceneReady && (
        <div className="absolute top-3 z-20" style={{ left: hasMultiPart ? 360 : 260 }}>
          <CaptureViewDialog
            modelId={modelId}
            modelName={modelName}
            topicId={topicId}
            renderer={rendererRef.current}
            scene={sceneRef.current}
            camera={cameraRef.current}
          />
        </div>
      )}

      {/* ── F6: Explode View (multi-part only) ── */}
      {hasMultiPart && sceneReady && partLoaderRef.current && (
        <div className="absolute bottom-12 right-3 z-20">
          <ExplodeControl
            partLoader={partLoaderRef.current}
            scene={sceneRef.current}
            modelMeshes={modelMeshesRef.current}
          />
        </div>
      )}

      {/* Model name watermark + shortcut hint */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3">
        <p className="text-[9px] text-gray-600 font-medium uppercase tracking-widest">{modelName}</p>
        <button
          onClick={() => setShowShortcutHint(prev => !prev)}
          className="flex items-center gap-1 text-[9px] text-gray-600 hover:text-gray-400 transition-colors"
          title="Atajos de teclado (?)"
        >
          <Keyboard size={10} />
          <span>?</span>
        </button>
      </div>

      {/* ── Keyboard shortcut hint overlay ── */}
      {showShortcutHint && (
        <div className="absolute bottom-12 left-3 z-30 p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-white/10 text-[10px] space-y-1.5">
          <p className="text-gray-300 font-semibold mb-2">Atajos de teclado</p>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-gray-400">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-center">R</kbd>
            <span>Reset camara</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-center">F</kbd>
            <span>Enfocar modelo</span>
            {hasMultiPart && (<>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-center">L</kbd>
              <span>Capas</span>
            </>)}
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-center">P</kbd>
            <span>{mode === 'edit' ? 'Panel Pins' : 'Mostrar/Ocultar Pins'}</span>
            {mode === 'view' && (<>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-center">N</kbd>
              <span>Mostrar/Ocultar Notas</span>
            </>)}
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-center">Esc</kbd>
            <span>Volver</span>
          </div>
        </div>
      )}

      {/* ── GLB loading overlay ── */}
      {glbLoading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-2 p-5 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10">
            <Loader2 size={24} className="animate-spin text-[#2dd4a8] mx-auto" />
            <p className="text-[10px] text-gray-300">Cargando modelo 3D...</p>
            {fileUrl && (
              <p className="text-[8px] text-gray-600 max-w-[200px] truncate">{fileUrl.split('/').pop()}</p>
            )}
          </div>
        </div>
      )}

      {/* ── WebGL context loss overlay ── */}
      {contextLost && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center space-y-3 p-6 rounded-xl bg-zinc-900/90 border border-white/10 max-w-xs">
            <AlertTriangle size={28} className="mx-auto text-amber-400" />
            <h4 className="text-xs font-bold text-white">Error de GPU</h4>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              {contextLossCountRef.current > MAX_CONTEXT_LOSSES
                ? 'El contexto WebGL se ha perdido varias veces. Tu dispositivo puede no tener suficiente memoria de video.'
                : 'El contexto WebGL se ha perdido. Intentando recuperar...'}
            </p>
            {contextLossCountRef.current > MAX_CONTEXT_LOSSES ? (
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-1.5 mx-auto px-4 py-2 text-[10px] font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors"
              >
                <RefreshCw size={12} />
                Recargar pagina
              </button>
            ) : (
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500">
                <Loader2 size={12} className="animate-spin" />
                Recuperando...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
