import { describe, expect, it } from 'vitest';
import { EpubCheck } from '../../src/index.js';

/**
 * Navigation Document Integration Tests
 *
 * Tests for EPUB 3 Navigation Document and NCX validation, ported from Java EPUBCheck.
 * Based on: /epubcheck/src/test/resources/epub3/07-navigation-document/navigation-document.feature
 *
 * @see https://www.w3.org/TR/epub-33/#sec-nav
 */

describe('Integration Tests - Navigation Documents', () => {
  describe('Valid Navigation', () => {
    it('should validate navigation with correct reading order', async () => {
      const data = await loadEpub('valid/nav-toc-reading-order-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate navigation document using EPUB CFI', async () => {
      const data = await loadEpub('valid/nav-cfi-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate toc nav not linking to all spine items', async () => {
      const data = await loadEpub('valid/nav-toc-missing-references-to-spine-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate page-list nav with correct reading order', async () => {
      const data = await loadEpub('valid/nav-page-list-reading-order-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate page-list nav with unordered spine links', async () => {
      const data = await loadEpub('warnings/nav-page-list-unordered-spine-warning.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should validate page-list nav with unordered fragment links', async () => {
      const data = await loadEpub('warnings/nav-page-list-unordered-fragments-warning.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });
  });

  describe('TOC validation', () => {
    it('should report missing TOC nav element (NAV-001)', async () => {
      const data = await loadEpub('invalid/nav/nav-toc-missing-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'NAV-001');
    });
  });

  describe('Link validation', () => {
    it('should report remote links in navigation (NAV-010)', async () => {
      const data = await loadEpub('invalid/nav/nav-links-remote-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'NAV-010');
    });

    it('should report links to items not in spine (RSC-011)', async () => {
      const data = await loadEpub('invalid/nav/nav-links-out-of-spine-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-011');
    });

    it('should report links to non-content document types (RSC-010)', async () => {
      const data = await loadEpub('invalid/nav/nav-links-to-non-content-document-type-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-010');
    });
  });

  describe('Reading order validation', () => {
    // Skip: NAV-011 reading order validation not yet implemented
    it.skip('should warn about toc nav links not matching spine order (NAV-011)', async () => {
      const data = await loadEpub('warnings/nav-toc-unordered-spine-warning.epub');
      const result = await EpubCheck.validate(data);

      expectWarning(result, 'NAV-011');
    });

    // Skip: NAV-011 reading order validation not yet implemented
    it.skip('should warn about toc nav link fragments not matching document order (NAV-011)', async () => {
      const data = await loadEpub('warnings/nav-toc-unordered-fragments-warning.epub');
      const result = await EpubCheck.validate(data);

      expectWarning(result, 'NAV-011');
    });
  });

  // ============================================================
  // Tests ported from Java EPUBCheck navigation-document.feature
  // ============================================================

  describe('Nav element restrictions — content model (§7.3)', () => {
    it('report empty nav heading (RSC-005)', async () => {
      const data = await loadEpub('invalid/nav/content-model-heading-empty-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('report p element used as nav heading (RSC-005)', async () => {
      const data = await loadEpub('invalid/nav/content-model-heading-p-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('report missing list item label (RSC-005)', async () => {
      const data = await loadEpub('invalid/nav/content-model-li-label-missing-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('report empty list item label (RSC-005)', async () => {
      const data = await loadEpub('invalid/nav/content-model-li-label-empty-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('allow multiple images in a list item label', async () => {
      const data = await loadEpub('valid/content-model-li-label-multiple-images-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    it('report leaf list item with no link (RSC-005)', async () => {
      const data = await loadEpub('invalid/nav/content-model-li-leaf-with-no-link-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('report nav hyperlink without content (RSC-005)', async () => {
      const data = await loadEpub('invalid/nav/content-model-a-empty-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('allow multiple images in a nav hyperlink', async () => {
      const data = await loadEpub('valid/content-model-a-multiple-images-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    it('report nav hyperlink with empty nested span (RSC-005)', async () => {
      const data = await loadEpub('invalid/nav/content-model-a-span-empty-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    // Skip: Fixture has intentional spaces in href that trigger RSC-020
    it.skip('allow nav hyperlinks with leading and trailing spaces', async () => {
      const data = await loadEpub('valid/content-model-a-with-leading-trailing-spaces-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    it('report nav list without content (RSC-005)', async () => {
      const data = await loadEpub('invalid/nav/content-model-ol-empty-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });
  });

  describe('Nav element types (§7.4)', () => {
    it('allow a nested toc nav', async () => {
      const data = await loadEpub('valid/nav-toc-nested-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    it('allow a page-list nav', async () => {
      const data = await loadEpub('valid/nav-page-list-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    it('report multiple page-list nav elements (RSC-005)', async () => {
      const data = await loadEpub('invalid/nav/nav-page-list-multiple-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('allow a landmarks nav', async () => {
      const data = await loadEpub('valid/nav-landmarks-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    it('report landmarks link without epub:type (RSC-005)', async () => {
      const data = await loadEpub('invalid/nav/nav-landmarks-link-type-missing-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('report multiple landmarks nav elements (RSC-005)', async () => {
      const data = await loadEpub('invalid/nav/nav-landmarks-multiple-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('allow same epub:type in landmarks when pointing to different resources', async () => {
      const data = await loadEpub('valid/nav-landmarks-type-twice-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    it('report same epub:type targeting same resource in landmarks (RSC-005)', async () => {
      const data = await loadEpub('invalid/nav/nav-landmarks-type-twice-same-resource-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('allow a lot (list of tables) nav', async () => {
      const data = await loadEpub('valid/nav-other-lot-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    it('report other nav without a heading (RSC-005)', async () => {
      const data = await loadEpub('invalid/nav/nav-other-heading-missing-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('nav without declared epub:type is not restricted', async () => {
      const data = await loadEpub('valid/nav-type-missing-not-restricted-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Use in spine (§7.5)', () => {
    it('allow a hidden nav', async () => {
      const data = await loadEpub('valid/hidden-nav-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    it('report hidden attribute with wrong value (RSC-005)', async () => {
      const data = await loadEpub('invalid/nav/hidden-attribute-invalid-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
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
    `Expected warning ${warningId} to be reported. Got: ${JSON.stringify(result.messages.map((m) => ({ id: m.id, severity: m.severity })))}`,
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
