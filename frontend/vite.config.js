import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Mermaid is large (~2MB) — split it into its own chunk so it
          // doesn't block the initial page load.
          mermaid: ['mermaid'],
          // Clerk auth SDK — loads only when auth is needed.
          clerk: ['@clerk/clerk-react'],
          // React core — rarely changes, good for long-term caching.
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
