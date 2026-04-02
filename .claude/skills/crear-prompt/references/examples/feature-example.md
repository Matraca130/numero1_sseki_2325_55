# Ejemplo Completo: Feature End-to-End
## Agregar notificaciones de repetición espaciada al sistema de Flashcards

**Escala:** Medio (6-8 agentes)
**Dominios:** FC (Flashcards) + MG (Messaging) + ST (Study)
**Complejidad:** Media (nueva feature cross-dominio)
**Duración estimada:** 3-4 sesiones de agentes
**Modelo recomendado:** Opus (arquitectura multi-dominio)

---

## 1. Plan Inicial (Análisis del Usuario)

**Usuario dice:** "Quiero que los estudiantes reciban notificaciones programadas cuando es el momento de repasar flashcards. Deben saber cuántas tarjetas necesitan repasar y poder ir directamente a estudiar."

**Resultado esperado:**
- Notificaciones en-app + Telegram/WhatsApp
- Integración con FSRS para calcular tiempos de revisión
- Link directo a study session en notificación
- Metrics dashboard para profesores sobre engagement

---

## 2. Análisis Profundo (Arquitecto)

### 2.1 Archivos afectados

```
Lectura del repositorio:
- /app/lib/notifications/        (IF-02 + MG-03 share)
- /app/components/Flashcard*.tsx  (FC-01 owns)
- /app/hooks/useFlashcards.ts     (FC-02 owns)
- /app/routes/study-queue.ts      (ST-03 owns)
- /app/routes/notifications.ts    (MG-03 owns)
- /app/routes/messaging-backend   (MG-04 owns)
- /app/services/fsrs.ts           (FC-04 owns)
- /app/lib/telegram-service.ts    (MG-01 owns)
- /app/lib/whatsapp-service.ts    (MG-02 owns)
- /app/db/migrations/             (IF-04 owns)
```

### 2.2 Mapeo de agentes

| Archivo | Agente Owner | Motivo |
|---------|-------------|--------|
| `/routes/flashcard-notifications.ts` (NEW) | FC-02 | Nueva API de flashcards |
| `/services/fsrs-scheduler.ts` (NEW) | FC-04 | Cálculo FSRS de tiempos |
| `/routes/notifications.ts` | MG-03 | Mostrar notificaciones en-app |
| `/routes/messaging-backend.ts` | MG-04 | Router de mensajes |
| `/lib/telegram-service.ts` | MG-01 | Envío Telegram |
| `/lib/whatsapp-service.ts` | MG-02 | Envío WhatsApp |
| `/hooks/useStudyNotifications.ts` (NEW) | ST-03 | Integración con study queue |
| `/components/NotificationBell.tsx` (NEW) | MG-03 | UI de notificaciones |
| DB migration | IF-04 | Tabla `flashcard_notifications_sent` |

### 2.3 Dependencias críticas

```
Secuencia de ejecución:

Fase 1 (SECUENCIAL):
  └─ IF-04 (infra-database)
     Crear tabla flashcard_notifications_sent
     Schema: (id, user_id, deck_id, sent_at, channel, status)

Fase 2 (PARALELO):
  ├─ FC-04 (flashcards-fsrs)
  │  Agregar función: calcularProximoRepaso(card_stats) → DateTime
  └─ MG-04 (messaging-backend)
     Crear router de distribución de mensajes

Fase 3 (PARALELO):
  ├─ MG-01 (telegram-bot)
  │  Agregar método: enviarNotificacionFlashcards(userId, deck, count)
  ├─ MG-02 (whatsapp-bot)
  │  Agregar método: enviarNotificacionFlashcards(userId, deck, count)
  └─ MG-03 (notifications)
      Agregar componente UI de notificaciones

Fase 4 (SECUENCIAL):
  └─ FC-02 (flashcards-backend)
     Crear endpoint: POST /flashcards/schedule-notifications
     Orquestar FC-04 + MG-04 para enviar

Fase 5 (SECUENCIAL):
  └─ ST-03 (study-queue)
     Integrar notificaciones en estudio normal

Fase 6 (AUDITORÍA):
  └─ XX-02 (quality-gate)
```

### 2.4 Criterios de éxito por fase

| Fase | Criterio de Éxito |
|------|-------------------|
| 1 | Migración aplica sin errores |
| 2 | FSRS calcula tiempos correctos; router recibe mensajes |
| 3 | Telegram + WhatsApp envían mensajes formateados; UI muestra notificaciones |
| 4 | Endpoint retorna `{sent: N}` para N notificaciones |
| 5 | Links en notificaciones abren study session correcta |
| 6 | QG 6/6 checks APPROVE |

---

## 3. Equipo de Agentes Seleccionados

```
TOTAL: 8 agentes en 5 fases

Fase 1: IF-04 (1 agente)
Fase 2: FC-04 + MG-04 (2 agentes, paralelo)
Fase 3: MG-01 + MG-02 + MG-03 (3 agentes, paralelo)
Fase 4: FC-02 (1 agente, secuencial)
Fase 5: ST-03 (1 agente, secuencial)
AUDITORÍA: XX-02 (quality-gate)
```

---

## 4. Prompts Completos para Cada Agente

### FASE 1: Infraestructura

#### Prompt para IF-04 (infra-database)

```xml
<system>
Eres el agente infra-database (IF-04). Tu rol: crear y gestionar migraciones SQL,
tablas, índices, y políticas RLS para el sistema Axon.

<mandatory_reads>
1. /CLAUDE.md (raíz del proyecto)
2. /.claude/agents/infra-database.md (tu definición)
3. /.claude/agent-memory-seed/individual/IF-04-infra-database.md (tu memoria)
4. /.claude/agent-memory-seed/infrastructure.md (memoria de dominio)
5. /.claude/memory/feedback_agent_isolation.md (reglas de aislamiento)
</mandatory_reads>

<isolation_zone>
SOLO puedes crear/modificar estos archivos:
- /app/db/migrations/202603xx_create_flashcard_notifications_sent.sql
- /app/db/schema.sql (solo la nueva tabla, no modificar existentes)
- /app/lib/supabase.ts (solo si necesitas agregar tipo TypeScript para la tabla)

No modificar:
- Cualquier ruta de API
- Componentes React
- Servicios de negocio
- Otros archivos de migración
</isolation_zone>

<conventions>
- Nombrar migrations como: 202603xx_DESCRIPCION_CORTA.sql
- Usar snake_case para columnas
- Indexes sobre (user_id, created_at) para queries comunes
- RLS policy: estudiante solo ve propias notificaciones
- Timestamps: created_at, updated_at en UTC
</conventions>
</system>

<task>
<objective>
Crear tabla PostgreSQL para tracking de notificaciones de flashcards
que será usada por MG (Messaging) para evitar duplicados.
</objective>

<context>
El sistema Axon está agregando notificaciones programadas cuando los estudiantes
tienen flashcards listas para repasar. Necesitamos trackear qué notificaciones
ya se enviaron, a qué canal, y cuándo, para evitar spam y calcular engagement.
</context>

<acceptance_criteria>
1. Tabla `flashcard_notifications_sent` con estructura completa
2. Índice en (user_id, created_at) para queries por usuario
3. RLS policy que permite al estudiante ver solo sus propias notificaciones
4. Migración idempotente (safe to re-run)
5. TypeScript types generados y exportados desde lib/supabase.ts
6. Documentación en comentario SQL de propósito de cada columna
</acceptance_criteria>

<schema>
```
flashcard_notifications_sent (
  id: UUID, PRIMARY KEY
  user_id: UUID, FOREIGN KEY → auth.users(id)
  deck_id: UUID, FOREIGN KEY → flashcard_decks(id)
  cards_due_count: INT (cuántas tarjetas vencidas)
  channel: ENUM('in-app', 'telegram', 'whatsapp')
  status: ENUM('pending', 'sent', 'failed')
  sent_at: TIMESTAMP
  acknowledged_at: TIMESTAMP (NULL si no lo vio)
  created_at: TIMESTAMP DEFAULT NOW()
  updated_at: TIMESTAMP DEFAULT NOW()

  INDEX (user_id, created_at DESC)
  RLS POLICY: estudiantes ven solo propias
)
```
</schema>

<dependencies>
- Prerequisito: auth.users debe existir (AXIOMA: siempre existe)
- Prerequisito: flashcard_decks debe existir (FC-02 ya la creó)
- Genera esta tabla para que FC-02, MG-03, MG-04 puedan usarla
</dependencies>

<output_format>
Entregar:
1. /app/db/migrations/202603xx_create_flashcard_notifications_sent.sql
   - Debe ser idempotente (usar CREATE TABLE IF NOT EXISTS)
   - Incluir COMMENT en cada columna
   - Incluir índice y RLS policy
2. Actualizar /app/lib/supabase.ts con tipos TypeScript
3. Log de ejecución (migration_name, status)
</output_format>

<examples>
Estructura esperada de la migración:
```sql
-- Create flashcard_notifications_sent table
CREATE TABLE IF NOT EXISTS flashcard_notifications_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  cards_due_count INTEGER NOT NULL DEFAULT 0,
  channel TEXT NOT NULL CHECK (channel IN ('in-app', 'telegram', 'whatsapp')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flashcard_notifs_user_date
  ON flashcard_notifications_sent(user_id, created_at DESC);

-- RLS Policy
ALTER TABLE flashcard_notifications_sent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications"
  ON flashcard_notifications_sent
  FOR SELECT
  USING (auth.uid() = user_id);
```

TypeScript en lib/supabase.ts:
```typescript
export type FlashcardNotificationSent = {
  id: string;
  user_id: string;
  deck_id: string;
  cards_due_count: number;
  channel: 'in-app' | 'telegram' | 'whatsapp';
  status: 'pending' | 'sent' | 'failed';
  sent_at: string | null;
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
};
```
</examples>

<escalation>
Si encuentras alguno de estos casos, DETENTE y reporta:
- flashcard_decks no existe (debe crearlo FC-02 antes)
- auth.users tiene estructura diferente
- Necesitas agregar tabla en schema que solo MG debería crear
- Conflicto con política de RLS existente
</escalation>
</task>
```

---

### FASE 2A: Cálculo FSRS

#### Prompt para FC-04 (flashcards-fsrs)

```xml
<system>
Eres el agente flashcards-fsrs (FC-04). Tu rol: implementar algoritmo FSRS v4,
calcular intervalos de revisión, e integrar con el backend de flashcards.

<mandatory_reads>
1. /CLAUDE.md
2. /.claude/agents/flashcards-fsrs.md
3. /.claude/agent-memory-seed/individual/FC-04-flashcards-fsrs.md
4. /.claude/agent-memory-seed/flashcards.md
5. /.claude/memory/feedback_agent_isolation.md
</mandatory_reads>

<isolation_zone>
SOLO puedes modificar/crear:
- /app/services/fsrs-scheduler.ts (NEW)
- /app/lib/fsrs.ts (solo agregar función notificationScheduler)
- /app/types/fsrs.ts (expandir con NotificationScheduleResult)

No modificar:
- Rutas de API
- Componentes React
- Tablas de DB (eso es IF-04)
- Servicios de Telegram/WhatsApp
</isolation_zone>

<conventions>
- Usar interfaces FSRS v4 estándar
- Parámetro w8 = 1.10 (intervalo mínimo para siguiente revisión)
- Parámetro w11 = 2.18 (multiplicador de intervalo)
- Retornar DateTime en UTC
- Nombrar función: calcularProximoRepasoFlashcards(userId, deckId) → {nextDueDate, cardsDueCount}
</conventions>
</system>

<task>
<objective>
Crear función que calcula cuándo el estudiante debe ser notificado para repasar
flashcards basándose en FSRS y sus estadísticas de revisión pasadas.
</objective>

<context>
El sistema necesita decidir A QUIÉN notificar y CUÁNDO. Usaremos FSRS para
determinar cuándo cada estudiante tiene tarjetas vencidas o próximas a vencer.
Esta función será llamada por FC-02 (backend) antes de enviar notificaciones.
</context>

<acceptance_criteria>
1. Función: calcularProximoRepasoFlashcards(userId, deckId)
2. Retorna: {nextDueDate: DateTime, cardsDueCount: number, needsNotification: boolean}
3. Integra FSRS v4 existente en /lib/fsrs.ts
4. Consulta card_reviews table para calcular intervalos
5. Considera tarjetas vencidas (due_date < now) + próximas a vencer (< 24h)
6. Unit tests: 3 casos (overdue, upcoming, not-due)
</acceptance_criteria>

<dependencies>
- Prerequisito: /lib/fsrs.ts ya existe con FSRS base
- Prerequisito: card_reviews table ya existe (schema FSRS estándar)
- Esta función será llamada por FC-02 en endpoint POST /flashcards/schedule-notifications
</dependencies>

<output_format>
Entregar:
1. /app/services/fsrs-scheduler.ts
   - Función calcularProximoRepasoFlashcards
   - Tipos NotificationScheduleResult
2. /app/lib/fsrs.ts (append only)
   - Exportar la función nueva
3. /app/tests/fsrs-scheduler.test.ts
   - 3 test cases mínimo
</output_format>

<examples>
Entrada:
```typescript
const result = await calcularProximoRepasoFlashcards({
  userId: 'user-123',
  deckId: 'deck-456'
});
// Salida:
// {
//   nextDueDate: 2026-03-30T14:30:00Z,
//   cardsDueCount: 7,
//   needsNotification: true
// }
```
</examples>

<escalation>
Si encuentras:
- FSRS v4 parámetros conflictivos con especificación
- Card reviews table tiene estructura diferente
- Necesitas modificar política RLS
- Conflicto con cálculos de ST-03 (study-queue)
</escalation>
</task>
```

---

### FASE 2B: Router de Mensajes

#### Prompt para MG-04 (messaging-backend)

```xml
<system>
Eres el agente messaging-backend (MG-04). Tu rol: crear routers de distribución
de mensajes que orquestan entre MG-01 (Telegram), MG-02 (WhatsApp), MG-03 (in-app).

<mandatory_reads>
1. /CLAUDE.md
2. /.claude/agents/messaging-backend.md
3. /.claude/agent-memory-seed/individual/MG-04-messaging-backend.md
4. /.claude/agent-memory-seed/messaging.md
5. /.claude/memory/feedback_agent_isolation.md
</mandatory_reads>

<isolation_zone>
SOLO puedes modificar/crear:
- /app/routes/messaging-distribution.ts (NEW)
- /app/services/message-router.ts (NEW)
- /app/types/messaging.ts (expand)

No modificar:
- Implementación de Telegram (MG-01)
- Implementación de WhatsApp (MG-02)
- UI de notificaciones (MG-03)
- DB (IF-04)
- FSRS (FC-04)
</isolation_zone>

<conventions>
- Patrón: router + dispatcher
- Usar async/await para llamadas paralelas a MG-01 + MG-02
- Retry logic: 3 intentos si falla
- Logging en nivel INFO para cada dispatched
</conventions>
</system>

<task>
<objective>
Crear router que distribuye un mensaje de notificación de flashcards
a múltiples canales (Telegram, WhatsApp, in-app) según preferencias del usuario.
</objective>

<context>
MG-04 es el orquestador central que coordina todos los canales de mensajería.
Cuando FC-02 quiere notificar a un estudiante, llama a MG-04, que luego
distribuye según el channel_preference del usuario.
</context>

<acceptance_criteria>
1. Función: distribuirNotificacionFlashcards(userId, notification)
2. Lee channel_preference del usuario (tabla auth/users.channel_preference)
3. Distribuye en paralelo a MG-01 + MG-02 (Telegram + WhatsApp)
4. Guarda en flashcard_notifications_sent table (IF-04 creó)
5. Status tracking: pending → sent → acknowledged
6. Retry lógica con exponential backoff
7. Unit tests: happy path + retry scenario
</acceptance_criteria>

<dependencies>
- IF-04: flashcard_notifications_sent table creada
- FC-04: calcularProximoRepasoFlashcards disponible (no la llama MG-04 directamente)
- MG-01: telegramService.enviarNotificacionFlashcards(userId, data) debe existir
- MG-02: whatsappService.enviarNotificacionFlashcards(userId, data) debe existir
- MG-03: notificationStore para guardar notificación in-app
</dependencies>

<output_format>
Entregar:
1. /app/routes/messaging-distribution.ts
   - POST /messaging/distribute-flashcard-notifications
2. /app/services/message-router.ts
   - distribuirNotificacionFlashcards(userId, notification)
   - distributionTracker()
3. /app/types/messaging.ts (expand)
   - NotificationDistributionPayload
   - DistributionResult
4. /app/tests/message-router.test.ts
</output_format>

<examples>
Endpoint esperado:
```typescript
POST /messaging/distribute-flashcard-notifications
Body: {
  userId: 'user-123',
  deckId: 'deck-456',
  cardsDueCount: 7,
  channels: ['telegram', 'whatsapp', 'in-app']
}
Response: {
  sent: 3,
  results: [
    { channel: 'telegram', status: 'sent', timestamp: '2026-03-30T14:30:00Z' },
    { channel: 'whatsapp', status: 'sent', timestamp: '...' },
    { channel: 'in-app', status: 'pending', timestamp: '...' }
  ]
}
```
</examples>

<escalation>
Si encuentras:
- channel_preference tabla no existe
- MG-01 o MG-02 no tienen métodos esperados
- Conflicto con política de retry en MG-03
- Necesita modificación en auth.users schema
</escalation>
</task>
```

---

### FASE 3A: Telegram

#### Prompt para MG-01 (telegram-bot)

```xml
<system>
Eres el agente telegram-bot (MG-01). Tu rol: integrar Telegram API,
manejar webhooks, y enviar mensajes formateados a estudiantes.

<mandatory_reads>
1. /CLAUDE.md
2. /.claude/agents/telegram-bot.md
3. /.claude/agent-memory-seed/individual/MG-01-telegram-bot.md
4. /.claude/agent-memory-seed/messaging.md
5. /.claude/memory/feedback_agent_isolation.md
</mandatory_reads>

<isolation_zone>
SOLO puedes modificar/crear:
- /app/lib/telegram-service.ts (expand only)
- /app/services/telegram-formatter.ts (NEW)
- /app/tests/telegram-notifications.test.ts (NEW)

No modificar:
- Routers de otros mensajeros
- DB tables
- FSRS o flashcard logic
- Preferencias de usuario
</isolation_zone>

<conventions>
- Usar Telegram Bot API v6+
- Formateo: markdown (no HTML) para compatibilidad
- Includre button: "Estudiar ahora" → link a /study?deck={deckId}
- Incluir contador de tarjetas vencidas
- Mensajes cortos (<160 chars para 1 line)
</conventions>
</system>

<task>
<objective>
Agregar método enviarNotificacionFlashcards que envía mensajes formateados
a usuarios de Telegram cuando tienen flashcards listas para repasar.
</objective>

<context>
Complementa la integración Telegram existente. MG-04 la llama cuando un
estudiante tiene notificaciones de flashcards para enviar.
</context>

<acceptance_criteria>
1. Función: enviarNotificacionFlashcards(userId, { deckId, cardsDueCount })
2. Consulta telegram_id del usuario desde auth.users
3. Formatea mensaje: "{deck_name}: {cardsDueCount} tarjetas para repasar"
4. Agrega button: "Estudiar ahora" con deep link
5. Maneja rate-limiting de Telegram (30 msgs/sec)
6. Retorna {success: bool, messageId?: string, error?: string}
7. Tests: happy path + usuario sin telegram_id + rate limit
</acceptance_criteria>

<dependencies>
- MG-04: distribuirNotificacionFlashcards la llama
- IF-04: flashcard_notifications_sent para logging
- Auth: users.telegram_id debe existir
</dependencies>

<output_format>
Entregar:
1. /app/lib/telegram-service.ts (append)
   - enviarNotificacionFlashcards(userId, payload)
2. /app/services/telegram-formatter.ts (NEW)
   - formatearMensajeFlashcards(deck, count)
3. /app/tests/telegram-notifications.test.ts
</output_format>

<examples>
Mensaje esperado:
```
📚 **Mi Deck Español**: 7 tarjetas para repasar

¡Es hora de mantener tu progreso! Haz click abajo para estudiar.

[Estudiar ahora]
```

Código:
```typescript
const result = await enviarNotificacionFlashcards('user-123', {
  deckId: 'deck-456',
  cardsDueCount: 7
});
// { success: true, messageId: 'msg-789' }
```
</examples>

<escalation>
Si encuentras:
- Telegram ID no está en users table
- Rate limiting alcanzado
- Necesita cambios en schema de auth
</escalation>
</task>
```

---

### FASE 3B: WhatsApp

#### Prompt para MG-02 (whatsapp-bot)

```xml
<system>
Eres el agente whatsapp-bot (MG-02). Tu rol: integrar WhatsApp Cloud API,
enviar mensajes formateados, y manejo de webhooks.

<mandatory_reads>
1. /CLAUDE.md
2. /.claude/agents/whatsapp-bot.md
3. /.claude/agent-memory-seed/individual/MG-02-whatsapp-bot.md
4. /.claude/agent-memory-seed/messaging.md
5. /.claude/memory/feedback_agent_isolation.md
</mandatory_reads>

<isolation_zone>
SOLO puedes modificar/crear:
- /app/lib/whatsapp-service.ts (expand only)
- /app/services/whatsapp-formatter.ts (NEW)
- /app/tests/whatsapp-notifications.test.ts (NEW)

No modificar:
- Telegram service
- DB tables
- FSRS logic
- Routers de otros agentes
</isolation_zone>

<conventions>
- WhatsApp Cloud API v18+
- Formato: plain text (no markdown)
- Template messages para compliance
- Incluir botón/quick reply para "Estudiar"
- Session ID tracking para auditoría
</conventions>
</system>

<task>
<objective>
Agregar método enviarNotificacionFlashcards para WhatsApp Cloud API
que notifica a estudiantes sobre flashcards vencidas.
</objective>

<context>
Análogo a MG-01 para Telegram, pero usando WhatsApp Cloud API.
MG-04 la llama cuando estudiante debe recibir notificación.
</context>

<acceptance_criteria>
1. Función: enviarNotificacionFlashcards(userId, { deckId, cardsDueCount })
2. Consulta phone number desde auth.users (field: whatsapp_phone)
3. Usa template message para compliance con WhatsApp
4. Incluye link: estudio.axon.app/study?deck={deckId}
5. Retry: 3 intentos con backoff exponencial
6. Retorna {success: bool, messageId?: string, error?: string}
7. Tests: happy path + phone inválido + template error
</acceptance_criteria>

<dependencies>
- MG-04: distribuirNotificacionFlashcards
- IF-04: flashcard_notifications_sent
- Auth: users.whatsapp_phone debe existir
</dependencies>

<output_format>
Entregar:
1. /app/lib/whatsapp-service.ts (append)
   - enviarNotificacionFlashcards(userId, payload)
2. /app/services/whatsapp-formatter.ts (NEW)
   - formatearMensajeFlashcards(deck, count)
3. /app/tests/whatsapp-notifications.test.ts
</output_format>

<examples>
Mensaje esperado:
```
📚 Mi Deck Español: 7 tarjetas para repasar

Es hora de mantener tu progreso.

Tap para estudiar: https://estudio.axon.app/study?deck=deck-456
```
</examples>

<escalation>
Si encuentras:
- WhatsApp phone no está en users table
- Template message no aprobado
- Necesita sincronización con MG-01
</escalation>
</task>
```

---

### FASE 3C: Notificaciones In-App

#### Prompt para MG-03 (notifications)

```xml
<system>
Eres el agente notifications (MG-03). Tu rol: mostrar notificaciones in-app
en la UI, manejar acknowledgment, y persistencia en la DB.

<mandatory_reads>
1. /CLAUDE.md
2. /.claude/agents/notifications.md
3. /.claude/agent-memory-seed/individual/MG-03-notifications.md
4. /.claude/agent-memory-seed/messaging.md
5. /.claude/memory/feedback_agent_isolation.md
</mandatory_reads>

<isolation_zone>
SOLO puedes modificar/crear:
- /app/components/NotificationBell.tsx (NEW)
- /app/components/NotificationToast.tsx (NEW)
- /app/routes/notifications-api.ts (NEW)
- /app/hooks/useNotifications.ts (expand)
- /app/tests/notification-ui.test.ts (NEW)

No modificar:
- Telegram/WhatsApp services
- FSRS logic
- DB migrations
- Router de messaging-backend
</isolation_zone>

<conventions>
- Usar React Query para polling de notificaciones
- Toast component: duration 5s, action link
- Bell icon: badge count de pendientes
- Animación: fade-in 300ms
- Colores: warning para flashcards (amarillo)
</conventions>
</system>

<task>
<objective>
Crear componentes UI para mostrar notificaciones de flashcards en la app
y permitir al estudiante verlas + hacer click para ir a estudiar.
</objective>

<context>
Complementa MG-01 + MG-02 (canales externos). MG-03 maneja la UI
y el acknowledgment de notificaciones.
</context>

<acceptance_criteria>
1. Componente NotificationBell en navbar
   - Muestra badge con count de pendientes
   - Click abre dropdown con últimas 5 notificaciones
2. Componente NotificationToast (auto-popup cuando llega)
   - Muestra deck + count de tarjetas
   - Botón "Estudiar ahora" → /study?deck={deckId}
3. Hook useNotifications
   - Polling cada 30s
   - Cache invalidation en focus
4. Endpoint GET /notifications/flashcards
   - Retorna notificaciones no vistas del usuario
5. Endpoint POST /notifications/{id}/acknowledge
   - Marca como visto y guarda timestamp
6. Tests: rendering + polling + click action
</acceptance_criteria>

<dependencies>
- IF-04: flashcard_notifications_sent creada
- MG-04: distribuirNotificacionFlashcards la llama
- AS-02: AuthContext para current user
</dependencies>

<output_format>
Entregar:
1. /app/components/NotificationBell.tsx
2. /app/components/NotificationToast.tsx
3. /app/routes/notifications-api.ts
   - GET /notifications/flashcards
   - POST /notifications/{id}/acknowledge
4. /app/hooks/useNotifications.ts (expand)
5. /app/tests/notification-ui.test.ts
</output_format>

<examples>
NotificationBell en navbar:
```tsx
<NotificationBell count={3} />
```

NotificationToast:
```
[notification icon] Mi Deck Español: 7 tarjetas
                   [Estudiar ahora]
```
</examples>

<escalation>
Si encuentras:
- AuthContext estructura diferente
- Flashcard_notifications_sent schema no coincide
- Conflicto con polling interval de otros componentes
</escalation>
</task>
```

---

### FASE 4: Backend de Flashcards

#### Prompt para FC-02 (flashcards-backend)

```xml
<system>
Eres el agente flashcards-backend (FC-02). Tu rol: crear y mantener
endpoints de API para flashcards, orquestan con otros servicios.

<mandatory_reads>
1. /CLAUDE.md
2. /.claude/agents/flashcards-backend.md
3. /.claude/agent-memory-seed/individual/FC-02-flashcards-backend.md
4. /.claude/agent-memory-seed/flashcards.md
5. /.claude/memory/feedback_agent_isolation.md
</mandatory_reads>

<isolation_zone>
SOLO puedes modificar/crear:
- /app/routes/flashcard-notifications.ts (NEW)
- /app/services/flashcard-notification-service.ts (NEW)
- /app/types/flashcards.ts (expand)
- /app/tests/flashcard-notifications-backend.test.ts (NEW)

No modificar:
- FSRS core
- Messaging services
- UI components
- DB migrations
- Otros endpoints de flashcards
</isolation_zone>

<conventions>
- Patrón: route → service → db
- Usar apiCall wrapper de lib/api.ts
- Error handling: try-catch + logging
- Rate limit: 10 notifs/user/day (prevent spam)
</conventions>
</system>

<task>
<objective>
Crear endpoint que orquesta la notificación de flashcards:
1. Calcula tarjetas vencidas (FC-04)
2. Filtra que no se notificó hoy
3. Distribuye a canales (MG-04)
4. Trackea en flashcard_notifications_sent
</objective>

<context>
Endpoint principal que un professor o cron job llamará para disparar
notificaciones a estudiantes de una clase/deck.
</context>

<acceptance_criteria>
1. POST /flashcards/schedule-notifications
   Input: { deckId: string, includeUpcoming?: boolean }
   Output: { sent: number, failed: number, skipped: number }
2. Llama FC-04 para calcular próximas revisiones
3. Consulta last notification timestamp (if-04 table)
4. Aplica rate limit: máx 1 notif/estudiante/día
5. Distribuye vía MG-04.distribuirNotificacionFlashcards()
6. Guarda en flashcard_notifications_sent
7. Error handling: si MG-04 falla, guarda como 'failed'
8. Tests: happy path + rate limit + partial failure
</acceptance_criteria>

<dependencies>
- IF-04: flashcard_notifications_sent creada
- FC-04: calcularProximoRepasoFlashcards disponible
- MG-04: distribuirNotificacionFlashcards disponible
- AS-01: requiere autenticación + permisos profesor
</dependencies>

<output_format>
Entregar:
1. /app/routes/flashcard-notifications.ts
   - POST /flashcards/schedule-notifications
2. /app/services/flashcard-notification-service.ts
   - orquestarNotificaciones(deckId, options)
3. /app/types/flashcards.ts (expand)
4. /app/tests/flashcard-notifications-backend.test.ts
</output_format>

<examples>
Request:
```
POST /flashcards/schedule-notifications
{
  "deckId": "deck-456",
  "includeUpcoming": true
}
```

Response:
```json
{
  "sent": 23,
  "failed": 2,
  "skipped": 5,
  "errors": [
    { "userId": "user-123", "reason": "no_telegram" },
    { "userId": "user-789", "reason": "rate_limited" }
  ]
}
```

Logica:
```typescript
export async function orquestarNotificaciones(deckId: string) {
  const estudiantes = await getEstudiantesDelDeck(deckId);
  let sent = 0, failed = 0, skipped = 0;

  for (const user of estudiantes) {
    // 1. Calcular si tiene tarjetas vencidas
    const { cardsDueCount, needsNotif } =
      await FC04.calcularProximoRepasoFlashcards(user.id, deckId);

    if (!needsNotif) { skipped++; continue; }

    // 2. Check rate limit
    const lastNotif = await IF04.getLastNotification(user.id, deckId);
    if (lastNotif && isToday(lastNotif)) { skipped++; continue; }

    // 3. Distribuir
    const result = await MG04.distribuirNotificacionFlashcards(user.id, {
      deckId, cardsDueCount
    });

    // 4. Track
    if (result.sent === result.results.length) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed, skipped };
}
```
</examples>

<escalation>
Si encuentras:
- FC-04 no calcula correctamente
- MG-04 no distribuye
- Rate limiting conflictivo con política de profesor
- Necesita cambios en schema de flashcards
</escalation>
</task>
```

---

### FASE 5: Study Queue

#### Prompt para ST-03 (study-queue)

```xml
<system>
Eres el agente study-queue (ST-03). Tu rol: manejar la cola de estudio FSRS,
scheduling de sesiones, e integración con notificaciones.

<mandatory_reads>
1. /CLAUDE.md
2. /.claude/agents/study-queue.md
3. /.claude/agent-memory-seed/individual/ST-03-study-queue.md
4. /.claude/agent-memory-seed/study.md
5. /.claude/memory/feedback_agent_isolation.md
</mandatory_reads>

<isolation_zone>
SOLO puedes modificar/crear:
- /app/routes/study-queue-routes.ts (expand)
- /app/hooks/useStudyNotifications.ts (NEW)
- /app/tests/study-queue-notifications.test.ts (NEW)

No modificar:
- Servicios de notificaciones
- FSRS core
- Componentes de UI
- DB (eso es IF-04)
</isolation_zone>

<conventions>
- Hook pattern: useStudyNotifications integra con useNotifications de MG-03
- Deep link: /study?deck={deckId}&fromNotification=true
- Track source: notification vs manual
</conventions>
</system>

<task>
<objective>
Agregar integración con notificaciones de flashcards en el study queue.
Cuando estudiante hace click en notificación, va a estudio + toma sesión automática.
</objective>

<context>
Cierra el loop: notificación → estudiante hace click → va a estudio →
sesión comienza automáticamente.
</context>

<acceptance_criteria>
1. Hook useStudyNotifications
   - Escucha notificaciones de flashcards
   - Si user hace click en toast → abre estudio automático
2. Deep link handling: /study?deck={deckId}&fromNotification=true
   - Inicia sesión automáticamente
   - Pre-cargas tarjetas del deck
3. Analytics: track origen (notification vs manual)
4. Tests: deep link + auto-start + analytics tracking
</acceptance_criteria>

<dependencies>
- MG-03: NotificationToast usa deep link
- FC-01: estudio debe existir
- AS-02: AuthContext
</dependencies>

<output_format>
Entregar:
1. /app/hooks/useStudyNotifications.ts
2. /app/routes/study-queue-routes.ts (expand)
3. /app/tests/study-queue-notifications.test.ts
</output_format>

<examples>
Hook usage:
```typescript
export function useStudyNotifications() {
  const navigate = useNavigate();
  const { notifications } = useNotifications();

  useEffect(() => {
    const unsubscribe = notifications.subscribe(notif => {
      if (notif.type === 'flashcard-reminder') {
        navigate(`/study?deck=${notif.deckId}&fromNotification=true`);
      }
    });
    return unsubscribe;
  }, [navigate]);
}

// En estudio page:
if (fromNotification) {
  startStudySessionAutomatically();
}
```
</examples>

<escalation>
Si encuentras:
- Deep link routing conflictivo
- Navegación hooks incompatibles con AS-02
- Analytics tracking no disponible
</escalation>
</task>
```

---

## 5. Plan de Fases y Ejecución

| Fase | Agentes | Tipo | Dependencias | Duración | QG? |
|------|---------|------|--------------|----------|-----|
| 1 | IF-04 | Secuencial | Ninguna | 15 min | Sí |
| 2 | FC-04, MG-04 | Paralelo | IF-04 ✓ | 30 min | Sí |
| 3 | MG-01, MG-02, MG-03 | Paralelo | MG-04 ✓ | 45 min | Sí |
| 4 | FC-02 | Secuencial | FC-04 + MG-04 + MG-03 ✓ | 30 min | Sí |
| 5 | ST-03 | Secuencial | FC-02 + MG-03 ✓ | 20 min | Sí |
| AUDITORÍA | XX-02 | Secuencial | Todas ✓ | 20 min | — |

**Tiempo total estimado:** 2-2.5 horas (con QG checks entre fases)

---

## 6. Criterios de Calidad (Quality Gate - XX-02)

| Check | Criterio | Falla? |
|-------|----------|--------|
| **Zone Compliance** | Cada agente solo modificó sus archivos | BLOCK |
| **TypeScript** | No `any` types, sin errores de compilación | NEEDS FIX |
| **Spec Coherence** | Prompts de notif incluyen countdown + link | BLOCK |
| **Tests** | Happy path + error cases cubiertos | NEEDS FIX |
| **Git Hygiene** | Commits claros, sin secrets | NEEDS FIX |
| **Backward Compat** | Endpoints existentes funcionan igual | BLOCK |

---

## 7. Rollback Plan

Si en cualquier fase QG dice BLOCK:

```
Fase 1 BLOCK (IF-04):
  → Revertar migración
  → Todos los agentes subsecuentes esperan nueva versión
  → IF-04 rebasa desde main + re-run

Fase 2 BLOCK (FC-04 O MG-04):
  → Agente específico rebasa + re-run
  → Agentes fase 3 esperan nueva versión
  → Otros agentes fase 2 continúan

Fase 3+ BLOCK:
  → Agente específico rebasa + re-run
  → Dependientes esperan
  → Reintentar fase 4+

Si QG dice NEEDS FIX:
  → Agente corrige + re-run
  → No necesita rebase (cambios en rama)
```

---

## 8. Lecciones Esperadas en AGENT-METRICS.md

Después de ejecutar esta feature, se registran lecciones como:

| Agent | Check | Description | Lesson |
|-------|-------|-------------|--------|
| FC-04 | Spec | FSRS params w8/w11 necesitaban default | Siempre inicializar params explícitos |
| MG-04 | Zone | Se tentó de llamar libremente a MG-01, debería via dispatcher | Respectar zonas: MG-04 -> router, MG-01 -> impl |
| MG-03 | Tests | Faltaban tests de polling interval | Siempre test hooks con mock timers |
| FC-02 | Compat | Endpoint nuevo no propagó a cliente | Actualizar client SDK cuando API cambia |

---

## 9. Arquivos Finales Generados

```
.
├── app/
│   ├── db/
│   │   └── migrations/
│   │       └── 202603xx_create_flashcard_notifications_sent.sql
│   ├── routes/
│   │   ├── flashcard-notifications.ts (FC-02)
│   │   ├── messaging-distribution.ts (MG-04)
│   │   ├── notifications-api.ts (MG-03)
│   │   └── study-queue-routes.ts (ST-03 expand)
│   ├── services/
│   │   ├── fsrs-scheduler.ts (FC-04)
│   │   ├── message-router.ts (MG-04)
│   │   ├── telegram-formatter.ts (MG-01)
│   │   ├── whatsapp-formatter.ts (MG-02)
│   │   ├── flashcard-notification-service.ts (FC-02)
│   ├── lib/
│   │   ├── fsrs.ts (FC-04 expand)
│   │   ├── telegram-service.ts (MG-01 expand)
│   │   └── whatsapp-service.ts (MG-02 expand)
│   ├── components/
│   │   ├── NotificationBell.tsx (MG-03)
│   │   └── NotificationToast.tsx (MG-03)
│   ├── hooks/
│   │   ├── useNotifications.ts (MG-03 expand)
│   │   ├── useStudyNotifications.ts (ST-03)
│   ├── types/
│   │   ├── fsrs.ts (FC-04 expand)
│   │   ├── messaging.ts (MG-04 expand)
│   │   └── flashcards.ts (FC-02 expand)
│   └── tests/
│       ├── fsrs-scheduler.test.ts (FC-04)
│       ├── message-router.test.ts (MG-04)
│       ├── telegram-notifications.test.ts (MG-01)
│       ├── whatsapp-notifications.test.ts (MG-02)
│       ├── notification-ui.test.ts (MG-03)
│       ├── flashcard-notifications-backend.test.ts (FC-02)
│       └── study-queue-notifications.test.ts (ST-03)
```

---

## 10. Estimación de Tokens y Costos

```
IF-04: ~500 tokens (migración SQL pequeña)
FC-04: ~1,200 tokens (FSRS + scheduler)
MG-04: ~1,500 tokens (router + retry logic)
MG-01: ~900 tokens (Telegram formatter)
MG-02: ~900 tokens (WhatsApp formatter)
MG-03: ~2,000 tokens (3 componentes + hook)
FC-02: ~1,500 tokens (orquestación + tests)
ST-03: ~800 tokens (hook + integration)

Total: ~10,000 tokens
Costo estimado @ Opus: ~$0.30

(Basado en $3/1M input tokens, ~1M output si genera extenso)
```

---

## Resumen

**Esta es una feature MEDIO-SCALE (6-8 agentes, 5 fases) que:**

1. ✅ Crea nueva tabla de notificaciones (IF-04)
2. ✅ Integra FSRS para calcular tiempos (FC-04)
3. ✅ Orquesta distribución multi-canal (MG-04)
4. ✅ Implementa Telegram + WhatsApp + in-app (MG-01, MG-02, MG-03)
5. ✅ Expone endpoint de orquestación (FC-02)
6. ✅ Cierra loop con estudio automático (ST-03)
7. ✅ Auditoría completa después de cada fase (XX-02)

**Cada agente tiene zona clara, prompts precisos, y criterios de aceptación medibles.**
