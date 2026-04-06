# Agent Memory: 3D-01 (viewer3d-frontend)
Last updated: 2026-03-25

## Rol
Interfaz de usuario del visor 3D anatomico: componentes React con Three.js, camara, iluminacion, raycasting y capas de partes.

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
- Dispose explicito de geometrias, materiales y texturas de Three.js al desmontar para evitar memory leaks.
- Usar GLTFLoader para carga de modelos GLB/GLTF.
- Implementar raycasting para deteccion de clicks sobre partes del modelo.
- Usar `apiCall()` de `lib/api.ts` para todas las llamadas de red; nunca fetch directo.
- Design system consistente: Georgia headings, Inter body, teal #14b8a6, pill-shaped buttons, rounded-2xl cards.
- Commits atomicos: 1 commit por cambio logico.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| No hacer dispose de recursos Three.js | Memory leaks acumulativos que degradan performance | Dispose de geometrias, materiales y texturas al desmontar |
| Usar fetch directo en lugar de `apiCall()` | Rompe el contrato de la capa de API | Siempre usar `apiCall()` de `lib/api.ts` |
| Usar `any` en TypeScript | Anula las garantias de tipo y oculta bugs | TypeScript strict en todo momento |
| console.log en produccion | Filtra informacion y es indicador de codigo no revisado | Usar herramientas de debugging apropiadas |
| Modificar logica de otra zona sin escalar | Genera conflictos con otros agentes | Escalar al lead (XX-01) si se necesita modificar otra zona |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
