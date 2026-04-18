# FC-03 Flashcards Tester — Memoria

## Sesiones

### 2026-04-18 — Cobertura de services + hooks de flashcards

**Tarea:** Escribir tests Vitest para services y hooks de flashcards sin cobertura.

**Archivos tocados (solo tests):**
- `src/app/services/__tests__/flashcardMappingApi.test.ts` (16 tests)
- `src/app/services/__tests__/reviewsApi.test.ts` (7 tests)
- `src/app/services/__tests__/adaptiveGenerationApi.test.ts` (30 tests)
- `src/app/hooks/__tests__/useSmartGeneration.test.ts` (14 tests)
- `src/app/hooks/__tests__/useFlashcardCoverage.test.ts` (12 tests)

**Total:** 79 tests, todos pasando. Parte del commit `daa6246` en `claude/view-untested-code-LCTZV`.

## Lecciones aprendidas

1. **`vi.clearAllMocks()` NO drena colas `mockResolvedValueOnce()`.**
   Usar `mockReset()` por mock, no `clearAllMocks` global, cuando hay `mockResolvedValueOnce` en múltiples tests. Si no, hay cross-test leak.

2. **`URLSearchParams` con `if (opts?.x)` omite `0` intencionalmente.**
   `offset=0` NO aparece en query-string. Verificar con `expect(url).not.toContain('offset=0')`, no con `toContain`.

3. **Hooks con caches a nivel de módulo requieren `vi.resetModules()` + dynamic import.**
   Ej. `_mappingCache` en `useFlashcardCoverage`. En `beforeEach`: `vi.resetModules()` y luego `await import(...)`.

4. **`useEffect(fetch, [])` dispara warnings de `act` benignos en mount.**
   Usar `waitFor(() => expect(...).toBe(...))` para esperar el estado estable. Los warnings no son bugs.

## Errores a evitar

- No asumir que `mockResolvedValueOnce` se limpia entre tests con `clearAllMocks`.
- No escribir aserciones que exigen `offset=0` en URLs — el builder las omite.

## Cumplimiento MASTERY-SYSTEMS.md

No introducir comparaciones de thresholds contra `p_know`/`mastery` en tests. Solo promedios para display. Comentar sistema (A/B/C) inline cuando se toca:
- `adaptiveGenerationApi.getReasonText` → Sistema A (BKT target)
- `useSmartGeneration.avgPKnow` → Sistema A (BKT target output)
- `useFlashcardCoverage.avgPKnow/stability/difficulty` → Sistema B (card mastery FSRS)

## Métricas

| Sesión | Fecha | Tests nuevos | Resultado |
|--------|-------|-------------|-----------|
| 1 | 2026-04-18 | 79 | Green |
