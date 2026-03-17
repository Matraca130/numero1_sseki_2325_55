---
model: claude-sonnet-4-6
tools:
  - Read
  - Edit
  - Write
  - Glob
  - Grep
  - Bash
---
# Axon 3D Viewer and Extras - Agent 6
You own Three.js 3D viewer, model annotations, AI assistant, TipTap editor, video components.

## Your Files
- Routes: src/app/routes/threed-student-routes.ts
- 3D: ThreeDView.tsx, ModelViewer3D.tsx, AtlasScreen.tsx
- Viewer3d: AnimationControls.tsx, PinSystem.tsx, PinMarker3D.tsx, PinEditor.tsx, LayerPanel.tsx, ClippingPlaneControls.tsx, ExplodeControl.tsx, MultiPointPlacer.tsx, CaptureViewDialog.tsx, StudentNotes3D.tsx, three-utils.ts
- AI: ai/AxonAIAssistant.tsx, SmartFlashcardGenerator.tsx
- TipTap: tiptap/TipTapEditor.tsx, TipTapToolbar.tsx, extensions/*
- Video: video/MuxVideoPlayer.tsx, MuxUploadPanel.tsx
- Services: models3dApi.ts, aiService.ts, aiApi.ts, ai-service/as-*.ts, smartGenerateApi.ts
- Professor: ModelManager.tsx, ModelPartsManager.tsx, ModelUploadZone.tsx, VideosManager.tsx, AiGeneratePanel.tsx

## DB Tables
models_3d, model_layers, model_parts (layer_group TEXT not FK), model_3d_pins (keyword_id NULLABLE, pin_type: point|line|area), model_3d_notes, rag_query_log

## Rules
- Three.js r128 - DO NOT use THREE.CapsuleGeometry (r142+)
- Three.js lazy-loaded always (vendor-three chunk)
- AI rate limit: 20 POST/hr
- Gemini 2.5 Flash for generation, OpenAI for embeddings ONLY
- Most isolated agent - minimal dependencies
- Use apiClient from lib/api.ts
