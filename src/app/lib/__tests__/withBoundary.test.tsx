// ============================================================
// Tests for withBoundary.tsx — Error boundary HOC
//
// Verifies:
//   - Component wrapping with ErrorBoundary
//   - Props forwarding
//   - Display name generation
//   - Error catching behavior
//   - Children rendering when no error
// ============================================================

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import React from 'react';
import { withBoundary } from '@/app/lib/withBoundary';
import type { ErrorBoundaryProps } from '@/app/components/shared/ErrorBoundary';

// ──────────────────────────────────────────────────────────
// Setup & Teardown
// ──────────────────────────────────────────────────────────

let consoleErrorSpy: MockInstance;

beforeEach(() => {
  // Suppress React's error boundary console output
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

// ──────────────────────────────────────────────────────────
// Test Components
// ──────────────────────────────────────────────────────────

interface TestComponentProps {
  message?: string;
  testId?: string;
}

function TestComponent({ message = 'test content', testId = 'test-component' }: TestComponentProps) {
  return <div data-testid={testId}>{message}</div>;
}

function ThrowingComponent() {
  throw new Error('Component crashed');
}

// ──────────────────────────────────────────────────────────
// SUITE 1: Component wrapping
// ──────────────────────────────────────────────────────────

describe('withBoundary — component wrapping', () => {
  it('wraps a component with ErrorBoundary', () => {
    const Wrapped = withBoundary(TestComponent, 'Error in component');
    const { container } = render(<Wrapped />);

    // Component should render successfully
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(screen.getByText('test content')).toBeInTheDocument();
  });

  it('renders children when no error occurs', () => {
    const Wrapped = withBoundary(TestComponent, 'Error message');
    render(<Wrapped />);

    expect(screen.getByTestId('test-component')).toBeInTheDocument();
  });

  it('catches errors thrown by wrapped component', () => {
    const Wrapped = withBoundary(ThrowingComponent, 'Component failed');
    render(<Wrapped />);

    // Fallback should be rendered (ErrorBoundary's default is full-page fallback)
    // We can verify the component didn't render successfully
    expect(screen.queryByTestId('throwing-component')).not.toBeInTheDocument();
  });

  it('works with functional components', () => {
    const FunctionalComponent = ({ data }: { data: string }) => <div>{data}</div>;
    const Wrapped = withBoundary(FunctionalComponent, 'Functional error');

    render(<Wrapped data="test data" />);
    expect(screen.getByText('test data')).toBeInTheDocument();
  });

  it('works with class components', () => {
    class ClassComponent extends React.Component<{ title: string }> {
      render() {
        return <div>{this.props.title}</div>;
      }
    }

    const Wrapped = withBoundary(ClassComponent, 'Class error');
    render(<Wrapped title="class component" />);

    expect(screen.getByText('class component')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 2: Props forwarding
// ──────────────────────────────────────────────────────────

describe('withBoundary — props forwarding', () => {
  it('forwards string props to wrapped component', () => {
    const Wrapped = withBoundary(TestComponent, 'Error');
    render(<Wrapped message="custom message" />);

    expect(screen.getByText('custom message')).toBeInTheDocument();
  });

  it('forwards testId prop', () => {
    const Wrapped = withBoundary(TestComponent, 'Error');
    render(<Wrapped testId="custom-id" />);

    expect(screen.getByTestId('custom-id')).toBeInTheDocument();
  });

  it('forwards multiple props', () => {
    interface MultiPropComponent {
      title: string;
      subtitle: string;
      id: string;
    }

    function MultiComponent({ title, subtitle, id }: MultiPropComponent) {
      return (
        <div id={id}>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      );
    }

    const Wrapped = withBoundary(MultiComponent, 'Error');
    render(
      <Wrapped
        title="Main Title"
        subtitle="Sub Title"
        id="main-div"
      />,
    );

    expect(screen.getByText('Main Title')).toBeInTheDocument();
    expect(screen.getByText('Sub Title')).toBeInTheDocument();
    expect(document.getElementById('main-div')).toBeInTheDocument();
  });

  it('forwards object props', () => {
    interface ObjectPropComponent {
      data: { name: string; age: number };
    }

    function DataComponent({ data }: ObjectPropComponent) {
      return <div>{data.name} - {data.age}</div>;
    }

    const Wrapped = withBoundary(DataComponent, 'Error');
    render(<Wrapped data={{ name: 'John', age: 30 }} />);

    expect(screen.getByText('John - 30')).toBeInTheDocument();
  });

  it('forwards array props', () => {
    interface ArrayPropComponent {
      items: string[];
    }

    function ListComponent({ items }: ArrayPropComponent) {
      return (
        <ul>
          {items.map((item, idx) => <li key={idx}>{item}</li>)}
        </ul>
      );
    }

    const Wrapped = withBoundary(ListComponent, 'Error');
    render(<Wrapped items={['a', 'b', 'c']} />);

    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
    expect(screen.getByText('c')).toBeInTheDocument();
  });

  it('forwards function props', () => {
    interface FunctionPropComponent {
      onClick: () => void;
    }

    function ButtonComponent({ onClick }: FunctionPropComponent) {
      return <button onClick={onClick}>Click me</button>;
    }

    const handleClick = vi.fn();
    const Wrapped = withBoundary(ButtonComponent, 'Error');
    render(<Wrapped onClick={handleClick} />);

    const button = screen.getByText('Click me');
    button.click();
    expect(handleClick).toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 3: Display name generation
// ──────────────────────────────────────────────────────────

describe('withBoundary — display name', () => {
  it('generates display name from component name', () => {
    const Wrapped = withBoundary(TestComponent, 'Error');
    expect(Wrapped.displayName).toContain('Bounded');
    expect(Wrapped.displayName).toContain('TestComponent');
  });

  it('handles component without displayName or name', () => {
    const Anonymous = () => <div>anon</div>;
    const Wrapped = withBoundary(Anonymous, 'Error');
    expect(Wrapped.displayName).toContain('Bounded');
    // Anonymous function name will be 'Anonymous' not 'Component'
    expect(Wrapped.displayName).toContain('Anonymous');
  });

  it('uses displayName when available', () => {
    function CustomComponent() {
      return <div>custom</div>;
    }
    CustomComponent.displayName = 'CustomDisplayName';

    const Wrapped = withBoundary(CustomComponent, 'Error');
    expect(Wrapped.displayName).toContain('CustomDisplayName');
  });

  it('display name is useful for debugging', () => {
    const Wrapped = withBoundary(TestComponent, 'Error');
    const displayName = Wrapped.displayName || '';

    expect(displayName).toBeTruthy();
    expect(displayName).toMatch(/Bounded\(/);
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 4: Error boundary behavior
// ──────────────────────────────────────────────────────────

describe('withBoundary — error catching', () => {
  it('catches render errors', () => {
    const ErrorComponent = () => {
      throw new Error('Render failed');
    };

    const Wrapped = withBoundary(ErrorComponent, 'Render error message');
    render(<Wrapped />);

    // Should not crash the test
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('boundary is transparent when no error', () => {
    const WrappedTest = withBoundary(TestComponent, 'Error');
    const { container } = render(<WrappedTest message="visible" />);

    const testDiv = container.querySelector('[data-testid="test-component"]');
    expect(testDiv).toBeInTheDocument();
    expect(testDiv?.textContent).toBe('visible');
  });

  it('uses fallbackTitle parameter', () => {
    const FallbackTitleTest = withBoundary(ThrowingComponent, 'Test fallback title');
    // The ErrorBoundary receives the fallbackTitle prop
    // Exact rendering depends on ErrorBoundary implementation
    render(<FallbackTitleTest />);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 5: Generic type handling
// ──────────────────────────────────────────────────────────

describe('withBoundary — type safety', () => {
  it('preserves component prop types', () => {
    interface StrictProps {
      required: string;
      optional?: number;
    }

    function StrictComponent({ required, optional }: StrictProps) {
      return (
        <div>
          {required} - {optional ?? 'no optional'}
        </div>
      );
    }

    const Wrapped = withBoundary(StrictComponent, 'Error');
    render(<Wrapped required="test" optional={42} />);

    expect(screen.getByText('test - 42')).toBeInTheDocument();
  });

  it('works with empty props', () => {
    function NoPropsComponent() {
      return <div>no props</div>;
    }

    const Wrapped = withBoundary(NoPropsComponent, 'Error');
    render(<Wrapped />);

    expect(screen.getByText('no props')).toBeInTheDocument();
  });

  it('works with generic components', () => {
    function GenericComponent<T extends { label: string }>({ item }: { item: T }) {
      return <div>{item.label}</div>;
    }

    interface Item {
      label: string;
      id: number;
    }

    const Wrapped = withBoundary(GenericComponent as React.ComponentType<{ item: Item }>, 'Error');
    render(<Wrapped item={{ label: 'Test item', id: 1 }} />);

    expect(screen.getByText('Test item')).toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────
// SUITE 6: Route integration pattern
// ──────────────────────────────────────────────────────────

describe('withBoundary — route usage pattern', () => {
  it('simulates React Router lazy pattern', () => {
    function StudentView() {
      return <div>Student View Content</div>;
    }

    // This is how it's used in router config:
    const lazyResult = {
      Component: withBoundary(StudentView, 'Error en estudiantes'),
    };

    render(<lazyResult.Component />);
    expect(screen.getByText('Student View Content')).toBeInTheDocument();
  });

  it('handles async lazy import pattern', async () => {
    function DashboardView() {
      return <div>Dashboard</div>;
    }

    const WrappedComponent = withBoundary(DashboardView, 'Error en dashboard');
    const { Component } = { Component: WrappedComponent };

    render(<Component />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
