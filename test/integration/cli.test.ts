import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Contract tests for the `epubcheck-ts` binary.
 *
 * The CLI is the package's only globally-installed surface and had no test of
 * any kind: CI ran build, lint, typecheck, unit, packaging and parity without
 * invoking it once. Three defects were living in that gap — a README whose
 * documented flags produced different exit codes than the real ones, a JSON
 * report stamped with a version six releases stale, and `-p <typo>` silently
 * falling back to the default ruleset and reporting success.
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

const pkg = JSON.parse(readFileSync(`${repoRoot}/package.json`, 'utf8')) as { version: string };

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
    const e = err as { code?: number; stdout?: string; stderr?: string };
    return { code: e.code ?? 1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

describe('cli: contract', () => {
  beforeAll(() => {
    try {
      readFileSync(cli);
      readFileSync(`${repoRoot}/dist/index.js`);
    } catch {
      throw new Error('bin/epubcheck.js or dist/ not found — run `npm run build` first');
    }
  });

  describe('exit codes', () => {
    it('exits 0 for a valid EPUB', async () => {
      expect((await run(validEpub)).code).toBe(0);
    });

    it('exits 1 for an EPUB with errors', async () => {
      expect((await run(errorEpub)).code).toBe(1);
    });

    it('exits 2 for an unknown flag', async () => {
      const r = await run(validEpub, '--bogus-flag');
      expect(r.code).toBe(2);
      expect(r.stderr).toMatch(/--help/);
    });

    it('prints help and exits 0 when no file is given', async () => {
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
    it('-w is a display filter and does not fail the run', async () => {
      expect((await run(warningEpub, '-w')).code).toBe(0);
    });

    it('--fail-on-warnings exits 1 on the same file', async () => {
      expect((await run(warningEpub, '--fail-on-warnings')).code).toBe(1);
    });

    it('accepts --failonwarnings for Java compatibility', async () => {
      expect((await run(warningEpub, '--failonwarnings')).code).toBe(1);
    });
  });

  describe('version flags', () => {
    // `-v` takes a value (--epub-version); `-V` is --version. The README had
    // these transposed, so the documented invocation errored.
    it('-V prints the version and exits 0', async () => {
      const r = await run('-V');
      expect(r.code).toBe(0);
      expect(r.stdout).toContain(pkg.version);
    });

    it('bare -v is an error, not a version request', async () => {
      const r = await run('-v');
      expect(r.code).toBe(2);
      expect(r.stderr).toMatch(/argument missing/i);
    });

    it('reports the package version in the JSON report', async () => {
      // `-q` is required to get parseable JSON on stdout: the human summary is
      // written to stdout too, so `--json -` alone is not pipeable. Routing
      // that summary to stderr is a 0.7.0 change. The version itself was the
      // bug here — every report said 0.1.0 regardless of the release.
      const r = await run(validEpub, '-q', '--json', '-');
      const report = JSON.parse(r.stdout) as { checker: { version: string } };
      expect(report.checker.version).toBe(pkg.version);
    });
  });

  describe('profile validation', () => {
    it('applies a valid profile', async () => {
      expect((await run(edupubError, '-p', 'edupub')).code).toBe(1);
    });

    it('rejects an unknown profile instead of silently using the default', async () => {
      // Regression guard: this used to exit 0 with no errors, reporting a clean
      // result for a book that violates the profile the user asked for.
      const r = await run(edupubError, '-p', 'bogus');
      expect(r.code).toBe(2);
      expect(r.stderr).toMatch(/Invalid profile/);
    });
  });

  describe('documentation stays in sync', () => {
    // The README drifted out of step with the CLI because nothing compared
    // them. `--help` is the source of truth; this only checks that every long
    // flag it advertises is mentioned, so formatting stays free to change.
    it('README documents every long flag in --help', async () => {
      const help = (await run('--help')).stdout;
      const readme = readFileSync(`${repoRoot}/README.md`, 'utf8');

      const flags = [...help.matchAll(/(--[a-z][a-z-]+)/g)].map((m) => m[0]);
      expect(flags.length).toBeGreaterThan(10);

      const undocumented = [...new Set(flags)].filter((f) => !readme.includes(f));
      expect(undocumented).toEqual([]);
    });
  });
});
