// ============================================================
// Axon v4.4 — AuthContext (canonical source)
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
//   { user, accessToken, institutions, selectedInstitution, role, loading }
//
// The role is NOT in the JWT. It comes from GET /institutions.
// A user can be professor in one institution and student in another.
// ============================================================
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/app/lib/supabase';
import { apiCall, setAccessToken as setApiToken, getAccessToken, API_BASE, ANON_KEY } from '@/app/lib/api';

// ── Types ─────────────────────────────────────────────────

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
  accessToken: string | null;
  institutions: UserInstitution[];
  selectedInstitution: UserInstitution | null;
  role: string | null;
  loading: boolean;
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

// ── Helpers ───────────────────────────────────────────────

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

// ── Provider ──────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [institutions, setInstitutions] = useState<UserInstitution[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<UserInstitution | null>(null);
  const [loading, setLoading] = useState(true);

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
      console.log(`[Auth] Profile loaded: ${u.email}`);
      return u;
    } catch (err) {
      console.error('[Auth] GET /me failed:', err);
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
      console.log(`[Auth] ${mapped.length} institution(s) loaded`);
      return mapped;
    } catch (err) {
      console.error('[Auth] GET /institutions failed:', err);
      return [];
    }
  }, []);

  // ── Load full session (profile + institutions) ────────────
  const loadSession = useCallback(async (token: string): Promise<boolean> => {
    // Set token first so apiCall can use it
    setAccessTokenState(token);
    setApiToken(token);

    const profile = await fetchProfile();
    if (!profile) {
      setAccessTokenState(null);
      setApiToken(null);
      return false;
    }

    const insts = await fetchInstitutions();

    setUser(profile);
    setInstitutions(insts);

    // Auto-select if exactly 1 institution
    if (insts.length === 1) {
      setSelectedInstitution(insts[0]);
      localStorage.setItem('axon_active_membership', JSON.stringify(
        toMembership(insts[0], profile.id)
      ));
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

    return true;
  }, [fetchProfile, fetchInstitutions]);

  // ── Restore session on mount ─────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session?.access_token) {
          setLoading(false);
          return;
        }
        const ok = await loadSession(session.access_token);
        if (!ok) {
          // Session exists but profile load failed
          setLoading(false);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('[Auth] Session restore failed:', err);
        setLoading(false);
      }
    })();
  }, [loadSession]);

  // ── Listen for auth state changes ─────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session?.access_token) {
        setAccessTokenState(session.access_token);
        setApiToken(session.access_token);
        console.log('[Auth] Token refreshed');
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setAccessTokenState(null);
        setApiToken(null);
        setInstitutions([]);
        setSelectedInstitution(null);
        console.log('[Auth] Signed out via auth state change');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Login ─────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('[Auth] signIn error:', error.message);
        return { success: false, error: error.message };
      }
      const token = data.session?.access_token;
      if (!token) {
        return { success: false, error: 'No access token received' };
      }
      const ok = await loadSession(token);
      if (!ok) {
        await supabase.auth.signOut().catch(() => {});
        return { success: false, error: 'Failed to load profile' };
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Auth] Login error:', err);
      return { success: false, error: msg };
    }
  }, [loadSession]);

  // ── Signup ────────────────────────────────────────────────
  const signup = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      // POST /signup does NOT need X-Access-Token, only Authorization with ANON_KEY
      const url = `${API_BASE}/signup`;
      console.log('[Auth] POST /signup');
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
        console.error('[Auth] /signup non-JSON response:', text.substring(0, 300));
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
      const ok = await loadSession(loginData.session.access_token);
      if (!ok) {
        // Session loaded but profile failed — still a successful signup
        return { success: true };
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Auth] Signup error:', err);
      return { success: false, error: msg };
    }
  }, [loadSession]);

  // ── Logout ────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {} finally {
      setUser(null);
      setAccessTokenState(null);
      setApiToken(null);
      setInstitutions([]);
      setSelectedInstitution(null);
      localStorage.removeItem('axon_active_membership');
      localStorage.removeItem('axon_access_token');
      localStorage.removeItem('axon_user');
      localStorage.removeItem('axon_memberships');
    }
  }, []);

  // ── Select institution ────────────────────────────────────
  const selectInstitution = useCallback((inst: UserInstitution) => {
    setSelectedInstitution(inst);
    if (user) {
      localStorage.setItem('axon_active_membership', JSON.stringify(
        toMembership(inst, user.id)
      ));
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
      localStorage.setItem('axon_active_membership', JSON.stringify(m));
    }
  }, [institutions, selectInstitution]);

  // ── Derived state ─────────────────────────────────────────
  const status: AuthStatus = loading ? 'loading' : user ? 'authenticated' : 'unauthenticated';
  const role = selectedInstitution?.role || null;
  const memberships: Membership[] = user
    ? institutions.map(i => toMembership(i, user.id))
    : [];
  const activeMembership: Membership | null = (user && selectedInstitution)
    ? toMembership(selectedInstitution, user.id)
    : null;

  // ── Context value ─────────────────────────────────────────
  const value: AuthContextType = {
    // New clean names
    user,
    accessToken,
    institutions,
    selectedInstitution,
    role,
    loading,
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
    signUp: (email, password, name, _institutionId?) => signup(email, password, name),
    signOut: logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
