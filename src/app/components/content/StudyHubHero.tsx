// ============================================================
// Axon — StudyHubHero (MERGED: repo hero + FM study paths)
//
// ZONE 1: Dark teal HeroSection — greeting, continue-reading card, stats
//          (preserved from repo — zero functional changes)
// ZONE 2: Study paths — Videos | Resumenes cards
//          (added from Figma Make prototype)
//
// Layout: All containers use A4 page width (210mm = 794px)
// for a familiar document-like reading experience.
//
// God-component split (finding #22): HeroGreeting / HeroCtaCard /
// HeroStats extracted to ./study-hub/. StudyPathCard stays here
// (only used by this file).
// ============================================================
import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  BookOpen, ArrowRight, Video, FileText,
} from 'lucide-react';
import {
  HeroSection,
  focusRing,
} from '@/app/components/design-kit';
import { useMotionPresets } from '@/app/components/shared/FadeIn';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { axon, tint } from '@/app/lib/palette';

// Extracted subcomponents (god-component split)
import { HeroGreeting } from './study-hub/HeroGreeting';
import { HeroCtaCard } from './study-hub/HeroCtaCard';
import { HeroStats } from './study-hub/HeroStats';

// ── Default images (professor can override via props) ────────
const DEFAULT_VIDEO_IMAGE =
  'https://images.unsplash.com/photo-1666886573215-b59d8ad9970c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwZWR1Y2F0aW9uJTIwZGlnaXRhbCUyMHRhYmxldCUyMGFuYXRvbXklMjAzRHxlbnwxfHx8fDE3NzMzOTMzOTd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral';
const DEFAULT_SUMMARY_IMAGE =
  'https://images.unsplash.com/photo-1647708958244-8347e9b9b4ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwc3R1ZGVudCUyMHJlYWRpbmclMjBoaWdobGlnaHRlZCUyMHRleHRib29rJTIwbm90ZXN8ZW58MXx8fHwxNzczMzkzMzk3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral';

// ── Types ────────────────────────────────────────────────────

export interface TodayStats {
  minutes: number;
  summaries: number;
  flashcards: number;
  videos: number;
}

export interface StudyHubHeroProps {
  // ── From REPO (preserved) ──
  greeting: string;
  userName: string;
  effectiveTopic: { id: string; title: string } | null;
  isAutoSelected: boolean;
  heroReadingSessions: number;
  heroProgressPct: number;
  heroProgress: number; // 0-1
  heroLastActivity: string | undefined;
  estimatedRemaining: number | null;
  streakDays: number;
  courseName: string;
  sectionName: string;
  todayStats: TodayStats;
  studyMinutesToday: number;
  totalCardsReviewed: number;
  dailyGoalMinutes: number;
  onContinue: () => void;

  // ── From FM (added — all optional for backward compat) ──
  onGoToVideos?: () => void;
  onGoToSummaries?: () => void;
  videoImage?: string;
  summaryImage?: string;
}

// ══════════════════════════════════════════════════════════════
// StudyPathCard — (from Figma Make prototype)
// Renders a visual card with image, hover CTA, and study context.
// Used in ZONE 2 only — kept co-located because it has no reuse.
// ══════════════════════════════════════════════════════════════

function StudyPathCard({
  title,
  subtitle,
  ctaLabel,
  tagLabel,
  tagline,
  icon: Icon,
  imageSrc,
  accentColor,
  onClick,
  delay,
}: {
  title: string;
  subtitle: string;
  ctaLabel: string;
  tagLabel: string;
  tagline: string;
  icon: React.ElementType;
  imageSrc: string;
  accentColor: string;
  onClick?: () => void;
  delay: number;
}) {
  const shouldReduce = useReducedMotion();
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative w-full h-full overflow-hidden rounded-3xl text-left cursor-pointer ${focusRing}`}
      style={{
        backgroundColor: axon.cardBg,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: hovered ? tint.tealBorder : tint.neutralBorder,
        boxShadow: hovered
          ? `0 25px 50px -12px ${axon.darkTeal}30, 0 0 0 1px ${tint.tealBorder}`
          : '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'border-color 0.3s, box-shadow 0.4s',
      }}
      initial={shouldReduce ? false : { y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay }}
      whileHover={shouldReduce ? undefined : { y: -6 }}
    >
      {/* ── Image area ── */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `${accentColor}08` }}
        />
        <ImageWithFallback
          src={imageSrc}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
        />

        {/* Gradient scrim */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${axon.darkTeal}66 0%, transparent 50%, ${axon.darkTeal}0a 100%)`,
          }}
        />

        {/* Icon badge — top left */}
        <div
          className="absolute top-5 left-5 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
          style={{
            backgroundColor: `${accentColor}dd`,
            border: `1px solid ${accentColor}40`,
          }}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>

        {/* Tag badge — top right */}
        <div
          className="absolute top-5 right-5 text-[10px] tracking-wider px-3 py-1.5 rounded-full"
          style={{
            color: 'rgba(255,255,255,0.9)',
            backgroundColor: `${accentColor}55`,
            border: `1px solid ${accentColor}30`,
            fontWeight: 600,
            letterSpacing: '0.08em',
          }}
        >
          {tagLabel}
        </div>

        {/* Hover CTA overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-all duration-300"
          style={{
            opacity: hovered ? 1 : 0,
            backgroundColor: `${axon.darkTeal}22`,
          }}
        >
          <motion.div
            className="flex items-center gap-2.5 px-7 py-3.5 rounded-full text-white text-sm"
            style={{
              backgroundColor: accentColor,
              fontWeight: 600,
              boxShadow: `0 12px 40px -8px ${accentColor}80`,
            }}
            initial={false}
            animate={hovered ? { y: 0, opacity: 1, scale: 1 } : { y: 10, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Icon size={16} />
            {ctaLabel}
            <ArrowRight size={14} className="ml-0.5" />
          </motion.div>
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="p-6 pb-5">
        <h3
          className="text-lg tracking-tight mb-2 transition-colors duration-300"
          style={{ color: hovered ? axon.tealAccent : axon.darkTeal, fontWeight: 700 }}
        >
          {title}
        </h3>
        <p
          className="text-sm leading-relaxed line-clamp-2"
          style={{ color: tint.subtitleText }}
        >
          {subtitle}
        </p>

        {/* Footer — accent divider */}
        <div
          className="flex items-center justify-between mt-5 pt-4"
          style={{ borderTop: `1px solid ${hovered ? tint.tealBorder : tint.neutralBorder}`, transition: 'border-color 0.3s' }}
        >
          <span className="text-xs" style={{ color: tint.neutralText, fontWeight: 500 }}>
            {tagline}
          </span>
          <motion.div
            className="flex items-center gap-1.5 text-xs"
            style={{ color: accentColor, fontWeight: 600 }}
            animate={{ x: hovered ? 2 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {ctaLabel}
            <motion.div
              animate={{ x: hovered ? 4 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            >
              <ArrowRight size={14} />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.button>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════

export function StudyHubHero({
  greeting,
  userName,
  effectiveTopic,
  isAutoSelected,
  heroReadingSessions,
  heroProgressPct,
  heroProgress,
  heroLastActivity,
  estimatedRemaining,
  streakDays,
  courseName,
  sectionName,
  todayStats,
  studyMinutesToday,
  totalCardsReviewed,
  dailyGoalMinutes,
  onContinue,
  onGoToVideos,
  onGoToSummaries,
  videoImage,
  summaryImage,
}: StudyHubHeroProps) {
  const { fadeUp } = useMotionPresets();
  const shouldReduce = useReducedMotion();

  // Local fadeUp for ZONE 2 (study paths) — uses same pattern as useMotionPresets
  const fadeUpLocal = (delay: number) =>
    shouldReduce
      ? {}
      : {
          initial: { y: 20, opacity: 0 } as const,
          animate: { y: 0, opacity: 1 } as const,
          transition: { duration: 0.5, delay },
        };

  return (
    <>
      {/* ════════════════════════════════════════════════════════════
          ZONE 1: DARK TEAL HERO (from REPO — preserved 1:1)
          ════════════════════════════════════════════════════════════ */}
      <HeroSection>
        <div className="max-w-[210mm] mx-auto px-6 pt-10 pb-14">
          <HeroGreeting
            greeting={greeting}
            userName={userName}
            heroReadingSessions={heroReadingSessions}
            heroProgressPct={heroProgressPct}
            streakDays={streakDays}
            effectiveTopic={effectiveTopic}
            estimatedRemaining={estimatedRemaining}
            fadeUp={fadeUp}
          />

          <HeroCtaCard
            effectiveTopic={effectiveTopic}
            heroReadingSessions={heroReadingSessions}
            heroProgress={heroProgress}
            heroProgressPct={heroProgressPct}
            heroLastActivity={heroLastActivity}
            estimatedRemaining={estimatedRemaining}
            courseName={courseName}
            sectionName={sectionName}
            onContinue={onContinue}
            fadeUp={fadeUp}
          />

          <HeroStats
            todayStats={todayStats}
            studyMinutesToday={studyMinutesToday}
            totalCardsReviewed={totalCardsReviewed}
            dailyGoalMinutes={dailyGoalMinutes}
            fadeUp={fadeUp}
          />
        </div>
      </HeroSection>

      {/* ════════════════════════════════════════════════════════════
          ZONE 2: STUDY PATHS (from Figma Make — NEW)
          Topic-aware entry points: Videos | Resumenes
          ════════════════════════════════════════════════════════════ */}
      <div className="max-w-[210mm] mx-auto px-6 pt-8 pb-10">

        {effectiveTopic ? (
          <>
            {/* Context header — shows WHAT you're studying */}
            <motion.div
              className="flex items-center gap-3 mb-6"
              {...fadeUpLocal(0.25)}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: tint.tealBg, border: `1px solid ${tint.tealBorder}` }}
              >
                <BookOpen size={16} style={{ color: axon.tealAccent }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs tracking-wider" style={{ color: tint.neutralText, fontWeight: 600, letterSpacing: '0.08em' }}>
                  ESTUDIANDO AHORA
                </p>
                <p className="text-sm truncate" style={{ color: axon.darkTeal, fontWeight: 700 }}>
                  {effectiveTopic.title}
                </p>
              </div>
              {sectionName && (
                <span
                  className="text-[10px] px-2.5 py-1 rounded-full shrink-0 hidden sm:inline-flex"
                  style={{
                    backgroundColor: `${axon.tealAccent}10`,
                    color: axon.tealAccent,
                    border: `1px solid ${axon.tealAccent}20`,
                    fontWeight: 600,
                  }}
                >
                  {sectionName}
                </span>
              )}
            </motion.div>

            {/* Two smart study paths */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <StudyPathCard
                title="Ver Videos"
                subtitle={`Clases y explicaciones visuales sobre "${effectiveTopic.title}".`}
                ctaLabel="Ir a videos"
                tagLabel="CLASES"
                tagline={heroReadingSessions > 0 ? `${heroProgressPct}% completado` : 'Comienza aqui'}
                icon={Video}
                imageSrc={videoImage || DEFAULT_VIDEO_IMAGE}
                accentColor={axon.tealAccent}
                onClick={onGoToVideos}
                delay={0.3}
              />
              <StudyPathCard
                title="Leer Resumenes"
                subtitle={`Apuntes clave y resumen completo de "${effectiveTopic.title}".`}
                ctaLabel="Ir a resumenes"
                tagLabel="LECTURA"
                tagline={heroReadingSessions > 0 ? `${heroReadingSessions} sesion${heroReadingSessions !== 1 ? 'es' : ''}` : 'Material nuevo'}
                icon={FileText}
                imageSrc={summaryImage || DEFAULT_SUMMARY_IMAGE}
                accentColor={axon.darkTeal}
                onClick={onGoToSummaries}
                delay={0.4}
              />
            </div>

            {/* Quick-link: browse all */}
            <motion.div
              className="mt-5 flex justify-center"
              {...fadeUpLocal(0.5)}
            >
              <button
                onClick={onGoToSummaries}
                className="flex items-center gap-2 text-xs px-4 py-2 rounded-full transition-all cursor-pointer"
                style={{
                  color: tint.subtitleText,
                  backgroundColor: 'transparent',
                  border: `1px solid ${tint.neutralBorder}`,
                  fontWeight: 500,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = tint.tealBorder;
                  e.currentTarget.style.color = axon.tealAccent;
                  e.currentTarget.style.backgroundColor = tint.tealBg;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = tint.neutralBorder;
                  e.currentTarget.style.color = tint.subtitleText;
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Explorar todos los resumenes
                <ArrowRight size={12} />
              </button>
            </motion.div>
          </>
        ) : (
          /* No topic selected: discovery mode */
          <>
            <motion.p
              className="text-xs tracking-widest mb-5 ml-1"
              style={{ color: tint.neutralText, fontWeight: 600, letterSpacing: '0.1em' }}
              {...fadeUpLocal(0.3)}
            >
              ELIGE COMO ESTUDIAR
            </motion.p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <StudyPathCard
                title="Estudiar por Videos"
                subtitle="Clases grabadas, explicaciones visuales y demostraciones paso a paso del profesor."
                ctaLabel="Ver videos"
                tagLabel="CLASES"
                tagline="Aprende visualmente"
                icon={Video}
                imageSrc={videoImage || DEFAULT_VIDEO_IMAGE}
                accentColor={axon.tealAccent}
                onClick={onGoToVideos}
                delay={0.35}
              />
              <StudyPathCard
                title="Ir a Resumenes"
                subtitle="Notas organizadas, apuntes clave y resumenes completos para repasar a tu ritmo."
                ctaLabel="Leer resumenes"
                tagLabel="LECTURA"
                tagline="Lee a tu ritmo"
                icon={FileText}
                imageSrc={summaryImage || DEFAULT_SUMMARY_IMAGE}
                accentColor={axon.darkTeal}
                onClick={onGoToSummaries}
                delay={0.45}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
