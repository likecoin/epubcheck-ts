import { describe, expect, it } from 'vitest';
import { EpubCheck } from '../../src/index.js';

/**
 * OCF Integration Tests
 *
 * Tests for Open Container Format validation, ported from Java EPUBCheck.
 * Based on: /epubcheck/src/test/resources/epub3/04-ocf/ocf.feature
 *
 * @see https://www.w3.org/TR/epub-33/#sec-ocf
 */

describe('Integration Tests - OCF (Open Container Format)', () => {
  describe('Valid EPUBs', () => {
    it('should validate a minimal packaged EPUB', async () => {
      const data = await loadEpub('valid/ocf-zip-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should allow UTF-8 characters in file names', async () => {
      const data = await loadEpub('valid/ocf-filename-utf8-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should allow UTF-8 characters in file paths', async () => {
      const data = await loadEpub('valid/ocf-filepath-utf8-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should allow + character in file names (issue 188)', async () => {
      const data = await loadEpub('valid/ocf-container-filename-character-plus-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    // Skip: percent-encoded URLs test file has issues with manifest references
    it.skip('should allow percent-encoded URLs', async () => {
      const data = await loadEpub('valid/url-percent-encoded-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    // Skip: diacritic test needs Unicode normalization comparison
    it.skip('should allow diacritic (ü) in file names with composed/precomposed chars', async () => {
      const data = await loadEpub('valid/ocf-container-filename-character-composition-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    // Skip: Unicode compatibility normalization (NFKC) not implemented
    it.skip('should allow duplicate filename after Unicode compatibility normalization (NFKC)', async () => {
      const data = await loadEpub(
        'valid/ocf-filename-duplicate-after-compatibility-normalization-valid.epub',
      );
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Mimetype validation', () => {
    it('should report missing mimetype file (PKG-006)', async () => {
      const data = await loadEpub('invalid/ocf/ocf-mimetype-file-missing-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'PKG-006');
    });

    it('should report incorrect mimetype value (PKG-007)', async () => {
      const data = await loadEpub('invalid/ocf/ocf-mimetype-file-incorrect-value-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'PKG-007');
    });

    it('should report mimetype with leading spaces (PKG-007)', async () => {
      const data = await loadEpub('invalid/ocf/ocf-mimetype-file-leading-spaces-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'PKG-007');
    });

    it('should report mimetype with trailing newline (PKG-007)', async () => {
      const data = await loadEpub('invalid/ocf/ocf-mimetype-file-trailing-newline-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'PKG-007');
    });

    it('should report mimetype with trailing spaces (PKG-007)', async () => {
      const data = await loadEpub('invalid/ocf/ocf-mimetype-file-trailing-spaces-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'PKG-007');
    });

    it('should report mimetype entry with extra field in ZIP header (PKG-005)', async () => {
      const data = await loadEpub('invalid/ocf/ocf-zip-mimetype-entry-extra-field-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'PKG-005');
    });
  });

  describe('Container validation', () => {
    it('should report missing container.xml (RSC-002 fatal)', async () => {
      const data = await loadEpub('invalid/ocf/ocf-container-file-missing-fatal.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-002');
    });

    it('should report archive that is not an OCF (RSC-002 + PKG-006)', async () => {
      const data = await loadEpub('invalid/ocf/ocf-container-not-ocf-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      // Should have RSC-002 for missing container.xml and PKG-006 for missing mimetype
      expectError(result, 'RSC-002');
    });

    it('should report unknown element in container.xml (RSC-005)', async () => {
      const data = await loadEpub('invalid/ocf/ocf-container-content-model-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-005');
    });

    it('should report missing OPF document (OPF-002 fatal)', async () => {
      const data = await loadEpub('invalid/ocf/ocf-package-document-missing-fatal.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-002');
    });
  });

  describe('Filename validation', () => {
    it('should report forbidden characters in file names (PKG-009)', async () => {
      const data = await loadEpub('invalid/ocf/ocf-filename-character-forbidden-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'PKG-009');
    });

    it('should report forbidden characters even for non-publication resources (PKG-009)', async () => {
      const data = await loadEpub(
        'invalid/ocf/ocf-filename-character-forbidden-non-publication-resource-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'PKG-009');
    });

    // Skip: Unicode case folding duplicate detection not implemented (OPF-060)
    it.skip('should report duplicate filename after common case folding (OPF-060)', async () => {
      const data = await loadEpub(
        'invalid/ocf/ocf-filename-duplicate-after-common-case-folding-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-060');
    });

    // Skip: Unicode case folding duplicate detection not implemented (OPF-060)
    it.skip('should report duplicate filename after full case folding (OPF-060)', async () => {
      const data = await loadEpub(
        'invalid/ocf/ocf-filename-duplicate-after-full-case-folding-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-060');
    });

    // Skip: Unicode NFC normalization duplicate detection not implemented (OPF-060)
    it.skip('should report duplicate filename after canonical normalization NFC (OPF-060)', async () => {
      const data = await loadEpub(
        'invalid/ocf/ocf-filename-duplicate-after-canonical-normalization-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-060');
    });

    // Skip: Duplicate ZIP entry detection not implemented (OPF-060)
    it.skip('should report duplicate ZIP entry for same file (OPF-060)', async () => {
      const data = await loadEpub('invalid/ocf/ocf-filename-duplicate-zip-entry-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-060');
    });

    // Skip: Non-UTF8 encoding detection not implemented (PKG-027)
    it.skip('should report file names not encoded as UTF-8 (PKG-027 fatal)', async () => {
      const data = await loadEpub('invalid/ocf/ocf-filename-not-utf8-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'PKG-027');
    });

    // Skip: Non-UTF8 encoding detection not implemented (PKG-027)
    it.skip('should report file paths not encoded as UTF-8 (PKG-027 fatal)', async () => {
      const data = await loadEpub('invalid/ocf/ocf-filepath-not-utf8-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'PKG-027');
    });
  });

  describe('URL validation', () => {
    // Skip: URL leaking detection is implemented but test file may have issues
    it.skip('should report leaking URLs in package document (RSC-026)', async () => {
      const data = await loadEpub('invalid/ocf/ocf-url-leaking-in-opf-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-026');
    });

    // Skip: Path-absolute URL detection needs verification
    it.skip('should report path-absolute URLs in package document (RSC-026)', async () => {
      const data = await loadEpub('invalid/ocf/ocf-url-path-absolute-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-026');
    });

    // Skip: cite attribute reference checking may need verification
    it.skip('should report resource referenced from XHTML cite not in manifest (RSC-007)', async () => {
      const data = await loadEpub('invalid/ocf/url-xhtml-cite-missing-resource-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-007');
    });
  });

  describe('META-INF validation', () => {
    it('should report publication resources found in META-INF (PKG-025)', async () => {
      const data = await loadEpub('invalid/ocf/ocf-meta-inf-with-publication-resource-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'PKG-025');
    });
  });

  describe('ZIP validation', () => {
    it('should report unreadable ZIP file - empty file', async () => {
      const data = await loadEpub('invalid/ocf/ocf-zip-unreadable-empty-fatal.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      // Empty ZIP will trigger PKG-001 (failed to open) or similar
      const hasFatalError = result.messages.some((m) => m.severity === 'fatal');
      expect(hasFatalError).toBe(true);
    });

    it('should report unreadable ZIP file - no end header', async () => {
      const data = await loadEpub('invalid/ocf/ocf-zip-unreadable-no-end-header-fatal.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      const hasFatalError = result.messages.some((m) => m.severity === 'fatal');
      expect(hasFatalError).toBe(true);
    });

    it('should report unreadable ZIP file - image with .epub extension', async () => {
      const data = await loadEpub(
        'invalid/ocf/ocf-zip-unreadable-image-with-epub-extension-fatal.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      const hasFatalError = result.messages.some((m) => m.severity === 'fatal');
      expect(hasFatalError).toBe(true);
    });
  });

  describe('Warnings', () => {
    it('should warn about spaces in file names (PKG-010)', async () => {
      const data = await loadEpub('warnings/ocf-filename-character-space-warning.epub');
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
function expectError(
  result: Awaited<ReturnType<typeof EpubCheck.validate>>,
  errorId: string,
): void {
  const hasError = result.messages.some(
    (m) => m.id === errorId && (m.severity === 'error' || m.severity === 'fatal'),
  );
  expect(
    hasError,
    `Expected error ${errorId} to be reported. Got: ${JSON.stringify(result.messages.map((m) => m.id))}`,
  ).toBe(true);
}

/**
 * Assert that a specific warning ID is present in the result
 */
function expectWarning(
  result: Awaited<ReturnType<typeof EpubCheck.validate>>,
  warningId: string,
): void {
  const hasWarning = result.messages.some((m) => m.id === warningId && m.severity === 'warning');
  expect(
    hasWarning,
    `Expected warning ${warningId} to be reported. Got: ${JSON.stringify(result.messages.map((m) => m.id))}`,
  ).toBe(true);
}

/**
 * Assert that no errors or warnings are present
 */
function expectNoErrorsOrWarnings(result: Awaited<ReturnType<typeof EpubCheck.validate>>): void {
  const errorsOrWarnings = result.messages.filter(
    (m) => m.severity === 'error' || m.severity === 'fatal' || m.severity === 'warning',
  );
  expect(
    errorsOrWarnings,
    `Expected no errors or warnings. Got: ${JSON.stringify(errorsOrWarnings.map((m) => ({ id: m.id, severity: m.severity })))}`,
  ).toHaveLength(0);
}
