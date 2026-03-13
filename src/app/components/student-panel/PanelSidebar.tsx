// ============================================================
// Axon — Panel Left Sidebar Navigation
// Dark sidebar with logo + nav items for StudentDataPanel.
// Extracted from StudentDataPanel.tsx for modularization.
// ============================================================
import React from 'react';
import {
  GraduationCap,
  LayoutDashboard,
  Sparkles,
  ClipboardCheck,
  Library,
  Video,
  Image,
  LogOut,
} from 'lucide-react';
import { NavItem } from '@/app/components/shared/NavItem';

export function PanelSidebar() {
  return (
    <aside className="w-56 bg-[#2d3e50] text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-axon-accent flex items-center justify-center">
            <GraduationCap size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">AXON</h1>
            <p className="text-xs text-gray-400">MEDICAL ACADEMY</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active variant="panel" />
        <NavItem icon={<Sparkles size={20} />} label="IA Mentor" variant="panel" />
        <NavItem icon={<ClipboardCheck size={20} />} label="Evaluaciones" variant="panel" />
        <NavItem icon={<Library size={20} />} label="Biblioteca" variant="panel" />
        <NavItem icon={<Video size={20} />} label="Masterclasses" variant="panel" />
        <NavItem icon={<Image size={20} />} label="Atlas Visual" variant="panel" />
      </nav>

      {/* Logout */}
      <div className="p-4">
        <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors">
          <LogOut size={18} />
          <span>Cerrar Sesion</span>
        </button>
      </div>
    </aside>
  );
}