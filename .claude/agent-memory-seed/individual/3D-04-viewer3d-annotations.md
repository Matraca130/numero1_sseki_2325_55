# Agent Memory: 3D-04 (viewer3d-annotations)
Last updated: 2026-03-25

## Rol
Sistema de anotaciones 3D: pins espaciales, notas de profesores y estudiantes, marcadores billboard y posicionamiento via raycasting.

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
- Limpiar event listeners de raycasting al desmontar componentes para evitar leaks.
- PinMarker3D como sprite billboard: siempre orientado hacia la camara automaticamente.
- LinePinMarker conecta el pin con su punto de anclaje fisico en el modelo mediante linea.
- MultiPointPlacer para anotaciones complejas que requieren varios puntos de referencia.
- Usar `usePinData` y `useNoteData` con TanStack Query para server state.
- KeywordAutocomplete sugiere terminos anatomicos al escribir; acelera y estandariza anotaciones.
- Usar `apiCall()` de `lib/api.ts`; nunca fetch directo.
- Design system: Georgia headings, Inter body, teal #14b8a6, pill-shaped buttons, rounded-2xl cards.
- Commits atomicos: 1 commit por cambio logico.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| No limpiar event listeners de raycasting | Memory leaks y comportamiento fantasma al remontar | Siempre remover listeners en el cleanup de useEffect |
| Modificar logica core del visor 3D (zona 3D-01) | Conflicto con el agente 3D-01 | Escalar al lead (XX-01) si se necesita coordinacion |
| Cambiar rutas de API backend (zona 3D-02) | Conflicto con el agente 3D-02 | Escalar al lead; las rutas son zona exclusiva de 3D-02 |
| Usar `any` o console.log | Rompe TypeScript strict y filtra informacion | TypeScript strict; limpiar logs antes de commit |
| Pins sin punto de anclaje en superficie | Los pins "flotan" sin referencia espacial real | Usar raycasting para obtener punto exacto en la superficie del modelo |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
