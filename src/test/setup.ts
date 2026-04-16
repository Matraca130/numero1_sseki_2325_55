// ============================================================
// Axon — Global test setup
//
// Loaded by vitest.config.ts → setupFiles.
// Adds @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
// ============================================================
import '@testing-library/jest-dom';

// jsdom does not implement ResizeObserver. Recharts' ResponsiveContainer
// instantiates one at mount, so any chart-under-test throws without this
// stub. A no-op implementation is enough — we never assert on observed
// sizes in unit tests.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub })
    .ResizeObserver = ResizeObserverStub;
}
