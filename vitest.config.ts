import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    // These run against the build output, not src, so they need a prior
    // `npm run build`; they have their own config (vitest.packaging.config.ts)
    // and the `test:packaging` script. Left in the default suite they pass on a
    // machine that happens to have dist/ lying around and fail on a fresh clone.
    exclude: [
      'node_modules',
      'dist',
      'test/integration/packaging.test.ts',
      'test/integration/cli.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/index.ts', 'src/types.ts'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    pool: 'forks',
  },
});
