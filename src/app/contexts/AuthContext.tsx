// ============================================================
// Axon — AuthContext Bridge (backward-compat re-export)
//
// HISTORY:
//   v4.4: This file was the canonical AuthContext.
//   v4.5: Canonical source moved to @/app/context/AuthContext.tsx
//         This file now re-exports everything from there.
//
// WHY THIS EXISTS:
//   6 files still import from '@/app/contexts/AuthContext' (plural).
//   Without this bridge, they would use a DIFFERENT React context
//   than the 17+ files importing from '@/app/context/AuthContext'
//   (singular), causing "useAuth must be used within an AuthProvider".
//
// DO NOT add any createContext() call here.
// DO NOT duplicate any logic from context/AuthContext.tsx.
// ============================================================
export {
  AuthProvider,
  useAuth,
  type AuthStatus,
  type AuthUser,
  type UserInstitution,
  type Membership,
} from '@/app/context/AuthContext';
