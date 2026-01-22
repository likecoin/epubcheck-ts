import { defineConfig } from 'tsup';

export default defineConfig([
  // Library build
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: true,
    clean: true,
    treeshake: true,
    sourcemap: true,
    minify: false,
    target: 'node18',
    outDir: 'dist',
    esbuildOptions(options) {
      options.conditions = ['module'];
    },
  },
  // CLI build
  {
    entry: ['bin/epubcheck.ts'],
    format: ['esm'],
    dts: false,
    splitting: false,
    clean: false,
    treeshake: false,
    sourcemap: false,
    minify: false,
    target: 'node18',
    outDir: 'bin',
    bundle: false, // Don't bundle, just transpile
    outExtension() {
      return {
        js: '.js',
      };
    },
  },
]);
