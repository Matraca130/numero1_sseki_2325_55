# Memory: Summaries
Last updated: 2026-03-25

## Errores conocidos (max 20)
| Fecha | Error | Archivo | Resolución |
|-------|-------|---------|------------|
| 2026-03-24 | handleFieldChange escribía a ref sin re-render → input lag 2s+ | BlockEditor.tsx | Agregar setTick(t=>t+1) para forzar re-render |
| 2026-03-24 | flushPending era fire-and-forget → publish podía racear saves | BlockEditor.tsx | Cambiar a mutateAsync + await en handlePublish |
| 2026-03-24 | Severity forms usaban español (leve/moderado/grave) pero renderers esperan inglés | StagesForm, ListDetailForm | StagesForm: mild/moderate/critical. ListDetailForm: high/medium/low |
| 2026-03-24 | Callout con título vacío → contenido desaparecía en ViewerBlock | ViewerBlock.tsx | Remover `&& c.title` de la condición de routing edu callout |
| 2026-03-24 | Publish endpoint tenía path incorrecto /content/summaries/ | BlockEditor.tsx | Cambiar a /summaries/${id}/publish |
| 2026-03-24 | ReorderTable type no incluía summary_blocks → unsafe cast | summariesApi.ts | Agregar 'summary_blocks' al union type |
| 2026-03-25 | Auditoría visual recomendó GridBlock horizontal pero prototipo es centered | GridBlock.tsx | Siempre verificar contra prototipo ORIGINAL, no confiar en auditoría sola |
| 2026-03-25 | apiCall fuerza Content-Type JSON, rompe FormData uploads | ImageReferenceForm, ProseForm | Usar raw fetch para uploads multipart |

## Patterns a evitar (max 10)
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Controlled inputs con onChange que solo escribe a ref | Input lag — React no re-renderiza | Agregar setTick o usar local state |
| `as ReorderTable` type casts | Oculta errores reales de tipo | Expandir el union type en summariesApi.ts |
| Severity values en español en forms | Renderers usan inglés → colores nunca aplican | Siempre usar valores que matchean SEVERITY_COLORS del renderer |
| Confiar en una sola auditoría visual | Puede recomendar cambios incorrectos | Siempre cruzar con el código fuente del prototipo |
| apiCall para FormData uploads | Fuerza Content-Type: application/json | Usar raw fetch con headers manuales |

## Decisiones (max 10)
| Fecha | Decisión | Contexto |
|-------|---------|----------|
| 2026-03-24 | Block editor usa auto-save 2s debounce en vez de undo/redo | Server-first architecture, más robusto que local state |
| 2026-03-24 | Professor accent = violet, no teal | Consistente con otras pages del profesor |
| 2026-03-24 | Prototype design tokens: darkTeal=#1B3B36, tealAccent=#2a8c7a | Definidos en theme.css como CSS variables |
| 2026-03-25 | Image upload usa POST /storage/upload (backend route) no direct Supabase | Centraliza logging, validación, path generation |
| 2026-03-25 | KeywordChip usa hover popover con 150ms delay | Mejor UX que tooltip nativo, evita flicker |