---
name: agendamientocorrecto
description: Guía para crear y depurar tareas programadas (scheduled tasks) en Claude Code sin errores de permisos. Úsala siempre que vayas a crear un scheduled task nuevo, cuando un scheduled task existente pide permisos inesperados, cuando un sub-agente reporta que no tiene herramientas disponibles, o cuando quieras verificar que settings.json está configurado correctamente para el agendamiento. Cubre el patrón correcto para Bug Hunter Loop y cualquier otra tarea automatizada.
---

# Agendamiento Correcto — Guía Definitiva

Antes de crear o modificar cualquier scheduled task, este flujo evita los dos errores que se repiten:
1. **Claude pide permisos** aunque `bypassPermissions` esté activo
2. **Sub-agentes sin herramientas** — el arquitecto u otro agente reporta que solo tiene Read/Glob/Grep

---

## Por qué ocurren estos errores

Claude Code evalúa permisos así:

```
¿Está el tool en la lista `allow`?
  → Sí: ejecuta sin preguntar
  → No: muestra prompt de permiso ← AQUÍ está el problema
```

`defaultMode: bypassPermissions` NO es suficiente solo. La lista `allow` debe incluir **explícitamente** cada tool que la tarea usa. Si falta alguno, aparece el prompt.

El segundo error ocurre porque los sub-agentes spawneados por un scheduled task heredan un conjunto reducido de herramientas (solo Read/Glob/Grep por defecto). Un agente `architect` o cualquier otro **no puede re-spawnear agentes ni ejecutar Bash** desde ese contexto. La solución es que la sesión raíz (root session) ejecute las acciones en lugar de delegarlas.

---

## Checklist antes de crear un scheduled task

### 1. Verificar settings.json

Ejecuta esto para ver el estado actual:

```bash
cat ~/.claude/settings.json | python -c "
import json, sys
s = json.load(sys.stdin)
allow = s.get('permissions', {}).get('allow', [])
needed = ['Agent(*)', 'SendMessage(*)', 'TeamCreate(*)', 'TeamDelete(*)', 'TodoWrite(*)', 'TaskOutput(*)', 'Bash(*)', 'Write(*)', 'Edit(*)']
missing = [t for t in needed if t not in allow]
print('FALTANTES:', missing if missing else 'ninguno — OK')
print('MCP wildcards:', [a for a in allow if a.startswith('mcp__')])
"
```

### 2. Tools requeridos según el tipo de tarea

| La tarea usa... | Agrega a `allow` |
|----------------|-----------------|
| Agent tool | `"Agent(*)"` |
| SendMessage entre agentes | `"SendMessage(*)"` |
| TeamCreate/TeamDelete | `"TeamCreate(*)"`, `"TeamDelete(*)"` |
| Cualquier MCP server | `"mcp__NombreDelServer__*"` |
| Bash, git, npm | `"Bash(*)"` |
| Escribir archivos | `"Write(*)"`, `"Edit(*)"` |
| TodoWrite | `"TodoWrite(*)"`, `"TodoRead(*)"` |
| TaskOutput, TaskStop | `"TaskOutput(*)"`, `"TaskStop(*)"` |

### 3. Claves que deben estar en el nivel correcto

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions",
    "allow": [...]
    // ← skipDangerousModePermissionPrompt NO va aquí
  },
  "skipDangerousModePermissionPrompt": true,  ← nivel raíz ✓
  "skipAutoPermissionPrompt": true             ← nivel raíz ✓
}
```

---

## Template completo de settings.json

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions",
    "allow": [
      "Bash(*)", "Read(*)", "Write(*)", "Edit(*)",
      "Glob(*)", "Grep(*)", "WebFetch(*)", "WebSearch(*)",
      "Agent(*)", "SendMessage(*)",
      "TodoWrite(*)", "TodoRead(*)",
      "TaskOutput(*)", "TaskStop(*)",
      "TeamCreate(*)", "TeamDelete(*)",
      "ToolSearch(*)", "Skill(*)",
      "NotebookEdit(*)", "NotebookRead(*)",
      "EnterPlanMode(*)", "ExitPlanMode(*)",
      "EnterWorktree(*)", "ExitWorktree(*)",
      "CronCreate(*)", "CronDelete(*)", "CronList(*)",
      "mcp__<UUID-servidor-1>__*",
      "mcp__<UUID-servidor-2>__*"
    ]
  },
  "skipDangerousModePermissionPrompt": true,
  "skipAutoPermissionPrompt": true
}
```

Para MCP tools el formato es `"mcp__NombreOUUID__*"` — **sin paréntesis**, con `__*` para cubrir todos los tools del servidor.

---

## Limitación crítica: sub-agentes en contexto de scheduled task

Cuando un scheduled task spawna un sub-agente (por ejemplo `architect`), ese agente recibe:
- ✅ Read, Glob, Grep
- ❌ Bash, Agent, Write, Edit, TeamCreate, SendMessage

**Esto no se puede cambiar con settings.json** — es una restricción del nivel de anidamiento.

### Consecuencia

Si el SKILL.md del scheduled task dice:
> "Spawna el arquitecto → el arquitecto spawna agentes de fix → cada agente hace git commit"

Eso **no funciona**. El arquitecto reportará: *"No tengo Bash ni Agent disponibles"*.

### Solución: la sesión raíz ejecuta los fixes

```
Scheduled Task → Root Session
  ├── Spawna architect (solo para AUDIT — Read/Glob/Grep)
  │     └── architect lee código, identifica bugs, reporta
  └── Root Session recibe reporte
        └── Root Session ejecuta fixes directamente:
              Read → Edit → Bash (git commit, git push)
```

La sesión raíz SÍ tiene acceso completo. Úsala para todo lo que requiere acciones.

---

## Patrón correcto para el Bug Hunter Loop

Este es el flujo que funciona:

```
[Scheduled Task se dispara]
  │
  ▼
Root Session lee STATE.md
  │
  ├─ mode=AUDIT:
  │    Spawna architect (bypassPermissions)
  │    architect: Read/Glob/Grep → reporta errores encontrados
  │    Root Session parsea reporte
  │    Root Session actualiza STATE.md (agrega errores a ledger)
  │    Si errores >= threshold → cambia mode a FIX
  │
  └─ mode=FIX:
       Root Session lee Fix Plan de STATE.md
       Root Session ejecuta cada fix directamente:
         Read archivo → Edit archivo → Bash git add/commit
       Bash git push fix/bug-hunter
       Root Session actualiza STATE.md (marca errores como FIXED)
       Si todos fixed → mode = AUDIT
```

### Lo que NO funciona

```
Root Session spawna architect
  → architect spawna fix-agents   ← FALLA: architect no tiene Agent tool
      → fix-agents hacen git commit ← nunca llega aquí
```

---

## Cómo escribir el SKILL.md de un nuevo scheduled task

### Estructura recomendada

```markdown
[frontmatter del scheduled task]

Eres el disparador de [nombre]. Tu ÚNICA tarea es:

1. Leer [archivo de estado] para determinar qué hacer
2. Para acciones de LECTURA/AUDITORÍA: spawna sub-agente con Agent tool
3. Para acciones de ESCRITURA/FIX: ejecuta directamente (Read → Edit → Bash)
4. Actualizar [archivo de estado] con resultados

## Regla de oro
Si necesitas hacer git commit/push o editar archivos → hazlo TÚ (sesión raíz).
No delegues acciones destructivas o de escritura a sub-agentes.
```

### Señales de alerta en un SKILL.md existente

Revisa si el SKILL.md contiene patrones como estos — indican que el task fallará:

```
# Problemático — el sub-agente no puede hacer esto:
"el arquitecto lanzará agentes de fix"
"spawna un agente que ejecute git push"
"el sub-agente hará commit y push"

# Correcto — la sesión raíz lo hace:
"lee el reporte del sub-agente y aplica los fixes directamente"
"después de recibir el reporte, ejecuta los cambios con Edit y Bash"
```

---

## Diagnóstico rápido

**Síntoma:** Claude pide permiso al ejecutar el task
→ Falta algún tool en la lista `allow` de settings.json
→ Ejecuta el checklist de verificación del paso 1

**Síntoma:** Sub-agente dice "no tengo Bash/Agent disponibles"
→ Es la limitación de anidamiento — no se puede resolver con settings.json
→ Rediseña el SKILL.md para que la sesión raíz ejecute esas acciones

**Síntoma:** `skipDangerousModePermissionPrompt` no surte efecto
→ Verifica que esté en el nivel raíz del JSON, no dentro de `"permissions": {}`

**Síntoma:** MCP tools piden permiso
→ El formato correcto es `"mcp__NombreServer__*"` sin paréntesis
→ Agrégalo a la lista `allow`
