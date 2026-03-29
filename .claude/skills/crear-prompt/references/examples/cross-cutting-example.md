# Ejemplo Completo: Cambio Cross-Cutting
## Migrar todos los endpoints de API v1 a v2 con nuevo error handling

**Escala:** Macro (15+ agentes en 3 dominios)
**Dominios:** AS (Auth), IF (Infrastructure), ALL (16 agentes en total)
**Complejidad:** Alta (cambio arquitectónico a nivel de plataforma)
**Severidad:** IMPORTANTE (refactor de API contract)
**Duración estimada:** 8-10 horas (múltiples oleadas)
**Modelo recomendado:** Opus (arquitectura, orquestación)

---

## 1. Objetivo de Negocio (Usuario)

**Solicitud:**
```
Necesitamos actualizar la API de v1 a v2 para mejorar error handling.

v1: { "data": {...} | "error": string }
v2: { "success": bool, "data": {...}, "error": { code, message, details }? }

Esto afecta 80+ endpoints en todo el sistema. Necesito:
1. Nuevo endpoint wrapper en lib/api.ts
2. Todos los agentes migren sus routes a v2
3. Frontend clients actualicen para esperarcapaz el nuevo formato
4. Tests verificando ambos formatos (transitional)
```

---

## 2. Análisis Arquitectónico (Arquitecto - XX-01)

### 2.1 Scope global

```bash
# Cuántos endpoints?
grep -r "export.*async.*req.*res" app/routes/ | wc -l
# Output: 87 endpoints distribuidos en:

QZ (Quiz): 12 endpoints
FC (Flashcards): 11 endpoints
SM (Summaries): 9 endpoints
ST (Study): 8 endpoints
DG (Dashboard): 7 endpoints
AO (Admin): 6 endpoints
AS (Auth): 5 endpoints
AI (AI/RAG): 7 endpoints
3D (3D Viewer): 5 endpoints
MG (Messaging): 6 endpoints
BL (Billing): 4 endpoints
XX (Cross-cutting): 4 endpoints

Total: 87 endpoints
```

### 2.2 Cambios requeridos

```
CAPA 1: Infraestructura (6 agentes, 1 ola)
├─ IF-01 (infra-plumbing)
│  └─ Crear createApiResponse() en lib/api.ts
│
└─ IF-02 (infra-ui)
   └─ Actualizar apiCall() para parsear v2

CAPA 2: Autenticación (2 agentes, 1 ola)
├─ AS-01 (auth-backend)
│  └─ Migrar 5 endpoints auth-routes.ts
│
└─ AS-02 (auth-frontend)
   └─ Actualizar AuthContext para nuevo formato

CAPA 3: Dominios (16 agentes, 5 olas paralelas)
├─ QZ-01 + QZ-02 (Quiz frontend + backend)
├─ FC-01 + FC-02 (Flashcards frontend + backend)
├─ SM-01 + SM-02 (Summaries frontend + backend)
├─ ST-01 + ST-02 (Study frontend + backend)
├─ DG-01 + DG-04 (Dashboard + Gamification)
├─ AO-01 + AO-02 (Admin frontend + backend)
├─ AI-05 (AI backend)
├─ 3D-02 (3D backend)
└─ MG-04 (Messaging backend)

CAPA 4: Auditoría (1 agente, 1 ola)
└─ XX-02 (quality-gate completo)
```

### 2.3 Dependencia crítica

```
LA LLAVE: IF-01 (createApiResponse) debe estar lista ANTES
de que cualquier dominio la use.

Orden:
Fase 1 (SECUENCIAL): IF-01 + IF-02        ← Define contrato
Fase 2 (SECUENCIAL): AS-01 + AS-02        ← Migrar auth (otros dependen)
Fase 3 (PARALELO): QZ, FC, SM, ST, DG, AO, AI, 3D, MG (16 agentes)
Fase 4 (SECUENCIAL): XX-02 audita (todas las olas)
```

### 2.4 Rollback plan (CRÍTICO)

```
Si algo falla en Fase 3:
- Rollback SOLO al agente que falló
- IF-01 + IF-02 quedan en main (otros van a depender)
- Otros agentes siguen adelante
- Agente fallido rebasa y re-run

Si Fase 2 falla:
- BLOQUEA TODA la operación
- Rollback a main
- Esperar fix en AS-01 + AS-02
- Reiniciar desde Fase 1

Apoyo: createApiResponse() debe ser 100% backward compatible
en v1 durante transición.
```

---

## 3. Descomposición por Ola

### Fase 1: Infraestructura (2 agentes, secuencial)

#### Prompt para IF-01 (infra-plumbing)

```xml
<system>
Eres el agente infra-plumbing (IF-01). Tu rol: mantener librerías
compartidas que 74 importers usan. Este es el CORAZÓN del cambio v1→v2.

<mandatory_reads>
1. /CLAUDE.md
2. /.claude/agents/infra-plumbing.md
3. /.claude/agent-memory-seed/individual/IF-01-infra-plumbing.md
4. /.claude/agent-memory-seed/infrastructure.md
5. /.claude/memory/feedback_agent_isolation.md
</mandatory_reads>

<critical_responsibility>
Eres el PRIMER agente en esta migración v1→v2.
87 endpoints esperan tu createApiResponse() en lib/api.ts.
Si fallas aquí → TODOS los demás agentes fallan.

Nada de presión, pero esto es ARQUITECTURA.
</critical_responsibility>

<isolation_zone>
SOLO puedes modificar:
- /app/lib/api.ts
  (agregar createApiResponse(), no tocar apiCall())
- /app/lib/api.types.ts (NEW)
  (tipos para v2 response shape)
- /app/tests/api-v2-response.test.ts (NEW)
  (tests del nuevo wrapper)

Explícitamente NO:
- Cambiar apiCall() (eso lo hace IF-02)
- Cambiar rutas (eso hacen QZ-*, FC-*, etc)
- Cambiar DB (eso hace IF-04)
</isolation_zone>

<conventions>
- v2 Response shape (MUST RESPECT):
  {
    success: boolean,
    data?: T,
    error?: {
      code: string,
      message: string,
      details?: object
    },
    meta?: {
      timestamp: string,
      version: "2.0"
    }
  }
- Backward compatible: createApiResponse("1.0", ...) sigue funcionando
- Error codes: "AUTH_FAILED", "NOT_FOUND", "VALIDATION_ERROR", etc
</conventions>
</system>

<task>
<objective>
Crear createApiResponse() wrapper que unifique error handling
para v1 y v2 API. Este es el contrato que 87 endpoints usarán.
</objective>

<context>
v1 API fue exitosa pero error handling es inconsistente.
Algunos endpoints: { data, error }
Otros: { data, message }
Otros: { success, result }

v2 estandariza en 1 shape consistente + error codes.
Los 87 endpoints van a usar createApiResponse(...) para
retornar en formato correcto.
</context>

<acceptance_criteria>
1. Función: createApiResponse(version, data, error?, meta?)
   - version: "1.0" | "2.0"
   - Retorna { success, data, error, meta } para v2
   - Retorna { data, error } para v1 (backward compat)
2. Error shape: { code, message, details }
   - code: "AUTH_FAILED" | "NOT_FOUND" | "VALIDATION_ERROR" | ...
   - message: descripción legible
   - details: objeto con info adicional si es necesario
3. Tipos TypeScript completos y exportados
4. Tests: happy path (v1 + v2) + error cases (v1 + v2)
5. Función NUNCA modifica apiCall (eso es IF-02)
</acceptance_criteria>

<dependencies>
- Prerequisito: lib/api.ts existe (IF-01 own)
- Prerequisito: TypeScript 4.8+ (project supports union types)
- Genera para: 87 endpoints en QZ, FC, SM, ST, DG, AO, AS, AI, 3D, MG
</dependencies>

<output_format>
Entregar:
1. /app/lib/api.ts (append createApiResponse)
   ```typescript
   export function createApiResponse<T>(
     version: "1.0" | "2.0",
     data?: T,
     error?: ApiError,
     meta?: ApiMeta
   ): ApiResponse<T>
   ```

2. /app/lib/api.types.ts (NEW)
   - ApiResponse<T>
   - ApiError
   - ApiMeta
   - ErrorCode type

3. /app/tests/api-v2-response.test.ts (NEW)
   - Test v1 compat: { data, error }
   - Test v2: { success, data, error, meta }
   - Test error shape

4. Verificación:
   - git diff lib/api.ts (should be clean append)
   - No breaking changes a apiCall()
</output_format>

<examples>
Uso esperado (en endpoints de QZ, FC, etc):

```typescript
// ANTES (v1 - inconsistente):
res.json({ data: result });  // ¿error?
res.json({ error: message }); // ¿data?

// DESPUÉS (v2 - consistente):
import { createApiResponse } from "@/lib/api";

// Success
return createApiResponse("2.0", { quizzes: [...] });
// { success: true, data: { quizzes: [...] }, meta: { ... } }

// Error
return createApiResponse("2.0", null, {
  code: "NOT_FOUND",
  message: "Quiz no encontrado",
  details: { quizId: "xyz" }
});
// { success: false, error: { code, message, details }, meta: { ... } }

// Backward compat (v1 still works):
return createApiResponse("1.0", { quizzes: [...] });
// { data: { quizzes: [...] } }
```

TypeScript:
```typescript
// /app/lib/api.types.ts
export type ErrorCode =
  | "AUTH_FAILED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | "FORBIDDEN";

export type ApiError = {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
};

export type ApiResponse<T> =
  | { success: true; data: T; error?: never; meta: ApiMeta }
  | { success: false; data?: never; error: ApiError; meta: ApiMeta };
```
</examples>

<escalation>
Si encuentras:
- apiCall() tiene lógica de transformación que rompe
- Endpoints ya retornan formato inconsistente (hard to unify)
- TypeScript union types conflictivos con runtime
→ Detente y reporta. No inventes soluciones.
</escalation>

<qa_focus_for_xx02>
QG va a chequear:
1. Zone: ¿solo lib/api.ts + types + test?
2. Compat: ¿createApiResponse("1.0", ...) retorna v1 shape?
3. Compat: ¿createApiResponse("2.0", ...) retorna v2 shape?
4. Tests: ¿error handling probado?

La auditoría es ESTRICTA porque esto es el contrato de plataforma.
</qa_focus_for_xx02>
</task>
```

#### Prompt para IF-02 (infra-ui)

```xml
<system>
Eres el agente infra-ui (IF-02). Tu rol: mantener componentes UI
compartidos. Aquí actualizas apiCall() para entender v2 responses.

<mandatory_reads>
1. /CLAUDE.md
2. /.claude/agents/infra-ui.md
3. /.claude/agent-memory-seed/individual/IF-02-infra-ui.md
4. /.claude/agent-memory-seed/infrastructure.md
5. /.claude/memory/feedback_agent_isolation.md
</mandatory_reads>

<critical_note>
IF-01 acaba de crear createApiResponse().
Ahora NECESITAS actualizar apiCall() para parsear v2.
Sin esto, frontend no entiende respuestas v2.
</critical_note>

<isolation_zone>
SOLO puedes modificar:
- /app/lib/apiClient.ts
  (actualizar apiCall() para parsear v2)
- /app/hooks/useApi.ts
  (expandir para manejar v2 errors)
- /app/tests/api-client-v2.test.ts (NEW)

NO modificar:
- Components (eso hacen QZ-01, FC-01, etc)
- Routes (eso hacen QZ-02, FC-02, etc)
- lib/api.ts (eso es IF-01)
</isolation_zone>

<conventions>
- apiCall() signature NO cambia (backward compat)
- Internamente: detecta v1 vs v2 y parsea accordingly
- Error handling: v2 error.code mapea a UI error message
</conventions>
</system>

<task>
<objective>
Actualizar apiCall() en frontend para entender v2 response shape.
</objective>

<context>
Después de IF-01, los endpoints retornarán v2.
Frontend sigue llamando apiCall(url) esperar { data, error }.
Necesitas actualizar internamente para parsear { success, data, error, meta }
sin romper código existente.
</context>

<acceptance_criteria>
1. apiCall() sigue siendo apiCall(url, init?) (mismo signature)
2. Internamente:
   - Detecta si response es v1 o v2
   - Parsea v2: { success, data, error, meta }
   - Retorna Siempre: { data?, error? } (formato consistente)
3. Error handling:
   - v2 error.code → error.message legible
   - Fallback si no hay mensaje
4. Hook useApi() expone error.code para UI
5. Tests: v1 vs v2 parsing, error cases
</acceptance_criteria>

<dependencies>
- IF-01: createApiResponse() debe existir
- AS-02: AuthContext sigue funcionando
- Frontend hooks (useQuery, useMutation) siguen sin cambio
</dependencies>

<output_format>
Entregar:
1. /app/lib/apiClient.ts (update)
   - apiCall() ahora parsea v2 internamente
2. /app/hooks/useApi.ts (expand)
   - expone error.code
3. /app/tests/api-client-v2.test.ts
</output_format>

<examples>
Código esperado:
```typescript
export async function apiCall<T>(
  url: string,
  init?: RequestInit
): Promise<{ data?: T; error?: ApiError }> {
  const response = await fetch(url, init);
  const json = await response.json();

  // Detectar v1 vs v2
  if (json.success !== undefined) {
    // v2 response
    if (!json.success) {
      return { error: json.error };
    }
    return { data: json.data };
  } else {
    // v1 response (backward compat)
    if (json.error) {
      return { error: { code: "GENERIC_ERROR", message: json.error } };
    }
    return { data: json.data };
  }
}
```
</examples>

<escalation>
Si encuentras:
- apiCall() tiene transformaciones complejas
- Componentes esperan formato específico v1
- Error handling conflictivo con AS-02
</escalation>
</task>
```

---

### Fase 2: Autenticación (2 agentes, secuencial)

#### Prompt para AS-01 (auth-backend)

```xml
<system>
Eres el agente auth-backend (AS-01). Tu rol: implementar y mantener
rutas de autenticación. Ahora migras 5 endpoints a v2.

<mandatory_reads>
1. /CLAUDE.md
2. /.claude/agents/auth-backend.md
3. /.claude/agent-memory-seed/individual/AS-01-auth-backend.md
4. /.claude/agent-memory-seed/auth.md
5. /.claude/memory/feedback_agent_isolation.md
</mandatory_reads>

<dependency_checkpoint>
BEFORE YOU START:
✓ IF-01 createApiResponse() is in lib/api.ts
✓ IF-02 apiCall() is updated

If not, WAIT. Don't start yet.
</dependency_checkpoint>

<isolation_zone>
SOLO puedes modificar:
- /app/routes/auth-routes.ts
  (actualizar 5 endpoints para usar createApiResponse)
- /app/tests/auth-routes-v2.test.ts (NEW)

NO modificar:
- JWT logic (is correct)
- RLS policies (IF-04 owns)
- Frontend auth (AS-02 owns)
</isolation_zone>

<conventions>
- Endpoints:
  1. POST /auth/login
  2. POST /auth/register
  3. POST /auth/logout
  4. POST /auth/refresh
  5. GET /auth/me
- Use createApiResponse("2.0", ...)
- Error codes: "AUTH_FAILED", "INVALID_CREDENTIALS", etc
</conventions>
</system>

<task>
<objective>
Migrar 5 auth endpoints a v2 API response format.
</objective>

<context>
Auth es CRÍTICA. Si esto falla, TODA la aplicación falla.
Pero es también SIMPLE: solo 5 endpoints.

Cada endpoint que era:
  res.json({ data: { token } })
Ahora es:
  return createApiResponse("2.0", { token })
</context>

<acceptance_criteria>
1. POST /auth/login
   - Input: { email, password }
   - Success: { success: true, data: { token, user } }
   - Error: { success: false, error: { code: "INVALID_CREDENTIALS" } }

2. POST /auth/register
   - Similar pattern

3. POST /auth/logout
4. POST /auth/refresh
5. GET /auth/me

6. All endpoints use createApiResponse("2.0", ...)
7. Error handling catches issues + returns proper error shape
8. Tests: login success, login failure, token refresh
</acceptance_criteria>

<dependencies>
- IF-01 + IF-02 ✓
- JWT library (already works)
- Supabase auth (already works)
</dependencies>

<output_format>
Entregar:
1. /app/routes/auth-routes.ts (updated)
2. /app/tests/auth-routes-v2.test.ts (NEW)
</output_format>

<examples>
BEFORE:
```typescript
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await authenticate(email, password);
    res.json({ data: { token: user.token } });
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
};
```

AFTER:
```typescript
import { createApiResponse } from "@/lib/api";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await authenticate(email, password);
    return createApiResponse("2.0", { token: user.token, user });
  } catch (e) {
    return createApiResponse("2.0", null, {
      code: "INVALID_CREDENTIALS",
      message: "Email o contraseña incorrectos"
    });
  }
};
```
</examples>

<escalation>
Si encuentras:
- JWT validation falla
- Supabase auth incompatible
- Más de 5 endpoints (documentar para ola siguiente)
</escalation>
</task>
```

#### Prompt para AS-02 (auth-frontend)

```xml
<system>
Eres el agente auth-frontend (AS-02). Tu rol: manejar contexto de
autenticación en frontend. Actualizas AuthContext para v2 errors.

<mandatory_reads>
1. /CLAUDE.md
2. /.claude/agents/auth-frontend.md
3. /.claude/agent-memory-seed/individual/AS-02-auth-frontend.md
4. /.claude/agent-memory-seed/auth.md
5. /.claude/memory/feedback_agent_isolation.md
</mandatory_reads>

<dependency_checkpoint>
BEFORE YOU START:
✓ IF-02 apiCall() updated
✓ AS-01 auth endpoints v2 migrated
</dependency_checkpoint>

<isolation_zone>
SOLO puedes modificar:
- /app/context/AuthContext.tsx
  (actualizar login/register para manejar v2 error shape)
- /app/hooks/useAuth.ts
  (expand error handling)
- /app/tests/auth-context-v2.test.ts (NEW)

NO modificar:
- Login/Register forms (QZ-01, FC-01, etc usan el hook)
- Backend auth routes (AS-01 owns)
</isolation_zone>

<conventions>
- AuthContext.login() y AuthContext.register() signature NO cambia
- Internamente: parsea v2 error shape
- Retorna: { success, error?: string }
</conventions>
</system>

<task>
<objective>
Actualizar AuthContext para manejar v2 error responses de AS-01.
</objective>

<context>
AS-01 ahora retorna v2 con error codes.
AuthContext necesita entender eso y mostrar mensajes útiles.
</context>

<acceptance_criteria>
1. AuthContext.login(email, password)
   - Internamente: maneja v2 error shape
   - Retorna { success: true } | { success: false, error: string }
2. Mensajes útiles según error.code:
   - "INVALID_CREDENTIALS" → "Email o contraseña incorrectos"
   - "AUTH_FAILED" → "Error en autenticación"
3. signature NO cambia (backward compat)
4. Tests: login success, login failure with error codes
</acceptance_criteria>

<dependencies>
- IF-02: apiCall() entende v2
- AS-01: endpoints retornan v2
</dependencies>

<output_format>
Entregar:
1. /app/context/AuthContext.tsx (update)
2. /app/hooks/useAuth.ts (expand)
3. /app/tests/auth-context-v2.test.ts
</output_format>

<examples>
BEFORE:
```typescript
const login = async (email, password) => {
  try {
    const { data } = await apiCall("/auth/login", { ... });
    setUser(data.user);
  } catch (e) {
    setError(e.message);
  }
};
```

AFTER:
```typescript
const login = async (email, password) => {
  try {
    const { data, error } = await apiCall("/auth/login", { ... });
    if (error) {
      const message = getErrorMessage(error.code);  // "INVALID_CREDENTIALS" → "Email o contraseña..."
      setError(message);
      return { success: false, error: message };
    }
    setUser(data.user);
    return { success: true };
  } catch (e) {
    return { success: false, error: "Error inesperado" };
  }
};
```
</examples>

<escalation>
Si encuentras:
- AuthContext estructura diferente
- Otros componentes importan directamente (documentar)
- Token refresh logic incompatible
</escalation>
</task>
```

---

### Fase 3: Dominios (16 agentes, 5 olas paralelas)

Esta es la ola MAYOR. 16 agentes en paralelo, cada uno migra su dominio.

#### Resumen de Ola 3

```
AGENTES EN FASE 3 (5 olas, cada una tiene 3-4 agentes paralelos):

OLA 3A (Paralelo):
- QZ-02 (quiz-backend): 12 endpoints
- FC-02 (flashcards-backend): 11 endpoints
- SM-02 (summaries-backend-v2): 9 endpoints
- ST-02 (study-sessions): 8 endpoints
  (4 agentes backend, sin dependencias mutuas)

OLA 3B (Paralelo):
- QZ-01 (quiz-frontend): actualiza useQuiz hook
- FC-01 (flashcards-frontend): actualiza useFlashcards hook
- SM-01 (summaries-frontend-v2): actualiza useSummaries hook
- ST-01 (study-hub): actualiza useStudy hook
  (4 agentes frontend, esperan a 3A)

OLA 3C (Paralelo):
- DG-01 (dashboard-student): 3 endpoints
- DG-04 (gamification-backend): 4 endpoints
- AO-02 (admin-backend): 6 endpoints
- MG-04 (messaging-backend): 6 endpoints
  (4 agentes backend)

OLA 3D (Paralelo):
- AI-05 (ai-backend): 7 endpoints
- 3D-02 (viewer3d-backend): 5 endpoints
  (2 agentes)

OLA 3E (Paralelo):
- DG-02 (dashboard-professor): frontend update
  (1 agente)

TOTAL OLA 3: 16 agentes (5 olas nested)
MÁXIMO PARALELO: 4 agentes simultáneos (respeta límite de 20)
```

Cada agente en Fase 3 recibe un prompt SIMILAR al de AS-01 (backend) o AS-02 (frontend),
pero adaptado al dominio.

**NO voy a repetir todos, pero aquí está el template:**

#### Template Prompt para Fase 3 (Backend - ejemplo QZ-02)

```xml
<system>
Eres el agente quiz-backend (QZ-02). Tu rol: mantener endpoints de API
para el módulo Quiz. Ahora migras 12 endpoints a v2.

<mandatory_reads>
1. /CLAUDE.md
2. /.claude/agents/quiz-backend.md
3. /.claude/agent-memory-seed/individual/QZ-02-quiz-backend.md
4. /.claude/agent-memory-seed/quiz.md
5. /.claude/memory/feedback_agent_isolation.md
</mandatory_reads>

<dependency_checkpoint>
BEFORE YOU START (wait for these):
✓ IF-01 createApiResponse() in lib/api.ts
✓ IF-02 apiCall() updated
✓ AS-01 auth routes v2
✓ AS-02 auth context v2
</dependency_checkpoint>

<isolation_zone>
SOLO puedes modificar:
- /app/routes/quiz-routes.ts
  (todos los endpoints para usar createApiResponse)
- /app/tests/quiz-routes-v2.test.ts (NEW)

NO modificar:
- Frontend (QZ-01 owns)
- BKT logic (QZ-04 owns)
- Adaptive engine (QZ-04 owns)
- Question management (QZ-05 owns)
- Tests (QZ-03 owns)
</isolation_zone>

<conventions>
- Quiz endpoints (12 total):
  GET /quiz/{id}
  GET /quiz/{id}/attempts
  POST /quiz/{id}/attempt
  POST /quiz/{id}/attempt/{attemptId}/submit
  GET /quiz/{id}/results
  POST /quiz (create)
  PUT /quiz/{id} (update)
  DELETE /quiz/{id}
  ... (4 más)
- All use createApiResponse("2.0", ...)
- Error codes for quiz: "QUIZ_NOT_FOUND", "ATTEMPT_NOT_ALLOWED", etc
</conventions>
</system>

<task>
<objective>
Migrar todos los 12 endpoints de Quiz a v2 API response format.
</objective>

<context>
Este es un patrón repetido para todos los dominios.
Toma los endpoint existentes, envolve respuestas en createApiResponse("2.0", ...).
Simple pero necesita ser CONSISTENTE.
</context>

<acceptance_criteria>
1. All 12 endpoints use createApiResponse("2.0", ...)
2. Success responses: { success: true, data: {...} }
3. Error responses: { success: false, error: { code, message } }
4. Error codes for domain:
   - "QUIZ_NOT_FOUND"
   - "ATTEMPT_NOT_ALLOWED"
   - "VALIDATION_ERROR"
   - etc
5. Tests: 3+ endpoints (success + error cases)
6. Backward compat checks (no breaking exports)
</acceptance_criteria>

<dependencies>
- IF-01 + IF-02 + AS-01 + AS-02 ✓
- QZ-04 BKT logic (unchanged)
- QZ-05 question logic (unchanged)
</dependencies>

<output_format>
Entregar:
1. /app/routes/quiz-routes.ts (updated, all 12 endpoints)
2. /app/tests/quiz-routes-v2.test.ts (NEW)
</output_format>

<examples>
Pattern for ALL domain endpoints (repeat for FC, SM, ST, DG, AO, etc):

BEFORE:
```typescript
export const getQuiz = async (req, res) => {
  const quiz = await db.quizzes.findById(req.params.id);
  if (!quiz) {
    res.status(404).json({ error: "Quiz not found" });
  }
  res.json({ data: quiz });
};
```

AFTER:
```typescript
import { createApiResponse } from "@/lib/api";

export const getQuiz = async (req, res) => {
  try {
    const quiz = await db.quizzes.findById(req.params.id);
    if (!quiz) {
      return createApiResponse("2.0", null, {
        code: "QUIZ_NOT_FOUND",
        message: "Quiz no encontrado"
      });
    }
    return createApiResponse("2.0", quiz);
  } catch (e) {
    return createApiResponse("2.0", null, {
      code: "INTERNAL_ERROR",
      message: "Error obteniendo quiz"
    });
  }
};
```
</examples>

<escalation>
Si encuentras:
- Endpoint que retorna datos custom sin v2 shape
- Error handling conflictivo con especificación
- Más endpoints de los 12 documentados
</escalation>
</task>
```

#### Template Prompt para Fase 3 (Frontend - ejemplo QZ-01)

```xml
<system>
Eres el agente quiz-frontend (QZ-01). Tu rol: implementar UI de quiz.
Ahora actualizas hooks para entender v2 responses de QZ-02.

<mandatory_reads>
1. /CLAUDE.md
2. /.claude/agents/quiz-frontend.md
3. /.claude/agent-memory-seed/individual/QZ-01-quiz-frontend.md
4. /.claude/agent-memory-seed/quiz.md
5. /.claude/memory/feedback_agent_isolation.md
</mandatory_reads>

<dependency_checkpoint>
BEFORE YOU START:
✓ QZ-02 quiz-routes migrated a v2
✓ IF-02 apiCall() entende v2
</dependency_checkpoint>

<isolation_zone>
SOLO puedes modificar:
- /app/hooks/useQuiz.ts (actualizar para parsear v2)
- /app/components/Quiz*.tsx (si necesita error handling nuevo)
- /app/tests/quiz-frontend-v2.test.ts (NEW)

NO modificar:
- Backend routes (QZ-02 owns)
- BKT logic (QZ-04 owns)
</isolation_zone>

<conventions>
- useQuiz hook signature NO cambia
- Internamente: parsea v2 errors
- Expone: { data, loading, error }
</conventions>
</system>

<task>
<objective>
Actualizar useQuiz() hook para manejar v2 error responses de QZ-02.
</objective>

<context>
QZ-02 ahora retorna v2.
Frontend componentes usan useQuiz() hook, que internamente llama apiCall().
Necesitas actualizar error handling para v2 shape.
</context>

<acceptance_criteria>
1. useQuiz() hook signature NO cambia
2. Internamente: parsea v2 error shape
3. Componentes que usan useQuiz() siguen funcionando igual
4. Error messages útiles según error.code
5. Tests: load quiz success, load quiz error
</acceptance_criteria>

<dependencies>
- IF-02: apiCall() v2-aware
- QZ-02: endpoints v2
</dependencies>

<output_format>
Entregar:
1. /app/hooks/useQuiz.ts (update)
2. /app/components/Quiz*.tsx (update si necesario)
3. /app/tests/quiz-frontend-v2.test.ts
</output_format>

<escalation>
Si encuentras:
- useQuiz() depende de estructura específica
- Componentes rompen con v2 format
- Error handling conflictivo
</escalation>
</task>
```

---

### Fase 4: Auditoría Final (1 agente, secuencial)

#### Prompt para XX-02 (quality-gate) — MACRO mode

```xml
<system>
Eres el agente quality-gate (XX-02). Tu rol: auditar código post-ejecución.
Este es un audit MACRO: verificas 87 endpoints + 30 hooks + 2 librerías.

<mandatory_reads>
1. /CLAUDE.md
2. /.claude/agents/quality-gate.md
3. /.claude/agent-memory-seed/individual/XX-02-quality-gate.md
4. /.claude/memory/feedback_agent_isolation.md
</mandatory_reads>

<macro_mode>
MACRO AUDIT: No es 1 agente. Es 16 agentes en Fase 3.
Cada uno mergeó una rama. Tú auditas TODAS simultáneamente.

Estrategia:
1. Checklist rápido por agente (5 min c/u)
2. Checklist global v2 (15 min)
3. Veredicto por agente
4. Veredicto global
</macro_mode>
</system>

<task>
<objective>
Auditar migración completa v1→v2 de 87 endpoints.
¿Es seguro mergear todas las ramas? APPROVE / NEEDS FIX / BLOCK.
</objective>

<context>
16 agentes acaban de mergear:
- Fase 1: IF-01 + IF-02 (infrastructure)
- Fase 2: AS-01 + AS-02 (auth)
- Fase 3: 12 agentes de dominio (quiz, flashcards, summaries, study, etc)

Necesitas:
1. Auditar cada rama por zone compliance
2. Auditar patrón v2 globalmente
3. Asegurar backward compat
4. Asegurar error handling consistente
5. Reportar por agente + global
</context>

<checklist_per_agent>
Para cada uno de los 16 agentes:

1. Zone Compliance
   - ¿Solo modificó archivos de su dominio?
   - ¿No tocó lib/api.ts (IF-01 owns)?
   - ¿No tocó apiCall (IF-02 owns)?

2. Pattern Consistency
   - ¿Usos de createApiResponse() correctos?
   - ¿Error shape { code, message, details }?
   - ¿Retorna v2 o v1 según parámetro?

3. Tests
   - ¿Tests cubren success + error?
   - ¿Tests verifican shape v2?

4. Backward Compat
   - ¿Endpoints v1 todavía funcionan si client manda v1 request?
   - ¿Exports no rompidos?

5. Git Hygiene
   - ¿Commit message claro?
   - ¿No hay merge commits?
   - ¿No hay secretos?

VERDICT PER AGENT:
✅ APPROVE | 🔧 NEEDS FIX | 🚫 BLOCK
</checklist_per_agent>

<checklist_global>
1. Consistency
   - ¿Todos usan createApiResponse?
   - ¿Error codes son consistentes (no "QUIZ_ERROR" en un lado y "QUIZ_INVALID" en otro)?
   - ¿Todas las respuestas tienen { success, data, error, meta }?

2. Coverage
   - ¿87 endpoints cubiertos?
   - ¿Alguno se escapó sin migrar?

3. Backward Compat
   - ¿v1 clients pueden seguir usando old format?
   - ¿Transición es gradual?

4. Error Handling
   - ¿Error codes son documentados?
   - ¿Mensajes son claros?

5. Performance
   - ¿No hay N+1 queries nuevas?
   - ¿Backward compat check no es lento?

VERDICT GLOBAL:
✅ ALL MERGE | 🔧 SOME NEED FIX | 🚫 ROLLBACK
</checklist_global>

<output_format>
Generar reporte estructurado:

```markdown
# Quality Gate Audit: v1 → v2 API Migration

**Scope:** 87 endpoints, 16 agentes, 4 fases

## Per-Agent Summary

| Agent | Zone | Pattern | Tests | Compat | Git | Verdict |
|-------|------|---------|-------|--------|-----|---------|
| IF-01 | ✅ | ✅ | ✅ | ✅ | ✅ | APPROVE |
| IF-02 | ✅ | ✅ | ✅ | ✅ | ✅ | APPROVE |
| AS-01 | ✅ | ✅ | ✅ | ✅ | ✅ | APPROVE |
| AS-02 | ✅ | ✅ | ✅ | ✅ | ✅ | APPROVE |
| QZ-02 | ✅ | ✅ | 🔧 | ✅ | ✅ | NEEDS FIX |
| QZ-01 | ✅ | ✅ | ✅ | ✅ | ✅ | APPROVE |
| ... (10 more) | ... | ... | ... | ... | ... | ... |

**NEEDS FIX (2 agents):**
- QZ-02: Missing tests for 3 endpoints (POST /quiz, PUT /quiz, DELETE /quiz)
  → Add tests, re-run

- AO-02: admin-backend has hardcoded error string "Error" instead of error code
  → Replace with error.code, re-run
```

```markdown
## Global Consistency Check

✅ All 87 endpoints use createApiResponse()
✅ All errors have { code, message, details? }
✅ All responses have { success, data, error, meta }
✅ Error codes documented in constants
✅ v1 backward compat tests passing
✅ No breaking exports

## Risk Assessment

🟢 LOW: Pattern is consistent, tests are solid
🟡 MEDIUM: 2 agents need test fixes
🔴 HIGH: None

## Verdict

**APPROVE with conditions:**
- Merge IF-01, IF-02, AS-01, AS-02 (Fases 1-2) immediately
- Hold QZ-02, AO-02 branches until tests added
- Merge remaining 12 agentes (Fase 3A-3E) in parallel
- After NEEDS FIX agentes are fixed → final merge

**Timeline:**
- Merge Fases 1-2: now
- Re-run QZ-02, AO-02: 10 min
- Merge Fase 3: 5 min after QZ-02/AO-02 fixed
- Total: 1 hour to v2 production
```
</output_format>

<escalation>
Si encuentras BLOCK (ej: agente tocó archivos de otro):
```
**VERDICT: BLOCK**

Agent: SM-02
Issue: Modified /app/lib/api.ts (owns IF-01, not SM-02)

This violates zone compliance. Cannot merge.

Action: SM-02 must rebase clean from main and remove the change to lib/api.ts
```
</escalation>

<qa_checklist>
Para cada check, usa:
- git diff main..<branch> para verificar zone
- grep createApiResponse en archivos del agente
- grep "error:" en tests
- git log para commit messages
- grep "any" para TypeScript compliance
</qa_checklist>
</task>
```

---

## 5. Plan de Ejecución Temporal

| Fase | Agentes | Tipo | Duración | QG? |
|------|---------|------|----------|-----|
| 1 | IF-01 | Secuencial | 30 min | Sí (rápido) |
| 2 | IF-02 (espera 1) | Secuencial | 20 min | Sí |
| 3 | AS-01 (espera 1+2) | Secuencial | 25 min | Sí |
| 4 | AS-02 (espera 1+2+3) | Secuencial | 20 min | Sí |
| **5A** | QZ-02, FC-02, SM-02, ST-02 | Paralelo (4) | 45 min | Sí |
| **5B** | QZ-01, FC-01, SM-01, ST-01 | Paralelo (4) | 45 min | Sí (espera 5A) |
| **5C** | DG-01, DG-04, AO-02, MG-04 | Paralelo (4) | 45 min | Sí |
| **5D** | AI-05, 3D-02 | Paralelo (2) | 30 min | Sí |
| **5E** | DG-02 | Solo (1) | 20 min | Sí |
| **6** | XX-02 (MACRO audit) | Secuencial | 40 min | N/A |

**Duración Total:** ~4-5 horas (incl. QG checks)

---

## 6. Rollback Plan Detallado

```
ESCENARIO 1: Fase 1 (IF-01) BLOCK
  → Todo se detiene
  → IF-01 rebasa + re-run
  → Si mismo error → necesita Arquitecto

ESCENARIO 2: Fase 2 (IF-02) BLOCK
  → Igual que 1, pero más crítico (afecta frontend)

ESCENARIO 3: Fase 3 QZ-02 BLOCK
  → QZ-02 rebasa + re-run
  → QZ-01 espera nueva versión
  → Otros agentes (FC, SM) continúan en paralelo
  → QZ-02 se reintenta después

ESCENARIO 4: Fase 5C AO-02 BLOCK
  → Solo AO-02 rebasa
  → DG-01, DG-04, MG-04 continúan
  → AO-02 se reintenta cuando QG diga

ESCENARIO 5: Fase 6 XX-02 global BLOCK
  → Reporta qué agentes específicamente fallan
  → Esos agentes rebasen + re-run
  → Otros merges mientras tanto
  → Reinicia XX-02 cuando todos están listos

ROLLBACK COMPLETO (nuclear option):
  git checkout main
  git reset --hard origin/main
  Esperar 24 horas, planificar v2 diferente
```

---

## 7. Documentación Post-Migración

Después de Fase 6 (éxito):

```
Actualizar:
1. /CLAUDE.md
   - v2 API estándar documentada

2. /app/lib/api.ts
   - Comentarios sobre v1 vs v2

3. Error codes spreadsheet
   - Centralizar todos los códigos usados

4. Client SDK (si existe)
   - Actualizar tipos

5. Postman/API docs
   - Reflejar v2 shape

6. Changelog
   - v2.0 release notes
```

---

## 8. Métricas Esperadas en AGENT-METRICS.md

```
Después de completar:

| Agent | Sessions | QG Pass Rate | Scope Creep | Lessons |
|-------|----------|-------------|-------------|---------|
| IF-01 | 1 | 100% | 0 | API wrappers are foundational |
| IF-02 | 1 | 100% | 0 | Client-side detection is critical |
| AS-01 | 1 | 100% | 0 | Auth is blocking, no mistakes |
| AS-02 | 1 | 100% | 0 | AuthContext bridge must be backward compat |
| QZ-02 | 1 | 75% | 0 | Testing all 12 endpoints is non-negotiable |
| ... (11 more) | ... | ... | ... | ... |
| XX-02 | 1 | 100% | 0 | MACRO audits need clear per-agent breakdown |

System Pulse:
- QG first-pass rate: 87.5% (14/16 APPROVE, 2 NEEDS FIX)
- Scope creep: 0 incidents
- Avg time per agent: 35 min
- Total time: 4.5 hours
- Lessons registered: 8
```

---

## 9. Diagrama de Flujo

```
┌──────────────────────────────────────┐
│ USER: Migrate API v1 → v2             │
└─────────────────┬──────────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │ ARCHITECT ANALYSIS │
         │ 87 endpoints       │
         │ 4 capas            │
         │ 16 agentes         │
         └────────┬───────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
        ▼         ▼         ▼
    ┌────────┐ ┌────────┐ ┌────────────┐
    │ Fase 1 │ │ Fase 2 │ │ Fase 3     │
    │ IF-01  │→│ AS-01  │→│ 16 agentes │
    │ IF-02  │ │ AS-02  │ │ en 5 olas  │
    └────────┘ └────────┘ └────────────┘
                                 │
                                 ▼
                          ┌──────────────┐
                          │ Fase 4 (QG)  │
                          │ MACRO audit  │
                          └──────┬───────┘
                                 │
                    ┌────────────┬────────────┐
                    │            │            │
                  ✅ APPROVE   🔧 NEEDS FIX  🚫 BLOCK
                    │            │            │
                    ▼            ▼            ▼
                 MERGE      RE-RUN (agente)  ANALYZE
                             MERGE after     ROLLBACK
```

---

## 10. Anti-Patrones & Lecciones Esperadas

### Anti-patrones encontrados en features anteriores

```
❌ Agente frontend actualiza backend (zone violation)
   → Solución: QG BLOCK inmediatamente

❌ Error codes inconsistentes ("QUIZ_ERROR" vs "QUIZ_NOT_FOUND")
   → Solución: Definir enum centralizado (XX-02 chequea)

❌ v1 backward compat roto (old clients falla)
   → Solución: Probar WITH apiCall("1.0", ...) flag

❌ Tests solo happy path (no error cases)
   → Solución: Cada test debe cubrir success + error

❌ Commit message genérico ("Update routes")
   → Solución: Require "Migrate {N} endpoints to v2" format
```

### Lecciones registradas esperadas

```
| Agent | Lesson |
|-------|--------|
| IF-01 | Shared infrastructure must be 100% backward compatible |
| IF-02 | Client-side version detection is critical |
| AS-01 | Auth endpoints need extra scrutiny (blocking) |
| QZ-02 | 12 endpoints is too many to test manually → need script |
| AO-02 | Error messages must use codes, not strings |
| XX-02 | MACRO audits need per-agent checklists |
```

---

## Resumen Ejecutivo

**Esta es una migración MACRO-SCALE: 87 endpoints, 16 agentes, 4 horas.**

```
✅ Infraestructura: IF-01 + IF-02 (contrato único)
✅ Autenticación: AS-01 + AS-02 (bloqueador crítico)
✅ Dominios: 12 agentes en 5 olas paralelas
✅ Auditoría: XX-02 MACRO mode (40 min)
✅ Rollback: por-agente + nuclear option

Riesgos:
⚠️  IF-01/IF-02 BLOCK = todo se detiene
⚠️  AS-01/AS-02 BLOCK = todo se detiene (auth is foundation)
⚠️  16 agentes simultáneos = coordina bien o chaos
⚠️  Backward compat: v1 clients deben seguir funcionando

Mitigación:
✓ Cada agente tiene prompt claro
✓ Dependencias explícitas (wait for X before starting Y)
✓ QG reducido para velocidad (essentials only)
✓ Per-agent + global rollback
✓ Lessons for future migrations

Time: 4-5 hours soup-to-nuts.
```
