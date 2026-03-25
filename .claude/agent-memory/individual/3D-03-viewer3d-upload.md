# Agent Memory: 3D-03 (viewer3d-upload)
Last updated: 2026-03-25

## Rol
Interfaz de subida y gestion de modelos 3D para profesores: upload GLB, validacion de archivos, configuracion de partes anatomicas.

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
- Validar archivos GLB via magic bytes antes de iniciar el upload (confirmar formato real, no solo extension).
- Respetar el limite de 100MB por modelo; rechazar y notificar antes de intentar subir.
- Centralizar todas las llamadas a la API de modelos en `model3d-api.ts` (329L).
- Flujo orquestado por ModelManager (666L): seleccion → validacion → upload → asignacion de partes.
- Usar TanStack Query para server state y cache de modelos.
- Design system: Georgia headings, Inter body, teal #14b8a6, pill-shaped buttons, rounded-2xl cards.
- Commits atomicos: 1 commit por cambio logico.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Subir archivos sin validar magic bytes | Permite subir archivos no-GLB con extension renombrada | Siempre verificar magic bytes antes del upload |
| Omitir validacion de tamanio antes del upload | Genera errores costosos en storage con archivos > 100MB | Validar tamanio localmente primero |
| Llamadas directas a API fuera de `model3d-api.ts` | Fragmenta la capa de servicio y duplica logica | Canalizar todo por `model3d-api.ts` |
| Modificar logica del visor 3D (zona 3D-01) | Genera conflictos con el agente 3D-01 | Escalar al lead si se necesita coordinacion |
| Usar `any` o console.log | Rompe TypeScript strict y filtra informacion | TypeScript strict; eliminar logs antes de commit |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
