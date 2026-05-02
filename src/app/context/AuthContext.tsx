// ============================================================
// Axon v4.5 — AuthContext (canonical source)
//
// Flow:
//   1. supabase.auth.signInWithPassword() -> session JWT
//   2. setAccessToken(jwt)
//   3. GET /me -> user profile
//   4. GET /institutions -> list with membership_id + role
//   5. If 1 institution -> auto-select. If multiple -> save list.
//   6. Route by role.
//
// State:
//   { user, institutions, selectedInstitution, role, loading, authError }
//
// The role is NOT in the JWT. It comes from GET /institutions.
// A user can be professor in one institution and student in another.
//
// CONSOLIDATION (v4.5): This file was previously at contexts/AuthContext.tsx
// with a bridge re-export here. Now this IS the canonical source.
// All 17+ consumers import from '@/app/context/AuthContext' — no bridges needed.
// ============================================================
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/app/lib/supabase';
import { apiCall, setAccessToken as setApiToken, getAccessToken, API_BASE, ANON_KEY } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  full_name?: string;
  avatar_url: string | null;
  is_super_admin?: boolean;
  platform_role?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** What GET /institutions returns per item */
export interface UserInstitution {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  membership_id: string;
  role: 'owner' | 'admin' | 'professor' | 'student';
  is_active?: boolean;
  settings?: Record<string, any>;
  plan_id?: string | null;
  created_at?: string;
}

/**
 * Backward-compat Membership type.
 * Used by SelectRolePage, RequireRole, RoleShell, etc.
 */
export interface Membership {
  id: string;
  user_id: string;
  institution_id: string;
  role: 'owner' | 'admin' | 'professor' | 'student';
  plan_id: string | null;
  is_active?: boolean;
  created_at: string;
  institution: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    is_active: boolean;
    settings?: Record<string, any>;
  } | null;
}

// ── Context interface ─────────────────────────────────────

interface AuthContextType {
  // New clean names
  user: AuthUser | null;
  institutions: UserInstitution[];
  selectedInstitution: UserInstitution | null;
  role: string | null;
  loading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  selectInstitution: (inst: UserInstitution) => void;

  // Backward-compat aliases (same data, old names)
  status: AuthStatus;
  memberships: Membership[];
  activeMembership: Membership | null;
  setActiveMembership: (m: Membership) => void;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string, institutionId?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ── Helpers ───────────────────────────────────────────

/** Convert UserInstitution -> Membership for backward compat */
function toMembership(inst: UserInstitution, userId: string): Membership {
  return {
    id: inst.membership_id,
    user_id: userId,
    institution_id: inst.id,
    role: inst.role,
    plan_id: inst.plan_id || null,
    is_active: inst.is_active !== false,
    created_at: inst.created_at || new Date().toISOString(),
    institution: {
      id: inst.id,
      name: inst.name,
      slug: inst.slug,
      logo_url: inst.logo_url,
      is_active: inst.is_active !== false,
      settings: inst.settings,
    },
  };
}

/** Find UserInstitution from a Membership (by membership_id) */
function findInstitution(institutions: UserInstitution[], m: Membership): UserInstitution | null {
  return institutions.find(i => i.membership_id === m.id) || null;
}

// ── Provider ──────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [institutions, setInstitutions] = useState<UserInstitution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<UserInstitution | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Keep module-level token in sync
  useEffect(() => {
    setApiToken(accessToken);
  }, [accessToken]);

  // ── Fetch profile (GET /me) ──────────────────────────────
  const fetchProfile = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const data = await apiCall<any>('/me');
      if (!data) return null;
      const u: AuthUser = {
        id: data.id,
        email: data.email,
        name: data.full_name || data.name || data.email,
        full_name: data.full_name,
        avatar_url: data.avatar_url || null,
        is_super_admin: data.is_super_admin || false,
        platform_role: data.platform_role,
        is_active: data.is_active,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
      if (import.meta.env.DEV) console.log(`[Auth] Profile loaded: ${u.email}`);
      return u;
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Auth] GET /me failed:', err);
      return null;
    }
  }, []);

  // ── Fetch institutions (GET /institutions) ────────────────
  const fetchInstitutions = useCallback(async (): Promise<UserInstitution[]> => {
    try {
      const data = await apiCall<any>('/institutions');
      const items: any[] = Array.isArray(data) ? data : [];
      const mapped: UserInstitution[] = items.map((item: any) => ({
        id: item.id,
        name: item.name || 'Institution',
        slug: item.slug || '',
        logo_url: item.logo_url || null,
        membership_id: item.membership_id || item.id,
        role: item.role || 'student',
        is_active: item.is_active !== false,
        settings: item.settings,
        plan_id: item.plan_id || null,
        created_at: item.created_at,
      }));
      if (import.meta.env.DEV) console.log(`[Auth] ${mapped.length} institution(s) loaded`);
      return mapped;
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Auth] GET /institutions failed:', err);
      throw err;
    }
  }, []);

  // ── Load full session (profile + institutions) ────────────
  const loadSession = useCallback(async (token: string): Promise<'ok' | 'profile_failed' | 'institutions_failed'> => {
    // Set token first so apiCall can use it
    setAccessTokenState(token);
    setApiToken(token);

    const profile = await fetchProfile();
    if (!profile) {
      setAccessTokenState(null);
      setApiToken(null);
      return 'profile_failed';
    }

    let insts: UserInstitution[];
    try {
      insts = await fetchInstitutions();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setAuthError(`Could not load institutions: ${msg}`);
      setUser(profile);
      setInstitutions([]);
      return 'institutions_failed';
    }

    setAuthError(null);
    setUser(profile);
    setInstitutions(insts);

    // Auto-select if exactly 1 institution
    if (insts.length === 1) {
      setSelectedInstitution(insts[0]);
      try {
        localStorage.setItem('axon_active_membership', JSON.stringify(
          toMembership(insts[0], profile.id)
        ));
      } catch { /* private mode or quota — non-fatal, session state already in React */ }
    } else {
      // Try to restore from localStorage
      try {
        const stored = localStorage.getItem('axon_active_membership');
        if (stored) {
          const parsed = JSON.parse(stored);
          const match = insts.find(i => i.membership_id === parsed.id);
          if (match) {
            setSelectedInstitution(match);
          }
        }
      } catch {}
    }

    return 'ok';
  }, [fetchProfile, fetchInstitutions]);

  // ── Restore session on mount ─────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error || !session?.access_token) {
          // Clean up any stale auth data that might cause redirect loops
          setUser(null);
          setAccessTokenState(null);
          setApiToken(null);
          setInstitutions([]);
          setSelectedInstitution(null);
          localStorage.removeItem('axon_active_membership');
          localStorage.removeItem('axon_access_token');
          localStorage.removeItem('axon_user');
          localStorage.removeItem('axon_memberships');
          setLoading(false);
          return;
        }
        await loadSession(session.access_token);
        if (!cancelled) setLoading(false);
      } catch (err) {
        if (import.meta.env.DEV) console.error('[Auth] Session restore failed:', err);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadSession]);

  // ── Listen for auth state changes ─────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session?.access_token) {
        setAccessTokenState(session.access_token);
        setApiToken(session.access_token);
        if (import.meta.env.DEV) console.log('[Auth] Token refreshed');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setAccessTokenState(null);
        setApiToken(null);
        setInstitutions([]);
        setSelectedInstitution(null);
        setAuthError(null);
        if (import.meta.env.DEV) console.log('[Auth] Signed out via auth state change');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Cross-tab session synchronization ───────────────────
  // If user logs out in another tab, the 'storage' event fires here.
  // Detect removal of axon_access_token and clear local auth state.
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'axon_access_token' && e.newValue === null) {
        setUser(null);
        setAccessTokenState(null);
        setSelectedInstitution(null);
        setInstitutions([]);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // ── Login ─────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (import.meta.env.DEV) console.error('[Auth] signIn error:', error.message);
        return { success: false, error: error.message };
      }
      const token = data.session?.access_token;
      if (!token) {
        return { success: false, error: 'No access token received' };
      }
      const result = await loadSession(token);
      if (result === 'profile_failed') {
        await supabase.auth.signOut().catch(() => {});
        return { success: false, error: 'Failed to load profile' };
      }
      // 'ok' or 'institutions_failed' — login succeeded, authError is set if needed
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (import.meta.env.DEV) console.error('[Auth] Login error:', err);
      return { success: false, error: msg };
    }
  }, [loadSession]);

  // ── Signup ────────────────────────────────────────────
  const signup = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      // POST /signup does NOT need X-Access-Token, only Authorization with ANON_KEY
      const url = `${API_BASE}/signup`;
      if (import.meta.env.DEV) console.log('[Auth] POST /signup');
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`,
          // NO X-Access-Token for signup
        },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        if (import.meta.env.DEV) console.error('[Auth] /signup non-JSON response:', text.substring(0, 300));
        return { success: false, error: 'Server returned invalid response' };
      }
      if (!res.ok || json?.error) {
        return { success: false, error: json?.error || `Signup failed (${res.status})` };
      }

      // After successful signup, auto-login via Supabase
      const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (loginErr || !loginData.session?.access_token) {
        // Signup succeeded but auto-login failed — user can login manually
        return { success: true };
      }
      await loadSession(loginData.session.access_token);
      // Signup succeeded regardless of loadSession result
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (import.meta.env.DEV) console.error('[Auth] Signup error:', err);
      return { success: false, error: msg };
    }
  }, [loadSession]);

  // ── Logout ────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {} finally {
      setUser(null);
      setAccessTokenState(null);
      setApiToken(null);
      setInstitutions([]);
      setSelectedInstitution(null);
      setAuthError(null);
      localStorage.removeItem('axon_active_membership');
      localStorage.removeItem('axon_access_token');
      localStorage.removeItem('axon_user');
      localStorage.removeItem('axon_memberships');
    }
  }, []);

  // ── Select institution ──────────────────────────────────
  const selectInstitution = useCallback((inst: UserInstitution) => {
    setSelectedInstitution(inst);
    if (user) {
      try {
        localStorage.setItem('axon_active_membership', JSON.stringify(
          toMembership(inst, user.id)
        ));
      } catch { /* private mode or quota — non-fatal, session state already in React */ }
    }
  }, [user]);

  // ── Backward-compat: setActiveMembership ──────────────────
  const setActiveMembership = useCallback((m: Membership) => {
    const match = institutions.find(i => i.membership_id === m.id);
    if (match) {
      selectInstitution(match);
    } else {
      // If not found in current list, store it anyway for compat
      setSelectedInstitution({
        id: m.institution_id,
        name: m.institution?.name || 'Institution',
        slug: m.institution?.slug || '',
        logo_url: m.institution?.logo_url || null,
        membership_id: m.id,
        role: m.role,
        is_active: m.is_active,
        plan_id: m.plan_id,
        created_at: m.created_at,
      });
      try {
        localStorage.setItem('axon_active_membership', JSON.stringify(m));
      } catch { /* private mode or quota — non-fatal, session state already in React */ }
    }
  }, [institutions, selectInstitution]);

  // ── Derived state ───────────────────────────────────────
  const status: AuthStatus = loading ? 'loading' : user ? 'authenticated' : 'unauthenticated';
  const role = selectedInstitution?.role || null;
  const memberships: Membership[] = useMemo(() =>
    user ? institutions.map(i => toMembership(i, user.id)) : [],
    [user, institutions],
  );
  const activeMembership: Membership | null = useMemo(() =>
    (user && selectedInstitution) ? toMembership(selectedInstitution, user.id) : null,
    [user, selectedInstitution],
  );

  // ── PERF-AUDIT: Memoized context value ───────────────────
  // Without useMemo, every AuthProvider render creates a new object,
  // causing ALL 17+ consumers to re-render unnecessarily.
  const signUpCompat = useCallback(
    (email: string, password: string, name: string, _institutionId?: string) => signup(email, password, name),
    [signup],
  );

  const value = useMemo<AuthContextType>(() => ({
    // New clean names
    user,
    institutions,
    selectedInstitution,
    role,
    loading,
    authError,
    login,
    signup,
    logout,
    selectInstitution,

    // Backward-compat aliases
    status,
    memberships,
    activeMembership,
    setActiveMembership,
    signIn: login,
    signUp: signUpCompat,
    signOut: logout,
  }), [
    user, institutions, selectedInstitution, role, loading, authError,
    login, signup, logout, selectInstitution,
    status, memberships, activeMembership, setActiveMembership, signUpCompat,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}