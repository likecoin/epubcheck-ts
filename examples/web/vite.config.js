import { defineConfig } from 'vite';

export default defineConfig({
  base: '/epubcheck-ts/',
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext', // Use esnext to support top-level await in libxml2-wasm
  },
  optimizeDeps: {
    exclude: ['epubcheck-ts'],
  },
});
