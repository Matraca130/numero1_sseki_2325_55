// ============================================================
// TopicSidebarRoot — Main orchestrator
//
// Reads from ContentTreeContext + AppContext.
// Manages: collapsed/expanded state, mobile drawer, loading/error.
// Delegates rendering to SidebarHeader, SidebarTree, SidebarFooter.
//
// FIXES from audit:
//   1. No `as any` cast — constructs proper Topic for setCurrentTopic
//   2. Single source of truth: uses selectedTopicId from ContentTreeContext
//   3. Error state with retry button
//   4. Consistent Spanish (no Portuguese)
//   5. Accessible: role="tree", aria-expanded, aria-selected
//   6. Smart expand: only expand section with active topic
//   7. Scroll-to-active on topic nodes
//   8. Responsive: static desktop, drawer mobile
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, AlertTriangle, RefreshCw, PanelLeft } from 'lucide-react';
import { useNavigation } from '@/app/context/NavigationContext';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useContentTree } from '@/app/context/ContentTreeContext';
import { SidebarHeader } from './SidebarHeader';
import { SidebarTree } from './SidebarTree';
import { SidebarFooter } from './SidebarFooter';
import { SidebarCollapsed } from './SidebarCollapsed';
import { buildSidebarSections, buildCourseInfo } from './utils';
import { useStudyQueueData } from '@/app/hooks/useStudyQueueData';
import { useTopicProgress } from '@/app/hooks/useTopicProgress';

// ── Sidebar wrapper classes ─────────────────────────────

const SIDEBAR_CLASSES =
  'flex flex-col bg-white border-r border-zinc-300 w-72 shrink-0 h-full overflow-hidden';

// ══════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════

export function TopicSidebarRoot() {
  const { setCurrentTopic } = useNavigation();
  const { navigateTo, currentView } = useStudentNav();
  const { tree, loading, error, selectedTopicId, selectTopic, refresh } =
    useContentTree();

  // Local UI state
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ── Mastery data from shared study-queue ──
  const courseId = tree?.courses?.[0]?.id || null;
  const sqData = useStudyQueueData(courseId);
  const { progressMap, overallProgress, refresh: refreshProgress } = useTopicProgress(
    sqData.bySummaryId,
    sqData.loading,
    courseId,
  );

  // ── Derived data (mastery-aware) ──
  const sections = useMemo(
    () => buildSidebarSections(tree, progressMap),
    [tree, progressMap],
  );
  const courseInfo = useMemo(
    () => buildCourseInfo(tree, overallProgress),
    [tree, overallProgress],
  );

  // ── Active topic: single source of truth from ContentTreeContext ──
  const activeTopicId = selectedTopicId;

  // ── Topic selection handler (no `as any`) ──
  const handleSelectTopic = useCallback(
    (topicId: string, topicName: string) => {
      // Update ContentTreeContext (source of truth)
      selectTopic(topicId);

      // Update AppContext with a properly typed Topic (backward compat)
      setCurrentTopic({
        id: topicId,
        title: topicName,
        summary: '',
        flashcards: [],
      });

      // Navigate to study view if not already on a content view
      if (currentView !== 'study' && currentView !== 'flashcards') {
        navigateTo('study');
      }

      // Close mobile drawer
      setMobileOpen(false);
    },
    [selectTopic, setCurrentTopic, navigateTo, currentView],
  );

  // ── Back handler ──
  const handleBack = useCallback(() => {
    if (currentView === 'flashcards') {
      // Clear topic selection so FlashcardView resets to hub landing
      selectTopic(null);
    } else {
      navigateTo('study-hub');
    }
  }, [navigateTo, currentView, selectTopic]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="hidden lg:flex w-72 shrink-0 h-full bg-white border-r border-zinc-300 flex-col items-center justify-center">
        <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
        <p className="text-xs text-zinc-400 mt-2">Cargando contenido...</p>
      </div>
    );
  }

  // ── Error state with retry ──
  if (error) {
    return (
      <div className="hidden lg:flex w-72 shrink-0 h-full bg-white border-r border-zinc-300 flex-col items-center justify-center px-6 gap-3">
        <AlertTriangle className="w-6 h-6 text-amber-500" />
        <p className="text-xs text-zinc-500 text-center">{error}</p>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-xs hover:bg-teal-100 transition-colors"
        >
          <RefreshCw size={12} />
          Reintentar
        </button>
      </div>
    );
  }

  // ── Empty state ──
  if (!tree || tree.courses.length === 0) {
    return (
      <div className="hidden lg:flex w-72 shrink-0 h-full bg-white border-r border-zinc-300 flex-col items-center justify-center px-6">
        <p className="text-xs text-zinc-400 text-center">
          No hay contenido disponible
        </p>
      </div>
    );
  }

  // ── Collapsed state (desktop only) ──
  if (collapsed) {
    return <SidebarCollapsed onExpand={() => setCollapsed(false)} />;
  }

  // ── Shared sidebar content ──
  const sidebarContent = (
    <>
      <SidebarHeader
        course={courseInfo}
        onCollapse={() => setCollapsed(true)}
        onBack={handleBack}
      />
      <SidebarTree
        sections={sections}
        activeTopicId={activeTopicId}
        progressMap={progressMap}
        onSelectTopic={handleSelectTopic}
      />
      <SidebarFooter progressMap={progressMap} />
    </>
  );

  return (
    <>
      {/* ── Desktop: static sidebar ── */}
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 288, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={`${SIDEBAR_CLASSES} hidden lg:flex`}
      >
        {sidebarContent}
      </motion.div>

      {/* ── Mobile: trigger button ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 left-4 z-30 lg:hidden p-3 rounded-full bg-teal-600 text-white shadow-lg hover:bg-teal-700 transition-colors"
        aria-label="Abrir menu de contenido"
      >
        <PanelLeft size={20} />
      </button>

      {/* ── Mobile: drawer overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-white shadow-xl lg:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}