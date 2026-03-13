# CLAUDE.md — Axon Platform Frontend

## Project Overview

Axon is an educational platform (LMS) frontend built with React + TypeScript + Vite. It supports four user roles — Owner, Admin, Professor, and Student — each with their own layout, routes, and pages. The backend is Supabase Edge Functions. Deployment is on Vercel. The project originated from Figma Make code generation.

## Quick Reference

```bash
npm install        # Install dependencies
npm run dev        # Start Vite dev server
npm run build      # Production build (outputs to dist/)
```

No test runner or linter is configured. The build (`vite build`) is the primary validation step.

## Tech Stack

- **Framework**: React 18 + TypeScript (ES modules)
- **Bundler**: Vite 6 with `@vitejs/plugin-react`
- **Routing**: React Router v7 (data mode with `createBrowserRouter`)
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite` plugin) + `tw-animate-css`
- **UI Components**: shadcn/ui (Radix UI primitives) in `src/app/components/ui/`
- **Icons**: `lucide-react`
- **Animations**: `motion` (Framer Motion successor)
- **Backend**: Supabase (auth + Edge Functions API)
- **Rich Text**: TipTap editor
- **3D**: Three.js (deduplicated via Vite aliases)
- **Video**: Mux player
- **Toasts**: `sonner`
- **Deployment**: Vercel (SPA with catch-all rewrite to `index.html`)

## Path Alias

`@` is aliased to `./src` in `vite.config.ts`. Always use `@/` imports:
```ts
import { apiCall } from '@/app/lib/api';
import { colors } from '@/app/design-system';
```

## Directory Structure

```
src/
├── main.tsx                          # Entry point
├── styles/                           # Global CSS (fonts, tailwind, theme)
│   ├── index.css                     # Barrel: imports fonts → tailwind → theme
│   ├── fonts.css
│   ├── tailwind.css                  # Tailwind v4 config (@source directive)
│   └── theme.css
└── app/
    ├── App.tsx                       # Root: AuthProvider → RouterProvider → Toaster
    ├── routes.tsx                    # Central router (thin assembler, lazy layouts)
    ├── routes/                       # Per-role route definitions (lazy page imports)
    │   ├── student-routes.ts
    │   ├── professor-routes.ts
    │   ├── admin-routes.ts
    │   ├── owner-routes.ts
    │   └── *-student-routes.ts       # Feature-specific student sub-routes
    ├── components/
    │   ├── ui/                       # shadcn/ui primitives (DO NOT modify)
    │   ├── shared/                   # Reusable components (PageStates, FadeIn, etc.)
    │   ├── auth/                     # LoginPage, AuthLayout, RequireAuth, RequireRole
    │   ├── roles/                    # Role layouts (OwnerLayout, AdminLayout, etc.)
    │   │   └── pages/                # Role-specific pages
    │   │       ├── owner/
    │   │       ├── admin/
    │   │       ├── professor/
    │   │       └── student/
    │   ├── content/                  # Student views (StudyView, QuizView, etc.)
    │   │   └── flashcard/            # Flashcard sub-views
    │   ├── professor/                # Professor-specific components
    │   ├── dashboard/                # Dashboard widgets
    │   ├── ai/                       # AI-powered components
    │   ├── layout/                   # Layout shells
    │   ├── tiptap/                   # TipTap rich text editor + extensions
    │   ├── summary/                  # Summary-related components
    │   ├── video/                    # Video components (Mux)
    │   ├── viewer3d/                 # 3D model viewer (Three.js)
    │   ├── student/                  # Student-specific components
    │   ├── figma/                    # Figma-originated components
    │   └── design-kit.tsx            # Portable design system primitives
    ├── context/                      # React contexts
    │   ├── AppContext.tsx
    │   ├── AuthContext.tsx
    │   ├── PlatformDataContext.tsx    # Owner/Admin/Professor data
    │   ├── StudentDataContext.tsx     # Student-specific data
    │   └── ContentTreeContext.tsx
    ├── contexts/
    │   └── AuthContext.tsx            # Canonical auth context
    ├── services/                     # API service modules
    │   ├── platformApi.ts            # Owner/Admin/Professor API calls
    │   ├── studentApi.ts             # Student API calls
    │   ├── quizApi.ts
    │   ├── flashcardApi.ts
    │   ├── summariesApi.ts
    │   ├── contentTreeApi.ts
    │   ├── authApi.ts
    │   ├── aiService.ts
    │   └── ...
    ├── lib/                          # Core utilities
    │   ├── api.ts                    # Central API wrapper (apiCall)
    │   ├── config.ts                 # Environment config (hardcoded)
    │   ├── supabase.ts               # Supabase client
    │   ├── fsrs-engine.ts            # Spaced repetition (FSRS)
    │   ├── mastery-helpers.ts
    │   └── logger.ts
    ├── hooks/                        # Custom React hooks
    ├── types/                        # TypeScript type definitions
    │   ├── platform.ts               # Owner/Admin/Professor types
    │   ├── student.ts                # Student types
    │   ├── content.ts
    │   └── keywords.ts
    ├── design-system/                # Design tokens (colors, typography, etc.)
    │   ├── index.ts                  # Barrel re-export
    │   ├── colors.ts
    │   ├── typography.ts
    │   ├── components.ts
    │   ├── rules.ts                  # Mandatory/forbidden design rules
    │   └── ...
    ├── data/                         # Static/mock data
    ├── pages/                        # Top-level page components
    ├── DEVELOPER_CONTRACT.tsx        # Guide for Owner/Admin/Professor pages
    └── STUDENT_VIEW_CONTRACT.tsx     # Guide for Student views
```

> **Note**: `bkt-engine.ts` was deleted (TD-3). BKT computation is now inlined in `src/app/components/student/useQuizBkt.ts` and runs server-side in backend `batch-review.ts`.

## Architecture Patterns

### Authentication Flow

1. `supabase.auth.signInWithPassword()` → session JWT
2. `setAccessToken(jwt)` stored in module + localStorage
3. `GET /me` → user profile
4. `GET /institutions` → list with `membership_id` + `role`
5. Auto-select if 1 institution, otherwise show picker
6. Route by role

**Key rule**: The user role is NOT in the JWT. It comes from `GET /institutions`. A user can have different roles across institutions.

### API Convention

All API calls go through `apiCall()` in `src/app/lib/api.ts`:

- **Authorization header**: `Bearer <ANON_KEY>` (always, fixed Supabase gateway key)
- **X-Access-Token header**: `<user_jwt>` (when authenticated)
- **NEVER** put the user JWT in Authorization — it always goes in X-Access-Token
- **Response format**: `{ "data": ... }` on success, `{ "error": "message" }` on error

### Role-Based Architecture

| Aspect | Owner/Admin/Professor | Student |
|---|---|---|
| Data context | `usePlatformData()` | `useApp()` + `useStudentData()` |
| API service | `platformApi.ts` | `studentApi.ts` |
| Types | `types/platform.ts` | `types/student.ts` |
| Accent color | amber/blue/purple | teal |
| UI language | Spanish | Brazilian Portuguese |
| Page location | `roles/pages/{role}/` | `content/` |
| Toaster | Yes (per page) | No |
| Shared header | `PageHeader` | `AxonPageHeader` |

### Code-Splitting Strategy

- Role layouts are lazy-loaded — a student never downloads AdminLayout code
- Routes use `lazy()` for page components
- Heavy libraries are manually chunked: `vendor-react`, `vendor-three`, `vendor-motion`

### Page Development Pattern

Each page is a self-contained `.tsx` file. Follow the contracts:

- **Owner/Admin/Professor**: See `DEVELOPER_CONTRACT.tsx` — use `usePlatformData()`, `platformApi.ts`
- **Student views**: See `STUDENT_VIEW_CONTRACT.tsx` — use `useApp()`, `useStudentData()`, `studentApi.ts`

Pattern: Context data → local state → derived data (useMemo) → loading/error states → mutation handlers → render.

## Design System Rules

Import tokens from `@/app/design-system`:
```ts
import { colors, components, headingStyle } from '@/app/design-system';
```

### Mandatory
- Headings: Georgia, serif (via `fontFamily` inline style)
- Body text: Inter (via `font-sans` Tailwind class)
- Primary interaction color: teal (`#14b8a6`)
- Solid buttons: pill-shaped with `rounded-full`
- White cards: `rounded-2xl` with `shadow-sm`
- Icons: `bg-teal-50` + `text-teal-500` (no gradients)

### Forbidden
- Glassmorphism (`backdrop-blur` on content cards)
- Gradients on buttons or icons
- Blue/violet/purple on interactive elements (use teal instead)
- Font-size via Tailwind classes (`text-2xl`, etc.) — use `clamp()` or tokens

## Key Conventions

1. **Do not modify `src/app/components/ui/`** — these are shadcn/ui primitives
2. **Use shared components** from `src/app/components/shared/` before creating new ones
3. **Import icons from `lucide-react`** exclusively
4. **Use `sonner` for toasts** (student views should NOT add their own Toaster)
5. **Keep pages self-contained** — avoid editing shared files when building a page
6. **No `.env` files in git** — config values are hardcoded in `src/app/lib/config.ts`
7. **The `.gitignore` preserves `node_modules/@AxonPlataforma/`** — the design system package

## Build & Deploy

- **Build**: `npm run build` → outputs to `dist/`
- **Deploy**: Vercel (auto-deploys, SPA rewrite configured in `vercel.json`)
- **Security headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`
- **Asset caching**: `Cache-Control: public, max-age=31536000, immutable` for `/assets/*`
