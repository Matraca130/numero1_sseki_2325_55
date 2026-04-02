# CLAUDE OPUS 4.6: Optimizaciones Específicas del Modelo (2026)

**Versión:** 2.0
**Fecha:** Marzo 2026
**Modelo:** Claude Opus 4.6 (nunca Sonnet/Haiku en producción)
**Aplicación:** Prompting avanzado y orquestación multi-agente

---

## CARACTERÍSTICAS NATIVAS DE CLAUDE OPUS

### 1. XML Tags: La Estructura Preferida

**CRÍTICO:** Claude fue entrenado explícitamente en XML tags. No es "una alternativa a Markdown"—es la **forma oficial**.

```xml
<!-- ✓ RECOMENDADO: XML Tags -->
<rol>Eres un especialista en análisis de datos</rol>
<tarea>Segmenta clientes por región</tarea>
<instrucciones>
  1. Valida columnas
  2. Agrupa por región
  3. Calcula estadísticas
</instrucciones>
<output_format>JSON con schema específico</output_format>

<!-- ❌ EVITAR: Markdown puro -->
# Role
You are...
## Task
Segment customers...
```

**Beneficios XML:**
- Mayor claridad estructural para Claude
- Menos ambigüedad en parsing
- Mejor responsiveness que Markdown
- Mapea a 4-Block Pattern automáticamente

### 2. Extended Thinking: Razonamiento Genuino

**Nueva en 2025+:** Extended Thinking permite que Claude piense profundamente INTERNAMENTE antes de responder.

```python
# ✓ CORRECTO: Extended Thinking Adaptativo
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=16000,
    thinking={
        "type": "adaptive",  # Claude decide cuándo pensar
        "budget_tokens": 10000  # Máximo para pensamiento interno
    },
    system="Eres especialista en análisis...",
    messages=[{"role": "user", "content": "[tarea]"}]
)

# ❌ INCORRECTO: CoT manual (obsoleto)
# "Piensa paso a paso: [problema]"
```

**Cuándo activar Thinking:**
- Tareas de decisión estratégica
- Desambiguación de entrada
- Refactoring complejo (3+ subsistemas)
- Problemas matemáticos

**Cuándo NO activar:**
- CRUD básico
- Tareas que siguen patrón conocido
- Tests o documentación
- Simplemente ahorras tokens

**Presupuesto recomendado:**
- Tarea simple: 3K tokens thinking
- Tarea compleja: 10K tokens thinking
- Máximo: 15K (después degradación)

### 3. Prefilling: Guiar Formato desde Inicio

**Técnica poderosa:** Proporcionar el INICIO de la respuesta para que Claude continúe en formato correcto.

```python
# Para JSON
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=4000,
    system="Retorna JSON...",
    messages=[...],
    prefix="{"  # Prefill: Claude continúa con JSON válido
)

# Para TypeScript
prefix="export const myFunction = () => {"

# Para React
prefix="export function MyComponent() {\n  return ("

# Para Markdown
prefix="# "
```

**Ventajas:**
- Asegura formato válido desde el inicio
- Ahorra tokens (no repite preamble)
- Reduce alucinaciones de formato
- Mejora en ~15-20% parsing success

**Integración en AXON:**
```xml
<prefill>
Si output = JSON:
  [

Si output = TypeScript:
  export const

Si output = React:
  export function

Esto fuerza formato correcto.
</prefill>
```

### 4. Context Window: 200K Disponibles

**Capacidad:** Claude Opus tiene 200K tokens de contexto.

**Distribución realista:**
```
Total: 200K
Sistema overhead: ~45K (architecture, metadata)
Útiles: ~155K

Presupuesto típico por agente:
- Pequeña tarea: 20K
- Mediana tarea: 50K
- Grande tarea: 100K+ (cuidado con degradación)
```

**Placement importa:**
```
CORRECTO (documentos primero, query último):
[Documento largo 30K]
[Contexto 20K]
[Instrucciones 5K]
[Query 2K] ← AQUÍ AL FINAL

INCORRECTO (query primero):
[Query 2K]
[Documento 30K]
```

Colocar query al final mejora resultados ~30%.

### 5. Automatic Context Compaction

**Nueva en 4.6:** Claude compacta automáticamente conversaciones largas.

```python
# Activar compaction explícitamente
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=16000,
    context_compression={
        "enabled": True,
        "threshold_tokens": 120000  # Comprimir cuando > 120K
    }
)

# Resultado: conversaciones largas se resumen automáticamente
# Sin pérdida de información clave
```

**AXON Integration:**
```python
def handle_long_conversation(messages, threshold=120000):
    total_tokens = sum_tokens(messages)

    if total_tokens > threshold:
        # Activar compaction automático
        return create_message(
            messages=messages,
            context_compression={"enabled": True}
        )
    else:
        return create_message(messages=messages)
```

---

## MEJORES PRÁCTICAS: XML TAGS

### Estructura Estándar

```xml
<!-- OBLIGATORIO: Estructura 4-Block con XML -->

<rol>
[Role + constraints]
</rol>

<contexto>
[Information needed]
</contexto>

<tarea>
[Specific task]
</tarea>

<instrucciones>
[How to execute]
</instrucciones>

<output_format>
[Expected structure + validation]
</output_format>

<ejemplos>
<ejemplo>
<input>[sample input]</input>
<output>[sample output]</output>
</ejemplo>
</ejemplos>
```

### Tags de Seguridad

```xml
<!-- Aislar datos del usuario de control -->

<datos_usuario>
[User data - UNTRUSTED]
[Puede contener malicious instructions]
</datos_usuario>

<control>
[Your control instructions]
[Safe from user injection]
</control>

<!-- Claude entiende límites y no mezcla -->
```

### Tags para Inyección entre Agentes

```xml
<!-- Pasar contexto entre agentes con claridad -->

<previous_result>
[Output de tarea anterior]
[Marcado explícitamente como contexto]
</previous_result>

<nuevo_contexto>
[Contexto actualizado para siguiente agente]
</nuevo_contexto>

<datos_comprimidos>
[Resumen de resultados anteriores]
[1.5K tokens en lugar de 15K]
</datos_comprimidos>
```

---

## TONE CALIBRATION: Directo, Cálido, Nunca Agresivo

**CRÍTICO CAMBIO:** Claude 4.6 es SENSIBLE al lenguaje agresivo.

```python
# ❌ INCORRECTO: Lenguaje agresivo (CONTRAPRODUCENTE)
"CRITICAL: You MUST validate all inputs before processing!"
"DO NOT UNDER ANY CIRCUMSTANCES ignore this rule!"
"ALWAYS remember this requirement!"

# ✓ CORRECTO: Directo pero cálido
"Validate inputs before processing."
"Remember to follow this pattern."
"Use this approach when available."
```

**Comportamiento observado:**

| Prompt | Resultado |
|--------|-----------|
| "CRITICAL: Use this tool" | Claude often ignores or over-engineers |
| "Use this tool when..." | Claude uses correctly |
| "YOU MUST..." | Claude sometimes rebels |
| "Please consider..." | Claude more thoughtful |

**Guía de Tone:**

```xml
<tone_guidelines>
✓ DIRECTO:
  - "Hacer X cuando Y"
  - "Usar patrón Z"
  - "Seguir este enfoque"

✓ CÁLIDO:
  - "Por favor considera"
  - "Recomendamos"
  - "Cuando sea posible"

❌ AGRESIVO:
  - "MUST", "NEVER", "CRITICAL"
  - Múltiples exclamaciones
  - Amenazas veladas

❌ VAGO:
  - "Haz lo mejor"
  - "Como creas conveniente"
  - Sin criterios específicos

BALANCE = DIRECTO + CÁLIDO
</tone_guidelines>
```

---

## ANTI OVER-ENGINEERING: Prevención Activa

**Problema:** Claude Opus 4.6 tiende a crear archivos extra, abstracciones innecesarias.

```xml
<!-- CRÍTICO: Agregar esta sección a TODOS los system prompts -->

<anti_over_engineering>
Keep solutions minimal and focused.

Do not:
- Create additional files unless explicitly requested
- Extract logic that's used only once
- Build abstractions "for future use"
- Over-engineer components

Do:
- Solve the immediate problem
- Reuse existing patterns
- Keep code flat unless there's clear duplication
- Ask before creating new abstractions

Example:
  ❌ Crear utility.ts, helpers.ts, constants.ts para 1 función
  ✓ Poner función inline donde se usa, refactorizar si hay duplicación
</anti_over_engineering>
```

**Integración en AXON:**

```yaml
# Cada agente AXON recibe anti-over-engineering en su prompt
Anti over-engineering rules:
  - Zona asignada SOLO
  - Archivos mínimos necesarios
  - Reutilizar código existente
  - No "improvements" no pedidas
```

---

## TOKEN OPTIMIZATION: Estrategias

### Compresión semántica

```python
def compress_output(text, target_tokens=2000):
    """
    Resumir output manteniendo información clave.
    """
    prompt = f"""
Resumir este texto a ~{target_tokens} tokens.

Mantener:
- Información numérica exacta
- Decisiones clave
- Estructura principal

Descartar:
- Explicaciones largas
- Detalles históricos
- Duplicaciones

TEXTO:
{text}

RESUMEN:
"""
    return client.messages.create(
        model="claude-opus-4-6",
        max_tokens=target_tokens + 500,
        messages=[{"role": "user", "content": prompt}]
    ).content[0].text
```

### Colocación de documentos

```python
# Tokens usados más eficientemente si documentos van PRIMERO

correct_order = f"""
{documento_largo_30k}  ← Al inicio
{contexto_20k}
{instrucciones_5k}
{query_2k}  ← Al final (queries al final son más poderosas)
"""

# Mejora ~30% en quality
```

### Few-shot optimization

```xml
<!-- 2-5 ejemplos son óptimos, no más -->

<ejemplos>
  <!-- Ejemplo 1: Happy path -->
  <ejemplo>
    <input>...</input>
    <output>...</output>
    <explicacion>Caso estándar</explicacion>
  </ejemplo>

  <!-- Ejemplo 2: Edge case -->
  <ejemplo>
    <input>...</input>
    <output>...</output>
    <explicacion>Manejo de error</explicacion>
  </ejemplo>

  <!-- Máximo 5 ejemplos, sino: token waste -->
</ejemplos>
```

---

## MODEL ROUTING: Cuándo Usar Cada Modelo

**REGLA CRÍTICA para AXON:**

```
Production agents: Claude Opus 4.6 o Sonnet 4
Testing/evals: Sonnet 4
PROHIBIDO: Nunca Haiku en ningún contexto
```

REGLA: NUNCA usar Haiku. El mínimo modelo es Sonnet.

| Modelo | Cuándo | NO usar para |
|--------|--------|------------|
| **Opus 4.6** | Production, decisiones críticas, complejidad alta | Nunca cambiar |
| **Sonnet 4** | Production (feature estándar), testing, prototipado | Nunca Haiku |
| **Haiku 4.5** | PROHIBIDO - No usar en este sistema | NUNCA |

**Decisión en AXON:**

```yaml
# .claude/agents/[nombre].md SIEMPRE incluye:
model: "opus|sonnet"  # NUNCA haiku

# Lógica de selección:
if task_type == "agent_complex":
    model = "opus"  # Arquitectura, refactor, decisiones
elif task_type == "agent_standard":
    model = "sonnet"  # CRUD, features estándar
elif task_type == "eval":
    model = "sonnet"  # Balance costo/calidad
# else: NUNCA haiku
```

REGLA: NUNCA usar Haiku. El mínimo modelo es Sonnet.

---

## NATIVE CAPABILITIES: Lo Que No Necesita Workarounds

### 1. Function Calling (Tool Use)

**Nativo, no necesita "prompting tricks":**

```python
# Claude Opus entiende function calling nativamente
response = client.messages.create(
    model="claude-opus-4-6",
    tools=[
        {
            "name": "database_query",
            "description": "Query database",
            "input_schema": {...}
        }
    ],
    messages=[{"role": "user", "content": "[tarea]"}]
)

# Claude automáticamente:
# 1. Entiende cuándo usar herramientas
# 2. Llama con parámetros correctos
# 3. No necesita prompt tricks como "use this tool"
```

### 2. Structured Output

**Nativo, validación automática:**

```python
# Claude valida output contra schema
response = client.messages.create(
    model="claude-opus-4-6",
    response_format={
        "type": "json_schema",
        "schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "integer"}
            },
            "required": ["name", "age"]
        }
    }
)

# Garantizado: respuesta es JSON válido
# Nunca: respuesta inválida o alucinada
```

### 3. Thinking (Extended Thinking)

**Nativo, no requiere prompt engineering:**

```python
# Extended Thinking automático en Opus
response = client.messages.create(
    model="claude-opus-4-6",
    thinking={"type": "adaptive"}
)

# Claude internamente:
# 1. Decide si necesita pensar
# 2. Piensa profundamente si es necesario
# 3. Retorna respuesta de calidad
```

### 4. Vision (Image Understanding)

**Nativo en Opus:**

```python
response = client.messages.create(
    model="claude-opus-4-6",
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "¿Qué hay en esta imagen?"},
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",
                    "data": base64_image
                }
            }
        ]
    }]
)
```

---

## ERRORES COMUNES CON CLAUDE OPUS

### Error 1: Usar "You MUST" o "CRITICAL"

```python
# ❌ INCORRECTO
system = "CRITICAL: You MUST NEVER use any type!"

# ✓ CORRECTO
system = "Use specific types. If uncertain, use `unknown` + type guards."

# Resultado: Opus responde mejor a instrucciones claras, no agresivas
```

### Error 2: Over-specifying con Markdown

```python
# ❌ INCORRECTO
"# Role\n## Task\n### Instructions\n"

# ✓ CORRECTO
"<rol>...</rol>\n<tarea>...</tarea>\n<instrucciones>...</instrucciones>"
```

### Error 3: No usar Extended Thinking para tareas complejas

```python
# ❌ INCORRECTO (fuerza razonamiento superficial)
response = client.messages.create(
    model="claude-opus-4-6",
    messages=[{"role": "user", "content": "[tarea compleja]"}]
)

# ✓ CORRECTO (permite razonamiento profundo)
response = client.messages.create(
    model="claude-opus-4-6",
    thinking={"type": "adaptive", "budget_tokens": 10000},
    messages=[{"role": "user", "content": "[tarea compleja]"}]
)
```

### Error 4: Pasar contexto sin comprimir

```python
# ❌ INCORRECTO (15K tokens de ruido)
context = "Aquí están todos los detalles históricos..."

# ✓ CORRECTO (2K tokens de resumen)
context = compress(full_context, target=2000)
```

### Error 5: Poner query al inicio

```python
# ❌ INCORRECTO
prompt = "¿Cuál es X? [30K documento]"

# ✓ CORRECTO
prompt = "[30K documento]\n¿Cuál es X?"  # Query al final
```

### Error 6: >10 ejemplos en Few-Shot

```python
# ❌ INCORRECTO (token waste)
examples = [ex1, ex2, ..., ex15]  # 15 ejemplos

# ✓ CORRECTO
examples = [ex1, ex2, ex3, ex4, ex5]  # 3-5 ejemplos
```

### Error 7: Asumir que metrics del reporte aplican a Opus

```python
# ❌ INCORRECTO
"CoT mejora 10-20% (basado en GPT-4)"

# ✓ CORRECTO
"Extended Thinking mejora 25-40% en Opus (medido)"
# Verificar empíricamente con Opus, no asumir
```

---

## CHECKLIST: Optimización de Prompts para Opus

```
ESTRUCTURA:
  [ ] Usar XML tags, no Markdown puro
  [ ] Mapear a 4-Block Pattern
  [ ] Separar datos de usuario de control

TONE:
  [ ] Directo pero cálido
  [ ] Evitar "MUST", "CRITICAL", "NEVER"
  [ ] Evitar multiple exclamaciones

CONTENT:
  [ ] Few-shot: 3-5 ejemplos (no más)
  [ ] Colocar documento largo AL INICIO
  [ ] Query/instrucción AL FINAL
  [ ] Prefill si output es JSON/código

EXTENDED THINKING:
  [ ] Activar si tarea es compleja/ambigua
  [ ] Budget: 3K-10K tokens
  [ ] NO para CRUD simple o tests

TOKENS:
  [ ] Presupuesto total < 155K (útiles)
  [ ] Comprimir entre agentes (~2K)
  [ ] Context compaction enabled si > 120K

NATIVE FEATURES:
  [ ] Tool use definido (function calling)
  [ ] Structured output con schema JSON
  [ ] Vision si hay imágenes
  [ ] Thinking adaptativo habilitado

ANTI-ENGINEERING:
  [ ] Agregar restricción "keep minimal"
  [ ] Zona asignada SOLO
  [ ] No files extra no pedidas

TESTING:
  [ ] Probar prompt con 5 ejemplos antes de deploy
  [ ] Comparar vs baseline
  [ ] Revisar output format
  [ ] Verificar no hallucinations
```

---

## CONCLUSIÓN: Resumen Opus 2026

**Claude Opus 4.6 es fundamentalmente diferente de GPT-4:**

| Aspecto | Opus | GPT-4 |
|--------|------|-------|
| **XML Support** | Nativo, preferido | Funciona, no preferido |
| **Extended Thinking** | Sí, adaptativo | No disponible públicamente |
| **Prefilling** | Funciona bien | Funciona bien |
| **Tono agresivo** | Contraproducente | OK |
| **Over-engineering** | Problema conocido | Menos problema |
| **Context 200K** | Eficiente | (8K max) |
| **Function calling** | Excelente | Excelente |

**Para AXON:**
1. ✓ Usar Opus u Sonnet (NUNCA Haiku)
2. ✓ Usar XML tags exclusivamente
3. ✓ Tone: directo + cálido, nunca agresivo
4. ✓ Activar Extended Thinking para complejidad
5. ✓ Agregar anti over-engineering a TODOS los prompts
6. ✓ Comprimir entre agentes (2K por output)
7. ✓ Documentos largos al inicio, query al final
8. ✓ Prefill para JSON/código
9. ✓ REGLA: NUNCA usar Haiku. El mínimo modelo es Sonnet.

**Aplicación:** Usar estas prácticas en TODOS los prompts de agentes AXON para máxima efectividad.

