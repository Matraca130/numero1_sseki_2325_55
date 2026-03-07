// ============================================================
// Axon — StudyView (Student: delegates to StudentSummariesView)
//
// Previously used legacy SummarySessionNew with mock stubs.
// Now delegates to the real API-backed StudentSummariesView
// so students always see real published summaries + videos.
// ============================================================
import React from 'react';
import { StudentSummariesView } from '@/app/components/content/StudentSummariesView';

export function StudyView() {
  return <StudentSummariesView />;
}
