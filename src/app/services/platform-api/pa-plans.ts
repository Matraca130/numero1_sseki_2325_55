// ============================================================
// Axon — Platform API: Plans & Subscriptions
// Extracted from platformApi.ts (zero functional changes)
// ============================================================

import { apiCall } from '@/app/lib/api';
import type {
  UUID,
  PlatformPlan,
  InstitutionPlan,
  InstitutionSubscription,
} from '@/app/types/platform';

const request = apiCall;

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
