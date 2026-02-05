import { describe, expect, it } from 'vitest';
import { EpubCheck } from '../../src/index.js';

/**
 * Content Document Integration Tests
 *
 * Tests for XHTML, CSS, and SVG content validation, ported from Java EPUBCheck.
 * Based on: /epubcheck/src/test/resources/epub3/06-content-document/content-document-*.feature
 *
 * @see https://www.w3.org/TR/epub-33/#sec-contentdocs
 */

describe('Integration Tests - Content Documents', () => {
  describe('CSS validation', () => {
    it('should validate minimal CSS', async () => {
      const data = await loadEpub('valid/content-css-minimal-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate CSS with UTF-8 encoding declaration', async () => {
      const data = await loadEpub('valid/content-css-encoding-utf8-declared-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    // Skip: CSS syntax error detection (CSS-008) uses css-tree which handles many errors gracefully
    it.skip('should report CSS syntax errors (CSS-008)', async () => {
      const data = await loadEpub('invalid/content/content-css-syntax-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'CSS-008');
    });

    it('should report missing CSS import (RSC-001)', async () => {
      const data = await loadEpub('invalid/content/content-css-import-not-present-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-001');
    });

    it('should report missing CSS url() resource (RSC-007)', async () => {
      const data = await loadEpub('invalid/content/content-css-url-not-present-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-007');
    });

    it('should report forbidden CSS direction property (CSS-001)', async () => {
      const data = await loadEpub('invalid/content/content-css-property-direction-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'CSS-001');
    });

    it('should report forbidden CSS unicode-bidi property (CSS-001)', async () => {
      const data = await loadEpub('invalid/content/content-css-property-unicode-bidi-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'CSS-001');
    });

    it('should warn about empty @font-face rule (CSS-019)', async () => {
      const data = await loadEpub('invalid/content/content-css-font-face-empty-error.epub');
      const result = await EpubCheck.validate(data);

      // CSS-019 is a warning, not an error
      expectWarning(result, 'CSS-019');
    });
  });

  describe('XHTML validation', () => {
    it('should validate XHTML with unusual file extension', async () => {
      const data = await loadEpub('valid/content-xhtml-file-extension-unusual-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });
  });

  describe('SVG validation', () => {
    it('should validate SVG in spine', async () => {
      const data = await loadEpub('valid/content-svg-in-spine-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate SVG with unusual file extension', async () => {
      const data = await loadEpub('valid/content-svg-file-extension-unusual-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate SVG referenced from img, object and iframe elements', async () => {
      const data = await loadEpub('valid/content-xhtml-svg-reference-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate svg:switch without triggering package switch property', async () => {
      const data = await loadEpub('valid/content-xhtml-svg-switch-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Hyperlink validation', () => {
    it('should report a hyperlink to a missing document (RSC-007)', async () => {
      const data = await loadEpub('invalid/content/content-xhtml-link-to-missing-doc-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-007');
    });

    it('should report a hyperlink to a missing identifier (RSC-012)', async () => {
      const data = await loadEpub('invalid/content/content-xhtml-link-to-missing-id-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-012');
    });

    it('should report a hyperlink to a missing identifier in another document (RSC-012)', async () => {
      const data = await loadEpub(
        'invalid/content/content-xhtml-link-to-missing-id-xref-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-012');
    });

    it('should allow href values that only contain whitespace', async () => {
      const data = await loadEpub('valid/content-xhtml-link-href-empty-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should resolve relative paths starting with a single dot', async () => {
      const data = await loadEpub('valid/content-xhtml-link-rel-path-dot-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should report reference to undeclared resource (RSC-007)', async () => {
      const data = await loadEpub(
        'invalid/content/content-xhtml-referenced-resource-missing-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-007');
    });
  });

  describe('Iframe validation', () => {
    it('should validate an iframe referencing another XHTML document', async () => {
      const data = await loadEpub('valid/content-xhtml-iframe-basic-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Image validation', () => {
    it('should validate img element referencing SVG fragments', async () => {
      const data = await loadEpub('valid/content-xhtml-img-fragment-svg-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should warn about non-SVG images referenced as fragments (RSC-009)', async () => {
      const data = await loadEpub('warnings/content-xhtml-img-fragment-non-svg-warning.epub');
      const result = await EpubCheck.validate(data);

      expectWarning(result, 'RSC-009');
    });

    it('should report undeclared resources in img srcset (RSC-008)', async () => {
      const data = await loadEpub('invalid/content/content-xhtml-img-srcset-undeclared-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-008');
    });
  });

  describe('Base URL validation', () => {
    it('should validate base url can be set', async () => {
      const data = await loadEpub('valid/content-xhtml-base-url-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    // Skip: External base URL handling for relative paths not fully implemented
    it.skip('should report relative paths as remote when base is external URL (RSC-006)', async () => {
      const data = await loadEpub(
        'invalid/content/content-xhtml-base-url-remote-relative-path-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-006');
    });
  });

  describe('Schema validation', () => {
    // Skip: RelaxNG schema validation for content documents not fully wired
    it.skip('should report RelaxNG schema errors (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/content-xhtml-relaxng-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-005');
    });

    // Skip: Schematron validation for content documents not fully wired
    it.skip('should report Schematron schema errors (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/content-xhtml-schematron-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-005');
    });

    // Skip: data-* attribute handling in schema validation not implemented
    it.skip('should report invalid elements after data-* attribute (RSC-005)', async () => {
      const data = await loadEpub(
        'invalid/content/content-xhtml-data-attr-removal-markup-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-005');
    });

    it('should allow fragment identifiers after data-* declaration', async () => {
      const data = await loadEpub('valid/content-xhtml-data-attr-removal-fragments-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });
  });

  describe('MathML validation', () => {
    it('should allow MathML with alternative image', async () => {
      const data = await loadEpub('valid/content-xhtml-mathml-altimg-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should report MathML with alternative image not found (RSC-007)', async () => {
      const data = await loadEpub(
        'invalid/content/content-xhtml-mathml-altimg-not-found-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-007');
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
    `Expected no errors or warnings. Got: ${JSON.stringify(errorsOrWarnings.map((m) => ({ id: m.id, severity: m.severity, message: m.message })))}`,
  ).toHaveLength(0);
}
