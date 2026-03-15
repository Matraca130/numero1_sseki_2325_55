// ============================================================
// Vitest Configuration — Axon v4.4
//
// Uses the same Vite config (aliases, plugins) so tests can
// import @/app/* paths identically to production code.
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
    // Run in Node (no DOM needed for route integrity tests)
    environment: 'node',
    // Only pick up files matching this pattern
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Exclude heavy dirs
    exclude: ['node_modules', 'dist', '.git'],
  },
});
