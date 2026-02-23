// ============================================================
// Axon — Admin: Content Management
// PARALLEL-SAFE: This file is independent. Edit freely.
//
// CONTEXT (usePlatformData):
//   Reads:    courses, institutionId
//   Refresh:  refreshCourses (after course CRUD)
//   Wrappers: (none)
//
// CONTENT TREE: Use ContentTreeContext + contentTreeApi.ts for
//   course/semester/section/topic CRUD (flat routes).
//
// API DIRECT (import * as api from '@/app/services/platformApi'):
//   — Courses:   api.getCourses (listing only; CRUD via ContentTreeContext)
//   — Summaries: api.getTopicSummaries, api.createSummary, api.updateSummary, api.deleteSummary
//   — Keywords:  api.getKeywords, api.createKeyword, api.updateKeyword, api.deleteKeyword
// ============================================================
import React from 'react';
import { PlaceholderPage } from '../../PlaceholderPage';
import { FileText } from 'lucide-react';

export function AdminContentPage() {
  return (
    <PlaceholderPage
      title="Gestion de Contenido"
      description="Revisa y aprueba contenido creado por profesores"
      icon={<FileText size={22} />}
      accentColor="blue"
      features={[
        'Flashcards pendientes de aprobacion',
        'Quizzes en revision',
        'Contenido de lectura',
        'Bulk approve/reject',
        'Historial de cambios',
      ]}
      backendRoutes={[
        'GET /server/content/:courseId',
        'PUT /server/content/:courseId/:key',
      ]}
    />
  );
}