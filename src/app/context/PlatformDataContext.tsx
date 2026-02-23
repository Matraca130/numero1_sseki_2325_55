// ============================================================
// Axon — Platform Data Context
// Provides cached data for owner/admin/professor pages.
// Reads activeMembership from AuthContext to know which
// institution to load data for.
//
// DATA SLICES:
//   institution, dashboardStats, members, plans,
//   subscription, courses
//
// REFRESH FUNCTIONS (one per slice):
//   refresh()              — reload ALL slices
//   refreshInstitution()   — reload institution only
//   refreshMembers()       — reload members only
//   refreshPlans()         — reload plans only
//   refreshStats()         — reload dashboardStats only
//   refreshSubscription()  — reload subscription only
//   refreshCourses()       — reload courses only
//
// MUTATION WRAPPERS (call API + update local state):
//   inviteMember, removeMember, toggleMember, changeRole
//
// PAGE PATTERN:
//   const { plans, refreshPlans } = usePlatformData();
//   await api.createInstitutionPlan({...});  // call API directly
//   await refreshPlans();                     // refresh cache
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import * as api from '@/app/services/platformApi';
import type {
  Institution,
  InstitutionDashboardStats,
  MemberListItem,
  CreateMemberPayload,
  InstitutionPlan,
  InstitutionSubscription,
  Course,
} from '@/app/types/platform';

// ── State shape ───────────────────────────────────────────

interface PlatformDataState {
  institution: Institution | null;
  dashboardStats: InstitutionDashboardStats | null;
  members: MemberListItem[];
  plans: InstitutionPlan[];
  subscription: InstitutionSubscription | null;
  courses: Course[];
}

interface PlatformDataContextType extends PlatformDataState {
  loading: boolean;
  error: string | null;
  institutionId: string | null;

  // Refresh functions — one per data slice so pages can
  // call api.xxx() directly and then refresh only the cache
  // they affected. This avoids pages needing to edit this file.
  refresh: () => Promise<void>;
  refreshInstitution: () => Promise<void>;
  refreshMembers: () => Promise<void>;
  refreshPlans: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  refreshCourses: () => Promise<void>;

  // Mutation wrappers (call API + update local state)
  inviteMember: (data: CreateMemberPayload) => Promise<MemberListItem>;
  removeMember: (memberId: string) => Promise<void>;
  toggleMember: (memberId: string, active: boolean) => Promise<void>;
  changeRole: (memberId: string, role: 'owner' | 'admin' | 'professor' | 'student') => Promise<void>;
}

const PlatformDataContext = createContext<PlatformDataContextType>({
  institution: null,
  dashboardStats: null,
  members: [],
  plans: [],
  subscription: null,
  courses: [],
  loading: true,
  error: null,
  institutionId: null,
  refresh: async () => {},
  refreshInstitution: async () => {},
  refreshMembers: async () => {},
  refreshPlans: async () => {},
  refreshStats: async () => {},
  refreshSubscription: async () => {},
  refreshCourses: async () => {},
  inviteMember: async () => ({ } as any),
  removeMember: async () => {},
  toggleMember: async () => {},
  changeRole: async () => {},
});

// ── Provider ──────────────────────────────────────────────

export function PlatformDataProvider({ children }: { children: ReactNode }) {
  const { activeMembership, status } = useAuth();
  const institutionId = activeMembership?.institution_id || null;
  const lastInstId = useRef<string | null>(null);

  const [data, setData] = useState<PlatformDataState>({
    institution: null,
    dashboardStats: null,
    members: [],
    plans: [],
    subscription: null,
    courses: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch all platform data ─────────────────────────────
  const fetchAll = useCallback(async (instId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [institution, stats, members, plans, subscription, courses] =
        await Promise.allSettled([
          api.getInstitution(instId),
          api.getInstitutionDashboardStats(instId),
          api.getMembers(instId),
          api.getInstitutionPlans(instId, true),
          api.getInstitutionSubscription(instId),
          api.getCourses(instId),
        ]);

      setData({
        institution: institution.status === 'fulfilled' ? institution.value : null,
        dashboardStats: stats.status === 'fulfilled' ? stats.value : null,
        members: members.status === 'fulfilled' ? members.value : [],
        plans: plans.status === 'fulfilled' ? plans.value : [],
        subscription: subscription.status === 'fulfilled' ? subscription.value : null,
        courses: courses.status === 'fulfilled' ? courses.value : [],
      });
      setLoading(false);
    } catch (err: any) {
      console.error('[PlatformDataContext] fetch error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  // ── Individual refresh functions ────────────────────────
  const refreshInstitution = useCallback(async () => {
    if (!institutionId) return;
    try {
      const institution = await api.getInstitution(institutionId);
      setData(prev => ({ ...prev, institution }));
    } catch (err: any) {
      console.error('[PlatformDataContext] refreshInstitution error:', err);
    }
  }, [institutionId]);

  const refreshMembers = useCallback(async () => {
    if (!institutionId) return;
    try {
      const members = await api.getMembers(institutionId);
      setData(prev => ({ ...prev, members }));
    } catch (err: any) {
      console.error('[PlatformDataContext] refreshMembers error:', err);
    }
  }, [institutionId]);

  const refreshPlans = useCallback(async () => {
    if (!institutionId) return;
    try {
      const plans = await api.getInstitutionPlans(institutionId, true);
      setData(prev => ({ ...prev, plans }));
    } catch (err: any) {
      console.error('[PlatformDataContext] refreshPlans error:', err);
    }
  }, [institutionId]);

  const refreshStats = useCallback(async () => {
    if (!institutionId) return;
    try {
      const dashboardStats = await api.getInstitutionDashboardStats(institutionId);
      setData(prev => ({ ...prev, dashboardStats }));
    } catch (err: any) {
      console.error('[PlatformDataContext] refreshStats error:', err);
    }
  }, [institutionId]);

  const refreshSubscription = useCallback(async () => {
    if (!institutionId) return;
    try {
      const subscription = await api.getInstitutionSubscription(institutionId);
      setData(prev => ({ ...prev, subscription }));
    } catch (err: any) {
      console.error('[PlatformDataContext] refreshSubscription error:', err);
    }
  }, [institutionId]);

  const refreshCourses = useCallback(async () => {
    if (!institutionId) return;
    try {
      const courses = await api.getCourses(institutionId);
      setData(prev => ({ ...prev, courses }));
    } catch (err: any) {
      console.error('[PlatformDataContext] refreshCourses error:', err);
    }
  }, [institutionId]);

  // ── Mutation wrappers ───────────────────────────────────
  const inviteMember = useCallback(async (payload: CreateMemberPayload) => {
    const member = await api.createMember(payload);
    setData(prev => ({ ...prev, members: [...prev.members, member] }));
    return member;
  }, []);

  const removeMember = useCallback(async (memberId: string) => {
    await api.deleteMember(memberId);
    setData(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== memberId),
    }));
  }, []);

  const toggleMember = useCallback(async (memberId: string, active: boolean) => {
    await api.toggleMemberActive(memberId, active);
    setData(prev => ({
      ...prev,
      members: prev.members.map(m =>
        m.id === memberId ? { ...m, is_active: active } : m
      ),
    }));
  }, []);

  const changeRole = useCallback(async (memberId: string, role: 'owner' | 'admin' | 'professor' | 'student') => {
    await api.changeMemberRole(memberId, role);
    setData(prev => ({
      ...prev,
      members: prev.members.map(m =>
        m.id === memberId ? { ...m, role } : m
      ),
    }));
  }, []);

  // ── Auto-load when institution changes ──────────────────
  useEffect(() => {
    if (status === 'loading') return;
    if (!institutionId) {
      setLoading(false);
      return;
    }

    // Reset if institution changed
    if (lastInstId.current !== institutionId) {
      setData({
        institution: null,
        dashboardStats: null,
        members: [],
        plans: [],
        subscription: null,
        courses: [],
      });
      lastInstId.current = institutionId;
    }

    fetchAll(institutionId);
  }, [fetchAll, institutionId, status]);

  return (
    <PlatformDataContext.Provider
      value={{
        ...data,
        loading,
        error,
        institutionId,
        refresh: async () => { if (institutionId) await fetchAll(institutionId); },
        refreshInstitution,
        refreshMembers,
        refreshPlans,
        refreshStats,
        refreshSubscription,
        refreshCourses,
        inviteMember,
        removeMember,
        toggleMember,
        changeRole,
      }}
    >
      {children}
    </PlatformDataContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────

export function usePlatformData() {
  return useContext(PlatformDataContext);
}