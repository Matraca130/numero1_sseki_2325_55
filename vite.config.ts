import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
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
        manualChunks(id) {
          // Core framework (shared by all routes)
          if (/node_modules\/(react|react-dom|react-router)\//.test(id)) return 'vendor-react';
          // Heavy libraries split into their own chunks for better HTTP caching.
          if (id.includes('node_modules/three/')) return 'vendor-three';
          if (id.includes('node_modules/motion/')) return 'vendor-motion';
          if (id.includes('node_modules/recharts/')) return 'vendor-recharts';
          if (id.includes('node_modules/@supabase/')) return 'vendor-supabase';
          if (id.includes('node_modules/date-fns/')) return 'vendor-dates';
          // Mux video player and TipTap editor in separate cacheable chunks
          if (id.includes('node_modules/@mux/')) return 'vendor-mux';
          if (id.includes('node_modules/@tiptap/')) return 'vendor-tiptap';
        },
      },
    },
  },
})