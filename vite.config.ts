import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Base URL for Netlify deployment (root path)
  base: '/',

  // Build optimization
  build: {
    // Output directory
    outDir: 'dist',

    // Generate source maps for debugging
    sourcemap: false,

    // Use esbuild instead of terser (faster and more reliable)
    minify: 'esbuild',

    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
  },

  // Development server settings
  server: {
    port: 5173,
    host: true,
    open: true,
  },

  // Preview server settings
  preview: {
    port: 4173,
    host: true,
  },

  // Dependency optimization
  optimizeDeps: {
    include: ['react', 'react-dom', 'date-fns', 'lucide-react'],
  },

  // Environment variable prefix
  envPrefix: 'VITE_',
});
