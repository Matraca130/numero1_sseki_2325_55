# AXON Agent Registry — Comienza Aquí

**Fecha:** 29 de marzo de 2026
**Tamaño del paquete:** 72 KB, 1550+ líneas
**Propósito:** Referencia exhaustiva del sistema de 74 agentes AXON

---

## ¿Qué Es Este Paquete?

Este es el registro completo que mapea **planes de usuario → agentes ejecutores → orden de ejecución**.

**Contiene:**
- 74 agentes activos + 2 legacy
- 12 dominios + 9 cross-cutting
- Mapping completo: archivo → agente dueño
- Grafo de dependencias (orden de ejecución)
- Caminos críticos (profundidad máxima = 8 niveles)
- Checklists y ejemplos de caso de uso

**Está en español** (aunque el código y IDs están en inglés).

---

## Por Dónde Empiezo?

### Si es tu PRIMERA VEZ:
```
1. Lee: INDEX.md (5 min)
   → Visión general, agentes clave, estadísticas

2. Lee: REGISTRY-README.md (15 min)
   → Guía práctica: cómo usar el registro
   → Checklist de planificación
   → 3 ejemplos de caso de uso

3. Usa: agent-registry.md (referencia)
   → Búsquedas detalladas según necesites
```

### Si necesitas ARREGLAR algo AHORA:
```
1. Abre agent-registry.md
2. Ctrl+F por nombre del archivo (ej: "Dashboard.tsx")
3. Encuentra agente dueño y sus dependencias
4. Consulta orden en Grafo de Dependencias
5. Sigue checklist en REGISTRY-README.md
```

### Si vas a PLANIFICAR una feature:
```
1. Lee REGISTRY-README.md → "Checklist de Planificación"
2. Sigue los 10 pasos
3. Si necesitas detalles → Consulta agent-registry.md
```

---

## Archivos en Este Paquete

| Archivo | Tamaño | Líneas | Para Qué |
|---------|--------|--------|----------|
| **00-START-HERE.md** (este) | 3 KB | 120 | Orientación inicial |
| **INDEX.md** | 12 KB | 369 | Visión general + estadísticas |
| **REGISTRY-README.md** | 11 KB | 345 | Guía práctica + ejemplos |
| **agent-registry.md** | 49 KB | 837 | Referencia completa (TODO) |

**Total:** 72 KB, 1550+ líneas

---

## Agentes Clave (Memoriza Estos)

### Bloqueadores Tier 1 — Cambia cualquiera = TODO se rompe
```
IF-01  (infra-plumbing)    →  74 importadores  (lib/api.ts, config, logger)
AS-01  (auth-backend)      →  15+ backends     (JWT, RLS)
AS-02  (auth-frontend)     →  20+ frontends    (AuthContext)
```

### Bloqueadores Tier 2 — Cambia = cascada de 5-10 agentes
```
SM-04  (content-tree)      →  28 importadores  (ContentTreeContext)
QZ-04  (quiz-adaptive)     →  BKT algorithm
FC-04  (flashcards-fsrs)   →  FSRS algorithm
DG-04  (gamification-back) →  XP + badges API
```

**Regla:** Antes de cambiar algo, busca si tiene 10+ importadores en agent-registry.md.

---

## Flujo Típico: Feature Pequeña (15 min)

```
Usuario: "Mostrar badge en dashboard"

1. Busca "Dashboard" en agent-registry.md → DG-01
2. Busca dependencias de DG-01:
   - AS-02, IF-01, SM-04, ST-05, DG-04
   → Todos ya en main, no preocupa

3. Verifica qué archivos toca:
   - components/student/Dashboard*.tsx → DG-01
   - components/gamification/Badge*.tsx → DG-03 (display)
   - routes/gamification*.ts → DG-04 (API)

4. Orden: DG-04 (backend) → DG-03 (frontend) → DG-01 (integrate)
5. Ejecuta 3 agentes en secuencia
6. QG (XX-02) audita cada uno
7. Total: ~45 min
```

---

## Flujo Típico: Feature Grande (120 min)

```
Usuario: "Agregar gamificación completa"

1. Identifica todos los agentes:
   DG-03 (engine), DG-04 (backend), DG-05 (leaderboard),
   DG-01, DG-02 (dashboards), QZ-06 (reports)

2. Resuelve dependencias (Grafo):
   - DG-04 primero (backend)
   - DG-03, DG-05 en paralela (frontend, sin overlap)
   - DG-01, DG-02 después (usan DG-04 + DG-03)

3. Fases:
   - Fase 1: DG-04 (backend foundation)
   - Fase 2: QG audita DG-04
   - Fase 3: DG-03 + DG-05 paralela (frontend)
   - Fase 4: QG audita DG-03 + DG-05
   - Fase 5: DG-01 + DG-02 (integraciones)
   - Fase 6: QG final

4. Total: 6-8 agentes, 3+ fases, ~120 min
```

---

## Cambios Estructurales (Requieren Cuidado Especial)

### Si necesitas cambiar lib/api.ts (IF-01):
⚠️ **RIESGO CRÍTICO**
- 74 agentes importan esto
- TODO se puede romper
- Requiere: testing exhaustivo, rollback plan

**Pasos:**
1. Comunicar a todo equipo: "Cambio estructural, pausa otros agentes"
2. Cambiar IF-01
3. QG audita IF-01
4. Ejecutar al menos 5 agentes de ejemplo para verificar
5. QG audita todos
6. XX-06 (test-orchestrator) corre suite completa
7. Monitorear producción 1 hora

**Tiempo:** 4-6 horas

---

### Si necesitas cambiar auth-backend (AS-01) o auth-frontend (AS-02):
⚠️ **MUY CRÍTICO**
- Afecta 15+ backends, 20+ frontends
- Si se rompe = plataforma inutilizable

**Pasos:**
1. Feature flag: "USE_NEW_AUTH" para rollback rápido
2. Deploy a staging (8 horas)
3. Monitorear staging 2 horas
4. Deploy a producción
5. Monitorear producción 2 horas
6. Solo entonces considerar quitarfeature flag

---

## 3 Búsquedas Que Harás Constantemente

### Búsqueda 1: "¿Quién dueño de archivo X?"
```
agent-registry.md → "Búsqueda por Ruta de Archivo"
Ctrl+F "nombre-del-archivo"
→ Te dice agente + línea en que aparece
```

### Búsqueda 2: "Si cambio agente X, ¿quién se afecta?"
```
agent-registry.md → "Tabla Maestra"
Busca X en columna "ID"
Lee columna "Dependencias" → lista de agentes bloqueados
```

### Búsqueda 3: "¿En qué orden ejecuto estos 5 agentes?"
```
agent-registry.md → "Grafo de Dependencias"
Sigue las líneas desde tu primer agente
O consulta REGISTRY-README.md → "Checklist de Planificación"
```

---

## Reglas de Oro (No Olvides)

```
1. SIEMPRE usa model: "opus" o "sonnet"
   - NUNCA haiku (prohibido por solicitud del usuario)
   - Mínimo: Sonnet
   - Máximo/Complex: Opus

2. CERO overlap de archivos
   - Un archivo = un dueño
   - Si 2 agentes necesitan = escalar a XX-01

3. QG (XX-02) revisa TODO
   - 6 checks: zone, ts, spec, tests, git, compat
   - Después de CADA agente implementador
   - Verdicts: APPROVE / NEEDS FIX / BLOCK

4. Escala temprano si tienes duda
   - XX-01 (Architect) es tu amigo
   - Mejor preguntar 5 min que perder 2 horas en refactor

5. Cambios a 10+ importadores = MÁXIMA PRECAUCIÓN
   - Agent-registry.md muestra importadores
   - Si > 20: considera testing extra

6. Grafo de dependencias es ley
   - No ejecutes agentes en orden random
   - Sigue el grafo → orden garantizado de no-conflictos
```

---

## Estadísticas de Un Vistazo

| Métrica | Valor |
|---------|-------|
| Agentes Activos | 74 |
| Dominios | 12 |
| Cross-Cutting | 9 |
| Máximo Importadores | 74 (IF-01) |
| Profundidad Máxima | 8 niveles |
| Max Paralelo | 20 agentes |
| Modelo Usado | opus (100%) |
| QG Checks | 6 |
| Seconds Recomendado para Cambio Pequeño | 15 min |
| Segundos Recomendado para Feature Mediana | 45 min |
| Minutos Recomendado para Feature Grande | 120 min |

---

## Próximos Pasos

### Ahora (2 min):
- ✅ Estás aquí (00-START-HERE.md)

### Próximo (5 min):
- Lee INDEX.md
- Memoriza agentes clave

### Después (15 min):
- Lee REGISTRY-README.md
- Entiende checklist y ejemplos

### Cuando necesites (según requiera):
- Busca en agent-registry.md
- Sigue checklist en REGISTRY-README.md

### Referencia Permanente:
- Mantén agent-registry.md en browser
- Ctrl+F es tu mejor amigo

---

## Contacto

**Este registro es mantenido por:** XX-01 (Architect Agent)

**Actualizado:** Cada vez que se agregue, reassigne o elimine un agente

**Próxima revisión:** Cuando haya cambios estructurales

---

**¿Listo? → Abre INDEX.md ahora mismo**

---

*Documento generado: 29 de marzo de 2026*
*Fuente: AXON 74-Agent System Architecture*
*Idioma: Español (código en inglés)*
