// ============================================================
// Axon — Sidebar (RESPONSIVE VERSION v2)
//
// This component is "dumb" about its container:
//   - Desktop: rendered inside a motion.div that handles collapse
//   - Mobile:  rendered inside MobileDrawer overlay
//
// Fixes from v1:
//   - Removed unused imports (animation, layout)
//   - Removed redundant lg:w-[260px] (parent controls width)
//   - Added min-h-[44px] touch targets on all nav items
// ============================================================
import React from 'react';
import { NavLink } from 'react-router';
import { useUI } from '@/app/context/UIContext';
import { useNavigation } from '@/app/context/NavigationContext';
import { viewToPath, type ViewType } from '@/app/hooks/useStudentNav';
import { components } from '@/app/design-system';
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
  Flame,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';

interface NavItem {
  id: ViewType;
  label: string;
  icon: LucideIcon;
  also?: ViewType[];
}

export function Sidebar() {
  const { isSidebarOpen, setSidebarOpen } = useUI();
  const { currentCourse } = useNavigation();

  const navItems: NavItem[] = [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'study-hub', label: 'Estudiar', icon: BookOpen, also: ['study'] },
    { id: 'schedule', label: 'Cronograma', icon: Calendar },
    { id: 'knowledge-heatmap', label: 'Mapa de Calor', icon: Flame },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: '3d', label: 'Atlas 3D', icon: Box },
    { id: 'quiz', label: 'Quiz', icon: GraduationCap },
    { id: 'student-data', label: 'Mis Datos', icon: Database },
  ];

  const secondaryItems: NavItem[] = [
    { id: 'home' as ViewType, label: 'Comunidad', icon: Users },
  ];

  const settingsItem: NavItem = { id: 'settings', label: 'Configuración', icon: Settings };

  return (
    <aside
      className="h-full w-[260px] border-r border-white/5 flex flex-col overflow-hidden relative shrink-0 z-10"
      style={{ backgroundColor: components.sidebar.bgOuter }}
    >
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6 overscroll-contain" style={{ backgroundColor: components.sidebar.bgInner }}>
        
        {/* Main Navigation */}
        <div className="space-y-1">
          <p className={components.sidebar.sectionLabel}>Menu</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const to = viewToPath(item.id);
            const isEnd = item.id === 'home';
            const alsoPatterns = item.also?.map(v => viewToPath(v)) ?? [];

            return (
              <NavLink
                key={item.id}
                to={to}
                end={isEnd}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => {
                  const alsoActive = alsoPatterns.length > 0 && typeof window !== 'undefined'
                    ? alsoPatterns.some(p => window.location.pathname.startsWith(p))
                    : false;
                  const active = isActive || alsoActive;

                  return clsx(
                    components.sidebar.navItem.base,
                    'min-h-[44px]',
                    active
                      ? clsx(components.sidebar.navItem.active, currentCourse.accentColor || '')
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
                      <Icon size={20} className={active ? "text-current" : "text-[#8fbfb3] group-hover:text-white"} />
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
          <p className={components.sidebar.sectionLabel}>Otros</p>
          {/* Settings — active NavLink */}
          {(() => {
            const SettingsIcon = settingsItem.icon;
            const settingsTo = viewToPath(settingsItem.id);
            return (
              <NavLink
                key="settings"
                to={settingsTo}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    components.sidebar.navItem.base,
                    'min-h-[44px]',
                    isActive
                      ? clsx(components.sidebar.navItem.active, currentCourse.accentColor || '')
                      : components.sidebar.navItem.inactive
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <SettingsIcon size={20} className={isActive ? "text-current" : "text-gray-500 group-hover:text-white"} />
                    <span>{settingsItem.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="active-nav-indicator"
                        className={clsx("ml-auto w-1.5 h-1.5 rounded-full", currentCourse.color)}
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })()}

          {/* Disabled secondary items */}
          {secondaryItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={`secondary-${idx}`}
                disabled
                aria-label={`${item.label} — Próximamente`}
                title="Próximamente"
                className={clsx(
                  components.sidebar.navItem.base,
                  'min-h-[44px]',
                  components.sidebar.navItem.inactive,
                  'opacity-50 cursor-not-allowed'
                )}
              >
                <Icon size={20} className="text-[#8fbfb3]" />
                <span>{item.label}</span>
                <span className="ml-auto text-[9px] text-[#6db5a5]/50 uppercase tracking-wider">Pronto</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
