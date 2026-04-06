# Billing Memory

## Estado actual
- Stripe checkout + portal integrated
- Owner plans page exists (844L)
- Subscriptions page exists (373L)

## Decisiones tomadas (NO re-litigar)
- Stripe webhook HMAC validation required

## Archivos clave
- OwnerPlansPage.tsx (844L) — plan selection, Stripe checkout
- OwnerSubscriptionsPage.tsx (373L) — subscription management, portal link
- pa-plans.ts (127L) — plans API

## Bugs conocidos
- None open
