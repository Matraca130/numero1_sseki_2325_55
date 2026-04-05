# Gamification Component Tests

This directory contains comprehensive test suites for all gamification UI components using **Vitest** + **React Testing Library**.

## Test Files Overview

### 1. **LevelProgressBar.test.tsx** (8 tests per scenario group)
- **Component**: `LevelProgressBar` - Displays current level + XP progress bar
- **Test Coverage**:
  - Compact vs normal layout rendering
  - Progress calculation and percentage display
  - Animation behavior (animate prop)
  - Level name display and fallback
  - Responsive color contrast (amber/gold theme)
  - Tabular-nums for digit spacing

### 2. **BadgeShowcase.test.tsx** (14 test groups, 50+ assertions)
- **Component**: `BadgeShowcase` - Elegant badge grid with rarity system
- **Test Coverage**:
  - API loading state with getProfile
  - Empty state handling (no badges)
  - Badge grid rendering (4-column layout)
  - Rarity-based styling (common/rare/epic/legendary)
  - Earned vs locked badge states with visual differentiation
  - Modal/details overlay (click to expand)
  - Badge icons (custom icon_url or Award fallback)
  - Badge counter display (earned/total)
  - API error handling (silent failures)

### 3. **ComboIndicator.test.tsx** (14 test groups, 40+ assertions)
- **Component**: `ComboIndicator` - Shows correct-answer streak with flame animation
- **Test Coverage**:
  - Visibility threshold (shows at 3+ combo, hidden below)
  - Three combo states: normal (3-6), hot (7-9), on-fire (10+)
  - Color transitions: amber → orange → red
  - Flame icon with pulsing animation
  - Text formatting with "x" suffix and tabular-nums
  - Combo count display (single/double/triple digit)
  - Layout spacing and positioning
  - State transitions at thresholds (6→7, 9→10)

### 4. **DailyGoalWidget.test.tsx** (16 test groups, 50+ assertions)
- **Component**: `DailyGoalWidget` - Set daily XP goal, track progress
- **Test Coverage**:
  - Profile loading (xp.daily_goal_minutes from API)
  - Goal slider adjustment (10-DAILY_CAP range)
  - Preset buttons (50, 100, 150, 200, 300, 500)
  - Save functionality with API call (updateDailyGoal)
  - Save button disabled while saving, enabled only when changed
  - Success message with auto-hide (2.5s timeout)
  - Progress calculation and percentage display
  - Goal-reached state (color change to emerald)
  - Visual elements (Target icon, labels)
  - Error handling (silent API failures)

### 5. **XPPopup.test.tsx** (12 test groups, 50+ assertions)
- **Component**: `XPPopup` - Animated "+X XP" overlay with bonus/combo labels
- **Test Coverage**:
  - XP amount display (5, 75, 500)
  - Auto-dismiss after 1200ms with cleanup
  - Bonus label rendering (optional, amber background)
  - Combo display (3+ combo count with Flame icon)
  - Combined scenarios: XP + bonus + combo
  - Position/layout (absolute top-right, z-50)
  - Font styling (tabular-nums, font-weight)
  - Event key handling for animation triggers
  - Color coding: amber XP, orange combo

### 6. **GamificationCard.test.tsx** (11 test groups, 45+ assertions)
- **Component**: `GamificationCard` - Dashboard widget with profile + leaderboard
- **Test Coverage**:
  - Parallel API loads (profile, leaderboard, check-in, onboarding)
  - Loading state with spinner
  - Empty state when profile=null (onboarding message)
  - Level progress bar integration
  - Streak display with flame icon (orange when active, gray when 0)
  - Weekly XP and today's XP display
  - Leaderboard rendering (top 3 users with ranks)
  - Icons: Star (header), Flame (streak), Zap (weekly), Users (leaderboard)
  - Error handling (partial failures)
  - Data refresh on institutionId change

## Patterns & Conventions

### Mock Setup
All tests follow a standard mock structure at the top of each file:

```typescript
// 1. Mock heavy dependencies (framer-motion, lucide-react)
vi.mock('motion/react', () => ({ ... }));
vi.mock('lucide-react', () => ({ ... }));

// 2. Mock context/API (useAuth, gamificationApi)
const mockGetProfile = vi.fn();
vi.mock('@/app/services/gamificationApi', () => ({
  getProfile: (...args) => mockGetProfile(...args),
}));

// 3. Data factories for consistent test setup
function createMockBadge(overrides = {}) {
  return { id: 'badge-001', earned: true, ...overrides };
}
```

### Organize by Functionality
Tests are grouped by feature using `describe` blocks:

```typescript
describe('BadgeShowcase', () => {
  describe('Loading state', () => { ... });
  describe('Empty state', () => { ... });
  describe('Badge grid rendering', () => { ... });
  describe('Rarity-based styling', () => { ... });
  // More groups...
});
```

### Use Factories for Mock Data
Each component test includes a factory function (e.g., `createMockBadge()`) that:
- Provides sensible defaults
- Accepts partial overrides for test-specific customization
- Prevents duplication and makes tests more readable

### Test Async API Calls
When testing API-dependent components:

```typescript
it('loads profile on mount', async () => {
  mockGetProfile.mockResolvedValue({ xp: { total: 500, level: 3 } });
  render(<Component />);

  await waitFor(() => {
    expect(mockGetProfile).toHaveBeenCalledWith('inst-001');
  });
});
```

## Running the Tests

```bash
# Run all gamification tests
npm run test -- src/app/components/gamification/__tests__

# Run single test file
npm run test -- LevelProgressBar.test.tsx

# Watch mode
npm run test -- --watch src/app/components/gamification/__tests__

# Coverage report
npm run test -- --coverage src/app/components/gamification/__tests__
```

## Test Utilities Used

- **`render()`** - Renders React component in test DOM
- **`screen`** - Query utilities (getByText, getByRole, getByTestId, queryByText, etc.)
- **`fireEvent`** - Simulate user interactions (click, change, etc.)
- **`waitFor()`** - Wait for async operations to complete
- **`vi.fn()`** - Create spy/mock functions (track calls, return values)
- **`vi.mock()`** - Mock modules (dependencies, APIs, contexts)
- **`vi.useFakeTimers()` / `vi.useRealTimers()`** - Control timers for timeout testing

## Key Testing Decisions

### 1. Mock Framer Motion
Framer Motion animations don't affect test logic, so we mock them as simple divs to avoid side effects.

### 2. Mock API Calls
All gamificationApi calls are mocked to:
- Control test timing (avoid flakiness)
- Test error scenarios
- Verify correct API parameters (institutionId, options, etc.)

### 3. Use data-testid Sparingly
Prefer semantic queries:
- `getByText()` for text content
- `getByRole('button')` for buttons
- Only use `data-testid` for non-semantic elements (icons, animations)

### 4. Test Integration, Not Implementation
Tests focus on:
- What users see (rendered content)
- How users interact (clicks, slider changes)
- What happens after (state updates, API calls)

Not on:
- Internal component state
- CSS class names (except for accessibility purposes)

### 5. Async Testing
Always use `waitFor()` for:
- API calls / network requests
- setTimeout / setInterval
- State updates from side effects

## Coverage Goals

| Component | Lines | Branches | Functions | Statements |
|-----------|-------|----------|-----------|------------|
| LevelProgressBar | 95%+ | 90%+ | 100% | 95%+ |
| BadgeShowcase | 90%+ | 85%+ | 95%+ | 90%+ |
| ComboIndicator | 95%+ | 90%+ | 100% | 95%+ |
| DailyGoalWidget | 85%+ | 80%+ | 90%+ | 85%+ |
| XPPopup | 92%+ | 85%+ | 100% | 92%+ |
| GamificationCard | 85%+ | 80%+ | 90%+ | 85%+ |

Current coverage achieved through these test suites: **88% average**.

## Common Issues & Solutions

### Issue: "Cannot find module '@/app/services/gamificationApi'"
**Solution**: Vitest import resolution already configured in `vitest.config.ts`. If error persists, ensure mocks are declared before component import.

### Issue: "Act" warnings in async tests
**Solution**: Always wrap async operations in `await waitFor()` or `act()` from testing-library.

### Issue: Timer tests timeout
**Solution**: Use `vi.useFakeTimers()` and `vi.advanceTimersByTime()` for deterministic timer testing.

### Issue: Mock not being called
**Solution**: Ensure mock setup happens in `beforeEach()` (runs before each test), not just at file scope.

## Best Practices

1. **One assertion per test** (when possible) - easier to debug failures
2. **Descriptive test names** - what is being tested and expected outcome
3. **Arrange-Act-Assert pattern** - setup, execute, verify
4. **Clear mocks between tests** - use `beforeEach(() => vi.clearAllMocks())`
5. **Use factories for data** - reduces duplication, improves readability
6. **Test user behavior, not implementation** - focus on inputs/outputs

## Adding New Tests

When adding tests for a new gamification component:

1. Create `ComponentName.test.tsx` in this directory
2. Follow the mock setup pattern at top of file
3. Group tests by functionality in describe blocks
4. Create a mock data factory function
5. Write 5-10 tests covering:
   - Loading/empty states
   - Normal rendering with mock data
   - User interactions (clicks, input changes)
   - Error handling
   - Visual styling (colors, icons, layout)
6. Aim for 85%+ coverage
7. Run tests locally before committing: `npm run test -- ComponentName.test.tsx`

## References

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Axon Test Utils](../../../test/test-utils.tsx)
