// ============================================================
// Axon — AuthContext (bridge file)
// Re-exports everything from the canonical @/app/contexts/AuthContext.tsx
// so existing imports from '@/app/context/AuthContext' keep working.
// ============================================================
export {
  AuthProvider,
  useAuth,
} from '@/app/contexts/AuthContext';

export type {
  AuthStatus,
  AuthUser,
  UserInstitution,
  Membership,
} from '@/app/contexts/AuthContext';
