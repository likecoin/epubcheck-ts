import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EpubCheck } from '../../src/index.js';

/**
 * Real-World EPUB Regression Tests
 *
 * Every other fixture in this suite is a synthetic spec fixture built to trip a
 * single rule, typically three or four tiny files. Real books are structurally
 * different — hundreds of spine items, real images, the same markup repeated
 * throughout — and that difference hides bugs: a usage message that fires once
 * on a spec fixture fired 435 times on Pride and Prejudice without anything
 * noticing.
 *
 * Expectations below are the observed behaviour of Java EPUBCheck 5.3.0 on the
 * same files, so a divergence here is a real parity regression.
 *
 * Books are cached by `npm run fetch:real-epubs` and are gitignored;
 * these tests skip themselves when the cache is absent so offline runs and CI
 * are unaffected.
 */

const CACHE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures/real');

/** Java EPUBCheck 5.3.0 reports no errors and no warnings for any of these. */
const CLEAN_BOOKS = [
  { file: 'pg11.epub', title: "Alice's Adventures in Wonderland" },
  { file: 'pg84.epub', title: 'Frankenstein' },
  { file: 'pg1661.epub', title: 'The Adventures of Sherlock Holmes' },
  { file: 'pg2701.epub', title: 'Moby Dick' },
];

function load(file: string): Uint8Array | null {
  const path = join(CACHE_DIR, file);
  return existsSync(path) ? new Uint8Array(readFileSync(path)) : null;
}

describe('Integration Tests - Real-World EPUBs', () => {
  for (const book of CLEAN_BOOKS) {
    it(`should report no errors or warnings for ${book.title}`, async ({ skip }) => {
      const data = load(book.file);
      if (!data) {
        skip(`${book.file} not cached; run: npm run fetch:real-epubs`);
        return;
      }

      const result = await new EpubCheck({ includeUsage: true }).check(data, book.file);
      const significant = result.messages.filter(
        (m) => m.severity === 'fatal' || m.severity === 'error' || m.severity === 'warning',
      );

      expect(
        significant,
        `Expected a clean result, got: ${significant.map((m) => `${m.id} ${m.message}`).join('; ')}`,
      ).toEqual([]);
      expect(result.valid).toBe(true);
    });
  }

  it('should report only the epub:type usage message for Pride and Prejudice', async ({ skip }) => {
    const data = load('pg1342.epub');
    if (!data) {
      skip('pg1342.epub not cached; run: npm run fetch:real-epubs');
      return;
    }

    const result = await new EpubCheck({ includeUsage: true }).check(data, 'pg1342.epub');

    // Java reports the unrecognized epub:type value "normal" as a single USAGE
    // message carrying 435 locations. We emit one message per occurrence, so the
    // count differs while the finding does not — this pins the finding, and
    // guards against any error or warning appearing on a book Java passes.
    expect(result.valid).toBe(true);
    expect(new Set(result.messages.map((m) => m.id))).toEqual(new Set(['OPF-088']));
    expect(result.messages.every((m) => m.severity === 'usage')).toBe(true);
  });
});
