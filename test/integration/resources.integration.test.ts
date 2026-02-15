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

      // Skip: Corrupt image detection (MED-004) and magic number checks (PKG-021) not implemented
      it.skip('should report corrupt images (MED-004)', async () => {
        const result = await validate('invalid/content/resources-cmt-image-corrupt-error.epub');
        expectError(result, 'MED-004');
      });

      // Skip: Image magic number validation (OPF-029) not implemented
      it.skip('should report JPEG declared as GIF (OPF-029)', async () => {
        const result = await validate(
          'invalid/content/resources-cmt-image-jpeg-declared-as-gif-error.epub',
        );
        expectError(result, 'OPF-029');
      });

      // Skip: File extension validation (PKG-022) not implemented
      it.skip('should report wrong image extension (PKG-022)', async () => {
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

      // Skip: MED-003 picture element validation not implemented
      it.skip('should report foreign resource in picture img src (MED-003)', async () => {
        const result = await validate('invalid/content/foreign-xhtml-picture-img-src-error.epub');
        expectError(result, 'MED-003');
      });

      // Skip: MED-003 picture element validation not implemented
      it.skip('should report foreign resource in picture img srcset (MED-003)', async () => {
        const result = await validate(
          'invalid/content/foreign-xhtml-picture-img-srcset-error.epub',
        );
        expectError(result, 'MED-003');
      });

      it('should allow picture source with type attribute for foreign resource', async () => {
        const result = await validate('valid/foreign-xhtml-picture-source-with-type-valid.epub');
        expectNoErrorsOrWarnings(result);
      });

      // Skip: MED-007 picture source type check not implemented
      it.skip('should report picture source without type for foreign resource (MED-007)', async () => {
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

    // Skip: Remote SVG font references not tracked as font usage
    it.skip('should allow remote SVG fonts', async () => {
      const result = await validate('valid/resources-remote-font-svg-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    // Skip: CSS @font-face remote font references not tracked
    it.skip('should allow remote fonts in CSS @font-face', async () => {
      const result = await validate('valid/resources-remote-font-in-css-valid.epub');
      expectNoErrorsOrWarnings(result);
    });

    // Skip: SVG font-face-uri remote font references not tracked
    it.skip('should allow remote fonts in SVG font-face-uri', async () => {
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

    // Skip: SVG xml-stylesheet processing instruction not parsed
    it.skip('should report remote stylesheet in SVG XML PI (RSC-006)', async () => {
      const result = await validate(
        'invalid/content/resources-remote-stylesheet-svg-xmlpi-error.epub',
      );
      expectError(result, 'RSC-006');
    });

    // Skip: SVG @import in style element not parsed
    it.skip('should report remote stylesheet in SVG import (RSC-006)', async () => {
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
  });

  // ==========================================================================
  // 3.8 File URLs
  // ==========================================================================
  describe('File URLs', () => {
    it('should report file URL in CSS (RSC-030)', async () => {
      const result = await validate('invalid/content/file-url-in-css-error.epub');
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
  });

  // ==========================================================================
  // Other: MIME type mismatch
  // ==========================================================================
  describe('MIME Type Mismatch', () => {
    // Skip: OPF-013 type mismatch validation not implemented
    it.skip('should report object type mismatch (OPF-013)', async () => {
      const result = await validate('warnings/type-mismatch-in-object-warning.epub');
      expectWarning(result, 'OPF-013');
    });

    // Skip: OPF-013 type mismatch validation not implemented
    it.skip('should report picture source type mismatch (OPF-013)', async () => {
      const result = await validate('warnings/type-mismatch-in-picture-source-warning.epub');
      expectWarning(result, 'OPF-013');
    });

    // Skip: OPF-013 type mismatch validation not implemented
    it.skip('should report audio source type mismatch (OPF-013)', async () => {
      const result = await validate('warnings/type-mismatch-in-audio-warning.epub');
      expectWarning(result, 'OPF-013');
    });

    // Skip: OPF-013 type mismatch validation not implemented
    it.skip('should report embed type mismatch (OPF-013)', async () => {
      const result = await validate('warnings/type-mismatch-in-embed-warning.epub');
      expectWarning(result, 'OPF-013');
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
