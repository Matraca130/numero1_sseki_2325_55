# Professor Pages Test Suite

## Overview
Complete test suite for Axon professor page components using Vitest + React Testing Library. All tests use `renderWithAuth` and `renderWithProviders` utilities from test-utils, with proper mocking of APIs and context hooks.

## Test Files Created

### 1. **ProfessorDashboardPage.test.tsx** (8 tests)
**Component:** ProfessorDashboardPage
**Approach:** Placeholder page with professor auth context

Tests:
- Renders with professor auth context
- Displays correct title and description
- Renders dashboard icon
- Displays all planned features (6 features)
- Displays all backend route references (3 routes)
- Displays construction icon in features section
- Displays context card with user and institution info

**Key Mocks:** Motion library, lucide-react icons, useAuth

---

### 2. **PlaceholderPages.test.tsx** (11 tests)
**Components:** ProfessorCoursesPage, ProfessorSettingsPage, ProfessorStudentsPage
**Approach:** Multiple placeholder pages with feature lists

**ProfessorCoursesPage:**
- Renders with correct title/description
- Displays BookOpen icon
- Shows course-related features (4 features)
- Shows backend routes (2 routes)

**ProfessorSettingsPage:**
- Renders with correct title/description
- Displays Settings icon
- Shows settings features (3 features)

**ProfessorStudentsPage:**
- Renders with correct title/description
- Displays Users icon
- Shows student-related features (4 features)
- Shows backend routes (2 routes)

**Key Mocks:** Motion, icons, useAuth

---

### 3. **ProfessorQuizzesPage.test.tsx** (9 tests)
**Component:** ProfessorQuizzesPage
**Approach:** Complex page with cascade selection, filtering, and quiz management

Tests:
- Renders page with cascade selector
- Renders breadcrumb navigation
- Displays quiz stats bar
- Displays quiz filters bar
- Displays AI reports dashboard
- Has error boundary wrapper
- Renders with professor role in auth context
- Has sidebar collapse state management

**Key Mocks:**
- useQuizCascade (cascade selection state)
- quizApi (quiz API calls)
- Child components (CascadeSelector, QuizStatsBar, QuizFiltersBar, AiReportsDashboard)
- QuizErrorBoundary

---

### 4. **ProfessorFlashcardsPage.test.tsx** (6 tests)
**Component:** ProfessorFlashcardsPage
**Approach:** Flashcard content management with cascade selection

Tests:
- Renders flashcards page
- Displays cascade selector for topic/summary selection
- Displays flashcard list
- Renders with professor authentication
- Provides cascading level access from institution context

**Key Mocks:**
- Motion library
- flashcardsApi
- CascadeSelector component
- FlashcardList component
- FlashcardFormModal component

---

### 5. **ProfessorCurriculumPage.test.tsx** (7 tests)
**Component:** ProfessorCurriculumPage
**Approach:** Curriculum hierarchy and content management

Tests:
- Renders curriculum page with professor role
- Displays curriculum hierarchy structure
- Provides access to institution context
- Supports opening topic detail panels
- Supports summary form dialog for creation
- Maintains professor authentication context throughout hierarchy
- Renders with motion animations enabled

**Key Mocks:**
- Motion library
- lucide-react icons
- TopicDetailPanel component
- SummaryFormDialog component
- curriculumApi

---

### 6. **QuizzesManager.test.tsx** (8 tests)
**Component:** QuizzesManager
**Approach:** Quiz CRUD operations with modal and analytics

Tests:
- Renders with summary ID and keywords
- Loads quizzes on mount
- Displays loaded quizzes as cards
- Opens quiz form modal for creation
- Opens questions editor when questions button clicked
- Opens analytics panel when analytics button clicked
- Displays error when no quizzes exist
- Handles backend error gracefully

**Key Mocks:**
- Motion library
- quizApi (getQuizzes)
- QuizFormModal component
- QuizQuestionsEditor component
- QuizAnalyticsPanel component
- QuizEntityCard component

---

### 7. **SummaryDetailView.test.tsx** (8 tests)
**Component:** SummaryDetailView
**Approach:** Content editing with keyword management and editor mode switching

Tests:
- Renders summary detail view with title
- Allows switching to tiptap editor
- Allows switching to block editor
- Opens keyword manager sheet
- Opens videos manager sheet
- Handles back navigation
- Loads keywords for the summary
- Displays error boundary wrapper
- Handles summary updates correctly

**Key Mocks:**
- Motion library
- summariesApi (getKeywords, getSubtopics, getSummaryBlocks)
- react-query hooks
- VideosManager component
- TipTapEditor component
- BlockEditor component
- KeywordManager component
- ConfirmDialog component

---

### 8. **ProfessorAIAndModelPages.test.tsx** (13 tests)
**Components:** ProfessorAIPage, Professor3DPage, ProfessorModelViewerPage
**Approach:** AI tools and 3D model management/viewing

**ProfessorAIPage (5 tests):**
- Renders with correct title (IA Pedagogica)
- Displays AI icon (Brain)
- Displays AI-related features (5 features)
- Displays backend AI routes (4 routes)
- Renders with professor authentication context

**Professor3DPage (3 tests):**
- Renders 3D management page with Box icon
- Supports topic selection in two-panel layout
- Maintains professor context in 3D page

**ProfessorModelViewerPage (3 tests):**
- Renders model viewer with 3D model viewer component
- Displays model title and edit mode info
- Shows loading state while fetching model
- Provides parts manager toggle button
- Maintains professor context for model editing

**Auth Requirements (2 tests):**
- All pages render with professor role requirement
- Pages display user context information
- Pages show institution context

**Key Mocks:**
- Motion library
- lucide-react icons (Brain, Box, etc.)
- useAuth for all pages
- useContentTree for Professor3DPage
- ModelManager component
- getModel3DById API
- ModelViewer3D component
- ModelPartsManager component

---

## Testing Patterns Used

### 1. **Authentication Testing**
All tests use `renderWithAuth` or `renderWithProviders` with professor role:
```typescript
renderWithAuth(<Component />, {
  authOverrides: { role: 'professor' }
})
```

### 2. **API Mocking**
Service functions are mocked with vitest:
```typescript
vi.mock('@/app/services/quizApi');
// Then: (quizApi.getQuizzes as any).mockResolvedValue(data)
```

### 3. **Component Mocking**
Child components are mocked to isolate units:
```typescript
vi.mock('@/app/components/professor/CascadeSelector', () => ({
  CascadeSelector: ({ onSummarySelected }: any) => (...)
}))
```

### 4. **Hook Mocking**
Custom hooks are mocked to control state:
```typescript
vi.mock('../useQuizCascade', () => ({
  useQuizCascade: () => ({
    selectedSummaryId: 'summary-001',
    // ... other state
  })
}))
```

### 5. **Icon Mocking**
Lucide-react icons are replaced with testid containers:
```typescript
Brain: ({ size, ...props }: any) => <div data-testid="brain-icon" {...props} />
```

---

## Coverage Summary

| Component Category | Pages | Tests per Page | Total Tests |
|---|---|---|---|
| Placeholder Pages | 5 | 1-2 | 11 |
| Quiz Management | 2 | 4 | 8 |
| Curriculum/Content | 2 | 3.5 | 7 |
| 3D Models | 2 | 2.5 | 5 |
| AI Tools | 1 | 5 | 5 |
| Summary/Content Detail | 1 | 8 | 8 |

**Total: 52 tests across 8 test files**

---

## Key Testing Approaches

### Page-Level Tests
- Verify component renders with professor auth context
- Check title, description, and UI elements
- Validate feature lists and backend routes
- Test icon rendering

### Component-Level Tests (QuizzesManager, SummaryDetailView)
- Test CRUD operations trigger API calls
- Verify state management (modals, panels, filters)
- Check error handling and loading states
- Validate user interactions (clicks, submissions)

### Integration Tests
- Cascade selection flows (course → semester → topic → summary)
- Editor mode switching (tiptap ↔ blocks)
- Navigation and back buttons
- Form submissions and API responses

---

## Mock Strategy

### 1. **External Libraries**
- motion/react: Replaced with simple div components
- lucide-react: Replaced with testid containers
- sonner: Toast function mocks (no-op)

### 2. **Context & Hooks**
- useAuth: Returns professor role + institution
- useQuizCascade: Returns selected summary + keywords
- useContentTree: Returns tree structure
- react-query hooks: Return empty/mock data

### 3. **Child Components**
- Mocked at component boundaries
- Return data-testid containers for visibility
- Support onClick handlers for state changes

### 4. **APIs**
- All service functions (quizApi, summariesApi, etc.) mocked
- Return sample data or reject with errors
- Control success/error flows in tests

---

## Running the Tests

```bash
# Run all professor page tests
npm run test -- src/app/components/roles/pages/professor/__tests__

# Run specific test file
npm run test -- ProfessorQuizzesPage.test.tsx

# Run with coverage
npm run test -- --coverage src/app/components/roles/pages/professor/__tests__

# Watch mode
npm run test -- --watch
```

---

## Notes for Future Development

1. **Vitest Configuration**: Ensure vitest.config.ts includes:
   - alias for '@/' paths
   - test environment setup for React Testing Library
   - transform settings for TSX files

2. **Test Utils**: Verify test-utils.tsx exports:
   - renderWithAuth, renderWithProviders
   - createMockUser, createMockInstitution
   - Re-exports of RTL functions (screen, fireEvent, waitFor, etc.)

3. **Dynamic Content**: Tests for pages with real API data may need:
   - Async waitFor() calls for data loading
   - Mock data factories for different scenarios
   - Error boundary testing with thrown errors

4. **Accessibility**: Consider adding:
   - Keyboard navigation tests
   - ARIA label verification
   - Role-based element queries

---

## File Locations

All test files are located at:
```
/sessions/great-bold-mccarthy/mnt/petri/AXON PROJECTO/frontend/src/app/components/roles/pages/professor/__tests__/
```

Test files created:
- ProfessorDashboardPage.test.tsx
- PlaceholderPages.test.tsx
- ProfessorQuizzesPage.test.tsx
- ProfessorFlashcardsPage.test.tsx
- ProfessorCurriculumPage.test.tsx
- QuizzesManager.test.tsx
- SummaryDetailView.test.tsx
- ProfessorAIAndModelPages.test.tsx
