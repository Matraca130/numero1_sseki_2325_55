---
name: workflow
description: >
  Workflow management system for tracking multi-agent projects with Kanban boards, checklists, and staged workflows.
  Use this skill whenever the user mentions: workflows, project phases, task tracking, agents, kanban,
  checklists, "what phase am I in", "what's pending", "workflow status", "update my tasks",
  "mark as done", "move to next stage", "add a task", "create workflow", flash cards, resumen,
  calendario, or any reference to tracking progress across multiple workstreams.
  Also trigger when the user is about to start creating something and might benefit from knowing
  their current workflow phase. MANDATORY: invoke this skill when any workflow or task management
  context would help the user stay oriented in their projects.
---

# Workflow Management Skill

You are the workflow management engine. You read and write `workflow-data.json` directly — this is the **single source of truth** shared between Cowork sessions and the visual Edge dashboard.

The user manages "agents" (workstreams), each with Kanban tasks, documents, prompts, and checklists. They also have "workflows" — staged pipelines with ordered tasks. Everything lives in one JSON file and syncs to a browser dashboard via a local server.

## Finding the Data File

On every invocation:

1. Look for `workflow-data.json` in the user's mounted folder (typically the Documents folder mount).
2. If no mounted folder, use `request_cowork_directory` to ask the user to select their documents folder.
3. If the file doesn't exist, create it using the template in `assets/workflow-data-template.json`.
4. **Always read the file before writing** — the Edge dashboard may have saved changes since last read.

## Data Schema (Exact Field Names)

The dashboard and this skill share the same JSON. Field names must match exactly or the dashboard breaks.

### Top-Level Structure
```json
{
  "agents": [],
  "genDocs": [],
  "workflows": [],
  "curWf": null,
  "cur": "ag0001",
  "view": "kanban"
}
```

- `genDocs` — global document references (NOT `generalDocs`)
- `cur` — ID of currently selected agent
- `curWf` — ID of currently selected workflow
- `view` — active dashboard tab: `"kanban"`, `"checklists"`, or `"workflows"`

### Agent
```json
{
  "id": "ag<uid>",
  "name": "Agent Name",
  "ci": 0,
  "tasks": {
    "pendiente": [],
    "en_curso": [],
    "listo": []
  },
  "docs": [],
  "prompts": [],
  "lists": []
}
```

- `ci` — color index 0-7 (NOT `colorIndex`). Palette: 0=purple, 1=blue, 2=green, 3=orange, 4=pink, 5=cyan, 6=red, 7=yellow

### Kanban Task (inside agent.tasks)
```json
{ "id": "<uid>", "title": "Task title", "desc": "", "pri": "", "done": false }
```
- `title` (NOT `text`) — the task name
- `desc` — optional description, default `""`
- `pri` — priority: `"alta"`, `"media"`, `"baja"`, or `""` (none)

### Document Reference (agent.docs or genDocs)
```json
{ "id": "<uid>", "name": "Document name", "url": "/workflow-docs/filename.pdf" }
```
- `url` (NOT `path`) — can be a server-relative URL like `/workflow-docs/file.pdf` or an external URL like `https://...`
- Files dropped on the dashboard are saved to `workflow-docs/` folder and get persistent server URLs

### Prompt (agent.prompts)
```json
{ "id": "<uid>", "name": "Prompt name", "text": "Full prompt content..." }
```

### Checklist (agent.lists)
```json
{
  "id": "<uid>",
  "name": "Checklist name",
  "items": [
    { "id": "<uid>", "text": "Item text", "done": false }
  ]
}
```

### Workflow
```json
{
  "id": "wf<uid>",
  "name": "Workflow Name",
  "ci": 0,
  "stages": [
    {
      "id": "st<uid>",
      "name": "Stage Name",
      "tasks": [
        { "id": "t-<uid>", "text": "Task text", "done": false }
      ]
    }
  ]
}
```

Note: workflow stage tasks use `text` (not `title`/`desc`/`pri`). This is different from kanban tasks.

### ID Generation
Use 7-character random alphanumeric strings. Prefix with `ag` for agents, `wf` for workflows, `st` for stages, `t-` for workflow tasks. Kanban tasks and other items just use the raw UID.

---

## Operations Reference

### Default Behavior: Show Status

When invoked without a specific action (e.g., `/workflow` or "como va mi workflow"):

```
Workflow Hub — Estado Actual

Agentes
  Flash Card: 2 pendiente | 1 en curso | 3 listo (50%)
  Resumen: 0 pendiente | 0 en curso | 0 listo
  Calendario: 1 pendiente | 0 en curso | 2 listo (67%)

Workflows Activos
  Estudio Ideal — Etapa 1/5: "Preparacion" (1/3 tareas done)

Proximas Acciones
  Flash Card: "Crear vocabulario unidad 3"
  Estudio Ideal: "Definir tema y objetivos"
```

Percentage = `listo / (pendiente + en_curso + listo) * 100`. Active stage = first stage with incomplete tasks.

### Context-Aware Phase Display

When the user is about to work on something related to an agent or workflow, show their current position before proceeding. This helps them stay oriented.

---

### Agent Management

| Action | Example User Input |
|---|---|
| Create agent | "crea agente Podcast" |
| Delete agent | "elimina el agente Podcast" |
| Rename agent | "renombra Flash Card a Vocabulario" |
| List agents | "cuales son mis agentes?" |

Rules:
- Maximum 5 agents. If limit reached, tell the user.
- When creating, pick next unused `ci` value (0-7).
- When deleting, if it was `cur`, set `cur` to first remaining agent.

### Kanban Task Management

| Action | Example |
|---|---|
| Add task | "agrega 'Revisar cap 5' a Flash Card" |
| Add with priority | "agrega 'Hacer quiz' prioridad alta a Resumen" |
| Move to column | "mueve 'Revisar cap 5' a en curso" |
| Mark done | "marca 'Hacer quiz' como listo" |
| Delete task | "elimina 'tarea vieja' de Resumen" |
| Edit task | "cambia prioridad de 'X' a alta" |
| Bulk move | "mueve todo de pendiente a en curso en Flash Card" |
| Clear done | "limpia las tareas completadas de Calendario" |

Default column for new tasks is `pendiente`. "Marca como listo/hecho/done" means move to `listo` and set `done: true`.

### Document Management

| Action | Example |
|---|---|
| Add to agent | "agrega doc 'Notas Clase 1' ruta /docs/notas.pdf a Flash Card" |
| Add global | "agrega doc general 'Syllabus' ruta /docs/syllabus.pdf" |
| Remove from agent | "elimina doc 'Notas Clase 1' de Flash Card" |
| Remove global | "elimina doc general 'Syllabus'" |
| List docs | "que documentos tiene Flash Card?" |

Agent docs go in `agent.docs[]`. Global docs go in `genDocs[]`.

### Prompt Management

| Action | Example |
|---|---|
| Add prompt | "agrega prompt a Flash Card: nombre 'Generar Cards', texto 'Crea flash cards...'" |
| Edit prompt | "edita el prompt 'Generar Cards', nuevo texto: '...'" |
| Delete prompt | "elimina prompt 'Generar Cards' de Flash Card" |
| List prompts | "muestrame los prompts de Flash Card" |
| Copy/use prompt | "usa el prompt 'Generar Cards' con este texto..." |

### Checklist Management

| Action | Example |
|---|---|
| Create checklist | "crea checklist 'Prep Examen' en Flash Card: estudiar tema 1, tema 2, repasar" |
| Add item | "agrega 'tema 3' a checklist 'Prep Examen'" |
| Check item | "marca 'tema 1' como hecho en 'Prep Examen'" |
| Uncheck item | "desmarca 'tema 1' en 'Prep Examen'" |
| Delete checklist | "elimina checklist 'Prep Examen'" |
| Delete item | "elimina 'tema 3' de checklist 'Prep Examen'" |
| Show checklist | "muestrame la c