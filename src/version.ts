/**
 * The package version, in one place.
 *
 * It was previously hardcoded twice — in `toJSONReport` and in the CLI — and
 * the copy in `toJSONReport` had drifted six minor versions behind (`0.1.0`
 * against a published `0.6.4`), so every JSON report shipped a wrong
 * `checker.version`. Nothing compared the copies, so nothing noticed.
 *
 * Deliberately a plain constant rather than a build-time define: the parity
 * harness and the whole test suite import `src/` directly through tsx, where a
 * define'd global is `undefined`, so the version would silently degrade under
 * exactly the tooling this repo leans on hardest. A unit test asserts this
 * matches `package.json`, which makes drift fail the build instead of shipping.
 */
export const VERSION = '0.6.4';
