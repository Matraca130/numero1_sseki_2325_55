# Guía de Uso: Agent Registry

Este documento explica cómo usar `agent-registry.md` para planificar ejecuciones de agentes.

## ¿Cuándo y Cómo Usar Este Registro?

### 1. Usuario solicita feature nueva
```
Usuario: "Agregar leaderboard a dashboard estudiante"

Pasos:
1. Lee sección "Dashboard & Gamification (DG)" en Búsqueda por Sección
2. Identifica: DG-04 (backend), DG-05 (leaderboard UI), DG-01 (integrate)
3. Consulta Grafo de Dependencias: DG-04 → DG-05 → DG-01
4. Verifica orden: DG-04 primero (crea endpoint), luego DG-05, luego DG-01
5. QG audita cada uno con 6 checks
6. Arquitecto (XX-01) orquesta todo
```

### 2. Usuario reporta bug en sección específica
```
Usuario: "Quiz no guarda respuestas"

Pasos:
1. Identifica sección: Quiz (QZ)
2. Busca en "Búsqueda por Ruta": quiz*.ts está en QZ-02 (backend)
3. Consulta dependencias: QZ-02 ← AS-01, IF-01
4. Ejecuta:
   - AS-01 y IF-01 ya están en main (base estable)
   - Corre QZ-02 en rama feature-quiz-fix
   - QG audita
5. Merge
```

### 3. Refactor o tech debt cleanup
```
Usuario: "Separar KeywordPopup en submódulos"

Pasos:
1. Busca archivo: KeywordPopup*.tsx → dueño FC-05 (flashcards-keywords)
2. Verifica dependencias: FC-05 ← IF-01 only
3. Ejecuta solo FC-05
4. QG verifica que los componentes separados siguen funcionando
```

### 4. Cambio de infraestructura
```
Usuario: "Actualizar lib/api.ts — cambiar autenticación header"

Pasos:
1. CRÍTICO: lib/api.ts está en IF-01 (infra-plumbing)
2. 74 agentes la importan — este es CAMBIO ESTRUCTURAL
3. Notifica al usuario: "Esto afecta TODOS los agentes — requiere test exhaustivo"
4. Ejecuta IF-01 primero
5. Luego corre QG + XX-06 (test-orchestrator)
6. Considera ejecutar al menos 3-4 agentes de ejemplo para verificar compatibilidad
```

---

## Estructura del Registro

### Tabla Maestra (Primeras 400 líneas)
**Contiene:** ID, Nombre, Dominio, Zona, Dependencias, Complejidad, Modelo

**Úsala para:** Lookup rápido de un agente específico
```
ID: DG-04
Nombre: gamification-backend
Zona: routes/gamification*.ts, services/gamificationApi.ts, types/gamification.ts
Dependencias: AS-01, IF-01
Complejidad: Media
```

### Búsqueda por Sección (Líneas ~150-450)
**Contiene:** 12 secciones de dominio + 9 cross-cutting

**Úsala para:**
- "¿Qué agentes toca esta feature?"
- "¿Cuáles son las dependencias internas de Flashcards?"
- "¿Quién depende de SM-04?"

**Ejemplo:**
```
### 2. Flashcards (FC) — 6 agentes

FC-01: frontend (UI review cards)
FC-02: backend (CRUD)
FC-04: fsrs (algoritmo spaced repetition)
...

Dependencias de sección:
- FC-01 ← AS-02, IF-01, SM-04, FC-02, FC-04
```

### Búsqueda por Ruta de Archivo (Líneas ~450-650)
**Contiene:** Mapping `src/app/**/*.tsx` → agente dueño

**Úsala para:**
- "¿Quién dueño de components/student/Dashboard*.tsx?"
- "¿Qué archivos tiene que tocar FC-05?"
- "Si modifico lib/api.ts, ¿quién se afecta?"

**Ejemplo:**
```
src/app/components/student/Dashboard*.tsx → DG-01
src/app/lib/api.ts → IF-01 (74 importadores)
database/policies/* → AS-01
```

### Grafo de Dependencias (Líneas ~650-750)
**Contiene:** Niveles 0-5, bloqueadores críticos, orden recomendado

**Úsala para:**
- "¿En qué orden ejecuto estos 10 agentes?"
- "¿Quién bloquea a quién?"
- "¿Puedo ejecutar QZ-01 y FC-01 en paralelo?"

**Ejemplo:**
```
Tier 1: Bloqueadores Absolutos
  IF-01 (74 importadores)
  AS-01 (todos los backends)
  AS-02 (todos los frontends)

Tier 2: Bloqueadores de Dominio
  SM-04 (28 importadores)
  QZ-04 (BKT algorithm)
```

### Caminos Críticos (Líneas ~750-850)
**Contiene:** Profundidad de ejecución, ciclos típicos, tiempos

**Úsala para:**
- "¿Cuánto tarda una feature normal?"
- "¿Cuál es el peor caso (camino más largo)?"
- "¿Cuántos agentes en paralelo puedo lanzar?"

**Ejemplo:**
```
Camino Más Largo: 8 niveles
DG-01 → ST-05 → ST-02 → ST-01 → SM-04 → SM-02 → AS-01 → IF-01

Implicación: Cualquier cambio en IF-01 requiere cascada 6-7 agentes.
```

---

## Tablas de Referencia Rápida

### Por Cantidad de Importadores (CRITICALITY)

| Importadores | Agente | Zona | Impacto |
|-------------|--------|------|--------|
| 74 | IF-01 | lib/api.ts, lib/config.ts, lib/logger.ts | CRÍTICO — cambios afectan TODO |
| 42 | AS-02 | context/AuthContext.tsx | CRÍTICO — frontend bloqueador |
| 28 | SM-04 | context/ContentTreeContext.tsx | ALTO — 6 secciones dependen |
| — | [resto] | — | MEDIO a BAJO |

**Regla:** Cambios a 28+ importadores require extra validation.

### Por Profundidad de Ejecución

| Profundidad | Ejemplo | Ciclo de Ejecución |
|-----------|---------|-------------------|
| 1-2 | BL-04 → BL-01 | ~15 min |
| 3-4 | SM-02 → SM-04 → SM-01 | ~45 min |
| 5-7 | IF-01 → ... → DG-01 | ~120 min |

### Por Tipo de Cambio

| Tipo de Cambio | Agentes Típicas | Tiempo | Paralelo |
|---------------|-----------------|--------|---------|
| Bug fix (backend single) | 1 backend + 1 QG | 15 min | N/A |
| Feature pequeña (UI) | 1 frontend + 1 QG | 20 min | N/A |
| Feature mediana (full-stack) | 1 backend + 1 frontend + 1 QG | 45 min | Sí (backend + frontend) |
| Feature grande (cross-section) | 4-8 agentes + QG × N | 120 min | Sí (múltiples fases) |
| Tech debt cleanup | 1-2 section + testers + XX-06 | 60 min | Sí |
| Infrastructure change | IF-01 + cascada + XX-06 + XX-04 | 180+ min | No (secuencial) |

---

## Checklist de Planificación

Antes de ejecutar agentes, sigue este checklist:

```
□ 1. Identificar archivos afectados (Búsqueda por Ruta)
     - Si no hay mapping → escalar a XX-01

□ 2. Mapear a agentes (Tabla Maestra)
     - Escribir lista de agentes

□ 3. Resolver dependencias (Grafo)
     - Verificar que no hay ciclos
     - Escribir orden de ejecución

□ 4. Verificar que TODOS dependen de IF-01/AS-01/AS-02 si aplica
     - Si sí → incluir en orden de ejecución

□ 5. Simular profundidad (Caminos Críticos)
     - Si profundidad > 6: tener cuidado, considerar testing adicional

□ 6. Definir fases de ejecución
     - Fase 1 (paralela): agentes sin dependencias mutuas
     - Fase 2 (secuencial): agentes que dependen de Fase 1
     - ... etc hasta convergencia

□ 7. Asignar ramas de git
     - 1+ agentes → 1 rama feature
     - 2+ agentes mismo repo → worktree per agent

□ 8. Convocar XX-02 (quality-gate)
     - Después de cada agente implementador
     - Antes de merge

□ 9. Post-mortem del Arquitecto
     - Si BLOCK/NEEDS-FIX: registrar lección en AGENT-METRICS.md
     - Actualizar memory del agente

□ 10. Verificar test coverage
     - XX-06 (test-orchestrator) debe reportar % coverage
     - Si < 80% en archivos nuevos: NEEDS FIX
```

---

## Ejemplos de Caso de Uso

### Caso 1: Agregar campo en Dashboard Estudiante
```
Solicitud: "Mostrar streak actual en dashboard estudiante"

Análisis:
- Archivo afectado: components/student/Dashboard*.tsx → DG-01 owner
- Dato nuevo: streak (viene de DG-04 gamification-backend)
- DG-01 depende de: AS-02, IF-01, SM-04, ST-05, DG-04 ✓ (DG-04 ya existe)

Plan de Ejecución:
1. DG-04 (gamification-backend) — verificar que endpoint /gamification/streak existe
   - Si no existe: implementar POST
2. DG-03 (gamification-engine) — mostrar visualización de streak en frontend
3. DG-01 (dashboard-student) — añadir widget de streak en dashboard
4. XX-02 (quality-gate) — audita cada uno

Profundidad: 5 niveles (IF-01 → AS-01 → AS-02 → DG-04 → DG-01)
Tiempo estimado: 60 min
Paralelo: DG-03 y DG-04 pueden correr en paralelo (no se tocan mutuamente)
```

### Caso 2: Cambiar algoritmo BKT en Quiz Adaptativo
```
Solicitud: "Actualizar BKT v4 a usar nuevos parámetros P_LEARN=0.20"

Análisis:
- Archivo: lib/bkt-v4.ts → QZ-04 owner
- Impacto: QZ-02 (backend) importa esto
- QZ-01 (frontend) depende de QZ-02

Plan de Ejecución:
1. QZ-04 (quiz-adaptive) — cambiar parámetro en lib/bkt-v4.ts
2. QZ-02 (quiz-backend) — no toca (solo usa la lib)
3. QZ-03 (quiz-tester) — ejecutar test de BKT con parámetro nuevo
4. QZ-01 (quiz-frontend) — verificar que UI sigue mostrando resultados correctamente
5. XX-02 (quality-gate) × 3 agentes
6. XX-06 (test-orchestrator) — reportar % coverage

Profundidad: 4 niveles (IF-01 → QZ-04 → QZ-02 → QZ-01)
Tiempo: 45 min
CRÍTICO: Requiere test exhaustivo porque BKT es algoritmo de conocimiento
```

### Caso 3: Cambiar JWT header en Auth
```
Solicitud: "Cambiar Authorization header de 'X-Access-Token' a 'Bearer <token>'"

⚠️ RIESGO CRÍTICO: This touches lib/api.ts (IF-01) + auth.ts (AS-01)

Análisis:
- Archivos: lib/api.ts (IF-01), routes/auth.ts (AS-01)
- Bloqueadores: 74 agentes + 20+ backends importan IF-01
- Impacto: TODA la plataforma se rompe si se hace mal

Plan (Coordinado por XX-01):
0. Comunicar a TODO el equipo: "Pausa en ejecución de agentes por 2 horas"
1. IF-01 (infra-plumbing) — cambiar client-side header logic
2. AS-01 (auth-backend) — cambiar server-side validation
3. XX-04 (type-guardian) — auditar tipos de Request/Response
4. XX-02 (quality-gate) — auditar IF-01 y AS-01
5. Ejecutar CADA SECCIÓN una vez para verificar integración:
   - QZ-01 (quiz) + QG
   - SM-01 (summaries) + QG
   - DG-01 (dashboard) + QG
   - [restantes...]
6. XX-06 (test-orchestrator) — correr full test suite

Profundidad: Infinita (cambio estructural)
Tiempo: 4-6 horas
BLOQUEADOR: Nada más puede ejecutar hasta que se complete y QG apruebe

Mitigación:
- Feature flag "USE_NEW_AUTH_HEADER" para rollback rápido
- Deploy a staging primero (8 horas)
- Monitore error rate en producción (first 1 hour)
```

---

## Palabras Clave de Búsqueda en Este Documento

- **"Bloqueador"** → Agentes que detienen otros
- **"Importadores"** → Cuántos archivos usan este agente
- **"Profundidad"** → Cuántos niveles de dependencias
- **"Crítico"** → Alto riesgo de quiebre
- **"Paralelo"** → Agentes que pueden ejecutarse simultáneamente
- **"BLOCK"** → Detiene merge (Quality Gate verdict)
- **"NEEDS FIX"** → Requiere cambios antes de merge
- **"APPROVE"** → Listo para merge

---

## Mantenimiento de Este Registro

**Actualizar cuando:**
1. Se agregue agente nuevo → insertar fila en Tabla Maestra
2. Se reassigne zona de agente → actualizar Tabla Maestra + Búsqueda por Ruta
3. Se eliminate agente (legacy) → mover a sección "Legados"
4. Se descubra nueva dependencia → actualizar Grafo
5. Se documente bloqueador nuevo → actualizar "Bloqueadores Críticos"

**Verificar cada 2 semanas:**
- ¿Hay agentes sin memoria individual?
- ¿Hay archivos sin dueño asignado?
- ¿Hay ciclos de dependencia?

**Contactar al Arquitecto (XX-01) si:**
- No queda claro quién dueño de un archivo
- Dos agentes necesitan modificar el mismo archivo
- Se requiere cambio estructural

---

**Última actualización:** 29 de marzo de 2026
**Mantenedor:** XX-01 (Architect Agent)
**Referencia:** `.claude/agents/` (76 archivos de definición)
