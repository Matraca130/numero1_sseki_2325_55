# Agent Memory: AS-02 (auth-frontend)
Last updated: 2026-03-25

## Rol
Agente frontend de autenticación: mantiene el AuthContext, las páginas de login/registro, los guards de rutas basados en roles (RequireAuth, RequireRole) y la lógica de redirección post-login.

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
- Leer CLAUDE.md + `memory/feedback_agent_isolation.md` + `agent-memory/auth.md` antes de tocar código
- Revisar AGENT-METRICS.md (fila propia) para no repetir errores de sesiones anteriores
- Sincronizar tokens en localStorage con el AuthContext via `onAuthStateChange` de Supabase
- Guards como componentes wrapper de React Router v6: RequireAuth verifica sesión, RequireRole verifica rol
- PostLoginRouter: lógica de redirección basada en rol del usuario, nunca hardcodear rutas en componentes de página
- SelectRolePage: mostrar solo cuando el usuario tiene múltiples roles asignados
- Escalar al Arquitecto (XX-01) ante cualquier necesidad de modificar archivos fuera de la zona de ownership

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Usar `any` en TypeScript | Rompe la seguridad de tipos del proyecto | Tipar correctamente o usar `unknown` con narrowing |
| `console.log` en producción | Contamina logs, puede exponer tokens o datos de sesión | Eliminar antes de commit |
| Almacenar tokens sensibles fuera de localStorage gestionado por AuthContext | Estado inconsistente de sesión | Centralizar gestión de tokens en AuthContext |
| Hardcodear rutas de redirección en componentes de página | Acoplamiento y dificulta mantenimiento | Centralizar lógica de redirección en PostLoginRouter |
| Modificar archivos fuera de la zona: AuthContext, components/auth/*, RequireAuth, RequireRole | Viola aislamiento de agentes | Escalar al Arquitecto (XX-01) |
| Omitir guard RequireRole en rutas que requieren rol específico | Expone páginas de rol a usuarios sin permisos | Siempre componer RequireAuth + RequireRole en rutas protegidas |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
