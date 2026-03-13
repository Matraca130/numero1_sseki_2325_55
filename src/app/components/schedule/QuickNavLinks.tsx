// ============================================================
// Axon — Quick Navigation Links (Schedule sidebar)
// Shared between DefaultScheduleView and StudyPlanDashboard
// ============================================================
import React from 'react';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { RotateCcw, BarChart3, Flame, Activity, ArrowRight } from 'lucide-react';

type Variant = 'light' | 'dark';

interface QuickNavLinksProps {
  variant?: Variant;
}

interface NavLinkDef {
  target: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  light: string;
  dark: string;
  iconBgLight: string;
  iconBgDark: string;
  arrowLight: string;
  arrowDark: string;
}

const NAV_LINKS: NavLinkDef[] = [
  {
    target: 'review-session',
    label: 'Sesion de Revision',
    sublabel: 'Repeticion espaciada',
    icon: <RotateCcw size={15} />,
    light: 'bg-violet-50 border-violet-100 text-violet-700 hover:bg-violet-100 hover:border-violet-200',
    dark: 'bg-violet-500/10 border-violet-500/20 text-violet-300 hover:bg-violet-500/20',
    iconBgLight: 'bg-violet-100 group-hover:bg-violet-200 text-violet-600',
    iconBgDark: 'bg-violet-500/20 group-hover:bg-violet-500/30 text-violet-400',
    arrowLight: 'text-violet-400',
    arrowDark: 'text-violet-400/50',
  },
  {
    target: 'study-dashboards',
    label: 'Dashboards de Estudio',
    sublabel: 'Rendimiento y metricas',
    icon: <BarChart3 size={15} />,
    light: 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-200',
    dark: 'bg-axon-accent/10 border-axon-accent/20 text-[#99d7c7] hover:bg-axon-accent/20',
    iconBgLight: 'bg-emerald-100 group-hover:bg-emerald-200 text-emerald-600',
    iconBgDark: 'bg-axon-accent/20 group-hover:bg-axon-accent/30 text-axon-accent',
    arrowLight: 'text-emerald-400',
    arrowDark: 'text-axon-accent/50',
  },
  {
    target: 'knowledge-heatmap',
    label: 'Mapa de Calor',
    sublabel: 'Mapa de calor de retencion',
    icon: <Flame size={15} />,
    light: 'bg-orange-50 border-orange-100 text-orange-700 hover:bg-orange-100 hover:border-orange-200',
    dark: 'bg-orange-500/10 border-orange-500/20 text-orange-300 hover:bg-orange-500/20',
    iconBgLight: 'bg-orange-100 group-hover:bg-orange-200 text-orange-600',
    iconBgDark: 'bg-orange-500/20 group-hover:bg-orange-500/30 text-orange-400',
    arrowLight: 'text-orange-400',
    arrowDark: 'text-orange-400/50',
  },
  {
    target: 'mastery-dashboard',
    label: 'Panel de Dominio',
    sublabel: 'Agenda diaria y tareas',
    icon: <Activity size={15} />,
    light: 'bg-axon-accent/10 border-axon-accent/20 text-[#99d7c7] hover:bg-axon-accent/20',
    dark: 'bg-axon-accent/10 border-axon-accent/20 text-[#99d7c7] hover:bg-axon-accent/20',
    iconBgLight: 'bg-axon-accent/20 group-hover:bg-axon-accent/30 text-axon-accent',
    iconBgDark: 'bg-axon-accent/20 group-hover:bg-axon-accent/30 text-axon-accent',
    arrowLight: 'text-axon-accent/50',
    arrowDark: 'text-axon-accent/50',
  },
];

export function QuickNavLinks({ variant = 'light' }: QuickNavLinksProps) {
  const { navigateTo } = useStudentNav();
  const isDark = variant === 'dark';

  return (
    <div className="space-y-2">
      <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
        Acceso rapido
      </p>
      {NAV_LINKS.map((link) => (
        <button
          key={link.target}
          onClick={() => navigateTo(link.target as any)}
          className={`w-full flex items-center gap-3 px-4 py-3 border rounded-xl text-sm font-semibold transition-all group ${isDark ? link.dark : link.light}`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isDark ? link.iconBgDark : link.iconBgLight}`}>
            {link.icon}
          </div>
          <div className="flex-1 text-left">
            <span className="block">{link.label}</span>
            <span className={`text-[10px] font-normal ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{link.sublabel}</span>
          </div>
          <ArrowRight size={14} className={`group-hover:translate-x-0.5 transition-transform ${isDark ? link.arrowDark : link.arrowLight}`} />
        </button>
      ))}
    </div>
  );
}