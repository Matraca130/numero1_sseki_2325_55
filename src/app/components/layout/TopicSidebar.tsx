// ============================================================
// Axon — TopicSidebar (re-export)
//
// This file keeps backward compatibility with existing imports.
// All implementation is in ./topic-sidebar/ directory.
//
// The modularized version already has smart-expand:
//   - SidebarTree.tsx: only expands section with active topic
//   - TopicSidebarRoot.tsx: error/loading/collapsed/mobile states
// ============================================================

export { TopicSidebar } from './topic-sidebar';
