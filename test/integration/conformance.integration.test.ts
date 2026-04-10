import { readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EpubCheck } from '../../src/index.js';

/**
 * Conformance Integration Tests
 *
 * Ports these Java EPUBCheck feature files into a single suite:
 * - epub3/00-minimal/minimal.feature
 * - epub3/02-epub-publication-conformance/epub-publication-conformance.feature
 * - epub3/B-external-identifiers/external-identifiers.feature
 * - epub3/H-media-type-registrations/media-types-registrations.feature
 *
 * @see https://www.w3.org/TR/epub-33/
 */

describe('Integration Tests - Conformance', () => {
  // ==================== 00-minimal ====================
  describe('Minimal publications (00-minimal)', () => {
    it('should validate a minimal packaged EPUB', async () => {
      const data = loadFixture('conformance/00-minimal/minimal.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate a minimal expanded EPUB', async () => {
      const files = readDirectoryFiles('conformance/00-minimal/expanded');
      const result = await EpubCheck.validateExpanded(files);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate a minimal package document (--mode opf)', async () => {
      const data = loadFixture('conformance/00-minimal/minimal.opf');
      const result = await EpubCheck.validateSingleFile(data, 'minimal.opf', {
        mode: 'opf',
        version: '3.0',
      });
      expectNoErrorsOrWarnings(result);
    });

    it('should validate a minimal XHTML content document (--mode xhtml)', async () => {
      const data = loadFixture('conformance/00-minimal/minimal.xhtml');
      const result = await EpubCheck.validateSingleFile(data, 'minimal.xhtml', {
        mode: 'xhtml',
        version: '3.0',
      });
      expectNoErrorsOrWarnings(result);
    });

    it('should validate a minimal SVG content document (--mode svg)', async () => {
      const data = loadFixture('conformance/00-minimal/minimal.svg');
      const result = await EpubCheck.validateSingleFile(data, 'minimal.svg', {
        mode: 'svg',
        version: '3.0',
      });
      expectNoErrorsOrWarnings(result);
    });
  });

  // ==================== 02-epub-publication-conformance ====================
  describe('EPUB publication conformance (02)', () => {
    it('should validate the minimal Package Document (--mode opf)', async () => {
      const data = loadFixture('conformance/02-publication-conformance/minimal.opf');
      const result = await EpubCheck.validateSingleFile(data, 'minimal.opf', {
        mode: 'opf',
        version: '3.0',
      });
      expectNoErrorsOrWarnings(result);
    });

    it('should validate a minimal packaged EPUB', async () => {
      const data = loadFixture('conformance/02-publication-conformance/minimal.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });
  });

  // ==================== B-external-identifiers ====================
  describe('External identifiers (B)', () => {
    it('should allow DOCTYPE declarations with allowed external identifiers', async () => {
      const files = readDirectoryFiles(
        'conformance/B-external-identifiers/xml-external-identifier-allowed-valid',
      );
      const result = await EpubCheck.validateExpanded(files);
      expectNoErrorsOrWarnings(result);
    });

    it('should report disallowed DOCTYPE external identifier on wrong media type (OPF-073)', async () => {
      const files = readDirectoryFiles(
        'conformance/B-external-identifiers/xml-external-identifier-bad-mediatype-error',
      );
      const result = await EpubCheck.validateExpanded(files);
      expectError(result, 'OPF-073');
    });

    it('should report disallowed DOCTYPE external identifier (OPF-073)', async () => {
      const files = readDirectoryFiles(
        'conformance/B-external-identifiers/xml-external-identifier-disallowed-error',
      );
      const result = await EpubCheck.validateExpanded(files);
      expectError(result, 'OPF-073');
    });
  });

  // ==================== H-media-type-registrations ====================
  describe('Media type registrations (H)', () => {
    it('should warn about non-lowercase .epub extension (PKG-016)', async () => {
      const data = loadFixture(
        'conformance/H-media-type-registrations/ocf-extension-not-lower-case-warning.ePub',
      );
      const result = await EpubCheck.validate(
        data,
        {},
        'ocf-extension-not-lower-case-warning.ePub',
      );
      expectWarning(result, 'PKG-016');
    });
  });
});

// ==================== Helpers ====================

function loadFixture(path: string): Uint8Array {
  const currentDir = fileURLToPath(new URL('.', import.meta.url));
  const filePath = resolve(currentDir, '../fixtures', path);
  return new Uint8Array(readFileSync(filePath));
}

function readDirectoryFiles(relPath: string): Map<string, Uint8Array> {
  const currentDir = fileURLToPath(new URL('.', import.meta.url));
  const root = resolve(currentDir, '../fixtures', relPath);
  const files = new Map<string, Uint8Array>();

  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const full = resolve(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else {
        const key = relative(root, full).split(sep).join('/');
        files.set(key, new Uint8Array(readFileSync(full)));
      }
    }
  }

  walk(root);
  return files;
}

function expectError(
  result: Awaited<ReturnType<typeof EpubCheck.validate>>,
  errorId: string,
): void {
  const hasError = result.messages.some(
    (m) => m.id === errorId && (m.severity === 'error' || m.severity === 'fatal'),
  );
  expect(
    hasError,
    `Expected error ${errorId}. Got: ${JSON.stringify(result.messages.map((m) => ({ id: m.id, severity: m.severity })))}`,
  ).toBe(true);
}

function expectWarning(
  result: Awaited<ReturnType<typeof EpubCheck.validate>>,
  warningId: string,
): void {
  const hasWarning = result.messages.some((m) => m.id === warningId && m.severity === 'warning');
  expect(
    hasWarning,
    `Expected warning ${warningId}. Got: ${JSON.stringify(result.messages.map((m) => ({ id: m.id, severity: m.severity })))}`,
  ).toBe(true);
}

function expectNoErrorsOrWarnings(result: Awaited<ReturnType<typeof EpubCheck.validate>>): void {
  const errorsOrWarnings = result.messages.filter(
    (m) => m.severity === 'error' || m.severity === 'fatal' || m.severity === 'warning',
  );
  expect(
    errorsOrWarnings,
    `Expected no errors or warnings. Got: ${JSON.stringify(errorsOrWarnings.map((m) => ({ id: m.id, severity: m.severity, message: m.message })))}`,
  ).toHaveLength(0);
}
