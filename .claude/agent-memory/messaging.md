# Messaging Memory

## Estado actual
- Telegram bot linking working (link code, status, unlink)
- WhatsApp feature-flagged
- Admin messaging settings page exists

## Decisiones tomadas (NO re-litigar)
- Feature flags for WhatsApp

## Archivos clave
- services/student-api/sa-telegram.ts — Telegram link/unlink/status
- services/platform-api/pa-messaging.ts — messaging settings API
- AdminMessagingSettingsPage.tsx (521L) — admin messaging config UI

## Bugs conocidos
- None open
