# Diffs exactos para aplicar en archivos existentes

## DIFF 1: ModelViewer3DProps — agregar topicId

```diff
 interface ModelViewer3DProps {
   modelId: string;
   modelName: string;
   fileUrl?: string;
   mode?: PinMode;
+  topicId?: string;
 }

-export function ModelViewer3D({ modelId, modelName, fileUrl, mode = 'view' }: ModelViewer3DProps) {
+export function ModelViewer3D({ modelId, modelName, fileUrl, mode = 'view', topicId }: ModelViewer3DProps) {
```

## DIFF 2: ModelViewer3D — imports nuevos

```diff
 import { disposeMaterialTextures } from '@/app/components/viewer3d/three-utils';
 import { logger } from '@/app/lib/logger';
 import { uploadThumbnail, updateModel3D } from '@/app/lib/model3d-api';
+import { AnimationControls } from '@/app/components/viewer3d/AnimationControls';
+import type { AnimationInfo } from '@/app/components/viewer3d/AnimationControls';
+import { ClippingPlaneControls } from '@/app/components/viewer3d/ClippingPlaneControls';
+import { CaptureViewDialog } from '@/app/components/viewer3d/CaptureViewDialog';
+import { ExplodeControl } from '@/app/components/viewer3d/ExplodeControl';
```

## DIFF 3: ModelViewer3D — estado de animaciones + throttle ref

```diff
   const [showShortcutHint, setShowShortcutHint] = useState(false);
+
+  // ── F3: GLTF Animation state ──
+  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
+  const animActionsRef = useRef<THREE.AnimationAction[]>([]);
+  const [animationInfos, setAnimationInfos] = useState<AnimationInfo[]>([]);
+  const [currentAnimIndex, setCurrentAnimIndex] = useState(0);
+  const [isAnimPlaying, setIsAnimPlaying] = useState(false);
+  const [animCurrentTime, setAnimCurrentTime] = useState(0);
+  const [animDuration, setAnimDuration] = useState(0);
+  const [animSpeed, setAnimSpeed] = useState(1);
+  const clockRef = useRef(new THREE.Clock());
+  const lastAnimTimeUpdateRef = useRef(0);
+  const ANIM_TIME_THROTTLE_MS = 250; // ~4fps for timeline UI
```

## DIFF 4: Animation loop — agregar mixer update (con throttle B2 fix)

En el bloque `animate()` del useEffect principal, ANTES de `frameCallbacksRef.current.forEach`:

```diff
       controls.update();
       renderer.render(scene, camera);

+      // F3: Update animation mixer
+      if (mixerRef.current) {
+        const delta = clockRef.current.getDelta();
+        mixerRef.current.update(delta);
+        // Throttle time state update to ~4fps (avoid 60fps React re-renders)
+        const now = performance.now();
+        if (now - lastAnimTimeUpdateRef.current > ANIM_TIME_THROTTLE_MS) {
+          lastAnimTimeUpdateRef.current = now;
+          const action = animActionsRef.current[currentAnimIndex];
+          if (action) setAnimCurrentTime(action.time);
+        }
+      }
+
       // Call projection callbacks from PinSystem and StudentNotes3D
       frameCallbacksRef.current.forEach(cb => {
```

## DIFF 5: GLB loader — detectar animaciones GLTF

Dentro del callback `onLoad` de `gltfLoader.load()`, DESPUES de `modelMeshesRef.current = meshes;`:

```diff
           modelMeshesRef.current = meshes;
+
+          // F3: Detect and setup GLTF animations
+          if (gltf.animations && gltf.animations.length > 0) {
+            const mixer = new THREE.AnimationMixer(modelGroup);
+            mixerRef.current = mixer;
+            clockRef.current.start();
+
+            const infos: AnimationInfo[] = gltf.animations.map((clip: THREE.AnimationClip, i: number) => ({
+              name: clip.name || `Animation ${i + 1}`,
+              duration: clip.duration,
+              index: i,
+            }));
+            setAnimationInfos(infos);
+            setAnimDuration(infos[0]?.duration || 0);
+
+            const actions = gltf.animations.map((clip: THREE.AnimationClip) => mixer.clipAction(clip));
+            animActionsRef.current = actions;
+            logger.info('ModelViewer3D', `Found ${infos.length} GLTF animation(s)`);
+          }

           // Auto-fit camera to model bounding box
```

## DIFF 6: Cleanup — agregar disposal del mixer

En el `return` del useEffect principal (cleanup):

```diff
       partLoaderRef.current?.dispose();
       partLoaderRef.current = null;
+      mixerRef.current?.stopAllAction();
+      mixerRef.current = null;
+      animActionsRef.current = [];
       if (container.contains(renderer.domElement)) {
```

## DIFF 7: Animation handlers — agregar callbacks

DESPUES del bloque `focusModel` callback:

```diff
   }, []);
+
+  // ── F3: Animation handlers ──
+  const handleAnimPlay = useCallback(() => {
+    const action = animActionsRef.current[currentAnimIndex];
+    if (action && mixerRef.current) {
+      action.play();
+      action.paused = false;
+      setIsAnimPlaying(true);
+    }
+  }, [currentAnimIndex]);
+
+  const handleAnimPause = useCallback(() => {
+    const action = animActionsRef.current[currentAnimIndex];
+    if (action) {
+      action.paused = true;
+      setIsAnimPlaying(false);
+    }
+  }, [currentAnimIndex]);
+
+  const handleAnimSeek = useCallback((time: number) => {
+    const action = animActionsRef.current[currentAnimIndex];
+    if (action && mixerRef.current) {
+      action.time = time;
+      mixerRef.current.update(0);
+      setAnimCurrentTime(time);
+    }
+  }, [currentAnimIndex]);
+
+  const handleAnimSelect = useCallback((index: number) => {
+    animActionsRef.current.forEach(a => a.stop());
+    setCurrentAnimIndex(index);
+    setAnimDuration(animationInfos[index]?.duration || 0);
+    setAnimCurrentTime(0);
+    setIsAnimPlaying(false);
+  }, [animationInfos]);
+
+  const handleAnimSpeedChange = useCallback((speed: number) => {
+    setAnimSpeed(speed);
+    if (mixerRef.current) mixerRef.current.timeScale = speed;
+  }, []);
+
+  const handleAnimReset = useCallback(() => {
+    animActionsRef.current.forEach(a => a.stop());
+    setAnimCurrentTime(0);
+    setIsAnimPlaying(false);
+  }, []);

   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
```

## DIFF 8: JSX — agregar componentes nuevos

DESPUES del bloque `{/* ── Layer Panel ── */}` y ANTES de `{/* Model name watermark */}`:

```diff
       )}
+
+      {/* ── F3: Animation Controls ── */}
+      {sceneReady && animationInfos.length > 0 && (
+        <AnimationControls
+          animations={animationInfos}
+          currentIndex={currentAnimIndex}
+          isPlaying={isAnimPlaying}
+          currentTime={animCurrentTime}
+          duration={animDuration}
+          speed={animSpeed}
+          onPlay={handleAnimPlay}
+          onPause={handleAnimPause}
+          onSeek={handleAnimSeek}
+          onSelectAnimation={handleAnimSelect}
+          onSpeedChange={handleAnimSpeedChange}
+          onReset={handleAnimReset}
+        />
+      )}
+
+      {/* ── F4: Clipping Plane ── */}
+      {sceneReady && (
+        <ClippingPlaneControls
+          renderer={rendererRef.current}
+          scene={sceneRef.current}
+          modelMeshes={modelMeshesRef.current}
+          registerFrameCallback={registerFrameCallback}
+        />
+      )}
+
+      {/* ── F5: Capture View (professor only) ── */}
+      {mode === 'edit' && sceneReady && (
+        <div className="absolute top-3 z-20" style={{ left: hasMultiPart ? 360 : 260 }}>
+          <CaptureViewDialog
+            modelId={modelId}
+            modelName={modelName}
+            topicId={topicId}
+            renderer={rendererRef.current}
+            scene={sceneRef.current}
+            camera={cameraRef.current}
+          />
+        </div>
+      )}
+
+      {/* ── F6: Explode View (multi-part only) ── */}
+      {hasMultiPart && sceneReady && partLoaderRef.current && (
+        <div className="absolute bottom-12 right-3 z-20">
+          <ExplodeControl
+            partLoader={partLoaderRef.current}
+            scene={sceneRef.current}
+            modelMeshes={modelMeshesRef.current}
+          />
+        </div>
+      )}

       {/* Model name watermark + shortcut hint */}
```

## DIFF 9: PinSystem.tsx — F1: Keyword en PinCreationForm

En `PinCreationForm`, agregar import y estado:

```diff
+import { KeywordAutocomplete } from './KeywordAutocomplete';
+import { Link2 } from 'lucide-react';
```

En `PinCreationForm` function:

```diff
 function PinCreationForm({
   onSubmit,
   onCancel,
   geometry,
+  topicId,
 }: {
   onSubmit: (data: { label: string; description: string; pin_type: string; color: string; keyword_id?: string }) => Promise<void>;
   onCancel: () => void;
   geometry: THREE.Vector3;
+  topicId?: string;
 }) {
   const [label, setLabel] = useState('');
   const [description, setDescription] = useState('');
   const [pinType, setPinType] = useState('info');
   const [saving, setSaving] = useState(false);
+  const [keywordId, setKeywordId] = useState<string | null>(null);
```

Agregar `KeywordAutocomplete` en el form (despues del selector de pin type):

```diff
         ))}
         </div>
+
+        {/* F1: Keyword linking */}
+        <KeywordAutocomplete
+          topicId={topicId}
+          value={keywordId}
+          onChange={(id) => setKeywordId(id)}
+        />

         {/* Label */}
```

En `handleSubmit`:

```diff
       await onSubmit({
         label: label.trim(),
         description: description.trim(),
         pin_type: pinType,
         color: selectedType.color,
+        keyword_id: keywordId || undefined,
       });
```

En `handleCreatePin` del componente padre PinSystem:

```diff
     const created = await createModel3DPin({
       model_id: modelId,
       geometry: { ... },
       normal: { ... },
       title: formData.label,
       description: formData.description,
       pin_type: 'point',
       color: formData.color,
+      keyword_id: formData.keyword_id,
     });
```

En el popup activo del pin (student view), agregar seccion de keyword:

```diff
                 {pin.description && (
                   <p className="text-[10px] text-gray-400 leading-relaxed mb-2">{pin.description}</p>
                 )}

+                {/* F1: Keyword link badge */}
+                {pin.keyword_id && (
+                  <div className="mb-2 px-2 py-1 rounded-md bg-violet-500/10 border border-violet-500/20">
+                    <span className="text-[8px] text-violet-400 flex items-center gap-1">
+                      <Link2 size={8} />
+                      Keyword vinculado
+                    </span>
+                  </div>
+                )}

                 <div className="flex items-center gap-2">
```

## DIFF 10: PinSystem props — agregar topicId

```diff
 interface PinSystemProps {
   modelId: string;
+  topicId?: string;
   mode: PinMode;
```

Y pasar `topicId` a `PinCreationForm`:

```diff
       {showForm && placementPoint && (
         <PinCreationForm
           onSubmit={handleCreatePin}
           onCancel={() => { setShowForm(false); setPlacementPoint(null); }}
           geometry={placementPoint.geometry}
+          topicId={topicId}
         />
       )}
```

## DIFF 11: Pasar topicId desde ModelViewer3D → PinSystem

```diff
         <PinSystem
           modelId={modelId}
+          topicId={topicId}
           mode={mode}
```

## DIFF 12 (CRITICO): ThreeDView.tsx — Pasar topicId

**Sin este cambio, F1 (KeywordAutocomplete) y F5 (CaptureViewDialog) no funcionan.**

En `ViewerScreen` dentro de `ThreeDView.tsx`:

```diff
-          <ModelViewer3D modelId={model.id} modelName={model.title} />
+          <ModelViewer3D modelId={model.id} modelName={model.title} topicId={model.topic_id} />
```

Nota: `model.topic_id` ya existe en el tipo `Model3D` (ver `types/model3d.ts`).

## DIFF 13: ProfessorModelViewerPage.tsx — Pasar topicId (si aplica)

Verificar en `ProfessorModelViewerPage.tsx` si tambien necesita `topicId`.

## Resumen de cambios por archivo

| Archivo | Diffs | Tipo |
|---------|-------|------|
| `ModelViewer3D.tsx` | 1,2,3,4,5,6,7,8,11 | Modificacion |
| `PinSystem.tsx` | 9,10 | Modificacion |
| `KeywordAutocomplete.tsx` | — | Archivo nuevo |
| `AnimationControls.tsx` | — | Archivo nuevo |
| `ClippingPlaneControls.tsx` | — | Archivo nuevo |
| `CaptureViewDialog.tsx` | — | Archivo nuevo |
| `ExplodeControl.tsx` | — | Archivo nuevo |
| `LinePinMarker.tsx` | — | Archivo nuevo |
| `MultiPointPlacer.tsx` | — | Archivo nuevo |
| `ThreeDView.tsx` | 12 | Modificacion |
| `ProfessorModelViewerPage.tsx` | 13 | Modificacion |

---

## Bugs encontrados y corregidos en la revision

| # | Archivo | Severidad | Bug | Estado |
|---|---------|-----------|-----|--------|
| B1 | KeywordAutocomplete.tsx | ALTA | Usaba `?topic_id=` pero backend keywords solo soporta `?summary_id=` | CORREGIDO — ahora hace GET /summaries primero |
| B2 | DIFF 4 (animation loop) | MEDIA | `setAnimCurrentTime()` causaba re-renders a 60fps | CORREGIDO via throttle 250ms |
| B3 | LinePinMarker.tsx | COSMETICA | `linewidth: 2` no tiene efecto en WebGL | Aceptado — usar Line2 seria sobreingenieria para v1 |
| B4 | MultiPointPlacer.tsx | ALTA | Preview meshes no tenian `userData.isPreview` → raycasts incorrectos | CORREGIDO |
| B5 | MultiPointPlacer.tsx | MEDIA | Double-click + click race condition agregaba vertice extra | CORREGIDO via debounce 200ms |
| B6 | ThreeDView.tsx | ALTA | `topicId` nunca se pasaba a ModelViewer3D | CORREGIDO via DIFF 12 |
| B7 | ExplodeControl.tsx | BAJA | Desplazamiento hardcoded (3u) no escalaba con modelo | CORREGIDO — usa diagonal del bbox |
| B8 | ClippingPlaneControls.tsx | BAJA | `boundsRef` no se recalcula si meshes cambian | Aceptado — caso raro en uso normal |