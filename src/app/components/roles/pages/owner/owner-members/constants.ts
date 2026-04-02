/**
 * Constants for OwnerMembersPage.
 * Role configuration, filters, and assignable roles.
 */

import React from 'react';
import { Crown, Shield, BookOpen, GraduationCap } from 'lucide-react';
import type { MembershipRole } from '@/app/types/platform';

export type RoleFilter = MembershipRole | 'all';

export const ROLE_CONFIG: Record<MembershipRole, {
  label: string;
  icon: React.ReactNode;
  badgeClass: string;
  color: string;
}> = {
  owner:     { label: 'Owner',     icon: React.createElement(Crown, { size: 12 }),          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',   color: '#f59e0b' },
  admin:     { label: 'Admin',     icon: React.createElement(Shield, { size: 12 }),         badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',       color: '#3b82f6' },
  professor: { label: 'Profesor',  icon: React.createElement(BookOpen, { size: 12 }),       badgeClass: 'bg-purple-50 text-purple-700 border-purple-200', color: '#8b5cf6' },
  student:   { label: 'Estudiante', icon: React.createElement(GraduationCap, { size: 12 }), badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',       color: '#14b8a6' },
};

export const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: 'all',       label: 'Todos' },
  { value: 'owner',     label: 'Owners' },
  { value: 'admin',     label: 'Admins' },
  { value: 'professor', label: 'Profesores' },
  { value: 'student',   label: 'Estudiantes' },
];

export const ASSIGNABLE_ROLES: MembershipRole[] = ['admin', 'professor', 'student'];
