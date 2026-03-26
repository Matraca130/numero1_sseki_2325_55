---
paths:
  - "numero1_sseki_2325_55/src/app/components/**"
  - "numero1_sseki_2325_55/src/app/design-system/**"
  - "numero1_sseki_2325_55/src/app/pages/**"
---

# Axon Design System Rules

Import tokens from `@/app/design-system`:
```ts
import { colors, components, headingStyle } from '@/app/design-system';
```

## Mandatory
- Headings: Georgia, serif (via `fontFamily` inline style)
- Body text: Inter (via `font-sans` Tailwind class)
- Primary interaction color: teal (`#14b8a6`)
- Solid buttons: pill-shaped with `rounded-full`
- White cards: `rounded-2xl` with `shadow-sm`
- Icons: `bg-teal-50` + `text-teal-500` (no gradients)

## Forbidden
- Glassmorphism (`backdrop-blur` on content cards)
- Gradients on buttons or icons
- Blue/violet/purple on interactive elements (use teal instead)
- Font-size via Tailwind classes (`text-2xl`, etc.) — use `clamp()` or tokens
