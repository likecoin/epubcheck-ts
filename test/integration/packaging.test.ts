import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Packaging regression tests for the built artifacts.
 *
 * libxml2-wasm is ESM-only with a top-level await. If any module statically
 * imports it, the CJS build (`dist/index.cjs`) ends up with a synchronous
 * `require('libxml2-wasm')`, which makes `require('@likecoin/epubcheck-ts')`
 * throw `ERR_REQUIRE_ASYNC_MODULE` in Node — and, under bundlers like webpack,
 * silently yields a partial namespace where `XmlDocument` is undefined (every
 * XHTML parse then fails as a false HTM-004). The engine must instead be
 * lazy-loaded via `await import()` (see src/util/xml-engine.ts).
 *
 * The normal unit suite runs against `src/` through vitest's own loader, so it
 * cannot catch this — these tests exercise the actual build output, and the CJS
 * require runs in a real child `node` process with no bundler interop to mask it.
 */
const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const cjsPath = `${repoRoot}/dist/index.cjs`;
const esmPath = `${repoRoot}/dist/index.js`;
const fixture = `${repoRoot}/test/fixtures/valid/style-valid.epub`;

describe('packaging: build output is consumable', () => {
  beforeAll(() => {
    // These tests assert against the build output. Run `npm run build` first
    // (the `test:packaging` script and CI/prepublish flows do this).
    try {
      readFileSync(cjsPath);
      readFileSync(esmPath);
    } catch {
      throw new Error('dist/ not found — run `npm run build` before the packaging tests');
    }
  });

  it('CJS bundle does not statically require libxml2-wasm', () => {
    const cjs = readFileSync(cjsPath, 'utf8');
    // The fatal form is a synchronous `require('libxml2-wasm')`. Lazy
    // `await import('libxml2-wasm')` is fine and expected.
    expect(cjs).not.toMatch(/require\(\s*['"]libxml2-wasm['"]\s*\)/);
    expect(cjs).toMatch(/import\(\s*['"]libxml2-wasm['"]\s*\)/);
  });

  it('ESM bundle does not statically import libxml2-wasm', () => {
    const esm = readFileSync(esmPath, 'utf8');
    // A static `import ... from 'libxml2-wasm'` would propagate top-level await
    // into our entry, forcing every consumer's bundler to support TLA.
    expect(esm).not.toMatch(/^import[^\n]*from\s*['"]libxml2-wasm['"]/m);
    expect(esm).toMatch(/import\(\s*['"]libxml2-wasm['"]\s*\)/);
  });

  it('can be require()d from CommonJS and validate an EPUB', () => {
    const probe = `
      const fs = require('node:fs');
      const mod = require(${JSON.stringify(cjsPath)});
      if (typeof mod.EpubCheck?.validate !== 'function') {
        console.error('EpubCheck.validate missing');
        process.exit(3);
      }
      const bytes = new Uint8Array(fs.readFileSync(${JSON.stringify(fixture)}));
      mod.EpubCheck.validate(bytes)
        .then((r) => {
          const htm004 = (r.messages || []).filter((m) => m.id === 'HTM-004').length;
          console.log(JSON.stringify({ valid: r.valid, total: (r.messages || []).length, htm004 }));
        })
        .catch((e) => { console.error(e); process.exit(4); });
    `;
    // execFileSync throws on a non-zero exit, which is exactly what a
    // reintroduced ERR_REQUIRE_ASYNC_MODULE would cause — surfacing the bug.
    const out = execFileSync('node', ['-e', probe], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    const lines = out.trim().split('\n');
    const result = JSON.parse(lines[lines.length - 1] ?? '');
    expect(result.valid).toBe(true);
    // The original bug manifested as one false HTM-004 per content document.
    expect(result.htm004).toBe(0);
  }, 30_000);
});
