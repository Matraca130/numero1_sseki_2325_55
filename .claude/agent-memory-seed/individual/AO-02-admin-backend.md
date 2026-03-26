# Agent Memory: AO-02 (admin-backend)
Last updated: 2026-03-25

## Rol
Agente backend de administracion institucional: mantiene las rutas API de admin, el servicio pa-admin.ts y la lógica de scopes, reglas de acceso, gestión de estudiantes y búsqueda administrativa.

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
- Validar permisos de rol admin en cada endpoint antes de ejecutar lógica de negocio
- Centralizar llamadas a la API de plataforma en pa-admin.ts (223L) — no duplicar lógica en rutas
- Escalar al Arquitecto (XX-01) ante cualquier necesidad de modificar archivos fuera de la zona de ownership

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Usar `any` en TypeScript | Rompe la seguridad de tipos del proyecto | Tipar correctamente o usar `unknown` con narrowing |
| `console.log` en producción | Contamina logs, puede exponer datos sensibles | Eliminar antes de commit |
| Omitir validación de rol admin en endpoints | Expone operaciones administrativas a usuarios no autorizados | Siempre aplicar middleware de auth con validación de rol |
| Modificar archivos fuera de `**/routes/admin*` o `pa-admin.*` | Viola aislamiento de agentes | Escalar al Arquitecto (XX-01) |
| Duplicar lógica de plataforma fuera de pa-admin.ts | Inconsistencia y mantenimiento difícil | Centralizar en pa-admin.ts |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
