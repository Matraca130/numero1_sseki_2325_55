// ============================================================
// Axon — Supabase Client (bridge file)
// Re-exports from the canonical @/app/lib/supabase.ts
// so existing imports from '@/app/lib/supabase-client' keep working.
// ============================================================
export { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/app/lib/supabase';
