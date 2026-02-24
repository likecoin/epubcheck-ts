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
  // ==========================================================================
  // 3.2 Core Media Types
  // ==========================================================================
  describe('Core Media Types', () => {
    describe('Audio', () => {
      it('should allow MP3 audio', async () => {
        const result = await validate('valid/resources-cmt-audio-mp3-valid.epub');
        expectNoErrorsOrWarnings(result);
      });

      it('should allow AAC/MP4 audio', async () => {
        const result = await validate('valid/resources-cmt-audio-mp4-valid.epub');
        expectNoErrorsOrWarnings(result);
      });

      it('should allow OPUS audio', async () => {
        const result = await validate('valid/resources-cmt-audio-opus-valid.epub');
        expectNoErrorsOrWarnings(result);
      });
    });

    describe('Images', () => {
      it('should allow GIF images', async () => {
        const result = await validate('valid/resources-cmt-image-gif-valid.epub');
        expectNoErrorsOrWarnings(result);
      });

      it('should allow JPEG images', async () => {
        const result = await validate('valid/resources-cmt-image-jpg-valid.epub');
        expectNoErrorsOrWarnings(result);
      });

      it('should allow PNG images', async () => {
        const result = await validate('valid/resources-cmt-image-png-valid.epub');
        expectNoErrorsOrWarnings(result);
      });

      it('should allow WebP images', async () => {
        const result = await validate('valid/resources-cmt-image-webp-valid.epub');
        expectNoErrorsOrWarnings(result);
      });

      it('should allow non-corrupt JPEG (issue 567)', async () => {
        const result = await validate('valid/resources-cmt-image-jpg-not-corrupt-valid.epub');
        expectNoErrorsOrWarnings(result);
      });

      it('should report corrupt images (MED-004)', async () => {
        const result = await validate('invalid/content/resources-cmt-image-corrupt-error.epub');
        expectError(result, 'MED-004');
      });

      it('should report JPEG declared as GIF (OPF-029)', async () => {
        const result = await validate(
          'invalid/content/resources-cmt-image-jpeg-declared-as-gif-error.epub',
        );
        expectError(result, 'OPF-029');
      });

      it('should report wrong image extension (PKG-022)', async () => {
        const result = await validate('warnings/resources-cmt-image-wrong-extension-warning.epub');
        expectWarning(result, 'PKG-022');
      });
    });

    describe('Fonts', () => {
      it('should allow TrueType fonts', async () => {
        const result = await validate('valid/resources-cmt-font-truetype-valid.epub');
        expectNoErrorsOrWarnings(result);
      });

      it('should allow OpenType fonts', async () => {
        const result = await validate('valid/resources-cmt-font-opentype-valid.epub');
        expectNoErrorsOrWarnings(result);
      });

      it('should allow SVG fonts', async () => {
        const result = await validate('valid/resources-cmt-font-svg-valid.epub');
        expectNoErrorsOrWarnings(result);
      });
    });

    describe('All Core Media Types (OPF)', () => {
      it('should allow all core media types in a single manifest', async () => {
        const result = await validate('valid/resources-core-media-types-valid.epub');
        expectNoErrorsOrWarnings(result);
      });

      it.skip('should allow non-preferred core media types (OPF-090)', async () => {
        // OPF-090 usage not emitted
        const result = await validate('valid/resources-core-media-types-not-preferred-valid.epub');
        expectUsage(result, 'OPF-090');
      });
    });
  });

  // ==========================================================================
  // 3.3 Foreign Resources
  // ==========================================================================
  describe('Foreign Resources', () => {
    describe('Audio fallbacks', () => {
      it('should allow foreign audio with manifest fallback', async () => {
        const result = await validate('valid/foreign-xhtml-audio-manifest-fallback-valid.epub');
        expectNoErrorsOrWarnings(result);
      });

      it('should report foreign audio without fallback (RSC-032)', async () => {
        const result = await validate('invalid/content/foreign-xhtml-audio-no-fallback-error.epub');
        expectError(result, 'RSC-032');
      });

      it('should report foreign audio source without fallback (RSC-032)', async () => {
        const result = await validate(
          'invalid/content/foreign-xhtml-audio-source-no-fallback-error.epub',
        );
        expectError(result, 'RSC-032');
      });

      it('should report foreign audio without fallback even with flow content (RSC-032)', async () => {
        const result = await validate(
          'invalid/content/foreign-xhtml-audio-no-fallback-with-flow-content-error.epub',
        );
        expectError(result, 'RSC-032');
      });

      it('should allow foreign audio with source fallback', async () => {
        const result = await validate('valid/foreign-xhtml-audio-source-fallback-valid.epub');
        expectNoErrorsOrWarnings(result);
      });

      it('should allow remote foreign audio with remote source fallback', async () => {
        const result = await validate(
          'valid/foreign-xhtml-audio-source-remote-fallback-valid.epub',
        );
        expectNoErrorsOrWarnings(result);
      });

      it('should report foreign audio in video element without fallback (RSC-032)', async () => {
        const result = await validate(
          'invalid/content/foreign-xhtml-audio-in-video-no-fallback-error.epub',
        );
        expectError(result, 'RSC-032');
      });
    });

    describe('Image fallbacks', () => {
      it('should allow foreign img with manifest fallback', async () => {
        const result = await validate('valid/foreign-xhtml-img-manifest-fallback-valid.epub');
        expectNoErrorsOrWarnings(result);
      });

      it('should allow foreign img srcset with manifest fallback', async () => {
        const result = await validate(
          'valid/foreign-xhtml-img-srcset-manifest-fallback-valid.epub',
        );
        expectNoErrorsOrWarnings(result);
      });

      it('should report foreign img src without manifest fallback (RSC-032)', async () => {
        const result = await validate(
          'invalid/content/foreign-xhtml-img-src-no-manifest-fallback-error.epub',
        );
        expectError(result, 'RSC-032');
      });

      it('should report foreign resource in picture img src (MED-003)', async () => {
        const result = await validate('invalid/content/foreign-xhtml-picture-img-src-error.epub');
        expectError(result, 'MED-003');
      });

      it('should report foreign resource in picture img srcset (MED-003)', async () => {
        const result = await validate(
          'invalid/content/foreign-xhtml-picture-img-srcset-error.epub',
        );
        expectError(result, 'MED-003');
      });

      it('should allow picture source with type attribute for foreign resource', async () => {
        const result = await validate('valid/foreign-xhtml-picture-source-with-type-valid.epub');
        expectNoErrorsOrWarnings(result);
      });

      it('should report picture source without type for foreign resource (MED-007)', async () => {
        const result = await validate(
          'invalid/content/foreign-xhtml-picture-source-no-type-error.epub',
        );
        expectError(result, 'MED-007');
      });
    });

    describe('Embed fallbacks', () => {
      it('should allow foreign embed with manifest fallback', async () => {
        const result = await validate('valid/foreign-xhtml-embed-fallback-valid.epub');
        expectNoErrorsOrWarnings(result);
      });

      it('should report foreign embed without fallback (RSC-032)', async () => {
        const result = await validate('invalid/content/foreign-xhtml-embed-no-fallback-error.epub');
        expectError(result, 'RSC-032');
      });
    });

    describe('Other element fallbacks', () => {
      it('should report foreign input image without fallback (RSC-032)', async () => {
        const result = await validate(
          'invalid/content/foreign-xhtml-input-image-no-fallback-error.epub',
        );
        expectError(result, 'RSC-032');
      });

      it('should allow foreign video poster with manifest fallback', async () => {
        const result = await validate('valid/foreign-xhtml-video-poster-fallback-valid.epub');
        expectNoErrorsOrWarnings(result);
      });

      it('should report foreign video poster without fallback (RSC-032)', async () => {
        const result = await validate(
          'invalid/content/foreign-xhtml-video-poster-no-fallback-error.epub',
        );
        expectError(result, 'RSC-032');
      });

      it('should report foreign MathML altimg without fallback (RSC-032)', async () => {
        const result = await validate(
          'invalid/content/foreign-xhtml-math-altimg-no-fallback-error.epub',
        );
        expectError(result, 'RSC-032');
      });
    });

    describe('Object fallbacks', () => {
      it('should allow foreign object with intrinsic fallback', async () => {
        const result = await validate('valid/foreign-xhtml-object-intrinsic-fallback-valid.epub');
        expectNoErrorsOrWarnings(result);
      });

      it('should report foreign object without fallback (RSC-032)', async () => {
        const result = await validate(
          'invalid/content/foreign-xhtml-object-no-fallback-error.epub',
        );
        expectError(result, 'RSC-032');
      });
    });

    describe('Script data block', () => {
      it('should allow foreign script data block without fallback', async () => {
        const result = await validate('valid/foreign-xhtml-script-datablock-valid.epub');
        expectNoErrorsOrWarnings(result);
      });
    });
  });

  // ==========================================================================
  // 3.4 Exempt Resources
  // ==========================================================================
  describe('Exempt Resources', () => {
    it('should allow foreign font media types without fallbacks', async () => {
      const result = await validate('valid/foreign-exempt-font-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should allow foreign linked resources without fallbacks', async () => {
      const result = await validate('valid/foreign-exempt-xhtml-link-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should allow XPGT stylesheets without fallbacks', async () => {
      const result = await validate('valid/foreign-exempt-xhtml-link-xpgt-no-fallback-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should allow XPGT stylesheet with manifest fallback', async () => {
      const result = await validate(
        'valid/foreign-exempt-xhtml-link-xpgt-manifest-fallback-valid.epub',
      );
      expectNoErrorsOrWarnings(result);
    });

    it('should allow foreign text tracks without fallbacks', async () => {
      const result = await validate('valid/foreign-exempt-xhtml-track-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should allow foreign video without fallback', async () => {
      const result = await validate('valid/foreign-exempt-xhtml-video-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should allow foreign video in img element without fallback', async () => {
      const result = await validate('valid/foreign-exempt-xhtml-video-in-img-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should allow unreferenced foreign resources without fallbacks', async () => {
      const result = await validate('valid/foreign-exempt-unused-valid.epub');
      expectNoErrorsOrWarnings(result);
    });
  });

  // ==========================================================================
  // 3.5 Resource Fallbacks
  // ==========================================================================
  describe('Manifest Fallback Chains', () => {
    it('should allow valid manifest fallback chain (waterfall)', async () => {
      const result = await validate('valid/fallback-chain-waterfall-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should allow valid manifest fallback chain (n-to-1)', async () => {
      const result = await validate('valid/fallback-chain-n-to-1-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should report circular manifest fallback chain (OPF-045)', async () => {
      const result = await validate('invalid/content/fallback-chain-circular-error.epub');
      expectError(result, 'OPF-045');
    });

    it('should allow manifest fallback to XHTML content document', async () => {
      const result = await validate('valid/fallback-to-xhtml-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should allow manifest fallback to SVG content document', async () => {
      const result = await validate('valid/fallback-to-svg-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should allow valid manifest fallback chain (reversed document order)', async () => {
      const result = await validate('valid/fallback-chain-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should report missing manifest fallback for spine item (OPF-043)', async () => {
      const result = await validate('invalid/content/fallback-missing-error.epub');
      expectError(result, 'OPF-043');
    });
  });

  // ==========================================================================
  // 3.6 Resource Locations (Remote Resources)
  // ==========================================================================
  describe('Remote Resources', () => {
    it('should allow remote audio resources', async () => {
      const result = await validate('valid/resources-remote-audio-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should allow remote audio in object element', async () => {
      const result = await validate('valid/resources-remote-audio-object-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should allow remote audio sources', async () => {
      const result = await validate('valid/resources-remote-audio-sources-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should allow remote video resources', async () => {
      const result = await validate('valid/resources-remote-video-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should allow remote fonts', async () => {
      const result = await validate('valid/resources-remote-font-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should allow remote SVG fonts', async () => {
      const result = await validate('valid/resources-remote-font-svg-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should allow remote fonts in CSS @font-face', async () => {
      const result = await validate('valid/resources-remote-font-in-css-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should allow remote fonts in SVG font-face-uri', async () => {
      const result = await validate('valid/resources-remote-font-in-svg-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should report remote image (RSC-006)', async () => {
      const result = await validate('invalid/content/resources-remote-img-error.epub');
      expectError(result, 'RSC-006');
    });

    it('should report remote undeclared image (RSC-006)', async () => {
      const result = await validate('invalid/content/resources-remote-img-undeclared-error.epub');
      expectError(result, 'RSC-006');
    });

    it('should report remote image in script context (RSC-006)', async () => {
      const result = await validate('invalid/content/resources-remote-img-in-script-error.epub');
      expectError(result, 'RSC-006');
    });

    it('should report remote iframe (RSC-006)', async () => {
      const result = await validate('invalid/content/resources-remote-iframe-error.epub');
      expectError(result, 'RSC-006');
    });

    it('should report remote undeclared iframe (RSC-006)', async () => {
      const result = await validate(
        'invalid/content/resources-remote-iframe-undeclared-error.epub',
      );
      expectError(result, 'RSC-006');
    });

    it('should report remote SVG font used as img (RSC-006)', async () => {
      const result = await validate(
        'invalid/content/resources-remote-font-svg-also-used-as-img-error.epub',
      );
      expectError(result, 'RSC-006');
    });

    it('should report remote undeclared object (RSC-006)', async () => {
      const result = await validate(
        'invalid/content/resources-remote-object-undeclared-error.epub',
      );
      expectError(result, 'RSC-006');
    });

    it('should report remote SVG content document (RSC-006)', async () => {
      const result = await validate('invalid/content/resources-remote-svg-contentdoc-error.epub');
      expectError(result, 'RSC-006');
    });

    it('should report remote spine item (RSC-006)', async () => {
      const result = await validate('invalid/content/resources-remote-spine-item-error.epub');
      expectError(result, 'RSC-006');
    });

    it('should report remote stylesheet (RSC-006)', async () => {
      const result = await validate('invalid/content/resources-remote-stylesheet-error.epub');
      expectError(result, 'RSC-006');
    });

    it('should report remote stylesheet in SVG XML PI (RSC-006)', async () => {
      const result = await validate(
        'invalid/content/resources-remote-stylesheet-svg-xmlpi-error.epub',
      );
      expectError(result, 'RSC-006');
    });

    it('should report remote stylesheet in SVG import (RSC-006)', async () => {
      const result = await validate(
        'invalid/content/resources-remote-stylesheet-svg-import-error.epub',
      );
      expectError(result, 'RSC-006');
    });

    it('should report remote script (RSC-006)', async () => {
      const result = await validate('invalid/content/resources-remote-script-error.epub');
      expectError(result, 'RSC-006');
    });

    it('should warn about non-HTTPS remote resources (RSC-031)', async () => {
      const result = await validate('warnings/resources-remote-not-https-warning.epub');
      expectWarning(result, 'RSC-031');
    });

    it('should allow mailto URLs', async () => {
      const result = await validate('valid/mailto-url-valid.epub');
      expectNoErrorsOrWarnings(result);
    });
  });

  // ==========================================================================
  // 3.7 Data URLs
  // ==========================================================================
  describe('Data URLs', () => {
    it('should allow data URL for CMT resource in img element', async () => {
      const result = await validate('valid/data-url-in-html-img-cmt-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should allow data URL for exempt resource in link element', async () => {
      const result = await validate('valid/data-url-in-html-link-exempt-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should allow data URL for foreign resource with intrinsic fallback', async () => {
      const result = await validate(
        'valid/data-url-in-html-img-foreign-intrinsic-fallback-valid.epub',
      );
      expectNoErrorsOrWarnings(result);
    });

    it('should report data URL for foreign resource without fallback (RSC-032)', async () => {
      const result = await validate(
        'invalid/content/data-url-in-html-img-foreign-no-fallback-error.epub',
      );
      expectError(result, 'RSC-032');
    });

    it('should allow data URL with unescaped query-like component', async () => {
      const result = await validate('valid/data-url-with-unescaped-query-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should report data URL in HTML anchor href (RSC-029)', async () => {
      const result = await validate('invalid/content/data-url-in-html-a-href-error.epub');
      expectError(result, 'RSC-029');
    });

    it('should report data URL in SVG anchor href (RSC-029)', async () => {
      const result = await validate('invalid/content/data-url-in-svg-a-href-error.epub');
      expectError(result, 'RSC-029');
    });

    it('should report data URL in HTML area href (RSC-029)', async () => {
      const result = await validate('invalid/content/data-url-in-html-area-href-error.epub');
      expectError(result, 'RSC-029');
    });

    it('should report data URL in manifest item href (RSC-029)', async () => {
      const result = await validate('invalid/content/data-url-in-manifest-item-error.epub');
      expectError(result, 'RSC-029');
    });

    it('should report data URL in manifest item in spine (RSC-029)', async () => {
      const result = await validate(
        'invalid/content/data-url-in-manifest-item-in-spine-error.epub',
      );
      expectError(result, 'RSC-029');
    });

    it('should report data URL in package link href (RSC-029)', async () => {
      const result = await validate('invalid/content/data-url-in-package-link-error.epub');
      expectError(result, 'RSC-029');
    });
  });

  // ==========================================================================
  // 3.8 File URLs
  // ==========================================================================
  describe('File URLs', () => {
    it('should report file URL in CSS (RSC-030)', async () => {
      const result = await validate('invalid/content/file-url-in-css-error.epub');
      expectError(result, 'RSC-030');
    });

    it('should report file URL in XHTML content (RSC-030)', async () => {
      const result = await validate('invalid/content/file-url-in-xhtml-content-error.epub');
      expectError(result, 'RSC-030');
    });

    it('should report file URL in SVG content (RSC-030)', async () => {
      const result = await validate('invalid/content/file-url-in-svg-content-error.epub');
      expectError(result, 'RSC-030');
    });

    it('should report file URL in package document link (RSC-030)', async () => {
      const result = await validate('invalid/content/file-url-in-package-document-error.epub');
      expectError(result, 'RSC-030');
    });
  });

  // ==========================================================================
  // 3.9 XML Conformance
  // ==========================================================================
  describe('XML Conformance', () => {
    it('should allow attribute values with leading/trailing whitespace', async () => {
      const result = await validate('valid/conformance-xml-id-leading-trailing-spaces-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should allow UTF-8 encoding declared in XML declaration', async () => {
      const result = await validate('valid/xml-encoding-utf8-declared-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should allow UTF-8 encoding with BOM', async () => {
      const result = await validate('valid/xml-encoding-utf8-BOM-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it('should allow UTF-8 encoding with no XML declaration', async () => {
      const result = await validate('valid/xml-encoding-utf8-no-declaration-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    it.skip('should report malformed XML (RSC-016)', async () => {
      // OPF parser reports OPF-002/RSC-005 instead of RSC-016 for XML well-formedness errors
      const result = await validate('invalid/content/conformance-xml-malformed-error.epub');
      expectFatal(result, 'RSC-016');
    });

    it.skip('should report undeclared namespace prefix (RSC-016)', async () => {
      // OPF parser reports RSC-005 instead of RSC-016 for undeclared namespace prefix
      const result = await validate(
        'invalid/content/conformance-xml-undeclared-namespace-error.epub',
      );
      expectFatal(result, 'RSC-016');
    });
  });

  // ==========================================================================
  // Other: MIME type mismatch
  // ==========================================================================
  describe('MIME Type Mismatch', () => {
    it('should report object type mismatch (OPF-013)', async () => {
      const result = await validate('warnings/type-mismatch-in-object-warning.epub');
      expectWarning(result, 'OPF-013');
    });

    it('should report picture source type mismatch (OPF-013)', async () => {
      const result = await validate('warnings/type-mismatch-in-picture-source-warning.epub');
      expectWarning(result, 'OPF-013');
    });

    it('should report audio source type mismatch (OPF-013)', async () => {
      const result = await validate('warnings/type-mismatch-in-audio-warning.epub');
      expectWarning(result, 'OPF-013');
    });

    it('should report embed type mismatch (OPF-013)', async () => {
      const result = await validate('warnings/type-mismatch-in-embed-warning.epub');
      expectWarning(result, 'OPF-013');
    });
  });

  // ==========================================================================
  // Skipped: XML Encoding Detection (RSC-027/RSC-028)
  // ==========================================================================
  describe('XML Encoding Detection', () => {
    it.skip('should warn about UTF-16 encoding declaration (RSC-027)', async () => {
      // Encoding detection not implemented
      const result = await validate('valid/xml-encoding-utf16-declared-warning.epub');
      expectWarning(result, 'RSC-027');
    });

    it.skip('should warn about UTF-16 BOM without declaration (RSC-027)', async () => {
      // Encoding detection not implemented
      const result = await validate('valid/xml-encoding-utf16-BOM-no-declaration-warning.epub');
      expectWarning(result, 'RSC-027');
    });

    it.skip('should warn about UTF-16 BOM with UTF-8 declaration (RSC-027 + RSC-016)', async () => {
      // Encoding detection not implemented
      const result = await validate(
        'invalid/content/xml-encoding-utf16-BOM-and-utf8-declaration-warning.epub',
      );
      expectWarning(result, 'RSC-027');
    });

    it.skip('should report Latin-1 encoding declaration (RSC-028)', async () => {
      // Encoding detection not implemented
      const result = await validate('invalid/content/xml-encoding-latin1-declaration-error.epub');
      expectError(result, 'RSC-028');
    });

    it.skip('should report UTF-32 BOM (RSC-028)', async () => {
      // Encoding detection not implemented
      const result = await validate('invalid/content/xml-encoding-utf32-BOM-error.epub');
      expectError(result, 'RSC-028');
    });

    it.skip('should report unknown encoding declaration (RSC-028 + RSC-016)', async () => {
      // Encoding detection not implemented
      const result = await validate('invalid/content/xml-encoding-unknown-declared-error.epub');
      expectError(result, 'RSC-028');
    });
  });

  // ==========================================================================
  // Skipped: Single-file validation mode
  // ==========================================================================
  describe('Single-file Validation Mode', () => {
    it.skip('should report remote XHTML resource (RSC-006)', async () => {
      // Single-file validation mode not supported
      const result = await validate('invalid/content/resources-remote-xhtml-error.epub');
      expectError(result, 'RSC-006');
    });

    it.skip('should allow remote SVG font in single-file mode', async () => {
      // Single-file validation mode not supported
      const result = await validate('valid/resources-remote-svg-font-valid.epub');
      expectNoErrorsOrWarnings(result);
    });
  });
});

/**
 * Helper: validate an EPUB fixture
 */
async function validate(path: string) {
  const fs = await import('node:fs');
  const pathModule = await import('node:path');
  const url = await import('node:url');

  const currentDir = url.fileURLToPath(new URL('.', import.meta.url));
  const filePath = pathModule.resolve(currentDir, '../fixtures', path);

  const data = new Uint8Array(fs.readFileSync(filePath));
  return EpubCheck.validate(data);
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
    `Expected error ${errorId} to be reported. Got: ${JSON.stringify(result.messages.map((m) => ({ id: m.id, severity: m.severity })))}`,
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
 * Assert that a specific fatal error ID is present in the result
 */
function expectFatal(
  result: Awaited<ReturnType<typeof EpubCheck.validate>>,
  errorId: string,
): void {
  const hasFatal = result.messages.some((m) => m.id === errorId && m.severity === 'fatal');
  expect(
    hasFatal,
    `Expected fatal ${errorId} to be reported. Got: ${JSON.stringify(result.messages.map((m) => ({ id: m.id, severity: m.severity })))}`,
  ).toBe(true);
}

/**
 * Assert that a specific usage ID is present in the result
 */
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
