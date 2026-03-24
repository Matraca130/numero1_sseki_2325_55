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

import React, { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { AppProvider } from '@/app/context/AppContext';
import { UIProvider } from '@/app/context/UIContext';
import { StudentDataProvider } from '@/app/context/StudentDataContext';
import { ContentTreeProvider } from '@/app/context/ContentTreeContext';
import { StudyPlansProvider } from '@/app/context/StudyPlansContext';
import { TopicMasteryProvider } from '@/app/context/TopicMasteryContext';
import { StudyTimeEstimatesProvider } from '@/app/context/StudyTimeEstimatesContext';
import { useApp } from '@/app/context/AppContext';
import { useUI } from '@/app/context/UIContext';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { Sidebar } from '@/app/components/layout/Sidebar';
import { TopicSidebar } from '@/app/components/layout/TopicSidebar';
import { CourseSwitcher } from '@/app/components/layout/CourseSwitcher';
import { AxonLogo } from '@/app/components/shared/AxonLogo';
import { UserProfileDropdown } from '@/app/components/layout/UserProfileDropdown';
import { MobileDrawer } from '@/app/components/layout/MobileDrawer';
import { components, animation, layout } from '@/app/design-system';
import { motion } from 'motion/react';
import { Menu, PanelLeftClose } from 'lucide-react';
import { useIsMobile } from '@/app/hooks/useIsMobile';

// -- Inner shell (needs AppContext available) ------------------

function StudentShell() {
  const { isStudySessionActive } = useApp();
  const { isSidebarOpen, setSidebarOpen } = useUI();
  const { navigateTo, isView } = useStudentNav();
  const location = useLocation();
  const isMobile = useIsMobile();

  const showTopicSidebar = isView('study-hub', 'study', 'flashcards') && !isStudySessionActive;

  // Separate mobile-only state for drawers
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileTopicOpen, setMobileTopicOpen] = useState(false);

  // Derive a stable key from the URL for page transitions
  const routeKey = location.pathname;

  // Close ONLY mobile drawers on route change (desktop sidebar unaffected)
  useEffect(() => {
    setMobileSidebarOpen(false);
    setMobileTopicOpen(false);
  }, [location.pathname]);

  // Handle hamburger: toggle desktop sidebar OR open mobile drawer
  const handleMenuToggle = useCallback(() => {
    if (isMobile) {
      setMobileSidebarOpen(prev => !prev);
    } else {
      setSidebarOpen(!isSidebarOpen);
    }
  }, [isMobile, isSidebarOpen, setSidebarOpen]);

  return (
    <div className="flex h-screen w-full bg-gray-50 text-gray-900 font-sans overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-white focus:text-[#2a8c7a] focus:rounded-full focus:shadow-lg focus:text-sm focus:font-medium"
      >
        Pular para o conteúdo principal
      </a>

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
              title={isSidebarOpen ? "Fechar menu" : "Abrir menu"}
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
          </div>

          {/* Right side header actions */}
          <div className="flex items-center gap-1 lg:gap-1.5">
            {/* Mobile: Topic sidebar toggle (only on study views) */}
            {showTopicSidebar && (
              <button
                onClick={() => setMobileTopicOpen(!mobileTopicOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.07] transition-all"
                title="Temas"
              >
                <PanelLeftClose size={18} />
              </button>
            )}
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
            width={260}
            zIndex={30}
            topOffset={48}
            showCloseButton={false}
          >
            <div className="h-full bg-white shadow-xl">
              <TopicSidebar />
            </div>
          </MobileDrawer>

          {/* Main content -- Outlet renders the matched child route */}
          <main id="main-content" className="flex-1 overflow-y-auto relative min-w-0">
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
    </div>
  );
}

// -- ComposeProviders utility (flattens nested context providers) --

function ComposeProviders({ providers, children }: { providers: React.ComponentType<{ children: React.ReactNode }>[]; children: React.ReactNode }) {
  return providers.reduceRight<React.ReactNode>((acc, Provider) => <Provider>{acc}</Provider>, children);
}

// -- Public export: wraps providers + shell --------------------

const STUDENT_PROVIDERS: React.ComponentType<{ children: React.ReactNode }>[] = [
  UIProvider,
  AppProvider,
  StudentDataProvider,
  ContentTreeProvider,
  TopicMasteryProvider,
  StudyTimeEstimatesProvider,
  StudyPlansProvider,
];

export function StudentLayout() {
  return (
    <ComposeProviders providers={STUDENT_PROVIDERS}>
      <StudentShell />
    </ComposeProviders>
  );
}
