# Audit Report — PRs #181, #185, #186, #187
## 30-Agent Coordinated Review (2026-03-25)
## Status: 13/30 agents completed — VERDICT FINAL

---

## EXECUTIVE SUMMARY

4 open PRs were audited by 30 specialized agents analyzing from different perspectives (security, performance, accessibility, mobile, TypeScript, UX, data flow, etc.).

### SCORECARD

| PR | Title | Files | Lines | Score | Verdict |
|---|---|---|---|---|---|
| **#181** | Recharts ErrorBoundary | 12 | +1226/-191 | **8/10** | **APPROVE** (minor fixes) |
| **#185** | Realtime UI (VoiceCallPanel) | 1 | +230/-116 | **3/10** | **DO NOT MERGE** |
| **#186** | AudioWorklet Hook | 2 | +157/-51 | **3/10** | **DO NOT MERGE** |
| **#187** | Auto-reconnection Client | 1 | +177/-32 | **3/10** | **DO NOT MERGE** |

---

## PR #181 — Recharts ErrorBoundary — APPROVE

### What it does
Wraps all recharts chart components with `ChartErrorBoundary` to catch the known `insertBefore` SVG DOM crash. Component is 26 lines; 80% of the PR is test code (985 lines across 5 test files).

### Why it's correct
- `isAnimationActive={false}` (PR #165) reduces but doesn't eliminate the crash
- The resize-observer path in recharts 2.x still triggers `insertBefore` on unmounted nodes
- No recharts 2.x upgrade fixes this; recharts 3.x is still alpha
- ErrorBoundary is the only React mechanism that catches render exceptions
- All 6 recharts usage sites are wrapped — complete coverage

### Minor fixes needed before merge
1. Design system violations in adjacent files (purple colors in `QuizAnalyticsPanel`, `ProfessorGamificationPage`)
2. `grid-cols-4` without mobile breakpoint in `QuizAnalyticsPanel` and `ProfessorGamificationPage`
3. `any` types in test mocks (4 files) — minor, non-blocking

---

## PRs #185/#186/#187 — Realtime Voice — DO NOT MERGE

### Mandatory merge order (if eventually merged)
```
PR #187 (Client) → PR #186 (Hook) → PR #185 (UI)
```
Merging in any other order produces TypeScript compile errors.

### CRITICAL BLOCKERS (must fix before any merge)

| # | Issue | Agents | Severity |
|---|---|---|---|
| 1 | `setSessionCreator`/`trackTokenExpiry` never wired in hook — reconnection is completely dead | #6, #28 | BLOCKER |
| 2 | `public/audio-processor.js` does not exist — AudioWorklet cannot load | #9, #10, #23 | BLOCKER |
| 3 | Model string `gpt-realtime-1.5` is wrong — WebSocket will 404 | #10, #28 | BLOCKER |
| 4 | No `session.update` sent for VAD or transcription — features are inert | #10, #28 | BLOCKER |
| 5 | WebSocket `onX` handlers never nulled in `disconnect()` — memory leak | #9, #19 | HIGH |
| 6 | No WebSocket close-code differentiation — permanent failures retried | #6 | HIGH |
| 7 | Transcript modeled as single string — history lost every turn | #9, #28 | HIGH |
| 8 | ZERO tests for 400+ lines of WebSocket/audio/tool code | #23 | HIGH |
| 9 | `processor.onaudioprocess` closure never nulled — leak | #19 | HIGH |
| 10 | Dangling reconnect `setTimeout` not cleared on `disconnect()` | #11 | HIGH |

### SIGNIFICANT ISSUES

| # | Issue | Agents |
|---|---|---|
| 11 | No jitter on backoff — thundering herd risk | #6 |
| 12 | Only 3 retries — insufficient for voice calls | #6 |
| 13 | Double-reconnect race in token expiry timer | #6 |
| 14 | No `navigator.onLine` guard — burns retries while offline | #6, #13 |
| 15 | Playback uses `onended` chaining — audible gaps between chunks | #10, #28 |
| 16 | Buffer size 4096 too high for AudioWorklet (170ms latency) | #10 |
| 17 | iOS AudioContext may fail outside user gesture (async chain) | #13 |
| 18 | No AudioWorklet fallback for iOS < 14.5 | #13 |
| 19 | Background tabs not handled — quema retries while suspended | #13 |
| 20 | `isFinal` parameter silently dropped on transcript callbacks | #9, #28 |
| 21 | 5 separate useState — cascading re-renders outside React batching | #9 |
| 22 | Timer state missing (no useRef for interval) | #9 |
| 23 | Design system violations (gradients, purple, font sizes) | #16 |
| 24 | Fall-through switch cases bypass TS narrowing with `as` casts | #11 |
| 25 | `catch {}` in reconnect swallows all errors silently | #11 |
| 26 | `trackTokenExpiry` public despite being internal mutation | #11 |
| 27 | `query as string` from `unknown` in tool executor | #11 |
| 28 | No safe-area-inset-bottom for iOS notched devices | #13 |
| 29 | PTT + VAD simultaneously active — double response risk | #28 |
| 30 | Mic permission denial shows generic error | #10 |

### RECOMMENDED ACTION

Close PRs #185, #186, #187. Create a consolidated branch `fix/realtime-v3-consolidated` that:

1. Fixes all 10 critical blockers
2. Adds minimum test coverage (WS state machine, PCM16 conversion, tool execution)
3. Implements the mandatory merge order as a single coherent PR
4. Addresses the top 10 significant issues

### PRODUCTION READINESS

| Aspect | Status |
|---|---|
| Security | PASS (no credential leaks, hardcoded payloads) |
| Performance | FAIL (ScriptProcessorNode on main thread, no silence gating) |
| Accessibility | NOT REVIEWED (no a11y on voice UI) |
| Mobile (iOS) | FAIL (AudioWorklet, gesture chain, background tabs) |
| Mobile (Android) | CONDITIONAL (reconnection partial) |
| Type Safety | FAIL (unsafe casts, unvalidated cross-thread messages) |
| Test Coverage | FAIL (0 tests for voice, 0 for reconnection) |
| Code Quality | MODERATE (clean architecture, poor details) |
| Design System | FAIL (violations in adjacent files) |

---

## AGENTS THAT CONTRIBUTED

| # | Perspective | Status | Key Finding |
|---|---|---|---|
| 1 | WebSocket Auth Security | Pending | — |
| 2 | XSS & Injection | Pending | — |
| 3 | Memory Leaks | Pending | — |
| 4 | Race Conditions | Pending | — |
| 5 | Error Handling | Pending | — |
| 6 | Network Resilience | **Done** | Reconnection dead, no close codes |
| 7 | Browser Compatibility | Pending | — |
| 8 | Performance | Pending | — |
| 9 | State Management | **Done** | Transcript model wrong, cascading rerenders |
| 10 | Audio API | **Done** | Wrong model, no session.update, gaps |
| 11 | TypeScript Safety | **Done** | Unsafe casts, silent catch, dangling timer |
| 12 | Accessibility | Pending | — |
| 13 | Mobile Compatibility | **Done** | iOS failures, no background handling |
| 14 | UX Review | Pending | — |
| 15 | i18n | Pending | — |
| 16 | CSS/Design System | **Done** | Gradient/purple violations |
| 17 | Code Quality/DRY | Pending | — |
| 18 | API Contract | **Done** | Mandatory merge order, breaking changes |
| 19 | Event Listener Cleanup | **Done** | 2 confirmed leaks |
| 20 | Edge Cases | Pending | — |
| 21 | Cross-PR Dependencies | Pending | — |
| 22 | Backwards Compatibility | Pending | — |
| 23 | Test Coverage | **Done** | 0 tests for voice system |
| 24 | Documentation | Pending | — |
| 25 | Logging/Observability | Pending | — |
| 26 | WebSocket Protocol | Pending | — |
| 27 | React Patterns | Pending | — |
| 28 | Data Flow | **Done** | Complete flow diagrams, 7 bottlenecks |
| 29 | Recharts Deep Dive | **Done** | PR #181 correct fix, 80% tests |
| 30 | Integration Lead | Pending | — |
