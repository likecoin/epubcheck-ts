#!/usr/bin/env node
/**
 * EPUBCheck-TS CLI
 *
 * A minimalist command-line interface for EPUB validation.
 * For full EPUBCheck features, use the official Java version:
 * https://github.com/w3c/epubcheck
 */

import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { basename } from 'node:path';

// Dynamic import to support both ESM and CJS builds
const { EpubCheck, toJSONReport } = await import('../dist/index.js');

const VERSION = '0.2.4';

// Parse command line arguments
const { values, positionals } = parseArgs({
  options: {
    json: { type: 'string', short: 'j' },
    quiet: { type: 'boolean', short: 'q', default: false },
    profile: { type: 'string', short: 'p' },
    usage: { type: 'boolean', short: 'u', default: false },
    version: { type: 'boolean', short: 'v', default: false },
    help: { type: 'boolean', short: 'h', default: false },
    'fail-on-warnings': { type: 'boolean', short: 'w', default: false },
  },
  allowPositionals: true,
  strict: false,
});

// Show version
if (values.version) {
  console.log(`EPUBCheck-TS v${VERSION}`);
  console.log('TypeScript EPUB validator for Node.js and browsers');
  console.log();
  console.log('Note: This is ~70% feature-complete compared to Java EPUBCheck.');
  console.log('For production validation: https://github.com/w3c/epubcheck');
  process.exit(0);
}

// Show help
if (values.help || positionals.length === 0) {
  console.log(`EPUBCheck-TS v${VERSION} - EPUB Validator

Usage: epubcheck-ts <file.epub> [options]

Arguments:
  <file.epub>              Path to EPUB file to validate

Options:
  -j, --json <file>        Output JSON report to file (use '-' for stdout)
  -q, --quiet              Suppress console output (errors only)
  -p, --profile <name>     Validation profile (default|dict|edupub|idx|preview)
  -u, --usage              Include usage messages (best practices)
  -w, --fail-on-warnings   Exit with code 1 if warnings are found
  -v, --version            Show version information
  -h, --help               Show this help message

Examples:
  epubcheck-ts book.epub
  epubcheck-ts book.epub --json report.json
  epubcheck-ts book.epub --quiet --fail-on-warnings
  epubcheck-ts book.epub --profile dict

Exit Codes:
  0  No errors (or only warnings if --fail-on-warnings not set)
  1  Validation errors found (or warnings with --fail-on-warnings)
  2  Runtime error (file not found, invalid arguments, etc.)

Note: This tool provides ~70% coverage of Java EPUBCheck features.
Missing features: Media Overlays, advanced ARIA checks, encryption/signatures.
For complete EPUB 3 conformance testing, use: https://github.com/w3c/epubcheck

Report issues: https://github.com/likecoin/epubcheck-ts/issues
`);
  process.exit(0);
}

// Main validation logic
async function main(): Promise<void> {
  const filePath = positionals[0];

  if (!filePath) {
    console.error('Error: No EPUB file specified');
    console.error('Run with --help for usage information');
    process.exit(2);
  }

  try {
    // Read EPUB file
    if (!values.quiet) {
      console.log(`Validating: ${basename(filePath)}`);
      console.log();
    }

    const epubData = await readFile(filePath);

    // Validate
    const startTime = Date.now();
    const options: {
      profile?: 'default' | 'dict' | 'edupub' | 'idx' | 'preview';
      includeUsage?: boolean;
    } = {};
    if (values.profile) {
      options.profile = values.profile as 'default' | 'dict' | 'edupub' | 'idx' | 'preview';
    }
    if (values.usage) {
      options.includeUsage = true;
    }
    const result = await EpubCheck.validate(epubData, options);
    const elapsedMs = Date.now() - startTime;

    // Output JSON report if requested
    if (values.json !== undefined) {
      const jsonContent = toJSONReport(result); // Already stringified

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
      const fatal = result.messages.filter((m: { severity: string }) => m.severity === 'fatal');
      const errors = result.messages.filter((m: { severity: string }) => m.severity === 'error');
      const warnings = result.messages.filter(
        (m: { severity: string }) => m.severity === 'warning',
      );
      const info = result.messages.filter((m: { severity: string }) => m.severity === 'info');
      const usage = result.messages.filter((m: { severity: string }) => m.severity === 'usage');

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
      if (info.length > 0 && result.messages.length < 20) {
        // Only show info if total messages is small
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
          '\x1b[90mNote: This validator provides ~70% coverage of Java EPUBCheck.\x1b[0m',
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
