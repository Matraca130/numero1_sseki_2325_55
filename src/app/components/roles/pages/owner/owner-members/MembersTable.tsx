/**
 * MembersTable — Table rendering and row actions for OwnerMembersPage.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getInitials, formatDate } from '@/app/components/shared/page-helpers';
import { Button } from '@/app/components/ui/button';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/app/components/ui/table';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/app/components/ui/dropdown-menu';
import {
  MoreHorizontal, ArrowUpDown, Trash2, ToggleLeft, ToggleRight,
  CreditCard, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import type { MemberListItem } from '@/app/types/platform';
import { ROLE_CONFIG } from './constants';

// ── Member Row Actions ────────────────────────────────────

function MemberActions({
  member, currentUserId, onToggle,
  onOpenChangeRole, onOpenChangePlan, onOpenDelete, onOpenScopes,
}: {
  member: MemberListItem;
  currentUserId: string | undefined;
  onToggle: (memberId: string, active: boolean) => Promise<void>;
  onOpenChangeRole: (member: MemberListItem) => void;
  onOpenChangePlan: (member: MemberListItem) => void;
  onOpenDelete: (member: MemberListItem) => void;
  onOpenScopes: (member: MemberListItem) => void;
}) {
  const [toggling, setToggling] = useState(false);
  const isSelf = member.user_id === currentUserId;
  const canHaveScopes = member.role === 'admin' || member.role === 'professor';

  const handleToggle = async () => {
    setToggling(true);
    try {
      await onToggle(member.id, !member.is_active);
      toast.success(`${member.name || 'Miembro'} ${!member.is_active ? 'activado' : 'desactivado'}`);
    } catch (err: unknown) {
      toast.error(`Error al cambiar estado: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally { setToggling(false); }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Acciones del miembro"><MoreHorizontal size={14} /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-gray-400">Acciones</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onOpenChangeRole(member)} disabled={isSelf}><ArrowUpDown size={14} />Cambiar rol</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onOpenChangePlan(member)}><CreditCard size={14} />Cambiar plan</DropdownMenuItem>
        {canHaveScopes && <DropdownMenuItem onClick={() => onOpenScopes(member)}><ShieldCheck size={14} />Admin Scopes</DropdownMenuItem>}
        <DropdownMenuItem onClick={handleToggle} disabled={toggling || isSelf}>
          {member.is_active ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
          {toggling ? 'Cambiando...' : member.is_active ? 'Desactivar' : 'Activar'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onOpenDelete(member)} disabled={isSelf}><Trash2 size={14} />Eliminar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Member Row (memoized) ────────────────────────────────
//
// Extracted from the table body so a parent re-render (e.g. every
// search-input keystroke in OwnerMembersPage) doesn't re-render every
// row. All forwarded callbacks are already stable: toggleMember +
// setChangeRoleTarget/setChangePlanTarget/setDeleteTarget/setScopesTarget
// are useCallback'd in PlatformDataContext / page-level state setters.
// React.memo therefore actually holds — only rows whose member prop
// reference changes will re-render.

interface MemberRowProps {
  member: MemberListItem;
  currentUserId: string | undefined;
  onToggle: (memberId: string, active: boolean) => Promise<void>;
  onOpenChangeRole: (member: MemberListItem) => void;
  onOpenChangePlan: (member: MemberListItem) => void;
  onOpenDelete: (member: MemberListItem) => void;
  onOpenScopes: (member: MemberListItem) => void;
}

const MemberRow = React.memo(function MemberRow({
  member, currentUserId, onToggle,
  onOpenChangeRole, onOpenChangePlan, onOpenDelete, onOpenScopes,
}: MemberRowProps) {
  const roleCfg = ROLE_CONFIG[member.role];
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`border-b border-gray-50 transition-colors hover:bg-gray-50/50 ${!member.is_active ? 'opacity-60' : ''}`}
    >
      <TableCell className="pl-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-[11px] font-semibold" style={{ backgroundColor: `${roleCfg.color}15`, color: roleCfg.color }}>
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {member.name || 'Sin nombre'}
              {member.user_id === currentUserId && <span className="ml-1.5 text-[10px] font-bold text-amber-500">(tu)</span>}
            </p>
            <p className="text-xs text-gray-400 truncate">{member.email || '—'}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${roleCfg.badgeClass}`}>
          {roleCfg.icon}{roleCfg.label}
        </span>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <span className="text-sm text-gray-600 truncate block max-w-[140px]">
          {member.plan?.name ?? <span className="text-gray-300 italic">Sin plan</span>}
        </span>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        {member.is_active
          ? <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Activo</span>
          : <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400"><span className="w-1.5 h-1.5 rounded-full bg-gray-300" />Inactivo</span>
        }
      </TableCell>
      <TableCell className="hidden lg:table-cell"><span className="text-xs text-gray-500">{formatDate(member.created_at)}</span></TableCell>
      <TableCell className="text-right pr-6">
        <MemberActions member={member} currentUserId={currentUserId} onToggle={onToggle}
          onOpenChangeRole={onOpenChangeRole} onOpenChangePlan={onOpenChangePlan}
          onOpenDelete={onOpenDelete} onOpenScopes={onOpenScopes} />
      </TableCell>
    </motion.tr>
  );
});

// ── Members Table ─────────────────────────────────────────

interface MembersTableProps {
  members: MemberListItem[];
  totalCount: number;
  currentUserId: string | undefined;
  onToggle: (memberId: string, active: boolean) => Promise<void>;
  onOpenChangeRole: (member: MemberListItem) => void;
  onOpenChangePlan: (member: MemberListItem) => void;
  onOpenDelete: (member: MemberListItem) => void;
  onOpenScopes: (member: MemberListItem) => void;
  onRefresh: () => void;
}

export function MembersTable({
  members, totalCount, currentUserId, onToggle,
  onOpenChangeRole, onOpenChangePlan, onOpenDelete, onOpenScopes, onRefresh,
}: MembersTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-100 bg-gray-50/50">
            <TableHead className="text-xs text-gray-400 font-semibold uppercase tracking-wider pl-6">Miembro</TableHead>
            <TableHead className="text-xs text-gray-400 font-semibold uppercase tracking-wider hidden sm:table-cell">Rol</TableHead>
            <TableHead className="text-xs text-gray-400 font-semibold uppercase tracking-wider hidden md:table-cell">Plan</TableHead>
            <TableHead className="text-xs text-gray-400 font-semibold uppercase tracking-wider hidden sm:table-cell">Estado</TableHead>
            <TableHead className="text-xs text-gray-400 font-semibold uppercase tracking-wider hidden lg:table-cell">Registro</TableHead>
            <TableHead className="text-xs text-gray-400 font-semibold uppercase tracking-wider text-right pr-6 w-12"><span className="sr-only">Acciones</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence>
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                currentUserId={currentUserId}
                onToggle={onToggle}
                onOpenChangeRole={onOpenChangeRole}
                onOpenChangePlan={onOpenChangePlan}
                onOpenDelete={onOpenDelete}
                onOpenScopes={onOpenScopes}
              />
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>

      <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Mostrando <span className="font-semibold text-gray-600">{members.length}</span>
          {members.length !== totalCount && <> de <span className="font-semibold text-gray-600">{totalCount}</span></>} miembros
        </p>
        <button onClick={onRefresh} className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
          Refrescar
        </button>
      </div>
    </div>
  );
}
