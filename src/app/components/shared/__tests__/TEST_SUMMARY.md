# Shared Components Test Suite

## Overview
Comprehensive test coverage for AXON PROJECTO shared UI components using Vitest + React Testing Library.

## Test Files Created

### 1. AxonPageHeader.test.tsx (15 tests)
**Component:** AxonPageHeader — Main page header with title, subtitle, back button, action button, and stats sections

**Tests cover:**
- Title and subtitle rendering
- Back button presence, callback, and custom labels
- Action button rendering and visibility
- Stats sections (left/right) rendering conditions
- Responsive behavior
- Complete prop integration
- Edge cases (empty strings, long text)

**Key scenarios:**
- Back navigation functionality
- Stats row display with borders
- Header composition with all elements together

---

### 2. PageHeader.test.tsx (20 tests)
**Component:** PageHeader — Standard page header with icon, title, subtitle, accent colors, and actions

**Tests cover:**
- Icon and title rendering
- Optional subtitle behavior
- Accent color variations (blue, amber, purple, teal)
- Action button rendering and clickability
- Children content rendering
- Text styling verification
- Icon container styling

**Key scenarios:**
- All 4 accent color variants
- Icon styling per accent
- Multiple action buttons
- FadeIn wrapper integration
- Responsive layout classes

---

### 3. FadeIn.test.tsx (28 tests)
**Component:** FadeIn — Animation wrapper with directional fade effects

**Tests cover:**
- Children rendering with various content types
- Custom className application
- Delay prop for staggering
- Direction prop (up, down, left, right, none)
- Duration prop
- STAGGER_DELAY constant export
- Complex nested children
- useMotionPresets hook functionality

**Key scenarios:**
- Staggered animation sequences
- Multiple animation directions
- Motion preset objects (fadeUp, cardHover, springPop)
- Delay parameter handling in preset functions
- Reduced motion handling
- Hook consistency across rerenders

---

### 4. EmptyState.test.tsx (20 tests)
**Component:** EmptyState — Centered placeholder with icon, title, description, and CTA

**Tests cover:**
- Title and description rendering
- Default and custom icons
- Action button presence and clickability
- Custom className application
- Icon and text styling
- Variants (different icons from lucide)
- Long text handling
- Typography styling verification

**Key scenarios:**
- Optional description and action button
- Custom button labels and callbacks
- Icon size and color styling
- Responsive text sizing with clamp()
- Multiple icon support from lucide library

---

### 5. ConfirmDialog.test.tsx (20 tests)
**Component:** ConfirmDialog — Reusable confirmation modal with loading state

**Tests cover:**
- Open/closed state rendering
- Title and description display
- Default and custom button labels
- Button click callbacks (confirm, cancel)
- Loading state behavior (disabled buttons, spinner)
- Destructive vs default variants
- Children content rendering
- Multiple rerenders and state changes

**Key scenarios:**
- Button disable during loading
- Spinner icon display
- Red styling for destructive variant
- Handler function stability
- Multiple children nodes
- Dialog toggle functionality

---

### 6. ResponsiveModal.test.tsx (20 tests)
**Component:** ResponsiveModal — Modal wrapper with responsive desktop/mobile behavior

**Tests cover:**
- Open/closed state rendering
- Title and description display
- Children content rendering
- Close button functionality and aria-label
- Custom className application
- Accessibility attributes
- Complex JSX children (forms, inputs)
- Multiple open/close cycles

**Key scenarios:**
- Close button with onOpenChange callback
- Georgia serif font styling on titles
- Accessibility IDs and aria attributes
- Form integration with multiple buttons
- Desktop vs mobile layout (via useBreakpoint mock)
- Empty children handling

---

### 7. ChartErrorBoundary.test.tsx (8 tests)
**Component:** ChartErrorBoundary — Error boundary for chart components

**Tests cover:**
- Happy path (no errors)
- Fallback UI display on error
- Height prop handling (numeric, string)
- Default height (140px)
- console.error logging
- Multiple children with error handling
- Fallback styling verification

**Key scenarios:**
- Chart-specific error fallback display
- Height customization
- Error catching behavior

---

## Test Statistics

| Component | Tests | Lines | Purpose |
|-----------|-------|-------|---------|
| AxonPageHeader | 15 | 158 | Main page header |
| PageHeader | 20 | 311 | Standard page header |
| FadeIn | 28 | 398 | Animation wrapper |
| EmptyState | 20 | 254 | Empty state placeholder |
| ConfirmDialog | 20 | 336 | Confirmation modal |
| ResponsiveModal | 20 | 359 | Responsive modal |
| ChartErrorBoundary | 8 | 157 | Error boundary |
| **TOTAL** | **131** | **1,973** | **7 components** |

## Testing Approach

### Framework & Tools
- **Test Runner:** Vitest 3.2.4
- **DOM Testing:** React Testing Library
- **User Interaction:** @testing-library/user-event
- **Mocking:** vi.mock for dependencies, vi.fn for callbacks

### Key Patterns

1. **Accessibility-First**
   - Use screen.getByRole, screen.getByLabelText
   - Verify aria-labels and semantic HTML
   - Test keyboard interactions

2. **User-Centric Testing**
   - Test actual user workflows (clicks, typing)
   - Verify callback behavior
   - Validate state transitions

3. **Prop Validation**
   - Test all prop combinations
   - Verify default values
   - Check optional props behavior

4. **Visual Regression Prevention**
   - Verify CSS classes applied
   - Check inline styles
   - Validate styling consistency

5. **Edge Cases**
   - Empty strings, long text, null children
   - Multiple rerenders
   - Rapid state changes

### Mocking Strategy

**Mocked Dependencies:**
```typescript
// UI Components (shadcn)
vi.mock('@/app/components/ui/dialog', ...)
vi.mock('@/app/components/ui/alert-dialog', ...)

// Hooks
vi.mock('@/app/hooks/useBreakpoint', ...)

// Animation Library
// motion/react is imported directly (test focus is on component logic)

// Shared Components
vi.mock('../FadeIn', ...) // When testing PageHeader
```

## Running the Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- AxonPageHeader.test.tsx

# Run with coverage
npm run test:coverage

# Watch mode
npm run test -- --watch
```

## Coverage Goals

Current test suite covers:
- ✅ Component rendering and prop handling
- ✅ User interactions (clicks, form submissions)
- ✅ State management and callbacks
- ✅ Accessibility attributes
- ✅ Styling and CSS classes
- ✅ Edge cases and error conditions
- ✅ Multiple prop combinations
- ✅ Responsive behavior patterns

## Next Steps

1. **Integration Tests** — Test component combinations (e.g., PageHeader + content sections)
2. **Visual Regression** — Add snapshot testing for complex components
3. **E2E Tests** — Test components in actual page flows
4. **Performance Tests** — Monitor render performance with heavy content
5. **Mobile Tests** — Verify responsive behavior on actual mobile devices

## Notes

- Tests use descriptive, numbered naming for easy navigation
- Each test includes a comment block explaining what is being tested
- Mocking is minimal — focus on testing actual component behavior
- All tests follow AAA pattern (Arrange, Act, Assert)
- Test files are co-located with components for easy maintenance

## Dependencies Required

- vitest@3.2.4
- @testing-library/react
- @testing-library/user-event
- lucide-react (for icon components)
- motion/react (for animations)
- shadcn/ui components (Dialog, AlertDialog)
