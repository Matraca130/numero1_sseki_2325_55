// ============================================================
// Axon — Student Layout (React Router sub-routes)
// RESPONSIVE VERSION v2 — Fase 0 Mobile Adaptation
//
// Architecture:
//   DESKTOP (lg+):  Sidebar inline with motion collapse/expand (original behavior preserved)
//   MOBILE  (<lg):  Sidebar as overlay drawer via MobileDrawer
//   TopicSidebar:   Same pattern — inline on desktop, drawer on mobile
//
// Fixes from v1:
//   - P0: Desktop sidebar collapse restored (motion.aside kept for lg+)
//   - P0: Width mismatch fixed (260px everywhere)
//   - P1: Route change only closes mobile drawers, not desktop sidebar
//   - P2: Uses MobileDrawer component (no duplication)
//   - P2: Body scroll lock via MobileDrawer
// ============================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useParams } from 'react-router';
import { AppProvider } from '@/app/context/AppContext';
import { StudentDataProvider } from '@/app/context/StudentDataContext';
import { ContentTreeProvider } from '@/app/context/ContentTreeContext';
import { StudyPlansProvider } from '@/app/context/StudyPlansContext';
import { TopicMasteryProvider } from '@/app/context/TopicMasteryContext';
import { StudyTimeEstimatesProvider } from '@/app/context/StudyTimeEstimatesContext';
import { GamificationProvider } from '@/app/context/GamificationContext';
import { useUI } from '@/app/context/UIContext';
import { useStudySession } from '@/app/context/AppContext';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { Sidebar } from '@/app/components/layout/Sidebar';
import { TopicSidebar } from '@/app/components/layout/TopicSidebar';
import { CourseSwitcher } from '@/app/components/layout/CourseSwitcher';
import { AxonLogo } from '@/app/components/shared/AxonLogo';
import { UserProfileDropdown } from '@/app/components/layout/UserProfileDropdown';
import { MobileDrawer } from '@/app/components/layout/MobileDrawer';
import { components, animation, layout } from '@/app/design-system';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, BookOpen, Sparkles, X } from 'lucide-react';
import { useIsMobile } from '@/app/hooks/useIsMobile';

// -- Lazy-loaded AI Assistant ----------------------------------
const AxonAIAssistant = React.lazy(() =>
  import('@/app/components/ai/AxonAIAssistant').then(m => ({ default: m.AxonAIAssistant }))
);

// -- Inner shell (needs AppContext available) ------------------

function StudentShell() {
  const { isSidebarOpen, setSidebarOpen } = useUI();
  const { isStudySessionActive } = useStudySession();
  const { navigateTo, isView } = useStudentNav();
  const location = useLocation();
  const { summaryId } = useParams<{ summaryId?: string }>();
  const isMobile = useIsMobile();

  const showTopicSidebar = isView('study-hub', 'study', 'summaries', 'flashcards') && !isStudySessionActive;

  // AI Assistant state
  const [isAIOpen, setAIOpen] = useState(false);

  // Separate mobile-only state for drawers
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileTopicOpen, setMobileTopicOpen] = useState(false);

  // Derive a stable key from the URL for page transitions
  const routeKey = location.pathname;

  // Track whether we've auto-opened the topic drawer this session
  const hasAutoOpenedTopicRef = useRef(false);

  // Close ONLY mobile drawers on route change (desktop sidebar unaffected)
  useEffect(() => {
    setMobileSidebarOpen(false);
    setMobileTopicOpen(false);
  }, [location.pathname]);

  // Auto-open topic drawer on mobile when entering study views (once per session)
  useEffect(() => {
    if (isMobile && showTopicSidebar && !hasAutoOpenedTopicRef.current) {
      hasAutoOpenedTopicRef.current = true;
      // Small delay so the page renders first, then the drawer slides in
      const timer = setTimeout(() => setMobileTopicOpen(true), 400);
      return () => clearTimeout(timer);
    }
  }, [isMobile, showTopicSidebar]);

  // Handle hamburger: toggle desktop sidebar OR open mobile drawer
  const handleMenuToggle = useCallback(() => {
    if (isMobile) {
      setMobileSidebarOpen(prev => !prev);
    } else {
      setSidebarOpen(!isSidebarOpen);
    }
  }, [isMobile, isSidebarOpen, setSidebarOpen]);

  return (
    <div className="flex h-screen w-full bg-[#F0F2F5] text-gray-900 font-sans overflow-hidden">
      
      {/* ── Desktop Sidebar (collapsible via motion, hidden on mobile) ── */}
      <motion.div
        initial={false}
        animate={{ width: isSidebarOpen ? layout.sidebar.width : layout.sidebar.collapsedWidth }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:block overflow-hidden shrink-0"
      >
        <Sidebar />
      </motion.div>

      {/* ── Mobile Sidebar Drawer ── */}
      <MobileDrawer
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        width={260}
        zIndex={40}
      >
        <Sidebar />
      </MobileDrawer>

      {/* ── Main Column ── */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        {/* Top Navigation Bar */}
        <header className={`${components.header.height} ${components.header.bg} ${components.header.border} flex items-center justify-between px-3 lg:px-[14px] z-20 shrink-0 py-[2px] m-[0px]`}>
          <div className="flex items-center gap-2 lg:gap-4">
            <button
              onClick={handleMenuToggle}
              className={`${components.header.menuBtn} hover:text-white transition-all duration-200`}
              title={isSidebarOpen ? "Cerrar menú" : "Abrir menú"}
            >
              <Menu size={20} />
            </button>

            {/* Logo Area - Click to Home */}
            <button
              onClick={() => navigateTo('home')}
              className="flex items-center gap-2.5 mr-2 lg:mr-4 hover:opacity-80 transition-opacity"
            >
              <AxonLogo size="sm" theme="light" />
            </button>

            {/* Course Switcher */}
            <CourseSwitcher />

            {/* Topic sidebar toggle (top-left, only on study views) */}
            {showTopicSidebar && (
              <button
                onClick={() => setMobileTopicOpen(!mobileTopicOpen)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 hover:text-white transition-all text-xs font-medium min-h-[36px]"
                aria-label="Abrir navegación de temas"
              >
                <BookOpen size={14} />
                <span>Temas</span>
              </button>
            )}
          </div>

          {/* Right side header actions */}
          <div className="flex items-center gap-1 lg:gap-1.5">
            <UserProfileDropdown />
          </div>
        </header>

        {/* Content Area -- topic sidebar + main side by side on study views */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Desktop Topic Sidebar (always inline) */}
          {showTopicSidebar && (
            <div className="hidden lg:flex">
              <TopicSidebar />
            </div>
          )}

          {/* Mobile Topic Sidebar Drawer */}
          <MobileDrawer
            isOpen={showTopicSidebar && mobileTopicOpen}
            onClose={() => setMobileTopicOpen(false)}
            width={280}
            zIndex={30}
            topOffset={56}
          >
            <div className="h-full bg-white shadow-xl">
              <TopicSidebar />
            </div>
          </MobileDrawer>

          {/* Main content -- Outlet renders the matched child route */}
          <main className="flex-1 overflow-y-auto relative min-w-0">
            <motion.div
              key={routeKey}
              initial={animation.pageTransition.initial}
              animate={animation.pageTransition.animate}
              transition={{ duration: animation.pageTransition.duration }}
              className="h-full w-full"
            >
              <Outlet />
            </motion.div>
          </main>
        </div>
      </div>

      {/* ── AI Assistant Panel (lazy-loaded) ── */}
      {isAIOpen && (
        <React.Suspense fallback={null}>
          <AxonAIAssistant isOpen={isAIOpen} onClose={() => setAIOpen(false)} summaryId={summaryId} />
        </React.Suspense>
      )}

      {/* ── AI Assistant Floating Action Button ── */}
      <AnimatePresence>
        {!isStudySessionActive && !summaryId && (
          <motion.button
            key="ai-fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={() => setAIOpen(prev => !prev)}
            aria-label="Asistente IA Axon"
            className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-teal-500 hover:bg-teal-600 shadow-lg hover:shadow-xl flex items-center justify-center text-white cursor-pointer"
          >
            <motion.div
              animate={{ rotate: isAIOpen ? 90 : 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {isAIOpen ? <X size={24} /> : <Sparkles size={24} />}
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// -- Public export: wraps providers + shell --------------------
//
// Provider Dependency Chain -- DO NOT reorder without checking
// dependencies below.
//
// 1. AppProvider (outermost)
//    Wraps UIProvider + NavigationProvider internally.
//    Supplies useApp(), useStudySession(), sidebar/navigation state
//    that almost every descendant reads.
//    Depends on: AuthContext (provided higher in the tree by App.tsx).
//
// 2. GamificationProvider
//    Depends on: AuthContext (reads user JWT for XP/badge API calls).
//    Does NOT depend on StudentDataProvider, so it can sit above it.
//    Placed here so gamification data is available to all child pages.
//
// 3. StudentDataProvider
//    Depends on: AuthContext (fetches student-specific data with JWT).
//    Provides course list, enrollment, and student profile to children.
//
// 4. ContentTreeProvider
//    Depends on: AuthContext (fetches content tree per institution).
//    Provides the topic/content tree used by study views.
//
// 5. TopicMasteryProvider
//    Standalone hook wrapper (useTopicMastery). No direct context dep,
//    but consumers often also read ContentTree data, so it must be
//    nested inside ContentTreeProvider.
//
// 6. StudyTimeEstimatesProvider
//    Standalone hook wrapper (useStudyTimeEstimates). Same reasoning
//    as TopicMasteryProvider.
//
// 7. StudyPlansProvider (innermost data provider)
//    Depends on: TopicMasteryContext + StudyTimeEstimatesContext
//    (imports useTopicMasteryContext and useStudyTimeEstimatesContext).
//    MUST be nested inside both providers above; moving it higher
//    will throw a "must be used within Provider" error at runtime.
//
// Summary: AppProvider > GamificationProvider > StudentDataProvider
//   > ContentTreeProvider > TopicMasteryProvider
//   > StudyTimeEstimatesProvider > StudyPlansProvider > Shell

export function StudentLayout() {
  return (
    <AppProvider>
      <GamificationProvider>
        <StudentDataProvider>
          <ContentTreeProvider>
            <TopicMasteryProvider>
              <StudyTimeEstimatesProvider>
                <StudyPlansProvider>
                  <StudentShell />
                </StudyPlansProvider>
              </StudyTimeEstimatesProvider>
            </TopicMasteryProvider>
          </ContentTreeProvider>
        </StudentDataProvider>
      </GamificationProvider>
    </AppProvider>
  );
}
