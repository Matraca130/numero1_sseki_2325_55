# Agent Improvement Votes
Date: 2026-03-25 | Voters: 20 agents

---

## Conteo de votos por tema (agrupado por similitud)

### 1. AUTO-VINCULAR QG FAILURES → LECCIONES (14 votos) ⭐⭐⭐
> Que cada fallo del quality-gate genere automáticamente una lección en la memoria del agente, sin esperar el post-mortem manual.

| Votante | Propuesta específica |
|---------|---------------------|
| BL-01 | Vincular cada QG failure a plantilla de lección con pasos de prevención |
| FC-05 | Capturar lecciones post-sesión en formato estructurado sin esperar post-mortem |
| MG-01 | Registrar automáticamente cada error QG con tipo en tabla de lecciones |
| QZ-01 | Causal Analysis — agregar columna "Root Cause" al Error Ledger |
| DG-03 | Feedback Loop XX-02 → DG-03 — copiar feedback del QG a lecciones |
| XX-02 | Tabla de Lecciones Indexada por código de error QG (zone/ts/spec/etc) |
| 3D-01 | Automatic Lesson Ingestion — webhook que capture fallos del QG |
| AI-01 | Retroalimentación granular post-QG — motivo específico, no solo PASS/FAIL |
| XX-06 | Feedback loop de lecciones con prevención explícita |
| SM-04 | Pattern-First Memory Capture — registrar anti-patterns tras cada QG failure |
| AS-01 | Lecciones preventivas con triggers específicos observables en código |
| IF-01 | Pattern-library checklist pre-commit |
| FC-04 | Capturar checklist de tests pre-deploy por archivo |
| DG-01 | Vincular patrones a tasas de error QG |

---

### 2. MÉTRICAS DE EFECTIVIDAD DE LECCIONES (9 votos) ⭐⭐
> Trackear si las lecciones registradas realmente previenen errores futuros. ¿La lección funcionó o no?

| Votante | Propuesta |
|---------|-----------|
| XX-02 | Columna "Prevenciones activas" — cuántos FAIL se evitaron por esta regla |
| BL-01 | Métrica de "confianza de lección" basada en recurrencia |
| AS-04 | Métricas de resolución — cuántos hallazgos resueltos vs ignorados |
| FC-05 | Sistema de alertas de divergencia — QG pass drop >20% |
| AI-02 | Ventana deslizante de confianza por patrón (0-100%) |
| XX-07 | Retroalimentación de tendencias — deuda que no se accionó |
| DG-03 | Métricas de Error por Categoría en memoria individual |
| DG-01 | Patrones con columnas de QG pass rate y fails by type |
| AS-04 | Tendencia en vulnerabilidades — velocidad de remediación |

---

### 3. DECISIONES TÉCNICAS DOCUMENTADAS CON REASONING (7 votos) ⭐
> Registrar no solo QUÉ se decidió sino POR QUÉ, para evitar re-litigar decisiones.

| Votante | Propuesta |
|---------|-----------|
| DG-03 | Sección "Decisiones técnicas" con fecha, por qué y contexto |
| DG-01 | Registrar reasoning de cada patrón (ej: "WelcomeView monolítica porque...") |
| 3D-01 | Decision Log por Zona — por qué se eligió cada patrón |
| AI-02 | Capturar contexto de decisión en tiempo real — opciones y alternativas desechadas |
| FC-04 | Coordinación log — documentar cuándo se coordinó con otros agentes |
| XX-04 | Error Ledger con decisiones de canonicidad — quién decidió y por qué |
| ST-05 | Sesión de retro bimestral de patrones a evitar |

---

### 4. CROSS-AGENT IMPACT TRACKING (6 votos) ⭐
> Detectar cuándo los cambios de un agente rompen a otros.

| Votante | Propuesta |
|---------|-----------|
| AS-01 | Métricas de impacto cruzado — cuántos agentes fallaron por cambios de auth |
| IF-01 | Cross-agent dependency tracking — mapear qué agentes importan cada archivo |
| SM-04 | Pre-cache 28 importadores de ContentTreeContext para detectar breaking changes |
| ST-05 | Captura métrica de cross-agent impact cuando hooks rompen consumidores |
| XX-04 | Checklist de consumidores vinculado a tabla de duplicaciones |
| FC-04 | Coordinación log con FC-05/FC-06 sobre tipos compartidos |

---

### 5. AUTO-ESCALACIÓN POR TRIGGERS (5 votos)
> Reglas automáticas tipo "si X pasa → hacer Y", sin depender de intuición.

| Votante | Propuesta |
|---------|-----------|
| QZ-01 | Tabla "si XYZ ocurre → acción automática" en memoria |
| MG-01 | Triggers de auto-escalación predefinidos (si error ts > 2 → escalar) |
| IF-01 | Validador en git hooks que bloquee commits fuera de zona |
| 3D-01 | Scope Violation Detector que force retroalimentación antes de merge |
| AS-01 | Validación pre-sesión de supuestos clave (dual token vigente) |

---

### 6. AUDITORÍA ADAPTATIVA POR SEVERIDAD (4 votos)
> No aplicar el mismo nivel de checks a cambios triviales vs críticos.

| Votante | Propuesta |
|---------|-----------|
| XX-02 | Calibrar profundidad de checks según impacto (spec=100%, docs=mínimo) |
| AI-01 | Validación cruzada con XX-02 antes de registrar lección |
| DG-01 | Alertas técnicas pre-QG para captar deuda temprana |
| XX-07 | Métricas de impacto por tipo de hallazgo |

---

### 7. PATTERN DIGEST SEMANAL (3 votos)
> Resumen periódico de patrones exitosos y anti-patterns por sección.

| Votante | Propuesta |
|---------|-----------|
| QZ-01 | Weekly Pattern Digest — compilar patrones y anti-patterns por sección |
| XX-06 | Baseline dinámico actualizado — capturar y comparar deltas en cada sesión |
| QZ-04 | Dashboard de health interno — exponer métricas operacionales |

---

### 8. DOMAIN-SPECIFIC METRICS (3 votos)
> Métricas específicas del dominio técnico del agente (no solo QG genérico).

| Votante | Propuesta |
|---------|-----------|
| QZ-04 | Capturar transiciones de estado con timestamps y tasa de abandono |
| QZ-04 | Registrar divergencias BKT vs desempeño real |
| AI-01 | Métricas de calidad de chunks (cobertura semántica, overlap tokens) |

---

## Ranking final por votos

| # | Mejora | Votos | Prioridad |
|---|--------|-------|-----------|
| 1 | **Auto-vincular QG failures → lecciones** | **14** | P0 |
| 2 | **Métricas de efectividad de lecciones** | **9** | P1 |
| 3 | **Decisiones técnicas con reasoning** | **7** | P1 |
| 4 | **Cross-agent impact tracking** | **6** | P2 |
| 5 | **Auto-escalación por triggers** | **5** | P2 |
| 6 | Auditoría adaptativa por severidad | 4 | P3 |
| 7 | Pattern digest semanal | 3 | P3 |
| 8 | Domain-specific metrics | 3 | P3 |

---

## Implementación recomendada (top 3 por votos)

### P0: Auto-vincular QG failures → lecciones (14 votos)

Agregar al protocolo del Quality Gate (XX-02) y al post-mortem del Arquitecto:

Cuando XX-02 emite NEEDS FIX o BLOCK:
1. Generar automáticamente una fila de lección con formato:
   ```
   | Fecha | QG Check (zone/ts/spec/tests/git/compat) | Descripción | Prevención | Recurred? |
   ```
2. Insertar en el archivo de memoria individual del agente que falló
3. Insertar en el Error Ledger de AGENT-METRICS.md
4. Si el error matchea una lección previa → marcar Recurred? YES

**Archivos a modificar:** `agents/quality-gate.md` (agregar paso de auto-registro), `MULTI-AGENT-PROCEDURE.md` (simplificar post-mortem)

### P1: Métricas de efectividad de lecciones (9 votos)

Agregar a cada memoria individual una tabla:
```
## Efectividad de lecciones
| Lección | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
```
Actualizar después de cada sesión donde el agente NO repitió el error.

### P1: Decisiones técnicas con reasoning (7 votos)

Agregar sección a la memoria individual:
```
## Decisiones técnicas (NO re-litigar)
| Fecha | Decisión | Por qué | Alternativas descartadas |
|-------|----------|---------|--------------------------|
```
