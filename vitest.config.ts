// ============================================================
// Vitest Configuration — Axon v4.4
//
// Uses the same Vite config (aliases, plugins) so tests can
// import @/app/* paths identically to production code.
//
// Environment: jsdom for React component tests.
// Setup: src/test/setup.ts loads @testing-library/jest-dom.
// ============================================================
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', '.git'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      include: ['src/app/**/*.{ts,tsx}'],
      exclude: ['src/app/components/ui/**', '**/*.test.*', '**/test-utils.*'],
    },
  },
});
