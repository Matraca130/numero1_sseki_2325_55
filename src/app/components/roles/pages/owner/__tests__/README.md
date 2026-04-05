# Owner Pages Test Suite

Comprehensive test coverage for all owner management pages in the Axon platform. This test suite uses **Vitest** and **React Testing Library** with pre-configured mocks for contexts, UI components, and external dependencies.

## Test Files Overview

### 1. OwnerDashboardPage.test.tsx (24 tests)
Main dashboard tests covering:
- **Header & Layout**: Page title, institution name, refresh button
- **KPI Cards**: All four KPI cards (members, students, inactive, plans)
- **Trend Badges**: Active rate percentage display and trending indicators
- **Subscription Card**: Subscription status display with plan information
- **Role Distribution Chart**: Pie chart with legend and data visualization
- **Recent Members Table**: Member listing, sorting, and status indicators
- **Loading & Error States**: Skeleton loading, error recovery, empty states
- **Edge Cases**: Zero active students, null subscriptions, missing member data

Key test patterns:
```typescript
// KPI card rendering with trend badge
it('displays active rate badge (70% active)', () => {
  renderDashboard();
  expect(screen.getByText(/70% activos/)).toBeInTheDocument();
});

// Chart empty state handling
it('shows "Sin datos de miembros" when membersByRole is empty', () => {
  mockUsePlatformData.mockReturnValue({
    ...DEFAULT_PLATFORM_DATA,
    dashboardStats: {
      ...DEFAULT_PLATFORM_DATA.dashboardStats,
      membersByRole: {},
    },
  });
  renderDashboard();
  expect(screen.getByText('Sin datos de miembros')).toBeInTheDocument();
});
```

### 2. OwnerDashboardPage.chart.test.tsx (7 tests)
ChartErrorBoundary integration tests:
- Pie chart rendering with mock data
- Empty state rendering ("Sin datos de miembros")
- Error boundary fallback handling
- Loading skeleton display
- Error state with retry functionality

### 3. OwnerMembersPage.test.tsx (30 tests)
Members management page tests covering:
- **Header Controls**: Member count badge, invite button
- **Search Functionality**: Filter by name and email with case-insensitive matching
- **Role Filters**: Filter members by role (all, admin, professor, student)
- **Members Table**: Display, sorting (active first, then alphabetical)
- **Member Actions**: Change role, change plan, delete, admin scopes
- **Dialog Management**: State handling for multiple dialogs
- **Loading & Error States**: Skeleton, error recovery, empty state
- **Combined Filters**: Search and role filter interaction

Key test patterns:
```typescript
// Search functionality
it('filters members by search query on name', () => {
  render(<OwnerMembersPage />);
  const searchInput = screen.getByPlaceholderText('Buscar por nombre o email...');
  fireEvent.change(searchInput, { target: { value: 'juan' } });
  expect(screen.getByText('Juan Perez')).toBeInTheDocument();
});

// Role-based actions
it('shows admin scopes button only for admin members', () => {
  render(<OwnerMembersPage />);
  expect(screen.getByTestId('scopes-m3')).toBeInTheDocument(); // admin
  expect(screen.queryByTestId('scopes-m1')).not.toBeInTheDocument(); // student
});
```

### 4. OwnerSettingsPage.test.tsx (14 tests)
Settings page tests covering:
- **Rendering**: Placeholder page component structure
- **Page Metadata**: Title, description, accent color
- **Features List**: All 4 planned features (Profile, 2FA, API keys, Webhooks)
- **Backend Routes**: Empty routes array (future implementation)
- **Accessibility**: Semantic HTML structure with proper headings

### 5. OwnerInstitutionPage.test.tsx (19 tests)
Institution management tests covering:
- **Rendering**: Placeholder page component
- **Page Metadata**: Title, description, accent color
- **Features**: 4 planned features (Name/logo/slug, config, integrations, custom domain)
- **Backend Routes**: 3 API endpoints (GET, PUT, PATCH)
- **Accessibility**: Semantic structure validation
- **Branding**: Amber accent color for institution section

### 6. OwnerPlansPage.test.tsx (27 tests)
Plans management page tests covering:
- **Header Controls**: Plan count badge, create button
- **Plan Cards**: Display, prices, sorting (default first, active first)
- **Plan Actions**: Edit, delete, set default, toggle active
- **Plans Stats**: Display aggregate statistics
- **Loading & Error States**: Skeleton, error recovery, empty state
- **Refresh Button**: Manual data refresh functionality
- **Edge Cases**: Duplicate plan names, single plan, many plans

Key test patterns:
```typescript
// Plan sorting with default status
it('sorts plans with default plan first', () => {
  render(<OwnerPlansPage />);
  const cards = screen.getAllByTestId(/plan-card-/);
  expect(cards[0]).toHaveTextContent('Basic'); // default plan
});

// Dialog interactions
it('opens edit dialog when edit button is clicked', () => {
  render(<OwnerPlansPage />);
  fireEvent.click(screen.getByTestId('edit-p1'));
  expect(screen.getByTestId('edit-plan-dialog')).toBeInTheDocument();
});
```

### 7. OwnerSubscriptionsPage.test.tsx (23 tests)
Subscriptions management tests covering:
- **Header Controls**: Subscription count, new subscription button
- **Subscription Display**: Status badges, plan names, dates
- **Status Handling**: Active, trialing, past_due, canceled statuses
- **Cancel Actions**: Conditional visibility based on status
- **Loading & Error States**: Skeleton, error recovery, empty state
- **Date Formatting**: Start, end, and creation dates
- **Edge Cases**: Null plan, null period_end, empty institution ID

### 8. OwnerAccessRulesPage.test.tsx (7 tests)
Access rules management tests covering:
- **Page Rendering**: Basic component rendering
- **Plan Selection**: Dropdown with available plans
- **Edge Cases**: Empty plans, empty content tree, null institution ID
- **Toast Notifications**: Toaster component presence

### 9. OwnerReportsPage.test.tsx (15 tests)
Reports and AI generations tests covering:
- **Page Rendering**: Basic component and toaster
- **Generation Type Selector**: Filter options
- **Table Display**: Generations table rendering
- **Stats Display**: Aggregate statistics
- **Pagination**: Navigation controls
- **Loading & Error States**: Skeleton, error recovery, empty state
- **Edge Cases**: Null institution ID, missing generation type, API errors

## Test Utilities & Patterns

### Mock Data Factories
Each test file includes default mock data:
```typescript
const DEFAULT_PLATFORM_DATA = {
  institution: { id: 'inst-1', name: 'Test University' },
  members: [...],
  plans: [...],
  loading: false,
  error: null,
  refresh: vi.fn(),
};
```

### Mock Contexts
Tests mock both context providers:
```typescript
const mockUsePlatformData = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('@/app/context/PlatformDataContext', () => ({
  usePlatformData: () => mockUsePlatformData(),
}));

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));
```

### Common Test Patterns
1. **Setup/Teardown**: Console error mocking, mock reset
2. **Rendering**: Using `render()` and `screen` from React Testing Library
3. **User Interactions**: `fireEvent` for clicks, changes
4. **Async Handling**: `waitFor()` for async operations
5. **State Changes**: Mock function calls to verify side effects

## Running Tests

### Run all owner page tests:
```bash
npm test -- owner/
```

### Run specific test file:
```bash
npm test -- OwnerDashboardPage.test.tsx
```

### Run with coverage:
```bash
npm test -- --coverage owner/
```

### Run in watch mode:
```bash
npm test -- --watch owner/
```

## Test Coverage Summary

| Page | Tests | Coverage |
|------|-------|----------|
| Dashboard | 31 | Rendering, interactions, states |
| Members | 30 | Filtering, actions, dialogs |
| Plans | 27 | CRUD operations, sorting |
| Subscriptions | 23 | Status display, cancellation |
| Institution | 19 | Placeholder with backend routes |
| Settings | 14 | Placeholder features list |
| Reports | 15 | Filtering, pagination, stats |
| Access Rules | 7 | Basic interactions |
| **Total** | **166** | **Comprehensive coverage** |

## Key Testing Strategies

### 1. Context Mocking
All tests mock `usePlatformData()` and `useAuth()` hooks to isolate component logic from external dependencies.

### 2. Dialog State Management
Tests verify that dialogs open/close correctly and maintain separate state for different targets:
```typescript
it('maintains separate dialog state for different members', () => {
  render(<OwnerMembersPage />);
  fireEvent.click(screen.getByTestId('change-role-m1'));
  expect(screen.getByTestId('change-role-dialog')).toBeInTheDocument();
});
```

### 3. Async Data Loading
Tests use `waitFor()` to handle async API calls:
```typescript
it('displays subscriptions after loading', async () => {
  render(<OwnerSubscriptionsPage />);
  await waitFor(() => {
    expect(screen.getByText('Activa')).toBeInTheDocument();
  });
});
```

### 4. Error Boundaries & Fallbacks
Tests verify error states and recovery mechanisms:
```typescript
it('displays error state with retry button', () => {
  mockUsePlatformData.mockReturnValue({...DEFAULT_PLATFORM_DATA, error: 'Failed to load'});
  render(<OwnerDashboardPage />);
  expect(screen.getByText('Error al cargar el dashboard')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Reintentar'));
  expect(DEFAULT_PLATFORM_DATA.refresh).toHaveBeenCalled();
});
```

### 5. Accessibility Testing
Tests verify semantic HTML structure:
```typescript
it('has semantic structure with heading', () => {
  render(<OwnerSettingsPage />);
  const heading = screen.getByTestId('page-title');
  expect(heading.tagName).toBe('H1');
});
```

## Owner Role Requirements

All tests are written assuming the **owner** role with full permissions:
- Member management (invite, remove, change role)
- Plan creation and management
- Subscription management
- Institution configuration
- Access rule management
- Report viewing

## Notes

- Tests use **Vitest** as the test runner
- **React Testing Library** for component rendering and queries
- **Mock contexts** instead of real providers to avoid side effects
- **Comprehensive error handling** for all async operations
- **Spanish language content** matching the application UI
- Tests are **isolated and independent** - no shared state between tests

## Future Enhancements

- Add integration tests for multi-page workflows
- Add performance tests for large datasets (many members, plans, subscriptions)
- Add visual regression tests using snapshots
- Add E2E tests using Playwright or Cypress
- Test member invitation workflow end-to-end
- Test plan tier changes and their impact on member access
