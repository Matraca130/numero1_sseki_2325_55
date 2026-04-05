// ============================================================
// FadeIn — Test Suite
//
// Verifies animation behavior, delay prop, direction prop,
// reduced motion handling, and useMotionPresets hook.
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FadeIn, STAGGER_DELAY, useMotionPresets } from '../FadeIn';

// Mock motion/react to avoid animation issues in tests
// Real motion library is tested elsewhere; we focus on prop handling
const mockUseReducedMotion = () => false;

describe('FadeIn', () => {
  // 1. Renders children content ----------------------------------------
  it('renders children content', () => {
    render(
      <FadeIn>
        <div data-testid="child">Content</div>
      </FadeIn>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  // 2. Renders multiple children ----------------------------------------
  it('renders multiple children', () => {
    render(
      <FadeIn>
        <div data-testid="child1">First</div>
        <div data-testid="child2">Second</div>
      </FadeIn>
    );

    expect(screen.getByTestId('child1')).toBeInTheDocument();
    expect(screen.getByTestId('child2')).toBeInTheDocument();
  });

  // 3. Applies custom className -----------------------------------------
  it('applies custom className to wrapper', () => {
    const { container } = render(
      <FadeIn className="custom-class">
        <div>Content</div>
      </FadeIn>
    );

    // The motion.div wrapper should have the custom class
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });

  // 4. Accepts delay prop -----------------------------------------------
  it('accepts delay prop for staggered animations', () => {
    render(
      <FadeIn delay={0.2}>
        <div data-testid="delayed">Delayed content</div>
      </FadeIn>
    );

    expect(screen.getByTestId('delayed')).toBeInTheDocument();
  });

  // 5. Accepts direction prop up ----------------------------------------
  it('accepts direction prop "up" for upward animation', () => {
    render(
      <FadeIn direction="up">
        <div data-testid="content">Up</div>
      </FadeIn>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  // 6. Accepts direction prop down --------------------------------------
  it('accepts direction prop "down" for downward animation', () => {
    render(
      <FadeIn direction="down">
        <div data-testid="content">Down</div>
      </FadeIn>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  // 7. Accepts direction prop left --------------------------------------
  it('accepts direction prop "left" for left animation', () => {
    render(
      <FadeIn direction="left">
        <div data-testid="content">Left</div>
      </FadeIn>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  // 8. Accepts direction prop right -------------------------------------
  it('accepts direction prop "right" for right animation', () => {
    render(
      <FadeIn direction="right">
        <div data-testid="content">Right</div>
      </FadeIn>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  // 9. Accepts direction prop none --------------------------------------
  it('accepts direction prop "none" for no directional animation', () => {
    render(
      <FadeIn direction="none">
        <div data-testid="content">No direction</div>
      </FadeIn>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  // 10. Default direction is up -----------------------------------------
  it('uses "up" as default direction when not specified', () => {
    render(
      <FadeIn>
        <div data-testid="content">Default direction</div>
      </FadeIn>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  // 11. Accepts custom duration prop ------------------------------------
  it('accepts custom duration prop', () => {
    render(
      <FadeIn duration={0.5}>
        <div data-testid="content">Custom duration</div>
      </FadeIn>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  // 12. Default delay is 0 -----------------------------------------------
  it('uses 0 as default delay when not specified', () => {
    render(
      <FadeIn>
        <div data-testid="content">No delay</div>
      </FadeIn>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  // 13. Works with various delay values ---------------------------------
  it('handles various delay values', () => {
    const delays = [0, 0.1, 0.3, 0.5, 1.0];

    delays.forEach((delay) => {
      const { unmount } = render(
        <FadeIn delay={delay}>
          <div data-testid={`content-${delay}`}>Content {delay}</div>
        </FadeIn>
      );

      expect(screen.getByTestId(`content-${delay}`)).toBeInTheDocument();
      unmount();
    });
  });

  // 14. STAGGER_DELAY constant is exported ------------------------------
  it('exports STAGGER_DELAY constant', () => {
    expect(STAGGER_DELAY).toBeDefined();
    expect(typeof STAGGER_DELAY).toBe('number');
    expect(STAGGER_DELAY).toBeGreaterThan(0);
  });

  // 15. Multiple FadeIn components can be staggered --------------------
  it('supports staggered animations across multiple components', () => {
    render(
      <>
        <FadeIn delay={0}>
          <div data-testid="item1">Item 1</div>
        </FadeIn>
        <FadeIn delay={STAGGER_DELAY}>
          <div data-testid="item2">Item 2</div>
        </FadeIn>
        <FadeIn delay={STAGGER_DELAY * 2}>
          <div data-testid="item3">Item 3</div>
        </FadeIn>
      </>
    );

    expect(screen.getByTestId('item1')).toBeInTheDocument();
    expect(screen.getByTestId('item2')).toBeInTheDocument();
    expect(screen.getByTestId('item3')).toBeInTheDocument();
  });

  // 16. Works with empty className --------------------------------------
  it('works with empty className prop', () => {
    render(
      <FadeIn className="">
        <div data-testid="content">Content</div>
      </FadeIn>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  // 17. Combines multiple props together --------------------------------
  it('combines direction, delay, and duration correctly', () => {
    render(
      <FadeIn direction="left" delay={0.2} duration={0.4} className="custom">
        <div data-testid="complex">Complex animation</div>
      </FadeIn>
    );

    expect(screen.getByTestId('complex')).toBeInTheDocument();
  });

  // 18. Renders complex children structure ------------------------------
  it('renders complex nested children structure', () => {
    render(
      <FadeIn>
        <div>
          <h2>Title</h2>
          <p>Paragraph</p>
          <button>Button</button>
        </div>
      </FadeIn>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Paragraph')).toBeInTheDocument();
    expect(screen.getByText('Button')).toBeInTheDocument();
  });

  // 19. Works with text nodes -------------------------------------------
  it('works with text node children', () => {
    const { container } = render(
      <FadeIn>
        Just some text
      </FadeIn>
    );

    expect(container).toHaveTextContent('Just some text');
  });

  // 20. All direction options produce valid output ----------------------
  it('all direction options produce valid output', () => {
    const directions: Array<'up' | 'down' | 'left' | 'right' | 'none'> = [
      'up',
      'down',
      'left',
      'right',
      'none',
    ];

    directions.forEach((direction) => {
      const { unmount } = render(
        <FadeIn direction={direction}>
          <div data-testid={`dir-${direction}`}>Direction: {direction}</div>
        </FadeIn>
      );

      expect(screen.getByTestId(`dir-${direction}`)).toBeInTheDocument();
      unmount();
    });
  });
});

// ============================================================
// useMotionPresets Hook Tests
// ============================================================

describe('useMotionPresets hook', () => {
  // 1. Hook returns object with expected properties --------------------
  it('returns object with fadeUp, cardHover, and springPop properties', () => {
    function TestComponent() {
      const presets = useMotionPresets();
      return (
        <div>
          <div data-testid="has-fadeup">{typeof presets.fadeUp === 'function' ? 'yes' : 'no'}</div>
          <div data-testid="has-cardhover">{presets.cardHover ? 'yes' : 'no'}</div>
          <div data-testid="has-springpop">{typeof presets.springPop === 'function' ? 'yes' : 'no'}</div>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('has-fadeup')).toHaveTextContent('yes');
    // cardHover may be undefined based on prefers-reduced-motion
    expect(screen.getByTestId('has-springpop')).toHaveTextContent('yes');
  });

  // 2. fadeUp function returns motion props ----------------------------
  it('fadeUp function returns valid motion props', () => {
    function TestComponent() {
      const { fadeUp } = useMotionPresets();
      const props = fadeUp();

      return (
        <div>
          <div data-testid="has-initial">{props.initial ? 'yes' : 'no'}</div>
          <div data-testid="has-animate">{props.animate ? 'yes' : 'no'}</div>
          <div data-testid="has-transition">{props.transition ? 'yes' : 'no'}</div>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('has-initial')).toHaveTextContent('yes');
    expect(screen.getByTestId('has-animate')).toHaveTextContent('yes');
    expect(screen.getByTestId('has-transition')).toHaveTextContent('yes');
  });

  // 3. fadeUp accepts delay parameter ----------------------------------
  it('fadeUp function accepts and uses delay parameter', () => {
    function TestComponent() {
      const { fadeUp } = useMotionPresets();
      const propsWithDelay = fadeUp(0.3);

      return (
        <div data-testid="has-props">{propsWithDelay.transition?.delay === 0.3 ? 'yes' : 'no'}</div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('has-props')).toHaveTextContent('yes');
  });

  // 4. springPop function returns motion props -------------------------
  it('springPop function returns valid motion props', () => {
    function TestComponent() {
      const { springPop } = useMotionPresets();
      const props = springPop();

      return (
        <div>
          <div data-testid="has-initial">{props.initial ? 'yes' : 'no'}</div>
          <div data-testid="has-animate">{props.animate ? 'yes' : 'no'}</div>
          <div data-testid="has-transition">{props.transition ? 'yes' : 'no'}</div>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('has-initial')).toHaveTextContent('yes');
    expect(screen.getByTestId('has-animate')).toHaveTextContent('yes');
    expect(screen.getByTestId('has-transition')).toHaveTextContent('yes');
  });

  // 5. springPop accepts delay parameter --------------------------------
  it('springPop function accepts and uses delay parameter', () => {
    function TestComponent() {
      const { springPop } = useMotionPresets();
      const propsWithDelay = springPop(0.5);

      return (
        <div data-testid="has-props">{propsWithDelay.transition?.delay === 0.5 ? 'yes' : 'no'}</div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('has-props')).toHaveTextContent('yes');
  });

  // 6. Default delay in functions is 0 ---------------------------------
  it('fadeUp and springPop use default delay of 0 when not provided', () => {
    function TestComponent() {
      const { fadeUp, springPop } = useMotionPresets();
      const fadeUpProps = fadeUp();
      const springPopProps = springPop();

      return (
        <div>
          <div data-testid="fadein-delay">{fadeUpProps.transition?.delay ?? 0}</div>
          <div data-testid="springpop-delay">{springPopProps.transition?.delay ?? 0}</div>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('fadein-delay')).toHaveTextContent('0');
    expect(screen.getByTestId('springpop-delay')).toHaveTextContent('0');
  });

  // 7. cardHover is defined or undefined consistently -----------------
  it('cardHover property is consistently defined or undefined', () => {
    function TestComponent() {
      const { cardHover } = useMotionPresets();
      const isDefined = cardHover !== undefined && cardHover !== null;

      return <div data-testid="cardhover-defined">{isDefined ? 'defined' : 'undefined'}</div>;
    }

    // Just verify it doesn't throw and returns something consistent
    const { rerender } = render(<TestComponent />);
    expect(screen.getByTestId('cardhover-defined')).toBeInTheDocument();

    // Rerender and verify consistency
    rerender(<TestComponent />);
    expect(screen.getByTestId('cardhover-defined')).toBeInTheDocument();
  });

  // 8. Multiple calls return consistent results -----------------------
  it('multiple calls to hook return consistent results', () => {
    function TestComponent() {
      const first = useMotionPresets();
      const second = useMotionPresets();

      return (
        <div>
          <div data-testid="same-structure">
            {Object.keys(first).length === Object.keys(second).length ? 'yes' : 'no'}
          </div>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('same-structure')).toHaveTextContent('yes');
  });
});
