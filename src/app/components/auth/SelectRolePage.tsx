// ============================================================
// Axon — Select Institution / Role Page (/select-org)
// When a user has multiple institutions, they pick which
// institution and role to use for this session.
// Dark mode, violet/indigo accent.
// ============================================================
import React from 'react';
import { useNavigate, Navigate } from 'react-router';
import { useAuth } from '@/app/context/AuthContext';
import type { Membership } from '@/app/services/authApi';
import { AxonLogo } from '@/app/components/shared/AxonLogo';
import { motion } from 'motion/react';
import {
  Crown, Shield, GraduationCap, BookOpen,
  ChevronRight, LogOut,
} from 'lucide-react';

const ROLE_ROUTES: Record<string, string> = {
  owner: '/owner',
  admin: '/admin',
  professor: '/professor',
  student: '/student',
};

const ROLE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string; border: string }> = {
  owner: {
    icon: <Crown size={20} />,
    label: 'Propietario',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  admin: {
    icon: <Shield size={20} />,
    label: 'Administrador',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  professor: {
    icon: <GraduationCap size={20} />,
    label: 'Profesor',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  student: {
    icon: <BookOpen size={20} />,
    label: 'Estudiante',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
  },
};

export function SelectRolePage() {
  const { user, memberships, institutions, selectInstitution, setActiveMembership, logout } = useAuth();
  const navigate = useNavigate();

  const handleSelect = (membership: Membership) => {
    setActiveMembership(membership);
    // Also select the institution via new API if available
    const inst = institutions.find(i => i.membership_id === membership.id);
    if (inst) {
      selectInstitution(inst);
    }
    const route = ROLE_ROUTES[membership.role] || '/student';
    navigate(route, { replace: true });
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // Auto-redirect if 0 or 1 membership
  if (memberships.length === 0) {
    return <Navigate to="/student" replace />;
  }
  if (memberships.length === 1) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <AxonLogo size="md" theme="light" />
          <h1 className="text-2xl text-white mt-6">
            Hola, {user?.name?.split(' ')[0] || 'Usuario'}
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Selecciona la institucion y el rol para esta sesion
          </p>
        </div>

        {/* Membership Cards */}
        <div className="space-y-3">
          {memberships.map((m, i) => {
            const config = ROLE_CONFIG[m.role] || ROLE_CONFIG.student;
            return (
              <motion.button
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => handleSelect(m)}
                className="w-full bg-zinc-900 rounded-xl border border-white/[0.06] p-4 hover:border-violet-500/30 hover:bg-zinc-800/80 transition-all group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${config.bg} ${config.border} ${config.color} shrink-0`}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white">
                        {m.institution?.name || 'Institucion'}
                      </span>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${config.bg} ${config.border} ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">
                      {m.institution?.slug ? `@${m.institution.slug}` : m.institution_id}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-zinc-600 group-hover:text-violet-400 transition-colors shrink-0" />
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Sign Out */}
        <div className="mt-6 text-center">
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={14} />
            <span>Cerrar sesion</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
