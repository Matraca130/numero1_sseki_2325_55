# 3D Viewer Memory

## Estado actual
- Three.js viewer working with GLB models
- Pin system (point/line/area types)
- Student spatial notes
- Layer/part visibility
- Animation, clipping planes, explode view

## Decisiones tomadas (NO re-litigar)
- Three.js in separate vendor chunk
- GLB magic byte validation
- 100MB upload limit

## Archivos clave
- components/viewer3d/ (19 files, 4700L) — full 3D viewer, pins, layers, animations
- lib/model3d-api.ts (329L) — model upload/download, GLB validation

## Bugs conocidos
- None open
