# Auth Memory

## Estado actual
- Dual token working: ANON_KEY (Supabase anon) + X-Access-Token (user session)
- AuthContext has backward-compat aliases (20 properties)
- No password reset flow implemented
- No 401/session expiration handling

## Decisiones tomadas (NO re-litigar)
- Role NOT in JWT, comes from GET /institutions
- localStorage for token persistence

## Archivos clave
- context/AuthContext.tsx (487L) — main auth state, dual token logic, 20 backward-compat aliases
- lib/api.ts (308L) — axios instance, interceptors, token injection
- components/auth/*.tsx — login, register, route guards

## Bugs conocidos
- BUG-031 resolved (swallowed 500s)
