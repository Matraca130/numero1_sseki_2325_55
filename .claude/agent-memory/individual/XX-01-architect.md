# XX-01 Architect — Individual Memory

Created: 2026-03-25
Last updated: 2026-03-25
Sessions executed: 1

---

## 1. Session Log

| # | Date | Type | Agents | Outcome | Lessons |
|---|------|------|--------|---------|---------|
| 1 | 2026-03-25 | Recon Batch 1 | 20 (QZ×6, FC×6, SM×6, ST×2) | All completed. Avg confidence 8.3/10 | 4 critical bugs, 3 registry gaps, multiple dead code. See below. |

---

## 2. Architectural Decisions

| ID | Date | Decision | Why | Alternatives discarded |
|----|------|----------|-----|----------------------|
| D1 | 2026-03-25 | Recon before fix — agents study first, fix after | Agents need domain knowledge before touching code. Blind fixes cause regressions. | Fix-first (risky without context) |
| D2 | 2026-03-25 | Sonnet for recon, Opus for fixes | Recon is read-only exploration — sonnet sufficient. Fixes need precision — opus required. | All opus (hits API 529 with 20 agents) |
| D3 | 2026-03-25 | Each agent fixes its own findings | Agent already has deep context from recon. Handing off to another agent loses context. | Central fix agent (loses section expertise) |
| D4 | 2026-03-25 | Classify fixes: safe/investigate/risky before launching | Prevents agents from "fixing" intentional design decisions. BKT v3.1 vs v4 might be intentional dual-system. | Fix everything (risky) |

---

## 3. Patterns That Work

- **Batch recon of 20 agents**: all completed successfully, no API 529 with sonnet model
- **Structured report format**: inventory + patterns + dependencies + confidence score gives excellent signal
- **Agents self-identify registry gaps**: QZ-02 and SM-02 both caught that their listed files don't exist
- **Cross-agent corroboration**: QZ-03, QZ-04, and ST-02 all independently confirmed BKT v3.1 vs v4 discrepancy — high confidence finding

## 4. Patterns to Avoid

- **Don't launch 20 opus agents simultaneously** — API 529 guaranteed. Use sonnet for read-only tasks.
- **Don't fix BKT parameter discrepancy without understanding intent** — v3.1 frontend is heuristic-only (visual), v4 backend is authoritative. May be intentional architecture.
- **Don't trust registry file paths blindly** — 3/20 agents found their listed files don't exist. Always verify.
- **NEVER use specialized subagent types for code fixes** — `study-hub`, `video-player`, `text-highlighter`, `docs-writer` etc. lack effective Bash/Edit permissions even with `bypassPermissions`. ALWAYS use `general-purpose` + `model: "opus"` + `mode: "bypassPermissions"` for any agent that needs to write code, run git, or edit files.
- **Don't forget `mode: "bypassPermissions"`** — without it, agents ask for confirmation and block. For autonomous operation, always include it.

## 5. Registry Corrections Needed

| Agent | Issue | Fix |
|-------|-------|-----|
| QZ-02 | Lists `routes/quiz*.ts`, `quiz-service.ts` — don't exist | Update to `routes-student.ts` (CRUD factory), `routes/study/reviews.ts`, `lib/bkt-v4.ts`, `lib/types.ts` |
| SM-02 | Lists `summary-service.ts` — doesn't exist | Update to `crud-factory.ts`, `summary-hook.ts`, `block-hook.ts`, `block-flatten.ts`, `auto-ingest.ts`, `publish-summary.ts` |
| SM-06 | `useTextAnnotations.ts` dead code, TextHighlighter possibly not integrated | Verify integration point before removing |

## 6. Bug Triage from Batch 1 Recon

### SAFE TO FIX (clear solution, low risk)
| Bug | Agent | Fix | Risk |
|-----|-------|-----|------|
| `watchTimeRef` never increments | SM-05 | Accumulate time in `onTimeUpdate` when `!el.paused` | Low — telemetry only |
| `StudyHubSections.tsx` orphaned | ST-01 | Remove file (confirmed not imported anywhere) | Low — dead code |
| `useTextAnnotations.ts` dead code | SM-06 | Remove file + old `textAnnotationsApi.ts` | Low — dead code |
| `saveReviews` legacy path | ST-02 | Document as deprecated, add TODO comment | Low — documentation |
| Cache key mismatch `kwConnections` vs `kwConnectionsResolved` | FC-05 | Align invalidation key | Medium — could affect cache |

### NEEDS INVESTIGATION (might be intentional)
| Bug | Agent | Question |
|-----|-------|----------|
| BKT v3.1 vs v4 params | QZ-04 | Is the frontend heuristic intentionally different from backend? (Likely YES — frontend is visual-only) |
| `useQuizNavigation` duplicated in QuizTaker | QZ-01 | Was extraction intentional but incomplete? Or is it the planned migration path? |

### RISKY (could break production)
| Bug | Agent | Why risky |
|-----|-------|-----------|
| `getKeywordsNeedingCards` stub | FC-06 | Implementing real logic requires understanding NeedScore from backend — not just unstubbing |
| `KeywordCollection` type collision | FC-06 | Two modules use same name with different shapes — refactoring requires coordinated rename |

## Session 2: [2026-03-27] Oleada de Especialización (69 agentes)

### Lección crítica: Sub-agentes no pueden escribir memorias
- **Causa 1**: Hook `check-agent-opus.cjs` bloquea Agent con `model != "opus"`. Oleada 1 usó `model: sonnet` → bloqueados.
- **Causa 2**: Sub-agentes heredan permisos restringidos. Write/Edit/Bash requieren aprobación del usuario en cada sub-agente.
- **Solución**: Patrón "investigador centralizado" — sub-agentes SOLO leen código, sesión principal aplica memorias.
- **Resultado**: Oleada 1 (18 agentes) completada exitosamente con este patrón. 259 líneas de conocimiento registradas.

### Patrón óptimo para especialización masiva
```
1. Lanzar sub-agente Sonnet con READ-ONLY (no intentar escribir)
2. Sub-agente analiza código y reporta hallazgos en su response
3. Sesión principal (Opus) extrae hallazgos y hace Edit/Write centralizado
4. Commit batch al final de cada oleada
```

## Session 3: [2026-03-27] Lecciones de administración de oleadas

### Errores cometidos y correcciones

| Error | Impacto | Corrección |
|-------|---------|-----------|
| Oleada 2 como 1 agente secuencial (18 tareas) | 590KB de output, 2/18 completados, atascado leyendo archivos irrelevantes | **SIEMPRE** lanzar agentes en paralelo directo — 1 agente por tarea, no 1 agente para 18 |
| Lanzar extractores Haiku para leer outputs | Duplicación de trabajo, 14 sub-agentes extra innecesarios | Usar Python en Bash para parsear JSON de outputs directamente |
| No anticipar que sub-agentes no pueden escribir | 18 agentes bloqueados en Write/Edit/Bash | Patrón correcto: sub-agentes READ-ONLY, sesión principal aplica cambios |
| settings.json con Write(.claude/**) no basta | Sub-agentes heredan restricciones del hook `check-agent-opus` | Aceptar que la escritura centralizada es más eficiente que permisos complejos |

### Patrones óptimos descubiertos

1. **Paralelismo máximo**: 18 agentes simultáneos Sonnet → todos completan en 60-90s
2. **Extracción con Python**: `json.loads()` en Bash parse outputs 10x más rápido que sub-agentes extractor
3. **Batch edits centralizados**: 6 archivos en paralelo con Edit tool → 1 commit → 1 push
4. **Verificación post-oleada**: `grep -c "Especialización" *.md` confirma que todos tienen datos

### Reglas para oleadas futuras

- NUNCA delegar 18 tareas a 1 agente secuencial
- SIEMPRE 1 agente = 1 archivo de memoria = 1 responsabilidad
- Sub-agentes son READ-ONLY; sesión principal es el escritor
- Commit batch por oleada (no por agente individual)
- Python para parsing, no sub-agentes

## 7. Self-Improvement Notes

- Next recon batch: ask agents to also report "files in my zone that are NOT in the registry" (reverse gap)
- Consider adding a "verify registry accuracy" step to every recon prompt
- The confidence score (1-10) is a useful health metric — track trends per agent across sessions
- 20 agents in background works well — no issues with completion notifications
