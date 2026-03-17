# Bugs Encontrados — Mind Map Feature

Registro de todos los bugs encontrados, arreglados, y testeados.
Cada bug tiene test de regresión y documentación de root cause.

---

<!-- Template:
## Bug #N — [Título corto]
- **Fecha**: YYYY-MM-DD
- **Archivo**: path/to/file.tsx
- **Root cause**: [1 línea]
- **Fix**: [Descripción del fix]
- **Test de regresión**: path/to/test.ts — nombre del test
- **Prevención futura**: [Cómo evitarlo]
-->

## Bug #1 — exportPNG/exportJPEG sin try-catch: unhandled promise rejection

- **Fecha**: 2026-03-17
- **Archivo**: src/app/components/content/mindmap/KnowledgeGraph.tsx (l\u00edneas 530-541)
- **Root cause**: `graph.toDataURL()` es async y puede lanzar si el grafo fue destruido durante la exportaci\u00f3n (unmount, navegaci\u00f3n, o resize concurrente). Las funciones `exportPNG` y `exportJPEG` no ten\u00edan try-catch, causando un unhandled promise rejection que podr\u00eda crashear en strict mode o loguearse como error rojo en consola.
- **Fix**: Envolver `graph.toDataURL()` + `downloadGraphImage()` en try-catch dentro de ambas funciones export, consistente con el patr\u00f3n ya usado en `focusNode`, `zoomIn`, `zoomOut`, `fitView` del mismo archivo.
- **Test de regresi\u00f3n**: `__tests__/smoke.test.ts` — "regression: KnowledgeGraph export error handling (BUG-001)"
- **Prevenci\u00f3n futura**: Toda llamada async a m\u00e9todos de G6 Graph debe estar envuelta en try-catch porque el grafo puede ser destruido en cualquier momento por un efecto de React.
