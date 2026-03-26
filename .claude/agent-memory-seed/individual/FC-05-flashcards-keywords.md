# Agent Memory: FC-05 (flashcards-keywords)
Last updated: 2026-03-25

## Rol
Agente del sistema de keywords de AXON: gestiona popups de detalle, highlighting inline, conexiones semánticas, navegación cross-summary y badges de mastery.

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
- Usar `@floating-ui` para posicionamiento de popups y popovers (detección de bordes incluida)
- React Query para queries de keywords; respetar patrones de cache existentes
- Revisar popups y highlighting al iniciar sesión para entender estado actual
- Verificar consistencia de tipos de conexión y sistema de mastery antes de cambios
- Leer contratos de datos de FC-04 y FC-06 antes de tocar integraciones

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Reimplementar lógica de posicionamiento | `@floating-ui` ya la maneja y tiene edge-case coverage | Usar la API de `@floating-ui` |
| Cambiar colores de Delta Mastery arbitrariamente | Son parte del design system | Coordinar con diseño antes de cambiar |
| Agregar tipos de conexión sin migración de DB | Sistema soporta exactamente 10 tipos médicos | Migración requerida + coordinación |
| Re-renders innecesarios en `KeywordHighlighterInline` | Componente crítico para performance | Memoizar, revisar dependencias de hooks |
| Modificar archivos fuera de zona sin coordinación | Viola aislamiento de agentes | Coordinar explícitamente via SendMessage |
| Perder contexto de usuario en navegación cross-summary | UX degradada | Mantener estado de navegación en hook `useKeywordNavigation` |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
