# Guia de Integracion — 6 Features 3D para Axon v4.4

## Archivos NUEVOS (copiar directamente al repo)

| Archivo | Feature | Descripcion |
|---------|---------|-------------|
| `viewer3d/KeywordAutocomplete.tsx` | F1: Pin↔Keyword | Autocomplete para vincular pin a keyword |
| `viewer3d/AnimationControls.tsx` | F3: GLTF Animations | UI play/pause/timeline para animaciones |
| `viewer3d/ClippingPlaneControls.tsx` | F4: Clipping Plane | Controles de plano de corte anatomico |
| `viewer3d/CaptureViewDialog.tsx` | F5: Vista→Flashcard | Captura 3D → crea flashcard |
| `viewer3d/ExplodeControl.tsx` | F6: Explode View | Vista explosionada para multi-part |
| `viewer3d/LinePinMarker.tsx` | F2: Line/Area Pins | Geometria 3D para pines de linea y area |
| `viewer3d/MultiPointPlacer.tsx` | F2: Line/Area Pins | State machine multi-click placement |

## Archivos MODIFICADOS (aplicar diffs de DIFFS_TO_APPLY.md)

| Archivo | Diffs | Tipo |
|---------|-------|------|
| `ModelViewer3D.tsx` | 1,2,3,4,5,6,7,8,11 | Modificacion |
| `PinSystem.tsx` | 9,10 | Modificacion |
| `ThreeDView.tsx` | 12 (CRITICO) | Modificacion |
| `ProfessorModelViewerPage.tsx` | 13 | Verificar |

## Orden de implementacion recomendado

1. Los 7 archivos nuevos ya estan en el repo (commit 1)
2. Agregar `topicId` prop a `ModelViewer3DProps` (DIFF 1)
3. Aplicar DIFF 12 a ThreeDView.tsx (CRITICO - sin esto F1 y F5 no funcionan)
4. Aplicar DIFFs 2-8 a ModelViewer3D.tsx (imports + state + handlers + JSX)
5. Aplicar DIFFs 9-11 a PinSystem.tsx (keyword autocomplete)
6. Test: abrir visor 3D como profesor, verificar botones nuevos
7. Test: cargar modelo con animaciones → verificar AnimationControls
8. Test: multi-part model → verificar ExplodeControl + ClippingPlane

## Notas importantes

- TODOS los features son 0 cambios backend
- `keyword_id` ya existe en `model_3d_pins` — solo se activa en la UI
- `pin_type: 'line'|'area'` ya existen en DB CHECK — solo se implementa frontend
- `AnimationMixer` es Three.js built-in — no se instala nada nuevo
- `renderer.clippingPlanes` es Three.js built-in
- `captureThumbnail` + `uploadThumbnail` ya existen — se reutilizan para flashcards
- DIFF 14 (throttle animCurrentTime) es PERF fix — evita re-renders a 60fps