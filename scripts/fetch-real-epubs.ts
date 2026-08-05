#!/usr/bin/env -S npx tsx
/**
 * Download a few public-domain EPUBs for the real-world regression test.
 *
 * The fixture corpus is entirely synthetic spec fixtures, each a handful of tiny
 * files. Real books exercise paths those never reach — hundreds of spine items,
 * real images, the same markup repeated throughout — which is how a message that
 * fires 435 times on one book went unnoticed.
 *
 * Books are cached under test/fixtures/real/ (gitignored) rather than vendored,
 * to keep them out of the repo. test/integration/real-world.test.ts skips itself
 * when the cache is absent, so this is never required to run the suite.
 *
 * Usage: npx tsx scripts/fetch-real-epubs.ts
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(resolve(__dirname, '..'), 'test', 'fixtures', 'real');

/** Project Gutenberg IDs; all public domain. */
const BOOKS: { id: number; title: string }[] = [
  { id: 11, title: "Alice's Adventures in Wonderland" },
  { id: 84, title: 'Frankenstein' },
  { id: 1661, title: 'The Adventures of Sherlock Holmes' },
  { id: 2701, title: 'Moby Dick' },
  { id: 1342, title: 'Pride and Prejudice' },
];

mkdirSync(CACHE_DIR, { recursive: true });

let downloaded = 0;
let cached = 0;

for (const book of BOOKS) {
  const dest = join(CACHE_DIR, `pg${String(book.id)}.epub`);
  if (existsSync(dest)) {
    cached++;
    continue;
  }

  const url = `https://www.gutenberg.org/ebooks/${String(book.id)}.epub3.images`;
  process.stdout.write(`Fetching ${book.title} (pg${String(book.id)})... `);

  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    console.log(`FAILED (HTTP ${String(response.status)})`);
    continue;
  }

  writeFileSync(dest, new Uint8Array(await response.arrayBuffer()));
  console.log('ok');
  downloaded++;
}

console.log(`\n${String(downloaded)} downloaded, ${String(cached)} already cached → ${CACHE_DIR}`);
