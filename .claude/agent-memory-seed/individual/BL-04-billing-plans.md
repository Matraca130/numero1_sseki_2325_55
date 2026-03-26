# Agent Memory: BL-04 (billing-plans)
Last updated: 2026-03-25

## Rol
Agente especializado en la gestión de planes de suscripción de AXON — mantiene el CRUD de planes, configuración por institución, planes por defecto del sistema, y la interfaz de administración de planes para owners.

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
- `pa-plans.ts` centraliza todas las llamadas a la API de planes — no llamar a endpoints de planes desde otros archivos directamente.
- Planes globales (default) + planes institucionales personalizados — el sistema soporta ambos niveles.
- Cada plan define nombre, descripción, precio mensual/anual, límites (usuarios, storage, modelos) y features habilitadas.
- Default plans se asignan automáticamente a nuevas instituciones — mantener compatibilidad hacia atrás.
- TanStack Query para server state de planes en `OwnerPlansPage.tsx`.
- Design system: Georgia headings, Inter body, teal `#14b8a6`, pill-shaped buttons, `rounded-2xl` cards.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Modificar lógica de checkout | Zona de BL-01 | Escalar al lead |
| Modificar lógica de webhooks | Zona de BL-02 | Escalar al lead |
| Cambiar esquema de base de datos de planes | Fuera de zona | Escalar a IF-04 |
| Eliminar campos de un plan sin verificar consumidores | Puede romper checkout sessions o webhook processing | Verificar uso en BL-01 y BL-02 antes de cambios destructivos |
| Usar fetch directo en vez de `apiCall()` | Rompe el patrón centralizado | Usar `apiCall()` de `lib/api.ts` |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
