import { defineConfig } from 'vite';

// Relative base: the build can be dropped on any static host, including a GitHub Pages sub-path.
export default defineConfig({
  base: './',
  worker: { format: 'es' },
  build: { target: 'es2022' },
});
