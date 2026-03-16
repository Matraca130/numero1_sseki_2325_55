// ============================================================
// FlashcardHubScreen — Flashcard Landing Page
//
// v4.5.1 UX AUDIT:
//   - Replaced wireframe SidebarPlaceholder with real stats widgets
//   - All text verified Spanish
//   - Better empty state
// ============================================================

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Section, Flashcard, Topic } from '@/app/types/content';
import { Layers, Brain, Target, Flame, TrendingUp, Award, Sparkles } from 'lucide-react';
import { FlashcardHero } from './FlashcardHero';
import { FlashcardDeckList, type FlashcardDeck } from './FlashcardDeckList';
import { getMasteryColorFromPct } from './mastery-colors';
import { ProgressBar } from './ProgressBar';

// ── Relative time formatter ──────────────────────────────────────────────

function relativeTime(dueAt: string | undefined): string | null {
  if (!dueAt) return null;
  const diff = Date.now() - new Date(dueAt).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 0) return null; // future
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}

// ── Build deck list from real data ───────────────────────────

function buildDecks(
  sections: Section[],
): FlashcardDeck[] {
  const now = new Date();
  const decks: FlashcardDeck[] = [];

  for (const section of sections) {
    for (const topic of section.topics) {
      const cards = topic.flashcards || [];
      if (cards.length === 0) continue;

      const masteredCards = cards.filter(c => c.mastery >= 4).length;
      const newCards = cards.filter(c => c.mastery === 0).length;

      const dueToday = cards.filter(c => {
        if (c.due_at && new Date(c.due_at) <= now) return true;
        if (c.mastery === 0) return true;
        return false;
      }).length;

      const accuracy =
        cards.length > 0
          ? Math.round((cards.reduce((s, c) => s + c.mastery, 0) / cards.length / 5) * 100)
          : 0;

      const reviewedDates = cards
        .map(c => c.due_at)
        .filter((d): d is string => !!d)
        .map(d => new Date(d).getTime())
        .filter(t => t <= now.getTime())
        .sort((a, b) => b - a);

      const lastReviewed = reviewedDates.length > 0
        ? relativeTime(new Date(reviewedDates[0]).toISOString())
        : null;

      decks.push({
        id: topic.id,
        topicName: topic.title,
        sectionName: section.title,
        totalCards: cards.length,
        dueToday,
        newCards,
        masteredCards,
        accuracy,
        lastReviewed,
        streakDays: 0,
      });
    }
  }

  decks.sort((a, b) => {
    if (a.dueToday > 0 && b.dueToday === 0) return -1;
    if (a.dueToday === 0 && b.dueToday > 0) return 1;
    return a.accuracy - b.accuracy;
  });

  return decks;
}

// ── Hero stats helper ────────────────────────────────────────

function useHeroStats(sections: Section[], allCards: Flashcard[]) {
  return useMemo(() => {
    const totalMastered = allCards.filter(c => c.mastery >= 4).length;
    const now = new Date();

    const totalDue = allCards.filter(c => {
      if (c.due_at && new Date(c.due_at) <= now) return true;
      if (c.mastery === 0) return true;
      return false;
    }).length;

    const totalNewCards = allCards.filter(c => c.mastery === 0).length;

    const globalAccuracy =
      allCards.length > 0
        ? Math.round(
            (allCards.reduce((s, c) => s + c.mastery, 0) / allCards.length / 5) * 100,
          )
        : 0;

    const topicHasDue = new Map<string, boolean>();
    for (const sec of sections) {
      for (const t of sec.topics) {
        const tCards = t.flashcards || [];
        const hasDue = tCards.some(c => {
          if (c.due_at && new Date(c.due_at) <= now) return true;
          if (c.mastery === 0) return true;
          return false;
        });
        topicHasDue.set(t.id, hasDue);
      }
    }
    const decksWithDue = Array.from(topicHasDue.values()).filter(Boolean).length;

    const allTopics = sections.flatMap(s => s.topics);
    const spineTopics = allTopics.slice(0, 8);
    const deckSpine = spineTopics.map(t => ({
      id: t.id,
      hasDue: topicHasDue.get(t.id) || false,
    }));
    while (deckSpine.length > 0 && deckSpine.length < 3) {
      deckSpine.push({ id: `pad-${deckSpine.length}`, hasDue: false });
    }

    return {
      totalDue,
      totalCards: allCards.length,
      totalMastered,
      globalAccuracy,
      longestStreak: 0,
      decksWithDue,
      totalNewCards,
      deckSpine,
    };
  }, [sections, allCards]);
}

// ── Stats sidebar widget (replaces wireframe placeholder) ──

function StatsSidebar({ sections, allCards }: { sections: Section[]; allCards: Flashcard[] }) {
  const stats = useMemo(() => {
    const totalMastered = allCards.filter(c => c.mastery >= 4).length;
    const learning = allCards.filter(c => c.mastery === 3).length;
    const newCards = allCards.filter(c => c.mastery <= 2).length;
    const globalPct = allCards.length > 0 ? totalMastered / allCards.length : 0;
    const globalColor = getMasteryColorFromPct(globalPct);

    // Per-section breakdown
    const sectionStats = sections.map(s => {
      const cards = s.topics.flatMap(t => t.flashcards || []);
      const mastered = cards.filter(c => c.mastery >= 4).length;
      const pct = cards.length > 0 ? mastered / cards.length : 0;
      return {
        id: s.id,
        title: s.title,
        totalCards: cards.length,
        mastered,
        pct,
        color: getMasteryColorFromPct(pct),
      };
    }).filter(s => s.totalCards > 0);

    // Top 3 weakest topics (by accuracy, ascending)
    const weakTopics = sections.flatMap(s =>
      s.topics.map(t => {
        const cards = t.flashcards || [];
        if (cards.length === 0) return null;
        const acc = cards.reduce((sum, c) => sum + c.mastery, 0) / cards.length / 5;
        return { id: t.id, title: t.title, accuracy: acc, totalCards: cards.length };
      })
    ).filter(Boolean).sort((a, b) => a!.accuracy - b!.accuracy).slice(0, 3) as { id: string; title: string; accuracy: number; totalCards: number }[];

    return { totalMastered, learning, newCards, globalPct, globalColor, sectionStats, weakTopics };
  }, [sections, allCards]);

  if (allCards.length === 0) return null;

  return (
    <div className="w-[320px] shrink-0 hidden lg:block">
      <div className="sticky top-8 space-y-4">

        {/* ── Dominio Global ── */}
        <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: stats.globalColor.hex + '20' }}>
              <Brain size={16} style={{ color: stats.globalColor.hex }} />
            </div>
            <div>
              <h4 className="text-sm text-gray-800" style={{ fontWeight: 600 }}>Dominio Global</h4>
              <p className="text-[11px] text-gray-400" style={{ fontWeight: 400 }}>{allCards.length} cards en total</p>
            </div>
          </div>

          {/* Mastery donut */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-16 h-16 shrink-0">
              <svg width="64" height="64" className="-rotate-90">
                <circle cx="32" cy="32" r="26" fill="none" stroke="#e4e4e7" strokeWidth="6" />
                <circle
                  cx="32" cy="32" r="26"
                  fill="none"
                  stroke={stats.globalColor.hex}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 26}
                  strokeDashoffset={2 * Math.PI * 26 * (1 - stats.globalPct)}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm text-gray-800" style={{ fontWeight: 700 }}>{Math.round(stats.globalPct * 100)}%</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-emerald-600" style={{ fontWeight: 500 }}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Dominadas
                </span>
                <span className="text-gray-700" style={{ fontWeight: 600 }}>{stats.totalMastered}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-amber-600" style={{ fontWeight: 500 }}>
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Aprendiendo
                </span>
                <span className="text-gray-700" style={{ fontWeight: 600 }}>{stats.learning}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-rose-500" style={{ fontWeight: 500 }}>
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> Por revisar
                </span>
                <span className="text-gray-700" style={{ fontWeight: 600 }}>{stats.newCards}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Progreso por Sección ── */}
        {stats.sectionStats.length > 1 && (
          <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#2a8c7a]/10 flex items-center justify-center">
                <TrendingUp size={16} className="text-[#2a8c7a]" />
              </div>
              <h4 className="text-sm text-gray-800" style={{ fontWeight: 600 }}>Por Sección</h4>
            </div>
            <div className="space-y-3">
              {stats.sectionStats.map(s => (
                <div key={s.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 truncate max-w-[180px]" style={{ fontWeight: 500 }}>{s.title}</span>
                    <span className="text-gray-700 shrink-0" style={{ fontWeight: 600 }}>
                      {s.mastered}/{s.totalCards}
                    </span>
                  </div>
                  <ProgressBar
                    value={s.pct}
                    color={s.pct >= 0.75 ? 'bg-emerald-500' : s.pct >= 0.4 ? 'bg-amber-400' : 'bg-rose-400'}
                    className="h-1.5"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Áreas a Reforzar ── */}
        {stats.weakTopics.length > 0 && (
          <div className="bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Target size={16} className="text-amber-600" />
              </div>
              <h4 className="text-sm text-gray-800" style={{ fontWeight: 600 }}>Áreas a Reforzar</h4>
            </div>
            <div className="space-y-2.5">
              {stats.weakTopics.map(t => {
                const pctVal = Math.round(t.accuracy * 100);
                const color = getMasteryColorFromPct(t.accuracy);
                return (
                  <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: color.hex + '15' }}
                    >
                      <Sparkles size={14} style={{ color: color.hex }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 truncate" style={{ fontWeight: 500 }}>{t.title}</p>
                      <p className="text-[10px] text-gray-400" style={{ fontWeight: 400 }}>{t.totalCards} cards</p>
                    </div>
                    <span className="text-xs shrink-0" style={{ fontWeight: 600, color: color.hex }}>{pctVal}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────

export function HubScreen({
  sections,
  allCards,
  courseColor,
  courseName,
  userName,
  onOpenSection,
  onOpenDeck,
  onStartAll,
  onBack,
}: {
  sections: Section[];
  allCards: Flashcard[];
  /** @deprecated */
  courseColor: string;
  courseName: string;
  userName?: string;
  onOpenSection: (s: Section, i: number) => void;
  onOpenDeck?: (topic: Topic) => void;
  onStartAll: () => void;
  onBack: () => void;
}) {
  const heroStats = useHeroStats(sections, allCards);

  const decks = useMemo(
    () => buildDecks(sections),
    [sections],
  );

  const handleDeckClick = (deckId: string) => {
    for (let sIdx = 0; sIdx < sections.length; sIdx++) {
      const section = sections[sIdx];
      const topic = section.topics.find(t => t.id === deckId);
      if (topic) {
        if (onOpenDeck) {
          onOpenDeck(topic);
        } else {
          onOpenSection(section, sIdx);
        }
        return;
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -30 }}
      className="h-full overflow-y-auto bg-zinc-50"
    >
      {/* ── Hero ── */}
      <div className="px-4 pt-4 sm:px-6 sm:pt-6 md:px-8 md:pt-8">
        <FlashcardHero
          userName={userName || 'Estudiante'}
          totalDue={heroStats.totalDue}
          totalCards={heroStats.totalCards}
          totalMastered={heroStats.totalMastered}
          globalAccuracy={heroStats.globalAccuracy}
          longestStreak={heroStats.longestStreak}
          decksWithDue={heroStats.decksWithDue}
          totalNewCards={heroStats.totalNewCards}
          deckSpine={heroStats.deckSpine}
          onStartReview={onStartAll}
        />
      </div>

      {/* ── Two-column body ── */}
      <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        <div className="flex gap-4 sm:gap-8 items-start">
          {/* Left: Deck list */}
          <FlashcardDeckList decks={decks} onDeckClick={handleDeckClick} />

          {/* Right: Real stats sidebar */}
          <StatsSidebar sections={sections} allCards={allCards} />
        </div>

        {/* Empty state */}
        {sections.length === 0 && decks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Layers size={40} className="mb-3 text-gray-300" />
            <p className="text-sm" style={{ fontWeight: 500 }}>No hay secciones disponibles</p>
            <p className="text-xs text-gray-300 mt-1">
              Los flashcards aparecerán cuando tu profesor las publique
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}