---
name: crearresumen
description: "Genera resúmenes médicos educativos para Axon usando el sistema de bloques (summary_blocks). Dispara SIEMPRE que el usuario mencione: crear resumen, generar resumen, insertar resumen, nuevo resumen, 'resumen de [tema]', 'bloque de resumen', producir contenido educativo, o cualquier referencia a crear contenido de estudio médico para la plataforma Axon. También activa cuando se menciona editar o mejorar resúmenes existentes, o agregar bloques a un resumen."
---

# Producción de Resúmenes Médicos — Axon

## Qué hace este skill

Genera resúmenes médicos educativos estructurados en bloques para la plataforma Axon. Cada resumen se compone de bloques tipados (`prose`, `key_point`, `stages`, `comparison`, `list_detail`, `grid`, `two_column`, `callout`, `image_reference`, `section_divider`) que se insertan en la tabla `summary_blocks` de Supabase y se renderizan en el frontend con componentes React especializados.

El proceso sigue 6 fases pedagógicas que transforman material fuente en contenido de estudio optimizado para retención.

## Principio Rector

> El bloque NO se elige por variedad visual. Se elige porque la **naturaleza del contenido** lo exige.
> Un resumen con 6 bloques bien elegidos es superior a uno con 15 bloques forzados.

Los tipos de bloque **se pueden y deben repetir** cuando el contenido lo requiere. Si un tema tiene 5 subtemas narrativos, se usan 5 bloques `prose`. La variedad visual es consecuencia natural del contenido diverso, no un objetivo.

---

## Antes de empezar

1. **Identificar el material fuente.** Puede venir de: un archivo subido (.pdf, .docx, .txt), texto pegado en el chat, o un tema que el usuario pide investigar.
2. **Identificar el área médica** para elegir el template de referencia adecuado (patología, fisiología, anatomía, farmacología). Leer el template desde `references/templates/` de esta skill.
3. **Identificar el destino.** El usuario querrá:
   - **Solo el JSON** (para revisión antes de insertar)
   - **Insertar directo en Supabase** via MCP (proyecto `xdnciktarvxyhkrokbng`)
   - **Ambos** (generar JSON + insertar)

---

## Las 6 Fases

### Fase 1: Análisis del Contenido Fuente

Antes de crear cualquier bloque, responder estas preguntas sobre el material:

**1. ¿Cuáles son los subtemas reales?** Listar cada concepto o sección del material fuente.

**2. ¿Qué naturaleza tiene cada subtema?** Clasificar:
- Narrativo/explicativo → necesita párrafos
- Secuencial → tiene orden temporal o lógico estricto
- Comparativo → dos o más cosas que se diferencian
- Enumerativo → lista de items independientes
- Conceptual-clave → idea central que da sentido a todo
- Referencia rápida → datos discretos para consultar
- Tip de examen/clínica/memoria

**3. ¿Cuál es la jerarquía?**
- Lo que el alumno DEBE saber (core)
- Lo que DEBERÍA saber (importante)
- Lo que es ÚTIL saber (complementario)

### Fase 2: Mapeo Contenido → Tipo de Bloque

Leer `references/block-types.md` para la guía completa de decisión. Resumen rápido:

| Naturaleza del contenido | Bloque recomendado |
|---|---|
| Narrativo, explicativo, contexto | `prose` |
| Concepto central / "aha moment" | `key_point` (máx 1-2) |
| Proceso secuencial estricto | `stages` |
| 2+ entidades que se confunden | `comparison` |
| Items con label + detalle | `list_detail` |
| Dicotomía natural (2 categorías) | `two_column` |
| 4+ items cortos panorámicos | `grid` |
| Tip, mnemotecnia, correlación clínica | `callout` (máx 2-3) |
| Diagrama o esquema necesario | `image_reference` |
| Separación entre secciones grandes | `section_divider` |

### Fase 3: Estructura y Flujo Pedagógico

El orden sigue un flujo cognitivo: **abstracto → concreto → aplicado → memorable**.

```
1. CONTEXTO      → ¿Qué es y por qué importa?     → prose / key_point
2. VISIÓN MACRO  → ¿Cuál es el panorama general?    → stages / two_column / grid
3. PROFUNDIDAD   → Detalles técnicos importantes     → list_detail / comparison / prose
4. INTEGRACIÓN   → ¿Cómo se conecta con la clínica? → callout (clinical/exam)
5. MEMORIA       → ¿Cómo lo retengo?                → callout (mnemonic)
```

**Reglas de flujo (estas reglas son ESTRICTAS — violarlas es un error):**
- NUNCA empezar con `callout` o `grid` — el alumno necesita contexto primero
- NUNCA poner dos `callout` consecutivos — SIEMPRE insertar al menos un bloque de contenido sustancial (prose, list_detail, comparison, stages, etc.) entre cada par de callouts. Esto es crítico porque los callouts son "pausas" en el flujo — dos seguidos rompen el ritmo de lectura
- El ÚLTIMO bloque del resumen NUNCA debe ser `prose` — el cierre debe ser memorable. Terminar con `callout (mnemonic)`, `callout (exam)`, o `callout (clinical)`. La razón: el efecto de recencia hace que el estudiante recuerde mejor lo último que lee, y un callout memorable aprovecha esto
- `key_point` va después del prose introductorio O después de un bloque técnico complejo

**Checklist de flujo (verificar ANTES de finalizar):**
1. ¿El primer bloque es prose o key_point? ✓
2. ¿Hay algún par de callouts consecutivos? Si sí, insertar bloque entre ellos
3. ¿El último bloque es callout (mnemonic/exam/clinical)? Si no, mover o agregar uno al final

### Fase 4: Keywords

Crear keywords para términos que cumplan TODOS estos criterios:
1. Es un **término técnico** que el alumno debe dominar
2. Aparece en **múltiples bloques** o tiene relevancia transversal
3. Su definición no es obvia y beneficia de un popover explicativo
4. Es probable **pregunta de examen**

**NO crear keyword para:** términos comunes (dosis, paciente, tratamiento), términos que aparecen una sola vez y se explican in-situ, abreviaturas que ya se aclaran.

**Cantidad:** 5-10 por tema. Más de 12 indica inflación de keywords.

Los keywords se referencian en el texto como `{{keyword_uuid}}`. El frontend los parsea con `renderTextWithKeywords()` y los convierte en `<KeywordChip>` interactivos con popover.

### Fase 5: Quiz

Una pregunta por concepto clave, no por bloque. Criterios:
- Si un bloque tiene 3 ideas importantes, puede tener 3 preguntas
- Si un bloque es puro contexto, puede no tener quiz
- Opciones incorrectas deben ser **distractores plausibles**, no absurdos
- Priorizar **comprensión** sobre memorización pura
- El `correct` index debe variar (no siempre opción 1)

### Fase 6: Validación

Antes de finalizar, verificar:
- [ ] ¿Cada bloque tiene una razón de existir?
- [ ] ¿El flujo sigue contexto → macro → profundidad → integración → memoria?
- [ ] ¿Los keywords son realmente términos técnicos transversales?
- [ ] ¿Las preguntas de quiz evalúan los conceptos más importantes?
- [ ] ¿No hay bloques redundantes?
- [ ] ¿El resumen se puede leer de inicio a fin con coherencia narrativa?

---

## Referencia Técnica — Base de Datos

> **CRITICAL:** Los bloques van en `summary_blocks`, NUNCA en `chunks`.

| Tabla | Propósito |
|---|---|
| `summary_blocks` | UI de bloques (SummaryViewer/ViewerBlock). **ESTA es la tabla correcta.** |
| `chunks` | Embeddings/RAG pipeline. Auto-generada. NO tocar para UI. |
| `keywords` | Términos clave con definición. Referenciados como `{{uuid}}` en content. |
| `summaries` | Metadata del resumen (título, status). FK parent. |

### INSERT en summary_blocks

```sql
INSERT INTO summary_blocks (summary_id, type, content, order_index, is_active, created_by, metadata)
VALUES (
  '<summary_uuid>',
  'prose',                                    -- type: TEXT column
  '{"title": "Mi título", "content": "Texto con {{kw_uuid}} refs"}'::jsonb,  -- content: JSONB
  0,                                          -- order_index: display order
  true,                                       -- is_active
  '<user_uuid>',                              -- created_by (FK profiles.id)
  '{}'::jsonb                                 -- metadata
);
```

Para el schema completo de content JSONB por tipo de bloque, leer `references/block-content-schema.md`.

### INSERT en keywords

```sql
INSERT INTO keywords (summary_id, name, definition, priority, created_by, is_active)
VALUES (
  '<summary_uuid>',
  'Término',
  'Definición del término...',
  1,                          -- priority: INTEGER NOT NULL
  '<user_uuid>',
  true
);
```

### Supabase MCP

Para insertar directamente, usar el MCP de Supabase con `execute_sql`:
- **Project ID:** `xdnciktarvxyhkrokbng`
- Ejecutar cada INSERT como SQL individual
- Primero verificar que el summary_id existe en `summaries`
- Después de insertar keywords, obtener sus UUIDs para referenciarlos en bloques con `{{uuid}}`

**Flujo de inserción:**
1. Verificar/crear el summary en `summaries`
2. Insertar keywords → obtener UUIDs
3. Insertar bloques en `summary_blocks` con `{{keyword_uuid}}` en el content
4. Verificar con SELECT que todo se insertó

---

## Anti-patrones (qué NO hacer)

1. **"Block stuffing"** — usar todos los tipos solo para variedad
2. **"Prose dump"** — poner todo en prose porque es más fácil
3. **"Grid everything"** — comprimir contenido que necesita explicación en grids telegráficos
4. **"Callout spam"** — 4+ callouts que interrumpen el flujo
5. **"Keyword inflation"** — marcar como keyword cada término técnico
6. **"Copy-paste académico"** — copiar verbatim del fuente sin reestructurar

---

## Output Format

El output principal es un JSON con esta estructura:

```json
{
  "meta": { "topic": "...", "area": "...", "difficulty": "...", ... },
  "keywords": { "id_1": { "term": "...", "definition": "...", "related": [...] }, ... },
  "blocks": [
    { "type": "prose", "title": "...", "content": "... {{id_1}} ..." },
    { "type": "key_point", "title": "...", "content": "...", "importance": "critical" },
    ...
  ],
  "quiz": [
    { "question": "...", "options": ["a", "b", "c", "d"], "correct": 2, "explanation": "..." },
    ...
  ]
}
```

Este JSON puede usarse para:
- Revisión humana antes de insertar
- Inserción automática via Supabase MCP
- Archivo de referencia del resumen

Para el schema completo con todos los campos por tipo, leer `references/block-content-schema.md`.

---

## Templates por Área Médica

Cada área tiene un template que sugiere secciones y bloques recomendados. Los templates son GUÍAS, no camisas de fuerza.

| Área | Template | Secciones típicas |
|---|---|---|
| Patología | `references/templates/patologia.md` | Definición → Epidemiología → Etiología → Patogénesis → Morfología → Clínica → Dx → Tx |
| Fisiología | `references/templates/fisiologia.md` | Concepto → Mecanismo → Regulación → Integración → Clínica |
| Anatomía | `references/templates/anatomia.md` | Ubicación → Relaciones → Irrigación → Inervación → Clínica |
| Farmacología | `references/templates/farmacologia.md` | Clase → Mecanismo → Farmacocinética → Indicaciones → RAM → Interacciones |

Leer el template relevante antes de empezar la Fase 1.
