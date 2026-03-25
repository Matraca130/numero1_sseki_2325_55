# Sección para agregar al CLAUDE.md del repo de código

> Copiar y pegar esto al final del CLAUDE.md de `numero1_sseki_2325_55`

---

## Sistema Multi-Agente (70 agentes especializados)

Para tareas complejas, AXON tiene un sistema de 70 agentes especializados con memoria individual, métricas, y auto-mejora.

### Archivos de referencia (en repo `axon-docs`)

| Archivo | Qué es | Cuándo leerlo |
|---------|--------|---------------|
| `claude-config/AGENT-REGISTRY.md` | Índice de 70 agentes con ownership y dependencias | Para saber qué agente usar |
| `claude-config/agents/<nombre>.md` | Definición de cada agente (rol, zona, reglas) | Al actuar como un agente |
| `claude-config/agent-memory/individual/<ID>.md` | Memoria personal del agente (lecciones, patrones, métricas) | Al iniciar como un agente |
| `claude-config/memory/feedback_agent_isolation.md` | Reglas de aislamiento + evolución continua | SIEMPRE antes de escribir código |
| `claude-config/MULTI-AGENT-PROCEDURE.md` | Procedimiento completo del sistema | Para orquestación multi-agente |

### Cómo usar

**Tarea simple (1 agente):**
```
Actuá como [agente]. Lee tu definición en claude-config/agents/<nombre>.md
y tu memoria en claude-config/agent-memory/individual/<ID>.md.
Implementá [tarea].
```

**Tarea compleja (multi-agente):**
```
Actuá como el Arquitecto (XX-01). Lee claude-config/agents/architect.md.
Necesito [descripción de lo que quiero].
```
El Arquitecto selecciona agentes, resuelve dependencias, genera plan, y pide confirmación.

### Regla de oro

- Después de cada tarea, el agente reflexiona y actualiza su memoria individual (EVOLUCIÓN CONTINUA)
- El Quality Gate (XX-02) audita después de cada agente y auto-registra lecciones
- Los agentes leen sus lecciones previas al iniciar → no repiten errores
