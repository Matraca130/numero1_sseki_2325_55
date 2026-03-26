# Agent Memory: IF-05 (infra-ci)
Last updated: 2026-03-25

## Rol
Agente de infraestructura CI/CD de AXON: mantiene los pipelines de GitHub Actions, la configuración de Vercel, Vite, Vitest y TypeScript, garantizando que cada push pase por validación automatizada y que los deploys a producción sean predecibles y seguros.

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
- Versiones pinneadas en actions (`actions/checkout@v4`, nunca `@latest`) — builds reproducibles.
- Secrets via `${{ secrets.NOMBRE }}` — nunca valores hardcodeados en YAML.
- Alias de paths en `vite.config.ts` sincronizados con `tsconfig.json` — evita errores de resolución en build vs. IDE.
- Vitest con `--reporter=verbose` en CI — output detallado para diagnóstico de fallos.
- Comentario explicativo en cada step de workflow — facilita mantenimiento futuro.
- Respetar el lockfile de pnpm — no mezclar package managers.

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Usar `@latest` en actions | Builds no reproducibles, cambios breaking silenciosos | Pinar versión exacta (`@v4`, `@v3`, etc.) |
| Hardcodear secrets en archivos de configuración | Exposición de credenciales en el repo | Usar `${{ secrets.NOMBRE }}` siempre |
| Desincronizar alias entre `vite.config.ts` y `tsconfig.json` | Errores de import en build que no aparecen en IDE | Actualizar ambos archivos en el mismo commit |
| Modificar `package.json` sin coordinación | Puede romper dependencias de otros agentes | Solo lectura — coordinar con el responsable si se necesita cambio |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
