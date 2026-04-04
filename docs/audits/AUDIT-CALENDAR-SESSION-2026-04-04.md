# Auditoria End-to-End: Agregar Session de Estudio (Calendario)

**Fecha:** 2026-04-04
**Rama:** `claude/audit-calendar-session-CCTFV`
**Agentes usados:** study-dev (x2), infra-ai, api-contract
**Archivos auditados:** 35+ archivos en 7 dominios

---

## Resumen Ejecutivo

El flujo "Agregar sesion de estudio" funciona end-to-end y **SI usa el sistema de generacion inteligente con IA** (Claude via `POST /ai/schedule-agent`). Sin embargo, hay **problemas criticos** que afectan la calidad de las recomendaciones AI y la confiabilidad del flujo.

### Veredicto por area

| Area | Estado | Problemas |
|------|--------|-----------|
| Wizard 6 pasos | Funcional con bugs | No try/catch, race condition dual-write |
| Integracion AI | Conectada pero degradada | Profile empobrecido, hook muerto |
| Dashboard/Calendario | Parcial | Sin drag cross-day, sin alertas overdue |
| API Layer | Funcional | Tipos duplicados en 3 lugares |
| Scheduling Intelligence | Bien disenado | Pipeline completo no consumido aun |

---

## Hallazgos por Severidad

### CRITICOS (3)

#### C-1: No try/catch en `handleGeneratePlan` -- spinner infinito en error
- **Archivo:** `study-organizer-wizard/StudyOrganizerWizard.tsx:87-95`
- **Problema:** Si `generateStudyPlan()` o `createPlanFromWizard()` lanza error, `setAiLoading(false)` nunca se ejecuta. El usuario queda atrapado con "Claude esta analizando tu perfil..." sin posibilidad de salir.
- **Fix:** Envolver en try/catch/finally, mostrar toast de error.

#### C-2: `useScheduleAI` es codigo muerto -- 0 consumidores
- **Archivo:** `hooks/useScheduleAI.ts` (221 lineas)
- **Problema:** El hook tiene logica valiosa (cache de recomendaciones, profile builder rico con stats/activity, clearCache) pero **ningun componente lo importa**. Los 4 consumidores reales llaman directamente a `aiService`:
  - `plan-generation.ts` -> `aiDistributeTasks` directo
  - `reschedule-runner.ts` -> `aiReschedule` directo
  - `DailyRecommendationCard.tsx` -> `aiRecommendToday` directo
  - `WeeklyInsightCard.tsx` -> `aiWeeklyInsight` directo
- **Impacto:** Sin cache, sin profile enriquecido, sin proteccion centralizada.
- **Fix:** Adoptar el hook en todos los consumidores, o eliminar y mover su logica util a los consumidores.

#### C-3: StudyPlanTask definido en 3 lugares con shapes distintas
- **Archivos:**
  - `types/study-plan.ts:11` -- `StudyPlanTask` con `date: Date`, `title`, `method`
  - `context/AppContext.tsx:15` -- Copia independiente (NO re-export)
  - `services/platform-api/pa-study-plans.ts:85` -- `StudyPlanTaskRecord` con `item_type`, `item_id`, `scheduled_date` (string)
- **Problema:** Si se modifica uno, los otros no se actualizan. Ya hay drift visible.
- **Fix:** Canonizar en `types/study-plan.ts`, re-exportar desde AppContext.

---

### ALTOS (5)

#### H-1: Race condition dual-write en wizard
- **Archivo:** `StudyOrganizerWizard.tsx:94`
- **Problema:** `addStudyPlan(result.plan)` y `createPlanFromWizard(result.plan)` escriben simultaneamente. El plan tiene ID temporal `plan-${Date.now()}` hasta que `fetchAll()` trae el ID real del backend.
- **Fix:** Esperar `createPlanFromWizard`, usar su ID retornado.

#### H-2: `Promise.allSettled` descarta tasks fallidos silenciosamente
- **Archivo:** `hooks/study-plans/useStudyPlans.ts:217`
- **Problema:** Si 3 de 20 tasks fallan al persistirse, el plan se muestra completo pero le faltan tasks. Sin log, sin retry, sin notificacion.
- **Fix:** Inspeccionar rejected results, notificar al usuario, ofrecer retry.

#### H-3: Profile AI empobrecido en plan generation y reschedule
- **Archivos:** `plan-generation.ts:66-68`, `reschedule-runner.ts:121-124`
- **Problema:** Ambos envian `sessionHistory: []`, `dailyActivity: []`, `stats: {all zeros}`. El AI recibe datos incompletos del estudiante, reduciendo la calidad de la distribucion inteligente.
- **Impacto:** El modelo Claude no puede personalizar basandose en habitos reales del estudiante.
- **Fix:** Pasar datos reales desde los contextos o recibir como parametros.

#### H-4: Drag & drop solo reordena dentro del mismo dia/plan
- **Archivo:** `study-plan-dashboard/StudyPlanDashboard.tsx:112-125`
- **Problema:** No hay soporte para mover tasks entre dias (ni en Week ni en Month view). El endpoint `PUT /study-plan-tasks/:id` soporta `scheduled_date` pero no se usa.
- **Fix:** Implementar cross-day drag en WeekView/MonthView con llamada a updateStudyPlanTask.

#### H-5: `createPlanFromWizard` no se awaita antes de navegar
- **Archivo:** `StudyOrganizerWizard.tsx:94`
- **Problema:** `createPlanFromWizard(result.plan)` es async pero se llama sin await. El wizard navega a `/schedule` antes de que el backend confirme la persistencia.
- **Fix:** `await createPlanFromWizard(result.plan)` antes de `navigateTo`.

---

### MEDIOS (8)

#### M-1: No hay timeout/AbortController en llamada AI del wizard
- **Archivo:** `plan-generation.ts:74`
- **Problema:** `aiDistributeTasks` hereda timeout global de 15s de `apiCall`. Para un LLM, puede ser corto. No hay timeout explicito ni AbortController a nivel componente.
- **Fix:** Agregar `{ timeoutMs: 30000 }` o similar.

#### M-2: DailyRecommendationCard sin cache -- AI llamada en cada mount
- **Archivo:** `DailyRecommendationCard.tsx:65-69`
- **Problema:** `useEffect` dispara `fetchRecommendations` en cada cambio de `studentProfile`. Sin cache, sin abort de request anterior. Puede generar llamadas AI redundantes.
- **Fix:** Adoptar `useScheduleAI.getRecommendationsToday` (que tiene cache) o implementar React Query.

#### M-3: Profile builder duplicado en 3+ lugares
- **Archivos:** `useScheduleAI.ts:47-89`, `plan-generation.ts:52-69`, `reschedule-runner.ts:111-124`, `StudyPlanDashboard.tsx:86-108`
- **Problema:** 4 implementaciones independientes que construyen `StudentProfilePayload`, cada una con distinta calidad de datos.

#### M-4: No hay alertas de tasks vencidos en dashboard
- **Archivo:** `study-plan-dashboard/StudyPlanDashboard.tsx`
- **Problema:** El dashboard no identifica ni resalta tasks con `date < today` y `status !== completed`. El estudiante no sabe que tiene tareas atrasadas.

#### M-5: No hay boton de reprogramacion manual
- **Archivo:** `study-plan-dashboard/StudyPlanDashboard.tsx`
- **Problema:** La spec dice que el dashboard debe tener un "boton de reprogramacion manual" pero no existe. Solo hay reschedule automatico al completar task.

#### M-6: `handleToggleTask` sin try/catch -- estado visual stuck
- **Archivo:** `study-plan-dashboard/StudyPlanDashboard.tsx:111`
- **Problema:** Si `toggleTaskComplete` lanza error, `setTogglingTaskId(null)` nunca ejecuta. El task queda visualmente bloqueado con `pointer-events-none`.

#### M-7: Hardcoded `min` date en date picker
- **Archivo:** `StudyOrganizerWizard.tsx:244`
- **Problema:** `min="2026-02-08"` esta hardcodeado. Permite seleccionar fechas pasadas.
- **Fix:** Usar `getAxonToday().toISOString().slice(0,10)`.

#### M-8: `normalizeClaudeResponse` usa `any` 8 veces
- **Archivo:** `services/ai-service/as-schedule.ts:111-173`
- **Problema:** La normalizacion de respuesta Claude usa `as any[]` extensivamente, violando TypeScript strict mode.

---

### BAJOS (5)

#### L-1: Tasks overflow se acumulan en fecha limite
- `plan-generation.ts:156-164` -- Cuando el scheduling no puede distribuir todas las tasks, las restantes se asignan a `endDate`, creando un dia imposible.

#### L-2: 14 usos de `: any` en wizard para course tree
- `StudyOrganizerWizard.tsx` -- `courses` de `useTreeCourses()` no tiene tipos fuertes.

#### L-3: UPCOMING_EXAMS con fechas hardcodeadas en fallback
- `scheduleFallbackData.ts:47-51` -- No relativas a `getAxonToday()`.

#### L-4: "Iniciar Estudio" boton sin handler
- `StudyPlanDashboard.tsx:204` -- `onClick={() => {}}` es no-op.

#### L-5: Step functions definidas inline en render scope
- `StudyOrganizerWizard.tsx:135-284` -- 6 funciones recreadas cada render. No memoizables por React.

---

## Analisis: Uso del Sistema de Generacion Inteligente

### SI se usa. Mapa de integracion real:

```
Wizard (crear plan)
  |
  v
plan-generation.ts --> aiDistributeTasks() --> POST /ai/schedule-agent {action: 'distribute'}
  |                                              |
  | (si falla)                                   v
  v                                          Claude AI (backend Supabase Edge Function)
Algorithmic fallback:                            |
  - Sort by priorityScore                        v
  - Interleave 2:1 high/normal              normalizeClaudeResponse()
  - Distribute by weeklyHours                    |
  - adjustTimeByDifficulty()                     v
                                            AiScheduleResponse.distribution[]

Dashboard (recomendaciones diarias)
  |
  v
DailyRecommendationCard --> aiRecommendToday() --> POST /ai/schedule-agent {action: 'recommend-today'}

Dashboard (insight semanal)
  |
  v
WeeklyInsightCard --> aiWeeklyInsight() --> POST /ai/schedule-agent {action: 'weekly-insight'}

Post-task-completion (reschedule)
  |
  v
reschedule-runner.ts --> aiReschedule() --> POST /ai/schedule-agent {action: 'reschedule'}
  |
  | (si falla)
  v
rescheduleRemainingTasks() (algorithmic, pure function)
```

### Modulo `scheduling-intelligence` (avanzado pero no integrado)

Existe un sistema completo en `lib/scheduling-intelligence/` con:
- `difficulty.ts` -- clasificacion de dificultad y ajuste de tiempo
- `cognitive-load.ts` -- balanceo de carga cognitiva entre dias
- `prerequisite-ordering.ts` -- orden topologico por prerequisitos (Kahn's algorithm)
- `schedule-generation.ts` -- pipeline completo (enrich + order + distribute + balance + interleave)
- `momentum.ts` -- momentum de estudio basado en 7 dias
- `exam-countdown.ts` -- countdown optimo para examenes con modelo FSRS

**Estado:** `enrichTasksWithDifficulty` y `runSchedulingPipeline` estan marcados `@internal -- not yet consumed, planned for future iteration`. Solo `adjustTimeByDifficulty` y `classifyDifficulty` estan en uso activo (desde `plan-generation.ts`).

**Oportunidad:** El fallback algoritmico del wizard podria usar `runSchedulingPipeline` en vez de su implementacion manual, ganando cognitive load balancing, prerequisite ordering y interleaving.

---

## Arquitectura de Archivos

```
FLUJO E2E: Agregar Sesion de Estudio

[UI Layer]
  StudyOrganizerWizard.tsx (6 pasos)
    |-- constants.ts, helpers.ts
    |-- plan-generation.ts --> aiDistributeTasks() + fallback algoritmico
    |
    v
[Hook Layer]
  useStudyPlans.ts --> createPlanFromWizard()
    |-- data-mapping.ts (backend -> frontend)
    |-- reschedule-runner.ts (AI + algorithmic)
    |-- helpers.ts, types.ts
    |
  useScheduleAI.ts (DEAD CODE - 0 imports)
    |
  useStudyIntelligence.ts (difficulty data via React Query)
  useStudyTimeEstimates.ts (time estimates from history)
    |
    v
[Context Layer]
  StudyPlansContext.tsx (wraps useStudyPlans)
  TopicMasteryContext.tsx (mastery data)
  StudyTimeEstimatesContext.tsx (time estimates)
    |
    v
[Service Layer]
  ai-service/as-schedule.ts --> POST /ai/schedule-agent
  platform-api/pa-study-plans.ts --> CRUD study_plans + study_plan_tasks
  studySessionApi.ts --> CRUD study_sessions
    |
    v
[Intelligence Layer]
  lib/scheduling-intelligence/ (partially consumed)
  utils/rescheduleEngine.ts (Phase 5, algorithmic)
  utils/planSchedulingUtils.ts (shared utils)
```

---

## Recomendaciones Priorizadas

### Inmediatas (fix ahora)

1. **Agregar try/catch/finally a `handleGeneratePlan`** -- Evita spinner stuck
2. **Await `createPlanFromWizard` antes de navegar** -- Evita plan no persistido
3. **Inspeccionar rejected results de Promise.allSettled** -- Notificar tasks fallidos

### Corto plazo (sprint actual)

4. **Adoptar `useScheduleAI` o eliminarlo** -- Centralizar profile building y cache
5. **Enriquecer StudentProfilePayload** en plan-generation y reschedule con datos reales
6. **Canonizar StudyPlanTask** en `types/study-plan.ts` como unica fuente
7. **Agregar try/catch a handleToggleTask** -- Evitar task stuck visualmente

### Mediano plazo (proximo sprint)

8. **Implementar drag cross-day** en WeekView/MonthView
9. **Agregar alertas de tasks vencidos** al dashboard
10. **Agregar boton de reprogramacion manual**
11. **Integrar `runSchedulingPipeline`** como fallback algoritmico mejorado
12. **Reemplazar `min` date hardcodeada** con `getAxonToday()`

---

## Addendum: Hallazgos del Agente API Contract (XX-09)

### CRITICOS adicionales

#### C-4: StudySessionRecord definido en 2 archivos con shapes DIVERGENTES
- **Archivo 1:** `pa-study-plans.ts:195-204` -- `total_reviews: number` (requerido), sin `started_at`
- **Archivo 2:** `studySessionApi.ts:28-41` -- `total_reviews?: number` (opcional), con `started_at: string` (requerido)
- **6 discrepancias concretas** entre ambas definiciones
- **Fix:** Unificar en `types/study-session.ts`, re-exportar desde ambos

#### C-5: Funciones duplicadas createStudySession/getStudySessions en ambos archivos
- `pa-study-plans.ts` tiene `createStudySession`, `updateStudySession`, `getStudySessions`
- `studySessionApi.ts` tiene `createStudySession`, `closeStudySession`, `getStudySessions`
- Nombres distintos para la misma operacion (`updateStudySession` vs `closeStudySession`)
- **Fix:** Eliminar funciones de session de pa-study-plans.ts, usar studySessionApi.ts como canonico

### ALTOS adicionales

#### H-6: `aiReschedule` invocado con `completedTaskId = ''` (siempre vacio)
- **Archivo:** `reschedule-runner.ts:141`
- `''` es falsy, asi que `callScheduleAgent` nunca lo envia al backend
- El AI no sabe que tarea se completo, degradando la calidad del reschedule
- **Fix:** Propagar el taskId real desde `toggleTaskComplete` hasta `executeReschedule`

#### H-7: Endpoint `/reorder` acepta `table: string` libre -- riesgo de SQL injection
- **Archivo:** `pa-study-plans.ts:182`
- El parametro `table` se envia directo al backend como JSON body
- Deberia ser union type: `table: 'study_plan_tasks' | 'topics'`

### MEDIOS adicionales

#### M-9: `course_id` no se mapea ni se envia desde el wizard
- `StudyPlanRecord.course_id` existe como `string | null`
- `createPlanFromWizard` nunca lo envia
- `getStudyPlans(courseId)` no encontrara planes sin `course_id`

#### M-10: Mapping lossy VIDEO/3D -> 'reading' en backend
- `video` y `3d` se guardan como `reading` en backend
- La inversa mapea `reading` -> `resumo`, perdiendo el metodo original si `original_method` es null

#### M-11: `reschedule-runner.ts` duplica logica de `data-mapping.ts`
- Reconstruye `frontendTasks` con la misma logica que `mapBackendPlanToFrontend`
- Duplicacion que puede divergir

---

## Totales actualizados

| Severidad | Cantidad |
|-----------|----------|
| **Critico** | 5 |
| **Alto** | 7 |
| **Medio** | 11 |
| **Bajo** | 5 |
| **Total** | **28 hallazgos** |

---

*Reporte generado por auditoria multi-agente paralela (4 agentes opus, 2 exploradores)*
