# Mastery Systems — Axon Frontend

Axon usa **tres sistemas de colores relacionados con mastery**, cada uno con un
propósito distinto. **No son intercambiables.** Este documento existe para que
cualquier dev (humano o agente) sepa cuál usar y cuándo.

> **Regla:** si estás por hardcodear un threshold contra `p_know`, `mastery`, o
> "cuán dominado está X", pará y preguntate cuál de estos 3 sistemas aplica.

---

## Sistema A · Rating Buttons (INPUT)

**Archivo:** `src/app/hooks/flashcard-types.ts` — `RATINGS` array
**Escala:** 1-5 (5 niveles)
**Qué representa:** cómo te sentís sobre UNA card en ESTE momento.

| Valor | Label | Color botón | Significado |
|---|---|---|---|
| 1 | No sé | rose-500 | Repetir pronto |
| 2 | Difícil | orange-500 | Necesito repasar |
| 3 | Regular | yellow-400 | Algo de duda |
| 4 | Fácil | lime-500 | Lo entendí bien |
| 5 | Perfecto | emerald-500 | Memorizado |

**Ciclo de vida:** efímero. El estudiante clickea → se traduce a FSRS grade
(1-4) vía `uiRatingToFsrsGrade` (`lib/grade-mapper.ts`) → alimenta al backend.

**NO es mastery.** Es feedback de recall momentáneo.

**Cuándo usar:** solo al renderizar los 5 botones de rating en una sesión activa.
El campo `color` de cada rating es el color del botón — NO usarlo como color de
mastery persistido.

**Punto de entrada:**

```ts
import { RATINGS } from '@/app/hooks/flashcard-types';

{RATINGS.map(r => (
  <button key={r.value} className={r.color}>
    {r.label}
  </button>
))}
```

---

## Sistema B · Card Mastery (OUTPUT absoluto)

**Archivo:** `src/app/components/content/flashcard/mastery-colors.ts`
**Escala:** 6 niveles (0-5) sobre `p_know` [0.0 - 1.0]
**Qué representa:** cuán dominada está UNA flashcard o UN topic individual,
en valor absoluto.

| Level | Color | Hex | Label | Threshold `p_know` |
|---|---|---|---|---|
| 0 | slate | `#94a3b8` | Nueva | < 0.20 |
| 1 | rose | `#f43f5e` | No sabe | ≥ 0.20 |
| 2 | orange | `#f97316` | Difícil | ≥ 0.40 |
| 3 | amber | `#f59e0b` | En progreso | ≥ 0.60 |
| 4 | teal | `#14b8a6` | Bien | ≥ 0.75 |
| 5 | emerald | `#10b981` | Dominada | ≥ 0.90 |

**Ciclo de vida:** persistido. Evoluciona con cada review (FSRS + BKT lo
actualiza en backend). Se muestra en grillas de cards, deck overviews, progress
rings individuales.

**Cuándo usar:**

- Color de una card en `FlashcardMiniCard` / deck grids.
- Color de una ring/badge de mastery por topic.
- Color de fondo del CTA "Estudiar" (varía según mastery promedio del deck).

**NO usar para:** keywords con priority (eso es Sistema C), rating inputs (Sistema A).

**Puntos de entrada:**

```ts
import {
  getMasteryColor,
  getMasteryColorFromPct,
} from '@/app/components/content/flashcard/mastery-colors';

// Por escala 0-5 (discreto)
const { hex, label, dot } = getMasteryColor(card.mastery);

// Por ratio 0.0-1.0 (continuo sobre p_know)
const { hex, label } = getMasteryColorFromPct(p_know);
```

**Nota sobre escalas:**

- `getMasteryColor(mastery)` espera `0-5` (entero o decimal, se clampea).
- `getMasteryColorFromPct(ratio)` espera `0.0-1.0` (p_know crudo).
- Conversión: `pct ≥ 0.90 → 5`, `≥ 0.75 → 4`, `≥ 0.60 → 3`, `≥ 0.40 → 2`,
  `≥ 0.20 → 1`, else `0`.

---

## Sistema C · Keyword Delta Mastery (OUTPUT relativo)

**Archivo:** `src/app/lib/mastery-helpers.ts`
**Escala:** 5 niveles sobre `delta = mastery / threshold`
**Qué representa:** cuán dominado está un **keyword** (concepto), **ajustado por
la importancia clínica** que el profesor le asignó.

| Nivel | Color (Tailwind) | Label | Threshold `delta` |
|---|---|---|---|
| gray | zinc-400 | Por descubrir | < 0.50 |
| red | red-500 | Emergente | ≥ 0.50 |
| yellow | amber-500 | En progreso | ≥ 0.85 |
| green | emerald-500 | Consolidado | ≥ 1.00 |
| blue | blue-500 | Maestría | ≥ 1.10 |

**Fórmula (spec v4.2 §6.2):**

```
clinicalPriority = (priority - 1) / 2       # mapea priority 1..3 a 0.0..1.0
threshold = 0.70 + clinicalPriority * 0.20  # 0.70 (low) a 0.90 (high)
delta = keyword_mastery / threshold
```

**Ejemplo — "cardiopatía isquémica" (priority 3):**

- `threshold = 0.90`
- Estudiante con `mastery = 0.80` → `delta = 0.89` → 🟡 yellow "En progreso"
- Estudiante con `mastery = 0.90` → `delta = 1.00` → 🟢 green "Consolidado"

**Mismo estudiante con `mastery = 0.80` en un keyword de priority 1 ("trivia"):**

- `threshold = 0.70`
- `delta = 1.14` → 🔵 blue "Maestría"

**Por qué es distinto de Sistema B:** un estudiante con `p_know = 0.80` uniforme
debería ver:

- **"Bien"** en Sistema B (card-level, absoluto)
- pero **"Maestría" vs "En progreso"** en Sistema C según el priority del keyword.

Esto es **intencional** — refleja que un keyword clínicamente crítico requiere
más mastery para considerarse dominado que uno accesorio.

**Cuándo usar:**

- Barras de progreso de keywords en `FlashcardDeckScreen` (keyword progress bar).
- Rows individuales en `AdaptiveKeywordPanel`.
- Cualquier UI que muestre "estado de dominio" de un keyword (no una card).

**NO usar para:** cards individuales (Sistema B), rating inputs (Sistema A),
totales agregados por topic sin priority (Sistema B o helper propio).

**Puntos de entrada:**

```ts
import {
  getKeywordDeltaColorSafe, // maneja null/-1 como 'gray'
  getDeltaColorClasses,     // maps level → Tailwind classes + hex
  getDeltaColorLabel,       // maps level → Spanish label
} from '@/app/lib/mastery-helpers';

const level = getKeywordDeltaColorSafe(keyword.mastery, keyword.priority);
const { bg, text, border, hex } = getDeltaColorClasses(level);
const label = getDeltaColorLabel(level);
```

---

## Matriz de decisión rápida

| Voy a mostrar... | Usar sistema | Helper |
|---|---|---|
| Botones de rating en sesión | A | `RATINGS` |
| Color de una card individual | B | `getMasteryColor` o `getMasteryColorFromPct` |
| Progress ring de un deck/topic | B | `getMasteryColorFromPct` (sobre mastery avg) |
| Color de un keyword (con priority) | C | `getKeywordDeltaColorSafe` |
| KPI agregado de dashboard ("X mastered total") | ver nota abajo | — |

### Nota sobre dashboards agregados

Los KPIs del Dashboard (`DashboardView.tsx`) y el sidebar del Student Panel
(`StudentDataPanel.tsx`) **no usan ninguno de los 3 sistemas** — son buckets
agregados que eligieron sus propios thresholds:

- `DashboardView.tsx:71-73`: `p_know >= 0.9` → mastered, `>= 0.5` → learning,
  `>= 0.3` → reviewing.
- `StudentDataPanel.tsx:82`: `p_know >= 0.8` → masteredTopic.

Esto es **legítimo pero no documentado** — los thresholds son decisiones de UX
específicas de cada widget, no derivan de Sistema B. Si en el futuro se decide
alinear con Sistema B, consensuar con el dueño del dashboard primero.

---

## Qué NO hacer

❌ **No hardcodear thresholds** contra `p_know` sin chequear si aplica uno de
los 3 sistemas:

```ts
// MAL
if (card.p_know >= 0.75) showGreen();

// BIEN
const { hex } = getMasteryColorFromPct(card.p_know);
```

❌ **No mezclar el `color` de RATINGS (botón) con color de mastery persistido.**
Son conceptos distintos aunque compartan paleta visual.

❌ **No usar Sistema B para keywords con priority conocida.** Usá Sistema C.

❌ **No inventar un cuarto sistema** sin consultar este doc. Si el caso de uso
no encaja en A/B/C, abrir discusión antes de hardcodear.

---

## Cambios históricos

- **2026-04-17** — primera versión, consolidando findings del audit issue #457.
  Sistemas preexistentes: B (`flashcard/mastery-colors.ts`, spec v4.2 informal),
  C (`lib/mastery-helpers.ts`, spec v4.2 §6.2).
