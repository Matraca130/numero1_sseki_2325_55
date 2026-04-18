// ============================================================
// Axon — Shared Test Utilities
//
// Provides render helpers with pre-configured providers (Auth,
// Router) and factories for common mock objects (AuthUser,
// UserInstitution). Re-exports @testing-library/react essentials
// so test files only need one import source.
//
// Pattern follows makeBlock() in blocks/__tests__/test-utils.ts:
// factories accept partial overrides — each test specifies only
// what it cares about.
// ============================================================

import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { AuthUser, UserInstitution } from '@/app/context/AuthContext';

// ── Re-exports ───────────────────────────────────────────
export { render, screen, fireEvent, waitFor, within };

// ── Factories ────────────────────────────────────────────

/** Factory for AuthUser — each test only overrides what it cares about */
export function createMockUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-001',
    email: 'test@axon.edu',
    name: 'Test User',
    full_name: 'Test User',
    avatar_url: null,
    is_super_admin: false,
    platform_role: 'user',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

/** Factory for UserInstitution — defaults to student role */
export function createMockInstitution(
  overrides: Partial<UserInstitution> = {},
): UserInstitution {
  return {
    id: 'inst-001',
    name: 'Test Institution',
    slug: 'test-inst',
    logo_url: null,
    membership_id: 'mem-001',
    role: 'student',
    is_active: true,
    settings: {},
    plan_id: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── Auth context mock value builder ──────────────────────

interface AuthContextOverrides {
  user?: AuthUser | null;
  institutions?: UserInstitution[];
  selectedInstitution?: UserInstitution | null;
  role?: 'owner' | 'admin' | 'professor' | 'student' | null;
  loading?: boolean;
  authError?: string | null;
}

function buildAuthValue(overrides: AuthContextOverrides = {}) {
  const user = overrides.user !== undefined ? overrides.user : createMockUser();
  const selectedInstitution =
    overrides.selectedInstitution !== undefined
      ? overrides.selectedInstitution
      : createMockInstitution();
  const role = overrides.role !== undefined ? overrides.role : (selectedInstitution?.role ?? null);

  return {
    // New clean names
    user,
    institutions: overrides.institutions ?? (selectedInstitution ? [selectedInstitution] : []),
    selectedInstitution,
    role,
    loading: overrides.loading ?? false,
    authError: overrides.authError ?? null,
    login: vi.fn().mockResolvedValue({ success: true }),
    signup: vi.fn().mockResolvedValue({ success: true }),
    logout: vi.fn().mockResolvedValue(undefined),
    selectInstitution: vi.fn(),

    // Backward-compat aliases
    status: (user ? 'authenticated' : 'unauthenticated') as 'authenticated' | 'unauthenticated' | 'loading',
    memberships: [],
    activeMembership: null,
    setActiveMembership: vi.fn(),
    signIn: vi.fn().mockResolvedValue({ success: true }),
    signUp: vi.fn().mockResolvedValue({ success: true }),
    signOut: vi.fn().mockResolvedValue(undefined),
  };
}

// ── Mock AuthContext provider ────────────────────────────
// We create a minimal context that mirrors AuthContext's shape.
// This avoids importing the real AuthProvider (which triggers
// Supabase side-effects at module load).

const MockAuthContext = React.createContext<ReturnType<typeof buildAuthValue> | null>(null);

function MockAuthProvider({
  children,
  authOverrides,
}: {
  children: ReactNode;
  authOverrides?: AuthContextOverrides;
}) {
  const value = buildAuthValue(authOverrides);
  return (
    <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>
  );
}

// We also mock useAuth so consumers get the mocked value.
// Tests that use renderWithAuth should vi.mock('@/app/context/AuthContext')
// with the re-export below. The mock module intercepts useAuth calls.

/**
 * Create a mock useAuth implementation that returns the given overrides.
 * Usage in test files:
 *
 * ```ts
 * const mockAuthValue = createMockAuthValue({ role: 'professor' });
 * vi.mock('@/app/context/AuthContext', () => ({
 *   useAuth: () => mockAuthValue,
 * }));
 * ```
 */
export function createMockAuthValue(overrides?: AuthContextOverrides) {
  return buildAuthValue(overrides);
}

// ── Render helpers ───────────────────────────────────────

interface RenderWithAuthOptions extends Omit<RenderOptions, 'wrapper'> {
  authOverrides?: AuthContextOverrides;
}

interface RenderWithProvidersOptions extends RenderWithAuthOptions {
  /** Initial route entries for MemoryRouter */
  initialEntries?: string[];
}

/**
 * Render with a mocked AuthContext.
 * The rendered component receives auth values via MockAuthProvider.
 */
export function renderWithAuth(
  ui: ReactElement,
  { authOverrides, ...renderOptions }: RenderWithAuthOptions = {},
) {
  const authValue = buildAuthValue(authOverrides);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MockAuthContext.Provider value={authValue}>
        {children}
      </MockAuthContext.Provider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    authValue,
  };
}

/**
 * Render with mocked AuthContext + MemoryRouter.
 * Use when the component under test uses both useAuth and routing hooks.
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    authOverrides,
    initialEntries = ['/'],
    ...renderOptions
  }: RenderWithProvidersOptions = {},
) {
  const authValue = buildAuthValue(authOverrides);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={initialEntries}>
        <MockAuthContext.Provider value={authValue}>
          {children}
        </MockAuthContext.Provider>
      </MemoryRouter>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    authValue,
  };
}
