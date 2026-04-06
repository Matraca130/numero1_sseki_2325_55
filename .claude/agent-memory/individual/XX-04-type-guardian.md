# Agent Memory: XX-04 (type-guardian)
Last updated: 2026-03-25

## Rol
Guardián del sistema de tipos TypeScript. Consolida duplicados, mantiene coherencia. PUEDE modificar archivos de tipos.

## Duplicaciones conocidas (CRITICO — resolver)
| Tipo | Definido en | Canónico | Status |
|------|------------|----------|--------|
| Course | content.ts, legacy-stubs.ts, platform.ts | content.ts (propuesto) | PENDIENTE |
| Semester | content.ts, legacy-stubs.ts, platform.ts | content.ts (propuesto) | PENDIENTE |
| Section | content.ts, legacy-stubs.ts, platform.ts | content.ts (propuesto) | PENDIENTE |
| Topic | content.ts, legacy-stubs.ts, platform.ts | content.ts (propuesto) | PENDIENTE |
| MasteryLevel | (2 ubicaciones con VALORES DIFERENTES) | POR DECIDIR | BLOQUEADO |

## Plan de consolidación
1. Identificar todos los consumidores de cada definición duplicada
2. Elegir canónico (content.ts para contenido, platform.ts para plataforma)
3. Actualizar todas las importaciones
4. Eliminar definiciones duplicadas
5. Eliminar legacy-stubs.ts completamente

## Progreso de limpieza
| Archivo | Líneas | Estado | Notas |
|---------|--------|--------|-------|
| types/legacy-stubs.ts | 128 | MARCADO PARA ELIMINACIÓN | No agregar tipos nuevos aquí |
| types/content.ts | 113 | ACTIVO | Candidato a canónico para tipos de contenido |
| types/platform.ts | 255 | ACTIVO | Candidato a canónico para tipos de plataforma |

## Reglas de tipos (NO violar)
- Cada tipo: UNA SOLA definición canónica
- `export type` para tipos, `export interface` para interfaces con métodos
- Nunca `any` → usar `unknown`
- `import type { ... }` siempre
- Archivos de tipos: sin lógica de runtime

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
