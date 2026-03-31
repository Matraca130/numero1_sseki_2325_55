# Agent Memory: DG-04 (gamification-backend)
Last updated: 2026-03-25

## Rol
Desarrollar y mantener la capa de API y servicios del sistema de gamificacion: cliente API del frontend, tipos compartidos, rutas del backend y servicio de gamificacion del servidor.

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
- Toda la logica de negocio va en `gamification-service.ts`; las rutas (`routes/gamification*.ts`) solo validan inputs y delegan.
- `types/gamification.ts` es el contrato entre frontend y backend — cualquier cambio requiere coordinacion explicita con DG-03 antes de implementar.
- Cada endpoint en `gamificationApi.ts` tiene tipado explicito de request y response (sin `any`).
- `try/catch` con manejo explicito de errores en cada llamada API del cliente.
- Las constantes de XP del backend (`XP_TABLE`, `LEVEL_THRESHOLDS`) deben mantenerse sincronizadas con `lib/xp-constants.ts` del frontend (DG-03).
- Los endpoints validan inputs antes de procesar — usar validacion en la capa de rutas, nunca en el servicio.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Logica de negocio en las rutas Express/Hono | Dificulta testing y reutilizacion | Mover toda la logica a `gamification-service.ts` |
| Cambiar `types/gamification.ts` sin avisar a DG-03 | Rompe el contrato frontend-backend | Coordinar el cambio con DG-03 antes de implementar |
| `XP_TABLE` o `LEVEL_THRESHOLDS` desincronizados entre frontend y backend | Inconsistencias visuales en XP y niveles | Revisar `lib/xp-constants.ts` antes de modificar constantes backend |
| Modificar `components/gamification/`, `context/GamificationContext.tsx`, `hooks/useSessionXP.ts`, `hooks/useGamification.ts` | Ownership de DG-03 | Solo lectura; escalar si hay conflicto |
| Endpoints sin validacion de inputs | Vulnerabilidades y errores dificiles de depurar | Validar siempre en la capa de rutas |
| `any` o `// @ts-ignore` | Rompe TypeScript estricto | Tipar correctamente con las interfaces de `types/gamification.ts` |

## [2026-03-27] Especialización: Conocimiento de código

| Archivo | Exports clave | Patrón | Gotcha |
|---------|--------------|--------|--------|
| `xp-engine.ts` | XP_TABLE, calculateLevel, grantXP, getDailyCap | Pure fns + DB writes | quiz_correct=15 (no 10 como dice la def); daily_goal_minutes not daily_goal |
| `streak-engine.ts` | checkStreak, repairStreak, getStreakStatus | Streak logic + repair tokens | Siempre getAdminClient() para writes; .maybeSingle() never .single() |
| `xp-hooks.ts` | xpHookForSessionComplete, xpHookForReview | afterWrite hooks fire-and-forget | Llamados desde crud-factory.ts; no awaited |
| `gamification-dispatcher.ts` | dispatchGamificationEvent | Advisory lock (FNV-1a hash) | Previene concurrent double-badge-award; tryAwardBadge con 23505 guard |
| `routes/gamification/*.ts` | profile, goals, badges, streak, helpers | Hono routes | gamification-service.ts NO existe — arquitectura real es engine+hooks+dispatcher |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
