// ============================================================
// Axon — Supabase Client (singleton, hardcoded values)
//
// NO imports from /utils/supabase/info.
// Values are hardcoded per backend spec.
// ============================================================
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://xdnciktarvxyhkrokbng.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkbmNpa3RhcnZ4eWhrcm9rYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTM4NjAsImV4cCI6MjA4Njc4OTg2MH0._nCGOiOh1bMWvqtQ62d368LlYj5xPI6e7pcsdjDEiYQ';

// Symbol.for singleton prevents "Multiple GoTrueClient instances" warning during HMR
const SUPA_KEY = Symbol.for('axon-supabase-singleton');

function getOrCreateClient(): SupabaseClient {
  const g = globalThis as Record<symbol, unknown>;
  if (!g[SUPA_KEY]) {
    g[SUPA_KEY] = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return g[SUPA_KEY] as SupabaseClient;
}

export const supabase = getOrCreateClient();
