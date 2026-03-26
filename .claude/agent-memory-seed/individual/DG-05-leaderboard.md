# Agent Memory: DG-05 (leaderboard)
Last updated: 2026-03-25

## Rol
Desarrollar y mantener la interfaz del leaderboard: pagina completa con podio, tabla paginada y filtros de periodo, y tarjeta resumen embebible en el dashboard del estudiante.

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
- Los datos se obtienen exclusivamente via `gamificationApi.getLeaderboard()` — nunca llamar a `fetch` directamente.
- El podio (top 3) es visualmente diferenciado: 1ro al centro mas alto, 2do a la izquierda, 3ro a la derecha, con avatar, nombre y XP.
- `LeaderboardPage` maneja dos periodos (`weekly`, `daily`) via tabs o selector — el periodo activo se controla como estado local del componente.
- El scope por institucion es transparente para el agente: el endpoint ya filtra por `institutionId` del usuario autenticado.
- Manejar explicitamente los tres estados: carga, error y lista vacia, en ambos componentes (`LeaderboardPage` y `LeaderboardCard`).
- `LeaderboardCard` es un widget compacto: mostrar posicion actual, XP del periodo y top 3 — no replicar la funcionalidad completa de `LeaderboardPage`.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Llamadas directas a `fetch` para el leaderboard | Bypasea el cliente API tipado | Usar `gamificationApi.getLeaderboard()` siempre |
| Modificar `services/gamificationApi.ts` o `types/gamification.ts` | Ownership de DG-04 | Solo lectura; coordinar con DG-04 si se necesita un nuevo campo en `LeaderboardEntry` |
| Modificar `context/GamificationContext.tsx` o `hooks/useGamification.ts` | Ownership de DG-03 | Solo lectura; escalar si hay conflicto |
| Modificar `components/dashboard/` | Ownership de DG-01 | Solo lectura; escalar si hay conflicto |
| Podio sin diferenciacion visual | Mala UX; el usuario no distingue los top 3 | Podio con alturas y estilos diferenciados por posicion |
| No manejar estado vacio o error | UI rota cuando el leaderboard esta vacio o la API falla | Siempre incluir fallback de carga, error y lista vacia |
| `any` o `// @ts-ignore` | Rompe TypeScript estricto | Usar `LeaderboardEntry` de `types/gamification.ts` |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
