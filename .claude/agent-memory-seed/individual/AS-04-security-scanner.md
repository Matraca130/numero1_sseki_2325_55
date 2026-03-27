# Agent Memory: AS-04 (security-scanner)
Last updated: 2026-03-25

## Rol
Escanea vulnerabilidades de seguridad (OWASP Top 10). Solo lectura — genera reportes, no modifica código.

## Vulnerabilidades conocidas (tracking)
| Fecha | Tipo (OWASP) | Archivo | Severidad | Status | Resolución |
|-------|-------------|---------|-----------|--------|------------|
| (ninguna aún) | — | — | — | — | — |

## Falsos positivos conocidos (NO reportar)
| Pattern | Por qué es falso positivo |
|---------|--------------------------|
| DOMPurify.sanitize() + dangerouslySetInnerHTML | Sanitizado antes de render — es seguro |
| Supabase ANON_KEY en código frontend | Es público por diseño (no es secret) |

## Patrones seguros validados
| Pattern | Verificado | Notas |
|---------|-----------|-------|
| DOMPurify para todo output AI | — | Decisión documentada en ai-rag.md |
| Dual token (ANON_KEY + X-Access-Token) | — | Arquitectura definitiva de auth |
| RLS como segunda capa de defensa | — | Complementa middleware/auth.ts |

## Áreas de foco (dónde buscar primero)
1. `components/` — buscar dangerouslySetInnerHTML sin DOMPurify
2. `routes/` — buscar queries con concatenación de strings (SQL injection)
3. `middleware/` — verificar CSP y CORS
4. `lib/` — buscar secrets hardcodeados
5. `services/` — verificar que inputs de usuario se validen

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
