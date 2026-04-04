# Schedule Components Testing Guide

A practical guide for writing and maintaining tests for schedule components.

## Quick Start

### Running Your First Test

```bash
# Run all schedule component tests
npm run test -- src/app/components/schedule/__tests__

# Watch mode for development
npm run test -- src/app/components/schedule/__tests__ --watch

# Run single test file
npm run test -- StudyPlanDashboard.test.tsx
```

## Test File Structure

Each test file follows this structure:

```typescript
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// 1. Component import
import { MyComponent } from '../MyComponent';

// 2. Mock external dependencies
vi.mock('@/app/hooks/useMyHook', () => ({
  useMyHook: () => ({ data: 'mocked' }),
}));

// 3. Helper functions
function renderComponent(props = {}) {
  return render(<MyComponent {...props} />);
}

// 4. Test suite
describe('MyComponent', () => {
  // 5. Test groups
  describe('Rendering', () => {
    it('renders component', () => {
      renderComponent();
      expect(screen.getByText(/title/i)).toBeInTheDocument();
    });
  });
});
```

## Common Patterns

### Pattern 1: Component with Callbacks

Test that callbacks are called correctly:

```typescript
it('calls onTaskComplete when task is clicked', async () => {
  const onTaskComplete = vi.fn();
  render(<TaskCard task={task} onComplete={onTaskComplete} />);

  await userEvent.click(screen.getByRole('button'));

  expect(onTaskComplete).toHaveBeenCalledWith(task.id);
});
```

### Pattern 2: State Updates

Test that UI updates reflect state changes:

```typescript
it('updates completed status when toggled', async () => {
  render(<TaskCard task={{ ...task, completed: false }} />);

  expect(screen.getByText('Not completed')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('checkbox'));

  await waitFor(() => {
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});
```

### Pattern 3: Conditional Rendering

Test different render paths:

```typescript
describe('Empty state', () => {
  it('shows message when no tasks', () => {
    render(<TaskList tasks={[]} />);
    expect(screen.getByText(/no tasks/i)).toBeInTheDocument();
  });

  it('shows tasks when available', () => {
    render(<TaskList tasks={[task1, task2]} />);
    expect(screen.getByText('Task 1')).toBeInTheDocument();
  });
});
```

### Pattern 4: Date Handling

Always use `date-fns` for date comparisons:

```typescript
import { isSameDay, format, addDays } from 'date-fns';

it('filters tasks by date', () => {
  const today = new Date();
  const tomorrow = addDays(today, 1);

  render(<Calendar tasks={[
    { ...task, date: today },
    { ...task, date: tomorrow },
  ]} />);

  expect(screen.getByText(/today/i)).toBeInTheDocument();
});
```

### Pattern 5: Navigation

Test routing and navigation:

```typescript
it('navigates to new plan page', async () => {
  const navigateTo = vi.fn();
  vi.mocked(useStudentNav).mockReturnValue({ navigateTo });

  render(<Dashboard />);

  await userEvent.click(screen.getByRole('button', { name: /create/i }));

  expect(navigateTo).toHaveBeenCalledWith('organize-study');
});
```

### Pattern 6: Async Operations

Test async callbacks:

```typescript
it('handles task completion', async () => {
  const toggleFn = vi.fn().mockResolvedValue(undefined);

  render(<TaskCard task={task} onToggle={toggleFn} />);

  await userEvent.click(screen.getByRole('button'));

  await waitFor(() => {
    expect(toggleFn).toHaveBeenCalled();
  });
});
```

### Pattern 7: Multiple Items

Test with collections:

```typescript
it('displays all tasks grouped by subject', () => {
  const tasks = [
    { id: '1', subject: 'Math', title: 'Algebra' },
    { id: '2', subject: 'Math', title: 'Geometry' },
    { id: '3', subject: 'Science', title: 'Physics' },
  ];

  render(<TaskList tasks={tasks} />);

  // Check grouping
  const mathGroup = screen.getByText('Math');
  expect(mathGroup).toBeInTheDocument();

  // Check all items present
  expect(screen.getByText('Algebra')).toBeInTheDocument();
  expect(screen.getByText('Geometry')).toBeInTheDocument();
  expect(screen.getByText('Physics')).toBeInTheDocument();
});
```

## Mock Strategy

### Mocking Hooks

```typescript
vi.mock('@/app/hooks/useStudentNav', () => ({
  useStudentNav: () => ({
    navigateTo: vi.fn(),
  }),
}));

// In test:
import { useStudentNav } from '@/app/hooks/useStudentNav';
const mockNavigate = vi.mocked(useStudentNav).mock.results[0].value.navigateTo;
expect(mockNavigate).toHaveBeenCalled();
```

### Mocking Context

```typescript
vi.mock('@/app/context/MyContext', () => ({
  useMyContext: () => ({
    value: 'mocked',
    setValue: vi.fn(),
  }),
}));
```

### Mocking Components

```typescript
vi.mock('@/app/components/MyChildComponent', () => ({
  MyChildComponent: () => <div data-testid="mock-child">Mocked</div>,
}));
```

### Mocking Async Functions

```typescript
const mockFetch = vi.fn();
mockFetch.mockResolvedValueOnce({ data: 'response' });
mockFetch.mockRejectedValueOnce(new Error('Network error'));
```

## Assertions Guide

### Text Content

```typescript
// Exact match
expect(screen.getByText('Exact')).toBeInTheDocument();

// Case-insensitive
expect(screen.getByText(/exact/i)).toBeInTheDocument();

// Partial match
expect(screen.getByText(/part of text/)).toBeInTheDocument();
```

### Elements

```typescript
// Element exists
expect(screen.getByRole('button')).toBeInTheDocument();

// Element visible
expect(screen.getByText('Content')).toBeVisible();

// Element disabled
expect(screen.getByRole('button')).toBeDisabled();

// Element has class
expect(screen.getByText('Text')).toHaveClass('active');

// Element has attribute
expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Close');
```

### Styles

```typescript
// Has inline style
expect(element).toHaveStyle('color: red');

// CSS class application
expect(element).toHaveClass('bg-blue-500');
```

### Calls

```typescript
// Called at all
expect(mockFn).toHaveBeenCalled();

// Called specific number of times
expect(mockFn).toHaveBeenCalledTimes(2);

// Called with specific arguments
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');

// Last call
expect(mockFn).toHaveBeenLastCalledWith('arg');
```

## Debugging Tips

### Print DOM

```typescript
screen.debug(); // Print entire DOM
screen.debug(element); // Print specific element
```

### Get all elements by type

```typescript
screen.getAllByRole('button'); // All buttons
screen.queryAllByText(/text/); // All matching text
```

### Wait for element

```typescript
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
}, { timeout: 5000 });
```

### Check if element queries work

```typescript
// Query returns null if not found (doesn't throw)
expect(screen.queryByText('Not there')).not.toBeInTheDocument();

// Get throws error if not found
// expect(screen.getByText('Not there')).toThrow();
```

## Performance Considerations

### Large Lists

For components with 50+ items:

```typescript
it('renders efficiently with many tasks', async () => {
  const manyTasks = Array.from({ length: 100 }, (_, i) => ({
    id: String(i),
    title: `Task ${i}`,
  }));

  const { container } = render(<TaskList tasks={manyTasks} />);

  // Check virtual scrolling or pagination is used
  expect(container.querySelectorAll('[data-testid="task"]').length).toBeLessThan(50);
});
```

### Animation Performance

```typescript
it('transitions smoothly between views', async () => {
  render(<Dashboard />);

  const startTime = performance.now();
  await userEvent.click(screen.getByRole('button'));
  const endTime = performance.now();

  // Should complete within reasonable time
  expect(endTime - startTime).toBeLessThan(1000);
});
```

## Accessibility Testing

### Keyboard Navigation

```typescript
it('is keyboard navigable', async () => {
  render(<TaskCard task={task} />);

  // Tab to button
  await userEvent.tab();
  expect(screen.getByRole('button')).toHaveFocus();

  // Enter to activate
  await userEvent.keyboard('{Enter}');
  expect(mockFn).toHaveBeenCalled();
});
```

### ARIA Labels

```typescript
it('has proper ARIA labels', () => {
  render(<IconButton icon="close" />);
  expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Close');
});
```

### Color Contrast

```typescript
it('has sufficient color contrast', () => {
  const { container } = render(<Button>Click me</Button>);
  // Would need axe-core or similar for programmatic testing
  expect(container.querySelector('button')).toHaveStyle('color: #000000');
});
```

## Best Practices

1. **Test behavior, not implementation**
   ```typescript
   // Good: Test what user sees
   expect(screen.getByText('Task completed')).toBeInTheDocument();

   // Bad: Testing internal state
   expect(component.state.isCompleted).toBe(true);
   ```

2. **Use semantic queries**
   ```typescript
   // Good: Use role
   screen.getByRole('button', { name: /submit/i });

   // Okay: Use label text
   screen.getByLabelText('Email');

   // Avoid: Test IDs (unless necessary)
   screen.getByTestId('email-input');
   ```

3. **Test edge cases**
   ```typescript
   // Empty state
   render(<List items={[]} />);

   // Many items
   render(<List items={Array(100).fill(item)} />);

   // Null/undefined
   render(<Component value={null} />);
   ```

4. **Use descriptive test names**
   ```typescript
   // Good
   it('displays task completion percentage when tasks are present', () => {});

   // Bad
   it('works', () => {});
   ```

5. **Keep tests independent**
   ```typescript
   // Each test should be runnable in any order
   // Use beforeEach for setup, not shared state
   ```

## Troubleshooting

### Element not found
```typescript
// Use debug to see what's rendered
screen.debug();

// Check for async operations
await waitFor(() => {
  expect(screen.getByText('Content')).toBeInTheDocument();
});

// Use queryBy instead of getBy to avoid throwing
const element = screen.queryByText('Content');
```

### Mock not working
```typescript
// Check mock is defined before import
vi.mock('@/path', () => ({ ... }));

// Import after mock definition
import { useHook } from '@/path';

// Verify mock in test
expect(vi.mocked(useHook)).toBeDefined();
```

### Animation not complete
```typescript
// Wait for animation to finish
await waitFor(() => {
  expect(element).toHaveStyle('opacity: 1');
});
```

## Further Reading

- [Vitest Guide](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/react)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Accessibility Testing](https://www.w3.org/WAI/test-evaluate/)
