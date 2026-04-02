# AXON Agent Registry — Índice Principal

**Ubicación:** `/mnt/outputs/crear-prompt/references/`

## Archivos en Este Paquete

### 1. **agent-registry.md** (49 KB, 837 líneas)
Registro completo exhaustivo de los 74 agentes AXON.

**Contiene:**
- Tabla Maestra: ID, nombre, dominio, zona, dependencias, complejidad, modelo
- Búsqueda por Sección: 12 dominios + 9 cross-cutting con tablas detalladas
- Búsqueda por Ruta de Archivo: Mapping completo `src/app/**/*.tsx` → agente dueño
- Grafo de Dependencias: Niveles 0-5, bloqueadores críticos, orden recomendado
- Caminos Críticos: Profundidad máxima (8 niveles), ciclos típicos
- Complejidad de Modelo: Recomendaciones (todos opus)
- Reglas de Aislamiento: Principios, detección de violaciones

**Úsalo cuando:** Necesites información técnica detallada sobre agentes

**Ejemplo de búsqueda:**
```
¿Quién dueño de components/student/Dashboard*.tsx?
→ Ctrl+F "Dashboard*.tsx"
→ Encuentra DG-01 (dashboard-student)
```

---

### 2. **REGISTRY-README.md** (11 KB, 400 líneas)
Guía práctica de cómo USAR agent-registry.md.

**Contiene:**
- Guía de uso: cuándo y cómo usar el registro
- Estructura desglosada: qué encontrar en cada sección
- Tablas de referencia rápida: criticality, profundidad, tipos de cambio
- Checklist de planificación: pasos antes de ejecutar agentes
- 3 ejemplos de caso de uso con análisis completo
- Palabras clave de búsqueda
- Instrucciones de mantenimiento

**Úsalo cuando:** Estés planificando ejecución de agentes, necesites checklist

**Ejemplo de uso:**
```
Usuario: "Agregar leaderboard a dashboard"
→ Sigue "Ejemplo Caso 1" en REGISTRY-README.md
→ Obtienes plan detallado con orden, dependencias, tiempo
```

---

### 3. **INDEX.md** (este archivo)
Mapa del paquete y guía de orientación.

---

## Flujo Rápido: "¿Cómo sé qué hacer?"

### Escenario A: "Necesito arreglar componente X"
```
1. Abre agent-registry.md
2. Ctrl+F por nombre del componente (ej: "Dashboard*.tsx")
3. Encuentra agente dueño (ej: DG-01)
4. Lee sus dependencias (en Tabla Maestra)
5. Consulta orden en Grafo de Dependencias
6. Ejecuta según orden
7. QG audita (XX-02)
```

### Escenario B: "¿Cuál es el orden de ejecución para feature grande?"
```
1. Abre REGISTRY-README.md
2. Ve a "Checklist de Planificación"
3. Sigue los 10 puntos
4. Si necesitas más detalles → Usa agent-registry.md para detalles
```

### Escenario C: "Cambio estructural — ¿a quién afecta?"
```
1. Abre agent-registry.md
2. Ve a "Bloqueadores Críticos"
3. Si afecta IF-01 (74 importadores) → MÁXIMA PRECAUCIÓN
4. Usa "Caso 3" en REGISTRY-README.md como plantilla
```

### Escenario D: "¿Quién dueño de database/migrations/?"
```
1. Abre agent-registry.md
2. Ve a "Búsqueda por Ruta de Archivo"
3. Busca "database/migrations/" → IF-04, XX-05
```

---

## Estadísticas Rápidas

| Métrica | Valor |
|---------|-------|
| **Total Agentes Activos** | 74 |
| **Total Agentes (con legacy)** | 76 |
| **Dominios** | 12 |
| **Cross-Cutting** | 9 |
| **Máximo Importadores** | 74 (IF-01 infra-plumbing) |
| **Profundidad Máxima** | 8 niveles |
| **Modelos Permitidos** | Sonnet, Opus (nunca Haiku) |
| **Checks QG** | 6 (zone, ts, spec, tests, git, compat) |

---

## Agentes Clave a Recordar

### Bloqueadores Tier 1 (CRITICAL)
| Agente | Por qué crítico | Importadores |
|--------|-----------------|--------------|
| **IF-01** | Libs core: api.ts, config.ts, logger.ts | 74 |
| **AS-01** | Auth backend, RLS policies | 15+ backends |
| **AS-02** | Auth frontend, AuthContext | 20+ frontends |

### Bloqueadores Tier 2 (HIGH)
| Agente | Por qué | Importadores |
|--------|--------|--------------|
| **SM-04** | Content tree hierarchy | 28 |
| **SM-02** | Summaries backend (alimenta SM-04) | 5+ |
| **QZ-04** | BKT algorithm (quiz adaptativo) | 3+ |
| **FC-04** | FSRS algorithm (spaced repetition) | 4+ |
| **DG-04** | Gamification backend (puntos + badges) | 8+ |

### Solo Lectura / Auditores
| Agente | Función |
|--------|---------|
| **XX-02** | Quality Gate — revisa TODO |
| **XX-01** | Architect — orquesta agentes |
| **AS-03** | RLS auditor (no modifica) |
| **AS-04** | Security scanner (no modifica) |
| **XX-07** | Refactor scout (no modifica) |

---

## Agentes por Sección

### 1. Quiz (QZ) — 6 agentes
**Propósito:** Quizzes adaptativas con BKT

| ID | Nombre | Tipo |
|----|--------|------|
| QZ-01 | quiz-frontend | Frontend |
| QZ-02 | quiz-backend | Backend |
| QZ-03 | quiz-tester | Tester |
| QZ-04 | quiz-adaptive | Algoritmo (BKT v4) |
| QZ-05 | quiz-questions | Renderers |
| QZ-06 | quiz-analytics | Reports |

### 2. Flashcards (FC) — 6 agentes
**Propósito:** Tarjetas con repetición espaciada (FSRS)

| ID | Nombre | Tipo |
|----|--------|------|
| FC-01 | flashcards-frontend | Frontend |
| FC-02 | flashcards-backend | Backend |
| FC-03 | flashcards-tester | Tester |
| FC-04 | flashcards-fsrs | Algoritmo (FSRS v4) |
| FC-05 | flashcards-keywords | Keywords + popup |
| FC-06 | flashcards-generation | IA generation |

### 3. Summaries & Content (SM) — 6 agentes
**Propósito:** Contenido académico + editor de bloques

| ID | Nombre | Tipo |
|----|--------|------|
| SM-01 | summaries-frontend-v2 | Frontend |
| SM-02 | summaries-backend-v2 | Backend |
| SM-03 | summaries-tester | Tester |
| SM-04 | content-tree | Árbol de contenido (28 importadores) |
| SM-05 | video-player | Video (Mux) |
| SM-06 | text-highlighter | Highlighting |

### 4. Study & Spaced Repetition (ST) — 5 agentes
**Propósito:** Sesiones de estudio + programación

| ID | Nombre | Tipo |
|----|--------|------|
| ST-01 | study-hub | Frontend |
| ST-02 | study-sessions | Backend |
| ST-03 | study-queue | Queue scheduler |
| ST-04 | study-plans | Plans UI |
| ST-05 | study-progress | Progress dashboard |

### 5. Dashboard & Gamification (DG) — 5 agentes
**Propósito:** Dashboards + XP, badges, leaderboard

| ID | Nombre | Tipo |
|----|--------|------|
| DG-01 | dashboard-student | Frontend |
| DG-02 | dashboard-professor | Frontend |
| DG-03 | gamification-engine | Frontend (XP display) |
| DG-04 | gamification-backend | Backend (XP logic) |
| DG-05 | leaderboard | UI + API |

### 6. Admin & Owner (AO) — 4 agentes
**Propósito:** Gestión institucional + billing

| ID | Nombre | Tipo |
|----|--------|------|
| AO-01 | admin-frontend | Frontend |
| AO-02 | admin-backend | Backend |
| AO-03 | owner-frontend | Frontend |
| AO-04 | owner-backend | Backend |

### 7. Auth & Security (AS) — 5 agentes
**Propósito:** Autenticación JWT + RLS + CORS

| ID | Nombre | Tipo |
|----|--------|------|
| AS-01 | auth-backend | Backend (JWT) |
| AS-02 | auth-frontend | Frontend (AuthContext) |
| AS-03 | rls-auditor | Auditor (solo lectura) |
| AS-04 | security-scanner | Auditor (solo lectura) |
| AS-05 | cors-headers | Middleware |

### 8. AI & RAG (AI) — 6 agentes
**Propósito:** Embeddings + RAG chat + LLM generation

| ID | Nombre | Tipo |
|----|--------|------|
| AI-01 | rag-pipeline | Ingest (PDF → chunks) |
| AI-02 | rag-chat | Chat UI |
| AI-03 | ai-generation | Content generation |
| AI-04 | embeddings | Vector DB |
| AI-05 | ai-backend | API routes |
| AI-06 | ai-prompts | Prompt templates |

### 9. 3D Viewer (3D) — 4 agentes
**Propósito:** Visualización 3D + anotaciones

| ID | Nombre | Tipo |
|----|--------|------|
| 3D-01 | viewer3d-frontend | Frontend (Three.js) |
| 3D-02 | viewer3d-backend | Backend |
| 3D-03 | viewer3d-upload | Upload UI |
| 3D-04 | viewer3d-annotations | Annotations |

### 10. Infrastructure (IF) — 5 agentes
**Propósito:** Libs core + DB + DevOps

| ID | Nombre | Tipo |
|----|--------|------|
| IF-01 | infra-plumbing | Libs core (74 importadores) |
| IF-02 | infra-ui | Shared UI components |
| IF-03 | infra-ai | AI config |
| IF-04 | infra-database | Migrations + schema |
| IF-05 | infra-ci | DevOps + GitHub Actions |

### 11. Messaging (MG) — 4 agentes
**Propósito:** Telegram + WhatsApp + notificaciones

| ID | Nombre | Tipo |
|----|--------|------|
| MG-01 | telegram-bot | Telegram bot |
| MG-02 | whatsapp-bot | WhatsApp bot |
| MG-03 | notifications | In-app notifications |
| MG-04 | messaging-backend | Backend routes |

### 12. Billing (BL) — 4 agentes
**Propósito:** Stripe + plan management

| ID | Nombre | Tipo |
|----|--------|------|
| BL-01 | stripe-checkout | Checkout UI |
| BL-02 | stripe-webhooks | Webhook handlers |
| BL-03 | billing-frontend | Billing UI |
| BL-04 | billing-plans | Plan CRUD |

### Cross-Cutting (XX) — 9 agentes
**Propósito:** Orquestación + auditoría + generación

| ID | Nombre | Tipo |
|----|--------|------|
| XX-01 | architect | Orquestador |
| XX-02 | quality-gate | Auditor (post-ejecución) |
| XX-03 | docs-writer | Generador |
| XX-04 | type-guardian | Auditor TS |
| XX-05 | migration-writer | Generador SQL |
| XX-06 | test-orchestrator | Auditor tests |
| XX-07 | refactor-scout | Auditor (no modifica) |
| XX-08 | design-system | Auditor (no modifica) |
| XX-09 | api-contract | Auditor (no modifica) |

---

## Cambios Frecuentes

### Por Sección

| Sección | Frecuencia | Agentes que Tocan |
|---------|-----------|------------------|
| **Quiz** | Alta | QZ-01, QZ-02, QZ-03 |
| **Flashcards** | Alta | FC-01, FC-02, FC-03 |
| **Summaries** | Media | SM-01, SM-02, SM-03 |
| **Study** | Media | ST-01, ST-02, ST-05 |
| **Dashboard** | Alta | DG-01, DG-02, DG-03 |
| **Auth** | Muy baja (producción) | AS-01, AS-02 |
| **Infrastructure** | Muy baja (crítico) | IF-01 |
| **3D** | Baja | 3D-01, 3D-02 |

---

## Legados (NO USAR)

| ID | Nombre | Razón | Usar En Lugar |
|----|--------|-------|--------------|
| AO-05 | admin-dev | Consolidado | AO-01 a AO-04 |
| — | study-dev | Consolidado | ST-01 a ST-05 |
| — | summaries-frontend (v1) | Reemplazado | SM-01 (v2) |
| — | summaries-backend (v1) | Reemplazado | SM-02 (v2) |

---

## Reglas de Oro

1. **IF-01 es la base:** 74 agentes la usan — cambios aquí requieren cascada
2. **AS-01 y AS-02 son bloqueadores:** Todos los backends y frontends esperan
3. **SM-04 es el hub de contenido:** 28 importadores — cambios causan onda
4. **REGLA: NUNCA usar Haiku:** Mínimo Sonnet, Opus para complejidad
5. **QG revisa TODO:** Después de cada agente implementador
6. **Cero overlap:** Un archivo = un dueño
7. **Escala temprano:** Si duda → pregunta a XX-01 (Architect)

---

## Contacto y Mantenimiento

**Mantiene este registro:** XX-01 (Architect Agent)

**Actualizar cuando:**
- Se agregue agente nuevo
- Se reassigne zona de un agente
- Se identifique bloquea crítico nuevo
- Se deprece un agente legacy

**Verificar cada 2 semanas:**
- ¿Hay archivos sin dueño?
- ¿Hay ciclos de dependencia?
- ¿Hay agentes con zona vacía?

---

## Guía de Lectura Recomendada

**Para nuevos usuarios:**
1. Lee este INDEX.md (estás aquí)
2. Lee REGISTRY-README.md (guía práctica)
3. Consulta agent-registry.md según necesites (referencia)

**Para usuarios experimentados:**
- Usa `Ctrl+F` directamente en agent-registry.md
- Consulta REGISTRY-README.md para checklists

**Para Arquitecto (XX-01):**
- Todo este paquete es tu referencia (plan, ejecuta, audita)
- agent-registry.md es tu fuente de verdad para seleccionar agentes

---

**Última actualización:** 29 de marzo de 2026
**Versión:** 1.0
**Formato:** Markdown (UTF-8)
**Tamaño total:** 70 KB
**Líneas totales:** 1200+
