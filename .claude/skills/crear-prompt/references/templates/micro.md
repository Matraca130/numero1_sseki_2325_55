# Template Micro: Planes de 1-3 Agentes, 1 Dominio

Para planes de **baja complejidad**: cambios mecánicos, features aisladas, fixes puntuales.

---

## 1. Checklist de Análisis Rápido

Responde SÍ/NO antes de generar prompts:

- [ ] ¿El objetivo es claro y medible? (ej: "Agregar endpoint GET /quiz/results")
- [ ] ¿Afecta SOLO 1 dominio? (ej: Solo Quiz, o solo Flashcards, no ambas)
- [ ] ¿Necesitan 1-3 agentes máximo?
- [ ] ¿Hay dependencias entre los agentes? (Si sí, probablemente sea Medio)
- [ ] ¿Es un cambio mecánico o feature estándar?

Si cualquier respuesta es NO → Escala a **MEDIO**.

---

## 2. Template: Selección de Agentes

| # | Dominio | Agent ID | Agent Name | Razón |
|---|---------|----------|-----------|-------|
| 1 | {DOMINIO} | {ID-XX} | {agente-nombre} | {por qué participa} |

**Máximo 3 agentes**. Si necesitas más → escalas a MEDIO.

---

## 3. Template: Prompt Único para Agente Solo (1 agente)

```xml
Actúa como {nombre_agente} ({ID}). Lee tu definición en .claude/agents/{nombre_agente}.md
y tu memoria en .claude/agent-memory-seed/individual/{ID}-{nombre_agente}.md.

## MANDATORY READS (antes de escribir código)
1. Lee CLAUDE.md del repositorio
2. Lee .claude/memory/feedback_agent_isolation.md
3. Lee .claude/agent-memory-seed/{dominio}.md (memoria de tu sección)
4. Lee .claude/agent-memory-seed/individual/{ID}-{nombre_agente}.md (tu memoria)

## ISOLATION RULES
SOLO puedes modificar estos archivos:
{lista_explícita_de_archivos}

Cualquier cambio fuera de esta zona será RECHAZADO por el Quality Gate.

Workflow:
1. git checkout -b {rama_feature} main
2. Implementa cambios SOLO en los archivos asignados
3. Verifica: git diff main..<rama_feature> --stat (debe mostrar SOLO tus archivos)

## TAREA
**Objetivo:** {qué debe lograr}

**Contexto:** {por qué es necesario, qué problema resuelve}

**Criterios de Aceptación:**
- {criterio 1}
- {criterio 2}
- {criterio 3}

**Output Esperado:**
{archivos que debes crear/modificar, tests, documentación}

## ESCALATION
Si encuentras algo de esto, DETENTE:
- Necesitas modificar archivos fuera de tu zona
- Hay conflicto con la especificación
- La tarea requiere decisión arquitectónica no documentada
```

---

## 4. Template: Prompt para Equipo Micro (2-3 agentes)

```xml
Ejecutar en secuencia:

### AGENTE 1: {nombre_agente_1} ({ID-1})
{prompt del agente 1, como arriba}

[Esperar QG approval]

### AGENTE 2: {nombre_agente_2} ({ID-2})
Actúa como {nombre_agente_2} ({ID-2})...

[Dependencias resueltas]
El Agente 1 creó/modificó: {archivos}
Necesitas leer estos cambios desde main (ya mergeados).

{resto del prompt}

[Esperar QG approval]

### AGENTE 3: (opcional) {nombre_agente_3} ({ID-3})
{prompt similar}
```

---

## 5. Mini Quality Gate Checklist

Después de cada agente, verificar:

- [ ] **Zone compliance**: ¿Modificó SOLO sus archivos asignados?
- [ ] **TypeScript**: ¿Sin errores? ¿Sin `any`?
- [ ] **Tests**: ¿Hay tests para happy path + error cases?
- [ ] **Spec coherence**: ¿Los parámetros/respuestas coinciden con la especificación?
- [ ] **Git hygiene**: ¿Commit limpio, sin secretos?

**Veredicto:**
- ✅ APPROVE → Merge inmediatamente
- 🔧 NEEDS FIX → Listar los fixes exactos + re-ejecutar agente
- 🚫 BLOCK → No mergear, explicar por qué

---

## 6. Fórmula de Estimación de Costos

Para modelos Opus 2026 (usar el router de costos):

```
Costo Estimado = (agents * complexity_factor * model_cost)

Complexity Factor:
- Cambio mecánico (renombrar, ajustar estilos): 0.3-0.5K tokens → HAIKU
- Feature estándar (CRUD, componente): 1-2K tokens → SONNET
- Arquitectura/refactor complejo: 3-5K tokens → OPUS

Precio aproximado por agente:
- HAIKU: ~$0.01-0.05
- SONNET: ~$0.20-0.80
- OPUS: ~$1.50-3.00
```

**Ejemplo:**
- 2 agentes, ambos SONNET, feature estándar
- Costo total: ~$0.40-1.60

---

## 7. Cuándo Escalar a MEDIO

Muévete a **Medio** si:

1. Necesitas **4+ agentes** (supera capacidad Micro)
2. **2+ dominios** están involucrados (no es aislado)
3. **Dependencias complejas** entre agentes (no es secuencial simple)
4. **Multiple fases** necesarias (no entra en ejecución simple)
5. **Quality Gates múltiples** entre fases (Micro = 1 QG por agente)

---

## 8. Checklist Final Antes de Ejecutar

- [ ] Agents seleccionados: {1-3 names + IDs}
- [ ] Dominio único: {DOMINIO}
- [ ] Modelo(s) asignado(s): {HAIKU|SONNET|OPUS}
- [ ] Archivos de cada agente: {listas explícitas}
- [ ] Dependencias resueltas: {orden de ejecución}
- [ ] Prompts completos: {todos los bloques XML presentes}
- [ ] Criterios de aceptación: {verificables por QG}
- [ ] Costo estimado: ~${monto}
- [ ] Usuario confirmó: SÍ / NO

---

## 9. Referencia: Agent Registry (Dominio → Agentes)

| Dominio | Agent IDs | Cuándo usarlos |
|---------|-----------|---|
| **QZ** (Quiz) | QZ-01 a QZ-06 | Cambios en quiz, questions, adaptive |
| **FC** (Flashcards) | FC-01 a FC-06 | Cambios en flashcards, FSRS |
| **SM** (Summaries) | SM-01 a SM-06 | Cambios en content, block editor |
| **ST** (Study) | ST-01 a ST-05 | Cambios en study sessions, progress |
| **DG** (Dashboard) | DG-01 a DG-05 | Cambios en dashboards, gamification |
| **AO** (Admin) | AO-01 a AO-04 | Cambios en admin, owner, billing |
| **AS** (Auth) | AS-01 a AS-05 | Cambios en auth, security, RLS |
| **AI** (RAG) | AI-01 a AI-06 | Cambios en RAG, embeddings, LLM |
| **3D** (3D Viewer) | 3D-01 a 3D-04 | Cambios en viewer 3D, anotaciones |
| **IF** (Infra) | IF-01 a IF-05 | Cambios en core libs, CI/CD, DB |
| **MG** (Messaging) | MG-01 a MG-04 | Cambios en Telegram, WhatsApp, notifs |
| **BL** (Billing) | BL-01 a BL-04 | Cambios en Stripe, planes, invoices |

---

## 10. Ejemplo Completo: Micro (1 Agente)

**Objetivo:** Agregar campo "dificultad" a quiz

**Plan:**
- **Agente:** QZ-02 (quiz-backend)
- **Modelo:** Sonnet
- **Archivos:** routes/quiz-routes.ts, services/quizService.ts, schema/quiz.sql
- **Duración estimada:** 15-20 min

**Costo:** ~$0.50

**QG esperado:** 1 check después de QZ-02

---

## Fin del Template Micro

Usa este template para planes rápidos, aislados y de bajo riesgo.
