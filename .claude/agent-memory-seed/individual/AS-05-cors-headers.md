# Agent Memory: AS-05 (cors-headers)
Last updated: 2026-03-25

## Rol
Agente de seguridad de transporte: mantiene la configuración de CORS, Content-Security-Policy, headers HTTP de seguridad y hardening contra XSS en middleware/cors.ts, middleware/security.ts, vercel.json y lib/sanitize.ts.

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
- Usar `apiCall()` de `lib/api.ts` para todas las llamadas HTTP — nunca fetch directo
- Leer CLAUDE.md + `memory/feedback_agent_isolation.md` + `agent-memory/auth.md` antes de tocar código
- Revisar AGENT-METRICS.md (fila propia) para no repetir errores de sesiones anteriores
- CORS: whitelist explícita de orígenes — nunca `*` en producción
- CSP: directivas restrictivas por defecto (`default-src 'self'`), ampliar solo lo estrictamente necesario
- HSTS: `max-age` mínimo de 1 año (31536000) + `includeSubDomains`
- X-Frame-Options: `DENY` por defecto; `SAMEORIGIN` solo si hay iframes propios justificados
- `X-Content-Type-Options: nosniff` siempre activo
- DOMPurify para sanitizar HTML generado por usuarios antes de cualquier renderizado
- vercel.json para headers de seguridad en despliegue serverless: mantener sincronizado con middleware/security.ts
- Escalar al Arquitecto (XX-01) ante cualquier necesidad de modificar archivos fuera de la zona de ownership

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Usar `any` en TypeScript | Rompe la seguridad de tipos del proyecto | Tipar correctamente o usar `unknown` con narrowing |
| `console.log` en producción | Contamina logs | Eliminar antes de commit |
| `Access-Control-Allow-Origin: *` en producción | Anula la protección CORS, permite peticiones desde cualquier origen | Whitelist explícita de dominios permitidos |
| CSP permisiva con `unsafe-inline` o `unsafe-eval` | Neutraliza la protección contra XSS | Usar nonces o hashes para scripts inline si son imprescindibles |
| Renderizar HTML de usuario sin sanitizar | Vectores de XSS almacenado | Siempre pasar por DOMPurify antes de `dangerouslySetInnerHTML` |
| Desincronizar headers de vercel.json y middleware/security.ts | Comportamiento diferente entre entornos local y producción | Actualizar ambos archivos en el mismo commit |
| Modificar archivos fuera de `middleware/cors.*`, `middleware/security.*`, `vercel.json`, `lib/sanitize.*` | Viola aislamiento de agentes | Escalar al Arquitecto (XX-01) |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
