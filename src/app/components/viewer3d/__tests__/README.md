# Viewer3D Component Tests

Comprehensive test suite for 3D viewer UI components in AXON PROJECTO.

## Test Coverage

### Core Components

#### AnimationControls.test.tsx
- **Component**: `AnimationControls` — GLTF animation playback UI
- **Coverage**: 20+ test cases
  - Animation dropdown and selection
  - Play/pause/reset controls
  - Timeline scrubbing
  - Speed selector (0.25x–2x)
  - Time formatting (MM:SS)
  - Empty state handling
  - Visual state feedback

#### PinCreationForm.test.tsx
- **Component**: `PinCreationForm` — Inline floating pin creation form
- **Coverage**: 20+ test cases
  - Form field inputs (label, description)
  - Pin type selector (Info, Keyword, Annotation, Quiz)
  - Coordinate preview display
  - Form submission validation
  - Cancel/X button behavior
  - Saving state and loading indicator
  - Keyword autocomplete integration
  - Color assignment per pin type
  - Input trimming and validation

#### LayerPanel.test.tsx
- **Component**: `LayerPanel` — Viewer sidebar for part/layer visibility control
- **Coverage**: 25+ test cases
  - Layer list rendering
  - Layer visibility toggle (checkbox)
  - Individual part visibility toggle
  - Layer opacity slider (0-100%)
  - Show All / Hide All buttons
  - Reset button functionality
  - Layer collapse/expand (chevron)
  - Color dot display
  - Layer sorting by `order_index`
  - Missing layer handling
  - Eye/eye-off icon display

#### ExplodeControl.test.tsx
- **Component**: `ExplodeControl` — Exploded view slider for revealing internal structures
- **Coverage**: 20+ test cases
  - Enable/disable toggle
  - Explode amount slider (0-100)
  - Centroid computation (multi-part)
  - Original position storage
  - Reset button and position restoration
  - Single/multiple part handling
  - Empty scene edge case
  - Parts with no bounding box
  - State persistence across re-renders
  - Visual feedback (enabled/disabled styling)

#### ClippingPlaneControls.test.tsx
- **Component**: `ClippingPlaneControls` — Clipping plane (X, Y, Z axis) UI
- **Coverage**: 20+ test cases
  - Enable/disable clipping
  - Axis selector (X, Y, Z buttons)
  - Position slider (-100 to 100)
  - Reset button
  - Active axis highlighting
  - Slider disabled when clipping off
  - State persistence
  - Null scene/renderer handling
  - Plane normal direction validation

#### KeywordAutocomplete.test.tsx
- **Component**: `KeywordAutocomplete` — Keyword search and selection
- **Coverage**: 20+ test cases
  - Search input rendering
  - Keyword filtering
  - Dropdown visibility
  - onSelect callback
  - Keyboard navigation (arrow keys, Enter, Escape)
  - Input clearing after selection
  - Loading state
  - No results message
  - Debounced search
  - Multiple selections in sequence
  - Color display per keyword
  - Outside click to close

## Running Tests

### Run all viewer3d tests:
```bash
npx vitest run src/app/components/viewer3d/__tests__/
```

### Run a specific test file:
```bash
npx vitest run src/app/components/viewer3d/__tests__/AnimationControls.test.tsx
```

### Run in watch mode:
```bash
npx vitest watch src/app/components/viewer3d/__tests__/
```

### Generate coverage report:
```bash
npx vitest run --coverage src/app/components/viewer3d/__tests__/
```

## Test Architecture

### Testing Approach

1. **No Three.js rendering** — Tests mock Three.js objects and avoid jsdom WebGL limitations
2. **UI interaction focus** — Tests exercise button clicks, slider changes, form submission
3. **Props handling** — Verify correct props passed, callbacks invoked
4. **State management** — Track local state changes (visibility toggles, sliders, forms)
5. **Edge cases** — Null/empty inputs, rapid interactions, multi-part scenarios

### Mocking Strategy

- **Three.js objects** created directly for spatial tests (Scene, Vector3, Box3, Mesh)
- **API functions** mocked at library boundary (`model3d-api`, `api` modules)
- **Callbacks** spied with `vi.fn()` to verify invocations and arguments
- **ModelPartLoader** mocked as interface with vi.fn() implementations

### Test Structure Template

Each test file follows this pattern:

```typescript
// 1. Imports (vitest, testing-library, components, mocks)
// 2. Mock setup (vi.mock, createMock* helpers)
// 3. Test suite (describe + beforeEach)
// 4. Test groups:
//    - Rendering tests
//    - Interaction tests (click, drag, type)
//    - State change tests
//    - Edge case tests
```

## Utilities & Helpers

### Common Factories

```typescript
// Create mock animation info
createMockAnimation({ name: 'Walk', duration: 2.5, index: 1 })

// Create mock part loader
createMockPartLoader({
  getPartStates: vi.fn().mockReturnValue([...])
})

// Create mock Three.js Scene with parts
createMockScene()
```

### Common Assertions

```typescript
// Button/click tests
expect(mockCallback).toHaveBeenCalledOnce()
expect(mockCallback).toHaveBeenCalledWith(expectedValue)

// Input/slider tests
expect(input.value).toBe('50')

// Visibility tests
expect(element).toBeInTheDocument()
expect(element).not.toBeInTheDocument()
```

## Key Testing Patterns

### 1. Rendering Checks
```typescript
it('renders with all expected elements', () => {
  render(<Component {...props} />)
  expect(screen.getByText('Label')).toBeInTheDocument()
  expect(screen.getByRole('button')).toBeInTheDocument()
})
```

### 2. Interaction Tests
```typescript
it('calls callback when button clicked', async () => {
  const user = userEvent.setup()
  const mockFn = vi.fn()
  render(<Component onClick={mockFn} />)
  await user.click(screen.getByRole('button'))
  expect(mockFn).toHaveBeenCalled()
})
```

### 3. State Change Tests
```typescript
it('updates value when input changed', async () => {
  const user = userEvent.setup()
  const { container } = render(<Component />)
  const input = container.querySelector('input')
  await user.type(input, 'new value')
  expect(input.value).toBe('new value')
})
```

### 4. Prop Change Tests
```typescript
it('updates display when props change', () => {
  const { rerender } = render(<Component value={1} />)
  expect(screen.getByText('1')).toBeInTheDocument()
  rerender(<Component value={2} />)
  expect(screen.getByText('2')).toBeInTheDocument()
})
```

## Files Tested

| File | Status | Tests |
|------|--------|-------|
| `AnimationControls.tsx` | ✓ | AnimationControls.test.tsx |
| `PinCreationForm.tsx` | ✓ | PinCreationForm.test.tsx |
| `LayerPanel.tsx` | ✓ | LayerPanel.test.tsx |
| `ExplodeControl.tsx` | ✓ | ExplodeControl.test.tsx |
| `ClippingPlaneControls.tsx` | ✓ | ClippingPlaneControls.test.tsx |
| `KeywordAutocomplete.tsx` | ✓ | KeywordAutocomplete.test.tsx |
| `PinSystem.tsx` | TODO | PinSystem.integration.test.tsx |
| `PinEditor.tsx` | TODO | PinEditor.test.tsx |
| `StudentNotes3D.tsx` | TODO | StudentNotes3D.test.tsx |

## Dependencies

### Test Framework
- **vitest** — Fast unit test runner (Vitest ESM-first)
- **@testing-library/react** — Component testing utilities
- **@testing-library/user-event** — User interaction simulation

### Runtime Dependencies (Mocked)
- **three** — 3D graphics library (mocked Scene, Mesh, etc.)
- **@/app/lib/model3d-api** — API client (vi.mock)
- **@/app/lib/api** — Generic API utilities (vi.mock)
- **sonner** — Toast notifications (auto-mocked by vitest)

## Best Practices

1. **Use `userEvent` instead of `fireEvent`** for realistic interactions
2. **Wait for async state** with `waitFor()` before assertions
3. **Clear mocks between tests** with `vi.clearAllMocks()` in `beforeEach`
4. **Test user behavior, not implementation** — focus on what users see/do
5. **Mock at library boundaries** — not internal component details
6. **Use factory functions** for repetitive mock data creation
7. **One assertion per test** (or tightly related assertions)
8. **Descriptive test names** — read like documentation

## Future Coverage

### Integration Tests
- PinSystem with LayerPanel interactions
- AnimationControls + PinSystem state synchronization
- Multi-panel gesture handling (collapse/expand all)

### E2E Tests (Playwright/Cypress)
- Full 3D model load → annotation → export workflow
- Pin creation → keyword linking → save → view as student
- Explode view + clipping plane combined interaction

### Accessibility Tests
- WCAG 2.1 AA compliance (color contrast, keyboard nav)
- Screen reader announcements for state changes
- ARIA labels and roles

## Troubleshooting

### Tests timing out
- Increase `waitFor` timeout: `waitFor(() => {...}, { timeout: 5000 })`
- Check if mock API is configured correctly

### userEvent not working
- Ensure `userEvent.setup()` is called before each interaction
- Use `await` with user interactions

### Element not found in document
- Check if element is rendered (use `screen.debug()`)
- Verify query selectors match actual DOM
- Check for asynchronous rendering delays

### Mock not being called
- Verify mock is passed as prop to component
- Check if component actually triggers the callback
- Use `vi.fn().mockImplementation()` for complex behavior

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/)
- [AXON PROJECTO Testing Guide](../../../docs/testing-guide.md)
