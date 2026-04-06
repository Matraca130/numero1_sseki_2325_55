# Agent Memory: AS-02 (auth-frontend)
Last updated: 2026-03-26

## Rol
Agente frontend de autenticación: mantiene el AuthContext, las páginas de login/registro, los guards de rutas basados en roles (RequireAuth, RequireRole) y la lógica de redirección post-login.

## Lecciones aprendidas
| Fecha | Lección | Prevención |
|-------|---------|------------|
| 2026-03-25 | (inicial) Archivo creado | — |
| 2026-03-26 | Para tests de AuthContext, mockear supabase y api con funciones proxy (`(...args) => mockFn(...args)`) en vi.mock factories permite reconfigurar mocks por test sin problemas de hoisting | Usar funciones proxy en vi.mock, no importar mocks directamente |
| 2026-03-26 | signup() usa fetch directo (no apiCall) porque POST /signup no necesita X-Access-Token -- tests deben mockear globalThis.fetch para este caso | Verificar si la funcion bajo test usa fetch o apiCall antes de escribir el mock |
| 2026-03-26 | AuthContext tiene console.log/error con guard `import.meta.env.DEV` que produce stdout en vitest (env=jsdom, DEV=true) -- no es un problema, es output esperado | No suprimir logs DEV-only a menos que contaminen la salida de un test |

## Efectividad de lecciones
| Lección | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
| (se llena cuando una lección se activa en una sesión real) | — | — | — |

> Confianza: ALTA (previno 3+ errores), MEDIA (previno 1-2), BAJA (no previno o recurrió), NUEVA (sin datos)

## Decisiones técnicas (NO re-litigar)
| Fecha | Decisión | Por qué | Alternativas descartadas |
|-------|----------|---------|--------------------------|

## Patrones que funcionan
- Usar `apiCall()` de `lib/api.ts` para todas las llamadas HTTP — nunca fetch directo
- Leer CLAUDE.md + `memory/feedback_agent_isolation.md` + `agent-memory/auth.md` antes de tocar código
- Revisar AGENT-METRICS.md (fila propia) para no repetir errores de sesiones anteriores
- Sincronizar tokens en localStorage con el AuthContext via `onAuthStateChange` de Supabase
- Guards como componentes wrapper de React Router v6: RequireAuth verifica sesión, RequireRole verifica rol
- PostLoginRouter: lógica de redirección basada en rol del usuario, nunca hardcodear rutas en componentes de página
- SelectRolePage: mostrar solo cuando el usuario tiene múltiples roles asignados
- Escalar al Arquitecto (XX-01) ante cualquier necesidad de modificar archivos fuera de la zona de ownership
- Para tests de AuthContext: usar `renderHook()` + `waitFor()` de @testing-library/react, con AuthProvider como wrapper
- Mock de supabase: funciones proxy en vi.mock factory para permitir reconfiguracion por test (mockGetSession, mockSignInWithPassword, etc.)
- Mock de api: mockApiCall con mockImplementation que rutea por path ('/me', '/institutions')
- signup() usa fetch directo, no apiCall -- mockear globalThis.fetch para tests de signup

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Usar `any` en TypeScript | Rompe la seguridad de tipos del proyecto | Tipar correctamente o usar `unknown` con narrowing |
| `console.log` en producción | Contamina logs, puede exponer tokens o datos de sesión | Eliminar antes de commit |
| Almacenar tokens sensibles fuera de localStorage gestionado por AuthContext | Estado inconsistente de sesión | Centralizar gestión de tokens en AuthContext |
| Hardcodear rutas de redirección en componentes de página | Acoplamiento y dificulta mantenimiento | Centralizar lógica de redirección en PostLoginRouter |
| Modificar archivos fuera de la zona: AuthContext, components/auth/*, RequireAuth, RequireRole | Viola aislamiento de agentes | Escalar al Arquitecto (XX-01) |
| Omitir guard RequireRole en rutas que requieren rol específico | Expone páginas de rol a usuarios sin permisos | Siempre componer RequireAuth + RequireRole en rutas protegidas |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 1 | 2026-03-26 |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
| Tests escritos | 16 | 2026-03-26 |
