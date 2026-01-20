import { defineConfig } from 'vite';

export default defineConfig({
  base: '/epubcheck-ts/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  optimizeDeps: {
    exclude: ['epubcheck-ts'],
  },
});
