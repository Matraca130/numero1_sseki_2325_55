import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

// manualChunks must only apply to the client (browser) build.
// The Cloudflare Workers build (worker environment) does not support
// manualChunks and will error if it inherits this option.
//
// Object-form chunking works for packages that expose a resolvable main
// entry (three, motion, recharts, supabase, date-fns, mux, react, etc.).
// For namespace packages without a root export (e.g. @tiptap/pm) we use
// the function form below to match any module under that scope.
const clientManualChunks: Record<string, string[]> = {
  // Core framework (shared by all routes)
  'vendor-react': ['react', 'react-dom', 'react-router'],
  // Heavy libraries split into their own chunks for better HTTP caching.
  // Each only loads when its consuming route is visited.
  'vendor-three': ['three'],
  'vendor-motion': ['motion'],
  'vendor-recharts': ['recharts'],
  'vendor-supabase': ['@supabase/supabase-js'],
  'vendor-dates': ['date-fns'],
  // Mux: only loaded by video player / upload routes.
  'vendor-mux': ['@mux/mux-player-react', '@mux/upchunk'],
};

// Function-form manualChunks: catch every @tiptap/* module (including the
// namespace-only @tiptap/pm/* subpaths which can't be named in object form).
// Falls back to the object-form map for everything else.
function manualChunks(id: string): string | undefined {
  if (id.includes('node_modules/@tiptap/')) {
    return 'vendor-tiptap';
  }
  for (const [chunk, pkgs] of Object.entries(clientManualChunks)) {
    for (const pkg of pkgs) {
      // Match either "node_modules/<pkg>/" or the bare spec (rare).
      if (id.includes(`node_modules/${pkg}/`)) return chunk;
    }
  }
  return undefined;
}

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [// The React and Tailwind plugins are both required for Make, even if
  // Tailwind is not being actively used – do not remove them
  react(), tailwindcss(), cloudflare()],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
      // Force all three imports to resolve to the same physical module
      'three': path.resolve(__dirname, 'node_modules/three'),
    },
    dedupe: ['three'],
  },
  optimizeDeps: {
    include: ['three', 'three/examples/jsm/controls/OrbitControls.js'],
  },
  build: {
    // PERF-76: Raise warning limit slightly (chunks will be much smaller now)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Only split chunks for the client build; the Workers runtime build
        // does not support manualChunks and would fail with this config.
        manualChunks: isSsrBuild ? undefined : manualChunks,
      },
    },
  },
}))
