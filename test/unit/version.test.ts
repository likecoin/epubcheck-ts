import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { toJSONReport } from '../../src/core/report.js';
import { VERSION } from '../../src/version.js';

/**
 * The version was hardcoded in two places and drifted: `toJSONReport` reported
 * `0.1.0` for six minor releases while the package shipped as 0.6.4. Nothing
 * compared the copies, so nothing caught it.
 *
 * `src/version.ts` is now the single source, and this makes forgetting to bump
 * it a failing test rather than a wrong number in every machine-readable report.
 */
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8'),
) as { version: string };

describe('VERSION', () => {
  it('matches package.json', () => {
    expect(VERSION).toBe(pkg.version);
  });

  it('is what the JSON report advertises', () => {
    const report = JSON.parse(
      toJSONReport({
        valid: true,
        messages: [],
        fatalCount: 0,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        usageCount: 0,
        version: '3.0',
        elapsedMs: 0,
      }),
    ) as { checker: { version: string } };

    expect(report.checker.version).toBe(pkg.version);
  });
});
