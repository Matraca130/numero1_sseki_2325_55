# Ejemplo Completo: Hotfix Urgente
## Corregir bug crítico: Quiz scores no actualizan parámetros BKT

**Escala:** Micro (1-2 agentes)
**Dominio:** QZ (Quiz) + IF (Infrastructure)
**Complejidad:** Baja (una línea bug fix)
**Severidad:** CRÍTICA (datos incorrectos en producción)
**Duración estimada:** 15-30 minutos
**Modelo recomendado:** Sonnet (cambio mecánico, debugging)

---

## 1. Reporte del Bug (Usuario)

**Timestamp:** 2026-03-29 14:45 UTC
**Severidad:** CRITICAL
**Sistema afectado:** Quiz adaptive engine
**Reporte:**

```
Los estudiantes están completando quizzes, pero los parámetros BKT
no se actualizan. La tabla quiz_attempts guarda score, pero
quiz_bkt_parameters queda igual. El algoritmo adaptativo no
evoluciona después del quiz.

Ejemplo:
- Student: user-456
- Quiz: quiz-789
- Antes: P_LEARN=0.25 (no domina)
- Student responde 5/5 correctas
- Después: P_LEARN sigue siendo 0.25 (debería ser >0.25)

Esto es CRÍTICO porque los quizzes no se adaptan.
```

---

## 2. Análisis Rápido (Arquitecto)

### 2.1 Scope de investigación

```bash
# Ubicación probable: quiz-adaptive (QZ-04)
grep -r "quiz_bkt_parameters" app/  # Qué archivos acceden?
grep -r "P_LEARN" app/              # Dónde se calcula?
grep -r "updateBKT\|bkt_update" app/  # Qué funciones lo actualizan?
```

**Resultado del grep:**
- `/app/services/adaptive-quiz-engine.ts` → calcula P_LEARN
- `/app/routes/quiz-attempts.ts` → guarda attempts
- `/app/db/schema.sql` → define tabla quiz_bkt_parameters

### 2.2 Ubicación del bug

```typescript
// Archivo: /app/services/adaptive-quiz-engine.ts
// Función: updateBKTAfterAttempt() [LÍNEA 145-160]

async function updateBKTAfterAttempt(userId, quizId, score) {
  const params = await getBKTParams(userId, quizId);

  // BUG: Se calcula newParams pero NUNCA se guarda
  const newParams = calculateBKT(params, score);

  // MISSING:
  // await updateBKTParams(userId, quizId, newParams);

  return newParams;  // Retorna pero no guarda!
}
```

### 2.3 Dependencias

```
Agentes involucrados:
- QZ-04 (quiz-adaptive) → propietario del bug
- IF-01 (infra-plumbing) → podría tener helper para DB update
- XX-02 (quality-gate) → auditoría final
```

### 2.4 Riesgo de regresión

- ¿Hay rollback en schema? NO
- ¿Hay tests unitarios que deberían fallar? SÍ (pero probablemente no están)
- ¿Hay data histórica corrupta? SÍ (necesita fix de datos)
- ¿Qué impacta si corregimos? Quiz adaptativo + leaderboards (recalcula scores)

---

## 3. Plan Micro

**Solo 1 agente, 1 rama, 1 cambio:**

```
Fase 1 (Secuencial):
  └─ QZ-04 (quiz-adaptive)
     - Leer bug report
     - Localizar updateBKTAfterAttempt
     - Agregar llamada faltante: await updateBKTParams(...)
     - Escribir test que falla sin fix (TDD)
     - Verificar git diff

Fase 2 (Auditoría):
  └─ XX-02 (quality-gate)
     - 6 checks reducidos (solo essentials)
     - Zone compliance: ¿solo en adaptive-quiz-engine.ts?
     - Tests: ¿el test nuevo falla sin fix?
     - Backward compat: ¿updateBKTParams ya existe?
```

---

## 4. Prompts Completos

### Prompt para QZ-04 (quiz-adaptive)

```xml
<system>
Eres el agente quiz-adaptive (QZ-04). Tu rol: implementar motor adaptativo
de quizzes usando Bayesian Knowledge Tracing (BKT).

<mandatory_reads>
1. /CLAUDE.md
2. /.claude/agents/quiz-adaptive.md
3. /.claude/agent-memory-seed/individual/QZ-04-quiz-adaptive.md
4. /.claude/agent-memory-seed/quiz.md
5. /.claude/memory/feedback_agent_isolation.md
</mandatory_reads>

<critical_issue>
HOTFIX URGENTE — No aplaces por optimizaciones.
BKT parámetros NO se actualizan en BD después de quiz.
SYMPTOM: P_LEARN se calcula pero nunca guarda.
IMPACT: Quiz adaptativo roto en producción.
</critical_issue>

<isolation_zone>
SOLO puedes modificar/crear en ESTA SESIÓN:
- /app/services/adaptive-quiz-engine.ts
  (SOLO en función updateBKTAfterAttempt, línea ~145-160)
- /app/tests/quiz-adaptive.test.ts
  (agregar 1 test case: updateBKTAfterAttempt guardado)

Explícitamente NO tocar:
- Routes (QZ-02 owns)
- Components (QZ-01 owns)
- Questions logic (QZ-05 owns)
- DB schema (IF-04 owns)
- Otras funciones BKT
</isolation_zone>

<conventions>
- NO refactoring
- NO optimizaciones
- SOLO arreglar el bug específico
- Cambio debería ser <5 líneas
</conventions>
</system>

<task>
<objective>
Arreglar bug crítico: updateBKTAfterAttempt calcula nuevos parámetros
BKT pero NUNCA los guarda en la BD. El algoritmo adaptativo queda roto.
</objective>

<context>
Severidad: CRÍTICA — Quiz adaptativo no funciona en producción.
Los estudiantes completan quizzes, pero sus P_LEARN no evoluciona.

El bug está en /app/services/adaptive-quiz-engine.ts línea ~147:
- Se CALCULA newParams
- Se RETORNA newParams
- Pero NO se guarda en BD

Necesitas:
1. Identificar llamada faltante a BD
2. Agregar await updateBKTParams(...)
3. Escribir test que demuestre el bug (TDD)
4. Verificar que quiz-attempts.ts sigue funcionando
</context>

<acceptance_criteria>
1. updateBKTAfterAttempt GUARDA nuevos parámetros en quiz_bkt_parameters
2. Test: sin fix → assertion falla; con fix → assertion pasa
3. El test chequea: SELECT P_LEARN FROM quiz_bkt_parameters
4. Backward compat: updateBKTParams() ya existe (QZ-04 owns)
5. Verificación: git diff muestra SOLO adaptive-quiz-engine.ts + test
</acceptance_criteria>

<dependencies>
- Prerequisito: updateBKTParams(userId, quizId, params) debe existir
  (Check en lib/api.ts o services/)
- Prerequisito: quiz_bkt_parameters tabla existe (IF-04 owns)
- Prerequisito: test suite puede acceder a BD de prueba
</dependencies>

<bug_location>
File: /app/services/adaptive-quiz-engine.ts
Function: updateBKTAfterAttempt (línea ~145)

Current code (WRONG):
```typescript
async function updateBKTAfterAttempt(userId, quizId, score) {
  const params = await getBKTParams(userId, quizId);
  const newParams = calculateBKT(params, score);
  return newParams;  // BUG: calcula pero no guarda!
}
```

Expected code (FIX):
```typescript
async function updateBKTAfterAttempt(userId, quizId, score) {
  const params = await getBKTParams(userId, quizId);
  const newParams = calculateBKT(params, score);
  await updateBKTParams(userId, quizId, newParams);  // <-- LÍNEA FALTANTE
  return newParams;
}
```
</bug_location>

<output_format>
Entregar:
1. /app/services/adaptive-quiz-engine.ts (FIX)
   - Función updateBKTAfterAttempt con await guardado
   - Commit message: "Fix: Guardar parámetros BKT después de quiz"
2. /app/tests/quiz-adaptive.test.ts (TEST)
   - 1 test case: updateBKTAfterAttempt guarda en BD
   - Debe fallar SIN el fix, pasar CON el fix (TDD proof)
3. Verificación:
   - git diff main..<branch> --stat
   - Debe mostrar SOLO: adaptive-quiz-engine.ts + quiz-adaptive.test.ts
</output_format>

<examples>
Test esperado:
```typescript
describe('updateBKTAfterAttempt', () => {
  it('debe guardar nuevos parámetros BKT en la BD', async () => {
    // Setup
    const userId = 'test-user-123';
    const quizId = 'quiz-456';
    const initialParams = { P_LEARN: 0.25, P_GUESS: 0.1, P_SLIP: 0.05 };
    await setBKTParams(userId, quizId, initialParams);

    // Act: responder quiz con 5/5 correctos
    await updateBKTAfterAttempt(userId, quizId, 5);  // 100% score

    // Assert: P_LEARN debe haber aumentado
    const saved = await getBKTParams(userId, quizId);
    expect(saved.P_LEARN).toBeGreaterThan(0.25);  // <-- Sin fix: falla aquí
  });
});
```

Git diff esperado:
```
M app/services/adaptive-quiz-engine.ts (+1 línea)
M app/tests/quiz-adaptive.test.ts (+15 líneas)

NADA MÁS.
```
</examples>

<escalation>
Si encuentras:
- updateBKTParams() no existe
- quiz_bkt_parameters tiene estructura diferente
- calculateBKT() retorna valores inválidos
- Score normalization conflictivo
→ REPORTA AL ARQUITECTO. No arregles eso, es fuera de scope.
</escalation>

<quality_gate_focus>
XX-02 va a chequear:
1. Zone compliance: ¿solo adaptive-quiz-engine.ts + test?
2. Tests: ¿el test demuestra el bug?
3. Git: ¿commit message claro?
4. Compat: ¿updateBKTParams() sigue siendo utilizable por otros?

NO va a chequear:
- Optimización de queries
- Refactoring de calculateBKT
- Cambios en otras funciones
</quality_gate_focus>
</task>
```

---

### Prompt para XX-02 (quality-gate) — Hotfix Mode

```xml
<system>
Eres el agente quality-gate (XX-02). Tu rol: auditar código post-ejecución
y determinar si es seguro mergear: APPROVE / NEEDS FIX / BLOCK.

En HOTFIX MODE: auditoría reducida (essentials only).

<mandatory_reads>
1. /CLAUDE.md
2. /.claude/agents/quality-gate.md
3. /.claude/agent-memory-seed/individual/XX-02-quality-gate.md
4. /.claude/memory/feedback_agent_isolation.md
</mandatory_reads>

<mode>
HOTFIX URGENTE — 6 checks, pero enfocado en:
1. Zone compliance (¿fuera de scope?)
2. Tests (¿demuestra el arreglo?)
3. Git hygiene (¿commit limpio?)

Skip (por ser hotfix):
- Refactoring review
- Optimization audit
- Design coherence
</mode>
</system>

<task>
<objective>
Auditar fix del bug BKT (QZ-04) en hotfix mode.
¿Es seguro mergear? APPROVE / NEEDS FIX / BLOCK.
</objective>

<context>
QZ-04 acaba de pushear:
- 1 línea agregada en updateBKTAfterAttempt()
- 1 test nuevo que demuestra el bug

Necesitas verificar que es seguro mergear en main AHORA.
</context>

<checklist>
**MANDATORY (Hotfix):**

1. ✓ Zone Compliance
   - ¿adaptive-quiz-engine.ts es propiedad de QZ-04?
   - ¿quiz-adaptive.test.ts es propiedad de QZ-04?
   - ¿Tocó algún otro archivo?
   → Si NO: PASS | Si SÍ: BLOCK

2. ✓ Test Proof
   - ¿El test falla SIN el fix?
   - ¿El test pasa CON el fix?
   - ¿Es test de BD (integration)?
   → Si NO: NEEDS FIX | Si SÍ: PASS

3. ✓ Git Hygiene
   - ¿Commit message describe el fix?
   - ¿No hay secretos (.env, API keys)?
   - ¿Branch limpia sin merge commits?
   → Si NO: NEEDS FIX | Si SÍ: PASS

**OPTIONAL (Skip en hotfix):**
- TypeScript strict
- Backward compat review
- Performance impact
</checklist>

<verdict_logic>
IF all 3 mandatory == PASS:
  → VERDICT = "APPROVE" (mergea inmediatamente)

IF any mandatory == NEEDS FIX:
  → VERDICT = "NEEDS FIX" (agente corrige y re-run)

IF any mandatory == BLOCK:
  → VERDICT = "BLOCK" (peligroso, no mergea)
  → Ejemplo: tocó archivo de otro agente

SPEED: Este audit debe tomar <5 minutos.
</verdict_logic>

<output_format>
Generar reporte breve:

```markdown
# Quality Gate: Hotfix BKT Bug

**Agent:** QZ-04 (quiz-adaptive)
**Branch:** hotfix-bkt-save
**Commits:** 1

## Audit Results

**Zone Compliance:** ✅ PASS
- adaptive-quiz-engine.ts (QZ-04 owner)
- quiz-adaptive.test.ts (QZ-04 owner)
- No files outside zone

**Test Proof:** ✅ PASS
- Test updateBKTAfterAttempt includes DB assertion
- Falla sin fix: "expected P_LEARN to be > 0.25"
- Pasa con fix: assertion succeeds

**Git Hygiene:** ✅ PASS
- Commit message: "Fix: Guardar parámetros BKT después de quiz"
- No .env, no API keys
- 1 clean commit, no merge commits

## Verdict

**APPROVE**

Safe to merge. Hotfix is minimal, tested, and within zone.
Merge to main, then rebase any dependent branches.
```
</output_format>

<escalation>
Si encuentras BLOCK (ej: otro agente tocado):
```
**VERDICT: BLOCK**

Reason: /app/routes/quiz-routes.ts fue tocado.
That belongs to QZ-02 (quiz-backend), not QZ-04.

Do not merge. QZ-04 must re-run from clean main branch.
```
</escalation>
</task>
```

---

## 5. Ejecución (Timeline)

```
14:45 — Usuario reporta bug en Slack
14:50 — Arquitecto (XX-01) analiza scope
14:55 — Genera prompt para QZ-04 (este documento)
15:05 — QZ-04 corre, sube PR
15:10 — XX-02 audita (hotfix mode)
15:15 — APPROVE → merge a main
15:20 — Monitoreo: P_LEARN se actualiza en prod ✅

Total: 30 minutos de bug reporte a fix en producción.
```

---

## 6. Datos Post-Hotfix (Data Fix)

Aunque el código está arreglado, la BD tiene data histórica corrupta.
Necesita migración de limpieza (SIGUIENTE SESIÓN, no este hotfix):

```sql
-- Migration: SIGUIENTE (not part of this hotfix)
-- Problem: 100+ quiz_attempts con BKT params no sincronizados
-- Solution: re-calcular BKT para intentos de los últimos 7 días

-- Para hacerlo CORRECTAMENTE sin romper nada:
-- 1. QZ-04 corre hotfix (THIS)
-- 2. Monitorear: P_LEARN se actualiza en intentos nuevos ✓
-- 3. LUEGO: IF-04 crea migración para datos históricos
-- 4. Testear migración en staging
-- 5. Mergear en producción al día siguiente
```

---

## 7. Lecciones para AGENT-METRICS.md

Después de hotfix:

```
| Date | Agent | Check | Description | Lesson |
|------|-------|-------|-------------|--------|
| 2026-03-29 | QZ-04 | spec | BKT params computed but not saved | LEARNED: Always persist calculated state immediately |
```

**Prevención para QZ-04:**
Agregar a definición: "Always test that calculated values are persisted to DB (not just returned)"

---

## 8. Comparación: Feature vs Hotfix

| Aspecto | Feature (Arriba) | Hotfix (Este) |
|--------|------------------|---------------|
| Agentes | 6-8 | 1-2 |
| Fases | 5+ | 1 |
| Duración | 2-3 horas | 15-30 min |
| QG checks | Completo (6) | Reducido (3) |
| Testing | Nuevo + happy path | Test que demuestra bug |
| Rollback | Complejo (multi-fase) | Simple (git revert) |
| Prompt detalle | Muy alto | Muy directo |
| Skip architect? | NO | SÍ (solo uno, obvio) |

---

## 9. Checklist Pre-Merge

```
□ QZ-04 ejecutó
□ Test falla SIN fix
□ Test pasa CON fix
□ git diff muestra SOLO adaptive-quiz-engine.ts + test
□ XX-02 audita en hotfix mode
□ XX-02 retorna APPROVE
□ Merge a main (fast-forward)
□ Monitoreo en prod: logs muestran P_LEARN actualizándose
□ Alert: no hay excepciones en updateBKTParams
```

---

## Resumen

**Hotfix Micro-Scale: 1 línea de código, 1 test, 30 minutos.**

El prompt es directo porque:
1. ✅ Bug está claramente ubicado
2. ✅ Scope es mínimo (1 función)
3. ✅ Fix es obvio (una línea)
4. ✅ No hay dependencias complejas

No involucra Arquitecto porque la decisión es inmediata:
- ¿Bug en QZ-04? SÍ → QZ-04 lo arregla
- ¿Una línea? SÍ → sin arquitectura
- ¿Urgente? SÍ → QG reducido (3 checks)

**Patrón para hotfixes futuro: copy este template.**
