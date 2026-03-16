# Axon v4.4 — Agent 5: Welcome + Gamificacion

> **LEE ESTO PRIMERO.** Este archivo es la fuente de verdad PERMANENTE para el Agente 5.
> Antes de hacer CUALQUIER cambio, lee este archivo completo.
> Este archivo se actualiza con cada sesion. Si agregas archivos, actualiza las tablas.

---

## Que es este agente

Este agente es EXCLUSIVAMENTE el **agente de Welcome y Gamificacion** de Axon.
Cubre estas experiencias del estudiante:

1. **Welcome / Home** — pantalla de inicio del alumno, banner de XP, entry point a gamificacion
2. **Gamificacion (Dashboard)** — XP, niveles, racha, meta diaria, insignias, leaderboard, historial
3. **Gamificacion (Sub-paginas)** — BadgesPage, LeaderboardPage, XpHistoryPage
4. **Gamificacion (Widgets)** — componentes reutilizables que otros dominios (Quiz, Flashcards) consumen
5. **Navegacion del estudiante** — useStudentNav, ViewType (SOLO las entradas de gamificacion)

**NO** toques nada fuera de este scope:
- ❌ Dashboard, DashboardView, DashboardPage (otro agente)
- ❌ Review sessions, flashcard review (otro agente)
- ❌ Schedule, calendario (otro agente)
- ❌ Study dashboards, heatmaps, mastery dashboard (otro agente)
- ❌ Study Hub, study organizer, study plans (otro agente)
- ❌ Resumenes, keywords, profesor, admin, owner, billing, 3D models

---

## Arquitectura

- **Frontend:** React 18 + Vite + Tailwind CSS 4 + shadcn/ui + Lucide icons
- **Backend:** Hono web server en Supabase Edge Functions (Deno) — repo `Matraca130/axon-backend`
- **Base de datos:** Supabase PostgreSQL con 39+ tablas y RLS
- **State management:** React Query v5 (TanStack Query) — NO useState/useEffect para fetching
- **Animaciones:** Motion (framer-motion successor) — importar de `motion/react`
- **Routing:** `react-router` (NO `react-router-dom`)

---

## Conexion al Backend

```
Base URL (produccion): https://xdnciktarvxyhkrokbng.supabase.co/functions/v1/server
Prefijo backend:       PREFIX = "/server"
```

Headers requeridos en TODAS las peticiones:
```
Authorization:  Bearer {publicAnonKey}      <- SIEMPRE (gateway Supabase, FIJO)
X-Access-Token: {JWT del usuario logueado}  <- rutas autenticadas
```

La ANON_KEY esta hardcodeada en `/src/app/lib/api.ts`.

### Patron de respuestas
- Exito: `{ "data": ... }`
- Error: `{ "error": "mensaje descriptivo" }`
- Listas paginadas: `{ "data": { "items": [...], "total": N, "limit": N, "offset": N } }`

---

## Archivos en scope (SOLO estos)

### Rutas (SOLO las entradas de gamificacion)
| Archivo | Funcion | Nota |
|---|---|---|
| `/src/app/routes/study-student-routes.ts` | Contiene rutas de gamificacion: `gamification`, `badges`, `leaderboard`, `xp-history` | COMPARTIDO — solo tocar las entradas de gamificacion |
| `/src/app/hooks/useStudentNav.ts` | ViewType `'gamification'` | COMPARTIDO — solo tocar la entrada de gamificacion |

### Welcome (Home)
| Archivo | Funcion |
|---|---|
| `/src/app/components/content/WelcomeView.tsx` | Pantalla de inicio del alumno. Banner de XP → gamificacion. Entry: `/student` (index route) |

### Gamificacion — Vista principal
| Archivo | Funcion |
|---|---|
| `/src/app/components/content/GamificationView.tsx` | Dashboard de gamificacion completo (~23KB). Hero + stats + grid. Entry: `/student/gamification` |

### Gamificacion — Sub-componentes del dashboard (student/gamification/)
| Archivo | Funcion |
|---|---|
| `/src/app/components/student/gamification/StreakPanel.tsx` | Panel de racha: dias, riesgo, reparar, congelar |
| `/src/app/components/student/gamification/LeaderboardCard.tsx` | Card de leaderboard semanal/diario |
| `/src/app/components/student/gamification/BadgeShowcase.tsx` | Showcase de insignias ganadas + disponibles |
| `/src/app/components/student/gamification/XpHistoryFeed.tsx` | Feed de historial XP agrupado por dia |
| `/src/app/components/student/gamification/StudyQueueCard.tsx` | Card de cola de estudio FSRS |

### Gamificacion — Sub-paginas dedicadas (G6)
| Archivo | Funcion |
|---|---|
| `/src/app/components/gamification/pages/BadgesPage.tsx` | `/student/badges` — catalogo completo de insignias |
| `/src/app/components/gamification/pages/LeaderboardPage.tsx` | `/student/leaderboard` — leaderboard expandido |
| `/src/app/components/gamification/pages/XpHistoryPage.tsx` | `/student/xp-history` — historial XP paginado |

### Gamificacion — Widgets reutilizables (gamification/)
| Archivo | Funcion |
|---|---|
| `/src/app/components/gamification/index.ts` | Barrel export de todos los widgets |
| `/src/app/components/gamification/GamificationCard.tsx` | Card base con XP + nivel + racha (usado en WelcomeView, quiz, etc.) |
| `/src/app/components/gamification/LevelProgressBar.tsx` | Barra de progreso de nivel reutilizable |
| `/src/app/components/gamification/DailyGoalWidget.tsx` | Widget de meta diaria (ring animado) |
| `/src/app/components/gamification/BadgeShowcase.tsx` | Showcase compacto (diferente del de student/gamification/) |
| `/src/app/components/gamification/BadgeEarnedToast.tsx` | Toast de insignia ganada (usado por quiz, flashcards) |
| `/src/app/components/gamification/SessionXPSummary.tsx` | Resumen XP post-sesion (quiz, flashcards) |
| `/src/app/components/gamification/XPPopup.tsx` | Popup flotante de XP ganado |
| `/src/app/components/gamification/XPTimeline.tsx` | Timeline visual de transacciones XP |
| `/src/app/components/gamification/ComboIndicator.tsx` | Indicador de combo (respuestas correctas seguidas) |
| `/src/app/components/gamification/LevelUpCelebration.tsx` | Celebracion de subida de nivel |

### Hooks (data layer — React Query)
| Archivo | Funcion |
|---|---|
| `/src/app/hooks/useGamification.ts` | 9 hooks: useGamificationProfile, useStreakStatus, useBadges, useLeaderboard, useXPHistory, useStudyQueue, useDailyCheckIn, useStreakRepair + query keys |

### Services (API layer)
| Archivo | Funcion |
|---|---|
| `/src/app/services/gamificationApi.ts` | 14 funciones + 3 aliases. Wrappea apiCall() para los 13 endpoints de gamificacion + /study-queue |

### Types
| Archivo | Funcion |
|---|---|
| `/src/app/types/gamification.ts` | XPTransaction, XPAction, LEVEL_THRESHOLDS, getLevelInfo(), XP_TABLE, XP_DAILY_CAP, StreakStatus, Badge, StudyQueueItem/Meta/Response |

### Tests
| Archivo | Funcion |
|---|---|
| `/src/__tests__/gamification-route-integrity.test.ts` | 18 tests: rutas, lazy loaders, ViewType mapping, sub-paginas |
| `/src/__tests__/gamification-api-contracts.test.ts` | 16 tests: exports, level system, XP table, endpoint paths |

### Lib (utilidades compartidas — solo lectura, no modificar)
| Archivo | Funcion |
|---|---|
| `/src/app/lib/api.ts` | `apiCall()` wrapper con headers + `setAccessToken/getAccessToken` |
| `/src/app/lib/api-helpers.ts` | `extractItems()` — normaliza respuestas paginadas vs arrays |

### Estilos (solo lectura, no modificar)
| Archivo | Funcion |
|---|---|
| `/src/styles/theme.css` | Tokens de diseno + clase `axon-prose` |

---

## Archivos PROTEGIDOS (NUNCA modificar sin plan previo)

| Archivo | Razon |
|---|---|
| `/src/app/App.tsx` | Provider hierarchy — cualquier cambio rompe auth |
| `/src/app/routes.tsx` | Routing global — importa study-student-routes.ts |
| `/src/app/contexts/AuthContext.tsx` | Auth provider |
| `/src/app/context/AuthContext.tsx` | Auth provider (alias) |
| `/src/app/components/auth/*` | Auth guards y login |
| `/src/app/context/AppContext.tsx` | Global context |
| `/src/app/context/StudentDataContext.tsx` | Student data context |
| `/src/app/context/PlatformDataContext.tsx` | Platform data context |
| `*Layout.tsx` (cualquiera) | Layouts de todos los roles |
| `/src/app/components/figma/ImageWithFallback.tsx` | Sistema protegido |
| `/pnpm-lock.yaml` | Sistema protegido |
| `/src/app/components/student/SmartPopup.tsx` | Otro agente |
| `/src/app/hooks/useSmartPopupPosition.ts` | Otro agente |

### Archivos COMPARTIDOS (tocar SOLO entradas de gamificacion)
| Archivo | Que puedo tocar |
|---|---|
| `/src/app/routes/study-student-routes.ts` | Solo rutas: `gamification`, `badges`, `leaderboard`, `xp-history` |
| `/src/app/hooks/useStudentNav.ts` | Solo ViewType `'gamification'` y su mapping |

---

## API Reference — Gamificacion (13 endpoints + 1 study-queue)

Todos los endpoints de gamificacion requieren `institution_id` como query param.
Excepcion: `GET /badges` usa solo el JWT.

### Perfil y XP
```
GET    /gamification/profile?institution_id=xxx
       → GamificationProfile { xp: { total, today, this_week, level, daily_goal_minutes, daily_cap, streak_freezes_owned }, streak: { current, longest, last_study_date }, badges_earned }

GET    /gamification/xp-history?institution_id=xxx&limit=N&offset=N
       → { items: XPTransaction[], total, limit, offset }

GET    /gamification/leaderboard?institution_id=xxx&limit=N&period=weekly|daily
       → { leaderboard: LeaderboardEntry[], my_rank, period }
```

### Racha (Streak)
```
GET    /gamification/streak-status?institution_id=xxx
       → StreakStatus { current_streak, longest_streak, last_study_date, freezes_available, repair_eligible, streak_at_risk, studied_today, days_since_last_study }

POST   /gamification/daily-check-in?institution_id=xxx
       → CheckInResult { streak_status, events[] }
       ⚠ Retorna null en error — siempre hacer null check en onSuccess

POST   /gamification/streak-freeze/buy?institution_id=xxx
       → { freeze, xp_spent, remaining_xp, freezes_owned }

POST   /gamification/streak-repair?institution_id=xxx
       → { repaired, restored_streak, xp_spent, remaining_xp }
```

### Insignias (Badges)
```
GET    /gamification/badges[?institution_id=xxx][&category=xxx]
       → { badges: BadgeWithStatus[], total, earned_count }
       ⚠ getBadges(institutionId?, category?) — primer arg es institutionId, NO category

POST   /gamification/check-badges?institution_id=xxx
       → { new_badges, checked, awarded }

GET    /gamification/notifications?institution_id=xxx&limit=N
       → { notifications: GamificationNotification[], total }
```

### Metas y Onboarding
```
PUT    /gamification/daily-goal
       body: { institution_id, daily_goal_minutes }   ← B-001: columna es daily_goal_minutes

POST   /gamification/goals/complete
       body: { institution_id, goal_type }

POST   /gamification/onboarding
       body: { institution_id }
       → { message, already_exists }
```

### Cola de Estudio (fuera de /gamification)
```
GET    /study-queue[?course_id=xxx][&limit=N]
       → StudyQueueResponse { queue: StudyQueueItem[], meta: StudyQueueMeta }
       → Endpoint separado, NO requiere institution_id
```

---

## Sistema de Niveles

12 niveles, thresholds en `LEVEL_THRESHOLDS` (gamification.ts):

| Nivel | XP | Titulo |
|---|---|---|
| 1 | 0 | Novato |
| 2 | 100 | Aprendiz |
| 3 | 300 | Practicante |
| 4 | 600 | Interno |
| 5 | 1,000 | Residente Jr. |
| 6 | 1,500 | Residente |
| 7 | 2,200 | Residente Sr. |
| 8 | 3,000 | Especialista Jr. |
| 9 | 4,000 | Especialista |
| 10 | 5,500 | Subespecialista |
| 11 | 7,500 | Jefe de Servicio |
| 12 | 10,000 | Catedratico |

`getLevelInfo(totalXP)` retorna: `{ level, title, xp, next, xpInLevel, xpForNext, progress }`

---

## XP Actions

| Accion | XP Base | Origen |
|---|---|---|
| review_flashcard | 5 | Flashcard review |
| review_correct | 10 | Flashcard correcta |
| quiz_answer | 5 | Respuesta quiz |
| quiz_correct | 15 | Respuesta correcta quiz |
| complete_session | 25 | Sesion completada |
| complete_reading | 30 | Lectura completada |
| complete_video | 20 | Video completado |
| streak_daily | 15 | Check-in diario |
| complete_plan_task | 15 | Tarea de plan |
| complete_plan | 100 | Plan completado |
| rag_question | 5 | Pregunta a AI |

**XP_DAILY_CAP = 500** — cap diario de XP.

---

## Flujo de Navegacion

```
WelcomeView (index: /student)
  └── Click banner XP  ──→ /student/gamification (GamificationView)
          ├── "Volver al inicio" ──→ /student
          ├── Click "Ver todas" badges ──→ /student/badges (BadgesPage)
          ├── Click "Ver ranking" ──→ /student/leaderboard (LeaderboardPage)
          └── Click "Ver historial" ──→ /student/xp-history (XpHistoryPage)
```

ViewType `'gamification'` esta en el union type de `useStudentNav.ts`.
No necesita mapping especial (slug === ViewType).

---

## Reglas de desarrollo

### Data fetching
- **SIEMPRE** usar React Query v5 (useQuery/useMutation) — NUNCA useState+useEffect para fetching
- Hook layer: `useGamification.ts` (usa `import * as gamificationApi`)
- API layer: `gamificationApi.ts` (usa `apiCall()`)
- Types layer: `gamification.ts` (constants + pure functions)

### Gamificacion especifica
- `daily_goal_minutes` (NO `daily_goal`) — B-001 fix, columna del backend
- `getBadges(institutionId?, category?)` — primer arg es institutionId, NO category
- `dailyCheckIn()` retorna `null` en error — siempre null check en onSuccess
- SVG gradient IDs deben ser UNICOS por componente (evitar colisiones en DOM)
- `useReducedMotion()` de motion/react — respetar preferencia del usuario
- 5 edge cases validados: 0 XP, meta completada, nivel max 12, streak 0, sin badges

### Rutas
- **TODAS** las rutas son FLAT con query params. NUNCA rutas anidadas.
- Usar `lazyRetry()` para lazy loading (resiliente a stale chunks)
- Cada ruta nueva de gamificacion DEBE tener:
  1. Un `path` en studyStudentRoutes
  2. Tests en gamification-route-integrity.test.ts
  3. Si es navegable desde sidebar: un ViewType en useStudentNav.ts

### Diseno
- Paleta oficial "Axon Medical Academy":
  - Dark Teal: #1B3B36 (hero backgrounds)
  - Teal Accent: #2a8c7a (accent principal)
  - Hover Teal: #244e47
  - Dark Panel: #1a2e2a
  - Fondos pagina: #F0F2F5 / cards: #FFFFFF
  - Progress Ring gradient: #2dd4a8 → #0d9488
  - Sidebar texto inactivo: #8fbfb3
- Tailwind accent: teal-* (NUNCA violet/indigo como accent general)
- Componentes shadcn/ui + Lucide icons

### Tests
- Correr `pnpm test` antes de pushear
- Tests de integridad de rutas: gamification-route-integrity.test.ts
- Tests de contratos API: gamification-api-contracts.test.ts
- Patron: static analysis (no DOM, no network) — importar modulos y verificar exports/values

---

## Jerarquia de datos (gamificacion)

```
student_xp         → XP acumulado, nivel, meta diaria, streak freezes
xp_transactions    → Historial de XP (action, xp_base, xp_final, multiplier, bonus)
student_streaks    → Racha actual, mas larga, ultimo dia de estudio
student_badges     → Insignias ganadas (student_id, badge_id, earned_at)
badges             → Catalogo de insignias (slug, category, rarity, criteria)
study_queue        → Cola FSRS (flashcard_id, need_score, retention, due_at)
```

---

## Issues conocidos (documentados, no corregidos)

1. **SVG gradient IDs** — `ProgressRing` y `DailyGoalRing` usan IDs que podrian colisionar si se renderizan multiples instancias. Fix: agregar instance ID unico.
2. **globalIdx O(n²)** — XpHistoryFeed recalcula indice global en cada item del grupo. Fix: pre-computar offsets.
3. **LeaderboardCard unsafe casts** — `entry.xp_this_week!` sin null check. Fix: `?? 0`.
4. **daily_goal flash** — Al montar, `daily_goal_minutes` puede flashear 100→50 porque el profile tarda en cargar. Fix: skeleton o default del localStorage.
5. **Accesibilidad (L1-L4)** — ProgressRing sin role/aria, StatCards sin aria-label, DailyGoalRing sin anuncio de completado, XpHistoryFeed sin heading de grupo accesible.

---

## Historial de sesion

### 2026-03-16: Scope correction + GUIDELINES.md rewrite
- Correccion de scope: este agente es Welcome + Gamificacion SOLAMENTE
- Dashboard, review, calendario, study hub pertenecen a otro agente
- GUIDELINES.md reescrito como fuente de verdad permanente
- Agregados 34 tests de integridad (rutas + API contracts)

### 2026-03-13: PR #58 — Unorphan GamificationView
- 4 routing bugs: sin ruta, sin ViewType, accessor de nombre incorrecto, sin entry point
- 3 API showstoppers: imports rotos, null crash en dailyCheckIn, getBadges arg order
- 6 archivos, 5 commits, squash-merged a main como 7a9dd51

### 2026-03-13: Sesion de gamificacion (separada)
- Rewrite de useGamification.ts (import * pattern)
- B-001 fix: daily_goal → daily_goal_minutes
- G6: sub-paginas dedicadas (badges, leaderboard, xp-history)
- Widgets reutilizables (gamification/ directory)
