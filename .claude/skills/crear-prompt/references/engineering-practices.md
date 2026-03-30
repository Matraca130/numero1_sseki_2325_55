# Prácticas de Ingeniería para Prompts de Agentes Axon

Este archivo define las prácticas de ingeniería que se inyectan en los prompts según el tipo de tarea. No todo agente necesita todas las prácticas — se seleccionan según el contexto.

## Tabla de Contenidos

1. [Testing Strategy](#testing-strategy)
2. [Architecture Decision Records](#architecture-decision-records)
3. [Code Review Estructurado](#code-review-estructurado)
4. [Debug Protocol](#debug-protocol)
5. [Documentación Técnica](#documentación-técnica)
6. [Matriz de Aplicación](#matriz-de-aplicación)

---

## Testing Strategy

### Filosofía: Test-Informed Development

Los agentes de Axon no hacen TDD dogmático, pero sí **piensan en tests antes de implementar**. Esto significa que al recibir una tarea, el agente identifica qué necesita ser verificable antes de escribir código de producción.

### Pirámide de Tests por Tipo de Agente

```
        /    E2E     \         Pocos, lentos, alta confianza
       / Integration  \        Algunos, velocidad media
      /   Unit Tests   \       Muchos, rápidos, focalizados
```

| Tipo de agente | Unit tests | Integration tests | E2E |
|----------------|-----------|-------------------|-----|
| Backend (`*-01`) | Lógica de negocio, validaciones, transformaciones | HTTP layer, DB queries, RLS policies | - |
| Frontend (`*-02`) | Hooks, utils, state logic | Componentes con interacción, formularios | Flujos críticos de usuario |
| Tests (`*-05`) | - | - | Ownership completo de la suite |
| AI/RAG (`AI-*`) | Parsing, chunking, scoring | Búsqueda vectorial, respuestas LLM | - |
| Infrastructure (`IF-*`) | Helpers, validators | Migraciones, APIs core | Smoke tests |

### Qué cubrir (por prioridad)

1. **Paths críticos de negocio** — Lo que si falla, el usuario no puede usar Axon
2. **Error handling** — Especialmente en boundaries (API ↔ DB, Frontend ↔ API)
3. **Edge cases** — Inputs vacíos, null, overflow, arrays vacíos, strings Unicode
4. **Security boundaries** — RLS policies, JWT validation, input sanitization
5. **Data integrity** — Constraints de DB, validaciones de tipos, migraciones reversibles

### Qué NO testear

- Getters/setters triviales
- Código de framework (Supabase SDK, Next.js internals)
- Scripts de un solo uso
- Estilos CSS (a menos que sean critical layout)

### Bloque XML para inyectar en prompts de agentes

```xml
<testing_strategy>
Antes de implementar, identifica qué debe ser verificable en tu cambio.

Escribe tests para:
- La lógica de negocio nueva o modificada (unit tests)
- Los boundaries que tu código toca (integration tests con DB/API)
- Edge cases: inputs vacíos, null, límites de rango, permisos insuficientes

No escribas tests para:
- Código trivial sin lógica (getters, re-exports)
- Framework internals

Ubicación de tests: junto al archivo que testean con sufijo `.test.ts` o `.test.tsx`.
Naming: `describe('{ComponenteOFunción}', () => { it('should {comportamiento esperado}') })`.

Si tu cambio modifica una query de Supabase → escribe un integration test que verifique RLS.
Si tu cambio modifica un endpoint API → escribe un test que cubra happy path + error case.
Si tu cambio modifica UI → escribe un component test que verifique rendering + interacción principal.
</testing_strategy>
```

---

## Architecture Decision Records

### Cuándo se necesita un ADR

No toda decisión técnica necesita un ADR. Se necesita cuando:
- Hay 2+ opciones viables y la decisión no es obvia
- El cambio afecta a más de un dominio
- El cambio es difícil o costoso de revertir
- Establece un precedente que otros agentes seguirán

### Formato ADR para Axon

```markdown
# ADR-{número}: {Título}

**Status:** Proposed | Accepted | Deprecated
**Date:** {fecha}
**Agent:** {ID del agente que propone}

## Contexto
{Qué situación enfrentamos y qué fuerzas están en juego}

## Opciones Consideradas

### Opción A: {nombre}
| Dimensión | Evaluación |
|-----------|------------|
| Complejidad | {Baja/Media/Alta} |
| Impacto en otros dominios | {Ninguno/Bajo/Alto} |
| Reversibilidad | {Fácil/Difícil/Irreversible} |

**Pros:** {lista}
**Cons:** {lista}

### Opción B: {nombre}
{mismo formato}

## Decisión
{Qué opción elegimos y por qué}

## Consecuencias
- {Qué se facilita}
- {Qué se dificulta}
- {Qué habrá que revisar después}
```

### Bloque XML para el Arquitecto (XX-01)

```xml
<architecture_decisions>
Cuando enfrentes una decisión técnica con 2+ opciones viables:

1. Documenta la decisión usando el formato ADR en `.claude/decisions/ADR-{número}.md`
2. Evalúa cada opción en: complejidad, impacto cross-domain, reversibilidad
3. Elige la opción más simple que cumpla los requisitos actuales
4. Documenta las consecuencias — qué se facilita y qué se dificulta

No necesitas ADR para:
- Decisiones obvias con una sola opción razonable
- Cambios fácilmente reversibles dentro de un solo dominio
- Elecciones de estilo ya cubiertas por las convenciones del proyecto
</architecture_decisions>
```

---

## Code Review Estructurado

### Dimensiones del Quality Gate Expandido

El Quality Gate (XX-02) ya verifica zone compliance y tests. Las siguientes dimensiones lo fortalecen:

#### Seguridad
- SQL injection (queries con interpolación directa)
- XSS (renderizado de HTML sin sanitizar)
- Secrets o credenciales en código
- RLS bypass (queries sin `.eq('user_id', userId)`)
- Path traversal en file uploads

#### Performance
- N+1 queries (loops con await dentro que hacen queries individuales)
- Queries sin índices en tablas grandes
- Componentes que re-renderizan sin necesidad (falta de memo/useMemo)
- Bundles innecesariamente grandes (imports de librería completa)
- Queries sin límite (`select *` sin `.limit()`)

#### Correctness
- Edge cases: inputs vacíos, null, undefined
- Race conditions en operaciones async concurrentes
- Error handling: ¿se capturan y manejan los errores de DB/API?
- Off-by-one en paginación o slicing
- Type safety: ¿los tipos de TypeScript cubren los casos reales?

#### Maintainability
- Naming: ¿los nombres de funciones/variables comunican intención?
- Single responsibility: ¿cada función hace una cosa?
- Duplicación: ¿hay lógica copiada que debería ser un shared util?
- Documentación: ¿la lógica no obvia tiene comentarios explicativos?

### Bloque XML para Quality Gate (XX-02)

```xml
<code_review_dimensions>
Al revisar el código de un agente, evalúa estas dimensiones:

SEGURIDAD:
- ¿Hay queries con string interpolation en lugar de parámetros?
- ¿Se renderea HTML del usuario sin sanitizar?
- ¿Las queries de Supabase incluyen filtro RLS donde corresponde?
- ¿Hay secrets hardcodeados?

PERFORMANCE:
- ¿Hay loops con queries individuales dentro? (N+1)
- ¿Los componentes React usan memo/useMemo donde hay renders costosos?
- ¿Las queries a DB incluyen .limit() o paginación?

CORRECTNESS:
- ¿Se manejan inputs vacíos, null, y errores de API?
- ¿Los tipos TypeScript reflejan los datos reales (incluyendo undefined)?
- ¿Hay race conditions en operaciones async?

MAINTAINABILITY:
- ¿Los nombres comunican intención?
- ¿La lógica no obvia tiene comentarios?
- ¿Hay duplicación que debería extraerse?

Reporta issues como:
- CRITICAL: bloquea merge (seguridad, data loss, crash)
- WARNING: debería arreglarse (performance, edge cases)
- SUGGESTION: mejoraría calidad (naming, docs, structure)
</code_review_dimensions>
```

---

## Debug Protocol

### Cuándo aplica

Cuando un agente encuentra un error durante su ejecución (test falla, build rompe, runtime error), sigue este protocolo antes de escalar al Arquitecto.

### Protocolo RIDE (Reproduce → Isolate → Diagnose → Execute fix)

```
Paso 1: REPRODUCE
  ¿Qué esperaba que pasara vs qué pasó?
  ¿El error es consistente o intermitente?
  ¿Qué cambié justo antes de que apareciera?

Paso 2: ISOLATE
  ¿El error está en MI código o en una dependencia/agente vecino?
  ¿Puedo reproducirlo con un test unitario aislado?
  ¿Qué archivo/función específica falla?

Paso 3: DIAGNOSE
  ¿Cuál es la causa raíz (no el síntoma)?
  ¿Es un error lógico, de tipos, de timing, o de datos?
  Hipótesis → verificar → confirmar/descartar

Paso 4: EXECUTE FIX
  Aplicar el fix más simple que resuelva la causa raíz
  Escribir un test que capture el bug (prevención de regresión)
  Verificar que no rompió nada más
```

### Bloque XML para agentes

```xml
<debug_protocol>
Si encuentras un error durante tu trabajo:

1. REPRODUCE: Identifica qué esperabas vs qué ocurrió. Lee el error completo.
2. ISOLATE: ¿Está en tu código o en una dependencia? Verifica con un test aislado.
3. DIAGNOSE: Busca la causa raíz, no el síntoma. Forma una hipótesis y verifícala.
4. FIX: Aplica la corrección más simple. Escribe un test de regresión.

Escala al Arquitecto (XX-01) solo si:
- El error está en código fuera de tu zona
- No puedes reproducirlo después de 3 intentos
- La causa raíz requiere un cambio arquitectónico
</debug_protocol>
```

---

## Documentación Técnica

### Qué documentar según el tipo de cambio

| Tipo de cambio | Documentación requerida |
|----------------|------------------------|
| Nuevo endpoint API | JSDoc con params, return type, errores posibles |
| Nueva función de negocio | Comentario inline explicando el "por qué", no el "qué" |
| Migración de DB | Comentario en el SQL explicando por qué se hace el cambio |
| Componente UI nuevo | Props documentadas con TypeScript + storybook entry si aplica |
| Cambio cross-cutting | Actualizar README de la sección afectada |
| Decisión arquitectónica | ADR (ver sección anterior) |

### Principio: Documenta el Por Qué, No el Qué

El código dice QUÉ hace. Los comentarios y docs dicen POR QUÉ se hizo así y qué alternativas se descartaron.

**Mal:**
```ts
// Incrementa el contador
counter++;
```

**Bien:**
```ts
// Usamos un contador local en lugar de un estado global porque
// este componente se desmonta frecuentemente y el estado global
// causaba memory leaks (ver ADR-012)
counter++;
```

### Bloque XML para agentes

```xml
<documentation_requirements>
Al completar tu tarea, documenta:

1. **Endpoints nuevos:** JSDoc con @param, @returns, @throws
2. **Lógica no obvia:** Comentario inline explicando POR QUÉ, no QUÉ
3. **Migraciones:** Comentario SQL explicando la razón del cambio
4. **Componentes:** Props tipadas con TypeScript (JSDoc solo si TypeScript no alcanza)

No documentes:
- Código que se explica solo (getters, setters, CRUD básico)
- Workarounds temporales sin contexto (en lugar de eso, deja un TODO con issue link)

Formato de TODOs: `// TODO({ID-agente}): {descripción} — {link a issue si existe}`
</documentation_requirements>
```

---

## Matriz de Aplicación

Esta matriz define qué prácticas se inyectan según el tipo de tarea y agente:

| Tipo de tarea | Testing | ADR | Code Review | Debug | Docs |
|---------------|---------|-----|-------------|-------|------|
| Feature nueva (backend) | unit + integration | Si hay decisión | Siempre | Si falla | endpoints + lógica |
| Feature nueva (frontend) | component + interaction | Rara vez | Siempre | Si falla | props + componente |
| Hotfix | test de regresión | No | Reducido | Siempre (es debug) | inline comment |
| Refactor | tests existentes deben pasar | Si cambia arquitectura | Siempre | Si falla | actualizar docs existentes |
| Migración DB | integration test de datos | Siempre | Siempre | Si falla | SQL comments |
| Cambio cross-cutting | todos los tests afectados | Usualmente | Siempre | Si falla | README update |
| AI/RAG | scoring tests | Si hay trade-off | Siempre | Si falla | parámetros documentados |

### Cómo usar esta matriz al generar prompts

Al generar un prompt en la Fase 3, consulta esta matriz:
1. Identifica el tipo de tarea
2. Lee la columna correspondiente
3. Incluye solo los bloques XML de las prácticas que aplican
4. No incluyas prácticas que no aplican — mantén el prompt lean

**Ejemplo:** Para un hotfix en backend, incluirías `<debug_protocol>` y `<testing_strategy>` (solo test de regresión), pero NO `<architecture_decisions>`.
