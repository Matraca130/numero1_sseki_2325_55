// ============================================================
// Axon — Auth API Types (bridge file)
// Re-exports types from the canonical AuthContext
// for files that import from '@/app/services/authApi'.
// ============================================================
export type { AuthUser, Membership } from '@/app/contexts/AuthContext';
