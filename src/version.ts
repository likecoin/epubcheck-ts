/**
 * The package version, in one place.
 *
 * Deliberately a plain constant rather than a build-time define: the parity
 * harness and the whole test suite import `src/` directly through tsx, where a
 * define'd global is `undefined`, so the version would silently degrade under
 * exactly the tooling this repo leans on hardest. A unit test asserts this
 * matches `package.json`, which makes drift fail the build instead of shipping.
 */
export const VERSION = '0.6.4';
