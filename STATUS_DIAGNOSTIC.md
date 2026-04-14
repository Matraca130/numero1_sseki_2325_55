# STATUS_DIAGNOSTIC — `feat/algorithmic-art`

**Estado**: `verified-useful`
**Fecha diagnóstico**: 2026-04-14
**Iteración /loop**: 1
**Tip commit**: `0d1f2ae9` (2026-04-07)

## ¿Qué hace esta rama?

Integra p5.js nativo como motor de "arte algorítmico" médico educativo:
- **Wrapper base**: `P5Canvas.tsx` (instance-mode, lazy import, IntersectionObserver para pausar off-screen, ResizeObserver, screenshot, dark-mode, reduced-motion, aria-label).
- **Hooks**: `useP5Instance`, `useSketchParams`, `useSeedNavigation` (URL sync `?seed=N`), `useSketchTracking` (analytics a Supabase), `useSketchUrlState`.
- **10 engines portados a TypeScript** desde HTML p5.js: `dolor` (ALICIA + 5 Argente), `cardiovascular`, `nervioso`, `renal-endocrino`, `semiologia-general`, `digestivo`, `respiratorio`, `semiologia-regional`, `hematologia`, `microbiologia`. Todos con `paramSchema`, `presets` clínicos, dark-mode y SeededRandom determinista.
- **UI**: `SketchBlock` (inline en SummaryViewer con Suspense), `SketchControls`, `SketchSidebar` (320px), `SketchFullscreen` (página `/student/sketch/:engine`), `SketchGallery` (grid 4×3), `SketchAnalytics` (dashboard profesor con recharts), `SketchBlockEditor` (TipTap integration).
- **Routing**: `algorithmic-student-routes.ts` (`/student/sketch/:engine` y `/:engine/:mode`), spread en `student-routes.ts`.
- **Persistencia**: 3 migraciones SQL (`sketch_config` JSONB en `summaries`, tabla `sketch_interactions` con RLS, documentación del tipo de bloque `sketch`).
- **Build**: `vendor-p5` manualChunk en `vite.config.ts`; `p5 ^1.11.3` + `@types/p5` añadidos.
- **Accesibilidad**: aria-labels en todos los controles, `role="img"` en canvas, `prefers-reduced-motion` reduce fps a 15 o muestra frame estático.

## ¿Es útil?

**Sí**. Feature grande, bien scopeada, con valor educativo claro (simulaciones clínicas interactivas deterministas por seed).

## ¿Hay regresiones?

**No detectadas**. Cambios aditivos: nuevo tipo de bloque, nueva ruta, nuevas dependencias, nuevas tablas. `ViewerBlock` añade `case 'algorithmic_sketch'` sin tocar casos existentes. El vendor-p5 chunk aísla el peso bundle.

## ¿Está documentada?

**Autodocumentada por commits** (muy detallados). No hay README dedicado en `engines/`, pero el contrato `EngineModule` y los schemas de params son autoexplicativos. Recomendación: añadir `src/features/algorithmic-art/README.md` resumiendo el contrato `EngineModule` + cómo añadir un nuevo engine.

## Recomendación

**Mergear** cuando las migraciones SQL estén aplicadas en staging. Alto valor, sin blockers detectados.

---
*Generado por `/loop verifique las ramas...` — iteración 1.*
