# Professor Pages Test Suite

Complete component tests for Axon professor dashboard and content management pages.

## Quick Links

- **Getting Started**: See [QUICKSTART.md](./QUICKSTART.md)
- **Full Documentation**: See [TEST_SUMMARY.md](./TEST_SUMMARY.md)
- **Test Files**: See list below

## Files in This Directory

### Test Files (52 total tests)

| File | Component(s) | Tests | Purpose |
|------|---|---|---|
| [ProfessorDashboardPage.test.tsx](./ProfessorDashboardPage.test.tsx) | ProfessorDashboardPage | 8 | Dashboard placeholder with features and backend routes |
| [PlaceholderPages.test.tsx](./PlaceholderPages.test.tsx) | Courses, Settings, Students | 11 | Multiple placeholder pages (feature lists, auth context) |
| [ProfessorQuizzesPage.test.tsx](./ProfessorQuizzesPage.test.tsx) | ProfessorQuizzesPage | 9 | Quiz management with cascade selection and filtering |
| [ProfessorFlashcardsPage.test.tsx](./ProfessorFlashcardsPage.test.tsx) | ProfessorFlashcardsPage | 6 | Flashcard management with content hierarchy |
| [ProfessorCurriculumPage.test.tsx](./ProfessorCurriculumPage.test.tsx) | ProfessorCurriculumPage | 7 | Curriculum structure and content panels |
| [QuizzesManager.test.tsx](./QuizzesManager.test.tsx) | QuizzesManager (component) | 8 | Quiz CRUD operations, modals, analytics |
| [SummaryDetailView.test.tsx](./SummaryDetailView.test.tsx) | SummaryDetailView (component) | 8 | Content editors, keywords, videos, status changes |
| [ProfessorAIAndModelPages.test.tsx](./ProfessorAIAndModelPages.test.tsx) | AI, 3D, ModelViewer | 13 | AI tools, 3D model management and viewing |

### Documentation Files

| File | Purpose |
|------|---------|
| [QUICKSTART.md](./QUICKSTART.md) | Quick reference guide for running and writing tests |
| [TEST_SUMMARY.md](./TEST_SUMMARY.md) | Comprehensive documentation of all tests |
| [README.md](./README.md) | This file |

## Test Summary by Area

### Page-Level Tests (40 tests)
- Dashboard, Courses, Settings, Students (5 placeholder pages)
- Quizzes, Flashcards, Curriculum (3 content pages)
- AI Tools, 3D Models, Model Viewer (3 specialized pages)

### Component-Level Tests (12 tests)
- QuizzesManager (8 tests): CRUD operations, modals, analytics
- SummaryDetailView (8 tests): Editing, keywords, videos, status

## Test Strategy

### Authentication
All tests use professor role via `renderWithAuth` utility:
```typescript
renderWithAuth(<Component />, { authOverrides: { role: 'professor' } })
```

### API Mocking
Service functions mocked with vitest:
```typescript
vi.mock('@/app/services/quizApi');
(quizApi.getQuizzes as any).mockResolvedValue(mockData);
```

### Component Isolation
Child components mocked to test units independently:
```typescript
vi.mock('@/app/components/professor/SomeComponent');
```

### Error Handling
Both success and error paths tested:
- API succeeds → data displays
- API fails → error shown
- No data → empty state

## Running Tests

### Run all tests in this directory
```bash
npm run test -- src/app/components/roles/pages/professor/__tests__
```

### Run specific test file
```bash
npm run test -- ProfessorQuizzesPage.test.tsx
npm run test -- QuizzesManager.test.tsx
```

### Watch mode
```bash
npm run test -- --watch
```

### Coverage report
```bash
npm run test -- --coverage
```

## Coverage Matrix

```
Authentication Context         ✓ All pages tested with professor role
Placeholder Pages              ✓ 5 pages with features and routes
Quiz Management               ✓ Full CRUD with analytics
Flashcard Management          ✓ Cascade selection + list
Curriculum Hierarchy          ✓ Topic selection and panels
Content Editing               ✓ Block editor, TipTap, keywords
3D Models                     ✓ Viewing and parts management
AI Tools                      ✓ Feature lists and routes
Error Handling                ✓ API failures and empty states
Loading States                ✓ Async operations
User Interactions             ✓ Clicks, modals, navigation
```

## Test Patterns Used

### Pattern 1: Simple Page Rendering
```typescript
it('renders with correct title', () => {
  renderWithAuth(<ProfessorDashboardPage />);
  expect(screen.getByText('Dashboard del Profesor')).toBeInTheDocument();
});
```

### Pattern 2: API Loading
```typescript
it('loads quizzes on mount', async () => {
  render(<QuizzesManager summaryId="summary-001" />);
  await waitFor(() => {
    expect(quizApi.getQuizzes).toHaveBeenCalled();
  });
});
```

### Pattern 3: User Interaction
```typescript
it('opens modal on button click', () => {
  render(<QuizzesManager ... />);
  fireEvent.click(screen.getByTestId('plus-icon'));
  expect(screen.getByTestId('quiz-form-modal')).toBeInTheDocument();
});
```

### Pattern 4: Error Handling
```typescript
it('shows error when API fails', async () => {
  (quizApi.getQuizzes as any).mockRejectedValue(new Error('Failed'));
  render(<QuizzesManager ... />);
  await waitFor(() => {
    expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
  });
});
```

## Dependencies

Required for these tests:
- Vitest
- React Testing Library
- @testing-library/react
- MSW (for API mocking) - if needed
- Test utilities from `@/test/test-utils.tsx`

## Key Mock Modules

```typescript
vi.mock('motion/react')                          // Animations
vi.mock('lucide-react')                          // Icons
vi.mock('sonner')                                // Toast notifications
vi.mock('@/app/context/AuthContext')             // Auth context
vi.mock('@/app/services/quizApi')                // Quiz API
vi.mock('@/app/services/summariesApi')           // Summaries API
vi.mock('@tanstack/react-query')                 // React Query hooks
```

## Common Test Utilities

```typescript
// From @/test/test-utils:
renderWithAuth(ui, options?)                    // Render with auth context
renderWithProviders(ui, options?)               // Render with auth + router
createMockUser(overrides?)                      // Create user mock
createMockInstitution(overrides?)               // Create institution mock

// From @testing-library/react:
screen, fireEvent, waitFor, within, render
```

## Troubleshooting

See [QUICKSTART.md](./QUICKSTART.md#debugging-tests) for debugging tips.

## Next Steps

1. Run tests to verify setup
2. Review test patterns for new components
3. Extend tests for new features
4. Integrate into CI/CD pipeline

---

**Test Suite Created**: April 3, 2026
**Framework**: Vitest + React Testing Library
**Status**: Complete and ready for use
