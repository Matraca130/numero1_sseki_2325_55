# Deuda Tecnica: Sistemas de Mastery — Auditoria Final

**Fecha de auditoria:** 2026-04-04
**PR revisado:** #350 (fix: deduplicate MasteryLevel -> MasteryStage) — **CERRADO como stale**
**Auditor:** Code Review automatizado (3 agentes en paralelo)

---

## Resumen ejecutivo

Existieron 3 sistemas de "mastery" en el codebase. Solo 1 se usa realmente.
Los otros 2 fueron eliminados en PRs #339 y #342. PR #350 intentaba modificar
archivos que ya no existen en main. Fue cerrado.

**Estado actual:** Solo queda `DeltaColorLevel` (mastery-helpers.ts) como sistema activo.

---

## Sistema activo: DeltaColorLevel (mastery-helpers.ts)

**Definicion:** `src/app/lib/mastery-helpers.ts:72`
**Tipo:** `'gray' | 'red' | 'yellow' | 'green' | 'blue'`

| Nivel  | Label          | Condicion       |
|--------|----------------|-----------------|
| gray   | Por descubrir  | delta < 0.50    |
| red    | Emergente      | delta >= 0.50   |
| yellow | En progreso    | delta >= 0.85   |
| green  | Consolidado    | delta >= 1.00   |
| blue   | Maestria       | delta >= 1.10   |

**Consumidores verificados (18 archivos directos):**
- `src/app/hooks/queries/useKeywordMasteryQuery.ts` — query hook con delta map
- `src/app/components/shared/MasteryIndicator.tsx` — indicador visual
- `src/app/components/student/ConnectionsMap.tsx` — mapa de conexiones
- `src/app/components/student/KeywordHighlighterInline.tsx` — highlighting
- `src/app/components/student/KeywordBadges.tsx` — badges de keywords
- `src/app/components/student/ReaderKeywordsTab.tsx` — tab de keywords
- `src/app/components/student/KeywordPopup.tsx` — popup de keyword
- `src/app/components/student/KeywordMasterySection.tsx` — seccion mastery
- `src/app/components/student/SubtopicResultsSection.tsx` — resultados subtopic
- `src/app/components/student/InlineKeywordPopover.tsx` — popover inline
- `src/app/components/dashboard/masteryOverviewTypes.ts` — tipos de dashboard
- `src/app/components/dashboard/useMasteryOverviewData.ts` — datos de dashboard
- `src/app/components/content/flashcard/adaptive/AdaptiveKeywordPanel.tsx`
- `src/app/components/content/flashcard/adaptive/AdaptivePartialSummary.tsx`
- `src/app/components/content/flashcard/adaptive/AdaptiveCompletedScreen.tsx`
- `src/app/design-system/index.ts` — re-exportado (pero 0 consumidores usan el barrel)
- Tests: `delta-color-scale.test.ts`, `mastery-helpers.test.ts`, `e2e-fsrs-study-intelligence.test.ts`

**Exports por frecuencia de uso:**
| Export | Consumidores directos |
|--------|----------------------|
| `getKeywordDeltaColorSafe` | 11 archivos |
| `getDeltaColorClasses` | 11 archivos |
| `getDeltaColorLabel` | 7 archivos |
| `type DeltaColorLevel` | 8 archivos |
| `getDominationThreshold` | 3 archivos |
| `getKeywordMastery` | 2 archivos |
| `type BktState` | 3 archivos |
| `getDeltaColor` | 1 archivo |
| `getKeywordDeltaColor` | 0 (solo uso interno via `getKeywordDeltaColorSafe`) |

---

## Sistemas eliminados (RESUELTO)

### MasteryStage / MasteryLevel / masteryConfig (keywords.ts)
- **Estado:** ELIMINADO en PR #342 (commit `735786c`)
- Tenia 0 consumidores antes de ser eliminado

### legacy-stubs.ts (re-export de MasteryLevel + 17 exports mas)
- **Estado:** ELIMINADO en PR #339 (commit `b83f4b0`)
- Tenia 0 importadores antes de ser eliminado

### useKeywordMastery.ts (hook con masteryConfig propio)
- **Estado:** ELIMINADO en esta limpieza
- Tenia 0 importadores — reemplazado por `useKeywordMasteryQuery.ts`

### keyword-helpers.ts (stubs de getKeywordsNeedingCards, getKeywordStats)
- **Estado:** ELIMINADO en esta limpieza
- Ambas funciones eran stubs vacios con 0 consumidores

---

## Deuda tecnica residual (baja prioridad)

1. **Barrel re-exports innecesarios:** `src/app/design-system/index.ts` lineas 109-118
   re-exportan todo mastery-helpers, pero 0 consumidores usan la ruta del barrel
   (`@/app/design-system`). Todos importan directo de `@/app/lib/mastery-helpers`.

2. **`getKeywordDeltaColor` exportado sin consumidores directos:** Solo se usa
   internamente via `getKeywordDeltaColorSafe`. Podria ser unexported.

3. **Sistema separado de flashcards:** `src/app/components/content/flashcard/mastery-colors.ts`
   tiene su propio sistema de 6 niveles (ratings 0-5). Es intencionalmente independiente
   de DeltaColorLevel — NO es deuda tecnica, es diseno deliberado.

---

## Dificultad para llegar a esta conclusion

**Nivel: MEDIO-ALTO**

Razones:
1. **Nombres enganiosos:** `MasteryLevel`, `MasteryStage`, `DeltaColorLevel` suenan similares.
   Sin grep exhaustivo, es facil asumir que son el mismo sistema.
2. **Archivos ya eliminados de main:** `keywords.ts` y `legacy-stubs.ts` no existen en el
   branch actual pero PR #350 los modificaba — el PR estaba basado en un commit viejo.
3. **Doble `masteryConfig`:** Existian dos objetos con el mismo nombre en archivos distintos.
4. **`legacy-stubs.ts` sugeria uso legacy activo:** El nombre implica consumidores legacy,
   pero en realidad nadie lo importaba.
5. **3 sistemas con overlap conceptual:** Entender que `DeltaColorLevel` es el unico
   activo requirio rastrear imports de los 3 tipos por separado con grep exhaustivo.
6. **Se necesitaron 3 agentes en paralelo** para verificar: uno por cada sistema de mastery.
