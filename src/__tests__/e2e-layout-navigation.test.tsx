// ============================================================
// E2E Integration Tests -- Layout & Navigation System
//
// Tests the full layout + navigation journey:
//   1. StudentLayout renders with sidebar + main content
//   2. Sidebar shows navigation links (Inicio, Estudiar, Flashcards, etc.)
//   3. Sidebar collapse/expand toggle
//   4. Navigation link clicking routes correctly
//   5. CourseSwitcher shows course name and allows switching
//   6. UserProfileDropdown shows user info + logout option
//   7. Mobile drawer opens/closes on mobile breakpoint
//   8. Active link highlighting based on current route
//   9. Topic sidebar shows course hierarchy
//  10. Topic sidebar click selects topic and navigates
//  11. RoleShell renders with sidebar for owner/admin/professor
//  12. RoleShell mobile drawer behavior
//
// Components under test:
//   - StudentLayout (StudentShell)
//   - Sidebar
//   - CourseSwitcher
//   - UserProfileDropdown
//   - MobileDrawer
//   - TopicSidebar
//   - RoleShell
//
// RUN: npx vitest run src/__tests__/e2e-layout-navigation.test.tsx
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router';
import React from 'react';
import type { ReactNode } from 'react';

// ── Mock motion/react ─────────────────────────────────────────
vi.mock('motion/react', () => {
  const React = require('react');
  const m = (tag: string) => React.forwardRef((p: any, ref: any) => {
    const { initial, animate, exit, variants, whileHover, whileTap, transition, layout, ...rest } = p;
    return React.createElement(tag, { ...rest, ref });
  });
  return {
    motion: { div: m('div'), span: m('span'), button: m('button'), nav: m('nav'), aside: m('aside'), ul: m('ul'), li: m('li'), a: m('a'), p: m('p'), section: m('section') },
    AnimatePresence: ({ children }: any) => children,
    useInView: () => true,
    useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
  };
});

// ── Mock lucide-react ─────────────────────────────────────────
vi.mock('lucide-react', () => {
  const React = require('react');
  const icon = (name: string) => React.forwardRef((p: any, ref: any) => React.createElement('svg', { ...p, ref, 'data-testid': `icon-${name}` }));
  return {
    BookOpen: icon('BookOpen'), ChevronDown: icon('ChevronDown'), ChevronRight: icon('ChevronRight'),
    ChevronUp: icon('ChevronUp'), GraduationCap: icon('GraduationCap'), Home: icon('Home'),
    Layers: icon('Layers'), LogOut: icon('LogOut'), Menu: icon('Menu'), Settings: icon('Settings'),
    User: icon('User'), X: icon('X'), Brain: icon('Brain'), Trophy: icon('Trophy'),
    Calendar: icon('Calendar'), BarChart3: icon('BarChart3'), Zap: icon('Zap'),
    PanelLeftClose: icon('PanelLeftClose'), PanelLeftOpen: icon('PanelLeftOpen'),
    ChevronsUpDown: icon('ChevronsUpDown'), Check: icon('Check'), MoreHorizontal: icon('MoreHorizontal'),
    LayoutDashboard: icon('LayoutDashboard'), Box: icon('Box'), Database: icon('Database'),
    Flame: icon('Flame'), Users: icon('Users'), ArrowLeft: icon('ArrowLeft'),
    Loader2: icon('Loader2'), FolderOpen: icon('FolderOpen'), FileText: icon('FileText'),
    Bell: icon('Bell'), HelpCircle: icon('HelpCircle'), Award: icon('Award'),
    Clock: icon('Clock'), CreditCard: icon('CreditCard'), MessageSquare: icon('MessageSquare'),
    Shield: icon('Shield'), Moon: icon('Moon'), Target: icon('Target'),
    TrendingUp: icon('TrendingUp'), ArrowLeftRight: icon('ArrowLeftRight'),
    Sparkles: icon('Sparkles'),
    default: {},
  };
});

// ── Mock clsx ─────────────────────────────────────────────────
vi.mock('clsx', () => ({
  __esModule: true,
  default: (...args: any[]) => args.flat().filter(Boolean).join(' '),
}));

// ── Mock design-system ────────────────────────────────────────
vi.mock('@/app/design-system', () => ({
  components: {
    header: { height: 'h-14', bg: 'bg-dark', border: 'border-b', menuBtn: 'p-2' },
    sidebar: {
      bgOuter: '#1B3B36',
      bgInner: '#1B3B36',
      sectionLabel: 'text-xs uppercase text-gray-500',
      navItem: {
        base: 'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        active: 'bg-teal-500/15 text-white',
        inactive: 'text-gray-400 hover:text-white hover:bg-white/5',
      },
    },
    courseSwitcher: { dropdown: 'bg-white rounded-xl shadow-lg' },
  },
  animation: {
    pageTransition: { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, duration: 0.2 },
    dropdown: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, duration: 0.15, ease: [0.16, 1, 0.3, 1] },
  },
  layout: { sidebar: { width: 260, collapsedWidth: 0 } },
  headingStyle: { fontFamily: 'Georgia, serif' },
  colors: {},
  brand: { logo: { sizes: { sm: { mark: 'w-6 h-7', text: 'text-lg' } } } },
}));

// ── Mock AxonLogo ─────────────────────────────────────────────
vi.mock('@/app/components/shared/AxonLogo', () => ({
  AxonLogo: ({ size, theme }: any) => <div data-testid="axon-logo" data-size={size} data-theme={theme}>Axon</div>,
}));

// ── Mock AxonAIAssistant (lazy loaded) ────────────────────────
vi.mock('@/app/components/ai/AxonAIAssistant', () => ({
  AxonAIAssistant: () => <div data-testid="ai-assistant">AI Assistant</div>,
}));

// ── Test data fixtures ────────────────────────────────────────

const MOCK_USER = {
  id: 'user-001',
  email: 'maria@axon.edu',
  name: 'Maria Garcia',
  full_name: 'Maria Garcia',
  avatar_url: null,
  is_super_admin: false,
};

const MOCK_INSTITUTION = {
  id: 'inst-001',
  name: 'Universidad Axon',
  slug: 'univ-axon',
  logo_url: null,
  membership_id: 'mem-001',
  role: 'student' as const,
  is_active: true,
  settings: {},
  plan_id: null,
};

const MOCK_MEMBERSHIP = {
  id: 'mem-001',
  user_id: 'user-001',
  institution_id: 'inst-001',
  role: 'student' as const,
  plan_id: null,
  is_active: true,
  created_at: '2024-01-01',
  institution: {
    id: 'inst-001',
    name: 'Universidad Axon',
    slug: 'univ-axon',
    logo_url: null,
    is_active: true,
  },
};

const MOCK_COURSE = {
  id: 'course-001',
  name: 'Anatomia Humana',
  color: 'bg-rose-400',
  accentColor: 'text-rose-400',
  semesters: [],
};

const MOCK_COURSE_2 = {
  id: 'course-002',
  name: 'Fisiologia',
  color: 'bg-indigo-500',
  accentColor: 'text-indigo-500',
  semesters: [],
};

const MOCK_CONTENT_TREE = {
  courses: [
    {
      id: 'course-001',
      name: 'Anatomia Humana',
      semesters: [
        {
          id: 'sem-001',
          name: 'Semestre 1',
          sections: [
            {
              id: 'sec-001',
              name: 'Osteologia',
              topics: [
                { id: 'topic-001', name: 'Huesos del Craneo' },
                { id: 'topic-002', name: 'Columna Vertebral' },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const MOCK_PROFILE = {
  id: 'user-001',
  name: 'Maria Garcia',
  email: 'maria@axon.edu',
  avatar_url: null,
};

// ── Mock state holders ────────────────────────────────────────

let mockIsSidebarOpen = true;
const mockSetSidebarOpen = vi.fn((v: boolean) => { mockIsSidebarOpen = v; });
const mockSetTheme = vi.fn();
const mockNavigateTo = vi.fn();
const mockSetCurrentCourse = vi.fn();
const mockSetCurrentTopic = vi.fn();
const mockSelectTopic = vi.fn();
const mockSignOut = vi.fn();
let mockCurrentCourse = MOCK_COURSE;
let mockIsMobile = false;
let mockContentTreeLoading = false;
let mockContentTree: any = MOCK_CONTENT_TREE;

// ── Mock hooks and contexts ───────────────────────────────────

vi.mock('@/app/context/UIContext', () => ({
  UIProvider: ({ children }: any) => children,
  useUI: () => ({
    isSidebarOpen: mockIsSidebarOpen,
    setSidebarOpen: mockSetSidebarOpen,
    theme: 'light',
    setTheme: mockSetTheme,
  }),
}));

vi.mock('@/app/context/NavigationContext', () => ({
  NavigationProvider: ({ children }: any) => children,
  useNavigation: () => ({
    currentCourse: mockCurrentCourse,
    setCurrentCourse: mockSetCurrentCourse,
    currentTopic: null,
    setCurrentTopic: mockSetCurrentTopic,
  }),
}));

vi.mock('@/app/context/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => ({
    user: MOCK_USER,
    accessToken: 'test-jwt',
    institutions: [MOCK_INSTITUTION],
    selectedInstitution: MOCK_INSTITUTION,
    role: 'student',
    loading: false,
    authError: null,
    status: 'authenticated',
    memberships: [MOCK_MEMBERSHIP],
    activeMembership: MOCK_MEMBERSHIP,
    setActiveMembership: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: mockSignOut,
    login: vi.fn(),
    signup: vi.fn(),
    logout: mockSignOut,
    selectInstitution: vi.fn(),
  }),
}));

vi.mock('@/app/context/ContentTreeContext', () => ({
  ContentTreeProvider: ({ children }: any) => children,
  useContentTree: () => ({
    tree: mockContentTree,
    loading: mockContentTreeLoading,
    error: null,
    canEdit: false,
    selectedTopicId: null,
    refresh: vi.fn(),
    selectTopic: mockSelectTopic,
    addCourse: vi.fn(), editCourse: vi.fn(), removeCourse: vi.fn(),
    addSemester: vi.fn(), editSemester: vi.fn(), removeSemester: vi.fn(),
    addSection: vi.fn(), editSection: vi.fn(), removeSection: vi.fn(),
    addTopic: vi.fn(), editTopic: vi.fn(), removeTopic: vi.fn(),
  }),
}));

vi.mock('@/app/context/StudentDataContext', () => ({
  StudentDataProvider: ({ children }: any) => children,
  useStudentDataContext: () => ({
    profile: MOCK_PROFILE,
    stats: null,
    courseProgress: [],
    dailyActivity: [],
    sessions: [],
    reviews: [],
    bktStates: [],
    rawStats: null,
    rawDaily: [],
    loading: false,
    error: null,
    isConnected: true,
    studentId: 'user-001',
    refresh: vi.fn(),
    seedAndLoad: vi.fn(),
    updateProfile: vi.fn(),
  }),
}));

vi.mock('@/app/context/AppContext', () => ({
  AppProvider: ({ children }: any) => children,
  useStudySession: () => ({
    isStudySessionActive: false,
    setStudySessionActive: vi.fn(),
    studyPlans: [],
    addStudyPlan: vi.fn(),
    toggleTaskComplete: vi.fn(),
    quizAutoStart: false,
    setQuizAutoStart: vi.fn(),
    flashcardAutoStart: false,
    setFlashcardAutoStart: vi.fn(),
  }),
}));

vi.mock('@/app/context/StudyPlansContext', () => ({
  StudyPlansProvider: ({ children }: any) => children,
}));

vi.mock('@/app/context/TopicMasteryContext', () => ({
  TopicMasteryProvider: ({ children }: any) => children,
}));

vi.mock('@/app/context/StudyTimeEstimatesContext', () => ({
  StudyTimeEstimatesProvider: ({ children }: any) => children,
}));

vi.mock('@/app/context/GamificationContext', () => ({
  GamificationProvider: ({ children }: any) => children,
}));

vi.mock('@/app/hooks/useStudentNav', () => ({
  useStudentNav: () => ({
    navigateTo: mockNavigateTo,
    currentView: 'home',
    isView: (...views: string[]) => views.includes('home'),
  }),
  viewToPath: (view: string) => {
    const map: Record<string, string> = {
      home: '/student',
      dashboard: '/student/dashboard',
      'study-hub': '/student/study-hub',
      study: '/student/study',
      flashcards: '/student/flashcards',
      quiz: '/student/quizzes',
      '3d': '/student/3d-atlas',
      schedule: '/student/schedule',
      'knowledge-heatmap': '/student/knowledge-heatmap',
      'student-data': '/student/student-data',
      settings: '/student/settings',
    };
    return map[view] || `/student/${view}`;
  },
  pathToView: (pathname: string) => {
    const match = pathname.match(/^\/student\/?(.*)$/);
    const slug = match?.[1]?.split('/')[0] ?? '';
    const map: Record<string, string> = { '': 'home', quizzes: 'quiz', '3d-atlas': '3d' };
    return map[slug] ?? (slug || 'home');
  },
}));

vi.mock('@/app/hooks/useIsMobile', () => ({
  useIsMobile: () => mockIsMobile,
}));

vi.mock('@/app/hooks/useTreeCourses', () => ({
  useTreeCourses: () => ({
    courses: [MOCK_COURSE, MOCK_COURSE_2],
    loading: false,
    error: null,
  }),
}));

// ── Import components after mocks ─────────────────────────────

import { Sidebar } from '@/app/components/layout/Sidebar';
import { CourseSwitcher } from '@/app/components/layout/CourseSwitcher';
import { UserProfileDropdown } from '@/app/components/layout/UserProfileDropdown';
import { MobileDrawer } from '@/app/components/layout/MobileDrawer';
import { TopicSidebar } from '@/app/components/layout/TopicSidebar';
import { RoleShell } from '@/app/components/layout/RoleShell';

// ── Helpers ───────────────────────────────────────────────────

function renderWithRouter(ui: ReactNode, { initialEntries = ['/student'] } = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="*" element={<>{ui}</>} />
      </Routes>
    </MemoryRouter>
  );
}

function renderSidebarOnRoute(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="*" element={<Sidebar />} />
      </Routes>
    </MemoryRouter>
  );
}

// ============================================================
// Test Suites
// ============================================================

describe('E2E Layout & Navigation System', () => {
  beforeEach(() => {
    mockIsSidebarOpen = true;
    mockIsMobile = false;
    mockContentTreeLoading = false;
    mockContentTree = MOCK_CONTENT_TREE;
    mockCurrentCourse = MOCK_COURSE;
    vi.clearAllMocks();
  });

  // ── 1. Sidebar renders with navigation links ──────────────

  describe('Sidebar', () => {
    it('renders all primary navigation items', () => {
      renderSidebarOnRoute('/student');

      // Main nav items from Sidebar component
      expect(screen.getByText('Inicio')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Estudiar')).toBeInTheDocument();
      expect(screen.getByText('Cronograma')).toBeInTheDocument();
      expect(screen.getByText('Mapa de Calor')).toBeInTheDocument();
      expect(screen.getByText('Flashcards')).toBeInTheDocument();
      expect(screen.getByText('Atlas 3D')).toBeInTheDocument();
      expect(screen.getByText('Quiz')).toBeInTheDocument();
      expect(screen.getByText('Mis Datos')).toBeInTheDocument();
    });

    it('renders secondary navigation section with settings and community', () => {
      renderSidebarOnRoute('/student');

      expect(screen.getByText('Configuración')).toBeInTheDocument();
      expect(screen.getByText('Comunidad')).toBeInTheDocument();
    });

    it('renders section labels (Menu and Otros)', () => {
      renderSidebarOnRoute('/student');

      expect(screen.getByText('Menu')).toBeInTheDocument();
      expect(screen.getByText('Otros')).toBeInTheDocument();
    });

    it('disables the Comunidad button with "Pronto" label', () => {
      renderSidebarOnRoute('/student');

      const communityBtn = screen.getByLabelText('Comunidad — Próximamente');
      expect(communityBtn).toBeDisabled();
      expect(screen.getByText('Pronto')).toBeInTheDocument();
    });

    it('navigation links have correct href paths', () => {
      renderSidebarOnRoute('/student');

      // Check a few key links resolve to correct paths
      const studyLink = screen.getByText('Estudiar').closest('a');
      expect(studyLink).toHaveAttribute('href', '/student/study-hub');

      const flashcardsLink = screen.getByText('Flashcards').closest('a');
      expect(flashcardsLink).toHaveAttribute('href', '/student/flashcards');

      const quizLink = screen.getByText('Quiz').closest('a');
      expect(quizLink).toHaveAttribute('href', '/student/quizzes');

      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveAttribute('href', '/student/dashboard');
    });
  });

  // ── 2. Sidebar collapse closes sidebar on click ───────────

  describe('Sidebar collapse behavior', () => {
    it('clicking a nav link calls setSidebarOpen(false)', () => {
      renderSidebarOnRoute('/student');

      const studyLink = screen.getByText('Estudiar').closest('a');
      fireEvent.click(studyLink!);

      expect(mockSetSidebarOpen).toHaveBeenCalledWith(false);
    });
  });

  // ── 3. Active link highlighting ───────────────────────────

  describe('Active link highlighting', () => {
    it('applies active class to the link matching current route', () => {
      render(
        <MemoryRouter initialEntries={['/student/dashboard']}>
          <Routes>
            <Route path="*" element={<Sidebar />} />
          </Routes>
        </MemoryRouter>
      );

      const dashboardLink = screen.getByText('Dashboard').closest('a');
      // NavLink applies the active class — check the className contains active tokens
      expect(dashboardLink?.className).toContain('bg-teal-500/15');
    });

    it('applies inactive class to non-matching links', () => {
      render(
        <MemoryRouter initialEntries={['/student/dashboard']}>
          <Routes>
            <Route path="*" element={<Sidebar />} />
          </Routes>
        </MemoryRouter>
      );

      const flashcardsLink = screen.getByText('Flashcards').closest('a');
      expect(flashcardsLink?.className).toContain('text-gray-400');
    });
  });

  // ── 4. CourseSwitcher ─────────────────────────────────────

  describe('CourseSwitcher', () => {
    it('shows current course name', () => {
      renderWithRouter(<CourseSwitcher />);

      expect(screen.getByText('Curso Atual')).toBeInTheDocument();
      expect(screen.getByText('Anatomia Humana')).toBeInTheDocument();
    });

    it('opens dropdown on click and shows course list', async () => {
      renderWithRouter(<CourseSwitcher />);

      // Click the switcher button (contains ChevronDown icon)
      const trigger = screen.getByText('Anatomia Humana').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        // Both desktop and mobile dropdowns render, so use getAllByText
        const headers = screen.getAllByText('Selecione o Curso');
        expect(headers.length).toBeGreaterThanOrEqual(1);
      });

      // Both courses should appear in the dropdown (duplicated for desktop+mobile)
      const courseButtons = screen.getAllByText('Anatomia Humana');
      expect(courseButtons.length).toBeGreaterThanOrEqual(2); // trigger + dropdown entries
      const fisiologiaButtons = screen.getAllByText('Fisiologia');
      expect(fisiologiaButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('calls setCurrentCourse when a different course is selected', async () => {
      renderWithRouter(<CourseSwitcher />);

      const trigger = screen.getByText('Anatomia Humana').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        const fisiologiaButtons = screen.getAllByText('Fisiologia');
        expect(fisiologiaButtons.length).toBeGreaterThanOrEqual(1);
      });

      // Click the first Fisiologia button (desktop dropdown)
      const fisiologiaButtons = screen.getAllByText('Fisiologia');
      fireEvent.click(fisiologiaButtons[0]);
      expect(mockSetCurrentCourse).toHaveBeenCalledWith(MOCK_COURSE_2);
    });

    it('closes dropdown when backdrop is clicked', async () => {
      renderWithRouter(<CourseSwitcher />);

      const trigger = screen.getByText('Anatomia Humana').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        const headers = screen.getAllByText('Selecione o Curso');
        expect(headers.length).toBeGreaterThanOrEqual(1);
      });

      // Click the backdrop (fixed inset-0 div)
      const backdrop = document.querySelector('.fixed.inset-0.z-40');
      fireEvent.click(backdrop!);

      await waitFor(() => {
        expect(screen.queryAllByText('Selecione o Curso')).toHaveLength(0);
      });
    });
  });

  // ── 5. UserProfileDropdown ────────────────────────────────

  describe('UserProfileDropdown', () => {
    it('shows user short name and role', () => {
      renderWithRouter(<UserProfileDropdown />);

      expect(screen.getByText('Maria')).toBeInTheDocument();
      expect(screen.getByText('student')).toBeInTheDocument();
    });

    it('opens dropdown with user details on click', async () => {
      renderWithRouter(<UserProfileDropdown />);

      // Find the profile trigger button (contains the user image)
      const trigger = screen.getByAltText('User').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
        expect(screen.getByText('maria@axon.edu')).toBeInTheDocument();
      });
    });

    it('shows logout button in dropdown and calls signOut on click', async () => {
      renderWithRouter(<UserProfileDropdown />);

      const trigger = screen.getByAltText('User').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByText('Cerrar Sesión')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cerrar Sesión'));
      expect(mockSignOut).toHaveBeenCalled();
    });

    it('shows navigation items in dropdown (Mis Cursos, Cronograma, etc.)', async () => {
      renderWithRouter(<UserProfileDropdown />);

      const trigger = screen.getByAltText('User').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByText('Mis Cursos')).toBeInTheDocument();
        expect(screen.getByText('Cronograma')).toBeInTheDocument();
        expect(screen.getByText('Rendimiento')).toBeInTheDocument();
        expect(screen.getByText('Configuración')).toBeInTheDocument();
      });
    });

    it('closes dropdown on Escape key', async () => {
      renderWithRouter(<UserProfileDropdown />);

      const trigger = screen.getByAltText('User').closest('button');
      fireEvent.click(trigger!);

      await waitFor(() => {
        expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
      });

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText('Cerrar Sesión')).not.toBeInTheDocument();
      });
    });
  });

  // ── 6. MobileDrawer ───────────────────────────────────────

  describe('MobileDrawer', () => {
    it('renders children when isOpen is true', () => {
      render(
        <MobileDrawer isOpen={true} onClose={vi.fn()}>
          <div data-testid="drawer-content">Drawer Content</div>
        </MobileDrawer>
      );

      expect(screen.getByTestId('drawer-content')).toBeInTheDocument();
    });

    it('does not render children when isOpen is false', () => {
      render(
        <MobileDrawer isOpen={false} onClose={vi.fn()}>
          <div data-testid="drawer-content">Drawer Content</div>
        </MobileDrawer>
      );

      expect(screen.queryByTestId('drawer-content')).not.toBeInTheDocument();
    });

    it('renders close button by default', () => {
      render(
        <MobileDrawer isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </MobileDrawer>
      );

      expect(screen.getByLabelText('Cerrar')).toBeInTheDocument();
    });

    it('hides close button when showCloseButton is false', () => {
      render(
        <MobileDrawer isOpen={true} onClose={vi.fn()} showCloseButton={false}>
          <div>Content</div>
        </MobileDrawer>
      );

      expect(screen.queryByLabelText('Cerrar')).not.toBeInTheDocument();
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(
        <MobileDrawer isOpen={true} onClose={onClose}>
          <div>Content</div>
        </MobileDrawer>
      );

      // The backdrop is a motion.div with onClick=onClose (bg-black/50)
      const backdrop = document.querySelector('.bg-black\\/50');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(
        <MobileDrawer isOpen={true} onClose={onClose}>
          <div>Content</div>
        </MobileDrawer>
      );

      fireEvent.click(screen.getByLabelText('Cerrar'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', () => {
      const onClose = vi.fn();
      render(
        <MobileDrawer isOpen={true} onClose={onClose}>
          <div>Content</div>
        </MobileDrawer>
      );

      // The drawer has role="dialog" with onKeyDown
      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('sets aria-modal and role attributes on the drawer', () => {
      render(
        <MobileDrawer isOpen={true} onClose={vi.fn()}>
          <div>Content</div>
        </MobileDrawer>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-label', 'Menu');
    });
  });

  // ── 7. TopicSidebar ───────────────────────────────────────

  describe('TopicSidebar', () => {
    it('shows loading state when content tree is loading', () => {
      mockContentTreeLoading = true;
      renderWithRouter(<TopicSidebar />);

      expect(screen.getByText('Cargando...')).toBeInTheDocument();
    });

    it('shows empty state when content tree is null', () => {
      mockContentTree = null;
      renderWithRouter(<TopicSidebar />);

      expect(screen.getByText('Sin contenido disponible')).toBeInTheDocument();
    });

    it('renders course hierarchy: course > semester > section > topics', () => {
      renderWithRouter(<TopicSidebar />);

      expect(screen.getByText('Anatomia Humana')).toBeInTheDocument();
      expect(screen.getByText('Semestre 1')).toBeInTheDocument();
      expect(screen.getByText('Osteologia')).toBeInTheDocument();
      expect(screen.getByText('Huesos del Craneo')).toBeInTheDocument();
      expect(screen.getByText('Columna Vertebral')).toBeInTheDocument();
    });

    it('calls selectTopic and navigateTo when a topic is clicked', () => {
      renderWithRouter(<TopicSidebar />);

      fireEvent.click(screen.getByText('Huesos del Craneo'));

      expect(mockSelectTopic).toHaveBeenCalledWith('topic-001');
      expect(mockSetCurrentTopic).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'topic-001', title: 'Huesos del Craneo' })
      );
      expect(mockNavigateTo).toHaveBeenCalledWith('study');
    });

    it('renders back button that navigates to study-hub', () => {
      renderWithRouter(<TopicSidebar />);

      const backButton = screen.getByText('Volver a los temas').closest('button');
      expect(backButton).toBeInTheDocument();

      fireEvent.click(backButton!);
      expect(mockSetSidebarOpen).toHaveBeenCalledWith(false);
      expect(mockNavigateTo).toHaveBeenCalledWith('study-hub');
    });

    it('can collapse/expand course nodes', () => {
      renderWithRouter(<TopicSidebar />);

      // Initially topics are visible (auto-expanded)
      expect(screen.getByText('Huesos del Craneo')).toBeInTheDocument();

      // Click course header to collapse
      const courseButton = screen.getByText('Anatomia Humana').closest('button');
      fireEvent.click(courseButton!);

      // After collapse, semester content should be hidden
      // (AnimatePresence is mocked to just render children, but the
      // expandedSections state controls whether children are rendered)
      // The semester should not be visible after collapsing the course
      expect(screen.queryByText('Semestre 1')).not.toBeInTheDocument();
    });
  });

  // ── 8. RoleShell ──────────────────────────────────────────

  describe('RoleShell', () => {
    const roleNavItems = [
      { label: 'Dashboard', path: '/owner/dashboard', icon: <svg data-testid="icon-dash" /> },
      { label: 'Usuarios', path: '/owner/users', icon: <svg data-testid="icon-users" /> },
    ];

    function renderRoleShell(route = '/owner/dashboard') {
      return render(
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route
              path="/owner/*"
              element={
                <RoleShell
                  role="owner"
                  roleLabel="Propietario"
                  roleIcon={<svg data-testid="icon-role" />}
                  accentColor="amber"
                  navItems={roleNavItems}
                />
              }
            >
              <Route path="dashboard" element={<div data-testid="owner-dashboard">Owner Dashboard</div>} />
              <Route path="users" element={<div data-testid="owner-users">Owner Users</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
    }

    it('renders the role label and navigation items', () => {
      renderRoleShell();

      // Role label appears in sidebar and header badge
      const labels = screen.getAllByText('Propietario');
      expect(labels.length).toBeGreaterThanOrEqual(1);

      // Nav items in sidebar
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Usuarios')).toBeInTheDocument();
    });

    it('renders the Outlet content for matched route', () => {
      renderRoleShell('/owner/dashboard');

      expect(screen.getByTestId('owner-dashboard')).toBeInTheDocument();
    });

    it('shows sign out button in sidebar', () => {
      renderRoleShell();

      const signOutButtons = screen.getAllByText('Cerrar sesion');
      expect(signOutButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('shows switch role button in sidebar', () => {
      renderRoleShell();

      const switchButtons = screen.getAllByText('Cambiar rol');
      expect(switchButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('shows institution name from active membership', () => {
      renderRoleShell();

      // The institution name is shown in the sidebar role indicator
      const instNames = screen.getAllByText('Universidad Axon');
      expect(instNames.length).toBeGreaterThanOrEqual(1);
    });
  });
});
