// ============================================================
// Axon — Platform API: Admin Scopes, Access Rules, Admin Students
// Extracted from platformApi.ts
// C7-MIGRATION: realRequest → apiCall, raw fetch → api.ts imports
// ============================================================

import { apiCall, API_BASE, ANON_KEY, getAccessToken } from '@/app/lib/api';
import type {
  UUID,
  AdminScope,
  PlanAccessRule,
  AccessCheckResult,
  MembershipRole,
  ISODate,
} from '@/app/types/platform';

const request = apiCall;

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
// ADMIN — Student Management (SQL + KV hybrid)
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

/**
 * Fetch admin student list with pagination.
 * NOTE: This function uses raw fetch instead of apiCall because
 * apiCall auto-unwraps { data: ... } which would lose the pagination envelope.
 * Auth headers follow the canonical double-token convention from api.ts.
 */
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

  const url = `${API_BASE}/admin/students/${institutionId}${qs}`;
  const token = getAccessToken();
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
      ...(token ? { 'X-Access-Token': token } : {}),
    },
  });
  const body = await res.json();
  if (!res.ok || body?.error) {
    throw new Error(
      body?.error || `API error ${res.status}`
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
