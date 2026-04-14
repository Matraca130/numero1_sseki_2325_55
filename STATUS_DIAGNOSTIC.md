# STATUS_DIAGNOSTIC — `security/phase-1-frontend`

**Estado**: `verified-useful`
**Fecha diagnóstico**: 2026-04-14
**Iteración /loop**: 1
**Tip commit**: `eba2d1e6` (2026-03-18)

## ¿Qué hace esta rama?

Fase 1 del hardening de seguridad del frontend (tickets S3/S4/S14/S15 / FE-001/003/005/006):
- **S14/FE-005**: `RequireRole` guard en rutas de estudiante (`role='student'`), alineado con owner/admin/professor.
- **S4+S15/FE-003/FE-006**: Headers de seguridad — `Content-Security-Policy` (`script-src 'self'`, bloquea inline scripts), `Strict-Transport-Security` (2 años, preload), `Permissions-Policy` (camera/geolocation off, microphone=self).
- **S3/FE-001**: `DOMPurify` sanitization en los 7 `dangerouslySetInnerHTML` del código + defensa en profundidad en `enrichHtmlWithImages()`. Nuevo helper `src/app/lib/sanitize.ts`. Bloquea XSS almacenado vía contenido backend (quiz questions, flashcards, summaries). `chart.tsx` excluido intencionalmente (CSS de constantes, no user content).

**Nota**: la rama también acumula commits de mindmap (breadcrumb, 149 tests, presentation mastery, heatmap profesor, drag-edge-reconnect) que no son security phase 1. Esto se debe a que la rama cherry-pickó desde una rama previa de features.

## ¿Es útil?

**Sí**. El bloque de seguridad es crítico (CSP, HSTS, DOMPurify) y los commits de mindmap también son valiosos aunque fuera de scope.

## ¿Hay regresiones?

**Riesgo medio** por alcance mixto: los headers CSP pueden romper integraciones inline no auditadas; verificar en staging antes de mergear. El mindmap añadido no está relacionado con el ticket y debería haber ido a su propia rama, lo que dificulta el rollback quirúrgico si CSP rompe algo.

## ¿Está documentada?

**Solo por commits** (detallados, con refs a tickets S3/S4/S14/S15/FE-001/003/005/006). No hay `docs/security/phase-1.md`. Recomendable añadir un runbook con: cómo verificar que CSP no rompe staging, qué hacer si DOMPurify filtra HTML legítimo, lista de `dangerouslySetInnerHTML` cubiertos.

## Recomendación

1. **Separar mindmap commits** a `feat/mindmap-sprint-nocturno` (cherry-pick) para auditar security en aislamiento.
2. **Desplegar security a staging** y validar CSP con report-only mode primero.
3. **Mergear** cuando no haya violaciones CSP en 24h de staging.

---
*Generado por `/loop verifique las ramas...` — iteración 1.*
