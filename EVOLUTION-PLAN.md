# PLAN GENERAL: Evolucion Premium UI/UX — ramadeEVOLUCION

> Inspirado en: Anthropic Skills (frontend-design + theme-factory)
> Tema base: Forest Canopy (earth tones, FreeSerif/FreeSans)
> Adaptado a: Axon Medical Academy (teal brand + medical education context)

---

## Diagnostico de Puntos Debiles (Investigacion Completada)

| # | Problema | Severidad | Impacto UX |
|---|---------|-----------|-----------|
| 1 | Login usa violet/indigo desconectado de la marca teal | Alta | Primera impresion rota |
| 2 | Georgia serif en headings es generica — no transmite premium | Alta | Identidad visual debil |
| 3 | Space Grotesk importado pero casi nunca usado | Media | Desperdicio de carga |
| 4 | Hardcoded hex values dispersos (no usan design tokens) | Alta | Inconsistencia visual |
| 5 | Sin dark mode real (solo sidebar/header oscuros) | Media | Experiencia incompleta |
| 6 | Owner/Admin/Professor pages son placeholders genericos | Alta | Percepcion no-premium |
| 7 | Student home (/) es "Coming Soon" | Alta | Landing vacia |
| 8 | RoleShell (slate gradients) vs StudentShell (teal) desconectados | Media | Identidad fragmentada |
| 9 | Fondos planos (#F0F2F5) sin textura ni profundidad | Media | Sensacion plana/generica |
| 10 | Animaciones existen pero son sutiles — falta "wow factor" | Media | Sin momento memorable |
| 11 | next-themes dep en app Vite (shadcn copy-paste issue) | Baja | Posible bug |
| 12 | Dual token sources (design-kit.tsx vs design-system/) | Alta | Drift de disefo |

---

## Estrategia: "Forest Canopy Premium" para Axon

### Filosofia de Diseno
- **Tone**: Luxury/refined + organic/natural (Forest Canopy earth tones fusionados con teal medico)
- **Diferenciador**: Tipografia premium (serif display + sans refined), micro-interacciones sofisticadas, texturas sutiles
- **Regla**: Cada cambio debe funcionar con el sistema actual — NO romper nada

### Paleta Forest Canopy Adaptada para Axon
- Forest Green `#2d4a2b` → se usa como accent secundario (complementa el teal)
- Sage `#7d8471` → texto secundario alternativo, bordes sutiles
- Olive `#a4ac86` → highlights, badges alternativos
- Ivory `#faf9f6` → reemplaza `#F0F2F5` como fondo premium (mas calido)
- Axon Teal `#2a8c7a` → se mantiene como primary action
- Dark Teal `#1B3B36` → se mantiene para sidebar/header

### Tipografia Premium
- **Headers**: Cambiar Georgia → **Playfair Display** (serif premium, Google Fonts, gratis)
  - Alternativa: **Libre Baskerville** o **Source Serif 4**
- **Body**: Mantener **Inter** (ya es solida)
- **Display/Hero**: Reemplazar Space Grotesk → **DM Sans** o **Plus Jakarta Sans** (mas premium)
- **Editorial/Reader**: Mantener **Lora** (ya es premium)
- **Mono**: Mantener JetBrains Mono

---

## PLAN 1: Foundation — Design Tokens + Typography (Etapa Actual)

### Objetivo
Actualizar los cimientos del sistema de diseno para que todo lo que se construya encima sea premium.

- [x] **1.1** Actualizar `index.html` — agregar Playfair Display + DM Sans fonts
- [x] **1.2** Actualizar `src/styles/fonts.css` — documentar nueva font stack
- [x] **1.3** Actualizar `src/app/design-system/typography.ts` — nueva familia heading (Playfair Display), display (DM Sans)
- [x] **1.4** Actualizar `src/app/design-system/colors.ts` — agregar Forest Canopy tokens (forestGreen, sage, olive, ivory)
- [x] **1.5** Actualizar `src/styles/theme.css` — CSS variables para nuevas fuentes y colores
- [x] **1.6** Actualizar `src/app/design-system/components.ts` — actualizar class recipes con nuevos tokens
- [x] **1.7** Crear `src/app/design-system/textures.ts` — patrones premium (noise, grain, gradients sutiles)
- [x] **1.8** Verificar build (`npm run build`) — cero errores

---

## PLAN 2: Login Premium (COMPLETADO)
> Primera impresion del usuario — debe ser memorable.
- [x] Redisenar LoginPage con paleta Forest Canopy + teal
- [x] Eliminar violet/indigo
- [x] Agregar animacion de entrada premium (organic floating shapes)
- [x] Background con textura/gradiente sophisticado (Forest mesh)

## PLAN 3: Layout Shell Premium (COMPLETADO)
> Sidebar, Header, Navigation — el marco de toda la app.
- [x] Background ivory (#faf9f6) en StudentShell y palette.ts
- [x] Sidebar section labels con DM Sans
- [x] AxonPageHeader: Playfair Display titulo, DM Sans subtitulo

## PLAN 4: Student Hub Premium (COMPLETADO)
> La vista principal del estudiante — hero + cards.
- Redisenar StudyHubHero
- Cards con hover states premium
- Tipografia display en titulos
- Iconos con fondo texturizado

## PLAN 5: Component Refinement (Pendiente)
> Pulir todos los componentes compartidos.
- KPICards, EmptyState, LoadingPage, ComingSoon
- Buttons, badges, progress bars
- Toasts y modals

## PLAN 6: Role Shells Unification (Pendiente)
> Unificar Owner/Admin/Professor con Student visual language.

## PLAN 7: Micro-interactions & Polish (Pendiente)
> Animaciones, scroll effects, transiciones de pagina.

---

## PLAN 6: Editorial/Prose Premium (EN PROGRESO)
> La experiencia de lectura donde el estudiante pasa mas tiempo.
- [ ] Actualizar axon-prose headings con Playfair Display
- [ ] Mejorar drop cap con Playfair Display
- [ ] Refinar blockquote styling con Forest Canopy accents
- [ ] Verificar build + commit + push

## PLAN 7: Micro-interactions & Polish (Pendiente)
> Animaciones, scroll effects, transiciones de pagina.

---

## Registro de Progreso

| Fecha | Plan | Paso | Status |
|-------|------|------|--------|
| 2026-03-22 | Plan 1 | Foundation | COMPLETADO |
| 2026-03-22 | Plan 2 | Login | COMPLETADO |
| 2026-03-22 | Plan 3 | Layout Shell | COMPLETADO |
| 2026-03-22 | Plan 4 | Student Hub | COMPLETADO |
| 2026-03-22 | Plan 5 | Components | COMPLETADO |
| 2026-03-22 | Plan 6 | Editorial | En progreso |

---
*Este archivo se actualiza con cada iteracion del loop.*
