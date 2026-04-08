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
    it('should allow valid rendition:layout values', async () => {
      const result = await validateOpf('rendition-layout-global-valid');
      expectNoErrorsOrWarnings(result);
    });

    it('should report empty rendition:layout value (RSC-005)', async () => {
      const result = await validateOpf('rendition-layout-global-empty-error');
      expectError(result, 'RSC-005');
    });

    it('should report unknown rendition:layout value (RSC-005)', async () => {
      const result = await validateOpf('rendition-layout-global-unknown-value-error');
      expectError(result, 'RSC-005');
    });

    it('should report duplicate rendition:layout (RSC-005)', async () => {
      const result = await validateOpf('rendition-layout-global-duplicate-error');
      expectError(result, 'RSC-005');
    });

    it('should report rendition:layout with refines (RSC-005)', async () => {
      const result = await validateOpf('rendition-layout-global-refines-error');
      expectError(result, 'RSC-005');
    });

    it('should allow rendition:layout as itemref override', async () => {
      const result = await validateOpf('rendition-layout-itemref-valid');
      expectNoErrorsOrWarnings(result);
    });

    it('should report conflicting rendition:layout itemref overrides (RSC-005)', async () => {
      const result = await validateOpf('rendition-layout-itemref-conflict-error');
      expectError(result, 'RSC-005');
    });
  });

  describe('Rendition orientation (global meta)', () => {
    it('should allow valid rendition:orientation values', async () => {
      const result = await validateOpf('rendition-orientation-global-valid');
      expectNoErrorsOrWarnings(result);
    });

    it('should report unknown rendition:orientation value (RSC-005)', async () => {
      const result = await validateOpf('rendition-orientation-global-unknown-value-error');
      expectError(result, 'RSC-005');
    });

    it('should report duplicate rendition:orientation (RSC-005)', async () => {
      const result = await validateOpf('rendition-orientation-global-duplicate-error');
      expectError(result, 'RSC-005');
    });

    it('should report rendition:orientation with refines (RSC-005)', async () => {
      const result = await validateOpf('rendition-orientation-global-refines-error');
      expectError(result, 'RSC-005');
    });

    it('should allow rendition:orientation as itemref override', async () => {
      const result = await validateOpf('rendition-orientation-itemref-valid');
      expectNoErrorsOrWarnings(result);
    });

    it('should report conflicting rendition:orientation itemref overrides (RSC-005)', async () => {
      const result = await validateOpf('rendition-orientation-itemref-conflict-error');
      expectError(result, 'RSC-005');
    });
  });

  describe('Rendition spread (global meta)', () => {
    it('should allow valid rendition:spread values', async () => {
      const result = await validateOpf('rendition-spread-global-valid');
      expectNoErrorsOrWarnings(result);
    });

    it('should report unknown rendition:spread value (RSC-005)', async () => {
      const result = await validateOpf('rendition-spread-global-unknown-value-error');
      expectError(result, 'RSC-005');
    });

    it('should report duplicate rendition:spread (RSC-005)', async () => {
      const result = await validateOpf('rendition-spread-global-duplicate-error');
      expectError(result, 'RSC-005');
    });

    it('should report rendition:spread with refines (RSC-005)', async () => {
      const result = await validateOpf('rendition-spread-global-refines-error');
      expectError(result, 'RSC-005');
    });

    it('should warn about deprecated rendition:spread portrait', async () => {
      const result = await validateOpf('rendition-spread-portrait-global-deprecated-warning');
      expectWarning(result, 'OPF-086');
    });

    it('should allow rendition:spread as itemref override', async () => {
      const result = await validateOpf('rendition-spread-itemref-valid');
      expectNoErrorsOrWarnings(result);
    });

    it('should report conflicting rendition:spread itemref overrides (RSC-005)', async () => {
      const result = await validateOpf('rendition-spread-itemref-conflict-error');
      expectError(result, 'RSC-005');
    });

    it('should warn about deprecated rendition:spread-portrait itemref', async () => {
      const result = await validateOpf('rendition-spread-portrait-itemref-deprecated-warning');
      expectWarning(result, 'OPF-086');
    });
  });

  describe('Rendition page-spread', () => {
    it('should allow unprefixed rendition:page-spread itemref', async () => {
      const result = await validateOpf('rendition-page-spread-itemref-unprefixed-valid');
      expectNoErrorsOrWarnings(result);
    });

    it('should report conflicting rendition:page-spread itemref (RSC-005)', async () => {
      const result = await validateOpf('rendition-page-spread-itemref-conflict-error');
      expectError(result, 'RSC-005');
    });
  });

  describe('Rendition viewport (deprecated)', () => {
    it('should warn about deprecated rendition:viewport', async () => {
      const result = await validateOpf('rendition-viewport-deprecated-warning');
      expectWarning(result, 'OPF-086');
    });

    it('should report rendition:viewport syntax error (RSC-005)', async () => {
      const result = await validateOpf('rendition-viewport-syntax-error');
      expectError(result, 'RSC-005');
    });

    it('should report duplicate rendition:viewport (RSC-005)', async () => {
      const result = await validateOpf('rendition-viewport-duplicate-error');
      expectError(result, 'RSC-005');
    });
  });

  describe('Rendition flow (global meta)', () => {
    it('should allow valid rendition:flow values', async () => {
      const result = await validateOpf('rendition-flow-global-valid');
      expectNoErrorsOrWarnings(result);
    });

    it('should report unknown rendition:flow value (RSC-005)', async () => {
      const result = await validateOpf('rendition-flow-global-unknown-value-error');
      expectError(result, 'RSC-005');
    });

    it('should report duplicate rendition:flow (RSC-005)', async () => {
      const result = await validateOpf('rendition-flow-global-duplicate-error');
      expectError(result, 'RSC-005');
    });

    it('should report rendition:flow with refines (RSC-005)', async () => {
      const result = await validateOpf('rendition-flow-global-refines-error');
      expectError(result, 'RSC-005');
    });

    it('should allow rendition:flow as itemref override', async () => {
      const result = await validateOpf('rendition-flow-itemref-valid');
      expectNoErrorsOrWarnings(result);
    });

    it('should report conflicting rendition:flow itemref overrides (RSC-005)', async () => {
      const result = await validateOpf('rendition-flow-itemref-conflict-error');
      expectError(result, 'RSC-005');
    });
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

async function validateOpf(
  fixture: string,
): Promise<Awaited<ReturnType<typeof EpubCheck.validate>>> {
  const data = await loadEpub(`layout/${fixture}.opf`);
  return EpubCheck.validateSingleFile(data, `${fixture}.opf`, {
    mode: 'opf',
    version: '3.0',
  });
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
