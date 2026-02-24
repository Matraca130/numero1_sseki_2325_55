// ============================================================
// Axon — Platform API Service (Frontend -> Real Backend)
// Covers: institutions, members, plans, subscriptions, admin
// scopes, access rules, courses, summaries, keywords,
// flashcards, reviews.
// Content tree CRUD (semesters/sections/topics) → contentTreeApi.ts
//
// Uses centralized config from apiConfig.ts
// ============================================================

import { realRequest, REAL_BACKEND_URL, getRealToken, ApiError, publicAnonKey } from '@/app/services/apiConfig';
import type {
  UUID,
  ApiResponse,
  Institution,
  InstitutionDashboardStats,
  MemberListItem,
  CreateMemberPayload,
  PlatformPlan,
  InstitutionPlan,
  InstitutionSubscription,
  AdminScope,
  PlanAccessRule,
  AccessCheckResult,
  Course,
  Summary,
  SummaryStatus,
  Keyword,
  MembershipRole,
  ISODate,
} from '@/app/types/platform';

// Re-export error class from config for backward compatibility
export { ApiError as PlatformApiError } from '@/app/services/apiConfig';

// Use centralized request helper
const request = realRequest;

// ── CRUD factory response unwrapper ───────────────────────
// Backend list endpoints using CRUD factory return:
//   { data: { items: [...], total: N, limit: N, offset: N } }
// After realRequest unwraps { data: X }, we get X = { items, ... }.
// This helper safely extracts the array from either format.
function extractItems<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object' && 'items' in result) {
    return (result as { items: T[] }).items;
  }
  return [];
}

// ============================================================
// INSTITUTIONS
// ============================================================

export async function getInstitutions(): Promise<Institution[]> {
  return request<Institution[]>('/institutions');
}

export async function getInstitution(instId: UUID): Promise<Institution> {
  return request<Institution>(`/institutions/${instId}`);
}

export async function getInstitutionBySlug(slug: string): Promise<Institution> {
  return request<Institution>(`/institutions/by-slug/${slug}`);
}

export async function checkSlugAvailability(slug: string): Promise<{ available: boolean; suggestion?: string }> {
  return request(`/institutions/check-slug/${slug}`);
}

export async function getInstitutionDashboardStats(instId: UUID): Promise<InstitutionDashboardStats> {
  // This endpoint does NOT exist on the backend.
  // Stats are computed client-side from memberships, courses, plans.
  // We fetch memberships + institution to build a best-effort stats object.
  try {
    const [members, institution] = await Promise.allSettled([
      request<any[]>(`/memberships?institution_id=${instId}`),
      request<Institution>(`/institutions/${instId}`),
    ]);

    const memberList: any[] = members.status === 'fulfilled' ? (Array.isArray(members.value) ? members.value : []) : [];
    const inst = institution.status === 'fulfilled' ? institution.value : null;

    const membersByRole: Record<string, number> = {};
    let activeStudents = 0;
    let inactiveMembers = 0;
    for (const m of memberList) {
      const role = m.role || 'student';
      membersByRole[role] = (membersByRole[role] || 0) + 1;
      if (role === 'student' && m.is_active !== false) activeStudents++;
      if (m.is_active === false) inactiveMembers++;
    }

    return {
      institutionName: inst?.name || '',
      hasInstitution: !!inst,
      totalMembers: memberList.length,
      totalPlans: 0, // Will be set by plans fetch if needed
      activeStudents,
      inactiveMembers,
      membersByRole,
      subscription: null,
    };
  } catch {
    // Return empty stats on any error
    return {
      institutionName: '',
      hasInstitution: false,
      totalMembers: 0,
      totalPlans: 0,
      activeStudents: 0,
      inactiveMembers: 0,
      membersByRole: {},
      subscription: null,
    };
  }
}

export async function createInstitution(data: {
  name: string;
  slug: string;
  logo_url?: string;
  settings?: Record<string, any>;
}): Promise<Institution> {
  return request<Institution>('/institutions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateInstitution(instId: UUID, data: Partial<Institution>): Promise<Institution> {
  return request<Institution>(`/institutions/${instId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteInstitution(instId: UUID): Promise<{ id: UUID; is_active: boolean }> {
  return request(`/institutions/${instId}`, { method: 'DELETE' });
}

// ============================================================
// MEMBERS (Memberships — flat routes per backend spec)
// GET    /memberships?institution_id=xxx → { data: [...] }
// GET    /memberships/:id               → { data: { ... } }
// POST   /memberships { user_id|email, institution_id, role, institution_plan_id? }
// PUT    /memberships/:id { role?, institution_plan_id?, is_active? }
// DELETE /memberships/:id               → soft-deactivate
// ============================================================

export async function getMembers(institutionId: UUID): Promise<MemberListItem[]> {
  return request<MemberListItem[]>(`/memberships?institution_id=${institutionId}`);
}

export async function getMember(memberId: UUID): Promise<MemberListItem> {
  return request<MemberListItem>(`/memberships/${memberId}`);
}

export async function createMember(data: CreateMemberPayload): Promise<MemberListItem> {
  return request<MemberListItem>('/memberships', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function changeMemberRole(memberId: UUID, role: MembershipRole): Promise<MemberListItem> {
  return request<MemberListItem>(`/memberships/${memberId}`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export async function changeMemberPlan(memberId: UUID, institutionPlanId: UUID | null): Promise<MemberListItem> {
  return request<MemberListItem>(`/memberships/${memberId}`, {
    method: 'PUT',
    body: JSON.stringify({ institution_plan_id: institutionPlanId }),
  });
}

export async function toggleMemberActive(memberId: UUID, isActive: boolean): Promise<MemberListItem> {
  return request<MemberListItem>(`/memberships/${memberId}`, {
    method: 'PUT',
    body: JSON.stringify({ is_active: isActive }),
  });
}

export async function deleteMember(memberId: UUID): Promise<{ id: UUID; is_active: boolean }> {
  return request(`/memberships/${memberId}`, { method: 'DELETE' });
}

// ============================================================
// PLATFORM PLANS (Axon sells to institutions)
// ============================================================

export async function getPlatformPlans(includeInactive = false): Promise<PlatformPlan[]> {
  const qs = includeInactive ? '?include_inactive=true' : '';
  return request<PlatformPlan[]>(`/platform-plans${qs}`);
}

export async function getPlatformPlan(id: UUID): Promise<PlatformPlan> {
  return request<PlatformPlan>(`/platform-plans/${id}`);
}

export async function createPlatformPlan(data: Partial<PlatformPlan>): Promise<PlatformPlan> {
  return request<PlatformPlan>('/platform-plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePlatformPlan(id: UUID, data: Partial<PlatformPlan>): Promise<PlatformPlan> {
  return request<PlatformPlan>(`/platform-plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePlatformPlan(id: UUID): Promise<{ id: UUID; is_active: boolean }> {
  return request(`/platform-plans/${id}`, { method: 'DELETE' });
}

// ============================================================
// INSTITUTION PLANS (institutions sell to students)
// GET  /institution-plans?institution_id=xxx → { data: { items: [...] } }
// POST /institution-plans { institution_id, name, ... }
// PUT  /institution-plans/:id { name?, ... }
// DELETE /institution-plans/:id
// ============================================================

export async function getInstitutionPlans(instId: UUID, includeInactive = false): Promise<InstitutionPlan[]> {
  const params = new URLSearchParams();
  params.set('institution_id', instId);
  if (includeInactive) params.set('include_inactive', 'true');
  const result = await request<unknown>(`/institution-plans?${params}`);
  return extractItems<InstitutionPlan>(result);
}

export async function getInstitutionPlan(id: UUID): Promise<InstitutionPlan> {
  return request<InstitutionPlan>(`/institution-plans/${id}`);
}

export async function createInstitutionPlan(data: {
  institution_id: UUID;
  name: string;
  description?: string;
  price_cents?: number;
  billing_cycle?: string;
  is_default?: boolean;
}): Promise<InstitutionPlan> {
  return request<InstitutionPlan>('/institution-plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateInstitutionPlan(id: UUID, data: Partial<InstitutionPlan>): Promise<InstitutionPlan> {
  return request<InstitutionPlan>(`/institution-plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteInstitutionPlan(id: UUID): Promise<{ id: UUID; is_active: boolean }> {
  return request(`/institution-plans/${id}`, { method: 'DELETE' });
}

export async function setDefaultInstitutionPlan(id: UUID): Promise<InstitutionPlan> {
  return request<InstitutionPlan>(`/institution-plans/${id}/set-default`, {
    method: 'PATCH',
  });
}

// ============================================================
// SUBSCRIPTIONS
// GET  /institution-subscriptions?institution_id=xxx → { data: { items: [...] } }
// POST /institution-subscriptions { institution_id, plan_id, ... }
// PUT  /institution-subscriptions/:id { plan_id?, status?, ... }
// DELETE /institution-subscriptions/:id
// ============================================================

export async function getInstitutionSubscriptions(instId: UUID): Promise<InstitutionSubscription[]> {
  const result = await request<unknown>(`/institution-subscriptions?institution_id=${instId}`);
  return extractItems<InstitutionSubscription>(result);
}

/** @deprecated Use getInstitutionSubscriptions for the full list */
export async function getInstitutionSubscription(instId: UUID): Promise<InstitutionSubscription | null> {
  const list = await getInstitutionSubscriptions(instId);
  return list.find(s => s.status === 'active') ?? list[0] ?? null;
}

export async function getSubscription(id: UUID): Promise<InstitutionSubscription> {
  return request<InstitutionSubscription>(`/institution-subscriptions/${id}`);
}

export async function createSubscription(data: {
  institution_id: UUID;
  plan_id: UUID;
  status?: string;
  current_period_start?: string;
  current_period_end?: string;
}): Promise<InstitutionSubscription> {
  return request<InstitutionSubscription>('/institution-subscriptions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSubscription(id: UUID, data: Partial<InstitutionSubscription>): Promise<InstitutionSubscription> {
  return request<InstitutionSubscription>(`/institution-subscriptions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function cancelSubscription(id: UUID): Promise<{ id: UUID; status: string }> {
  return request(`/institution-subscriptions/${id}`, { method: 'DELETE' });
}

// ============================================================
// ADMIN SCOPES (flat routes per backend spec)
// GET    /admin-scopes?membership_id=xxx → { data: [...] }
// POST   /admin-scopes { membership_id, scope_type, scope_id? }
// DELETE /admin-scopes/:id              → hard delete
// ============================================================

export async function getAdminScopes(membershipId: UUID): Promise<AdminScope[]> {
  return request<AdminScope[]>(`/admin-scopes?membership_id=${membershipId}`);
}

export async function getAdminScope(id: UUID): Promise<AdminScope> {
  return request<AdminScope>(`/admin-scopes/${id}`);
}

export async function createAdminScope(data: {
  membership_id: UUID;
  scope_type: 'full' | 'course' | 'semester' | 'section';
  scope_id?: UUID;
}): Promise<AdminScope> {
  return request<AdminScope>('/admin-scopes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteAdminScope(id: UUID): Promise<{ id: UUID; deleted: boolean }> {
  return request(`/admin-scopes/${id}`, { method: 'DELETE' });
}

// ============================================================
// ACCESS RULES (flat routes per backend spec)
// GET    /plan-access-rules?plan_id=xxx → { data: { items: [...] } }
// POST   /plan-access-rules { plan_id, scope_type, scope_id }
// PUT    /plan-access-rules/:id { scope_type?, scope_id? }
// DELETE /plan-access-rules/:id → hard delete
// ============================================================

export async function getPlanAccessRules(planId: UUID): Promise<PlanAccessRule[]> {
  const result = await request<unknown>(`/plan-access-rules?plan_id=${planId}`);
  return extractItems<PlanAccessRule>(result);
}

export async function createAccessRule(data: {
  plan_id: UUID;
  scope_type: string;
  scope_id: UUID;
}): Promise<PlanAccessRule> {
  return request<PlanAccessRule>('/plan-access-rules', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAccessRule(id: UUID, data: {
  scope_type?: string;
  scope_id?: UUID;
}): Promise<PlanAccessRule> {
  return request<PlanAccessRule>(`/plan-access-rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAccessRule(id: UUID): Promise<{ id: UUID; deleted: boolean }> {
  return request(`/plan-access-rules/${id}`, { method: 'DELETE' });
}

export async function checkAccess(
  userId: UUID,
  scopeType: string,
  scopeId: UUID,
  institutionId: UUID
): Promise<AccessCheckResult> {
  return request<AccessCheckResult>(
    `/check-access/${userId}/${scopeType}/${scopeId}?institution_id=${institutionId}`
  );
}

// ============================================================
// CONTENT — Courses
// NOTE: Semester/Section/Topic CRUD is handled by contentTreeApi.ts
// (flat routes: /semesters, /sections, /topics with query params).
// Do NOT duplicate here — those old nested routes were removed.
// ============================================================

export async function getCourses(institutionId?: UUID): Promise<Course[]> {
  const qs = institutionId ? `?institution_id=${institutionId}` : '';
  return request<Course[]>(`/courses${qs}`);
}

export async function createCourse(data: {
  name: string;
  institution_id: UUID;
  description?: string;
  color?: string;
}): Promise<Course> {
  return request<Course>('/courses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCourse(courseId: UUID, data: Partial<Course>): Promise<Course> {
  return request<Course>(`/courses/${courseId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCourse(courseId: UUID): Promise<void> {
  return request(`/courses/${courseId}`, { method: 'DELETE' });
}

// ============================================================
// CONTENT — Summaries (content summaries, professor-authored)
// ============================================================

export async function getTopicSummaries(topicId: UUID): Promise<Summary[]> {
  return request<Summary[]>(`/topics/${topicId}/summaries`);
}

export async function createSummary(topicId: UUID, data: {
  institution_id?: UUID;
  title?: string;
  content_markdown: string;
  status?: SummaryStatus;
}): Promise<Summary> {
  return request<Summary>(`/topics/${topicId}/summaries`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSummary(summaryId: UUID, data: Partial<Summary>): Promise<Summary> {
  return request<Summary>(`/summaries/${summaryId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSummary(summaryId: UUID): Promise<void> {
  return request(`/summaries/${summaryId}`, { method: 'DELETE' });
}

// ============================================================
// CONTENT — Keywords
// ============================================================

export async function getKeywords(institutionId?: UUID): Promise<Keyword[]> {
  const qs = institutionId ? `?institution_id=${institutionId}` : '';
  return request<Keyword[]>(`/keywords${qs}`);
}

export async function createKeyword(data: {
  institution_id: UUID;
  term: string;
  definition?: string;
  priority?: number;
}): Promise<Keyword> {
  return request<Keyword>('/keywords', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateKeyword(keywordId: UUID, data: Partial<Keyword>): Promise<Keyword> {
  return request<Keyword>(`/keywords/${keywordId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteKeyword(keywordId: UUID): Promise<void> {
  return request(`/keywords/${keywordId}`, { method: 'DELETE' });
}

// ============================================================
// HEALTH CHECK
// ============================================================

export async function healthCheck(): Promise<{
  status: string;
  version: string;
  migration_status: string;
  sql_routes: string[];
  kv_routes: string[];
}> {
  return request('/health');
}

// ============================================================
// ADMIN — Student Management (SQL + KV hybrid)
// NOTE: routes-admin-students.tsx must be mounted in index.ts
// for these to work. Verify deployment status.
// ============================================================

export interface AdminStudentListItem {
  membership_id: UUID;
  user_id: UUID;
  institution_id: UUID;
  is_active: boolean;
  joined_at: ISODate;
  updated_at: ISODate;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  plan: { id: UUID; name: string; is_default?: boolean } | null;
  stats: {
    total_study_minutes: number;
    total_sessions: number;
    total_cards_reviewed: number;
    total_quizzes_completed: number;
    current_streak: number;
    last_study_date: string | null;
  } | null;
  strengths_count: number;
  weaknesses_count: number;
}

export interface AdminStudentDetail extends AdminStudentListItem {
  role: MembershipRole;
  stats: any;
  course_progress: any[];
  daily_activity: any[];
  learning_profile: any | null;
}

export interface PaginatedResponse<T> {
  data: T;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export async function getAdminStudents(
  institutionId: UUID,
  options?: { page?: number; limit?: number; sort?: string; order?: 'asc' | 'desc' }
): Promise<PaginatedResponse<AdminStudentListItem[]>> {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.sort) params.set('sort', options.sort);
  if (options?.order) params.set('order', options.order);
  const qs = params.toString() ? `?${params}` : '';

  // This endpoint may return { data, pagination } — handle specially
  const url = `${REAL_BACKEND_URL}/admin/students/${institutionId}${qs}`;
  const token = getRealToken();
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
      ...(token ? { 'X-Access-Token': token } : {}),
    },
  });
  const body = await res.json();
  if (!res.ok || body?.error) {
    throw new ApiError(
      body?.error || `API error ${res.status}`,
      'API_ERROR',
      res.status
    );
  }
  return { data: body.data, pagination: body.pagination };
}

export async function searchAdminStudents(
  institutionId: UUID,
  query: string
): Promise<AdminStudentListItem[]> {
  return request<AdminStudentListItem[]>(
    `/admin/students/${institutionId}/search?q=${encodeURIComponent(query)}`
  );
}

export async function getAdminStudentDetail(
  institutionId: UUID,
  userId: UUID
): Promise<AdminStudentDetail> {
  return request<AdminStudentDetail>(`/admin/students/${institutionId}/${userId}`);
}

export async function toggleStudentStatus(
  memberId: UUID,
  isActive: boolean
): Promise<any> {
  return request(`/admin/students/${memberId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  });
}

export async function changeStudentPlan(
  memberId: UUID,
  institutionPlanId: UUID | null
): Promise<any> {
  return request(`/admin/students/${memberId}/plan`, {
    method: 'PATCH',
    body: JSON.stringify({ institution_plan_id: institutionPlanId }),
  });
}

// ============================================================
// FLASHCARDS — Professor Management (KV-based on real backend)
// ============================================================

export interface FlashcardCard {
  id: UUID;
  summary_id: UUID;
  keyword_id: UUID;
  subtopic_id?: UUID;
  institution_id?: UUID;
  front: string;
  back: string;
  image_url?: string | null;
  status: 'draft' | 'published' | 'active' | 'suspended' | 'deleted';
  source: 'ai' | 'manual' | 'imported' | 'professor';
  created_by?: string;
  created_at: ISODate;
}

export async function getFlashcardsBySummary(summaryId: UUID): Promise<FlashcardCard[]> {
  return request<FlashcardCard[]>(`/summaries/${summaryId}/flashcards`);
}

export async function getFlashcardsByKeyword(keywordId: UUID): Promise<FlashcardCard[]> {
  return request<FlashcardCard[]>(`/keywords/${keywordId}/flashcards`);
}

export async function getFlashcard(cardId: UUID): Promise<FlashcardCard> {
  return request<FlashcardCard>(`/flashcards/${cardId}`);
}

export async function createFlashcard(data: Partial<FlashcardCard>): Promise<FlashcardCard> {
  return request<FlashcardCard>('/flashcards', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateFlashcard(cardId: UUID, data: Partial<FlashcardCard>): Promise<FlashcardCard> {
  return request<FlashcardCard>(`/flashcards/${cardId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteFlashcard(cardId: UUID): Promise<void> {
  return request(`/flashcards/${cardId}`, { method: 'DELETE' });
}

// ============================================================
// REVIEWS & SPACED REPETITION (KV-based on real backend)
// ============================================================

export interface ReviewRequest {
  session_id: UUID;
  item_id: UUID;
  instrument_type: 'flashcard' | 'quiz';
  subtopic_id: UUID;
  keyword_id: UUID;
  grade: 1 | 2 | 3 | 4;
  response_time_ms?: number;
}

export interface ReviewResponse {
  review_log: any;
  updated_bkt: any;
  updated_card_fsrs: any | null;
  feedback: {
    delta_before: number;
    delta_after: number;
    color_before: string;
    color_after: string;
    mastery: number;
    stability: number | null;
    next_due: string | null;
  };
}

export async function submitReview(data: ReviewRequest): Promise<ReviewResponse> {
  return request<ReviewResponse>('/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getBktStates(options?: {
  subtopic_id?: UUID;
  keyword_id?: UUID;
}): Promise<any> {
  const params = new URLSearchParams();
  if (options?.subtopic_id) params.set('subtopic_id', options.subtopic_id);
  if (options?.keyword_id) params.set('keyword_id', options.keyword_id);
  const qs = params.toString() ? `?${params}` : '';
  return request(`/bkt${qs}`);
}

export async function getFsrsStates(cardId?: UUID): Promise<any> {
  const qs = cardId ? `?card_id=${cardId}` : '';
  return request(`/fsrs${qs}`);
}

// ============================================================
// STUDY SESSIONS (flat routes per backend spec)
// POST /study-sessions { ... }
// PATCH /study-sessions/:id { ... }
// ============================================================

export async function createStudySession(data: Record<string, any>): Promise<any> {
  return request('/study-sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateStudySession(id: string, data: Record<string, any>): Promise<any> {
  return request(`/study-sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ============================================================
// AI GENERATIONS (immutable log)
// GET  /ai-generations?institution_id=xxx&generation_type=xxx&limit=50&offset=0
//      → { data: [...] } (array plano)
// POST /ai-generations { institution_id, generation_type, ... }
// ============================================================

export interface AIGeneration {
  id: UUID;
  institution_id: UUID;
  generation_type: string;
  source_summary_id?: UUID | null;
  source_keyword_id?: UUID | null;
  items_generated?: number | null;
  model_used?: string | null;
  created_at: ISODate;
}

export async function getAIGenerations(
  institutionId: UUID,
  options?: { generation_type?: string; limit?: number; offset?: number }
): Promise<AIGeneration[]> {
  const params = new URLSearchParams();
  params.set('institution_id', institutionId);
  if (options?.generation_type) params.set('generation_type', options.generation_type);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  return request<AIGeneration[]>(`/ai-generations?${params}`);
}

export async function createAIGeneration(data: {
  institution_id: UUID;
  generation_type: string;
  source_summary_id?: UUID;
  source_keyword_id?: UUID;
  items_generated?: number;
  model_used?: string;
}): Promise<AIGeneration> {
  return request<AIGeneration>('/ai-generations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================
// SUMMARY DIAGNOSTICS (immutable log)
// GET  /summary-diagnostics?summary_id=xxx&diagnostic_type=xxx
//      → { data: [...] } (array plano)
// POST /summary-diagnostics { summary_id, content, ... }
// ============================================================

export interface SummaryDiagnostic {
  id: UUID;
  summary_id: UUID;
  content: string;
  ai_generation_id?: UUID | null;
  parent_diagnostic_id?: UUID | null;
  diagnostic_type?: string | null;
  structured_data?: Record<string, any> | null;
  model_used?: string | null;
  prompt_version?: string | null;
  created_at: ISODate;
}

export async function getSummaryDiagnostics(
  summaryId: UUID,
  diagnosticType?: string
): Promise<SummaryDiagnostic[]> {
  const params = new URLSearchParams();
  params.set('summary_id', summaryId);
  if (diagnosticType) params.set('diagnostic_type', diagnosticType);
  return request<SummaryDiagnostic[]>(`/summary-diagnostics?${params}`);
}

export async function createSummaryDiagnostic(data: {
  summary_id: UUID;
  content: string;
  ai_generation_id?: UUID;
  parent_diagnostic_id?: UUID;
  diagnostic_type?: string;
  structured_data?: Record<string, any>;
  model_used?: string;
  prompt_version?: string;
}): Promise<SummaryDiagnostic> {
  return request<SummaryDiagnostic>('/summary-diagnostics', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
// ============================================================
// STUDENT STATS & DAILY ACTIVITIES (Sessão 6 - Estudo & Estatísticas)
// ============================================================
export interface DailyActivityRecord {
  id: string;
  student_id: string;
  date: string;
  [key: string]: any;
}

export interface StudentStatsRecord {
  id: string;
  student_id: string;
  [key: string]: any;
}

export interface BktStateRecord {
  id: string;
  student_id: string;
  [key: string]: any;
}

export interface StudyPlanRecord {
  id: string;
  name: string;
  student_id: string;
  course_id?: string | null;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface StudyPlanTaskRecord {
  id: string;
  study_plan_id: string;
  item_type: string;
  item_id: string;
  status: 'pending' | 'completed' | 'skipped';
  order_index: number;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export async function getStudentStatsReal(studentId: string): Promise<StudentStatsRecord | null> {
  try {
    return await request<StudentStatsRecord>(`/student-stats?student_id=${studentId}`);
  } catch {
    return null;
  }
}

export async function getDailyActivities(studentId: string): Promise<DailyActivityRecord[]> {
  try {
    const result = await request<any>(`/daily-activities?student_id=${studentId}`);
    return extractItems<DailyActivityRecord>(result);
  } catch {
    return [];
  }
}

export async function upsertStudentStats(data: Partial<StudentStatsRecord>): Promise<StudentStatsRecord> {
  return request<StudentStatsRecord>('/student-stats', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function upsertDailyActivity(data: Partial<DailyActivityRecord>): Promise<DailyActivityRecord> {
  return request<DailyActivityRecord>('/daily-activities', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getAllBktStates(studentId: string): Promise<BktStateRecord[]> {
  try {
    const result = await request<any>(`/bkt-states?student_id=${studentId}`);
    return extractItems<BktStateRecord>(result);
  } catch {
    return [];
  }
}

// ============================================================
// STUDY PLANS & TASKS (Sessão 6 - Organizador de Estudos)
// ============================================================
export async function getStudyPlans(status?: 'active' | 'completed' | 'archived'): Promise<StudyPlanRecord[]> {
  const params = status ? `?status=${status}` : '';
  try {
    const result = await request<any>(`/study-plans${params}`);
    return extractItems<StudyPlanRecord>(result);
  } catch {
    return [];
  }
}

export async function getStudyPlanTasks(studyPlanId: string): Promise<StudyPlanTaskRecord[]> {
  try {
    const result = await request<any>(`/study-plan-tasks?study_plan_id=${studyPlanId}`);
    return extractItems<StudyPlanTaskRecord>(result);
  } catch {
    return [];
  }
}

export async function createStudyPlan(data: {
  name: string;
  course_id?: string;
  status?: 'active' | 'completed' | 'archived';
}): Promise<StudyPlanRecord> {
  return request<StudyPlanRecord>('/study-plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateStudyPlan(id: string, data: Partial<StudyPlanRecord>): Promise<StudyPlanRecord> {
  return request<StudyPlanRecord>(`/study-plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteStudyPlan(id: string): Promise<void> {
  await request<void>(`/study-plans/${id}`, { method: 'DELETE' });
}

export async function createStudyPlanTask(data: Partial<StudyPlanTaskRecord>): Promise<StudyPlanTaskRecord> {
  return request<StudyPlanTaskRecord>('/study-plan-tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateStudyPlanTask(id: string, data: Partial<StudyPlanTaskRecord>): Promise<StudyPlanTaskRecord> {
  return request<StudyPlanTaskRecord>(`/study-plan-tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteStudyPlanTask(id: string): Promise<void> {
  await request<void>(`/study-plan-tasks/${id}`, { method: 'DELETE' });
}

export async function reorderItems(table: string, items: { id: string; order_index: number }[]): Promise<void> {
  await request<void>('/reorder', {
    method: 'PUT',
    body: JSON.stringify({ table, items }),
  });
}
