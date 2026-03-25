# Agent Self-Evaluation Protocol

> Cada agente evalúa su propia configuración para detectar problemas de claridad, feedback loops y alineamiento.
> Se ejecuta: (1) cuando el Arquitecto lo solicita, o (2) como parte de un audit periódico.

---

## Instrucciones para el agente

Cuando se te pida hacer una auto-evaluación, lee tu propia definición en `agents/<tu-nombre>.md` y tu memoria individual (si existe), y respondé con honestidad a este checklist.

**NO modifiques nada.** Solo reportá. El Arquitecto decide qué cambiar.

---

## Checklist de Auto-Evaluación

### A. Claridad del Rol (¿Entendí qué soy?)

| # | Pregunta | Respuesta | Notas |
|---|----------|-----------|-------|
| A1 | ¿Mi rol está descrito en 1-2 oraciones claras? | SI/NO/PARCIAL | |
| A2 | ¿Puedo distinguir mi trabajo del de otros agentes de mi sección sin ambigüedad? | SI/NO/PARCIAL | Listar solapamientos si hay |
| A3 | ¿Mi zona de ownership lista archivos ESPECÍFICOS (no globs vagos)? | SI/NO/PARCIAL | |
| A4 | ¿Está claro qué archivos son SOLO LECTURA para mí? | SI/NO/PARCIAL | |
| A5 | ¿Mis dependencias (Depends On) están documentadas? | SI/NO/NA | |

### B. Contexto al iniciar (¿Tengo lo que necesito?)

| # | Pregunta | Respuesta | Notas |
|---|----------|-----------|-------|
| B1 | ¿Mi sección "Al iniciar" lista TODO lo que necesito leer? | SI/NO/PARCIAL | ¿Falta algo? |
| B2 | ¿Leo el CLAUDE.md del repo? | SI/NO | |
| B3 | ¿Leo las reglas de aislamiento (feedback_agent_isolation.md)? | SI/NO | |
| B4 | ¿Leo mi memoria de sección (agent-memory/<section>.md)? | SI/NO/NA | |
| B5 | ¿Leo mi memoria individual (si existe)? | SI/NO/NA | |
| B6 | ¿El contexto que leo es SUFICIENTE para empezar a trabajar sin preguntar? | SI/NO/PARCIAL | ¿Qué falta? |

### C. Reglas de código (¿Las reglas me guían bien?)

| # | Pregunta | Respuesta | Notas |
|---|----------|-----------|-------|
| C1 | ¿Mis reglas de código son específicas (no genéricas como "escribir buen código")? | SI/NO/PARCIAL | |
| C2 | ¿Hay reglas que contradicen otras reglas? | SI/NO | Listar cuáles |
| C3 | ¿Hay situaciones comunes que NO están cubiertas por las reglas? | SI/NO | ¿Cuáles? |
| C4 | ¿Los parámetros técnicos (BKT, FSRS, etc.) están documentados con valores exactos? | SI/NO/NA | |
| C5 | ¿Tengo tendencia natural a hacer lo correcto con estas reglas, o tengo que luchar contra mis instintos? | NATURAL/LUCHAR | Explicar si LUCHAR |

### D. Feedback Loop (¿Puedo mejorar?)

| # | Pregunta | Respuesta | Notas |
|---|----------|-----------|-------|
| D1 | ¿Sé qué pasa con mi trabajo después de que termino? (¿Quién lo revisa?) | SI/NO | |
| D2 | ¿Tengo acceso a mis errores pasados (vía memoria individual o de sección)? | SI/NO | |
| D3 | ¿Las lecciones registradas en mi memoria son ACCIONABLES (puedo usarlas para evitar el error)? | SI/NO/NA | |
| D4 | ¿Mis patrones a evitar son claros y tienen alternativas? | SI/NO/NA | |
| D5 | ¿Puedo ver el resultado del quality-gate sobre mi trabajo? | SI/NO | |
| D6 | ¿Mi definición incluye reglas marcadas como [APRENDIDO] de errores pasados? | SI/NO/NA | |

### E. Aislamiento (¿Respeto los límites?)

| # | Pregunta | Respuesta | Notas |
|---|----------|-----------|-------|
| E1 | ¿Está claro cuándo debo ESCALAR al lead vs resolver yo mismo? | SI/NO/PARCIAL | |
| E2 | ¿Sé exactamente qué archivos NO debo tocar? | SI/NO/PARCIAL | |
| E3 | ¿Hay archivos que necesito modificar pero que no están en mi zona? | SI/NO | ¿Cuáles? |
| E4 | ¿Mi definición menciona coordinación con otros agentes cuando toco contratos compartidos? | SI/NO/NA | |

### F. Completitud (¿Falta algo?)

| # | Pregunta | Respuesta | Notas |
|---|----------|-----------|-------|
| F1 | ¿Mi contexto técnico está actualizado? | SI/NO/PARCIAL | ¿Qué está desactualizado? |
| F2 | ¿Hay herramientas que necesito y no tengo en mi frontmatter? | SI/NO | ¿Cuáles? |
| F3 | ¿Mi modelo (opus/sonnet/haiku) es apropiado para mi complejidad? | SI/NO | |
| F4 | ¿Hay algo que SIEMPRE me confunde cuando ejecuto mi tarea? | SI/NO | ¿Qué? |
| F5 | Si pudiera cambiar UNA cosa de mi definición, ¿cuál sería? | — | Responder en texto libre |

---

## Formato de reporte

```markdown
## Self-Eval: [AGENT-ID] [agent-name]
Date: YYYY-MM-DD

### Scores
| Category | Score | Issues |
|----------|-------|--------|
| A. Claridad | X/5 | ... |
| B. Contexto | X/6 | ... |
| C. Reglas | X/5 | ... |
| D. Feedback | X/6 | ... |
| E. Aislamiento | X/4 | ... |
| F. Completitud | X/5 | ... |
| **TOTAL** | **X/31** | |

### Top Issues (priorizado)
1. [Más crítico] ...
2. ...
3. ...

### Sugerencia de cambio (si pudiera cambiar 1 cosa)
...
```

---

## Scoring

| Score | Significado |
|-------|-------------|
| 28-31 | EXCELENTE — configuración sólida, no requiere cambios |
| 22-27 | BUENO — minor issues, optimizaciones opcionales |
| 16-21 | NECESITA ATENCIÓN — gaps importantes que afectan rendimiento |
| <16 | CRÍTICO — la configuración no es suficiente para operar correctamente |

---

## Cómo el Arquitecto usa los resultados

1. **Agentes con score <22:** Priorizar mejora de su definición antes de usarlos en sesiones.
2. **Categoría con score bajo consistente:** Problema sistémico en los templates de agentes.
   - Si muchos agentes fallan en B (Contexto) → los "Al iniciar" están incompletos.
   - Si muchos fallan en D (Feedback) → el sistema de lecciones no llega a los agentes.
   - Si muchos fallan en E (Aislamiento) → las zonas de ownership necesitan revisión.
3. **F5 (cambio sugerido):** Recopilar las respuestas de todos los agentes → identifica patrones de mejora.

---

## Cuándo ejecutar

| Trigger | Quién | Cuántos agentes |
|---------|-------|-----------------|
| Audit inicial | Arquitecto | Todos (por sección, en paralelo) |
| Después de 2+ QG FAIL del mismo agente | Arquitecto | Solo ese agente |
| Cada ~20 sesiones del sistema | Arquitecto | Los 13 con memoria individual |
| Después de un refactor del sistema de agentes | Arquitecto | Todos los afectados |
| Bajo pedido del usuario | Arquitecto | Los que el usuario indique |
