# PATRONES DE EQUIPOS DE AGENTES: Orquestación AXON

**Versión:** 2.0
**Fecha:** Marzo 2026
**Aplicación:** Orquestación de múltiples agentes en paralelo y secuencial
**Modelo:** Claude Opus 4.6+ (Teams)

---

## PATRONES DE EJECUCIÓN

### PATRÓN 1: Ejecución Paralela Simple

**Uso:** Tareas independientes que no dependen una de otra.

```yaml
SOLICITUD: "Agregar leaderboard a dashboard del estudiante"

ANALISIS:
- Leaderboard backend (DG-04) - INDEPENDIENTE
- Leaderboard frontend (DG-05) - INDEPENDIENTE
- Integration dashboard (DG-01) - DEPENDE DE DG-04 + DG-05

PLAN:
Fase 1 (Paralela):
  - Agente DG-04 (leaderboard-backend)
  - Agente DG-05 (leaderboard-ui)

Fase 2 (Secuencial):
  - Agente DG-01 (dashboard-student) - después de Fase 1

EJECUCIÓN:
┌─────────────────┐
│    DG-04        │
│  (backend)      │
└────────┬────────┘
         │ (output comprimido)
         ▼
┌─────────────────┐
│    DG-01        │
│  (integration)  │
└────────┬────────┘
         │
         ▼
    [QG Audit]
    [Merge]
```

**Implementación:**

```python
# Arquitecto genera plan
plan = {
    "phases": [
        {
            "num": 1,
            "parallel": True,
            "agents": ["DG-04", "DG-05"],
            "description": "Crear backend + UI en paralelo"
        },
        {
            "num": 2,
            "parallel": False,
            "agents": ["DG-01"],
            "depends_on": [1],
            "description": "Integrar en dashboard después de fase 1"
        }
    ]
}

# Lanzar Fase 1
spawn_agent("DG-04", task="Agregar endpoint /leaderboard")
spawn_agent("DG-05", task="Crear componente Leaderboard")

# Esperar a que ambas terminen QG
wait_for_qg_verdicts([DG-04, DG-05], expected="APPROVE")

# Lanzar Fase 2 (con output comprimido de Fase 1)
spawn_agent("DG-01",
    task="Integrar leaderboard",
    context=compress_outputs([DG-04.output, DG-05.output])
)
```

---

### PATRÓN 2: Cadena Secuencial (Pipeline)

**Uso:** Tareas donde salida de una = entrada de la siguiente.

```yaml
SOLICITUD: "Extraer datos, analizar y generar reporte"

TAREAS:
1. Extracción (SearchAgent)
2. Análisis (AnalysisAgent)
3. Síntesis (SynthesisAgent)
4. Reportería (ReportAgent)

CADA tarea DEPENDE de la anterior.

WORKFLOW:
[T1 Extract] → [QG] → [MERGE] → [T2 Analyze] → [QG] → [MERGE]
   ↓                                  ↓
[compressed output]          [uses T1 compressed]
                                      ↓
                           [T3 Synthesize] → [QG] → [MERGE]
                                              ↓
                           [T4 Report] → [QG] → [MERGE]
```

**Compresión entre Pasos:**

```python
# Paso 1: Extracción genera 25K tokens
step1_output = execute_agent("SearchAgent", task="extract data")
# Output: 25K tokens de datos crudos

# Paso 2: Comprimir para siguiente agente
compressed = compress(step1_output, target=3000)
# Resultado: resumen 3K tokens (datos clave + estructura)

# Paso 3: Pasar a siguiente agente
step2_input = f"""
PREVIOUS_EXTRACTION:
{compressed}

Now analyze the above data...
"""

step2_output = execute_agent("AnalysisAgent", task=step2_input)

# Paso 4: Repetir para siguiente
compressed_2 = compress(step2_output, target=2000)
step3_input = f"""
PREVIOUS_ANALYSIS:
{compressed_2}

Now synthesize...
"""
```

**Presupuesto de Tokens:**

```
Total disponible: 200K
Sistema overhead: 45K
Útiles: 155K

Distribución por fase (155K total):
├── Fase 1 (Extracción):  50K (entrada 30K + trabajo 20K)
├── Fase 2 (Análisis):    40K (entrada comprimido 3K + trabajo 37K)
├── Fase 3 (Síntesis):    30K (entrada 2K + trabajo 28K)
└── Fase 4 (Reportería):  35K (entrada 2K + trabajo 33K)
```

---

### PATRÓN 3: Hub-and-Spoke (Arquitecto Orquesta)

**Uso:** Un agente central (Hub) coordina múltiples agentes especializados.

```yaml
SOLICITUD: "Revisar solicitud de préstamo: datos, verificar fraude, evaluar riesgo"

ARQUITECTURA:
                    ┌─────────────┐
                    │  ARCHITECT  │
                    │  (XX-01)    │
                    └─────┬───────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
    ┌────────┐      ┌────────┐      ┌────────┐
    │ DATA   │      │ FRAUD  │      │ RISK   │
    │AGENT   │      │AGENT   │      │AGENT   │
    └────┬───┘      └────┬───┘      └────┬───┘
         │                │                │
         └────────────────┼────────────────┘
                          │ (3 outputs)
                          ▼
                    ┌─────────────┐
                    │ SYNTHESIZE  │
                    │ (Architect) │
                    └─────────────┘

FLUJO:
1. Arquitecto recibe solicitud
2. Arquitecto analiza: necesita 3 perspectivas
3. Arquitecto selecciona 3 agentes especializados
4. Arquitecto lanza 3 agentes EN PARALELO
5. Cada agente trabaja en su zona
6. Arquitecto comprime los 3 outputs
7. Arquitecto sintetiza reporte final
```

**Implementación:**

```python
# PASO 1: Arquitecto analiza
request = "Revisar solicitud de préstamo: ..."
specialists = architect_select_specialists(request)
# Retorna: [DataAgent, FraudAgent, RiskAgent]

# PASO 2: Lanzar en paralelo
outputs = {}
for agent in specialists:
    outputs[agent.id] = spawn_agent(
        agent.id,
        task=request,
        focus=agent.specialty
    )
# Esperar a que todas terminen QG

# PASO 3: Comprimir outputs
compressed = {}
for agent_id, output in outputs.items():
    compressed[agent_id] = compress(
        output,
        target=2000  # 2K tokens cada una
    )

# PASO 4: Sintetizar
synthesis = """
DATA_PERSPECTIVE:
{compressed['DataAgent']}

FRAUD_PERSPECTIVE:
{compressed['FraudAgent']}

RISK_PERSPECTIVE:
{compressed['RiskAgent']}

Now synthesize into final recommendation...
"""

final_report = architect_synthesize(synthesis)
```

**Ventajas:**
- Paralelización natural: 3 agentes trabajan simultáneamente
- Especialización: cada uno tiene expertise
- Síntesis: Arquitecto integra perspectivas
- Máxima eficiencia de tiempo

---

### PATRÓN 4: Wave Execution (Para Planes Macro)

**Uso:** Planes grandes (10+ pasos) divididos en "waves" de ejecución.

```yaml
SOLICITUD: Plan de implementación de feature grande:
"Rediseñar sistema de gamificación (XP, badges, leaderboard, streaks)"

BREAKDOWN:
Wave 1 (Backend Infrastructure): 3 agentes
  - Setup XP tables + APIs
  - Setup badges table + API
  - Setup leaderboard API

Wave 2 (Frontend Components): 3 agentes
  - XP display component
  - Badge showcase component
  - Leaderboard component

Wave 3 (Integration): 2 agentes
  - Dashboard integration
  - Study session integration

Wave 4 (QA): 1 agente
  - Testing + validation

EJECUCIÓN:
Wave 1 (Paralela) → [QG audit all] → [Merge all]
    ↓
Wave 2 (Paralela) → [QG audit all] → [Merge all]
    ↓
Wave 3 (Paralela) → [QG audit all] → [Merge all]
    ↓
Wave 4 (Sequential) → [QG audit] → [Merge]

MEMORIA COMPACTION:
Entre Wave 1 y 2: Comprimir outputs de Wave 1 a ~5K (3 agentes × 1.5K)
Entre Wave 2 y 3: Comprimir outputs de Wave 2 a ~3K (2 agentes × 1.5K)
Entre Wave 3 y 4: Pasar contexto completo de Wave 3
```

**Algoritmo de Wave:**

```python
def execute_wave_plan(plan):
    """
    Ejecutar plan en waves, respetando:
    - Máximo 20 agentes paralelos
    - Compaction entre waves
    - QG audit para cada wave
    """

    for wave_num, wave in enumerate(plan["waves"]):
        print(f"\n=== WAVE {wave_num + 1} ===")

        # Paso 1: Lanzar todos los agentes de la wave
        results = {}
        for agent_id in wave["agents"]:
            previous_context = compress_prior_waves(wave_num)
            results[agent_id] = spawn_agent(
                agent_id,
                task=wave["task"],
                context=previous_context
            )

        # Paso 2: Esperar QG audit
        verdicts = wait_for_qg_all(wave["agents"])

        # Paso 3: Verificar que todos pasen
        if any(v == "BLOCK" for v in verdicts.values()):
            print(f"Wave {wave_num + 1} BLOCKED. Stopping.")
            return False

        # Paso 4: Merge en orden (si hay dependencias)
        for agent_id in wave["agents"]:
            if verdicts[agent_id] in ["APPROVE", "NEEDS_FIX"]:
                merge_agent_branch(agent_id)

        # Paso 5: Comprimir outputs para siguiente wave
        wave_outputs = {id: results[id].output for id in wave["agents"]}
        compressed = compress_outputs(wave_outputs, target=5000)
        store_compressed_context(wave_num, compressed)

        print(f"Wave {wave_num + 1}: {len(wave['agents'])} agents, all approved")

    return True

# Uso:
plan = {
    "waves": [
        {"num": 1, "agents": ["DG-04", "DG-05", "DG-06"], "task": "..."},
        {"num": 2, "agents": ["DG-03", "DG-01"], "task": "..."},
        {"num": 3, "agents": ["XX-02"], "task": "Final QA"}
    ]
}

execute_wave_plan(plan)
```

**Compaction Automática Entre Waves:**

```
Wave 1: 3 agentes × 8K output cada uno = 24K tokens
  ↓
Comprimir a: 5K tokens (resumen de Wave 1)
  ↓
Wave 2: Recibe 5K + su propio contexto
  ↓
Total eficiente: Sin degradación, sin overflow
```

---

## ALGORITMO DE RESOLUCIÓN DE DEPENDENCIAS

```python
def resolve_dependencies(agents_list):
    """
    Dado: Lista de agentes con DEPENDE_DE
    Retorna: Fases de ejecución (qué corre en paralela, qué secuencial)
    """

    # Paso 1: Construir grafo de dependencias
    graph = build_dependency_graph(agents_list)

    # Paso 2: Detectar ciclos (error si existen)
    if has_cycle(graph):
        raise CyclicDependencyError("Dependencias circulares detectadas")

    # Paso 3: Topological sort → fases
    phases = topological_sort_to_phases(graph)

    # Paso 4: Validar constraints
    for phase in phases:
        if len(phase) > 20:
            raise TooManyParallelAgents(
                f"Fase tiene {len(phase)} agentes, max 20"
            )

    return phases

# Ejemplo
agents = [
    {"id": "DG-04", "depends_on": []},
    {"id": "DG-05", "depends_on": ["DG-04"]},
    {"id": "DG-01", "depends_on": ["DG-04", "DG-05"]},
]

phases = resolve_dependencies(agents)
# Retorna:
# [
#   Phase 1: [DG-04]
#   Phase 2: [DG-05]
#   Phase 3: [DG-01]
# ]
```

---

## LÍMITE: 20 AGENTES PARALELOS

**Restricción:** Máximo 20 agentes ejecutándose en paralelo.

**Razón:**
- Token overhead por agente: ~2-3K
- 20 × 3K = 60K overhead
- 200K total - 60K overhead = 140K útiles (aún viable)
- 21+ agentes → degradación severa

**Si plan requiere >20 agentes paralelos:**

```python
# NUNCA hacer esto:
spawn_agents([ag1, ag2, ..., ag30])  # ❌ Falla

# HACER esto:
# Opción 1: Dividir en waves
wave_1 = [ag1, ag2, ..., ag20]
wave_2 = [ag21, ag22, ..., ag30]

execute_phase(wave_1)  # Esperar merge
execute_phase(wave_2)  # Luego este

# Opción 2: Reducir número de agentes (consolidar tareas)
```

---

## INTEGRACIÓN CON QUALITY GATE ENTRE EQUIPOS

**Flujo:**

```
Fase 1: 5 agentes en paralelo
   │
   └─→ QG audita A
   └─→ QG audita B
   └─→ QG audita C
   └─→ QG audita D
   └─→ QG audita E

Si todos APPROVE:
   └─→ Merge todos
   └─→ Siguiente fase

Si alguno NEEDS_FIX:
   └─→ Agent específico arregla
   └─→ Re-ejecuta
   └─→ QG audita nuevamente

Si alguno BLOCK:
   └─→ STOP fase
   └─→ Escalar a Arquitecto
   └─→ Resolver conflicto
```

**Implementación:**

```python
def execute_phase_with_qg(agents, task):
    # Lanzar todos
    results = {id: spawn_agent(id, task) for id in agents}

    # QG audita todos EN PARALELO
    verdicts = {}
    for agent_id in agents:
        verdicts[agent_id] = qg_audit_async(agent_id, results[agent_id])

    # Clasificar
    approved = [id for id, v in verdicts.items() if v == "APPROVE"]
    needs_fix = [id for id, v in verdicts.items() if v == "NEEDS_FIX"]
    blocked = [id for id, v in verdicts.items() if v == "BLOCK"]

    # Procesar
    for agent_id in approved:
        merge_agent(agent_id)

    for agent_id in needs_fix:
        # Agent reintenta automáticamente
        spawn_agent(agent_id, task, fix_mode=True)

    if blocked:
        escalate_to_architect(blocked, verdicts)
        return False

    return True
```

---

## PATRÓN: POST-MORTEM (Después de Todas las Fases)

**Cuándo:** Después de que última fase termina y todos los agentes finalizaron.

```python
def post_mortem(session):
    """
    Arquitecto genera reporte final de sesión.
    """

    report = {
        "session_id": session.id,
        "date": datetime.now(),

        "execution": {
            "agents_executed": len(session.agents),
            "files_modified": count_modified_files(session),
            "branches_merged": len(session.merged_branches),
            "total_lines_added": sum_additions(session),
            "total_lines_removed": sum_deletions(session),
        },

        "quality": {
            "qg_pass_rate": count_approve(session) / len(session.agents),
            "scope_creep_incidents": count_scope_violations(session),
            "merge_conflicts": count_conflicts(session),
            "security_issues": count_security_blocks(session),
        },

        "learning": {
            "lessons_registered": count_lessons(session),
            "repeated_errors": count_repeat_issues(session),
            "new_patterns": extract_new_patterns(session),
        },

        "metrics_update": {
            "update_agent_metrics": True,
            "update_section_health": True,
            "update_error_ledger": True,
        }
    }

    # Guardar en AGENT-METRICS.md
    update_metrics_file(report)

    return report

# Ejecutar post-mortem
mortem = post_mortem(current_session)
print(f"""
╔════════════════════════════════════════╗
║       SESSION POST-MORTEM REPORT       ║
╚════════════════════════════════════════╝

Agents Executed: {mortem['execution']['agents_executed']}
Files Modified: {mortem['execution']['files_modified']}
Branches Merged: {mortem['execution']['branches_merged']}

QG Pass Rate: {mortem['quality']['qg_pass_rate']:.1%}
Scope Creep Incidents: {mortem['quality']['scope_creep_incidents']}

Lessons Registered: {mortem['learning']['lessons_registered']}

Status: SUCCESS ✓
""")
```

---

## MATRIZ DE SELECCIÓN: CUÁL PATRÓN USAR

| Situación | Patrón | Razón | Ejemplo |
|-----------|--------|-------|---------|
| 2-3 tareas independientes | Paralelo Simple | Simple, rápido | Agregar 2 features a la vez |
| 5+ tareas secuenciales | Pipeline | Eficiente, compresión | Extract → Analyze → Report |
| 1 task necesita múltiples perspectivas | Hub-and-Spoke | Paraleliza análisis | Revisar solicitud desde 3 ángulos |
| 10+ tareas, plan grande | Wave Execution | Maneja escala | Redesign gamification system |
| Plan ambiguo, necesita clarificación | Hub + Extended Thinking | Desambigüa primero | Plan requiere exploración |

---

## CONCLUSIÓN: Principios de Orquestación

1. **Paralelizar cuando sea posible** → Máximo ~20 agentes
2. **Comprimir entre fases** → No dejar contexto crecer
3. **Auditar después de cada wave** → QG no es opcional
4. **Escalar conflictos** → No resolver entre agentes
5. **Aprender y mejorar** → Cada sesión → métricas → siguiente sesión

**Aplicación:** Usar estos patrones en AXON para coordinar equipos de agentes especializados con máxima eficiencia y mínimos errores.

