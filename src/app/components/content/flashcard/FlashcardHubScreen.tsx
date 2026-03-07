// ============================================================
// FlashcardHubScreen — Flashcard Landing Page
//
// Layout:
//   1. FlashcardHero — greeting, CTA, quick stats
//   2. Two-column body:
//      - Left:  FlashcardDeckList (filterable deck cards)
//      - Right: Sidebar placeholder (dominio, racha, logros)
// ============================================================

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Section, Flashcard, Topic } from '@/app/types/content';
import { Layers } from 'lucide-react';
import { FlashcardHero } from './FlashcardHero';
import { FlashcardDeckList, type FlashcardDeck } from './FlashcardDeckList';

// ── Relative time formatter ──────────────────────────────

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

// ── Build deck list from real data ───────────────────────

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

      // Find the most recent due_at for "last reviewed" estimate
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
        streakDays: 0, // TODO: wire to real streak when backend supports it
      });
    }
  }

  // Sort: due cards first, then by accuracy ascending (weakest first)
  decks.sort((a, b) => {
    if (a.dueToday > 0 && b.dueToday === 0) return -1;
    if (a.dueToday === 0 && b.dueToday > 0) return 1;
    return a.accuracy - b.accuracy;
  });

  return decks;
}

// ── Hero stats helper ────────────────────────────────────

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

    // Decks with due cards
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

    // Deck spine (max 8 segments)
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

// ── Sidebar placeholder ──────────────────────────────────

function SidebarPlaceholder() {
  return (
    <div className="w-[340px] shrink-0 hidden lg:block">
      <div className="sticky top-8 space-y-4">
        {/* Dominio Global + Racha Semanal */}
        <div className="bg-white border border-dashed border-zinc-300 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-zinc-200 rounded-md" />
            <div className="h-3 w-24 bg-zinc-200 rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-2 w-full bg-zinc-100 rounded" />
            <div className="h-2 w-3/4 bg-zinc-100 rounded" />
          </div>
          <p
            className="text-[10px] text-zinc-400 mt-4 text-center"
            style={{ fontWeight: 500 }}
          >
            Dominio Global + Racha Semanal
          </p>
        </div>

        {/* Sesiones Recientes */}
        <div className="bg-white border border-dashed border-zinc-300 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-zinc-200 rounded-md" />
            <div className="h-3 w-28 bg-zinc-200 rounded" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-100 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2 w-2/3 bg-zinc-100 rounded" />
                  <div className="h-1.5 w-1/2 bg-zinc-50 rounded" />
                </div>
              </div>
            ))}
          </div>
          <p
            className="text-[10px] text-zinc-400 mt-4 text-center"
            style={{ fontWeight: 500 }}
          >
            Sesiones Recientes
          </p>
        </div>

        {/* Logros / Badges */}
        <div className="bg-white border border-dashed border-zinc-300 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-zinc-200 rounded-md" />
            <div className="h-3 w-16 bg-zinc-200 rounded" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="aspect-square bg-zinc-100 rounded-xl" />
            ))}
          </div>
          <p
            className="text-[10px] text-zinc-400 mt-4 text-center"
            style={{ fontWeight: 500 }}
          >
            Logros / Badges
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────

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
  /** @deprecated Colors now derived from mastery via getMasteryColorFromPct. Kept for caller compat. */
  courseColor: string;
  courseName: string;
  userName?: string;
  onOpenSection: (s: Section, i: number) => void;
  onOpenDeck?: (topic: Topic) => void;
  onStartAll: () => void;
  onBack: () => void;
}) {
  const heroStats = useHeroStats(sections, allCards);

  // Build deck data from real sections
  const decks = useMemo(
    () => buildDecks(sections),
    [sections],
  );

  // Handle deck click → navigate to that topic's deck view
  const handleDeckClick = (deckId: string) => {
    // deckId is topicId — find the topic and its section
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
      <div className="px-6 pt-6 md:px-8 md:pt-8">
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
      <div className="px-6 md:px-8 py-8">
        <div className="flex gap-8 items-start">
          {/* Left: Deck list */}
          <FlashcardDeckList decks={decks} onDeckClick={handleDeckClick} />

          {/* Right: Sidebar placeholder */}
          <SidebarPlaceholder />
        </div>

        {/* Empty state */}
        {sections.length === 0 && decks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Layers size={40} className="mb-3 text-gray-300" />
            <p className="text-sm font-medium">No hay secciones disponibles</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}