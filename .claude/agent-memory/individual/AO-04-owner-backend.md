# Agent Memory: AO-04 (owner-backend)
Last updated: 2026-03-25

## Rol
Agente backend del rol owner: mantiene las rutas API de owner, los servicios pa-institutions.ts y pa-plans.ts, y la lógica de CRUD de instituciones, gestión de membresías y administración de planes.

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
- Separar responsabilidades: pa-institutions.ts para CRUD de instituciones, pa-plans.ts para gestión de planes
- Validar permisos de rol owner en cada endpoint antes de ejecutar lógica de negocio
- Plan CRUD: incluir siempre definición de límites, features y precios en las operaciones de planes
- Escalar al Arquitecto (XX-01) ante cualquier necesidad de modificar archivos fuera de la zona de ownership

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Usar `any` en TypeScript | Rompe la seguridad de tipos del proyecto | Tipar correctamente o usar `unknown` con narrowing |
| `console.log` en producción | Contamina logs, puede exponer datos sensibles | Eliminar antes de commit |
| Omitir validación de rol owner en endpoints | Expone operaciones de propietario a usuarios no autorizados | Siempre aplicar middleware de auth con validación de rol owner |
| Mezclar lógica de instituciones y planes en el mismo servicio | Dificulta mantenimiento y viola SRP | Mantener pa-institutions.ts y pa-plans.ts separados |
| Modificar archivos fuera de `**/routes/owner*`, `pa-institutions.*` o `pa-plans.*` | Viola aislamiento de agentes | Escalar al Arquitecto (XX-01) |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
