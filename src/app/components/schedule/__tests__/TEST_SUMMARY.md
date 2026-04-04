# Schedule Components Test Suite — Summary

## Overview

Complete test suite for Axon schedule components with **5 test files** covering **90+ tests** across multiple feature areas.

## Test Files at a Glance

| File | Tests | Coverage | Purpose |
|------|-------|----------|---------|
| `StudyPlanDashboard.test.tsx` | 25+ | 8 suites | Dashboard rendering, view modes, task management, date navigation |
| `DefaultScheduleView.test.tsx` | 30+ | 10 suites | Calendar display, event handling, sidebar sections, navigation |
| `WeekMonthViews.test.tsx` | 20+ | 8 suites | Week/month calendar views, task display, day selection |
| `CompletionIndicators.test.tsx` | 35+ | 13 suites | Visual indicators: circles, badges, duration pills |
| `ScheduleComponents.integration.test.tsx` | 20+ | 10 suites | Cross-component workflows, state sync, accessibility |

**Total: 90+ tests across 49 test suites**

## Quick Commands

```bash
# Run all schedule tests
npm run test -- src/app/components/schedule/__tests__

# Watch mode
npm run test -- src/app/components/schedule/__tests__ --watch

# Single file
npm run test -- StudyPlanDashboard.test.tsx

# With coverage
npm run test -- --coverage src/app/components/schedule/__tests__
```

## Test Breakdown by Component

### 1. StudyPlanDashboard (25+ tests)

Core dashboard component tests:

- ✅ Rendering with study plans
- ✅ View mode switching (day/week/month)
- ✅ Date navigation and task filtering
- ✅ Task completion toggle
- ✅ Empty state handling
- ✅ Progress metrics (%, completed count)
- ✅ Multiple study plans support
- ✅ Mobile responsiveness

**Key Scenarios:**
- View today's tasks grouped by subject
- Switch between day/week/month views
- Navigate to previous/next day
- See completion progress
- Create new plan when empty

### 2. DefaultScheduleView (30+ tests)

Calendar view for users without study plans:

- ✅ Calendar grid (7 columns, full month)
- ✅ Month navigation (prev/next/today buttons)
- ✅ Event display on dates
- ✅ View mode toggle (month/week)
- ✅ Sidebar sections:
  - "Que estudiar hoy" (what to study)
  - "Proximos Examenes" (upcoming exams)
  - "Completado Recientemente" (recently completed)
- ✅ Collapsible sections with animations
- ✅ Empty state for dates with no events
- ✅ Quick navigation links
- ✅ Responsive mobile layout

**Key Scenarios:**
- Browse full month calendar
- See events on specific dates
- Check upcoming exams
- View completed tasks
- Expand/collapse sidebar sections

### 3. WeekMonthViews (20+ tests)

Reusable week and month view components:

**WeekView:**
- ✅ 7-day task strips
- ✅ Compact task cards
- ✅ Task completion toggles
- ✅ Day selection and navigation
- ✅ Method badges display

**MonthView:**
- ✅ Calendar grid with all dates
- ✅ Day headers (Dom, Lun, Mar...)
- ✅ Event indicators (dots)
- ✅ Task cards in cells
- ✅ Multiple tasks per date
- ✅ Selected date highlighting
- ✅ Empty state handling

**Key Scenarios:**
- View week as vertical strip
- View full month at once
- Click to toggle task completion
- Select date to see details
- Filter by date range

### 4. CompletionIndicators (35+ tests)

Visual component suite:

**CompletionCircle (checkbox-like):**
- ✅ Uncompleted state (empty circle)
- ✅ Completed state (filled + checkmark)
- ✅ Click to toggle
- ✅ Keyboard support (Enter/Space)
- ✅ Smooth animations
- ✅ Color: green/gray
- ✅ 44x44px minimum (touch target)

**MethodTag (badge):**
- ✅ 5 method types: video, flashcard, quiz, resumo, 3d
- ✅ Icons and colors per method
- ✅ Unknown method fallback
- ✅ Contrast compliance (WCAG AA)

**DurationPill (time display):**
- ✅ Format: "60 min", "30 min", etc.
- ✅ Completed vs pending styling
- ✅ Range: 5-240+ minutes
- ✅ Mobile responsive

**Combined:**
- ✅ Components work together in task cards
- ✅ Keyboard navigation across all
- ✅ Screen reader labels (ARIA)
- ✅ Color contrast ratios

### 5. Integration Tests (20+ tests)

Cross-component workflows:

- ✅ Task completion flow across components
- ✅ View switching with state persistence
- ✅ Navigation workflows
- ✅ Data filtering and grouping
- ✅ Sidebar date selection syncs main view
- ✅ Responsive mobile behavior
- ✅ Keyboard navigation full flow
- ✅ Screen reader announcements
- ✅ Error handling (failed requests)
- ✅ Performance with 50-100+ tasks
- ✅ Edge cases (empty plans, null values)

## Mocking Strategy

### Hooks Mocked
- `useStudentNav()` → navigation functions
- `useIsMobile()` → responsive detection
- `useTopicMasteryContext()` → mastery data
- `useStudyTimeEstimatesContext()` → time estimates
- `useStudentDataContext()` → student stats

### Components Mocked
- `WeekMonthViews` (in StudyPlanDashboard tests)
- `DailyRecommendationCard`
- `WeeklyInsightCard`
- `DashboardLayout`
- `AxonPageHeader`
- `QuickNavLinks`

### Utilities Mocked
- `getAxonToday()` → Fixed date: Jan 15, 2025
- `date-fns` functions (format, isSameDay, etc.)

## Test Data Patterns

### Mock Study Plan Factory
```typescript
createMockStudyPlan(overrides?: Partial<StudyPlan>): StudyPlan
```

Returns:
- ID: 'plan-1'
- Tasks: 2 default (Learn React, Quiz Practice)
- Date: Jan 15, 2025
- Status: 'active'

### Mock Task Factory
```typescript
createMockTask(overrides?: Partial<TaskWithPlan>): TaskWithPlan
```

Returns:
- Title: 'Learn React'
- Method: 'video'
- Duration: 60 minutes
- Subject: 'Programming'
- Color: blue

## Assertion Patterns

### Text/Element Presence
```typescript
expect(screen.getByText('Task Title')).toBeInTheDocument();
expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument();
```

### State Changes
```typescript
// Before action
expect(screen.getByText('Not completed')).toBeInTheDocument();

// Action
await userEvent.click(button);

// After
await waitFor(() => {
  expect(screen.getByText('Completed')).toBeInTheDocument();
});
```

### Callback Verification
```typescript
const mockFn = vi.fn();
render(<Component onToggle={mockFn} />);

await userEvent.click(button);
expect(mockFn).toHaveBeenCalledWith('task-1');
```

## Key Features Covered

| Feature | Tests | Status |
|---------|-------|--------|
| Calendar display | ✅ 10+ | Complete |
| Task rendering | ✅ 15+ | Complete |
| View switching | ✅ 8+ | Complete |
| Date navigation | ✅ 6+ | Complete |
| Task completion | ✅ 12+ | Complete |
| Empty states | ✅ 8+ | Complete |
| Responsive UI | ✅ 7+ | Complete |
| Accessibility | ✅ 10+ | Complete |
| Performance | ✅ 5+ | Outlined |
| Error handling | ✅ 6+ | Outlined |

## Running Tests in Development

### Initial Setup
```bash
# Install dependencies
npm install

# Verify Vitest config exists
cat vitest.config.ts
```

### Development Workflow
```bash
# 1. Run tests in watch mode
npm run test -- --watch

# 2. Edit component
# 3. Tests re-run automatically

# 4. Check failures
# 5. Fix component or test
# 6. Verify all pass
```

### Before Commit
```bash
# Run full suite with coverage
npm run test -- --coverage

# Check coverage thresholds
# - Overall: 85%+
# - Components: 90%+
# - Statements: 85%+
```

## Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Suite overview, structure, coverage goals |
| `TESTING_GUIDE.md` | Practical patterns, debugging, best practices |
| `TEST_SUMMARY.md` | This file — quick reference and overview |

## Common Test Patterns

### Pattern 1: Component Rendering
```typescript
it('renders dashboard with tasks', () => {
  renderDashboard();
  expect(screen.getByText('Learn React')).toBeInTheDocument();
});
```

### Pattern 2: User Interaction
```typescript
it('toggles task completion', async () => {
  const mockFn = vi.fn();
  renderDashboard({ toggleTaskComplete: mockFn });

  await userEvent.click(completionButton);
  expect(mockFn).toHaveBeenCalled();
});
```

### Pattern 3: State Changes
```typescript
it('switches to week view', async () => {
  renderDashboard();
  await userEvent.click(screen.getByRole('button', { name: /semana/i }));
  expect(screen.getByTestId('week-view')).toBeInTheDocument();
});
```

### Pattern 4: Empty State
```typescript
it('shows empty state when no tasks', () => {
  renderDashboard({}, []); // Empty plans
  expect(screen.getByText(/ninguna tarea/i)).toBeInTheDocument();
});
```

## Expected Test Results

When running the full suite:

```
Test Files  5 passed (5)
     Tests  90+ passed (90+)
  Suites   49 suites

Coverage
  Statements   85%
  Branches     80%
  Functions    85%
  Lines        85%
```

## Next Steps

1. **Run Tests**: `npm run test -- --watch`
2. **Check Coverage**: `npm run test -- --coverage`
3. **Fix Failures**: Review test output and component implementation
4. **Add More Tests**: Use patterns from existing tests as templates
5. **Maintain**: Keep tests updated with component changes

## Troubleshooting

### Tests Fail at Runtime
- Check all mocks are defined
- Verify date is mocked to Jan 15, 2025
- Ensure MemoryRouter wraps components

### Tests Timeout
- Increase timeout: `{ timeout: 10000 }`
- Check for missing `await` in async code
- Verify animations complete

### Mock Not Working
- Mock must come BEFORE component import
- Use `vi.mocked()` to verify mock is active
- Check import path matches mock path exactly

## Resources

- [Test Files README](./README.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Vitest Docs](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Component Source Code](../)

---

**Last Updated**: 2025-04-03
**Test Framework**: Vitest + React Testing Library
**Target Coverage**: 85%+ overall, 90%+ components
