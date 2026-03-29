# Ejemplos de Transformación Plan → Prompt para Axon

Tres ejemplos didácticos completos que muestran cómo transformar planes en prompts ejecutables para el sistema multi-agente de Axon (74 agentes, 12 dominios).

---

## 1. hotfix-example.md — ESCALA: MICRO (1-2 agentes)

**Caso:** "Fix critical bug: Quiz scores no actualizan parámetros BKT"

**Características:**
- 1-2 agentes (QZ-04 + XX-02 quality-gate)
- Duración: 15-30 minutos
- 1 rama, 1 cambio (una sola línea de código)
- QG reducido: 3 checks esenciales (vs 6 en features)
- Approach: TDD (test demuestra el bug)

**Contenido:**
1. Reporte del bug del usuario
2. Análisis rápido del Arquitecto (scope, ubicación, riesgos)
3. Plan micro (solo 1 fase)
4. Prompts COMPLETOS listos para ejecutar:
   - QZ-04: Identificar, diagnosticar, corregir bug
   - XX-02: Auditoría en hotfix mode
5. Timeline: 14:45 → 15:15 (30 minutos)
6. Data fix plan para sesión posterior
7. Comparación: Feature vs Hotfix (tabla)
8. Checklist pre-merge

**Cuándo leer esto:**
- Para entender hotfixes urgentes
- Como primer ejemplo si eres nuevo
- Para procesos de bugfix rápido

**Tiempo de lectura:** 10-15 minutos

---

## 2. feature-example.md — ESCALA: MEDIO (6-8 agentes)

**Caso:** "Agregar notificaciones de repetición espaciada al sistema de Flashcards"

**Características:**
- 6-8 agentes en 3 dominios (FC, MG, ST, IF)
- Duración: 3-4 horas
- 5 fases: secuencial + paralelo
- QG completo: 6 checks por agente
- Approach: End-to-end feature con arquitectura multi-dominio

**Contenido:**
1. Análisis profundo del Arquitecto:
   - Archivos afectados
   - Mapeo de agentes
   - Dependencias críticas
   - Criterios de éxito por fase
2. Equipo de agentes seleccionados
3. Prompts COMPLETOS y LISTOS para 8 agentes:
   - IF-04: Migración SQL + RLS
   - FC-04: Cálculo FSRS de próximo repaso
   - MG-04: Router de distribución multi-canal
   - MG-01: Envío a Telegram
   - MG-02: Envío a WhatsApp
   - MG-03: Componentes UI de notificaciones in-app
   - FC-02: Orquestación de endpoint
   - ST-03: Integración con study queue
4. Plan de fases y ejecución (tabla temporal)
5. Criterios de calidad (QG checklist)
6. Rollback plan
7. Lecciones esperadas en AGENT-METRICS.md
8. Estimación de tokens y costos

**Contenido de cada prompt:**
- `<system>` con definición del agente
- `<mandatory_reads>` con archivos a leer
- `<isolation_zone>` con archivos que puede modificar
- `<conventions>` de código del dominio
- `<task>` con objetivo, contexto, acceptance_criteria
- `<dependencies>` explícitas
- `<output_format>` de lo que debe entregar
- `<examples>` BEFORE/AFTER de código

**Cuándo leer esto:**
- Para entender features que cruzan dominios
- Para ver estructura de prompts multiagente
- Como referencia de cómo planificar 6-8 agentes
- Para entender fase planning, execution, quality gate

**Tiempo de lectura:** 30-45 minutos

---

## 3. cross-cutting-example.md — ESCALA: MACRO (15+ agentes)

**Caso:** "Migrar todos los endpoints de API v1 a v2 con nuevo error handling"

**Características:**
- 15+ agentes en 4 capas arquitectónicas
- Duración: 8-10 horas
- 4 fases + 5 olas paralelas (nested parallelism)
- QG MACRO mode: per-agent + global audits
- Approach: Cambio arquitectónico de plataforma

**Contenido:**
1. Objetivo de negocio y solicitud del usuario
2. Análisis arquitectónico del Arquitecto:
   - Scope global (87 endpoints)
   - Cambios requeridos por capa
   - Dependencia crítica (IF-01 es bloqueador)
   - Rollback plan de 5 escenarios
3. Descomposición por ola:
   - Fase 1: Infraestructura (IF-01 + IF-02)
   - Fase 2: Autenticación (AS-01 + AS-02)
   - Fase 3: Dominios (5 olas de 3-4 agentes paralelos)
   - Fase 4: Auditoría (XX-02 MACRO mode)
4. Prompts COMPLETOS para 8 agentes (ejemplificados):
   - IF-01: Crear createApiResponse() wrapper
   - IF-02: Actualizar apiClient para v2
   - AS-01: Migrar 5 endpoints auth a v2
   - AS-02: Actualizar AuthContext
   - Ola 3A: Templates genéricos para QZ-02 + otros backend
   - Ola 3B: Templates genéricos para QZ-01 + otros frontend
   - XX-02: Auditoría MACRO con per-agent + global checklists
5. Plan de ejecución temporal (todos los tiempos)
6. Rollback plan detallado (5 escenarios específicos)
7. Documentación post-migración
8. Métricas esperadas en AGENT-METRICS.md
9. Diagrama de flujo visual
10. Anti-patrones y lecciones esperadas

**Cómo está organizado:**
- Explica patrón una vez (para IF-01)
- Reutiliza para IF-02
- Proporciona templates genéricos para Ola 3 (adaptables a cualquier dominio)
- Auditoría XX-02 MACRO es el ejemplo principal
- Todos los agentes no cubiertos usan mismo template (QZ, FC, SM, ST, DG, etc)

**Cuándo leer esto:**
- Para migraciones arquitectónicas grandes
- Para entender orquestación de 15+ agentes
- Para ver cómo manejar paralelismo con dependencias
- Para planes complejos que cruzan muchos dominios
- Como referencia de rollback scenarios
- Para entender X-agent coordination patterns

**Tiempo de lectura:** 45-60 minutos

---

## Matriz de Decisión: Cuál Leer

| Tu situación | Leer primero | Luego | Finalmente |
|---|---|---|---|
| Nuevo en crear-prompt | hotfix | feature | cross-cutting |
| Pequeña corrección (< 1h) | hotfix | — | — |
| Feature estándar (1-4h) | feature | cross-cutting (referencia) | — |
| Refactor/migración grande (4+ h) | cross-cutting | feature (si hay dominios) | hotfix (rollback) |
| Quiero entender multi-agent | feature | cross-cutting | hotfix |
| Quiero copiar templates | feature (prompts) | cross-cutting (templates) | hotfix (QG) |

---

## Estructura Común a Todos los Ejemplos

Cada ejemplo sigue esta estructura:

```
1. Descripción breve + metadatos (escala, duración, modelo)
2. Solicitud del usuario (context)
3. Análisis del Arquitecto (scope, agentes, dependencias)
4. Plan de agentes (equipo seleccionado, fases)
5. PROMPTS COMPLETOS (1 por agente en ejemplos pequeños)
6. Tabla de ejecución temporal
7. Criterios de Quality Gate
8. Rollback plan
9. Lecciones esperadas en AGENT-METRICS
10. (Opcional) Diagramas, templates genéricos, anti-patrones
```

---

## Características de Todos los Prompts

Cada prompt incluye:

✅ **`<system>`** — Rol del agente, responsabilidades, contexto

✅ **`<mandatory_reads>`** — Archivos que DEBE leer antes (CLAUDE.md, agent def, memory, section memory, isolation feedback)

✅ **`<isolation_zone>`** — Archivos específicos que PUEDE modificar, qué NO tocar

✅ **`<conventions>`** — Reglas de código del dominio (TypeScript, naming, patterns)

✅ **`<task>`**
  - `<objective>` — Qué lograr
  - `<context>` — Por qué, qué problema resuelve
  - `<acceptance_criteria>` — Criterios verificables (para QG)
  - `<dependencies>` — Qué debe estar listo antes
  - `<output_format>` — Qué debe entregar

✅ **`<examples>`** — BEFORE/AFTER de código, ejemplos de entrada/salida

✅ **`<escalation>`** — Situaciones donde DETENER y reportar

✅ **`<qa_focus>`** (optional) — Hints para auditor

---

## Cómo Usar Estos Ejemplos

### Para Aprender
1. Leer hotfix-example.md en 15 minutos
2. Leer feature-example.md en 45 minutos
3. Leer cross-cutting-example.md en 60 minutos
4. Total: 2 horas para entender la metodología

### Para Crear Tus Propios Prompts
1. Clasificar tu tarea: ¿Micro/Medio/Macro?
2. Copiar estructura del ejemplo similar
3. Adaptar prompts a tu contexto
4. Seguir patron <system>/<task>/<examples>

### Para Entrenar a otros
1. Mostrar hotfix-example.md (simple, rápido)
2. Mostrar feature-example.md (procesos, dependencias)
3. Mostrar cross-cutting-example.md (escala, complejidad)
4. Dejar leer, hacer preguntas

### Para Debugging
1. ¿El prompt no funciona? → Check section `<isolation_zone>` es correcta
2. ¿El agente hace scope creep? → Revisar `<examples>` BEFORE/AFTER
3. ¿QG rechaza? → Check `<acceptance_criteria>` vs entrega
4. ¿Falta dependencia? → Ver `<task><dependencies>`

---

## Estadísticas

| Métrica | Hotfix | Feature | Cross-Cutting | Total |
|---------|--------|---------|---------------|-------|
| Líneas | 524 | 1,215 | 1,359 | 3,098 |
| KB | 14 | 35 | 36 | 85 |
| Agentes cubiertos | 2 | 8 | 8+ (16 implied) | 28+ |
| Prompts completos | 2 | 8 | 8 | 18 |
| Fases | 1 | 5 | 4 + 5 olas | — |
| Duración ejemplo | 30 min | 3-4 h | 8-10 h | — |

---

## Lenguaje

**Todos los ejemplos están 100% en ESPAÑOL.** Ningún prompts mezcla inglés, todos listos para ejecutar con Claude Opus.

---

## Siguiente Lectura

Después de entender estos ejemplos, consulta:
- `.claude/AGENT-REGISTRY.md` — Lista completa de 74 agentes
- `.claude/agents/architect.md` — Cómo el Arquitecto analiza
- `.claude/agents/quality-gate.md` — Las 6 verificaciones
- `.claude/memory/feedback_agent_isolation.md` — Reglas de aislamiento

---

## Preguntas Frecuentes

**P: ¿Puedo copiar un prompt y usarlo directamente?**
R: Sí, pero adapta:
  - IDs de agentes (QZ-04 vs tu agente)
  - Rutas de archivos (tu repo structure)
  - Criterios específicos (tu contexto)
  - Error codes (dominio específico)

**P: ¿Cuántos agentes es "demasiado" para paralelizar?**
R: Máximo 20 simultáneos en Axon. Hotfix = 1, Feature = 4-6 paralelo, Macro = múltiples olas de 4-5.

**P: ¿Qué pasa si un agente en Fase 2 falla?**
R: Depende de dependencias. Revisa sección "Rollback plan" en el ejemplo (hotfix es simple, macro tiene 5 escenarios).

**P: ¿Cómo escribo prompts para agentes no documentados aquí?**
R: Copia template de Feature → adapta para tu agente → sigue mismo structure (system/task/examples).

---

**Creados:** 2026-03-29
**Sistema:** Axon Multi-Agent (74 agentes, 12 dominios)
**Versión:** 1.0 (base)
