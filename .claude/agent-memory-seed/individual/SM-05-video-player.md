# Agent Memory: SM-05 (video-player)
Last updated: 2026-03-25

## Rol
Agente del sistema de video de Axon: mantiene el reproductor Mux, el panel de subida para profesores y toda la infraestructura de playback HLS y gestión de videos.

## Lecciones aprendidas
| Fecha | Lección | Prevención |
|-------|---------|------------|
| 2026-03-25 | (inicial) Archivo creado | — |

## Efectividad de lecciones
| Lección | Veces aplicada | Previno error? | Confianza |
|---------|---------------|----------------|-----------|
| (se llena cuando una lección se activa en una sesión real) | — | — | — |

> Confianza: ALTA (previno 3+ errores), MEDIA (previno 1-2), BAJA (no previno o recurrió), NUEVA (sin datos)

## Decisiones técnicas (NO re-litigar)
| Fecha | Decisión | Por qué | Alternativas descartadas |
|-------|----------|---------|--------------------------|

## Patrones que funcionan
- Usar `@mux/mux-player-react` como base del reproductor — nunca reimplementar el player desde cero
- Usar `@mux/upchunk` para uploads chunked — nunca subir archivos completos en una sola petición
- Validar el tamaño del archivo (máx 500MB) ANTES de iniciar el upload — no después
- Obtener tokens JWT de playback firmados desde el backend — nunca exponer signing keys en el frontend
- `dk-video.tsx` del design kit como wrapper estandarizado para consistencia visual en toda la app
- `staleTime` configurado en queries de React Query para evitar refetches innecesarios de metadatos de video
- `VideoNoteForm` guarda el timestamp actual del video al crear una nota — no el timestamp de creación del form
- Manejar los 4 estados del reproductor: loading, ready, error, buffering
- Upload flow en 5 pasos: solicitar URL → backend crea asset en Mux → upchunk sube por partes → webhook notifica al backend → frontend muestra video disponible

## Patrones a evitar
| Pattern | Por qué | Alternativa |
|---------|---------|-------------|
| Reimplementar el player de video | Duplicación innecesaria, pierde features de Mux (adaptive bitrate, HLS, etc.) | Usar `@mux/mux-player-react` siempre |
| Subir archivos como un solo request | Falla con archivos grandes, sin progreso ni cancelación | Usar `@mux/upchunk` para upload por chunks |
| Exponer signing keys de Mux en el frontend | Vulnerabilidad de seguridad crítica | El backend genera y retorna tokens firmados; el frontend solo los usa |
| Omitir validación de tamaño antes del upload | El usuario espera, consume ancho de banda y falla al final | Validar ≤ 500MB antes de iniciar cualquier upload |
| No manejar token refresh de playback | Los tokens tienen expiración; el video deja de reproducirse sin refresh | Implementar lógica de refresh antes de que el token expire |

## Métricas
| Métrica | Valor | Última sesión |
|---------|-------|---------------|
| Sesiones ejecutadas | 0 | — |
| Quality-gate PASS | 0 | — |
| Quality-gate FAIL | 0 | — |
| Scope creep incidents | 0 | — |
