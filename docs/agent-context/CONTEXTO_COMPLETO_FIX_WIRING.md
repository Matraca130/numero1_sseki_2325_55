# CONTEXTO COMPLETO: Fix Wiring — Conectar Sistema de Bloques a la App

> **INSTRUCCION:** Lee este archivo COMPLETO antes de tocar cualquier codigo.
> **SESION:** Cowork Resumenes — diagnostico y plan de fix para el sistema block-based de Axon.

---

## 1. QUE ES AXON

Plataforma educativa medica. Stack: React 18 + Vite 6 + Tailwind v4 (frontend), Hono + Deno en Supabase Edge Functions (backend). Auth dual: Authorization Bearer ANON_KEY + X-Access-Token USER_JWT.

## 2. QUE ES EL SISTEMA DE RESUMENES

Los resumenes son contenido educativo que los profesores crean y los estudiantes leen. Se esta migrando de un sistema monolitico (un solo campo HTML content_markdown) a un sistema block-based (10 tipos de bloques educativos).

### 10 tipos de bloques educativos (nuevos)
prose, key_point, stages, comparison, list_detail, grid, two_column, callout, image_reference, section_divider

### 7 tipos de bloques legacy (ya existian)
text, heading, image, video, pdf, callout (legacy), divider, keyword-ref

## 3. QUE SE HIZO (Fase 2) — Todo esto YA EXISTE en la branch

La Fase 2 creo todos los componentes de rendering. Todo compilo y paso build. Pero NO conecto la tuberia de datos.

### Renderers creados (10 archivos) — src/app/components/student/blocks/
- CalloutBlock.tsx (2959 bytes) — 5 variantes: tip/warning/clinical/mnemonic/exam
- ComparisonBlock.tsx (2073 bytes) — tabla con headers, rows, highlight_column
- GridBlock.tsx (1515 bytes) — grid de items con iconos
- IconByName.tsx (741 bytes) — helper de iconos por nombre
- ImageReferenceBlock.tsx (1454 bytes) — imagen con caption y posicion
- index.ts (679 bytes) — barrel exports
- KeyPointBlock.tsx (1111 bytes) — fondo oscuro teal, badge CRITICO
- ListDetailBlock.tsx (2443 bytes) — lista con iconos, labels, detail, severity
- ProseBlock.tsx (918 bytes) — titulo Georgia + contenido
- SectionDividerBlock.tsx (644 bytes) — divisor con label
- StagesBlock.tsx (2519 bytes) — etapas con conector gradient, severity colors
- TwoColumnBlock.tsx (1466 bytes) — dos columnas con items

### Dispatcher — src/app/components/student/ViewerBlock.tsx
Switch completo que despacha los 10 tipos edu + 7 legacy. Importa EduCalloutBlock (alias del nuevo CalloutBlock) para evitar colision con el case legacy callout.

### Vista nueva — src/app/components/student/SummaryViewer.tsx (8462 bytes, Mar 22)
Vista block-based del estudiante. NO esta importada en ningun archivo de la app. Es codigo muerto.

### Query de bloques — src/app/hooks/queries/useSummaryBlocksQuery.ts (1623 bytes, Mar 22)
React Query hook que trae summary_blocks del backend. Nadie lo llama.

## 4. QUE ESTA ROTO — El Diagnostico

### Problema central: la tuberia nunca se conecto

LO QUE DEBERIA PASAR:
Ruta estudiante -> SummaryView -> useSummaryBlocksQuery -> SummaryViewer -> ViewerBlock -> renderers

LO QUE PASA HOY:
Ruta estudiante -> SummaryView -> useSummaryViewQueries -> HTML monolitico (content_markdown)
NUNCA toca los renderers nuevos

### 3 vistas compitiendo
- SummaryView.tsx (content/, 15KB) — Vista ACTIVA profesor+estudiante, renderiza HTML monolitico
- SummaryViewer.tsx (student/, 8KB) — Vista nueva block-based, CODIGO MUERTO no importada
- SummaryDetailView.tsx (professor/, 40KB) — Editor del profesor, funciona aparte, NO TOCAR

### 7 hooks fragmentados
- useSummaryViewer.ts (hooks/) — UI state: zoom, fullscreen, highlight, scroll. Funcional.
- useSummaryPersistence.ts (hooks/) — Auto-save a Supabase. Funcional.
- useSummaryTimer.ts (hooks/) — Timer de sesion de estudio. Funcional.
- useSummaryBlocksQuery.ts (hooks/queries/) — Query de bloques nuevos. NADIE LO USA.
- useSummaryReaderMutations.ts (hooks/queries/) — Mutaciones del reader. Funcional.
- useSummaryReaderQueries.ts (hooks/queries/) — Queries del reader. Funcional.
- useSummaryViewQueries.ts (hooks/queries/) — Queries de la vista vieja. Usado por SummaryView.

### Quien importa SummaryViewer (la nueva)
NADIE — Este es el problema

## 5. PROTOTIPO — Referencia Visual

Design tokens clave:
LIGHT: darkTeal=#1B3B36 (text-teal-900), tealAccent=#2a8c7a (text-teal-600), pageBg=#F0F2F5 (bg-gray-100)
DARK: darkTeal=#3cc9a8 (text-[#3cc9a8]), pageBg=#111215 (dark:bg-gray-950)
Callout variants: tip (green), warning (amber), clinical (blue), mnemonic (purple), exam (red)
Severity: mild (#10b981), moderate (#f59e0b), critical (#ef4444)
Typography: Georgia serif for headings, Inter/system for body

## 6. BACKEND — Ya Mergeado a Main

Backend Fase 4 ya en main (PR #170). Endpoints de summary-blocks funcionan.

## 7. INSTRUCCIONES DE FIX

### Branch
git fetch origin && git checkout feat/block-based-summaries && git pull

### Reglas ESTRICTAS
- NO crear archivos nuevos — solo modificar existentes
- NO romper la vista del profesor (SummaryDetailView.tsx — NO TOCAR)
- NO eliminar SummaryView.tsx — tiene features activas
- NO modificar los renderers en blocks/*.tsx — ya estan bien
- NO cambiar archivos de rutas/router
- Build MUST pass: npm run build
- Never push to main — commit a feat/block-based-summaries

### TASK 1: Investigar estado actual (READ ONLY)

Lee estos archivos en orden:
1. src/app/components/content/SummaryView.tsx
2. src/app/components/student/SummaryViewer.tsx
3. src/app/components/student/ViewerBlock.tsx
4. src/app/hooks/queries/useSummaryBlocksQuery.ts
5. src/app/hooks/queries/useSummaryViewQueries.ts
6. src/app/hooks/useSummaryViewer.ts
7. src/app/hooks/useSummaryPersistence.ts
8. src/app/components/student/blocks/index.ts

Preguntas clave:
- SummaryViewer.tsx llama useSummaryBlocksQuery internamente o recibe bloques por props?
- SummaryView.tsx tiene el summaryId disponible?
- Los tipos de useSummaryBlocksQuery matchean con ViewerBlock?

### TASK 2: Estrategia de integracion

Opcion A (recomendada): Integrar DENTRO de SummaryView.tsx
1. Despues de que el summary cargue, llamar useSummaryBlocksQuery(summaryId)
2. Si hay bloques -> renderizar SummaryViewer
3. Si NO hay bloques -> mantener HTML monolitico (fallback)
4. Layout, navegacion, tabs se mantienen intactos

### TASK 3: Implementar

En SummaryView.tsx:
1. Importar SummaryViewer y useSummaryBlocksQuery
2. Agregar query de bloques
3. Render condicional: hasEduBlocks ? SummaryViewer : HTML monolitico

### TASK 4: Verificar cadena completa

SummaryView.tsx (layout, nav, tabs)
  useSummaryBlocksQuery(summaryId) -> GET /summary-blocks
  SI hay bloques -> SummaryViewer -> blocks.map -> ViewerBlock -> switch(block_type)
    prose->ProseBlock, key_point->KeyPointBlock, stages->StagesBlock,
    comparison->ComparisonBlock, list_detail->ListDetailBlock, grid->GridBlock,
    two_column->TwoColumnBlock, callout(edu)->EduCalloutBlock,
    image_reference->ImageReferenceBlock, section_divider->SectionDividerBlock
  SI NO hay bloques -> HTML monolitico (fallback actual)

### TASK 5: Build + Commit

npm run build — si pasa, commit y push a feat/block-based-summaries.

### Archivos que PUEDES modificar
- src/app/components/content/SummaryView.tsx — PRINCIPAL
- src/app/components/student/SummaryViewer.tsx
- src/app/components/student/ViewerBlock.tsx
- src/app/hooks/queries/useSummaryBlocksQuery.ts

### Archivos que NO debes modificar
- src/app/components/roles/pages/professor/SummaryDetailView.tsx
- src/app/components/student/blocks/*.tsx (renderers)
- Archivos de rutas/router
