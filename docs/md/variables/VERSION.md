[**epubcheck-ts**](../README.md)

***

[epubcheck-ts](../globals.md) / VERSION

# Variable: VERSION

> `const` **VERSION**: `"0.6.4"` = `'0.6.4'`

Defined in: version.ts:10

The package version, in one place.

Deliberately a plain constant rather than a build-time define: the parity
harness and the whole test suite import `src/` directly through tsx, where a
define'd global is `undefined`, so the version would silently degrade under
exactly the tooling this repo leans on hardest. A unit test asserts this
matches `package.json`, which makes drift fail the build instead of shipping.
