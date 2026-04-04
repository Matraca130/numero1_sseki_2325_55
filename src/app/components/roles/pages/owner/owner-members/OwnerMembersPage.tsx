/**
 * OwnerMembersPage — Main component.
 * Members management page for institution owners.
 */

import React, { useState, useMemo } from 'react';
import { usePlatformData } from '@/app/context/PlatformDataContext';
import { useAuth } from '@/app/context/AuthContext';
import { matchesSearch } from '@/app/components/shared/page-helpers';
import { toast, Toaster } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { Users, UserPlus, Search } from 'lucide-react';
import { ROLE_FILTERS } from './constants';
import type { RoleFilter } from './constants';
import { FadeIn, MembersSkeleton, MembersError, MembersEmpty, NoResults } from './MembersStates';
import { InviteMemberDialog, ChangeRoleDialog, ChangePlanDialog, DeleteMemberDialog } from './MembersDialogs';
import { AdminScopesDialog } from './AdminScopesDialog';
import { MembersTable } from './MembersTable';
import type { MemberListItem } from '@/app/types/platform';

export function OwnerMembersPage() {
  const { members, plans, institutionId, loading, error, refresh, refreshMembers, inviteMember, removeMember, toggleMember, changeRole } = usePlatformData();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [changeRoleTarget, setChangeRoleTarget] = useState<MemberListItem | null>(null);
  const [changePlanTarget, setChangePlanTarget] = useState<MemberListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MemberListItem | null>(null);
  const [scopesTarget, setScopesTarget] = useState<MemberListItem | null>(null);

  const filteredMembers = useMemo(() => {
    return members
      .filter(m => roleFilter === 'all' || m.role === roleFilter)
      .filter(m => matchesSearch(m, searchQuery))
      .sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return (a.name ?? '').localeCompare(b.name ?? '');
      });
  }, [members, roleFilter, searchQuery]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: members.length };
    for (const m of members) counts[m.role] = (counts[m.role] ?? 0) + 1;
    return counts;
  }, [members]);

  if (loading) return <MembersSkeleton />;
  if (error) return <MembersError message={error} onRetry={refresh} />;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      <Toaster position="top-right" richColors closeButton />

      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center"><Users size={18} /></div>
              <h1 className="text-xl font-bold text-gray-900">Miembros</h1>
              <Badge variant="secondary" className="text-xs tabular-nums">{members.length}</Badge>
            </div>
            <p className="text-sm text-gray-500">Gestiona administradores, profesores y estudiantes de tu institución</p>
          </div>
          <Button onClick={() => setInviteOpen(true)} className="gap-2 bg-amber-500 hover:bg-amber-600 self-start sm:self-auto">
            <UserPlus size={14} />Invitar miembro
          </Button>
        </div>
      </FadeIn>

      <FadeIn delay={0.06}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Buscar por nombre o email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ROLE_FILTERS.map((f) => {
              const count = roleCounts[f.value] ?? 0;
              const active = roleFilter === f.value;
              return (
                <button key={f.value} onClick={() => setRoleFilter(f.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                  {f.label}<span className={`tabular-nums ${active ? 'text-gray-300' : 'text-gray-400'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.12}>
        {members.length === 0 ? (
          <MembersEmpty onInvite={() => setInviteOpen(true)} />
        ) : filteredMembers.length === 0 ? (
          <NoResults query={searchQuery} role={roleFilter} />
        ) : (
          <MembersTable
            members={filteredMembers} totalCount={members.length} currentUserId={user?.id}
            onToggle={toggleMember} onOpenChangeRole={setChangeRoleTarget}
            onOpenChangePlan={setChangePlanTarget} onOpenDelete={setDeleteTarget}
            onOpenScopes={setScopesTarget} onRefresh={refreshMembers}
          />
        )}
      </FadeIn>

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} plans={plans} institutionId={institutionId ?? ''} onInvite={inviteMember} />
      <ChangeRoleDialog member={changeRoleTarget} open={changeRoleTarget !== null} onOpenChange={(v) => { if (!v) setChangeRoleTarget(null); }} onChangeRole={changeRole} />
      <ChangePlanDialog member={changePlanTarget} open={changePlanTarget !== null} onOpenChange={(v) => { if (!v) setChangePlanTarget(null); }} plans={plans} onRefresh={refreshMembers} />
      <DeleteMemberDialog member={deleteTarget} open={deleteTarget !== null} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }} onDelete={removeMember} />
      <AdminScopesDialog member={scopesTarget} open={scopesTarget !== null} onOpenChange={(v) => { if (!v) setScopesTarget(null); }} />
    </div>
  );
}
