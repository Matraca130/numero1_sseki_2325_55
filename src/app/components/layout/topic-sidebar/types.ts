// ============================================================
// TopicSidebar — Shared Types
// ============================================================

/** Mastery level derived from BKT p_know */
export type NodeStatus = 'mastered' | 'learning' | 'new' | 'empty';

/** Flattened section node for the tree */
export interface SidebarSection {
  id: string;
  name: string;
  status: NodeStatus;
  topics: SidebarTopic[];
}

/** Flattened topic node for the tree */
export interface SidebarTopic {
  id: string;
  name: string;
  status: NodeStatus;
  isNext: boolean;
}

/** Course summary info for the header */
export interface CourseInfo {
  name: string;
  semesterName: string;
  totalSections: number;
  completedSections: number;
  progressPct: number;
}
