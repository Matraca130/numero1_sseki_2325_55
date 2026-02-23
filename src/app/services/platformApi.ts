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
// MEMBERS
// ============================================================

export async function getMembers(institutionId: UUID): Promise<MemberListItem[]> {
  return request<MemberListItem[]>(`/memberships?institution_id=${institutionId}`);
}

export async function createMember(data: CreateMemberPayload): Promise<MemberListItem> {
  return request<MemberListItem>('/members', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function changeMemberRole(memberId: UUID, role: MembershipRole): Promise<MemberListItem> {
  return request<MemberListItem>(`/members/${memberId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function changeMemberPlan(memberId: UUID, institutionPlanId: UUID | null): Promise<MemberListItem> {
  return request<MemberListItem>(`/members/${memberId}/plan`, {
    method: 'PATCH',
    body: JSON.stringify({ institution_plan_id: institutionPlanId }),
  });
}

export async function toggleMemberActive(memberId: UUID, isActive: boolean): Promise<MemberListItem> {
  return request<MemberListItem>(`/members/${memberId}/toggle-active`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  });
}

export async function deleteMember(memberId: UUID): Promise<{ id: UUID; deleted: boolean }> {
  return request(`/members/${memberId}`, { method: 'DELETE' });
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
// ============================================================

export async function getInstitutionPlans(instId: UUID, includeInactive = false): Promise<InstitutionPlan[]> {
  const params = new URLSearchParams();
  params.set('institution_id', instId);
  if (includeInactive) params.set('include_inactive', 'true');
  return request<InstitutionPlan[]>(`/institution-plans?${params}`);
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
// ============================================================

export async function getInstitutionSubscription(instId: UUID): Promise<InstitutionSubscription | null> {
  return request<InstitutionSubscription | null>(`/institution-subscriptions?institution_id=${instId}`);
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
// ADMIN SCOPES
// ============================================================

export async function getAdminScopes(membershipId: UUID): Promise<AdminScope[]> {
  return request<AdminScope[]>(`/admin-scopes/membership/${membershipId}`);
}

export async function getAdminScope(id: UUID): Promise<AdminScope> {
  return request<AdminScope>(`/admin-scopes/${id}`);
}

export async function getAllAdminScopes(): Promise<AdminScope[]> {
  return request<AdminScope[]>('/admin-scopes');
}

export async function getInstitutionAdminScopes(instId: UUID): Promise<AdminScope[]> {
  return request<AdminScope[]>(`/institutions/${instId}/admin-scopes`);
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

export async function bulkReplaceAdminScopes(
  membershipId: UUID,
  scopes: Array<{ scope_type: string; scope_id?: UUID }>
): Promise<AdminScope[]> {
  return request<AdminScope[]>(`/admin-scopes/membership/${membershipId}`, {
    method: 'PUT',
    body: JSON.stringify({ scopes }),
  });
}

// ============================================================
// ACCESS RULES
// ============================================================

export async function getPlanAccessRules(planId: UUID): Promise<PlanAccessRule[]> {
  return request<PlanAccessRule[]>(`/institution-plans/${planId}/access-rules`);
}

export async function createAccessRules(data: {
  plan_id: UUID;
  rules?: Array<{ scope_type: string; scope_id: UUID }>;
  scope_type?: string;
  scope_id?: UUID;
}): Promise<PlanAccessRule[]> {
  return request<PlanAccessRule[]>('/plan-access-rules', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteAccessRule(id: UUID): Promise<{ id: UUID; deleted: boolean }> {
  return request(`/plan-access-rules/${id}`, { method: 'DELETE' });
}

export async function bulkReplaceAccessRules(
  planId: UUID,
  rules: Array<{ scope_type: string; scope_id: UUID }>
): Promise<PlanAccessRule[]> {
  return request<PlanAccessRule[]>(`/institution-plans/${planId}/access-rules`, {
    method: 'PUT',
    body: JSON.stringify({ rules }),
  });
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
  return request<Summary[]>(`/summaries?topic_id=${topicId}`);
}

export async function createSummary(topicId: UUID, data: {
  institution_id?: UUID;
  title?: string;
  content_markdown: string;
  status?: SummaryStatus;
}): Promise<Summary> {
  return request<Summary>('/summaries', {
    method: 'POST',
    body: JSON.stringify({ ...data, topic_id: topicId }),
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
  return request<FlashcardCard[]>(`/flashcards?summary_id=${summaryId}`);
}

export async function getFlashcardsByKeyword(keywordId: UUID): Promise<FlashcardCard[]> {
  return request<FlashcardCard[]>(`/flashcards?keyword_id=${keywordId}`);
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

// Old getFsrsStates(/fsrs) removed — replaced by the typed version
// at the bottom of this file using /fsrs-states endpoint.

// ============================================================
// DAILY ACTIVITIES — Student daily study log (upsert by date)
// GET  /daily-activities?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=90&offset=0
// POST /daily-activities { activity_date, reviews_count?, ... }
// ============================================================

export interface DailyActivityRecord {
  id?: string;
  student_id?: string;
  activity_date: string;   // YYYY-MM-DD
  reviews_count: number;
  correct_count: number;
  time_spent_seconds: number;
  sessions_count: number;
  created_at?: string;
  updated_at?: string;
}

export async function getDailyActivities(
  from: string,
  to: string,
  limit = 90,
  offset = 0
): Promise<DailyActivityRecord[]> {
  const params = new URLSearchParams({ from, to, limit: String(limit), offset: String(offset) });
  const result = await request<DailyActivityRecord[]>(`/daily-activities?${params}`);
  return result || [];
}

export async function upsertDailyActivity(
  data: Partial<DailyActivityRecord> & { activity_date: string }
): Promise<DailyActivityRecord> {
  return request<DailyActivityRecord>('/daily-activities', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================
// STUDENT STATS — Lifetime aggregate stats (upsert per student)
// GET  /student-stats → { data: { ... } } or { data: null }
// POST /student-stats { current_streak?, longest_streak?, ... }
// ============================================================

export interface StudentStatsRecord {
  id?: string;
  student_id?: string;
  current_streak: number;
  longest_streak: number;
  total_reviews: number;
  total_time_seconds: number;
  total_sessions: number;
  last_study_date: string | null; // YYYY-MM-DD
  created_at?: string;
  updated_at?: string;
}

export async function getStudentStatsReal(): Promise<StudentStatsRecord | null> {
  try {
    return await request<StudentStatsRecord | null>('/student-stats');
  } catch (err: any) {
    if (err.status === 404) return null;
    throw err;
  }
}

export async function upsertStudentStats(
  data: Partial<StudentStatsRecord>
): Promise<StudentStatsRecord> {
  return request<StudentStatsRecord>('/student-stats', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================
// BKT STATES — Bayesian Knowledge Tracing per subtopic
// GET  /bkt-states?subtopic_id=xxx&limit=100&offset=0
// POST /bkt-states { subtopic_id, p_know?, ... }
// ============================================================

export interface BktStateRecord {
  id?: string;
  student_id?: string;
  subtopic_id: string;
  keyword_id?: string;
  p_know: number;       // [0,1]
  p_transit: number;    // [0,1]
  p_slip: number;       // [0,1]
  p_guess: number;      // [0,1]
  delta: number;
  total_attempts: number;
  correct_attempts: number;
  last_attempt_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function getAllBktStates(
  subtopicId?: string,
  limit = 200,
  offset = 0
): Promise<BktStateRecord[]> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (subtopicId) params.set('subtopic_id', subtopicId);
  const result = await request<BktStateRecord[]>(`/bkt-states?${params}`);
  return result || [];
}

export async function upsertBktState(
  data: Partial<BktStateRecord> & { subtopic_id: string }
): Promise<BktStateRecord> {
  return request<BktStateRecord>('/bkt-states', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================
// STUDY PLANS — Plan management
// GET  /study-plans?course_id=xxx&status=xxx → { data: { items: [...] } }
// GET  /study-plans/:id → { data: { ... } }
// POST /study-plans { name, course_id?, status? }
// PUT  /study-plans/:id { name?, status? }
// DELETE /study-plans/:id
// ============================================================

export interface StudyPlanRecord {
  id: string;
  student_id?: string;
  name: string;
  course_id?: string | null;
  status: 'active' | 'completed' | 'archived';
  created_at?: string;
  updated_at?: string;
}

export async function getStudyPlans(
  courseId?: string,
  status?: string
): Promise<StudyPlanRecord[]> {
  const params = new URLSearchParams();
  if (courseId) params.set('course_id', courseId);
  if (status) params.set('status', status);
  const qs = params.toString() ? `?${params}` : '';
  const result = await request<{ items: StudyPlanRecord[] } | StudyPlanRecord[]>(`/study-plans${qs}`);
  // Handle both { items: [...] } and plain array
  if (Array.isArray(result)) return result;
  return (result as any)?.items || [];
}

export async function getStudyPlan(planId: string): Promise<StudyPlanRecord> {
  return request<StudyPlanRecord>(`/study-plans/${planId}`);
}

export async function createStudyPlan(
  data: { name: string; course_id?: string; status?: string }
): Promise<StudyPlanRecord> {
  return request<StudyPlanRecord>('/study-plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateStudyPlan(
  planId: string,
  data: { name?: string; status?: string }
): Promise<StudyPlanRecord> {
  return request<StudyPlanRecord>(`/study-plans/${planId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteStudyPlan(planId: string): Promise<void> {
  return request(`/study-plans/${planId}`, { method: 'DELETE' });
}

// ============================================================
// STUDY PLAN TASKS — Task management within a plan
// GET  /study-plan-tasks?study_plan_id=xxx → { data: { items: [...] } }
// POST /study-plan-tasks { study_plan_id, item_type, item_id, status?, order_index? }
// PUT  /study-plan-tasks/:id { status?, order_index?, completed_at? }
// DELETE /study-plan-tasks/:id
// ============================================================

export interface StudyPlanTaskRecord {
  id: string;
  study_plan_id: string;
  item_type: string;   // flashcard, quiz, video, resumo, 3d, reading
  item_id: string;     // topic ID or item reference
  status: 'pending' | 'completed' | 'skipped';
  order_index: number;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function getStudyPlanTasks(
  studyPlanId: string
): Promise<StudyPlanTaskRecord[]> {
  const result = await request<{ items: StudyPlanTaskRecord[] } | StudyPlanTaskRecord[]>(
    `/study-plan-tasks?study_plan_id=${studyPlanId}`
  );
  if (Array.isArray(result)) return result;
  return (result as any)?.items || [];
}

export async function createStudyPlanTask(
  data: {
    study_plan_id: string;
    item_type: string;
    item_id: string;
    status?: string;
    order_index?: number;
  }
): Promise<StudyPlanTaskRecord> {
  return request<StudyPlanTaskRecord>('/study-plan-tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateStudyPlanTask(
  taskId: string,
  data: { status?: string; order_index?: number; completed_at?: string | null }
): Promise<StudyPlanTaskRecord> {
  return request<StudyPlanTaskRecord>(`/study-plan-tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteStudyPlanTask(taskId: string): Promise<void> {
  return request(`/study-plan-tasks/${taskId}`, { method: 'DELETE' });
}

// ── Reorder (shared endpoint for multiple tables) ──

export async function reorderItems(
  table: string,
  items: { id: string; order_index: number }[]
): Promise<void> {
  return request('/reorder', {
    method: 'PUT',
    body: JSON.stringify({ table, items }),
  });
}

// ============================================================
// STUDY SESSIONS — Track study session lifecycle
// POST /study-sessions { session_type, instrument_type? }
// PUT  /study-sessions/:id { ended_at, items_reviewed?, correct_count? }
// GET  /study-sessions?status=active (optional)
// ============================================================

export interface StudySessionRecord {
  id: string;
  student_id?: string;
  session_type: 'review' | 'study' | 'quiz';
  instrument_type?: 'flashcard' | 'quiz' | 'summary';
  started_at: string;
  ended_at?: string | null;
  items_reviewed?: number;
  correct_count?: number;
  created_at?: string;
  updated_at?: string;
}

export async function createStudySession(
  data: { session_type: string; instrument_type?: string }
): Promise<StudySessionRecord> {
  return request<StudySessionRecord>('/study-sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateStudySession(
  sessionId: string,
  data: { ended_at?: string; items_reviewed?: number; correct_count?: number }
): Promise<StudySessionRecord> {
  return request<StudySessionRecord>(`/study-sessions/${sessionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getStudySessions(
  status?: string
): Promise<StudySessionRecord[]> {
  const qs = status ? `?status=${status}` : '';
  const result = await request<{ items: StudySessionRecord[] } | StudySessionRecord[]>(
    `/study-sessions${qs}`
  );
  if (Array.isArray(result)) return result;
  return (result as any)?.items || [];
}

// ============================================================
// FSRS STATES — Free Spaced Repetition Scheduler states
// GET  /fsrs-states?summary_id=xxx | ?item_id=xxx | ?instrument_type=xxx
// POST /fsrs-states { item_id, instrument_type, stability, difficulty, next_review, last_review }
// ============================================================

export interface FsrsStateRecord {
  id: string;
  student_id?: string;
  item_id: string;          // flashcard ID or quiz ID
  instrument_type: string;  // "flashcard" | "quiz"
  summary_id?: string;
  subtopic_id?: string;
  keyword_id?: string;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  state: number;            // 0=new, 1=learning, 2=review, 3=relearning
  next_review: string;      // ISO date
  last_review?: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function getFsrsStates(options?: {
  summary_id?: string;
  item_id?: string;
  instrument_type?: string;
  limit?: number;
  offset?: number;
}): Promise<FsrsStateRecord[]> {
  const params = new URLSearchParams();
  if (options?.summary_id) params.set('summary_id', options.summary_id);
  if (options?.item_id) params.set('item_id', options.item_id);
  if (options?.instrument_type) params.set('instrument_type', options.instrument_type);
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.offset) params.set('offset', String(options.offset));
  const qs = params.toString() ? `?${params}` : '';
  const result = await request<{ items: FsrsStateRecord[] } | FsrsStateRecord[]>(
    `/fsrs-states${qs}`
  );
  if (Array.isArray(result)) return result;
  return (result as any)?.items || [];
}

export async function upsertFsrsState(
  data: {
    item_id: string;
    instrument_type: string;
    stability: number;
    difficulty: number;
    next_review: string;
    last_review?: string;
    reps?: number;
    lapses?: number;
    state?: number;
  }
): Promise<FsrsStateRecord> {
  return request<FsrsStateRecord>('/fsrs-states', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}