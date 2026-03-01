# Agent 6 (3D) — Post-Phase-0 Adaptation

## Contexto del proyecto

**Proyecto:** Axon v4.4 — Plataforma educativa
**Repo:** `Matraca130/numero1_sseki_2325_55` (publico, GitHub)
**Branch de trabajo:** `phase0/split-student-routes`
**Stack:** React 18 + TypeScript + Supabase + Deno
**Modelo:** 6 agentes paralelos bajo esquema "file swap"

## Que cambio en Phase 0

`student-routes.ts` fue splitado. Tu ahora **ERES DUENO** de `src/app/routes/threed-student-routes.ts`.

## Git workflow

```bash
git fetch origin
git checkout phase0/split-student-routes
git pull origin phase0/split-student-routes
git add <tus archivos>
git commit -m "agent6(3d): <descripcion corta>"
git push origin phase0/split-student-routes
```

## Accion requerida: NINGUNA

Eres el **segundo agente mas independiente** (despues de Agent 3).
Tu codigo NO usa AppContext, NO usa AuthContext, NO usa StudentDataContext.
Solo usa ContentTreeContext para leer el arbol y encontrar topics con modelos 3D.
El auth se maneja de forma encapsulada via `lib/api.ts` -> `apiCall()` (ANON_KEY + getAccessToken()).
Tus archivos nunca importan AuthContext directamente.

Pasos de verificacion:
1. `npm run dev` — debe compilar sin errores
2. `/student/3d` — debe cargar ThreeDView

## Tus archivos — Inventario completo (14 archivos)

### Rutas
| Archivo | Tamano | Descripcion |
|---------|--------|-------------|
| `src/app/routes/threed-student-routes.ts` | ~1KB | **NUEVO** — Tu archivo de rutas (lazy) |

### Servicios y API
| Archivo | Tamano | Descripcion |
|---------|--------|-------------|
| `src/app/services/models3dApi.ts` | 6KB | CRUD base: getModels3D, createModel3D, updateModel3D, deleteModel3D, getModel3DPins, model3d-notes CRUD |
| `src/app/lib/model3d-api.ts` | 8KB | Wrapper alto nivel: upload con validacion, progress tracking, re-exporta CRUD de models3dApi |

### Vista estudiante
| Archivo | Tamano | Descripcion |
|---------|--------|-------------|
| `src/app/components/content/ThreeDView.tsx` | 20KB | Lista de modelos 3D, seleccion, navegacion |
| `src/app/components/content/ModelViewer3D.tsx` | 20KB | Renderer Three.js con OrbitControls, integra viewer3d/* |

### Componentes viewer3d/ (todos tuyos)
| Archivo | Tamano | Descripcion |
|---------|--------|-------------|
| `src/app/components/viewer3d/PinSystem.tsx` | 20KB | Gestion de pines 3D: raycast, formulario inline, overlay HTML |
| `src/app/components/viewer3d/StudentNotes3D.tsx` | 15KB | Notas personales del estudiante con posicion 3D opcional |
| `src/app/components/viewer3d/LayerPanel.tsx` | 11KB | Sidebar de capas: toggle visibilidad, opacidad |
| `src/app/components/viewer3d/PinEditor.tsx` | 10KB | Panel lateral profesor: listar/editar/eliminar pines |
| `src/app/components/viewer3d/ModelPartMesh.tsx` | 10KB | Clase imperativa Three.js: carga .glb, gestion de partes y capas. NO es componente React |
| `src/app/components/viewer3d/PinMarker3D.tsx` | 5KB | Clase imperativa Three.js: meshes esfera+ring por tipo de pin. NO es componente React |

### Lado profesor (3 archivos tuyos en `professor/`)
| Archivo | Tamano | Descripcion |
|---------|--------|-------------|
| `src/app/components/professor/ModelManager.tsx` | 23KB | CRUD completo de modelos 3D por topic. Upload via ModelUploadZone |
| `src/app/components/professor/ModelPartsManager.tsx` | 24KB | CRUD de partes y capas. Usa **localStorage** (no backend aun) |
| `src/app/components/professor/ModelUploadZone.tsx` | 9KB | Drag-and-drop upload .glb/.gltf con validacion client-side |

> **NOTA:** La carpeta `professor/` contiene 15 archivos de varios agentes.
> Solo estos 3 son tuyos: `ModelManager`, `ModelPartsManager`, `ModelUploadZone`.
> NO toques: `QuizQuestionsEditor` (Agent 1), `FlashcardBulkImport` (Agent 3),
> `KeywordsManager`, `SubtopicsPanel`, `VideosManager`, `ProfessorNotesPanel`, etc.

## Grafo de dependencias (verificado en codigo real)

```
LADO ESTUDIANTE
───────────────
ThreeDView.tsx
  ├── motion/react                          (animaciones)
  ├── useContentTree()                      [read-only, compartido]
  ├── AxonPageHeader                        [read-only, compartido]
  ├── design-system                         [read-only, compartido]
  ├── models3dApi.getModels3D()
  └── ModelViewer3D.tsx
        ├── three + OrbitControls
        ├── clsx, lucide-react (Loader2, List, Layers)
        ├── models3dApi.getModel3DPins()
        ├── viewer3d/PinSystem.tsx
        │     ├── three
        │     ├── models3dApi.createModel3DPin()
        │     └── viewer3d/PinMarker3D.tsx   <- three puro (clase imperativa)
        ├── viewer3d/PinEditor.tsx
        │     ├── three (tipo OrbitControls)
        │     ├── sonner (toast)
        │     ├── clsx, lucide-react
        │     └── models3dApi.updateModel3DPin(), deleteModel3DPin()
        ├── viewer3d/StudentNotes3D.tsx
        │     ├── three
        │     ├── sonner (toast)
        │     ├── clsx, lucide-react
        │     └── models3dApi.getModel3DNotes(), createModel3DNote(), updateModel3DNote(), deleteModel3DNote()
        ├── viewer3d/LayerPanel.tsx
        │     ├── lucide-react, clsx
        │     └── viewer3d/ModelPartMesh (tipos: ModelPartLoader, ModelLayerConfig)
        └── viewer3d/ModelPartMesh.tsx
              ├── three + GLTFLoader
              └── exporta: ModelPartLoader (clase), getStoredParts(), getStoredLayers(), setStoredParts(), setStoredLayers()

LADO PROFESOR
─────────────
ProfessorCurriculumPage.tsx [NO ES TUYO — read-only]
  └── professor/ModelManager.tsx
        ├── motion/react, sonner (toast)
        ├── lucide-react
        ├── lib/model3d-api.ts -> getModels3D, createModel3D, updateModel3D, deleteModel3D, uploadAndCreateModel
        │     └── lib/api.ts -> apiCall() (auth encapsulado: ANON_KEY + getAccessToken)
        └── professor/ModelUploadZone.tsx
              ├── clsx, lucide-react
              └── lib/model3d-api.ts -> validateModelFile, formatFileSize

ModelManager.tsx -> puede abrir:
  └── professor/ModelPartsManager.tsx
        ├── clsx, sonner (toast), lucide-react
        └── viewer3d/ModelPartMesh -> getStoredParts, setStoredParts, getStoredLayers, setStoredLayers (localStorage)
```

## Paquetes externos del dominio 3D

| Paquete | Archivos que lo usan |
|---------|---------------------|
| `three` | ModelViewer3D, PinSystem, PinEditor, StudentNotes3D, ModelPartMesh, PinMarker3D |
| `three/examples/jsm/controls/OrbitControls` | ModelViewer3D, PinEditor (tipo) |
| `three/examples/jsm/loaders/GLTFLoader` | ModelPartMesh |
| `motion` (motion/react) | ThreeDView, ModelManager |
| `sonner` (toast) | PinEditor, StudentNotes3D, ModelManager, ModelPartsManager |
| `clsx` | ModelViewer3D, PinSystem, PinEditor, StudentNotes3D, LayerPanel, ModelPartsManager, ModelUploadZone |
| `lucide-react` | ThreeDView, ModelViewer3D, PinEditor, StudentNotes3D, LayerPanel, ModelManager, ModelPartsManager, ModelUploadZone |

## Verificacion de independencia (confirmada en codigo real):
```ts
// ThreeDView.tsx — imports reales:
import { useContentTree } from '@/app/context/ContentTreeContext';     // Solo tree
import { getModels3D } from '@/app/services/models3dApi';              // TUYO
import { ModelViewer3D } from '@/app/components/content/ModelViewer3D'; // TUYO
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader'; // Compartido (read-only)
import { colors, components, ... } from '@/app/design-system';         // Compartido (read-only)

// ModelViewer3D.tsx — imports reales:
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import clsx from 'clsx';
import { Loader2, List, Layers } from 'lucide-react';
import { getModel3DPins } from '@/app/services/models3dApi';
import type { Model3DPin } from '@/app/services/models3dApi';
import { PinSystem } from '@/app/components/viewer3d/PinSystem';
import type { PinMode } from '@/app/components/viewer3d/PinSystem';
import { PinEditor } from '@/app/components/viewer3d/PinEditor';
import { StudentNotes3D } from '@/app/components/viewer3d/StudentNotes3D';
import { LayerPanel } from '@/app/components/viewer3d/LayerPanel';
import { ModelPartLoader, getStoredParts, getStoredLayers } from '@/app/components/viewer3d/ModelPartMesh';
import type { ModelLayerConfig } from '@/app/components/viewer3d/ModelPartMesh';

// ModelManager.tsx — imports reales:
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { getModels3D, createModel3D, updateModel3D, deleteModel3D, uploadAndCreateModel, formatFileSize } from '@/app/lib/model3d-api';
import type { Model3D, UploadProgress } from '@/app/lib/model3d-api';
import { ModelUploadZone } from '@/app/components/professor/ModelUploadZone';

// NINGUN archivo del Agent 6 importa: AppContext, AuthContext, StudentDataContext, useStudentNav
// Auth se maneja encapsulado en lib/api.ts -> apiCall()
```

## Dependencias compartidas (read-only):
| Contexto/Archivo | Que lees | Dueno |
|------------------|----------|-------|
| `useContentTree()` | tree (para encontrar topics con modelos 3D) | Nucleo compartido |
| `@/app/design-system` | colores y estilos compartidos | Nucleo compartido |
| `@/app/components/shared/AxonPageHeader` | header compartido | Nucleo compartido |
| `ProfessorCurriculumPage.tsx` | Renderiza ModelManager (no lo modifiques) | Nucleo profesor |

## Que NO debes tocar NUNCA:
- `student-routes.ts` (assembler PROTEGIDO)
- `ContentTreeContext.tsx`, `design-system.ts`
- `ProfessorCurriculumPage.tsx` (solo consume ModelManager)
- `lib/api.ts`, `lib/supabase.ts` (infraestructura compartida)
- Ningun archivo de otro agente
- Otros archivos en `professor/` (QuizQuestionsEditor, FlashcardBulkImport, KeywordsManager, etc.)

## Violaciones de arquitectura conocidas (pendientes de fix):

| Violacion | Archivo | Descripcion |
|-----------|---------|-------------|
| Tipos inline | `models3dApi.ts` | `Model3D`, `Model3DPin`, etc. definidos inline en vez de `types/` |
| Headers manuales | `lib/model3d-api.ts` | Construye headers `Authorization` + `X-Access-Token` manualmente en vez de usar `apiCall()` |
| Archivo >500 lineas | `ThreeDView.tsx` | Excede limite de ARCHITECTURE-PRACTICES.md |
| `console.error` directo | `ModelManager.tsx` (x2), `models3dApi.ts` | Deberia usar `lib/logger.ts` (aun no existe) |
| 2 wrappers HTTP | `models3dApi.ts` usa `apiCall()`, `model3d-api.ts` usa XHR directo | Deberia consolidarse en 1 |

## Tu ventaja:
Junto con Agent 3, tienes la mayor libertad del proyecto. Tu dominio (3D) es completamente aislado.
Puedes refactorizar internamente, agregar nuevas vistas 3D, cambiar el renderer, etc. sin riesgo de conflicto con nadie.

## Como agregar una nueva ruta:
Abre `src/app/routes/threed-student-routes.ts` y agrega:
```ts
{
  path: '3d-editor',
  lazy: () => import('@/app/components/content/ThreeDEditor')
    .then(m => ({ Component: m.ThreeDEditor })),
},
```
Si necesitas un item en el Sidebar, pidelo a Agent 5.
