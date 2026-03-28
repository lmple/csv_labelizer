import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 1420,
    strictPort: true,
  },
  clearScreen: false,
  test: {
    globals: true,
    include: ['../tests/**/*.{test,spec}.{js,ts}'],
  },
});
