/**
 * The comparison engine: run this library and Java EPUBCheck over identical
 * bytes and normalize both into the same shape.
 *
 * It lives here rather than beside the agent driver because `eslint.config.js`
 * ignores `.claude/` outright, and code every parity figure in PROJECT_STATUS
 * depends on should not sit in the one directory the linter cannot see. The
 * driver imports this, so there is exactly one implementation of the oracle.
 */

import { execFile } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type * as EpubCheckModule from '../../src/index.js';
import {
  EPUB_PROFILES,
  EPUB_VERSIONS,
  VALIDATION_MODES,
  type EPUBProfile,
  type EPUBVersion,
  type EpubCheckOptions,
  type EpubCheckResult,
  type ValidationMode,
} from '../../src/types.js';
import { type JavaCache, digestBytes, digestTree } from './cache.js';
import {
  type EngineResult,
  type JavaReport,
  ParityUsageError,
  type ResolvedInput,
  type RunOptions,
  parseJavaReport,
  toSeverity,
} from './types.js';

export { ParityUsageError };

const execFileAsync = promisify(execFile);

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Java reports can be large; the default 1MB pipe buffer truncates them. */
const MAX_BUFFER = 64 * 1024 * 1024;

// ------------------------------------------------------------ option parsing

function narrow<T extends string>(raw: string, allowed: readonly T[], flag: string): T {
  // Casting the string through would let a typo reach the validator as a silent
  // no-op and quietly change what the run measures.
  if (!(allowed as readonly string[]).includes(raw)) {
    throw new ParityUsageError(`${flag} must be one of ${allowed.join(', ')} (got ${raw})`);
  }
  return raw as T;
}

// All three lists are the library's own, so a value added there is accepted here
// without a second edit.
export const toVersion = (raw: string): EPUBVersion => narrow(raw, EPUB_VERSIONS, '--version');
export const toProfile = (raw: string): EPUBProfile => narrow(raw, EPUB_PROFILES, '--profile');
export const toMode = (raw: string): ValidationMode => narrow(raw, VALIDATION_MODES, '--mode');

// ------------------------------------------------------------- input routing

/**
 * Three entry points, picked from the path so the caller does not have to: a
 * directory is an expanded EPUB, a file whose extension names a standalone
 * content type is single-file, anything else is a zipped publication. An
 * explicit `--mode` wins, which is the only way to reach `nav` (indistinguishable
 * from any other .xhtml) and the modes with no extension of their own.
 */
const SINGLE_FILE_MODES: Record<string, string> = {
  '.xhtml': 'xhtml',
  '.html': 'xhtml',
  '.svg': 'svg',
  '.opf': 'opf',
  '.smil': 'mo',
};

export function resolveInput(file: string, requested: string | undefined): ResolvedInput {
  if (!existsSync(file)) throw new ParityUsageError(`no such file or directory: ${file}`);
  if (statSync(file).isDirectory()) return { kind: 'expanded', mode: requested ?? 'exp' };

  const byExtension = SINGLE_FILE_MODES[extname(file).toLowerCase()];
  const mode = requested ?? byExtension;
  // `--mode exp` on a file is meaningless; every other explicit mode names a
  // standalone content type, so it forces single-file even for an odd extension.
  const single = mode !== undefined && mode !== 'exp' && (byExtension !== undefined || !!requested);
  return { kind: single ? 'single' : 'zipped', mode };
}

export async function readTree(dir: string): Promise<Map<string, Uint8Array>> {
  const files = new Map<string, Uint8Array>();
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue;
    const abs = join(entry.parentPath, entry.name);
    // OCF paths are '/'-separated by spec; without this the map keys would be
    // backslashed on Windows and every manifest lookup would miss. Matches
    // bin/epubcheck.ts and test/integration/conformance.integration.test.ts.
    files.set(relative(dir, abs).split(sep).join('/'), new Uint8Array(await readFile(abs)));
  }
  return files;
}

export async function findEpubs(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && entry.name.endsWith('.epub'))
      out.push(join(entry.parentPath, entry.name));
  }
  return out.sort();
}

// ------------------------------------------------------------------ TS runner

type EpubCheckApi = typeof EpubCheckModule.EpubCheck;

// Keyed on the source, not a single slot: a bare `??=` would let whichever
// caller arrived first decide whether the whole run measured src/ or dist/.
const epubCheckPromises = new Map<boolean, Promise<EpubCheckApi>>();

/**
 * `src/` is the layer PRs touch, so it is the default. `dist` swaps in the built
 * bundle to check a change survives tsup (the CJS build has broken independently
 * of source before -- see the 0.6.2 lazy-import fix).
 */
export function loadEpubCheck(useDist: boolean): Promise<EpubCheckApi> {
  const cached = epubCheckPromises.get(useDist);
  if (cached) return cached;

  const loading = (async (): Promise<EpubCheckApi> => {
    if (!useDist) return (await import('../../src/index.js')).EpubCheck;
    const spec = join(ROOT, 'dist/index.js');
    if (!existsSync(spec)) {
      throw new ParityUsageError('missing dist/index.js -- run `npm run build` first');
    }
    return ((await import(spec)) as typeof EpubCheckModule).EpubCheck;
  })();
  epubCheckPromises.set(useDist, loading);
  return loading;
}

function libraryOptions(opts: RunOptions, mode: string | undefined): EpubCheckOptions {
  // Always ask the library for everything and filter at comparison time, to
  // mirror the cache's always-`-u` Java invocation. Anything else would make
  // the two sides disagree about which severities were even collected.
  return {
    includeUsage: true,
    includeInfo: true,
    ...(opts.version ? { version: toVersion(opts.version) } : {}),
    ...(opts.profile ? { profile: toProfile(opts.profile) } : {}),
    ...(mode ? { mode: toMode(mode) } : {}),
  };
}

function fromLibraryResult(result: EpubCheckResult): EngineResult {
  return {
    valid: result.valid,
    counts: {
      fatal: result.fatalCount,
      error: result.errorCount,
      warning: result.warningCount,
      info: result.infoCount,
      usage: result.usageCount,
    },
    version: result.version ?? null,
    messages: result.messages.map((m) => ({
      id: m.id,
      severity: toSeverity(m.severity, 'ts'),
      path: normalizePath(m.location?.path),
      // Normalized on this side too, so a 0 from either engine cannot make the
      // two sides disagree about whether a message is located at all.
      line: normalizeLine(m.location?.line),
      message: m.message,
    })),
  };
}

export interface TsRun {
  /** Real path to the bytes. */
  file: string;
  input: ResolvedInput;
  opts: RunOptions;
  /** Import the built bundle instead of `src/`. */
  useDist: boolean;
  /**
   * The name the validator should believe the input has, when it differs from
   * where the bytes live. Standalone fixtures must be addressed by basename:
   * a path-qualified name makes every sibling `href` resolve outside the
   * notional container, so RSC-026 fires on nearly every OPF and the mode's
   * exact-match score collapses to near zero. That is a measurement artifact,
   * not a regression -- and it is the single easiest way to get these numbers
   * catastrophically wrong.
   *
   * Named to match `JavaRun.execName`: it is the same value, and the two sides
   * must always be told the same story about what the input is called.
   */
  execName?: string;
}

export async function runTs(run: TsRun): Promise<EngineResult> {
  const { file, input, opts, useDist, execName } = run;
  const EpubCheck = await loadEpubCheck(useDist);
  const o = libraryOptions(opts, input.mode);
  const name = execName ?? file;

  if (input.kind === 'expanded') {
    return fromLibraryResult(await EpubCheck.validateExpanded(await readTree(file), o));
  }
  if (input.kind === 'single') {
    return fromLibraryResult(await EpubCheck.validateSingleFile(await readFile(file), name, o));
  }
  return fromLibraryResult(await EpubCheck.validate(await readFile(file), o, name));
}

// ---------------------------------------------------------------- Java runner

/**
 * Java reports IDs with an underscore (`MED_015`); this port uses a hyphen
 * (`MED-015`). Every comparison normalizes to the hyphen form.
 */
export const normalizeId = (id: string): string => id.replace(/_/g, '-');

/**
 * Java signals "no line" with `-1` (occasionally `0`), never with null or a
 * missing field. Taken literally that makes every Java message look located and
 * pins the "line present (java)" metric at 100%, which is how this was caught:
 * PROJECT_STATUS records 81.5%, and `OPF-003` demonstrably has no line in Java.
 * A location metric that cannot go below 100% is measuring nothing.
 */
const normalizeLine = (line: number | null | undefined): number | null =>
  typeof line === 'number' && line > 0 ? line : null;

/**
 * Java reports a standalone fixture's own path as `./name.opf` while this
 * library reports `name.opf`. Messages are paired on (ID, file), so left alone
 * that leading `./` means nothing ever pairs and the severity and line metrics
 * silently report `n/a` for the entire standalone corpus.
 */
const normalizePath = (path: string | null | undefined): string | null => {
  if (typeof path !== 'string' || path.length === 0) return null;
  return path.replace(/^\.\//, '');
};

let javaVersionPromise: Promise<string | undefined> | undefined;

/** Memoized `epubcheck --version`, or undefined when the CLI is not installed. */
function probeJavaVersion(): Promise<string | undefined> {
  javaVersionPromise ??= (async (): Promise<string | undefined> => {
    try {
      const { stdout } = await execFileAsync('epubcheck', ['--version'], { maxBuffer: MAX_BUFFER });
      const line = stdout.split('\n').find((l) => l.trim().length > 0);
      return line?.trim() ?? 'unknown';
    } catch (err) {
      if (isEnoent(err)) return undefined;
      throw err;
    }
  })();
  return javaVersionPromise;
}

/** True when a real Java EPUBCheck is on PATH, so fresh oracle runs are possible. */
export async function javaAvailable(): Promise<boolean> {
  return (await probeJavaVersion()) !== undefined;
}

/**
 * The oracle version, which is part of every cache key.
 *
 * `fallback` lets the regression gate run with no JVM at all: the committed
 * baseline records the version it was measured against, and every entry the
 * gate needs is already in the committed cache. That is what allows CI to
 * verify parity on a stock runner rather than installing Java to recompute an
 * answer the repo already contains.
 */
export async function javaVersion(fallback?: string): Promise<string> {
  const probed = await probeJavaVersion();
  if (probed !== undefined) return probed;
  if (fallback !== undefined) return fallback;
  throw noJavaError();
}

function isEnoent(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'ENOENT';
}

function noJavaError(): ParityUsageError {
  return new ParityUsageError(
    'the Java `epubcheck` CLI is not on PATH -- `brew install epubcheck` (parity needs it, ' +
      'unless every input is already in the committed cache)',
  );
}

/**
 * The Java argv, minus the input path. Kept separate from the path because it
 * is a cache-key component in its own right: two runs over the same bytes with
 * different `--profile` are different questions.
 */
export function javaArgs(input: ResolvedInput, opts: RunOptions): string[] {
  // Always `-u`. Verified across 24 fixtures spanning the corpus: `-u` leaves
  // nFatal/nError/nWarning/nInfo and the entire non-USAGE message set (IDs,
  // severities, paths, lines) byte-identical, and merely adds USAGE rows --
  // without it Java reports nUsage 0 outright. So one cached entry answers both
  // the default and `--usage` comparisons, halving the store.
  const args = ['--json', '-', '-u'];
  if (opts.profile) args.push('--profile', opts.profile);

  // Java refuses a non-.epub input without an explicit --mode, and every mode
  // but `exp` also needs -v.
  if (input.kind !== 'zipped' && input.mode) args.push('--mode', input.mode);
  if (opts.version) args.push('-v', opts.version);
  else if (input.kind === 'single') args.push('-v', '3.0');
  return args;
}

async function digestInput(file: string, input: ResolvedInput): Promise<string> {
  if (input.kind === 'expanded') return digestTree(await readTree(file));
  return digestBytes(new Uint8Array(await readFile(file)));
}

export interface JavaRun {
  /** Real path to the bytes. Hashed for the cache key, whatever the CLI is told. */
  file: string;
  input: ResolvedInput;
  opts: RunOptions;
  cache: JavaCache | undefined;
  /** What to pass the CLI, when it must differ from `file` (basename addressing). */
  execName?: string;
  /** Directory the CLI runs in; pairs with `execName`. */
  cwd?: string;
}

export async function runJava(run: JavaRun): Promise<EngineResult> {
  const { file, input, opts, cache, execName, cwd } = run;
  const args = javaArgs(input, opts);
  // Keyed on the real path so two fixtures that share a basename cannot share
  // an entry, and on the bytes so a rewritten fixture cannot reuse a stale one.
  const relPath = relative(ROOT, resolve(file));
  const target = execName ?? file;

  let report;
  if (cache) {
    const key = cache.key(relPath, args, await digestInput(file, input));
    report = await cache.read(key, relPath);
    if (!report) {
      report = await execJava(target, args, cwd);
      await cache.write(key, { input: relPath, argv: args, report });
    }
  } else {
    report = await execJava(target, args, cwd);
  }

  const c = report.checker;
  return {
    valid: c.nFatal === 0 && c.nError === 0,
    counts: {
      fatal: c.nFatal,
      error: c.nError,
      warning: c.nWarning,
      info: c.nInfo ?? 0,
      usage: c.nUsage,
    },
    version: report.publication?.ePubVersion ?? null,
    messages: report.messages.map((m) => ({
      id: normalizeId(m.ID),
      severity: toSeverity(m.severity, 'java'),
      path: normalizePath(m.locations?.[0]?.path),
      line: normalizeLine(m.locations?.[0]?.line),
      message: m.message,
    })),
  };
}

async function execJava(
  file: string,
  args: string[],
  cwd: string | undefined,
): Promise<JavaReport> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync('epubcheck', [file, ...args], {
      maxBuffer: MAX_BUFFER,
      ...(cwd ? { cwd } : {}),
    }));
  } catch (err) {
    if (isEnoent(err)) throw noJavaError();
    // Java exits 1 when it finds errors, which execFile treats as a failure;
    // the JSON is still on stdout, so read it off the error object. A naive
    // execFile wrapper loses every invalid file.
    const captured = (err as { stdout?: unknown }).stdout;
    if (typeof captured !== 'string' || !captured.trim()) throw err;
    stdout = captured;
  }
  return parseJavaReport(stdout, `epubcheck ${file}`);
}

// --------------------------------------------------------------- concurrency

/** Java takes ~1.5s per uncached book, so corpus runs are worth parallelising. */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        const item = items[i];
        if (item === undefined) continue;
        results[i] = await fn(item, i);
      }
    }),
  );
  return results;
}
