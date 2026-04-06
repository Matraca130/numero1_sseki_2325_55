# Agent Memory: MG-03 (notifications)
Last updated: 2026-03-25

## Rol
Agente del sistema de notificaciones in-app de AXON: mantiene el sistema de toasts (sonner), notificaciones de gamificación, y desarrolla la futura infraestructura de notificaciones persistentes con bandeja de entrada.

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
- Toast system actual: `sonner` para feedback inmediato — usar su API para todos los toasts, no crear wrappers innecesarios.
- Notificaciones de gamificación como toasts especiales — logros, badges, streaks con diseño diferenciado.
- Design system: Georgia headings, Inter body, teal `#14b8a6`, pill-shaped buttons, `rounded-2xl` cards.
- Usar `apiCall()` de `lib/api.ts` — nunca fetch directo.
- Archivos nuevos de notificaciones: crearlos en `components/shared/` o `services/` sin escalar.
- TanStack Query cuando se implemente la persistencia de notificaciones.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Crear sistema de toasts paralelo a `sonner` | Duplicación, UX inconsistente | Extender `sonner` con custom toasts |
| Modificar sistema de gamificación fuera del contexto de notificaciones | Fuera de zona | Escalar al lead |
| Usar colores fuera del design system | Inconsistencia visual | Usar teal `#14b8a6` y los tokens del design system |
| `console.log` en producción | Ruido en logs | Eliminar antes de commit |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
