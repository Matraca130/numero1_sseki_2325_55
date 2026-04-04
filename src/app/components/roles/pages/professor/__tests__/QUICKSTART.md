# Professor Pages Test Suite — Quick Start

## What's Included

8 complete test files covering all major professor pages:

| File | Pages | Tests | Focus |
|------|-------|-------|-------|
| `ProfessorDashboardPage.test.tsx` | Dashboard | 8 | Basic placeholder rendering + auth context |
| `PlaceholderPages.test.tsx` | Courses, Settings, Students | 11 | Multiple placeholder pages with feature lists |
| `ProfessorQuizzesPage.test.tsx` | Quizzes | 9 | Cascade selection + filtering + error handling |
| `ProfessorFlashcardsPage.test.tsx` | Flashcards | 6 | Content management with cascade selectors |
| `ProfessorCurriculumPage.test.tsx` | Curriculum | 7 | Hierarchy navigation + content panels |
| `QuizzesManager.test.tsx` | QuizzesManager (component) | 8 | CRUD operations + modal management |
| `SummaryDetailView.test.tsx` | SummaryDetailView (component) | 8 | Editor modes + keyword/video management |
| `ProfessorAIAndModelPages.test.tsx` | AI, 3D, ModelViewer | 13 | AI tools + 3D model management |

**Total: 52 tests** across 8 files

---

## Running Tests

### Run all professor tests
```bash
npm run test -- src/app/components/roles/pages/professor/__tests__
```

### Run specific file
```bash
npm run test -- ProfessorQuizzesPage.test.tsx
npm run test -- QuizzesManager.test.tsx
```

### Watch mode (auto-rerun on changes)
```bash
npm run test -- --watch src/app/components/roles/pages/professor/__tests__
```

### Generate coverage report
```bash
npm run test -- --coverage src/app/components/roles/pages/professor/__tests__
```

---

## Test Structure Pattern

Every test file follows this pattern:

```typescript
// 1. Import test utilities
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithAuth, screen } from '@/test/test-utils';

// 2. Mock external dependencies
vi.mock('motion/react');
vi.mock('lucide-react');
vi.mock('@/app/services/quizApi');

// 3. Mock child components (isolate unit)
vi.mock('@/app/components/professor/SomeComponent');

// 4. Write test suites
describe('ComponentName', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does something specific', () => {
    const { container } = renderWithAuth(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

---

## Common Test Patterns

### 1. Verify component renders with auth
```typescript
it('renders with professor auth context', () => {
  renderWithAuth(<ProfessorDashboardPage />, {
    authOverrides: { role: 'professor' }
  });
  expect(screen.getByText('Dashboard del Profesor')).toBeInTheDocument();
});
```

### 2. Test API calls
```typescript
it('loads quizzes on mount', async () => {
  render(<QuizzesManager summaryId="summary-001" />);

  await waitFor(() => {
    expect(quizApi.getQuizzes).toHaveBeenCalledWith('summary-001');
  });
});
```

### 3. Test user interactions
```typescript
it('opens quiz form modal for creation', async () => {
  render(<QuizzesManager ... />);

  const createButton = screen.getByTestId('plus-icon').parentElement;
  fireEvent.click(createButton);

  await waitFor(() => {
    expect(screen.getByTestId('quiz-form-modal')).toBeInTheDocument();
  });
});
```

### 4. Test error handling
```typescript
it('handles backend error gracefully', async () => {
  (quizApi.getQuizzes as any).mockRejectedValue(new Error('API failed'));

  render(<QuizzesManager summaryId="summary-001" />);

  await waitFor(() => {
    expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
  });
});
```

---

## Mocking Cheat Sheet

### Motion library (animations)
```typescript
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));
```

### Lucide-react icons
```typescript
vi.mock('lucide-react', () => ({
  BrainIcon: ({ size, ...props }: any) => <div data-testid="brain-icon" {...props} />,
}));
```

### Context hooks
```typescript
vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => ({
    user: createMockUser(),
    selectedInstitution: createMockInstitution({ role: 'professor' }),
    role: 'professor',
  }),
}));
```

### Service APIs
```typescript
vi.mock('@/app/services/quizApi');
(quizApi.getQuizzes as any).mockResolvedValue([
  { id: 'quiz-001', title: 'Quiz 1' }
]);
```

### Custom hooks
```typescript
vi.mock('../useQuizCascade', () => ({
  useQuizCascade: () => ({
    selectedSummaryId: 'summary-001',
    selectedSummary: { id: 'summary-001', title: 'Test' },
    keywords: [],
    breadcrumbItems: [],
  }),
}));
```

---

## Test Utilities Available

From `@/test/test-utils`:

```typescript
// Render functions
renderWithAuth(component, options?)      // Render with mocked auth
renderWithProviders(component, options?) // Render with auth + router

// Mock factories
createMockUser(overrides?)               // Create AuthUser mock
createMockInstitution(overrides?)        // Create UserInstitution mock

// Re-exported from @testing-library/react
screen, fireEvent, waitFor, within, render
```

---

## Adding New Tests

When adding tests for new pages:

1. **Create test file** in `__tests__/` directory with pattern: `ComponentName.test.tsx`

2. **Mock dependencies**:
   - External libraries (motion, lucide, toast)
   - API services (quizApi, summariesApi, etc.)
   - Child components (isolate unit under test)
   - Context hooks (useAuth, useQuery, etc.)

3. **Use test utilities**:
   ```typescript
   import { renderWithAuth, screen, fireEvent, waitFor } from '@/test/test-utils';
   ```

4. **Write focused tests**:
   - One assertion per test (or tightly related assertions)
   - Use descriptive test names
   - Clean up mocks in beforeEach

5. **Test both success and error paths**:
   - API succeeds → component renders data
   - API fails → component shows error
   - User interaction → triggers expected action

---

## Debugging Tests

### Run single test
```bash
npm run test -- ProfessorQuizzesPage.test.tsx -t "specific test name"
```

### Show debug output
```typescript
import { render, screen, within } from '@testing-library/react';

// In your test:
screen.debug(); // Print full DOM
```

### Check mock calls
```typescript
console.log(quizApi.getQuizzes.mock.calls); // Array of call args
expect(quizApi.getQuizzes).toHaveBeenCalledWith('summary-001');
expect(quizApi.getQuizzes).toHaveBeenCalledTimes(1);
```

### Wait for async operations
```typescript
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
}, { timeout: 3000 }); // 3-second timeout
```

---

## Common Issues & Solutions

### Issue: Component not rendering
**Solution:** Check that all mocks are in place before importing the component
```typescript
vi.mock('@/app/services/quizApi');
import { QuizzesManager } from '../QuizzesManager'; // Import AFTER mocks
```

### Issue: Test times out waiting for element
**Solution:** Verify API mock is resolving and async calls are awaited
```typescript
(quizApi.getQuizzes as any).mockResolvedValue([...]); // Must resolve
await waitFor(() => { /* assertion */ });
```

### Issue: Icon elements not found
**Solution:** Icons are mocked with data-testid, query by testid
```typescript
// ❌ screen.getByText won't work (icon has no text)
// ✅ Use testid:
expect(screen.getByTestId('quiz-icon')).toBeInTheDocument();
```

### Issue: "Cannot find useAuth"
**Solution:** Mock the AuthContext before importing component
```typescript
vi.mock('@/app/context/AuthContext');
import { YourComponent } from './YourComponent';
```

---

## Next Steps

1. **Run the test suite** to verify all tests pass
2. **Check coverage** to identify any gaps
3. **Extend tests** for new features/pages following the patterns above
4. **Integrate with CI/CD** to run tests on every commit

Good luck! 🚀
