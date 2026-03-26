# Agent Memory: AS-03 (rls-auditor)
Last updated: 2026-03-26 (session 1 — full RLS audit, 58 tables)

## Audit Results (2026-03-26)
- 58 tables audited: 38 full CRUD, 16 partial (by design), 6 service-role only
- **2 HIGH findings**: platform_plans permissive CRUD for all auth users, ai_reading_config same
- **4 MEDIUM findings**: rag_query_log no service_role, algorithm_config no service_role, summary_blocks scoped by created_by not institution, SECURITY DEFINER REVOKEs deferred
- **1 LOW finding**: user_institution_ids() performance concern (acceptable)

## Lecciones de esta sesión
| Fecha | Lección | Prevención |
|-------|---------|------------|
| 2026-03-26 | platform_plans tiene INSERT/UPDATE/DELETE para todos los authenticated — backend es la única protección | Siempre verificar que tablas admin tengan RLS restrictivo, no solo backend role checks |
| 2026-03-26 | 6 SECURITY DEFINER functions sin REVOKE completado — deuda técnica documentada | Track como tech debt, requiere migración en 2 pasos |

## Rol
Audita políticas Row Level Security de PostgreSQL. Detecta tablas sin protección, políticas permisivas y misconfiguraciones.

## Estado de tablas auditadas
| Tabla | RLS Enabled | Policies (S/I/U/D) | Última auditoría | Issues |
|-------|-------------|---------------------|-----------------|--------|
| (ninguna aún) | — | — | — | — |

> S=SELECT, I=INSERT, U=UPDATE, D=DELETE

## Brechas históricas
| Fecha | Tabla | Tipo de brecha | Severidad | Resuelto? | Cómo |
|-------|-------|---------------|-----------|-----------|------|
| (ninguna aún) | — | — | — | — | — |

## Patrones RLS validados
| Pattern | Notas |
|---------|-------|
| `auth.uid() = user_id` para SELECT propio | Patrón estándar de Supabase |
| `auth.role() = 'service_role'` para admin | Solo backend con service key |
| RLS enabled sin policies = bloqueado | Supabase bloquea todo por defecto |

## Falsos positivos conocidos
| Pattern | Por qué es falso positivo |
|---------|--------------------------|
| (ninguno aún) | — |

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
