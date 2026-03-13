// ============================================================
// Axon — Platform API: Institutions & Members
// Extracted from platformApi.ts
// C7-MIGRATION: realRequest → apiCall from lib/api.ts
// ============================================================

import { apiCall } from '@/app/lib/api';
import type {
  UUID,
  Institution,
  InstitutionDashboardStats,
  MemberListItem,
  CreateMemberPayload,
  MembershipRole,
} from '@/app/types/platform';

const request = apiCall;

// Re-export error class from canonical source
export { ApiError as PlatformApiError } from '@/app/lib/error-utils';

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
      totalPlans: 0,
      activeStudents,
      inactiveMembers,
      membersByRole,
      subscription: null,
    };
  } catch {
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
