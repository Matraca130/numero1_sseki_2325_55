# Agent Memory: AS-01 (auth-backend)
Last updated: 2026-03-25

## Parámetros críticos (NO cambiar sin aprobación)
- Dual token: SUPABASE_ANON_KEY (Bearer) + USER_JWT (X-Access-Token)
- Role NO está en JWT — viene de GET /institutions
- RLS policies a nivel de PostgreSQL

## Lecciones aprendidas por este agente
| Fecha | Lección | Prevención |
|-------|---------|------------|
| 2026-03-25 | (inicial) Archivo creado — sin errores registrados aún | — |

## Efectividad de lecciones
| Lección | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
| (se llena cuando una lección se activa en una sesión real) | — | — | — |

> Confianza: ALTA (previno 3+ errores), MEDIA (previno 1-2), BAJA (no previno o recurrió), NUEVA (sin datos)

## Decisiones técnicas (NO re-litigar)
| Fecha | Decisión | Por qué | Alternativas descartadas |
|-------|----------|---------|--------------------------|
| 2026-03-25 | Dual token es arquitectura definitiva | ANON_KEY para Supabase client, USER_JWT para auth de API | Token único para ambos propósitos |
| 2026-03-25 | Role via GET /institutions, no JWT claims | Permite cambio de role sin reauth | Claims de rol en el JWT |

## Patrones que funcionan
- middleware/auth.ts como punto único de validación
- RLS policies como segunda capa de defensa (DB level)
- Separación clara: auth.ts (lógica) vs routes/auth.ts (HTTP)

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Leer role desde JWT claims | Role no está en JWT por diseño | GET /institutions para obtener role |
| Bypass de middleware para "conveniencia" | Abre agujeros de seguridad | Siempre pasar por middleware/auth.ts |
| RLS policies que asumen role en JWT | Inconsistente con arquitectura dual-token | Usar service_role key para operaciones admin |

## Impacto (CRITICAL — bloquea todos los agentes backend)
- TODOS los agentes backend dependen implícitamente de AS-01
- Cualquier cambio en auth middleware afecta a toda la plataforma
- Cambios requieren: tests exhaustivos + security review + quality-gate

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
| Archivos tocados (promedio) | — | — |
