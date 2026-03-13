// ============================================================
// Axon v4.4 — Badge Icon Resolver
//
// Sprint G2: Maps backend badge `icon` field (Lucide icon names)
// to actual Lucide React components.
//
// The seed migration uses these icon names:
//   Footprints, CalendarCheck, Flame, Zap, Crown, BookOpen,
//   Repeat, Cog, Trophy, Timer, Compass, Star, Award,
//   GraduationCap, Brain, MessageCircle, Search, BookMarked,
//   Users, Medal
//
// If a name is unknown, falls back to Award icon.
// ============================================================

import type { LucideIcon } from 'lucide-react';
import {
  Footprints,
  CalendarCheck,
  Flame,
  Zap,
  Crown,
  BookOpen,
  Repeat,
  Cog,
  Trophy,
  Timer,
  Compass,
  Star,
  Award,
  GraduationCap,
  Brain,
  MessageCircle,
  Search,
  BookMarked,
  Users,
  Medal,
  Shield,
  Heart,
  Target,
  Sparkles,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Footprints,
  CalendarCheck,
  Flame,
  Zap,
  Crown,
  BookOpen,
  Repeat,
  Cog,
  Trophy,
  Timer,
  Compass,
  Star,
  Award,
  GraduationCap,
  Brain,
  MessageCircle,
  Search,
  BookMarked,
  Users,
  Medal,
  Shield,
  Heart,
  Target,
  Sparkles,
};

/** Resolve a Lucide icon name to its React component. Falls back to Award. */
export function getBadgeIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] ?? Award;
}
