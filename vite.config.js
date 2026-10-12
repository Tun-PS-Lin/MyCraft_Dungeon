import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// base './' lets the built site run from any path (Vercel, GitHub Pages, a sub-folder).
// Two pages: the village (index.html) and the simple version (plain.html).
export default defineConfig({
  base: './',
  build: {
    target: 'es2019', chunkSizeWarningLimit: 900,
    rollupOptions: { input: { main: resolve(__dirname, 'index.html'), plain: resolve(__dirname, 'plain.html') } },
  },
});
