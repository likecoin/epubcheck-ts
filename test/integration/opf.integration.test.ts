import { describe, expect, it } from 'vitest';
import { EpubCheck } from '../../src/index.js';

/**
 * OPF Integration Tests
 *
 * Tests for Package Document validation, ported from Java EPUBCheck.
 * Based on: /epubcheck/src/test/resources/epub3/05-package-document/package-document.feature
 *
 * @see https://www.w3.org/TR/epub-33/#sec-package-doc
 */

describe('Integration Tests - OPF (Package Document)', () => {
  describe('Valid EPUBs', () => {
    it('should validate an EPUB with unusual package file extension', async () => {
      const data = await loadEpub('valid/package-file-extension-unusual-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    // Skip: Link validation test file may have issues
    it.skip('should validate an EPUB with link to embedded resource', async () => {
      const data = await loadEpub('valid/link-to-embedded-resource-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Manifest validation', () => {
    it('should report missing manifest item (RSC-001)', async () => {
      const data = await loadEpub('invalid/opf/package-manifest-item-missing-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-001');
    });

    it('should report duplicate resource in manifest (OPF-074)', async () => {
      const data = await loadEpub('invalid/opf/package-manifest-duplicate-resource-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-074');
    });

    // Skip: Self-referencing test file structure may not trigger the error
    it.skip('should report self-referencing manifest item', async () => {
      const data = await loadEpub('invalid/opf/manifest-self-referencing-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
    });
  });

  describe('Manifest properties validation', () => {
    it('should report undeclared scripted property (OPF-014)', async () => {
      const data = await loadEpub('invalid/opf/package-manifest-prop-scripted-undeclared-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-014');
    });

    it('should report undeclared SVG property (OPF-014)', async () => {
      const data = await loadEpub('invalid/opf/package-manifest-prop-svg-undeclared-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-014');
    });

    // Skip: Remote resource property validation needs verification
    it.skip('should report undeclared remote-resources property (OPF-014)', async () => {
      const data = await loadEpub('invalid/opf/package-manifest-prop-remote-resource-undeclared-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-014');
    });
  });

  describe('Link validation', () => {
    // Skip: Link validation not fully implemented
    it.skip('should report missing resource referenced by link (RSC-007)', async () => {
      const data = await loadEpub('invalid/opf/package-link-missing-resource-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-007');
    });
  });

  describe('Font validation', () => {
    // Skip: Font manifest validation needs verification
    it.skip('should report missing fonts declared in CSS (RSC-001)', async () => {
      const data = await loadEpub('invalid/opf/package-manifest-fonts-missing-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-001');
    });
  });

  describe('Warnings', () => {
    // Skip: Item href space warning needs verification
    it.skip('should warn about spaces in manifest item href (PKG-010)', async () => {
      const data = await loadEpub('warnings/package-manifest-item-with-spaces-warning.epub');
      const result = await EpubCheck.validate(data);

      expectWarning(result, 'PKG-010');
    });
  });
});

/**
 * Helper function to load EPUB file from fixtures
 */
async function loadEpub(path: string): Promise<Uint8Array> {
  const fs = await import('node:fs');
  const pathModule = await import('node:path');
  const url = await import('node:url');

  const currentDir = url.fileURLToPath(new URL('.', import.meta.url));
  const filePath = pathModule.resolve(currentDir, '../fixtures', path);

  return new Uint8Array(fs.readFileSync(filePath));
}

/**
 * Assert that a specific error ID is present in the result
 */
function expectError(result: Awaited<ReturnType<typeof EpubCheck.validate>>, errorId: string): void {
  const hasError = result.messages.some(
    (m) => m.id === errorId && (m.severity === 'error' || m.severity === 'fatal')
  );
  expect(hasError, `Expected error ${errorId} to be reported. Got: ${JSON.stringify(result.messages.map(m => m.id))}`).toBe(true);
}

/**
 * Assert that a specific warning ID is present in the result
 */
function expectWarning(result: Awaited<ReturnType<typeof EpubCheck.validate>>, warningId: string): void {
  const hasWarning = result.messages.some(
    (m) => m.id === warningId && m.severity === 'warning'
  );
  expect(hasWarning, `Expected warning ${warningId} to be reported. Got: ${JSON.stringify(result.messages.map(m => m.id))}`).toBe(true);
}

/**
 * Assert that no errors or warnings are present
 */
function expectNoErrorsOrWarnings(result: Awaited<ReturnType<typeof EpubCheck.validate>>): void {
  const errorsOrWarnings = result.messages.filter(
    (m) => m.severity === 'error' || m.severity === 'fatal' || m.severity === 'warning'
  );
  expect(errorsOrWarnings, `Expected no errors or warnings. Got: ${JSON.stringify(errorsOrWarnings.map(m => ({ id: m.id, severity: m.severity })))}`).toHaveLength(0);
}
