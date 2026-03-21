# Flashcard Agent Memory

## 2026-03-20: Design System Violations Fixed

### Files modified (main flashcard/):
- `FlashcardDeckScreen.tsx` - gradient button -> solid teal, rounded-xl -> rounded-full on buttons, filter pills rounded-full
- `FlashcardSummaryScreen.tsx` - gradient icon -> bg-teal-50/text-teal-500, gradient+backdrop-blur card -> solid bg, gradient button -> solid teal rounded-full, stat badges rounded-full
- `FlashcardHero.tsx` - CTA button rounded-xl -> rounded-full
- `FlashcardDeckList.tsx` - filter pills rounded-lg -> rounded-full

### Files modified (adaptive/):
- `AdaptiveCompletedScreen.tsx` - gradient icon -> bg-teal-50, violet text -> teal, buttons rounded-xl -> rounded-full
- `AdaptiveGenerationScreen.tsx` - gradient icon -> bg-teal-50, cancel button rounded-xl -> rounded-full
- `AdaptiveIdleLanding.tsx` - gradient icon -> bg-teal-50, violet badges -> teal, buttons rounded-xl -> rounded-full
- `AdaptiveKeywordPanel.tsx` - removed backdrop-blur-sm from content cards (3 occurrences)
- `AdaptivePartialSummary.tsx` - violet text/bg -> teal, backdrop-blur removed, button rounded-xl -> rounded-full
- `RoundHistoryList.tsx` - violet text -> teal, backdrop-blur removed
- `DeltaBadges.tsx` - pill badges rounded-lg -> rounded-full

### Design rules applied:
- Buttons: always `rounded-full` (pill-shaped)
- No gradients on buttons or icon backgrounds
- No `backdrop-blur` on content cards (ambient glow blur-3xl on decorative elements is OK)
- No violet/purple on interactive elements or action badges -> use teal
- Icon backgrounds: `bg-teal-50` + `text-teal-500` (no gradients)

### Files that do NOT exist (from original request):
- FlashcardToolbar.tsx
- FlashcardsList.tsx
- FlashcardStatsBar.tsx

### Remaining gradient usage (acceptable per rules):
- ProgressBar fill color prop (functional progress indicator, not a button/icon)
- Session progress bar linear-gradient (functional multi-segment indicator)
- Ambient radial-gradient glow on decorative background elements
- blur-3xl on decorative ambient glow divs (NOT backdrop-blur on content cards)
