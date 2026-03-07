// ============================================================
// TopicSidebar — Public API
//
// Re-exports the root component as `TopicSidebar` so the
// existing import in StudentLayout.tsx doesn't need to change:
//   import { TopicSidebar } from '@/app/components/layout/TopicSidebar'
// ============================================================

export { TopicSidebarRoot as TopicSidebar } from './TopicSidebarRoot';

// Sub-components (for testing / composition)
export { SidebarHeader } from './SidebarHeader';
export { SidebarTree } from './SidebarTree';
export { SidebarFooter } from './SidebarFooter';
export { SidebarCollapsed } from './SidebarCollapsed';
export { StatusIcon } from './StatusIcon';
export { NodeBadge } from './NodeBadge';

// Types
export type { NodeStatus, SidebarSection, SidebarTopic, CourseInfo } from './types';
