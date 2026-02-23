// ============================================================
// Axon — Content Tree Context
//
// Provides the full content hierarchy (courses > semesters >
// sections > topics) fetched from the backend, plus CRUD
// operations for professor/owner/admin roles.
//
// Usage:
//   const { tree, loading, selectedTopicId, selectTopic, canEdit } = useContentTree();
//
// Must be wrapped inside AuthProvider (needs selectedInstitution + role).
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import * as api from '@/app/services/contentTreeApi';
import type { ContentTree, TreeCourse, TreeSemester, TreeSection, TreeTopic } from '@/app/services/contentTreeApi';

// ── Context interface ─────────────────────────────────────

interface ContentTreeContextType {
  tree: ContentTree | null;
  loading: boolean;
  error: string | null;
  canEdit: boolean;
  selectedTopicId: string | null;

  // Actions
  refresh: () => Promise<void>;
  selectTopic: (topicId: string | null) => void;

  // CRUD — Course
  addCourse: (name: string, description?: string) => Promise<void>;
  editCourse: (id: string, name: string, description?: string) => Promise<void>;
  removeCourse: (id: string) => Promise<void>;

  // CRUD — Semester
  addSemester: (courseId: string, name: string) => Promise<void>;
  editSemester: (id: string, name: string) => Promise<void>;
  removeSemester: (id: string) => Promise<void>;

  // CRUD — Section
  addSection: (semesterId: string, name: string) => Promise<void>;
  editSection: (id: string, name: string) => Promise<void>;
  removeSection: (id: string) => Promise<void>;

  // CRUD — Topic
  addTopic: (sectionId: string, name: string) => Promise<void>;
  editTopic: (id: string, name: string) => Promise<void>;
  removeTopic: (id: string) => Promise<void>;
}

const ContentTreeContext = createContext<ContentTreeContextType | null>(null);

// ── Provider ──────────────────────────────────────────────

export function ContentTreeProvider({ children }: { children: ReactNode }) {
  const { selectedInstitution, role, status } = useAuth();
  const institutionId = selectedInstitution?.id || null;
  const lastInstId = useRef<string | null>(null);

  const [tree, setTree] = useState<ContentTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  const canEdit = role === 'professor' || role === 'owner' || role === 'admin';

  // ── Fetch tree ──────────────────────────────────────────
  const fetchTree = useCallback(async (instId: string) => {
    setLoading(true);
    setError(null);
    try {
      const raw = await api.getContentTree(instId);
      // IMPORTANT: GET /content-tree returns { "data": [...] }.
      // apiCall() unwraps .data, so `raw` is TreeCourse[] (the array directly).
      // It is NOT { courses: [...] }. Handle both shapes defensively.
      const coursesArray: any[] = Array.isArray(raw)
        ? raw                           // ✅ correct shape: raw IS the array
        : Array.isArray((raw as any)?.courses)
          ? (raw as any).courses        // fallback if backend ever wraps it
          : [];

      const data: ContentTree = {
        courses: coursesArray.map((c: any) => ({
          id: c.id || '',
          name: c.name || '',
          description: c.description,
          order_index: c.order_index,
          semesters: Array.isArray(c.semesters) ? c.semesters.map((s: any) => ({
            id: s.id || '',
            name: s.name || '',
            order_index: s.order_index,
            sections: Array.isArray(s.sections) ? s.sections.map((sec: any) => ({
              id: sec.id || '',
              name: sec.name || '',
              order_index: sec.order_index,
              topics: Array.isArray(sec.topics) ? sec.topics.map((t: any) => ({
                id: t.id || '',
                name: t.name || '',
                order_index: t.order_index,
              })) : [],
            })) : [],
          })) : [],
        })),
      };
      console.log(`[ContentTree] Loaded: ${data.courses.length} courses`);
      setTree(data);
    } catch (err: any) {
      console.error('[ContentTree] Fetch error:', err);
      setError(err.message || 'Error al cargar el arbol de contenido');
      // Set empty tree so UI can show empty state
      setTree({ courses: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (institutionId) await fetchTree(institutionId);
  }, [institutionId, fetchTree]);

  // ── Auto-load on institution change ─────────────────────
  useEffect(() => {
    if (status === 'loading') return;
    if (!institutionId) {
      setTree({ courses: [] });
      setLoading(false);
      return;
    }
    if (lastInstId.current !== institutionId) {
      setTree(null);
      setSelectedTopicId(null);
      lastInstId.current = institutionId;
    }
    fetchTree(institutionId);
  }, [institutionId, status, fetchTree]);

  // ── CRUD helpers (call API then refresh) ────────────────

  const addCourse = useCallback(async (name: string, description?: string) => {
    if (!institutionId) return;
    await api.createCourse({ institution_id: institutionId, name, description });
    await refresh();
  }, [institutionId, refresh]);

  const editCourse = useCallback(async (id: string, name: string, description?: string) => {
    await api.updateCourse(id, { name, description });
    await refresh();
  }, [refresh]);

  const removeCourse = useCallback(async (id: string) => {
    await api.deleteCourse(id);
    await refresh();
  }, [refresh]);

  const addSemester = useCallback(async (courseId: string, name: string) => {
    await api.createSemester({ course_id: courseId, name });
    await refresh();
  }, [refresh]);

  const editSemester = useCallback(async (id: string, name: string) => {
    await api.updateSemester(id, { name });
    await refresh();
  }, [refresh]);

  const removeSemester = useCallback(async (id: string) => {
    await api.deleteSemester(id);
    await refresh();
  }, [refresh]);

  const addSection = useCallback(async (semesterId: string, name: string) => {
    await api.createSection({ semester_id: semesterId, name });
    await refresh();
  }, [refresh]);

  const editSection = useCallback(async (id: string, name: string) => {
    await api.updateSection(id, { name });
    await refresh();
  }, [refresh]);

  const removeSection = useCallback(async (id: string) => {
    await api.deleteSection(id);
    await refresh();
  }, [refresh]);

  const addTopic = useCallback(async (sectionId: string, name: string) => {
    await api.createTopic({ section_id: sectionId, name });
    await refresh();
  }, [refresh]);

  const editTopic = useCallback(async (id: string, name: string) => {
    await api.updateTopic(id, { name });
    await refresh();
  }, [refresh]);

  const removeTopic = useCallback(async (id: string) => {
    await api.deleteTopic(id);
    await refresh();
  }, [refresh]);

  return (
    <ContentTreeContext.Provider
      value={{
        tree,
        loading,
        error,
        canEdit,
        selectedTopicId,
        refresh,
        selectTopic: setSelectedTopicId,
        addCourse, editCourse, removeCourse,
        addSemester, editSemester, removeSemester,
        addSection, editSection, removeSection,
        addTopic, editTopic, removeTopic,
      }}
    >
      {children}
    </ContentTreeContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────

export function useContentTree() {
  const ctx = useContext(ContentTreeContext);
  if (!ctx) {
    throw new Error('useContentTree must be used within a ContentTreeProvider');
  }
  return ctx;
}