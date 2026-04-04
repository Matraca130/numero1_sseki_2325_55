# Deuda Tecnica: Sistemas de Mastery Duplicados

**Fecha de auditoria:** 2026-04-04
**PR revisado:** #350 (fix: deduplicate MasteryLevel -> MasteryStage)
**Auditor:** Code Review automatizado

---

## Resumen ejecutivo

Existen 3 sistemas de "mastery" en el codebase. Solo 1 se usa realmente.
Los otros 2 son codigo muerto que el PR #350 intenta unificar entre si,
pero no resuelve el problema raiz: ninguno de los dos tiene consumidores.

---

## Los 3 sistemas encontrados

### 1. DeltaColorLevel (mastery-helpers.ts) — ACTIVO, COMPLETO

**Definicion:** `src/app/lib/mastery-helpers.ts:72`
**Tipo:** `'gray' | 'red' | 'yellow' | 'green' | 'blue'`

| Nivel  | Label          | Condicion       |
|--------|----------------|-----------------|
| gray   | Por descubrir  | delta < 0.50    |
| red    | Emergente      | delta >= 0.50   |
| yellow | En progreso    | delta >= 0.85   |
| green  | Consolidado    | delta >= 1.00   |
| blue   | Maestria       | delta >= 1.10   |

**Consumidores verificados (15+ archivos):**
- `src/app/hooks/useKeywordMastery.ts` — calculo de mastery por keyword
- `src/app/hooks/queries/useKeywordMasteryQuery.ts` — query hook con delta map
- `src/app/components/shared/MasteryIndicator.tsx` — indicador visual
- `src/app/components/student/ConnectionsMap.tsx` — mapa de conexiones
- `src/app/components/student/KeywordHighlighterInline.tsx` — highlighting
- `src/app/components/student/ReaderKeywordsTab.tsx` — tab de keywords
- `src/app/components/student/KeywordBadges.tsx` — badges de keywords
- `src/app/components/dashboard/masteryOverviewTypes.ts` — tipos de dashboard
- `src/app/design-system/index.ts` — re-exportado como parte del design system
- Tests: `delta-color-scale.test.ts`, `mastery-helpers.test.ts`, `e2e-fsrs-study-intelligence.test.ts`

**Tiene:** logica de calculo (delta = mastery/threshold), clases CSS, labels, hex colors, tests.

### 2. MasteryStage (keywords.ts) — CODIGO MUERTO

**Definicion:** `src/app/types/keywords.ts` (linea depende del branch)
**Tipo:** `'none' | 'seen' | 'learning' | 'familiar' | 'mastered'`

**Consumidores verificados: CERO**
- Grep por `MasteryStage` en `src/**/*.{ts,tsx}` = 0 resultados (fuera de su propia definicion)
- Grep por `from.*types/keywords` = 0 importaciones reales (solo un comentario en keyword-helpers.ts)
- Nadie importa este tipo ni lo usa en ningun componente

**No tiene:** logica de calculo, ni funciones que determinen en que stage esta un estudiante.

### 3. MasteryLevel (keywords.ts / legacy-stubs.ts) — CODIGO MUERTO

**Definicion original:** `'red' | 'yellow' | 'green'` (3 colores)
**Definicion post-PR #350:** alias de `MasteryStage`

**Consumidores verificados: CERO**
- Grep por `MasteryLevel` en `src/**/*.{ts,tsx}` = 0 resultados (fuera de definiciones)
- Grep por `from.*legacy-stubs` = 0 importaciones
- Nadie importa `MasteryLevel` de ningun archivo

---

## Hallazgo sobre masteryConfig

Existen 2 objetos llamados `masteryConfig`:

| Ubicacion | Claves | Consumidores |
|-----------|--------|-------------|
| `src/app/types/keywords.ts` | `none, seen, learning, familiar, mastered` (post-PR) | **CERO** — nadie importa `masteryConfig` de keywords.ts |
| `src/app/hooks/useKeywordMastery.ts:47` | `gray, red, yellow, green, blue` (DeltaColorLevel) | Solo uso interno del hook |

El `masteryConfig` de `keywords.ts` es codigo muerto. El de `useKeywordMastery.ts`
se construye dinamicamente a partir de `getDeltaColorClasses()` y `getDeltaColorLabel()`.

---

## Veredicto sobre PR #350

| Aspecto | Evaluacion |
|---------|-----------|
| Rompe algo? | **No** — unifica dos tipos que nadie importa |
| Arregla algo real? | **No** — ambos tipos ya eran codigo muerto antes del PR |
| Es correcto tecnicamente? | **Si** — el alias y re-export son validos |
| Resuelve la deuda tecnica? | **Parcialmente** — unifica los muertos entre si, pero no los elimina |

### Lo que el PR deberia hacer en su lugar (o como follow-up):

1. **Eliminar `MasteryLevel` y `MasteryStage` por completo** — tienen 0 consumidores
2. **Eliminar `masteryConfig` de `keywords.ts`** — tiene 0 consumidores
3. **Eliminar o marcar `legacy-stubs.ts`** — tiene 0 importadores
4. **Renombrar `masteryConfig` en `useKeywordMastery.ts`** a `deltaColorConfig` para evitar confusion de nombres

---

## Dificultad para llegar a esta conclusion

**Nivel: MEDIO-ALTO**

Razones:
1. **Nombres enganiosos:** `MasteryLevel`, `MasteryStage`, `DeltaColorLevel` suenan similares.
   Sin grep exhaustivo, es facil asumir que son el mismo sistema.
2. **Archivo `keywords.ts` no se puede leer en el branch del PR** — el archivo no existe
   en el branch base actual; tuve que inferir su contenido del diff del PR.
3. **Doble `masteryConfig`:** Existen dos objetos con el mismo nombre en archivos distintos.
   Una busqueda superficial podria confundir cual es el activo.
4. **`legacy-stubs.ts` sugiere uso legacy activo:** El nombre implica que hay consumidores
   legacy que necesitan el stub, pero en realidad nadie lo importa.
5. **El PR parece util a primera vista:** Sin verificar consumidores, la deduplicacion
   parece una mejora real. Solo el grep exhaustivo revela que son tipos muertos.
6. **3 sistemas con overlap conceptual:** Entender que `DeltaColorLevel` es el unico
   activo requiere rastrear imports de los 3 tipos por separado.

---

## Archivos involucrados (referencia rapida)

```
src/app/lib/mastery-helpers.ts          — Sistema activo (DeltaColorLevel)
src/app/types/keywords.ts               — Tipos muertos (MasteryStage, MasteryLevel, masteryConfig)
src/app/types/legacy-stubs.ts           — Re-export muerto de MasteryLevel
src/app/hooks/useKeywordMastery.ts      — Hook activo, usa DeltaColorLevel
src/app/utils/keyword-helpers.ts        — Helpers de keywords, no usa mastery types
```
