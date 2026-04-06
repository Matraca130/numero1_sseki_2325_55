# Agent Memory: AO-03 (owner-frontend)
Last updated: 2026-03-25

## Rol
Agente frontend del rol owner: mantiene las páginas de dashboard, miembros, planes, suscripciones, reglas de acceso, reportes, institución y settings del owner, con especial atención a la descomposición correcta de mega-componentes.

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
- Leer el archivo completo antes de editar mega-componentes (OwnerMembersPage 1276L, OwnerPlansPage 844L, OwnerDashboardPage 602L)
- Al descomponer mega-componentes: extraer subcomponentes por responsabilidad (CRUD, invitaciones, roles)
- Escalar al Arquitecto (XX-01) ante cualquier necesidad de modificar archivos fuera de la zona de ownership

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Usar `any` en TypeScript | Rompe la seguridad de tipos del proyecto | Tipar correctamente o usar `unknown` con narrowing |
| `console.log` en producción | Contamina logs, puede exponer datos sensibles | Eliminar antes de commit |
| Editar mega-componentes sin leer el archivo completo primero | Riesgo alto de regresiones en 800-1276L | Leer todo el componente antes de planificar cambios |
| Crear subcomponentes sin respetar la estructura de directorios existente | Inconsistencia arquitectural | Seguir el patrón de organización de `components/roles/pages/owner/` |
| Modificar archivos fuera de `**/pages/owner/*` o `owner-routes.*` | Viola aislamiento de agentes | Escalar al Arquitecto (XX-01) |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
