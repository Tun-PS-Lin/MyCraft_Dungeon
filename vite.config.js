import { defineConfig } from 'vite';

// base './' lets the built site run from any path (Vercel, GitHub Pages, a sub-folder).
export default defineConfig({ base: './', build: { target: 'es2019', chunkSizeWarningLimit: 900 } });
