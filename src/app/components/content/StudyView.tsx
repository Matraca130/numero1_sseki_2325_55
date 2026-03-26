// ============================================================
// Axon — StudyView (Student: delegates to StudentSummariesView)
//
// Delegates to the real API-backed StudentSummariesView
// so students always see real published summaries + videos.
// ============================================================
import React from 'react';
import { StudentSummariesView } from '@/app/components/content/StudentSummariesView';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';

export function StudyView() {
  return (
    <ErrorBoundary variant="section" retry={() => window.location.reload()}>
      <StudentSummariesView />
    </ErrorBoundary>
  );
}
