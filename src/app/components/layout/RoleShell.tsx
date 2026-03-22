// ============================================================
// Axon — Role Shell (RESPONSIVE VERSION v2)
// Shared layout for owner/admin/professor
//
// Fixes from v1:
//   - P1: Auto-close sidebar on route change (useEffect)
//   - P2: Uses MobileDrawer (no duplication of overlay pattern)
//   - P2: Body scroll lock via MobileDrawer
//   - Extracted SidebarContent to avoid JSX-in-variable anti-pattern
// ============================================================
import React, { useState, useCallback, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router';
import { useAuth } from '@/app/context/AuthContext';
import { AxonLogo } from '@/app/components/shared/AxonLogo';
import { MobileDrawer } from '@/app/components/layout/MobileDrawer';
import {
  Menu, LogOut, ArrowLeftRight, X,
} from 'lucide-react';

export interface NavItemConfig {
  label: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
}

export interface RoleShellProps {
  role: 'owner' | 'admin' | 'professor';
  roleLabel: string;
  roleIcon: React.ReactNode;
  accentColor: string;
  navItems: NavItemConfig[];
}

const ACCENT_CLASSES: Record<string, { sidebar: string; activeNav: string; badge: string; headerBadge: string }> = {
  amber: {
    sidebar: 'from-amber-950 via-[#1B3B36] to-[#1a2e2a]',
    activeNav: 'bg-amber-500/15 text-amber-400 border-l-amber-500',
    badge: 'bg-amber-500/20 text-amber-400',
    headerBadge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  blue: {
    sidebar: 'from-blue-950 via-[#1B3B36] to-[#1a2e2a]',
    activeNav: 'bg-blue-500/15 text-blue-400 border-l-blue-500',
    badge: 'bg-blue-500/20 text-blue-400',
    headerBadge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  purple: {
    sidebar: 'from-purple-950 via-[#1B3B36] to-[#1a2e2a]',
    activeNav: 'bg-purple-500/15 text-purple-400 border-l-purple-500',
    badge: 'bg-purple-500/20 text-purple-400',
    headerBadge: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  },
};

/** Sidebar content — extracted as a component to avoid JSX-in-variable */
function RoleSidebarContent({
  accent,
  roleLabel,
  roleIcon,
  navItems,
  institutionName,
  onNavClick,
  onSwitchRole,
  onSignOut,
}: {
  accent: typeof ACCENT_CLASSES[string];
  roleLabel: string;
  roleIcon: React.ReactNode;
  navItems: NavItemConfig[];
  institutionName: string;
  onNavClick: () => void;
  onSwitchRole: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className={`h-full bg-gradient-to-b ${accent.sidebar} flex flex-col w-[260px]`}>
      {/* Logo */}
      <div className="h-14 flex items-center px-5 shrink-0 border-b border-white/[0.06]">
        <AxonLogo size="sm" theme="light" />
      </div>

      {/* Role indicator */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent.badge}`}>
            {roleIcon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white/80 uppercase tracking-wider">{roleLabel}</p>
            <p className="text-[10px] text-white/40 truncate">{institutionName}</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 overscroll-contain">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path.split('/').length <= 2}
            onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all border-l-2 min-h-[44px] ${
                isActive
                  ? `${accent.activeNav}`
                  : 'border-l-transparent text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
              }`
            }
          >
            <span className="shrink-0">{item.icon}</span>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${accent.badge}`}>
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: Switch Role + User */}
      <div className="border-t border-white/[0.06] p-3 space-y-1">
        <button
          onClick={onSwitchRole}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all text-[12px] min-h-[44px]"
        >
          <ArrowLeftRight size={14} />
          <span>Cambiar rol</span>
        </button>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/[0.06] transition-all text-[12px] min-h-[44px]"
        >
          <LogOut size={14} />
          <span>Cerrar sesion</span>
        </button>
      </div>
    </div>
  );
}

export function RoleShell({ role, roleLabel, roleIcon, accentColor, navItems }: RoleShellProps) {
  const { user, activeMembership, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const accent = ACCENT_CLASSES[accentColor] || ACCENT_CLASSES.blue;

  // Auto-close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const handleSwitchRole = () => {
    navigate('/select-org', { replace: true });
  };

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const institutionName = activeMembership?.institution?.name || 'Institucion';

  const sidebarProps = {
    accent,
    roleLabel,
    roleIcon,
    navItems,
    institutionName,
    onNavClick: closeSidebar,
    onSwitchRole: handleSwitchRole,
    onSignOut: handleSignOut,
  };

  return (
    <div className="flex h-screen w-full bg-[#faf9f6] text-gray-900 font-sans overflow-hidden">
      
      {/* ── Desktop Sidebar (always visible on lg+) ── */}
      <div className="hidden lg:flex shrink-0">
        <RoleSidebarContent {...sidebarProps} />
      </div>

      {/* ── Mobile Sidebar Drawer ── */}
      <MobileDrawer
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        width={260}
        zIndex={40}
      >
        <RoleSidebarContent {...sidebarProps} />
      </MobileDrawer>

      {/* ── Main Column ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-3 lg:px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
            >
              <Menu size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            {/* Role badge */}
            <span className={`inline-flex items-center gap-1 lg:gap-1.5 px-2 lg:px-2.5 py-1 rounded-full border text-xs font-semibold ${accent.headerBadge}`}>
              {roleIcon}
              <span className="hidden sm:inline">{roleLabel}</span>
            </span>

            {/* User */}
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'Usuario'}</p>
                <p className="text-[10px] text-gray-400">{user?.email}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
