import React from 'react';
import { NavLink } from 'react-router';
import { useApp } from '@/app/context/AppContext';
import { viewToPath, type ViewType } from '@/app/hooks/useStudentNav';
import { components, animation, layout } from '@/app/design-system';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Layers, 
  Box, 
  GraduationCap, 
  Settings, 
  Users,
  Calendar,
  Home,
  Database,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';

interface NavItem {
  id: ViewType;
  label: string;
  icon: LucideIcon;
  /** Extra views that should highlight this nav item (e.g. study-hub highlights on study too) */
  also?: ViewType[];
}

export function Sidebar() {
  const { isSidebarOpen, setSidebarOpen, currentCourse } = useApp();

  const navItems: NavItem[] = [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'study-hub', label: 'Estudar', icon: BookOpen, also: ['study'] },
    { id: 'schedule', label: 'Cronograma', icon: Calendar },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: '3d', label: 'Atlas 3D', icon: Box },
    { id: 'quiz', label: 'Quiz', icon: GraduationCap },
    { id: 'student-data', label: 'Meus Dados', icon: Database },
  ];

  const secondaryItems: NavItem[] = [
    { id: 'home' as ViewType, label: 'Comunidade', icon: Users },
    { id: 'home' as ViewType, label: 'Configuracoes', icon: Settings },
  ];

  return (
    <motion.aside
      initial={{ width: layout.sidebar.width }}
      animate={{ width: isSidebarOpen ? layout.sidebar.width : layout.sidebar.collapsedWidth }}
      className="h-full border-r border-white/5 flex flex-col overflow-hidden relative shrink-0 z-10"
      style={{ backgroundColor: components.sidebar.bgOuter }}
    >
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6" style={{ backgroundColor: components.sidebar.bgInner }}>
        
        {/* Main Navigation */}
        <div className="space-y-1">
          <p className={components.sidebar.sectionLabel}>Menu</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const to = viewToPath(item.id);
            // 'end' makes the NavLink match exactly for the index route
            const isEnd = item.id === 'home';
            // For study-hub, also highlight when on /student/study
            const alsoPatterns = item.also?.map(v => viewToPath(v)) ?? [];

            return (
              <NavLink
                key={item.id}
                to={to}
                end={isEnd}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => {
                  // Check if any "also" path is active via the URL
                  const alsoActive = alsoPatterns.length > 0 && typeof window !== 'undefined'
                    ? alsoPatterns.some(p => window.location.pathname.startsWith(p))
                    : false;
                  const active = isActive || alsoActive;

                  return clsx(
                    components.sidebar.navItem.base,
                    active
                      ? clsx(components.sidebar.navItem.active, currentCourse.accentColor.replace('text-', 'text-'))
                      : components.sidebar.navItem.inactive
                  );
                }}
              >
                {({ isActive }) => {
                  const alsoActive = alsoPatterns.length > 0 && typeof window !== 'undefined'
                    ? alsoPatterns.some(p => window.location.pathname.startsWith(p))
                    : false;
                  const active = isActive || alsoActive;

                  return (
                    <>
                      <Icon size={20} className={active ? "text-current" : "text-gray-500 group-hover:text-white"} />
                      <span>{item.label}</span>
                      {active && (
                        <motion.div
                          layoutId="active-nav-indicator"
                          className={clsx("ml-auto w-1.5 h-1.5 rounded-full", currentCourse.color)}
                        />
                      )}
                    </>
                  );
                }}
              </NavLink>
            );
          })}
        </div>

        {/* Secondary Navigation */}
        <div className="space-y-1">
          <p className={components.sidebar.sectionLabel}>Outros</p>
          {secondaryItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={`secondary-${idx}`}
                className={clsx(components.sidebar.navItem.base, components.sidebar.navItem.inactive)}
              >
                <Icon size={20} className="text-gray-500 group-hover:text-white" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.aside>
  );
}
