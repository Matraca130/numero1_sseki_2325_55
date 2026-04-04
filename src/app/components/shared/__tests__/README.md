# Shared Components Test Suite

## Quick Start

All tests in this directory test AXON PROJECTO's shared UI components using **Vitest** and **React Testing Library**.

### Run Tests
```bash
cd ../../../../../../..  # Go to frontend root
npm run test              # Run all tests
npm run test -- AxonPageHeader  # Run specific test
```

### Test Files

| File | Component | Tests | Status |
|------|-----------|-------|--------|
| AxonPageHeader.test.tsx | Page header with back/stats | 15 | ✅ |
| PageHeader.test.tsx | Standard page header | 20 | ✅ |
| FadeIn.test.tsx | Animation wrapper + hook | 28 | ✅ |
| EmptyState.test.tsx | Empty state placeholder | 20 | ✅ |
| ConfirmDialog.test.tsx | Confirmation modal | 20 | ✅ |
| ResponsiveModal.test.tsx | Responsive modal | 20 | ✅ |
| ChartErrorBoundary.test.tsx | Chart error boundary | 8 | ✅ |

**Total: 131 tests across 7 components**

## Component Coverage

### Page Headers
- **AxonPageHeader** — Main page header with branding, back button, action button, stats
- **PageHeader** — Reusable header with icon, title, accent colors, actions

### Layout & Wrappers
- **FadeIn** — Animation wrapper component + useMotionPresets hook
- **ResponsiveModal** — Desktop/mobile responsive modal wrapper
- **ConfirmDialog** — Confirmation dialog with loading state

### States & Content
- **EmptyState** — Centered placeholder with icon, title, description, CTA
- **ChartErrorBoundary** — Error boundary specifically for chart components

## Testing Patterns

All tests follow **React Testing Library** best practices:
- Query by user-facing attributes (role, label, text)
- Avoid implementation details
- Test user interactions, not internal state
- Verify accessibility attributes
- Use descriptive test names

## Key Features Tested

✅ Component rendering
✅ Prop handling (required, optional, variants)
✅ User interactions (clicks, form submissions)
✅ Callback functions
✅ Disabled/loading states
✅ Styling and CSS classes
✅ Accessibility (aria-labels, roles)
✅ Multiple children and complex content
✅ Edge cases (empty strings, long text, null)
✅ Responsive behavior
✅ Animation behavior (FadeIn)

## Common Test Patterns

### Testing Rendering
```typescript
it('renders title text', () => {
  render(<Component title="Test" />);
  expect(screen.getByText('Test')).toBeInTheDocument();
});
```

### Testing Callbacks
```typescript
it('calls onConfirm when button clicked', async () => {
  const handleConfirm = vi.fn();
  const user = userEvent.setup();
  render(<Component onConfirm={handleConfirm} />);
  await user.click(screen.getByRole('button'));
  expect(handleConfirm).toHaveBeenCalledOnce();
});
```

### Testing Props
```typescript
it('applies custom className', () => {
  const { container } = render(<Component className="custom" />);
  expect(container.firstChild).toHaveClass('custom');
});
```

## Adding More Tests

When adding tests for new shared components:

1. Create `ComponentName.test.tsx` in this directory
2. Follow the numbering pattern (1., 2., etc. for test descriptions)
3. Import from `@testing-library/react` not individual utilities
4. Mock dependencies using `vi.mock()`
5. Test 15-25 scenarios per component
6. Include edge cases and multi-prop combinations
7. Update this README with component info

## Mocking Reference

Common mocks already in place:

```typescript
// For ResponsiveModal tests
vi.mock('@/app/hooks/useBreakpoint', () => ({
  useBreakpoint: () => true,
}));

// For PageHeader tests
vi.mock('../FadeIn', () => ({
  FadeIn: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
```

## Debugging Tests

```bash
# Run with verbose output
npm run test -- --reporter=verbose

# Run single test file
npm run test -- AxonPageHeader.test.tsx

# Run in watch mode
npm run test -- --watch

# Debug in browser
npm run test -- --inspect-brk
```

## Coverage Reports

```bash
npm run test:coverage
```

Check `coverage/` directory for detailed reports.

## Notes

- Tests are **unit tests** focused on component behavior in isolation
- Integration tests (components working together) go in `__integration__/`
- E2E tests (full page flows) go in `e2e/`
- All tests use **React Testing Library** philosophy (test like a user)
- Mocking is minimal to test real behavior
