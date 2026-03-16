import { describe, expect, it } from 'vitest';
import { EpubCheck } from '../../src/index.js';

/**
 * Layout Rendering Control Integration Tests
 *
 * Tests for EPUB 3.3 §8 "Layout Rendering Control", ported from Java EPUBCheck.
 * Based on: /epubcheck/src/test/resources/epub3/08-layout/layout.feature
 *
 * @see https://www.w3.org/TR/epub-33/#sec-rendering-control
 */

describe('Integration Tests - Layout Rendering Control', () => {
  // ==================== 8.2 Fixed Layouts ====================

  describe('Fixed-layout SVG', () => {
    it('should validate a fixed-layout SVG with viewBox', async () => {
      const data = await loadEpub('valid/layout-content-fxl-svg-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should verify inner svg elements do not require viewBox', async () => {
      const data = await loadEpub(
        'valid/layout-content-fxl-svg-no-viewbox-on-inner-svg-valid.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should report fixed-layout SVG without viewBox (HTM-048)', async () => {
      const data = await loadEpub('invalid/layout/layout-content-fxl-svg-no-viewbox-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'HTM-048');
    });

    it('should report fixed-layout SVG without viewBox (width/height in units) (HTM-048)', async () => {
      const data = await loadEpub(
        'invalid/layout/layout-content-fxl-svg-no-viewbox-width-height-units-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'HTM-048');
    });

    it('should report fixed-layout SVG without viewBox (width/height in percent) (HTM-048)', async () => {
      const data = await loadEpub(
        'invalid/layout/layout-content-fxl-svg-no-viewbox-width-height-percent-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'HTM-048');
    });
  });

  // ==================== 8.2.2 Fixed-layout package settings ====================

  describe('Rendition layout (global meta)', () => {
    // All file-based (.opf) tests — cannot be ported to TS validator
    it.skip('rendition:layout valid values - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:layout empty value error - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:layout unknown value error - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:layout duplicate error - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:layout refines error - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:layout itemref valid - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:layout itemref conflict error - Single-file (.opf) validation mode not supported', () => {});
  });

  describe('Rendition orientation (global meta)', () => {
    it.skip('rendition:orientation valid values - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:orientation unknown value error - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:orientation duplicate error - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:orientation refines error - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:orientation itemref valid - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:orientation itemref conflict error - Single-file (.opf) validation mode not supported', () => {});
  });

  describe('Rendition spread (global meta)', () => {
    it.skip('rendition:spread valid values - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:spread unknown value error - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:spread duplicate error - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:spread refines error - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:spread portrait deprecated - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:spread itemref valid - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:spread itemref conflict error - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:spread-portrait itemref deprecated - Single-file (.opf) validation mode not supported', () => {});
  });

  describe('Rendition page-spread', () => {
    it.skip('rendition:page-spread unprefixed valid - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:page-spread itemref conflict error - Single-file (.opf) validation mode not supported', () => {});
  });

  describe('Rendition viewport (deprecated)', () => {
    it.skip('rendition:viewport deprecated - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:viewport syntax error - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:viewport duplicate error - Single-file (.opf) validation mode not supported', () => {});
  });

  describe('Rendition flow (global meta)', () => {
    it.skip('rendition:flow valid values - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:flow unknown value error - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:flow duplicate error - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:flow refines error - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:flow itemref valid - Single-file (.opf) validation mode not supported', () => {});
    it.skip('rendition:flow itemref conflict error - Single-file (.opf) validation mode not supported', () => {});
  });

  // ==================== 8.2.2.6 Content document dimensions ====================

  describe('XHTML viewport meta in fixed-layout', () => {
    it('should validate fixed-layout XHTML with valid viewport', async () => {
      const data = await loadEpub('valid/layout-content-fxl-xhtml-viewport-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate fixed-layout XHTML with non-integer viewport dimensions', async () => {
      const data = await loadEpub('valid/layout-content-fxl-xhtml-viewport-float-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate fixed-layout XHTML with viewport whitespace', async () => {
      const data = await loadEpub('valid/layout-content-fxl-xhtml-viewport-whitespace-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate fixed-layout XHTML with viewport device keywords', async () => {
      const data = await loadEpub('valid/layout-content-fxl-xhtml-viewport-keywords-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should report fixed-layout XHTML with no viewport (HTM-046)', async () => {
      const data = await loadEpub(
        'invalid/layout/layout-content-fxl-xhtml-viewport-missing-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'HTM-046');
    });

    it('should report fixed-layout XHTML with syntactically invalid viewport (HTM-047)', async () => {
      const data = await loadEpub(
        'invalid/layout/layout-content-fxl-xhtml-viewport-syntax-invalid-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'HTM-047');
    });

    it('should report single fixed-layout item with invalid viewport in reflowable EPUB (HTM-047)', async () => {
      const data = await loadEpub(
        'invalid/layout/layout-content-fxl-item-xhtml-viewport-invalid-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'HTM-047');
    });

    it('should report fixed-layout XHTML with viewport missing height (HTM-056)', async () => {
      const data = await loadEpub(
        'invalid/layout/layout-content-fxl-xhtml-viewport-height-missing-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'HTM-056');
    });

    it('should report fixed-layout XHTML with viewport missing width (HTM-056)', async () => {
      const data = await loadEpub(
        'invalid/layout/layout-content-fxl-xhtml-viewport-width-missing-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'HTM-056');
    });

    it('should report fixed-layout XHTML with empty height value (HTM-057)', async () => {
      const data = await loadEpub(
        'invalid/layout/layout-content-fxl-xhtml-viewport-height-empty-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'HTM-057');
    });

    it('should report fixed-layout XHTML with viewport using units (HTM-057)', async () => {
      const data = await loadEpub(
        'invalid/layout/layout-content-fxl-xhtml-viewport-units-invalid-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      const htm057Count = result.messages.filter((m) => m.id === 'HTM-057').length;
      expect(htm057Count).toBe(2);
    });

    it('should report fixed-layout XHTML with duplicate width/height (HTM-059)', async () => {
      const data = await loadEpub(
        'invalid/layout/layout-content-fxl-xhtml-viewport-duplicate-width-height-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      const htm059Count = result.messages.filter((m) => m.id === 'HTM-059').length;
      expect(htm059Count).toBe(2);
    });

    it('should report secondary viewport meta as usage in FXL (HTM-060a)', async () => {
      const data = await loadEpub(
        'valid/layout-content-fxl-xhtml-viewport-multiple-usage-valid.epub',
      );
      const result = await EpubCheck.validate(data, { includeUsage: true });

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
      expectUsage(result, 'HTM-060a');
      const htm060aCount = result.messages.filter((m) => m.id === 'HTM-060a').length;
      expect(htm060aCount).toBe(2);
    });

    it('should report ICB missing in first viewport meta (HTM-056)', async () => {
      const data = await loadEpub(
        'invalid/layout/layout-content-fxl-xhtml-viewport-icb-missing-in-first-meta-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      const htm056Count = result.messages.filter((m) => m.id === 'HTM-056').length;
      expect(htm056Count).toBe(2);
    });
  });

  describe('Reflowable document with viewport', () => {
    it('should not check viewport metadata in reflowable content (HTM-060b usage)', async () => {
      const data = await loadEpub(
        'valid/layout-content-reflow-xhtml-viewport-height-missing-valid.epub',
      );
      const result = await EpubCheck.validate(data, { includeUsage: true });

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
      expectUsage(result, 'HTM-060b');
    });
  });
});

// ==================== Test Helpers ====================

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
    `Expected error ${errorId} to be reported. Got: ${JSON.stringify(result.messages.map((m) => ({ id: m.id, severity: m.severity })))}`,
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
