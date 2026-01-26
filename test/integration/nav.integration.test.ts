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
