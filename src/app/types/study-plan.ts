// ============================================================
// Axon v4.5 — Study Plan Types (canonical source)
//
// Extracted from AppContext.tsx so that pure utility functions
// (rescheduleEngine, studyPlanMapper) can import these types
// without depending on a React Context file.
//
// AppContext.tsx re-exports these types for backward compatibility.
// ============================================================

export interface StudyPlanTask {
  id: string;
  date: Date;
  title: string;
  subject: string;
  subjectColor: string;
  method: string;
  estimatedMinutes: number;
  completed: boolean;
  /** Topic ID for backend mapping (Phase 3+) */
  topicId?: string;
}

export interface StudyPlan {
  id: string;
  name: string;
  subjects: { id: string; name: string; color: string }[];
  methods: string[];
  selectedTopics: { courseId: string; courseName: string; sectionTitle: string; topicTitle: string; topicId: string }[];
  completionDate: Date;
  weeklyHours: number[]; // [mon, tue, wed, thu, fri, sat, sun]
  tasks: StudyPlanTask[];
  createdAt: Date;
  totalEstimatedHours: number;
  /** Course ID when plan targets a single course (used for backend filtering). */
  courseId?: string;
}
