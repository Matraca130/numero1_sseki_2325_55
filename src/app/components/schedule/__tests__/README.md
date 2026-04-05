# Schedule Components Test Suite

Comprehensive test coverage for Axon's study schedule components using Vitest + React Testing Library.

## Files

### Component Tests

1. **StudyPlanDashboard.test.tsx** (8 suites, 25+ tests)
   - Dashboard rendering with study plans
   - View mode switching (day/week/month)
   - Date navigation and task filtering
   - Task completion and state management
   - Empty states and fallback UIs
   - Progress metrics calculation
   - Mobile responsiveness

2. **DefaultScheduleView.test.tsx** (10 suites, 30+ tests)
   - Calendar grid rendering (7-column layout)
   - Month/date navigation (prev/next/today)
   - Event display on calendar dates
   - Sidebar sections:
     - "Que estudiar hoy" (What to study)
     - "Proximos Examenes" (Upcoming exams)
     - "Completado Recientemente" (Recently completed)
   - Collapsible sections with animations
   - Quick navigation links
   - Responsive mobile/desktop layouts

3. **WeekMonthViews.test.tsx** (8 suites, 20+ tests)
   - WeekView component:
     - 7-day task display
     - Task completion toggles
     - Day selection and navigation
   - MonthView component:
     - Calendar grid with all dates
     - Day headers and event indicators
     - Task display in calendar cells
     - Multiple tasks per date
   - Method badges and completion states
   - Empty state handling

4. **CompletionIndicators.test.tsx** (13 suites, 35+ tests)
   - **CompletionCircle**: Task completion toggle
     - Uncompleted/completed states
     - Click and keyboard interactions
     - Animation transitions
     - Color coding (green/gray)
     - Touch target sizing (44x44px)
   - **MethodTag**: Study method badges
     - video, flashcard, quiz, resumo, 3d
     - Icon and color display
     - Contrast and accessibility
   - **DurationPill**: Estimated time display
     - Duration formatting (15-240+ min)
     - State-based styling
     - Edge case handling

### Integration Tests

5. **ScheduleComponents.integration.test.tsx** (10 suites, 20+ tests)
   - Task completion workflow across components
   - View switching with state persistence
   - Navigation workflows
   - Data filtering and display
   - Responsive behavior
   - Error handling
   - Keyboard accessibility
   - Screen reader announcements
   - Performance with many tasks
   - State synchronization between components
   - Edge cases (empty plans, no tasks, rapid toggles)

## Test Approach

### Mocking Strategy

#### Context Mocks
- `useStudentNav()`: Navigation hook
- `useIsMobile()`: Responsive layout detection
- `useTopicMasteryContext()`: Student mastery data
- `useStudyTimeEstimatesContext()`: Time estimates
- `useStudentDataContext()`: Student stats and activity

#### Component Mocks
- `WeekMonthViews`: Week/Month view components
- `DailyRecommendationCard`: AI recommendations
- `WeeklyInsightCard`: Weekly analytics
- `DashboardLayout`: Main layout wrapper
- `DaySummaryCard`: Daily statistics

#### Utility Mocks
- `getAxonToday()`: Returns `new Date(2025, 0, 15)` (Jan 15, 2025)
- `date-fns`: Date formatting and calculations
- `motion/react`: Framer Motion animations

### Test Utilities

All tests use functions from `src/test/test-utils.tsx`:
- `render()`, `screen`, `fireEvent`, `waitFor`, `within` (re-exported)
- `renderWithAuth()`: Render with mocked AuthContext
- `renderWithProviders()`: Render with Auth + Router
- `createMockAuthValue()`: Build auth context overrides
- `createMockUser()`: Factory for AuthUser objects
- `createMockInstitution()`: Factory for UserInstitution objects

### Mock Study Plans

All tests use `createMockStudyPlan()` helper:

```typescript
function createMockStudyPlan(overrides?: Partial<StudyPlan>): StudyPlan {
  return {
    id: 'plan-1',
    title: 'Study Plan 1',
    status: 'active',
    tasks: [
      { id: 'task-1', title: 'Learn React', date: today, completed: false, ... },
      { id: 'task-2', title: 'Quiz Practice', date: today, ... },
    ],
    ...overrides,
  };
}
```

## Running Tests

### All tests
```bash
npm run test
# or
vitest
```

### Watch mode
```bash
vitest --watch
```

### Specific file
```bash
vitest StudyPlanDashboard.test.tsx
```

### With coverage
```bash
vitest --coverage
```

## Test Coverage Goals

| Component | Target | Current |
|-----------|--------|---------|
| StudyPlanDashboard | 90% | TBD |
| DefaultScheduleView | 85% | TBD |
| WeekMonthViews | 85% | TBD |
| CompletionIndicators | 95% | TBD |
| **Overall** | **85%** | TBD |

## Key Testing Patterns

### 1. Component Factory Pattern
```typescript
function renderDashboard(props?: Partial<Props>, plans?: StudyPlan[]) {
  return render(
    <MemoryRouter>
      <Component {...defaultProps} {...props} />
    </MemoryRouter>
  );
}
```

### 2. User Interaction Testing
```typescript
await userEvent.click(button);
await waitFor(() => {
  expect(mockFn).toHaveBeenCalled();
});
```

### 3. State Verification
```typescript
// Before
expect(screen.getByText('Incomplete')).toBeInTheDocument();

// User action
await userEvent.click(completeButton);

// After
expect(screen.getByText('Completed')).toBeInTheDocument();
```

### 4. Empty State Testing
```typescript
renderDashboard({}, []); // No tasks
expect(screen.getByText(/ninguna tarea/i)).toBeInTheDocument();
```

## Suite Breakdown

### StudyPlanDashboard (8 suites)
1. Rendering with study plans
2. View mode switching
3. Date navigation
4. Empty state handling
5. Task interactions
6. Progress metrics
7. Multiple study plans
8. Responsive behavior

### DefaultScheduleView (10 suites)
1. Page structure and header
2. Calendar grid and display
3. Calendar navigation
4. View mode switching
5. Event display on calendar
6. Sidebar - "What to study today"
7. Sidebar - "Upcoming exams"
8. Sidebar - "Recently completed"
9. Quick navigation
10. Responsive behavior

### WeekMonthViews (8 suites)
1. Week view rendering
2. Task completion in week view
3. Day selection
4. Empty state
5. Task methods/badges
6. Month view rendering
7. Selected date highlighting
8. Task completion in month view (+ more suites below)

### CompletionIndicators (13 suites)
1. CompletionCircle: Rendering
2. CompletionCircle: Interaction
3. CompletionCircle: Animations
4. CompletionCircle: Visual styling
5. MethodTag: Method badge display
6. MethodTag: Unknown method handling
7. MethodTag: Color coding
8. MethodTag: Icons
9. DurationPill: Duration display
10. DurationPill: Visual hierarchy
11. DurationPill: Edge cases
12. Combined: Component integration
13. Combined: Accessibility

## Common Testing Challenges

### 1. Framer Motion Animations
Animations may need to complete before assertions. Use `waitFor()`:
```typescript
await waitFor(() => {
  expect(element).toHaveStyle('opacity: 1');
});
```

### 2. Date Comparison
Use `date-fns` for safe comparisons:
```typescript
expect(isSameDay(task.date, selectedDate)).toBe(true);
```

### 3. Complex User Interactions
Chain user actions with `await`:
```typescript
await userEvent.click(viewButton);
await userEvent.click(dateNavButton);
await waitFor(() => { /* assertion */ });
```

### 4. Modal/Portal Components
Ensure they render at document root if needed.

## Future Enhancements

- [ ] Visual regression tests with Percy/Chromatic
- [ ] E2E tests with Playwright for full workflows
- [ ] Performance benchmarks for large task lists
- [ ] Accessibility audit automation (axe)
- [ ] Snapshot tests for stable UI sections
- [ ] Mock API responses for backend integration tests

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)
- [Axon Test Utils](../../../test/test-utils.tsx)
- [date-fns Documentation](https://date-fns.org/)
