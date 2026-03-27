import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
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
        manualChunks: {
          // Core framework (shared by all routes)
          'vendor-react': ['react', 'react-dom', 'react-router'],
          // Heavy libraries split into their own chunks for better HTTP caching.
          // Each only loads when its consuming route is visited.
          'vendor-three': ['three'],
          'vendor-motion': ['motion'],
          'vendor-recharts': ['recharts'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-dates': ['date-fns'],
        },
      },
    },
  },
})