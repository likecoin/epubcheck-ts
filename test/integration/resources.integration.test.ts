import { describe, expect, it } from 'vitest';
import { EpubCheck } from '../../src/index.js';

/**
 * Resources Integration Tests
 *
 * Tests for Publication Resources validation, ported from Java EPUBCheck.
 * Based on: /epubcheck/src/test/resources/epub3/03-resources/resources.feature
 *
 * @see https://www.w3.org/TR/epub-33/#sec-publication-resources
 */

describe('Integration Tests - Resources', () => {
  describe('Core Media Types', () => {
    it('should validate PNG images', async () => {
      const data = await loadEpub('valid/resources-cmt-image-png-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    // Skip: Corrupt image detection (MED-004) not implemented
    it.skip('should report corrupt images (MED-004)', async () => {
      const data = await loadEpub('invalid/content/resources-cmt-image-corrupt-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'MED-004');
    });
  });

  describe('Remote Resources', () => {
    it('should allow remote audio resources', async () => {
      const data = await loadEpub('valid/resources-remote-audio-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should allow remote video resources', async () => {
      const data = await loadEpub('valid/resources-remote-video-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should allow remote fonts', async () => {
      const data = await loadEpub('valid/resources-remote-font-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should report remote image (RSC-006)', async () => {
      const data = await loadEpub('invalid/content/resources-remote-img-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-006');
    });

    it('should report remote stylesheet (RSC-006)', async () => {
      const data = await loadEpub('invalid/content/resources-remote-stylesheet-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-006');
    });

    // Skip: Remote script detection via src attribute not implemented
    it.skip('should report remote script (RSC-006)', async () => {
      const data = await loadEpub('invalid/content/resources-remote-script-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-006');
    });
  });

  describe('Foreign Resources with Fallbacks', () => {
    it('should allow foreign resource with manifest fallback', async () => {
      const data = await loadEpub('valid/foreign-xhtml-img-manifest-fallback-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    // Skip: Foreign resource fallback validation (RSC-032) not implemented
    it.skip('should report foreign resource without fallback (RSC-032)', async () => {
      const data = await loadEpub('invalid/content/foreign-xhtml-img-src-no-manifest-fallback-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-032');
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
    `Expected no errors or warnings. Got: ${JSON.stringify(errorsOrWarnings.map((m) => ({ id: m.id, severity: m.severity, message: m.message })))}`,
  ).toHaveLength(0);
}
