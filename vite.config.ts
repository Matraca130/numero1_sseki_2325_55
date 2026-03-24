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
          'vendor-g6': ['@antv/g6'],
          // PERF-R14: Break up mega-chunks by isolating shared heavy deps
          'vendor-query': ['@tanstack/react-query'],
          'vendor-sonner': ['sonner'],
          // PERF: Group all Radix UI primitives into one cached chunk
          'vendor-radix': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip',
          ],
          // PERF: Group all TipTap editor packages into one cached chunk
          'vendor-tiptap': [
            '@tiptap/core',
            '@tiptap/extension-dropcursor',
            '@tiptap/extension-image',
            '@tiptap/extension-placeholder',
            '@tiptap/extension-text-align',
            '@tiptap/extension-underline',
            // '@tiptap/pm' excluded — uses subpath exports only, no main entry
            '@tiptap/react',
            '@tiptap/starter-kit',
          ],
        },
      },
    },
  },
})