#!/usr/bin/env node
/**
 * EPUBCheck-TS CLI
 *
 * A minimalist command-line interface for EPUB validation.
 * For full EPUBCheck features, use the official Java version:
 * https://github.com/w3c/epubcheck
 */

import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { basename, join, relative, sep } from 'node:path';
import type {
  EpubCheckOptions,
  EPUBProfile,
  EPUBVersion,
  Severity,
  ValidationMessage,
  ValidationMode,
} from '../src/types.js';

// Dynamic import to support both ESM and CJS builds
const { EpubCheck, toJSONReport } = await import('../dist/index.js');

const VERSION = '0.4.0';
const VALID_MODES = new Set(['exp', 'opf', 'xhtml', 'svg', 'nav', 'mo']);

// Parse command line arguments
const { values, positionals } = parseArgs({
  options: {
    json: { type: 'string', short: 'j' },
    quiet: { type: 'boolean', short: 'q', default: false },
    profile: { type: 'string', short: 'p' },
    mode: { type: 'string', short: 'm' },
    'epub-version': { type: 'string', short: 'v' },
    usage: { type: 'boolean', short: 'u', default: false },
    fatal: { type: 'boolean', short: 'f', default: false },
    error: { type: 'boolean', short: 'e', default: false },
    warn: { type: 'boolean', default: false },
    customMessages: { type: 'string', short: 'c' },
    version: { type: 'boolean', short: 'V', default: false },
    help: { type: 'boolean', short: 'h', default: false },
    'fail-on-warnings': { type: 'boolean', short: 'w', default: false },
    listChecks: { type: 'boolean', short: 'l', default: false },
  },
  allowPositionals: true,
  strict: false,
});

// Show version
if (values.version) {
  console.log(`EPUBCheck-TS v${VERSION}`);
  console.log('TypeScript EPUB validator for Node.js and browsers');
  console.log();
  console.log('Note: This is ~93% feature-complete compared to Java EPUBCheck.');
  console.log('For production validation: https://github.com/w3c/epubcheck');
  process.exit(0);
}

// List checks
if (values.listChecks) {
  const { formatMessageList } = await import('../dist/index.js');
  const output = formatMessageList();
  console.log(output);
  process.exit(0);
}

// Show help
if (values.help || positionals.length === 0) {
  console.log(`EPUBCheck-TS v${VERSION} - EPUB Validator

Usage: epubcheck-ts <file> [options]

Arguments:
  <file>                   Path to EPUB file, directory, or single file to validate

Options:
  -j, --json <file>        Output JSON report to file (use '-' for stdout)
  -q, --quiet              Suppress console output (errors only)
  -p, --profile <name>     Validation profile (default|dict|edupub|idx|preview)
  -m, --mode <type>        Validation mode: exp (expanded directory), opf, xhtml
  -v, --epub-version <ver> EPUB version for single-file mode (2.0|3.0|3.3)
  -u, --usage              Include usage messages (best practices)
  -f, --fatal              Show only fatal errors
  -e, --error              Show fatal errors and errors
      --warn               Show fatal errors, errors, and warnings
  -c, --customMessages <file>  Override message severities (TSV: ID\\tSEVERITY)
  -w, --fail-on-warnings   Exit with code 1 if warnings are found
  -l, --listChecks         List all message IDs and severities
  -V, --version            Show version information
  -h, --help               Show this help message

Modes:
  --mode exp               Validate an expanded (unpacked) EPUB directory
  --mode opf -v 3.0        Validate a standalone OPF package document
  --mode xhtml -v 3.0      Validate a standalone XHTML content document

Examples:
  epubcheck-ts book.epub
  epubcheck-ts book.epub --json report.json
  epubcheck-ts book.epub --quiet --fail-on-warnings
  epubcheck-ts book.epub --profile dict
  epubcheck-ts ./unpacked-epub/ --mode exp
  epubcheck-ts chapter.xhtml --mode xhtml -v 3.0
  epubcheck-ts package.opf --mode opf -v 3.0

Exit Codes:
  0  No errors (or only warnings if --fail-on-warnings not set)
  1  Validation errors found (or warnings with --fail-on-warnings)
  2  Runtime error (file not found, invalid arguments, etc.)

Report issues: https://github.com/likecoin/epubcheck-ts/issues
`);
  process.exit(0);
}

/**
 * Recursively read all files in a directory into a Map
 */
async function readDirectoryFiles(dirPath: string): Promise<Map<string, Uint8Array>> {
  const files = new Map<string, Uint8Array>();

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const relPath = relative(dirPath, fullPath).split(sep).join('/');
        const data = await readFile(fullPath);
        files.set(relPath, data);
      }
    }
  }

  await walk(dirPath);
  return files;
}

// Main validation logic
async function main(): Promise<void> {
  const filePath = positionals[0];

  if (!filePath) {
    console.error('Error: No file specified');
    console.error('Run with --help for usage information');
    process.exit(2);
  }

  const mode = values.mode as ValidationMode | undefined;
  if (mode && !VALID_MODES.has(mode)) {
    console.error(`Error: Invalid mode "${mode}". Valid modes: ${[...VALID_MODES].join(', ')}`);
    process.exit(2);
  }

  const epubVersion = values['epub-version'] as EPUBVersion | undefined;
  if (epubVersion && !['2.0', '3.0', '3.1', '3.2', '3.3'].includes(epubVersion)) {
    console.error(
      `Error: Invalid EPUB version "${epubVersion}". Valid versions: 2.0, 3.0, 3.1, 3.2, 3.3`,
    );
    process.exit(2);
  }

  // Single-file modes require a version
  if (mode && mode !== 'exp' && !epubVersion) {
    console.error(`Error: --epub-version (-v) is required when using --mode ${mode}`);
    process.exit(2);
  }

  try {
    if (!values.quiet) {
      console.log(`Validating: ${basename(filePath)}`);
      console.log();
    }

    // Build options
    const options: EpubCheckOptions = {};
    if (values.profile) {
      options.profile = values.profile as EPUBProfile;
    }
    if (epubVersion) {
      options.version = epubVersion;
    }
    if (mode) {
      options.mode = mode;
    }
    if (values.usage) {
      options.includeUsage = true;
    }
    if (typeof values.customMessages === 'string') {
      const { parseCustomMessages } = await import('../dist/index.js');
      const cmContent = await readFile(values.customMessages, 'utf-8');
      options.customMessages = parseCustomMessages(cmContent);
    }

    const startTime = Date.now();
    let result;

    // Determine effective mode (auto-detect directory as expanded)
    let effectiveMode = mode;
    if (!mode || mode === 'exp') {
      const fileStat = await stat(filePath);
      if (fileStat.isDirectory()) {
        effectiveMode = 'exp';
      } else if (mode === 'exp') {
        console.error('Error: --mode exp requires a directory path');
        process.exit(2);
      }
    }

    if (effectiveMode === 'exp') {
      const files = await readDirectoryFiles(filePath);
      result = await EpubCheck.validateExpanded(files, options);
    } else if (effectiveMode === 'opf' || effectiveMode === 'xhtml') {
      const fileData = await readFile(filePath);
      result = await EpubCheck.validateSingleFile(fileData, basename(filePath), options);
    } else {
      const epubData = await readFile(filePath);
      result = await EpubCheck.validate(epubData, options);
    }
    const elapsedMs = Date.now() - startTime;

    // Most restrictive severity flag wins (--fatal overrides --error overrides --warn)
    const severityRank: Record<Severity, number> = {
      fatal: 0,
      error: 1,
      warning: 2,
      info: 3,
      usage: 4,
    };
    let maxRank = 4;
    if (values.fatal) maxRank = 0;
    else if (values.error) maxRank = 1;
    else if (values.warn) maxRank = 2;
    const isFiltered = values.fatal || values.error || values.warn;
    const displayMessages = result.messages.filter(
      (m: ValidationMessage) => severityRank[m.severity] <= maxRank,
    );

    // Output JSON report if requested
    if (values.json !== undefined) {
      const filteredResult = isFiltered ? { ...result, messages: displayMessages } : result;
      const jsonContent = toJSONReport(filteredResult); // Already stringified

      if (values.json === '-') {
        // Output to stdout - suppress other output
        if (values.quiet) {
          console.log(jsonContent);
        } else {
          // If not quiet, output after other messages
          console.log('\nJSON Report:');
          console.log(jsonContent);
        }
      } else if (typeof values.json === 'string') {
        await writeFile(values.json, jsonContent, 'utf-8');
        if (!values.quiet) {
          console.log(`JSON report written to: ${values.json}`);
        }
      }
    }

    // Console output (unless quiet mode)
    if (!values.quiet) {
      // Group messages by severity
      const fatal = displayMessages.filter((m: ValidationMessage) => m.severity === 'fatal');
      const errors = displayMessages.filter((m: ValidationMessage) => m.severity === 'error');
      const warnings = displayMessages.filter((m: ValidationMessage) => m.severity === 'warning');
      const info = displayMessages.filter((m: ValidationMessage) => m.severity === 'info');
      const usage = displayMessages.filter((m: ValidationMessage) => m.severity === 'usage');

      // Print messages with colors
      const printMessages = (
        messages: typeof result.messages,
        color: string,
        label: string,
      ): void => {
        if (messages.length === 0) return;

        for (const msg of messages) {
          const locationStr = msg.location
            ? ` (${msg.location.path}${msg.location.line !== undefined ? `:${String(msg.location.line)}` : ''})`
            : '';
          console.log(`${color}${label}${locationStr}: ${msg.message}\x1b[0m`);
          if (msg.id) {
            console.log(`  \x1b[90mID: ${msg.id}\x1b[0m`);
          }
        }
        console.log();
      };

      if (fatal.length > 0) {
        printMessages(fatal, '\x1b[31m\x1b[1m', 'FATAL');
      }
      if (errors.length > 0) {
        printMessages(errors, '\x1b[31m', 'ERROR');
      }
      if (warnings.length > 0) {
        printMessages(warnings, '\x1b[33m', 'WARNING');
      }
      if (info.length > 0 && displayMessages.length < 20) {
        printMessages(info, '\x1b[36m', 'INFO');
      }
      if (usage.length > 0) {
        printMessages(usage, '\x1b[90m', 'USAGE');
      }

      // Summary
      console.log('─'.repeat(60));
      const summaryColor = result.valid ? '\x1b[32m' : '\x1b[31m';
      const summaryIcon = result.valid ? '✓' : '✗';
      console.log(
        `${summaryColor}${summaryIcon} ${result.valid ? 'Valid EPUB' : 'Invalid EPUB'}\x1b[0m`,
      );
      console.log();
      console.log(`  Errors:   ${String(result.errorCount + result.fatalCount)}`);
      console.log(`  Warnings: ${String(result.warningCount)}`);
      if (info.length > 0) {
        console.log(`  Info:     ${String(result.infoCount)}`);
      }
      if (usage.length > 0) {
        console.log(`  Usages:   ${String(result.usageCount)}`);
      }
      console.log(`  Time:     ${String(elapsedMs)}ms`);
      console.log();

      // Show limitation notice if there were no major errors
      if (result.errorCount === 0 && result.fatalCount === 0) {
        console.log(
          '\x1b[90mNote: This validator provides ~93% coverage of Java EPUBCheck.\x1b[0m',
        );
        console.log('\x1b[90mFor complete validation: https://github.com/w3c/epubcheck\x1b[0m');
        console.log();
      }
    }

    // Determine exit code
    const shouldFail =
      result.errorCount > 0 ||
      result.fatalCount > 0 ||
      (values['fail-on-warnings'] && result.warningCount > 0);
    process.exit(shouldFail ? 1 : 0);
  } catch (error) {
    console.error('\x1b[31mError:\x1b[0m', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack && !values.quiet) {
      console.error('\x1b[90m' + error.stack + '\x1b[0m');
    }
    process.exit(2);
  }
}

void main();
