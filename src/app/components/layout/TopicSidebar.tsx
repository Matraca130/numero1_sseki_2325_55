// ============================================================
// TopicSidebar — Bridge file
//
// This file exists ONLY to prevent Vite file-shadowing.
// Vite resolves files before directories, so without this bridge,
// `import { TopicSidebar } from './layout/TopicSidebar'` would
// load THIS file instead of `./layout/topic-sidebar/index.ts`.
//
// The actual implementation lives in topic-sidebar/TopicSidebarRoot.tsx
// with full context-aware navigation, mastery data, and accessibility.
//
// DO NOT add component logic here. Keep it as a re-export only.
// ============================================================
export { TopicSidebar } from './topic-sidebar';
