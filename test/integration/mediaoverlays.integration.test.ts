import { describe, expect, it } from 'vitest';
import { EpubCheck } from '../../src/index.js';

/**
 * Media Overlays Integration Tests
 *
 * Tests for SMIL media overlay validation, ported from Java EPUBCheck.
 * Based on: /epubcheck/src/test/resources/epub3/09-media-overlays/media-overlays.feature
 *
 * @see https://www.w3.org/TR/epub-33/#sec-media-overlays
 */

describe('Integration Tests - Media Overlays', () => {
  // ==================== Valid Media Overlays ====================
  describe('Valid media overlays', () => {
    it('should validate a minimal EPUB with media overlays', async () => {
      const data = await loadEpub('valid/mediaoverlays-minimal-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should validate media overlays for SVG content', async () => {
      const data = await loadEpub('valid/mediaoverlays-svg-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should allow media overlay documents with any file extension', async () => {
      const data = await loadEpub('valid/mediaoverlays-file-extension-unusual-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should allow empty fragment identifiers in text references', async () => {
      const data = await loadEpub('valid/mediaoverlays-textref-no-fragment-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should allow SVG fragment identifiers in text references', async () => {
      const data = await loadEpub('valid/mediaoverlays-textref-svg-fragment-viewbox-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });
  });

  // ==================== Audio Validation ====================
  describe('Audio validation', () => {
    it('should report audio reference to non-core-media-type (MED-005)', async () => {
      const data = await loadEpub('invalid/mediaoverlays/mediaoverlays-audio-non-cmt-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'MED-005');
    });
  });

  // ==================== Media Overlay Cross-Reference ====================
  describe('Media overlay cross-references', () => {
    it('should report content document referenced by multiple overlays (MED-011)', async () => {
      const data = await loadEpub(
        'invalid/mediaoverlays/mediaoverlays-multiple-overlay-ref-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expectError(result, 'MED-011');
    });

    it('should report content document missing media-overlay attribute (MED-010)', async () => {
      const data = await loadEpub('invalid/mediaoverlays/mediaoverlays-missing-mo-attr-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'MED-010');
    });

    it('should report content document referencing wrong overlay (MED-012)', async () => {
      const data = await loadEpub(
        'invalid/mediaoverlays/mediaoverlays-incorrect-overlay-ref-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expectError(result, 'MED-012');
    });

    it('should report media-overlay attribute with no reference from overlay (MED-013)', async () => {
      const data = await loadEpub('invalid/mediaoverlays/mediaoverlays-no-overlay-ref-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'MED-013');
    });
  });

  // ==================== Fragment Validation ====================
  describe('Fragment validation', () => {
    it('should report unresolved fragment identifier (RSC-012)', async () => {
      const data = await loadEpub(
        'invalid/mediaoverlays/mediaoverlays-textref-fragment-unresolved-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-012');
    });

    it('should warn about scheme-based XHTML fragments (MED-017)', async () => {
      const data = await loadEpub(
        'invalid/mediaoverlays/mediaoverlays-textref-fragment-schemebased-warning.epub',
      );
      const result = await EpubCheck.validate(data);

      expectWarning(result, 'MED-017');
    });

    it('should warn about invalid SVG fragment identifiers (MED-018)', async () => {
      const data = await loadEpub(
        'invalid/mediaoverlays/mediaoverlays-textref-svg-fragment-invalid-warning.epub',
      );
      const result = await EpubCheck.validate(data);

      expectWarning(result, 'MED-018');
    });
  });

  // ==================== Reading Order ====================
  describe('Reading order', () => {
    it('should report text references not in reading order (MED-015)', async () => {
      const data = await loadEpub(
        'invalid/mediaoverlays/mediaoverlays-text-reading-order-error.epub',
      );
      const result = await EpubCheck.validate(data, { includeUsage: true });

      expectUsage(result, 'MED-015');
    });
  });
});

// ==================== Helpers ====================

async function loadEpub(path: string): Promise<Uint8Array> {
  const fs = await import('node:fs');
  const pathModule = await import('node:path');
  const url = await import('node:url');

  const currentDir = url.fileURLToPath(new URL('.', import.meta.url));
  const filePath = pathModule.resolve(currentDir, '../fixtures', path);

  return new Uint8Array(fs.readFileSync(filePath));
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
    `Expected error ${errorId} to be reported. Got: ${JSON.stringify(result.messages.map((m) => ({ id: m.id, severity: m.severity, message: m.message })))}`,
  ).toBe(true);
}

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

function expectUsage(
  result: Awaited<ReturnType<typeof EpubCheck.validate>>,
  usageId: string,
): void {
  const hasUsage = result.messages.some((m) => m.id === usageId && m.severity === 'usage');
  expect(
    hasUsage,
    `Expected usage ${usageId} to be reported. Got: ${JSON.stringify(result.messages.map((m) => ({ id: m.id, severity: m.severity })))}`,
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
