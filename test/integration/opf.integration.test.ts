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

    it('should validate an EPUB with link to embedded resource', async () => {
      const data = await loadEpub('valid/link-to-embedded-resource-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate an EPUB with MathML content', async () => {
      const data = await loadEpub('valid/package-mathml-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate an EPUB with valid NCX', async () => {
      const data = await loadEpub('valid/package-ncx-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate an EPUB with NCX not referencing all spine items', async () => {
      const data = await loadEpub('valid/package-ncx-missing-references-to-spine-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate an EPUB with link media-type missing for remote resource', async () => {
      const data = await loadEpub('valid/package-link-media-type-missing-remote-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate scripted property not required for script data blocks', async () => {
      const data = await loadEpub(
        'valid/package-manifest-prop-scripted-not-required-for-script-data-block-valid.epub',
      );
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

    it('should report self-referencing manifest item', async () => {
      const data = await loadEpub('invalid/opf/manifest-self-referencing-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-099');
    });
  });

  describe('Fallback validation', () => {
    it('should report fallback to unknown ID (OPF-040)', async () => {
      const data = await loadEpub('invalid/opf/opf-fallback-unknown-id-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-040');
    });

    it('should report fallback to self (OPF-045)', async () => {
      const data = await loadEpub('invalid/opf/opf-fallback-self-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-045');
    });
  });

  describe('Spine validation', () => {
    it('should report spine with no linear itemref (OPF-033)', async () => {
      const data = await loadEpub('invalid/opf/opf-spine-no-linear-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-033');
    });

    it('should report spine item referencing unknown manifest item (OPF-049)', async () => {
      const data = await loadEpub('invalid/opf/opf-spine-item-unknown-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-049');
    });

    it('should report spine toc attribute referencing non-NCX item (OPF-050)', async () => {
      const data = await loadEpub('invalid/opf/opf-spine-toc-not-ncx-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-050');
    });

    it('should report duplicate spine item (OPF-034)', async () => {
      const data = await loadEpub('invalid/opf/opf-spine-item-duplicate-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-034');
    });
  });

  describe('Package attributes validation', () => {
    it('should report missing unique-identifier attribute (OPF-048)', async () => {
      const data = await loadEpub('invalid/opf/opf-unique-identifier-missing-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-048');
    });
  });

  describe('Manifest properties validation', () => {
    it('should report undeclared scripted property (OPF-014)', async () => {
      const data = await loadEpub(
        'invalid/opf/package-manifest-prop-scripted-undeclared-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-014');
    });

    it('should report undeclared scripted property for JavaScript (OPF-014)', async () => {
      const data = await loadEpub(
        'invalid/opf/package-manifest-prop-scripted-undeclared-javascript-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-014');
    });

    it('should report undeclared scripted property for form elements (OPF-014)', async () => {
      const data = await loadEpub(
        'invalid/opf/package-manifest-prop-scripted-undeclared-form-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-014');
    });

    // Skip: OPF-015 unnecessary property detection not yet implemented
    it.skip('should report unnecessary scripted property (OPF-015)', async () => {
      const data = await loadEpub(
        'invalid/opf/package-manifest-prop-scripted-declared-but-unnecessary-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-015');
    });

    it('should report undeclared SVG property (OPF-014)', async () => {
      const data = await loadEpub('invalid/opf/package-manifest-prop-svg-undeclared-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-014');
    });

    it('should report undeclared SVG property for partial SVG usage (OPF-014)', async () => {
      const data = await loadEpub(
        'invalid/opf/package-manifest-prop-svg-undeclared-partial-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-014');
    });

    // Skip: OPF-015 unnecessary property detection not yet implemented
    it.skip('should report unnecessary SVG property (OPF-015)', async () => {
      const data = await loadEpub(
        'invalid/opf/package-manifest-prop-svg-declared-but-unnecessary-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-015');
    });

    // Skip: OPF-014 switch property detection not yet implemented
    it.skip('should report undeclared switch property (OPF-014)', async () => {
      const data = await loadEpub(
        'invalid/opf/package-manifest-prop-switch-not-declared-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-014');
    });

    it('should report unknown manifest item property (OPF-027)', async () => {
      const data = await loadEpub('invalid/opf/package-manifest-prop-unknown-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-027');
    });

    it('should report undeclared remote-resources property (OPF-014)', async () => {
      const data = await loadEpub(
        'invalid/opf/package-manifest-prop-remote-resource-undeclared-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-014');
    });

    // Skip: OPF-018 unnecessary remote-resources detection not yet implemented
    it.skip('should report unnecessary remote-resources property (OPF-018)', async () => {
      const data = await loadEpub(
        'invalid/opf/package-manifest-prop-remote-resource-declared-but-unnecessary-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expectWarning(result, 'OPF-018');
    });
  });

  describe('Link validation', () => {
    it('should report missing resource referenced by link (RSC-007w)', async () => {
      const data = await loadEpub('invalid/opf/package-link-missing-resource-error.epub');
      const result = await EpubCheck.validate(data);

      expectWarning(result, 'RSC-007w');
    });

    it('should report missing media-type for local linked resource (OPF-093)', async () => {
      const data = await loadEpub('invalid/opf/package-link-media-type-missing-local-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-093');
    });
  });

  describe('Font validation', () => {
    it('should report missing fonts declared in CSS (RSC-001)', async () => {
      const data = await loadEpub('invalid/opf/package-manifest-fonts-missing-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-001');
    });
  });

  describe('Remote resource validation', () => {
    it('should report remote audio missing remote-resources property (OPF-014)', async () => {
      const data = await loadEpub('invalid/opf/package-remote-audio-missing-property-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-014');
    });

    it('should report undeclared remote audio resource (RSC-008)', async () => {
      const data = await loadEpub('invalid/opf/package-remote-audio-undeclared-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-008');
    });

    it('should report remote font in CSS missing remote-resources property (OPF-014)', async () => {
      const data = await loadEpub(
        'invalid/opf/package-remote-font-in-css-missing-property-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-014');
    });

    it('should report undeclared remote font resource (RSC-008)', async () => {
      const data = await loadEpub('invalid/opf/package-remote-font-undeclared-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-008');
    });

    // Skip: RSC-006 remote image in link detection not yet implemented
    it.skip('should report remote image in link element (RSC-006)', async () => {
      const data = await loadEpub('invalid/opf/package-remote-img-in-link-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-006');
    });

    it('should report undeclared remote audio sources (RSC-008)', async () => {
      const data = await loadEpub('invalid/opf/package-remote-audio-sources-undeclared-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-008');
    });

    // Skip: OPF-014 remote font in inline CSS detection not yet implemented
    it.skip('should report remote font in inline CSS missing property (OPF-014)', async () => {
      const data = await loadEpub(
        'invalid/opf/package-remote-font-in-inline-css-missing-property-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-014');
    });

    // Skip: OPF-014 remote font in SVG detection not yet implemented
    it.skip('should report remote font in SVG missing property (OPF-014)', async () => {
      const data = await loadEpub(
        'invalid/opf/package-remote-font-in-svg-missing-property-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-014');
    });

    // Skip: OPF-014 remote font in XHTML detection not yet implemented
    it.skip('should report remote font in XHTML missing property (OPF-014)', async () => {
      const data = await loadEpub(
        'invalid/opf/package-remote-font-in-xhtml-missing-property-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-014');
    });

    // Skip: OPF-014 remote audio in media overlays detection not yet implemented
    it.skip('should report remote audio in overlays missing property (OPF-014)', async () => {
      const data = await loadEpub(
        'invalid/opf/package-remote-audio-in-overlays-missing-property-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-014');
    });

    // Skip: OPF-018 remote resource via object param detection not yet implemented
    it.skip('should warn about remote resource via object param (OPF-018)', async () => {
      const data = await loadEpub(
        'warnings/package-manifest-prop-remote-resource-object-param-warning.epub',
      );
      const result = await EpubCheck.validate(data);

      expectWarning(result, 'OPF-018');
    });

    it('should validate EPUB with remote resource and inline CSS', async () => {
      const data = await loadEpub('valid/package-remote-resource-and-inline-css-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Spine reachability validation', () => {
    // Skip: OPF-096 non-linear reachability check not yet implemented
    it.skip('should report non-linear content not reachable (OPF-096)', async () => {
      const data = await loadEpub('invalid/opf/spine-nonlinear-not-reachable-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'OPF-096');
    });

    it('should validate non-linear content reachable via hyperlink', async () => {
      const data = await loadEpub('valid/spine-nonlinear-reachable-via-hyperlink-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate non-linear content reachable via navigation', async () => {
      const data = await loadEpub('valid/spine-nonlinear-reachable-via-nav-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate non-linear content reachable via script', async () => {
      const data = await loadEpub('valid/spine-nonlinear-reachable-via-script-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should report spine not listing hyperlink target (RSC-011)', async () => {
      const data = await loadEpub('invalid/opf/spine-not-listing-hyperlink-target-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-011');
    });

    it('should report spine not listing navigation document target (RSC-011)', async () => {
      const data = await loadEpub(
        'invalid/opf/spine-not-listing-navigation-document-target-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-011');
    });
  });

  describe('NCX validation', () => {
    // Skip: RSC-012 NCX reference validation not yet implemented
    it.skip('should report invalid NCX reference (RSC-012)', async () => {
      const data = await loadEpub('invalid/opf/package-ncx-invalid-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-012');
    });
  });

  describe('Warnings', () => {
    it('should warn about spaces in manifest item href (PKG-010)', async () => {
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
