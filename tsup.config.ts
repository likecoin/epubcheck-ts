import { defineConfig } from 'tsup';

export default defineConfig({
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
});
