# Agent Memory: AO-01 (admin-frontend)
Last updated: 2026-03-25

## Rol
Agente frontend de administracion institucional: mantiene las paginas del rol admin (dashboard, contenido, miembros, reportes, scopes, settings, AI health, messaging) y el archivo admin-routes.ts.

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
- Usar `apiCall()` de `lib/api.ts` para todas las llamadas HTTP — nunca fetch directo
- Leer CLAUDE.md + `memory/feedback_agent_isolation.md` + `agent-memory/admin.md` antes de tocar código
- Revisar AGENT-METRICS.md (fila propia) para no repetir errores de sesiones anteriores
- Escalar al Arquitecto (XX-01) ante cualquier necesidad de modificar archivos fuera de la zona de ownership
- Páginas funcionales (Settings 271L, AI Health 345L, Messaging 521L) requieren mayor cuidado: no romper lógica operativa existente
- Páginas placeholder (Dashboard, Content, Members, Reports, Scopes): cablearlas con rutas reales siguiendo el patrón de admin-routes.ts

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Usar `any` en TypeScript | Rompe la seguridad de tipos del proyecto | Tipar correctamente o usar `unknown` con narrowing |
| `console.log` en producción | Contamina logs, puede exponer datos sensibles | Eliminar antes de commit |
| Modificar archivos fuera de `**/pages/admin/*` o `admin-routes.*` | Viola aislamiento de agentes | Escalar al Arquitecto (XX-01) |
| Fetch directo sin `apiCall()` | Inconsistencia en manejo de auth headers y errores | Siempre usar `apiCall()` de `lib/api.ts` |
| Editar mega-componentes sin revisar líneas totales | Riesgo de introducir regresiones en componentes grandes | Leer el archivo completo antes de editar |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
