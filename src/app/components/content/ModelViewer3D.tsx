// ============================================================
// Axon — ModelViewer3D Component (MODULARIZED v2)
//
// Three.js viewer for 3D anatomical models. Orchestrator only.
//
// Sub-modules:
//   Sprint 1 (existing, in components/viewer3d/):
//     - model-builders.ts       procedural fallback geometry
//     - useAnimationControls.ts F3 GLTF animation hook
//     - useThumbnailCapture.ts  3DP-2 auto-thumbnail hook
//     - useViewerKeyboard.ts    keyboard shortcuts hook
//   God-component split (finding #21, in content/viewer3d/):
//     - useViewerState.ts       refs + UI state bag
//     - useModelLoader.ts       scene bootstrap + model loading + WebGL handlers
//
// Integrates:
//   PinSystem, PinEditor, StudentNotes3D, LayerPanel,
//   AnimationControls, ClippingPlaneControls, CaptureViewDialog, ExplodeControl
// ============================================================

import React from 'react';
import clsx from 'clsx';
import { List, Layers, Keyboard } from 'lucide-react';
import { PinSystem } from '@/app/components/viewer3d/PinSystem';
import type { PinMode } from '@/app/components/viewer3d/PinSystem';
import { PinEditor } from '@/app/components/viewer3d/PinEditor';
import { StudentNotes3D } from '@/app/components/viewer3d/StudentNotes3D';
import { LayerPanel } from '@/app/components/viewer3d/LayerPanel';
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
// God-component split (finding #21)
import { useViewerState } from './viewer3d/useViewerState';
import { useModelLoader, MAX_CONTEXT_LOSSES } from './viewer3d/useModelLoader';
import { KeyboardShortcutHint, GlbLoadingOverlay, ContextLostOverlay } from './viewer3d/ViewerOverlays';

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
  // ── All refs + UI state (split: useViewerState) ──
  const state = useViewerState();
  const {
    containerRef, rendererRef, sceneRef, cameraRef, controlsRef,
    modelMeshesRef, partLoaderRef, registerFrameCallback,
    sceneReady, showPinEditor, setShowPinEditor, showLayerPanel, setShowLayerPanel,
    layerUpdateKey, storedLayers, hasMultiPart, glbLoading,
    showPins, setShowPins, showNotes, setShowNotes,
    showShortcutHint, setShowShortcutHint,
    contextLost, contextLossCountRef,
    pinRefreshKey, handlePinsChanged,
  } = state;

  // ── F3: Animation (extracted hook) ──
  const anim = useAnimationControls();

  // ── 3DP-2: Auto-thumbnail (extracted hook) ──
  const { captureThumbnail } = useThumbnailCapture({ modelId, mode, rendererRef, sceneRef, cameraRef });

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

  // ── Scene bootstrap + model loading (split: useModelLoader) ──
  useModelLoader({ modelId, fileUrl, config, state, anim, captureThumbnail });

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
            'absolute top-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all border',
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
            'absolute top-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all border',
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
      {showShortcutHint && <KeyboardShortcutHint hasMultiPart={hasMultiPart} mode={mode} />}

      {/* ── GLB loading overlay ── */}
      {glbLoading && <GlbLoadingOverlay fileUrl={fileUrl} />}

      {/* ── WebGL context loss overlay ── */}
      {contextLost && <ContextLostOverlay exceededThreshold={contextLossCountRef.current > MAX_CONTEXT_LOSSES} />}
    </div>
  );
}
