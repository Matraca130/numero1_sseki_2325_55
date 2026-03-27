# Agent Memory: DG-03 (gamification-engine)
Last updated: 2026-03-25

## Rol
Desarrollar y mantener la capa frontend del sistema de gamificacion: XP, badges, niveles, rachas, combos, metas diarias, celebraciones y el contexto global de gamificacion.

## Lecciones aprendidas
| Fecha | Lección | Prevención |
|-------|---------|------------|
| 2026-03-25 | (inicial) Archivo creado | — |

## Efectividad de lecciones
| Lección | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
| (se llena cuando una lección se activa en una sesión real) | — | — | — |

> Confianza: ALTA (previno 3+ errores), MEDIA (previno 1-2), BAJA (no previno o recurrió), NUEVA (sin datos)

## Decisiones técnicas (NO re-litigar)
| Fecha | Decisión | Por qué | Alternativas descartadas |
|-------|----------|---------|--------------------------|

## Patrones que funcionan
- Las actualizaciones de XP deben ser **optimistas**: actualizar la UI inmediatamente via `GamificationContext.addXP()` y revertir si la API falla.
- Todas las constantes de gamificacion (niveles, umbrales, cap diario de XP) viven en `lib/xp-constants.ts` — nunca hardcodear valores en componentes.
- Los componentes consumen el estado global via `useGamification()` — no acceder directamente al contexto con `useContext`.
- `GamificationContext` (~238L) es la fuente unica de verdad: `addXP()`, `checkBadge()`, `refreshFromServer()` son las unicas entradas al estado.
- Framer Motion solo para animaciones complejas (`LevelUpCelebration`, `XPPopup`); el resto usa clases `transition` y `animate-` de Tailwind.
- `useSessionXP` (~265L) trackea XP localmente y sincroniza con el backend periodicamente — no llamar a la API de XP directamente desde componentes.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Hardcodear valores de XP o niveles en componentes | Inconsistencia cuando cambian los umbrales | Importar desde `lib/xp-constants.ts` |
| Framer Motion para animaciones simples | Overhead innecesario en el bundle | Tailwind `transition` / `animate-` |
| Modificar `services/gamificationApi.ts` o `types/gamification.ts` | Ownership de DG-04 | Solo lectura; coordinar con DG-04 si el contrato debe cambiar |
| Modificar `components/dashboard/` | Ownership de DG-01 | Solo lectura; escalar si hay conflicto |
| Actualizar XP sin mecanismo de reversion | UI inconsistente ante errores de red | Siempre implementar rollback en `GamificationContext` |
| `any` o `// @ts-ignore` | Rompe TypeScript estricto | Tipar correctamente |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
