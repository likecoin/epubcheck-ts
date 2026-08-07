import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildReport, toJSONReport } from '../../src/core/report.js';
import { VERSION } from '../../src/version.js';

/**
 * Guards the one thing a single hardcoded version cannot guard itself: that it
 * still matches `package.json`, and that the JSON report actually emits it.
 */
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8'),
) as { version: string };

describe('VERSION', () => {
  it('matches package.json', () => {
    expect(VERSION).toBe(pkg.version);
  });

  it('is what the JSON report advertises', () => {
    const report = JSON.parse(toJSONReport(buildReport([], '3.0', 0))) as {
      checker: { version: string };
    };
    // Against VERSION, not pkg.version: the test above already pins those
    // together, so this one stays about the report emitting the constant.
    expect(report.checker.version).toBe(VERSION);
  });
});
