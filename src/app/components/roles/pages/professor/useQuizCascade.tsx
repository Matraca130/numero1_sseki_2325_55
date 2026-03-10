// ============================================================
// Axon — Professor: useQuizCascade Hook
//
// Encapsulates the full cascade selection logic:
//   Institution → Course → Semester → Section → Topic → Summary
//
// Fix H-1: cascadeLevels is now useMemo'd with stable icon
// constants, making React.memo on CascadeSelector effective.
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { apiCall } from '@/app/lib/api';
import type { CascadeLevelConfig } from '@/app/components/professor/CascadeSelector';
import type { Summary, Keyword } from '@/app/types/platform';
import {
  BookOpen, FileText, ClipboardList, GraduationCap, Layers,
} from 'lucide-react';
import { logger } from '@/app/lib/logger';

const ICON_COURSE = <BookOpen size={12} className="text-purple-500 shrink-0" />;
const ICON_SEMESTER = <GraduationCap size={12} className="text-gray-400 shrink-0" />;
const ICON_SECTION = <Layers size={12} className="text-gray-400 shrink-0" />;
const ICON_TOPIC = <FileText size={12} className="text-gray-400 shrink-0" />;
const ICON_SUMMARY = <ClipboardList size={12} className="text-purple-500 shrink-0" />;

interface ContentTreeTopic { id: string; name: string; order_index?: number; }
interface ContentTreeSection { id: string; name: string; order_index?: number; topics: ContentTreeTopic[]; }
interface ContentTreeSemester { id: string; name: string; order_index?: number; sections: ContentTreeSection[]; }
interface ContentTreeCourse { id: string; name: string; semesters: ContentTreeSemester[]; }
interface MembershipLite { id: string; course_id: string; role: string; }

function extractItems<T>(res: { items: T[] } | T[]): T[] {
  return Array.isArray(res) ? res : res.items;
}

export interface UseQuizCascadeReturn {
  selectedSummaryId: string | null;
  selectedSummary: Summary | null;
  keywords: Keyword[];
  getKeywordName: (kwId: string) => string;
  cascadeLevels: CascadeLevelConfig[];
  breadcrumbItems: string[];
}

export function useQuizCascade(): UseQuizCascadeReturn {
  const { selectedInstitution } = useAuth();
  const institutionId = selectedInstitution?.id || null;

  const [contentTree, setContentTree] = useState<ContentTreeCourse[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [keywords, setKeywords] = useState<Keyword[]>([]);

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);

  useEffect(() => {
    if (!institutionId) { setContentTree([]); setTreeLoading(false); return; }
    let cancelled = false;
    setTreeLoading(true);
    (async () => {
      try {
        const [tree, memberships] = await Promise.all([
          apiCall<ContentTreeCourse[]>(`/content-tree?institution_id=${institutionId}`),
          apiCall<MembershipLite[]>(`/memberships?institution_id=${institutionId}`),
        ]);
        if (cancelled) return;
        const allCourses = Array.isArray(tree) ? tree : [];
        const profCourseIds = (memberships || []).filter(m => m.role?.toLowerCase() === 'professor').map(m => m.course_id).filter(Boolean);
        const professorCourses = allCourses.filter(c => profCourseIds.includes(c.id));
        setContentTree(professorCourses.length > 0 ? professorCourses : allCourses);
      } catch (err) {
        logger.error('[Quiz] Content tree load error:', err);
        if (!cancelled) setContentTree([]);
      } finally {
        if (!cancelled) setTreeLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [institutionId]);

  const courses = useMemo(() => contentTree.map(c => ({ id: c.id, name: c.name })), [contentTree]);
  const semesters = useMemo(() => {
    if (!selectedCourseId) return [];
    return contentTree.find(c => c.id === selectedCourseId)?.semesters || [];
  }, [contentTree, selectedCourseId]);
  const sections = useMemo(() => {
    if (!selectedSemesterId) return [];
    return semesters.find(s => s.id === selectedSemesterId)?.sections || [];
  }, [semesters, selectedSemesterId]);
  const topics = useMemo(() => {
    if (!selectedSectionId) return [];
    return sections.find(s => s.id === selectedSectionId)?.topics || [];
  }, [sections, selectedSectionId]);

  const handleCourseChange = useCallback((id: string) => {
    setSelectedCourseId(id); setSelectedSemesterId(''); setSelectedSectionId(''); setSelectedTopicId(''); setSummaries([]); setSelectedSummaryId(null);
  }, []);
  const handleSemesterChange = useCallback((id: string) => {
    setSelectedSemesterId(id); setSelectedSectionId(''); setSelectedTopicId(''); setSummaries([]); setSelectedSummaryId(null);
  }, []);
  const handleSectionChange = useCallback((id: string) => {
    setSelectedSectionId(id); setSelectedTopicId(''); setSummaries([]); setSelectedSummaryId(null);
  }, []);
  const handleTopicChange = useCallback((id: string) => {
    setSelectedTopicId(id); setSummaries([]); setSelectedSummaryId(null);
  }, []);
  const handleSummaryChange = useCallback((id: string) => {
    setSelectedSummaryId(id || null);
  }, []);

  useEffect(() => {
    if (!selectedTopicId) { setSummaries([]); setSelectedSummaryId(null); return; }
    let cancelled = false;
    setSummariesLoading(true);
    (async () => {
      try {
        const res = await apiCall<{ items: Summary[] } | Summary[]>(`/summaries?topic_id=${selectedTopicId}`);
        const items = extractItems<Summary>(res);
        if (!cancelled) {
          setSummaries(items);
          const published = items.find(x => x.status === 'published') || items[0];
          if (published) setSelectedSummaryId(published.id);
        }
      } catch (err) {
        logger.error('[Quiz] Summaries load error:', err);
        if (!cancelled) { setSummaries([]); setSelectedSummaryId(null); }
      } finally {
        if (!cancelled) setSummariesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedTopicId]);

  useEffect(() => {
    setKeywords([]);
    if (!selectedSummaryId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiCall<{ items: Keyword[] } | Keyword[]>(`/keywords?summary_id=${selectedSummaryId}`);
        const items = extractItems<Keyword>(res);
        if (!cancelled) setKeywords(items);
      } catch (err) {
        logger.error('[Quiz] Keywords load error:', err);
        if (!cancelled) setKeywords([]);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedSummaryId]);

  const keywordMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const kw of keywords) { map.set(kw.id, kw.term || kw.id.substring(0, 8) + '...'); }
    return map;
  }, [keywords]);

  const getKeywordName = useCallback((kwId: string) => {
    return keywordMap.get(kwId) || kwId.substring(0, 8) + '...';
  }, [keywordMap]);

  const selectedSummary = useMemo(() => {
    if (!selectedSummaryId) return null;
    return summaries.find(s => s.id === selectedSummaryId) || null;
  }, [summaries, selectedSummaryId]);

  const breadcrumbItems = useMemo(() => {
    return [
      courses.find(c => c.id === selectedCourseId)?.name,
      semesters.find(s => s.id === selectedSemesterId)?.name,
      sections.find(s => s.id === selectedSectionId)?.name,
      topics.find(t => t.id === selectedTopicId)?.name,
    ].filter(Boolean) as string[];
  }, [courses, selectedCourseId, semesters, selectedSemesterId, sections, selectedSectionId, topics, selectedTopicId]);

  const cascadeLevels: CascadeLevelConfig[] = useMemo(() => {
    const courseName = courses.find(c => c.id === selectedCourseId)?.name || '';
    const semesterName = semesters.find(s => s.id === selectedSemesterId)?.name || '';
    const sectionName = sections.find(s => s.id === selectedSectionId)?.name || '';
    const topicName = topics.find(t => t.id === selectedTopicId)?.name || '';
    const summaryItems = summaries.map(s => ({ id: s.id, name: `${s.title || `Resumen ${s.id.substring(0, 8)}`} (${s.status || 'draft'})` }));
    return [
      { key: 'course', label: 'Curso', icon: ICON_COURSE, items: courses, selectedId: selectedCourseId, onChange: handleCourseChange, placeholder: '-- Seleccionar curso --', emptyMessage: 'Sin cursos asignados como profesor', loading: treeLoading, loadingMessage: 'Cargando cursos...', selectedDisplayName: courseName },
      { key: 'semester', label: 'Semestre', icon: ICON_SEMESTER, items: semesters.map(s => ({ id: s.id, name: s.name })), selectedId: selectedSemesterId, onChange: handleSemesterChange, placeholder: '-- Seleccionar semestre --', emptyMessage: 'Sin semestres', visible: !!selectedCourseId, selectedDisplayName: semesterName },
      { key: 'section', label: 'Seccion', icon: ICON_SECTION, items: sections.map(s => ({ id: s.id, name: s.name })), selectedId: selectedSectionId, onChange: handleSectionChange, placeholder: '-- Seleccionar seccion --', emptyMessage: 'Sin secciones', visible: !!selectedSemesterId, selectedDisplayName: sectionName },
      { key: 'topic', label: 'Topico', icon: ICON_TOPIC, items: topics.map(t => ({ id: t.id, name: t.name })), selectedId: selectedTopicId, onChange: handleTopicChange, placeholder: '-- Seleccionar topico --', emptyMessage: 'Sin topicos', visible: !!selectedSectionId, selectedDisplayName: topicName },
      { key: 'summary', label: 'Resumen', icon: ICON_SUMMARY, items: summaryItems, selectedId: selectedSummaryId || '', onChange: handleSummaryChange, placeholder: '-- Seleccionar resumen --', emptyMessage: 'Sin resumenes en este topico', loading: summariesLoading, visible: !!selectedTopicId, selectedDisplayName: selectedSummary?.title || undefined },
    ];
  }, [
    courses, selectedCourseId, handleCourseChange, treeLoading,
    semesters, selectedSemesterId, handleSemesterChange,
    sections, selectedSectionId, handleSectionChange,
    topics, selectedTopicId, handleTopicChange,
    summaries, selectedSummaryId, handleSummaryChange, summariesLoading, selectedSummary,
  ]);

  return { selectedSummaryId, selectedSummary, keywords, getKeywordName, cascadeLevels, breadcrumbItems };
}
