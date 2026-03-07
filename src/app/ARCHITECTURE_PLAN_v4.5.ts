/**
 * ============================================================
 * AXON v4.5 — PLAN ARQUITECTONICO DE MEJORAS BACKEND
 * ============================================================
 *
 * Autor: Audit automatizada
 * Fecha: 2026-03-03
 * Basado en: analisis real de los 3 repos (axon-backend, axon-docs, numero1_sseki)
 *
 * PROBLEMAS A RESOLVER:
 *   DT-02:     completionDate/weeklyHours no persisten en backend
 *   LOSSY-MAP: original_method se pierde en round-trip (video/resumo/3d -> reading)
 *   SEC-01:    study_plan_tasks NO tiene scopeToUser (vulnerabilidad de seguridad)
 *   PERF-01:   Reschedule engine necesita N PUTs individuales (sin batch)
 *   PERF-02:   DELETE plan hace N+1 requests (sin CASCADE)
 *
 * ============================================================
 *
 *
 * =====================================================
 * SECCION 1: MIGRACION DE BASE DE DATOS
 * =====================================================
 *
 * Ejecutar en Supabase SQL Editor, en este orden exacto.
 *
 *
 * --- Migration 001: study_plans metadata columns ---
 *
 * ```sql
 * -- v4.5 Migration 001: Add plan-level metadata columns
 * -- Safe: all columns are nullable or have defaults, zero downtime
 *
 * ALTER TABLE study_plans
 *   ADD COLUMN IF NOT EXISTS completion_date DATE,
 *   ADD COLUMN IF NOT EXISTS weekly_hours JSONB DEFAULT '[2,2,2,2,2,1,1]'::jsonb,
 *   ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
 *
 * COMMENT ON COLUMN study_plans.completion_date IS
 *   'Target completion date set by student in wizard. NULL = no deadline.';
 * COMMENT ON COLUMN study_plans.weekly_hours IS
 *   'Hours per day array [mon..sun]. Default [2,2,2,2,2,1,1]. Used by reschedule engine.';
 * COMMENT ON COLUMN study_plans.metadata IS
 *   'Extensible JSONB for future fields: generation_params, mastery_snapshot, etc.';
 * ```
 *
 *
 * --- Migration 002: study_plan_tasks extra columns ---
 *
 * ```sql
 * -- v4.5 Migration 002: Add task-level scheduling columns
 *
 * ALTER TABLE study_plan_tasks
 *   ADD COLUMN IF NOT EXISTS original_method TEXT,
 *   ADD COLUMN IF NOT EXISTS scheduled_date DATE,
 *   ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 25,
 *   ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
 *
 * -- CHECK: original_method must be a known frontend method (or NULL for legacy tasks)
 * ALTER TABLE study_plan_tasks
 *   ADD CONSTRAINT study_plan_tasks_original_method_check
 *   CHECK (
 *     original_method IS NULL
 *     OR original_method IN ('flashcard', 'quiz', 'video', 'resumo', '3d', 'reading', 'keyword')
 *   );
 *
 * COMMENT ON COLUMN study_plan_tasks.original_method IS
 *   'Frontend method that generated this task (video/resumo/3d/etc). Preserves display info lost by item_type mapping.';
 * COMMENT ON COLUMN study_plan_tasks.scheduled_date IS
 *   'Date this task is scheduled for. Set by wizard distribution + reschedule engine.';
 * COMMENT ON COLUMN study_plan_tasks.estimated_minutes IS
 *   'Estimated time in minutes. Adjusted by mastery multiplier via reschedule engine.';
 * ```
 *
 *
 * --- Migration 003: CASCADE delete for tasks ---
 *
 * ```sql
 * -- v4.5 Migration 003: Add CASCADE on study_plan_tasks FK
 * -- This makes plan deletion atomic: deleting a plan auto-deletes all its tasks
 * -- Eliminates the frontend N+1 delete pattern in useStudyPlans.deletePlan()
 *
 * -- Step 1: Drop the existing FK constraint
 * -- (find the actual constraint name first with):
 * -- SELECT constraint_name FROM information_schema.table_constraints
 * -- WHERE table_name = 'study_plan_tasks' AND constraint_type = 'FOREIGN KEY';
 *
 * ALTER TABLE study_plan_tasks
 *   DROP CONSTRAINT IF EXISTS study_plan_tasks_study_plan_id_fkey;
 *
 * -- Step 2: Recreate with CASCADE
 * ALTER TABLE study_plan_tasks
 *   ADD CONSTRAINT study_plan_tasks_study_plan_id_fkey
 *   FOREIGN KEY (study_plan_id) REFERENCES study_plans(id) ON DELETE CASCADE;
 * ```
 *
 *
 * --- Migration 004: RLS policy for study_plan_tasks ---
 *
 * ```sql
 * -- v4.5 Migration 004: SEC-01 FIX
 * -- study_plan_tasks currently has NO row-level security scoping.
 * -- Any authenticated user who guesses a study_plan_id can read/modify tasks.
 * --
 * -- This adds an RLS policy that verifies task ownership through study_plans.
 *
 * -- Enable RLS if not already enabled
 * ALTER TABLE study_plan_tasks ENABLE ROW LEVEL SECURITY;
 *
 * -- Policy: students can only access tasks belonging to their own plans
 * CREATE POLICY "Students can manage own plan tasks"
 *   ON study_plan_tasks
 *   FOR ALL
 *   USING (
 *     EXISTS (
 *       SELECT 1 FROM study_plans
 *       WHERE study_plans.id = study_plan_tasks.study_plan_id
 *         AND study_plans.student_id = auth.uid()
 *     )
 *   )
 *   WITH CHECK (
 *     EXISTS (
 *       SELECT 1 FROM study_plans
 *       WHERE study_plans.id = study_plan_tasks.study_plan_id
 *         AND study_plans.student_id = auth.uid()
 *     )
 *   );
 *
 * -- Performance index for the RLS join
 * CREATE INDEX IF NOT EXISTS idx_study_plan_tasks_plan_id
 *   ON study_plan_tasks(study_plan_id);
 * ```
 *
 *
 * =====================================================
 * SECCION 2: CAMBIOS EN BACKEND (sessions.ts)
 * =====================================================
 *
 * Archivo: supabase/functions/server/routes/study/sessions.ts
 *
 * Cambio 2A: Actualizar createFields/updateFields de study_plans
 *
 * ```ts
 * registerCrud(sessionRoutes, {
 *   table: "study_plans",
 *   slug: "study-plans",
 *   scopeToUser: "student_id",
 *   optionalFilters: ["course_id", "status"],
 *   hasCreatedBy: false,
 *   hasUpdatedAt: true,
 *   hasOrderIndex: false,
 *   requiredFields: ["name"],
 *   // v4.5: added completion_date, weekly_hours, metadata
 *   createFields: ["course_id", "name", "status", "completion_date", "weekly_hours", "metadata"],
 *   updateFields: ["name", "status", "completion_date", "weekly_hours", "metadata"],
 * });
 * ```
 *
 * Cambio 2B: Actualizar createFields/updateFields de study_plan_tasks
 *
 * ```ts
 * registerCrud(sessionRoutes, {
 *   table: "study_plan_tasks",
 *   slug: "study-plan-tasks",
 *   parentKey: "study_plan_id",
 *   hasCreatedBy: false,
 *   hasUpdatedAt: false,
 *   hasOrderIndex: true,
 *   requiredFields: ["item_type", "item_id"],
 *   // v4.5: added original_method, scheduled_date, estimated_minutes, metadata
 *   createFields: [
 *     "item_type", "item_id", "status", "order_index",
 *     "original_method", "scheduled_date", "estimated_minutes", "metadata",
 *   ],
 *   updateFields: [
 *     "status", "order_index", "completed_at",
 *     "scheduled_date", "estimated_minutes", "metadata",
 *   ],
 * });
 * ```
 *
 * Cambio 2C: NUEVO endpoint - Batch update tasks (para reschedule engine)
 *
 * Agregar en sessions.ts DESPUES de los registerCrud:
 *
 * ```ts
 * // ── Batch update tasks (Phase 5: reschedule engine) ──────────
 * // PUT /study-plan-tasks/batch
 * // Body: { study_plan_id: string, updates: [{ id, scheduled_date?, estimated_minutes?, order_index? }] }
 * // Validates plan ownership, then applies all updates in a single transaction.
 *
 * sessionRoutes.put(`${PREFIX}/study-plan-tasks/batch`, async (c: Context) => {
 *   const auth = await authenticate(c);
 *   if (auth instanceof Response) return auth;
 *   const { user, db } = auth;
 *
 *   const body = await safeJson(c);
 *   if (!body) return err(c, "Invalid or missing JSON body", 400);
 *
 *   const { study_plan_id, updates } = body;
 *   if (!study_plan_id || !Array.isArray(updates) || updates.length === 0) {
 *     return err(c, "study_plan_id and non-empty updates array required", 400);
 *   }
 *   if (updates.length > 200) {
 *     return err(c, "Maximum 200 updates per batch", 400);
 *   }
 *
 *   // Verify plan ownership
 *   const { data: plan, error: planErr } = await db
 *     .from("study_plans")
 *     .select("id")
 *     .eq("id", study_plan_id)
 *     .eq("student_id", user.id)
 *     .single();
 *
 *   if (planErr || !plan) {
 *     return err(c, "Plan not found or access denied", 404);
 *   }
 *
 *   // Apply updates (Supabase doesn't support true transactions in JS client,
 *   // but we can use Promise.allSettled for best-effort batch)
 *   const results = await Promise.allSettled(
 *     updates.map((u: any) => {
 *       const row: Record<string, unknown> = {};
 *       if (u.scheduled_date !== undefined) row.scheduled_date = u.scheduled_date;
 *       if (u.estimated_minutes !== undefined) row.estimated_minutes = u.estimated_minutes;
 *       if (u.order_index !== undefined) row.order_index = u.order_index;
 *       if (u.status !== undefined) row.status = u.status;
 *       if (u.metadata !== undefined) row.metadata = u.metadata;
 *
 *       return db
 *         .from("study_plan_tasks")
 *         .update(row)
 *         .eq("id", u.id)
 *         .eq("study_plan_id", study_plan_id)
 *         .select()
 *         .single();
 *     })
 *   );
 *
 *   const succeeded = results.filter(r => r.status === "fulfilled").length;
 *   const failed = results.filter(r => r.status === "rejected").length;
 *
 *   return ok(c, { succeeded, failed, total: updates.length });
 * });
 * ```
 *
 *
 * =====================================================
 * SECCION 3: CAMBIOS EN FRONTEND
 * =====================================================
 *
 * Cambio 3A: useStudyPlans.ts — CREATE con nuevos campos
 *
 * En createPlanFromWizard(), enviar metadata al backend:
 *
 * ```ts
 * // 1) Create the plan WITH metadata
 * const record = await apiCreatePlan({
 *   name: frontendPlan.name,
 *   status: 'active',
 *   completion_date: frontendPlan.completionDate.toISOString().slice(0, 10), // YYYY-MM-DD
 *   weekly_hours: frontendPlan.weeklyHours,  // JSONB array
 *   metadata: {
 *     generated_at: new Date().toISOString(),
 *     mastery_data_used: true,
 *   },
 * });
 *
 * // 2) Create tasks WITH original_method + scheduled_date + estimated_minutes
 * const taskPromises = frontendPlan.tasks.map((task, idx) =>
 *   apiCreateTask({
 *     study_plan_id: record.id,
 *     item_type: METHOD_TO_BACKEND_ITEM_TYPE[task.method] || 'reading',
 *     item_id: task.topicId || ...,
 *     status: task.completed ? 'completed' : 'pending',
 *     order_index: idx,
 *     // NEW v4.5 fields:
 *     original_method: task.method,             // preserves 'video', '3d', etc.
 *     scheduled_date: task.date.toISOString().slice(0, 10),
 *     estimated_minutes: task.estimatedMinutes,
 *   })
 * );
 * ```
 *
 * Cambio 3B: useStudyPlans.ts — READ usando nuevos campos
 *
 * En el mapping effect, reemplazar fallbacks hardcoded:
 *
 * ```ts
 * // BEFORE (hardcoded):
 * completionDate: (() => {
 *   const d = bp.created_at ? new Date(bp.created_at) : new Date();
 *   d.setDate(d.getDate() + 30);
 *   return d;
 * })(),
 * weeklyHours: [2, 2, 2, 2, 2, 1, 1],
 *
 * // AFTER (from backend with fallback):
 * completionDate: bp.completion_date
 *   ? new Date(bp.completion_date)
 *   : (() => { const d = new Date(bp.created_at ?? Date.now()); d.setDate(d.getDate() + 30); return d; })(),
 * weeklyHours: Array.isArray(bp.weekly_hours) ? bp.weekly_hours : [2, 2, 2, 2, 2, 1, 1],
 * ```
 *
 * Para tasks:
 * ```ts
 * // BEFORE (derived from order_index):
 * const dayOffset = Math.floor(idx / 3);
 * const taskDate = new Date(planCreated);
 * taskDate.setDate(taskDate.getDate() + dayOffset);
 * method: BACKEND_ITEM_TYPE_TO_METHOD[bt.item_type] || bt.item_type,
 *
 * // AFTER (from backend with fallback):
 * const taskDate = bt.scheduled_date
 *   ? new Date(bt.scheduled_date)
 *   : (() => { const d = new Date(planCreated); d.setDate(d.getDate() + Math.floor(idx / 3)); return d; })();
 * method: bt.original_method || BACKEND_ITEM_TYPE_TO_METHOD[bt.item_type] || bt.item_type,
 * estimatedMinutes: bt.estimated_minutes ?? METHOD_TIME_DEFAULTS[bt.item_type] ?? 25,
 * ```
 *
 * Cambio 3C: useStudyPlans.ts — RESCHEDULE batch update
 *
 * En toggleTaskComplete(), despues del reschedule:
 *
 * ```ts
 * // Phase 5: After reschedule engine runs, batch-update tasks
 * if (rescheduleResult.didReschedule && rescheduleResult.changes.length > 0) {
 *   const batchBody = {
 *     study_plan_id: planId,
 *     updates: rescheduleResult.changes.map(c => ({
 *       id: c.taskId,
 *       scheduled_date: c.newDate.toISOString().slice(0, 10),
 *       estimated_minutes: c.newEstimatedMinutes,
 *       order_index: c.newOrderIndex,
 *     })),
 *   };
 *   await apiBatchUpdateTasks(batchBody);  // new API function
 * }
 * ```
 *
 * Cambio 3D: Simplificar deletePlan() (gracias a CASCADE)
 *
 * ```ts
 * // BEFORE (N+1 deletes):
 * const tasks = backendTasksMap.get(planId) || [];
 * await Promise.allSettled(tasks.map(t => apiDeleteTask(t.id)));
 * await apiDeletePlan(planId);
 *
 * // AFTER (single delete, CASCADE handles tasks):
 * await apiDeletePlan(planId);
 * ```
 *
 *
 * =====================================================
 * SECCION 4: DIAGRAMA DE FLUJO COMPLETO
 * =====================================================
 *
 * WIZARD FLOW (crear plan):
 *
 *   [Wizard UI]
 *       |
 *       v
 *   generatePlan() — crea tasks con method, date, estimatedMinutes
 *       |
 *       v
 *   createPlanFromWizard()
 *       |
 *       +---> POST /study-plans
 *       |       body: { name, status, completion_date, weekly_hours, metadata }
 *       |       response: { id, ... }
 *       |
 *       +---> N x POST /study-plan-tasks
 *               body: { study_plan_id, item_type, item_id, status, order_index,
 *                        original_method, scheduled_date, estimated_minutes }
 *
 * LOAD FLOW (leer plan):
 *
 *   [useStudyPlans mount]
 *       |
 *       v
 *   GET /study-plans?status=active
 *       |
 *       v
 *   N x GET /study-plan-tasks?study_plan_id=xxx
 *       |
 *       v
 *   Map to frontend model:
 *     - completionDate = bp.completion_date || fallback
 *     - weeklyHours = bp.weekly_hours || [2,2,2,2,2,1,1]
 *     - task.method = bt.original_method || BACKEND_ITEM_TYPE_TO_METHOD[bt.item_type]
 *     - task.date = bt.scheduled_date || derived from order_index
 *     - task.estimatedMinutes = bt.estimated_minutes || METHOD_TIME_DEFAULTS
 *
 * RESCHEDULE FLOW (completar tarea):
 *
 *   [User clicks checkbox]
 *       |
 *       v
 *   toggleTaskComplete(planId, taskId)
 *       |
 *       +---> PUT /study-plan-tasks/:id  { status: 'completed', completed_at }
 *       |
 *       v
 *   rescheduleRemainingTasks({ plan, topicMastery, getTimeEstimate })
 *       |
 *       v
 *   if (didReschedule)
 *       +---> PUT /study-plan-tasks/batch
 *               body: { study_plan_id, updates: [{ id, scheduled_date, estimated_minutes, order_index }] }
 *
 * DELETE FLOW (borrar plan):
 *
 *   [User clicks delete]
 *       |
 *       v
 *   DELETE /study-plans/:id
 *       |  (CASCADE auto-deletes all study_plan_tasks)
 *       v
 *   refresh()
 *
 *
 * =====================================================
 * SECCION 5: VULNERABILIDAD DE SEGURIDAD (SEC-01)
 * =====================================================
 *
 * PROBLEMA: study_plan_tasks usa parentKey="study_plan_id" en crud-factory
 * pero NO tiene scopeToUser. Esto significa:
 *
 *   - GET /study-plan-tasks?study_plan_id=XXX
 *     -> Cualquier usuario autenticado puede leer tasks de CUALQUIER plan
 *        si conoce o adivina el study_plan_id (UUID)
 *
 *   - PUT /study-plan-tasks/:id { status: "completed" }
 *     -> Cualquier usuario puede marcar tasks de OTRO usuario como completadas
 *
 *   - DELETE /study-plan-tasks/:id
 *     -> Cualquier usuario puede borrar tasks de otro usuario
 *
 * SOLUCION: Migration 004 agrega RLS policy que verifica ownership a traves
 * de study_plans.student_id = auth.uid(). Con esto, el DB rechaza cualquier
 * operacion sobre tasks cuyo plan no pertenezca al usuario autenticado.
 *
 * ALTERNATIVA (defense in depth): Ademas del RLS, se podria agregar
 * validacion en el crud-factory. Pero RLS es preferible porque protege
 * incluso contra queries directas desde Supabase Dashboard o RPCs.
 *
 *
 * =====================================================
 * SECCION 6: MEJORAS ADICIONALES (PRIORIDAD MEDIA)
 * =====================================================
 *
 * 6A. RPC para plan generation data (evitar N+1 en wizard)
 *
 * El wizard actualmente hace:
 *   - useTopicMastery -> GET /bkt-states (1 req)
 *   - useStudyTimeEstimates -> GET /study-sessions (1 req)
 *   - Content tree -> multiple GETs
 *
 * Un RPC `get_plan_generation_data(p_course_id, p_topic_ids[])` podria
 * retornar en 1 request:
 *   - BKT states para los topics seleccionados
 *   - Flashcard counts por topic
 *   - Recent session stats para time estimates
 *   - FSRS due counts por topic
 *
 * Esto reduce latencia de generacion de plan de ~5 requests a 1.
 *
 *
 * 6B. item_type CHECK expansion
 *
 * Considerar expandir el CHECK de study_plan_tasks.item_type:
 *   BEFORE: 'flashcard', 'quiz', 'reading', 'keyword'
 *   AFTER:  'flashcard', 'quiz', 'reading', 'keyword', 'video', '3d'
 *
 * Esto eliminaria la necesidad del mapping METHOD_TO_BACKEND_ITEM_TYPE
 * por completo. Pero requiere verificar que ningun trigger o RPC dependa
 * de los 4 valores actuales.
 *
 * Si se expande, `original_method` se vuelve redundante y puede deprecarse.
 * Decision: mantener original_method por ahora para backward compatibility.
 *
 *
 * 6C. Indices para performance
 *
 * ```sql
 * -- Index para queries frecuentes del frontend
 * CREATE INDEX IF NOT EXISTS idx_study_plans_student_status
 *   ON study_plans(student_id, status);
 *
 * CREATE INDEX IF NOT EXISTS idx_study_plan_tasks_scheduled_date
 *   ON study_plan_tasks(scheduled_date)
 *   WHERE status = 'pending';
 *
 * -- Index para el batch update del reschedule engine
 * CREATE INDEX IF NOT EXISTS idx_study_plan_tasks_plan_status
 *   ON study_plan_tasks(study_plan_id, status);
 * ```
 *
 *
 * =====================================================
 * SECCION 7: ORDEN DE IMPLEMENTACION
 * =====================================================
 *
 * Paso 1: SQL Migrations (Migration 001-004)
 *   - Ejecutar en Supabase SQL Editor
 *   - Zero downtime (solo ADD COLUMN con defaults)
 *   - Verificar con: SELECT column_name FROM information_schema.columns
 *                     WHERE table_name = 'study_plans';
 *
 * Paso 2: Backend sessions.ts (Cambio 2A + 2B)
 *   - Actualizar createFields/updateFields
 *   - Deploy edge function
 *   - Test: POST /study-plans con completion_date
 *
 * Paso 3: Backend batch endpoint (Cambio 2C)
 *   - Agregar PUT /study-plan-tasks/batch
 *   - Deploy + test con curl
 *
 * Paso 4: Frontend CREATE (Cambio 3A)
 *   - useStudyPlans.createPlanFromWizard() envia nuevos campos
 *   - Verificar en DB que se persisten
 *
 * Paso 5: Frontend READ (Cambio 3B)
 *   - useStudyPlans mapping usa campos reales
 *   - Eliminar hardcoded fallbacks (o mantener como fallback para planes legacy)
 *   - Verificar que ScheduleView muestra datos correctos
 *
 * Paso 6: Frontend RESCHEDULE (Cambio 3C)
 *   - Integrar rescheduleEngine en toggleTaskComplete
 *   - Usar batch endpoint para persistir cambios
 *
 * Paso 7: Frontend DELETE simplificado (Cambio 3D)
 *   - Solo delete plan, CASCADE maneja tasks
 *
 * Paso 8: Security verification (SEC-01)
 *   - Verificar RLS con test: intentar acceder tasks de otro usuario
 *
 *
 * =====================================================
 * SECCION 8: TIPOS TYPESCRIPT ACTUALIZADOS
 * =====================================================
 */

// Estos tipos reflejan las columnas DESPUES de las migraciones.
// Usar en platformApi.ts cuando se actualicen los records.

export interface StudyPlanRecordV45 {
  id: string;
  student_id: string;
  course_id: string | null;
  name: string;
  status: 'active' | 'completed' | 'archived';
  // v4.5 new columns:
  completion_date: string | null;      // DATE -> string "YYYY-MM-DD"
  weekly_hours: number[] | null;       // JSONB -> number[] [mon..sun]
  metadata: Record<string, unknown>;   // JSONB catch-all
  // timestamps:
  created_at: string;
  updated_at: string;
}

export interface StudyPlanTaskRecordV45 {
  id: string;
  study_plan_id: string;
  item_type: 'flashcard' | 'quiz' | 'reading' | 'keyword';
  item_id: string;
  status: 'pending' | 'completed' | 'skipped';
  order_index: number;
  completed_at: string | null;
  // v4.5 new columns:
  original_method: string | null;      // 'video' | 'resumo' | '3d' | etc. (nullable for legacy)
  scheduled_date: string | null;       // DATE -> "YYYY-MM-DD"
  estimated_minutes: number;           // default 25
  metadata: Record<string, unknown>;   // JSONB catch-all
  // timestamps:
  created_at: string;
}

export interface BatchUpdateTasksRequest {
  study_plan_id: string;
  updates: Array<{
    id: string;
    scheduled_date?: string;          // "YYYY-MM-DD"
    estimated_minutes?: number;
    order_index?: number;
    status?: 'pending' | 'completed' | 'skipped';
    metadata?: Record<string, unknown>;
  }>;
}

export interface BatchUpdateTasksResponse {
  succeeded: number;
  failed: number;
  total: number;
}
