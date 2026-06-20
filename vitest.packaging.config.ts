import { defineConfig } from 'vitest/config';

// Runs only the packaging regression test, which validates the built artifacts
// in dist/ (and require()s them from a child process). Kept out of the default
// suite so `npm run test:run` stays fast and free of build-output coupling.
// Requires a prior `npm run build`.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/integration/packaging.test.ts'],
    testTimeout: 30000,
    pool: 'forks',
  },
});
