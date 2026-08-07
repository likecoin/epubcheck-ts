import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
// `expect` is deliberately not imported: concurrent tests take it from their
// own context so a failure attributes to the right test.
import { beforeAll, describe, it } from 'vitest';
// From src, not package.json: test/unit/version.test.ts already pins those two
// together, so these stay a check that the *built* CLI reports what source
// says — which also catches a stale dist.
import { VERSION } from '../../src/version.js';

/**
 * Contract tests for the `epubcheck-ts` binary.
 *
 * These assert the *CLI contract* — flag mapping, exit codes, stream routing —
 * not validation agreement with Java. That is already covered, far more
 * thoroughly, by `npm run parity` over 763 fixtures.
 *
 * Lives in the packaging suite because `bin/epubcheck.js` imports `dist/`, and
 * the default suite deliberately runs against `src/` without building.
 */
const execFileAsync = promisify(execFile);

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
const cli = `${repoRoot}/bin/epubcheck.js`;
const validEpub = `${repoRoot}/test/fixtures/valid/style-valid.epub`;
const warningEpub = `${repoRoot}/test/fixtures/warnings/aria-roles-li-deprecated-warning.epub`;
const errorEpub = `${repoRoot}/test/fixtures/invalid/content/id-duplicate-error.epub`;
const edupubError = `${repoRoot}/test/fixtures/profiles/edupub/epub/edupub-pagelist-no-source-error.epub`;

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * The CLI exits non-zero by design, which execFile raises as an error with the
 * output hanging off it. Normalising both paths keeps every assertion below
 * able to read stdout, stderr and the code independently — the split matters,
 * because routing is itself part of the contract.
 */
async function run(...args: string[]): Promise<Run> {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [cli, ...args], {
      maxBuffer: 32 * 1024 * 1024,
    });
    return { code: 0, stdout, stderr };
  } catch (err) {
    const e = err as { code?: unknown; stdout?: string; stderr?: string };
    // Only a numeric code is an exit status. A signal death gives null and a
    // spawn failure gives a string like 'ENOENT'; coercing either to 1 would let
    // a segfault satisfy an "exits 1" assertion and report a crash as a pass.
    if (typeof e.code !== 'number') throw err;
    return { code: e.code, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

describe.concurrent('cli: contract', () => {
  beforeAll(() => {
    if (!existsSync(cli) || !existsSync(`${repoRoot}/dist/index.js`)) {
      throw new Error('bin/epubcheck.js or dist/ not found — run `npm run build` first');
    }
  });

  describe('exit codes', () => {
    it('exits 0 for a valid EPUB', async ({ expect }) => {
      expect((await run(validEpub)).code).toBe(0);
    });

    it('exits 1 for an EPUB with errors', async ({ expect }) => {
      expect((await run(errorEpub)).code).toBe(1);
    });

    it('exits 2 for an unknown flag', async ({ expect }) => {
      const r = await run(validEpub, '--bogus-flag');
      expect(r.code).toBe(2);
      expect(r.stderr).toMatch(/--help/);
    });

    it('prints help and exits 0 when no file is given', async ({ expect }) => {
      // Current behaviour, recorded rather than endorsed: a bare invocation in
      // a script therefore "succeeds". Aligning this with the exit-code work
      // is a 0.7.0 item, since changing it is observable.
      const r = await run();
      expect(r.code).toBe(0);
      expect(r.stdout).toContain('Usage:');
    });
  });

  describe('warning flags are not interchangeable', () => {
    // The README documented `-w` as `--fail-on-warnings`. They are different
    // options with different exit codes, which is exactly the kind of mistake
    // that silently disarms a CI pipeline.
    it('-w is a display filter and does not fail the run', async ({ expect }) => {
      expect((await run(warningEpub, '-w')).code).toBe(0);
    });

    it('--fail-on-warnings exits 1 on the same file', async ({ expect }) => {
      expect((await run(warningEpub, '--fail-on-warnings')).code).toBe(1);
    });

    it('accepts --failonwarnings for Java compatibility', async ({ expect }) => {
      expect((await run(warningEpub, '--failonwarnings')).code).toBe(1);
    });
  });

  describe('version flags', () => {
    // `-v` takes a value (--epub-version); `-V` is --version. The README had
    // these transposed, so the documented invocation errored.
    it('-V prints the version and exits 0', async ({ expect }) => {
      const r = await run('-V');
      expect(r.code).toBe(0);
      expect(r.stdout).toContain(VERSION);
    });

    it('bare -v is an error, not a version request', async ({ expect }) => {
      const r = await run('-v');
      expect(r.code).toBe(2);
      expect(r.stderr).toMatch(/argument missing/i);
    });

    it('reports the package version in the JSON report', async ({ expect }) => {
      // `-q` is required to get parseable JSON on stdout: the human summary is
      // written to stdout too, so `--json -` alone is not pipeable. Routing
      // that summary to stderr is a 0.7.0 change. The version itself was the
      // bug here — every report said 0.1.0 regardless of the release.
      const r = await run(validEpub, '-q', '--json', '-');
      const report = JSON.parse(r.stdout) as { checker: { version: string } };
      expect(report.checker.version).toBe(VERSION);
    });
  });

  describe('profile validation', () => {
    it('applies a valid profile', async ({ expect }) => {
      expect((await run(edupubError, '-p', 'edupub')).code).toBe(1);
    });

    it('rejects an unknown profile instead of silently using the default', async ({ expect }) => {
      // Regression guard: this used to exit 0 with no errors, reporting a clean
      // result for a book that violates the profile the user asked for.
      const r = await run(edupubError, '-p', 'bogus');
      expect(r.code).toBe(2);
      expect(r.stderr).toMatch(/Invalid profile/);
    });
  });

  describe('documentation stays in sync', () => {
    /**
     * Short↔long pairs, which is what actually broke: the README listed
     * `-w, --fail-on-warnings` and `-v, --version` while the real pairs were
     * `-w, --warn` and `-V, --version`. Both long flags appeared in the README,
     * so checking long-flag membership alone would have passed straight over
     * the bug this test exists for.
     *
     * Compared as sets in both directions, so a flag removed from `--help` and
     * left in the README fails too.
     */
    const pairs = (text: string): string[] =>
      [...text.matchAll(/(-[a-zA-Z]), (--[\w-]+)/g)]
        .map(([, short, long]) => `${short ?? ''} ${long ?? ''}`)
        .sort();

    it('README and --help agree on every short/long flag pair', async ({ expect }) => {
      const help = (await run('--help')).stdout;
      const readme = readFileSync(`${repoRoot}/README.md`, 'utf8');

      const fromHelp = pairs(help);
      // Guards against a --help that prints nothing making this vacuous.
      expect(fromHelp).toContain('-w --warn');

      expect(pairs(readme)).toEqual(fromHelp);
    });

    it('README documents every long flag in --help', async ({ expect }) => {
      const help = (await run('--help')).stdout;
      const readme = readFileSync(`${repoRoot}/README.md`, 'utf8');

      // `[\w-]` rather than `[a-z-]`: the latter truncates --customMessages to
      // --custom and --listChecks to --list, which a substring match then
      // satisfies against unrelated text.
      const flags = [...new Set([...help.matchAll(/--[a-zA-Z][\w-]*/g)].map((m) => m[0]))];
      expect(flags).toContain('--fail-on-warnings');

      const undocumented = flags.filter((f) => !new RegExp(`${f}\\b`).test(readme));
      expect(undocumented).toEqual([]);
    });
  });
});
