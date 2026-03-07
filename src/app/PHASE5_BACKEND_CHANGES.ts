/**
 * ============================================================
 * PHASE 5 — BACKEND CHANGES FOR axon-backend REPO
 * ============================================================
 *
 * File: supabase/functions/server/routes/study/sessions.ts
 * Current SHA: 2fd1de72 (post DT-02 commit 7dd47b9)
 *
 * INSTRUCTIONS:
 *   1. Execute Migration 002 + 003 in Supabase SQL Editor (see below)
 *   2. Apply Cambio A to sessions.ts (update study_plan_tasks whitelist)
 *   3. Apply Cambio B to sessions.ts (add batch endpoint)
 *   4. Deploy edge function
 *   5. Test with curl
 *
 * ============================================================
 * MIGRATION 002 — Task-level scheduling columns
 * ============================================================
 *
 * ```sql
 * ALTER TABLE study_plan_tasks
 *   ADD COLUMN IF NOT EXISTS original_method TEXT,
 *   ADD COLUMN IF NOT EXISTS scheduled_date DATE,
 *   ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 25,
 *   ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
 *
 * ALTER TABLE study_plan_tasks
 *   ADD CONSTRAINT study_plan_tasks_original_method_check
 *   CHECK (
 *     original_method IS NULL
 *     OR original_method IN ('flashcard','quiz','video','resumo','3d','reading','keyword')
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
 * ============================================================
 * MIGRATION 003 — CASCADE delete for tasks
 * ============================================================
 *
 * ```sql
 * -- Step 1: Find the actual constraint name
 * SELECT constraint_name FROM information_schema.table_constraints
 * WHERE table_name = 'study_plan_tasks' AND constraint_type = 'FOREIGN KEY';
 *
 * -- Step 2: Drop + recreate with CASCADE
 * ALTER TABLE study_plan_tasks
 *   DROP CONSTRAINT IF EXISTS study_plan_tasks_study_plan_id_fkey;
 *
 * ALTER TABLE study_plan_tasks
 *   ADD CONSTRAINT study_plan_tasks_study_plan_id_fkey
 *   FOREIGN KEY (study_plan_id) REFERENCES study_plans(id) ON DELETE CASCADE;
 * ```
 *
 * ============================================================
 * CAMBIO A — Update study_plan_tasks whitelist in registerCrud
 * ============================================================
 *
 * Find the existing registerCrud for study_plan_tasks and replace
 * createFields/updateFields:
 */

// BEFORE:
const BEFORE_TASKS_CRUD = {
  table: "study_plan_tasks",
  slug: "study-plan-tasks",
  parentKey: "study_plan_id",
  hasCreatedBy: false,
  hasUpdatedAt: false,
  hasOrderIndex: true,
  requiredFields: ["item_type", "item_id"],
  createFields: ["item_type", "item_id", "status", "order_index"],
  updateFields: ["status", "order_index", "completed_at"],
};

// AFTER:
const AFTER_TASKS_CRUD = {
  table: "study_plan_tasks",
  slug: "study-plan-tasks",
  parentKey: "study_plan_id",
  hasCreatedBy: false,
  hasUpdatedAt: false,
  hasOrderIndex: true,
  requiredFields: ["item_type", "item_id"],
  // Phase 5: added original_method, scheduled_date, estimated_minutes, metadata
  createFields: [
    "item_type", "item_id", "status", "order_index",
    "original_method", "scheduled_date", "estimated_minutes", "metadata",
  ],
  updateFields: [
    "status", "order_index", "completed_at",
    "scheduled_date", "estimated_minutes", "metadata",
  ],
};

/**
 * ============================================================
 * CAMBIO B — NEW batch endpoint (add AFTER registerCrud calls)
 * ============================================================
 *
 * This endpoint must be placed BEFORE any catch-all routes,
 * and AFTER the registerCrud calls in sessions.ts.
 *
 * IMPORTANT: The batch route `/study-plan-tasks/batch` must be
 * registered BEFORE the individual `:id` routes from registerCrud,
 * otherwise Hono will match "batch" as an :id parameter.
 * If registerCrud uses `:id`, you may need to place this BEFORE
 * the registerCrud call, or use a more specific path.
 *
 * Required imports (verify these exist in sessions.ts):
 *   - authenticate (from auth helpers)
 *   - safeJson (from helpers or inline)
 *   - ok, err (from response helpers)
 *   - PREFIX (route prefix constant)
 *   - Context (from Hono types)
 *
 * Copy this code block into sessions.ts:
 */

const BATCH_ENDPOINT_CODE = `
// ── Phase 5: Batch update tasks (reschedule engine) ──────────
// PUT /study-plan-tasks/batch
// Body: { study_plan_id: string, updates: [{ id, scheduled_date?, estimated_minutes?, order_index?, status?, metadata? }] }
// Validates plan ownership, then applies all updates.
// Max 200 updates per call.

sessionRoutes.put(\`\${PREFIX}/study-plan-tasks/batch\`, async (c: Context) => {
  const auth = await authenticate(c);
  if (auth instanceof Response) return auth;
  const { user, db } = auth;

  const body = await safeJson(c);
  if (!body) return err(c, "Invalid or missing JSON body", 400);

  const { study_plan_id, updates } = body;
  if (!study_plan_id || !Array.isArray(updates) || updates.length === 0) {
    return err(c, "study_plan_id and non-empty updates array required", 400);
  }
  if (updates.length > 200) {
    return err(c, "Maximum 200 updates per batch", 400);
  }

  // Verify plan ownership
  const { data: plan, error: planErr } = await db
    .from("study_plans")
    .select("id")
    .eq("id", study_plan_id)
    .eq("student_id", user.id)
    .single();

  if (planErr || !plan) {
    return err(c, "Plan not found or access denied", 404);
  }

  // Whitelist of updatable fields
  const ALLOWED = new Set(["scheduled_date", "estimated_minutes", "order_index", "status", "metadata"]);

  // Apply updates in parallel
  const results = await Promise.allSettled(
    updates.map((u: any) => {
      if (!u.id) return Promise.reject(new Error("Missing task id"));

      const row: Record<string, unknown> = {};
      for (const key of Object.keys(u)) {
        if (key !== "id" && ALLOWED.has(key)) {
          row[key] = u[key];
        }
      }

      if (Object.keys(row).length === 0) {
        return Promise.reject(new Error("No valid fields to update"));
      }

      return db
        .from("study_plan_tasks")
        .update(row)
        .eq("id", u.id)
        .eq("study_plan_id", study_plan_id)  // scoped to plan for safety
        .select()
        .single();
    })
  );

  const succeeded = results.filter(r => r.status === "fulfilled" && !(r.value as any)?.error).length;
  const failed = results.length - succeeded;

  return ok(c, { succeeded, failed, total: updates.length });
});
`;

/**
 * ============================================================
 * VERIFICATION AFTER DEPLOYMENT
 * ============================================================
 *
 * Test 1: Batch update (requires auth token)
 * ```bash
 * curl -X PUT https://YOUR_URL/study-plan-tasks/batch \
 *   -H "Authorization: Bearer YOUR_ANON_KEY" \
 *   -H "X-Access-Token: YOUR_JWT" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "study_plan_id": "PLAN_UUID",
 *     "updates": [
 *       { "id": "TASK_UUID_1", "scheduled_date": "2026-03-10", "estimated_minutes": 30 },
 *       { "id": "TASK_UUID_2", "scheduled_date": "2026-03-11", "order_index": 5 }
 *     ]
 *   }'
 * ```
 * Expected: { "data": { "succeeded": 2, "failed": 0, "total": 2 } }
 *
 * Test 2: Verify CASCADE works
 * ```bash
 * curl -X DELETE https://YOUR_URL/study-plans/PLAN_UUID ...
 * # Then verify tasks are gone:
 * curl https://YOUR_URL/study-plan-tasks?study_plan_id=PLAN_UUID ...
 * # Expected: empty array
 * ```
 *
 * Test 3: Create task with new fields
 * ```bash
 * curl -X POST https://YOUR_URL/study-plan-tasks \
 *   -d '{
 *     "study_plan_id": "PLAN_UUID",
 *     "item_type": "reading",
 *     "item_id": "TOPIC_UUID",
 *     "original_method": "video",
 *     "scheduled_date": "2026-03-15",
 *     "estimated_minutes": 35
 *   }'
 * ```
 * Expected: task created with all fields populated
 *
 * ============================================================
 * FRONTEND STATUS (already applied in this session)
 * ============================================================
 *
 * platformApi.ts:
 *   [x] StudyPlanTaskRecord — added original_method, scheduled_date, estimated_minutes, metadata
 *   [x] createStudyPlanTask — param accepts original_method, scheduled_date, estimated_minutes
 *   [x] updateStudyPlanTask — param accepts scheduled_date, estimated_minutes, metadata
 *   [x] NEW batchUpdateTasks — PUT /study-plan-tasks/batch
 *   [x] NEW BatchUpdateTasksPayload / BatchUpdateTasksResult types
 *
 * useStudyPlans.ts:
 *   [x] Opcion B interface: UseStudyPlansOptions { topicMastery?, getTimeEstimate? }
 *   [x] CREATE: sends original_method, scheduled_date, estimated_minutes
 *   [x] READ: uses bt.scheduled_date / bt.original_method / bt.estimated_minutes with legacy fallbacks
 *   [x] toggleTaskComplete: triggers runReschedule on completion
 *   [x] runReschedule: calls rescheduleRemainingTasks, then batch update (with individual PUT fallback)
 *   [x] DELETE: simplified to single apiDeletePlan (CASCADE handles tasks)
 *   [x] Concurrency guard: isRescheduling ref prevents overlapping reschedules
 *
 * ScheduleView.tsx:
 *   [x] Imports useTopicMastery + useStudyTimeEstimates
 *   [x] StudyPlanDashboard passes { topicMastery, getTimeEstimate } to useStudyPlans
 *
 * DashboardView.tsx:
 *   [x] Imports useTopicMastery + useStudyTimeEstimates
 *   [x] Passes { topicMastery, getTimeEstimate } to useStudyPlans
 */

export {}; // Make this a module
