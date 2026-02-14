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

  // ============================================================
  // Tests ported from Java EPUBCheck package-document.feature
  // ============================================================

  describe('Shared attributes (§5.3)', () => {
    it('dir attribute value can be auto', async () => {
      const data = await loadEpub('valid/attr-dir-auto-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    // Skip: OPF-098 link-to-package-document-id check not yet implemented
    it.skip('link target must not reference a manifest ID (OPF-098)', async () => {
      const data = await loadEpub('invalid/opf/link-to-package-document-id-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'OPF-098');
    });

    // Skip: OPF Schematron id-with-spaces validation produces false OPF-049 errors
    it.skip('id attributes can have leading or trailing space', async () => {
      const data = await loadEpub('valid/attr-id-with-spaces-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    // Skip: OPF Schematron duplicate id detection not yet implemented (RSC-005)
    it.skip('id attributes must be unique (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/attr-id-duplicate-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    // Skip: OPF Schematron duplicate id detection not yet implemented (RSC-005)
    it.skip('id attributes must be unique after whitespace normalization (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/attr-id-duplicate-with-spaces-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    // Skip: OPF Schematron refines validation not yet implemented
    it.skip('refines attribute must be a relative URL (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/metadata-refines-not-relative-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    // Skip: OPF Schematron refines validation not yet implemented
    it.skip('refines attribute should use a fragment ID (RSC-017)', async () => {
      const data = await loadEpub('warnings/metadata-refines-not-a-fragment-warning.epub');
      const result = await EpubCheck.validate(data);
      expectWarning(result, 'RSC-017');
    });

    // Skip: OPF Schematron refines validation not yet implemented
    it.skip('refines fragment ID must target an existing ID (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/metadata-refines-unknown-id-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    // Skip: OPF-065 refines cycle detection not yet implemented
    it.skip('refines cycles are not allowed (OPF-065)', async () => {
      const data = await loadEpub('invalid/opf/metadata-refines-cycle-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'OPF-065');
    });

    it('xml:lang attribute can be empty', async () => {
      const data = await loadEpub('valid/attr-lang-empty-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    // Skip: OPF-092 language tag well-formedness check not yet implemented
    it.skip('xml:lang must not have leading/trailing whitespace (OPF-092)', async () => {
      const data = await loadEpub('invalid/opf/attr-lang-whitespace-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'OPF-092');
    });

    // Skip: OPF-092 language tag well-formedness check not yet implemented
    it.skip('xml:lang must be well-formed (OPF-092)', async () => {
      const data = await loadEpub('invalid/opf/attr-lang-not-well-formed-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'OPF-092');
    });

    it('three-character language codes are allowed', async () => {
      const data = await loadEpub('valid/attr-lang-three-char-code-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Package element (§5.4)', () => {
    // Skip: OPF Schematron unique-identifier target check not producing RSC-005
    it.skip('unique-identifier must be a known ID (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/package-unique-identifier-unknown-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    // Skip: OPF Schematron unique-identifier target check not producing RSC-005
    it.skip('unique-identifier must point to dc:identifier (RSC-005)', async () => {
      const data = await loadEpub(
        'invalid/opf/package-unique-identifier-not-targeting-identifier-error.epub',
      );
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('package must have metadata child element (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/package-no-metadata-element-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('metadata must come before manifest (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/package-manifest-before-metadata-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });
  });

  describe('Metadata values (§5.5.2)', () => {
    it('dc:identifier must not be empty (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/metadata-identifier-empty-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('dc:language must not be empty (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/metadata-language-empty-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('dc:title must not be empty (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/metadata-title-empty-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('metadata value must be defined (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/metadata-meta-value-empty-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });
  });

  describe('Dublin Core required elements (§5.5.3)', () => {
    // Skip: OPF-085 UUID format validation not yet implemented
    it.skip('dc:identifier starting with urn:uuid should be a valid UUID (OPF-085)', async () => {
      const data = await loadEpub('warnings/metadata-identifier-uuid-invalid-warning.epub');
      const result = await EpubCheck.validate(data);
      expectWarning(result, 'OPF-085');
    });

    it('dc:title must be specified (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/metadata-title-missing-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('dc:language must be well-formed (OPF-092)', async () => {
      const data = await loadEpub('invalid/opf/metadata-language-not-well-formed-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'OPF-092');
    });
  });

  describe('Dublin Core optional elements (§5.5.4)', () => {
    it('dc:source valid values are allowed', async () => {
      const data = await loadEpub('valid/metadata-source-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    it('multiple dc:date elements are not allowed (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/metadata-date-multiple-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('dc:date can be a single year', async () => {
      const data = await loadEpub('valid/metadata-date-single-year-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    it('dc:date value can have leading/trailing whitespace', async () => {
      const data = await loadEpub('valid/metadata-date-with-whitespace-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    it('dc:date with invalid ISO 8601 syntax is reported (OPF-053)', async () => {
      const data = await loadEpub('warnings/metadata-date-iso-syntax-error-warning.epub');
      const result = await EpubCheck.validate(data);
      expectWarning(result, 'OPF-053');
    });

    it('dc:date with unknown format is reported (OPF-053)', async () => {
      const data = await loadEpub('warnings/metadata-date-unknown-format-warning.epub');
      const result = await EpubCheck.validate(data);
      expectWarning(result, 'OPF-053');
    });

    it('dc:type valid values are allowed', async () => {
      const data = await loadEpub('valid/metadata-type-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Meta element (§5.5.5)', () => {
    it('metadata property name must be defined (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/metadata-meta-property-empty-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    // Skip: OPF-025 property list validation not yet implemented
    it.skip('metadata property name must not be a list (OPF-025)', async () => {
      const data = await loadEpub('invalid/opf/metadata-meta-property-list-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'OPF-025');
    });

    // Skip: OPF-026 malformed property validation not yet implemented
    it.skip('metadata property name must be well-formed (OPF-026)', async () => {
      const data = await loadEpub('invalid/opf/metadata-meta-property-malformed-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'OPF-026');
    });

    it('scheme can be used to identify value system', async () => {
      const data = await loadEpub('valid/metadata-meta-scheme-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    // Skip: OPF-025 scheme list validation not yet implemented
    it.skip('scheme must not be a list (OPF-025)', async () => {
      const data = await loadEpub('invalid/opf/metadata-meta-scheme-list-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'OPF-025');
    });

    // Skip: OPF-027 unknown scheme validation not yet implemented
    it.skip('scheme must not be an unknown value with no prefix (OPF-027)', async () => {
      const data = await loadEpub('invalid/opf/metadata-meta-scheme-unknown-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'OPF-027');
    });
  });

  describe('Last modified date (§5.5.6)', () => {
    // Skip: OPF Schematron modified-missing check not yet implemented (produces OPF-054 instead)
    it.skip('dcterms:modified must be defined (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/metadata-modified-missing-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    // Skip: OPF Schematron modified-syntax check not yet implemented
    it.skip('dcterms:modified must be CCYY-MM-DDThh:mm:ssZ format (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/metadata-modified-syntax-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });
  });

  describe('Link element (§5.5.7)', () => {
    it('link rel can have multiple properties', async () => {
      const data = await loadEpub('valid/link-rel-multiple-properties-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    it('link properties must not be empty (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/link-rel-record-properties-empty-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    // Skip: OPF-027 link properties validation not yet implemented
    it.skip('link with unknown properties value is reported (OPF-027)', async () => {
      const data = await loadEpub('invalid/opf/link-rel-record-properties-undefined-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'OPF-027');
    });

    it('link hreflang attribute is valid', async () => {
      const data = await loadEpub('valid/link-hreflang-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    it('link hreflang can be empty', async () => {
      const data = await loadEpub('valid/link-hreflang-empty-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    // Skip: OPF-092 hreflang well-formedness check not yet implemented
    it.skip('link hreflang must not have leading/trailing whitespace (OPF-092)', async () => {
      const data = await loadEpub('invalid/opf/link-hreflang-whitespace-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'OPF-092');
    });

    // Skip: OPF-092 hreflang well-formedness check not yet implemented
    it.skip('link hreflang must be well-formed (OPF-092)', async () => {
      const data = await loadEpub('invalid/opf/link-hreflang-not-well-formed-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'OPF-092');
    });

    it('link can target a spine item', async () => {
      const data = await loadEpub('valid/link-to-spine-item-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Item element (§5.6.2)', () => {
    it('manifest item must declare a media type (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/item-media-type-missing-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    // Skip: RSC-020 unencoded spaces in OPF item href not yet implemented
    it.skip('item URLs must be properly encoded (RSC-020)', async () => {
      const data = await loadEpub('invalid/opf/item-href-contains-spaces-unencoded-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-020');
    });

    it('item URLs must not have a fragment identifier (OPF-091)', async () => {
      const data = await loadEpub('invalid/opf/item-href-with-fragment-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'OPF-091');
    });

    it('two manifest items cannot represent the same resource (OPF-074)', async () => {
      const data = await loadEpub('invalid/opf/item-duplicate-resource-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'OPF-074');
    });

    it('fallback-style attribute is reported (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/fallback-style-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });
  });

  describe('Resource properties (§5.6.2.1)', () => {
    it('unknown item property is reported (OPF-027)', async () => {
      const data = await loadEpub('invalid/opf/item-property-unknown-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'OPF-027');
    });

    it('cover-image property is allowed on WebP images', async () => {
      const data = await loadEpub('valid/item-property-cover-image-webp-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    // Skip: OPF Schematron cover-image multiplicity check not yet implemented
    it.skip('cover-image property must occur at most once (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/item-property-cover-image-multiple-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    // Skip: OPF-012 cover-image type check not yet implemented
    it.skip('cover-image property must only be used on images (OPF-012)', async () => {
      const data = await loadEpub('invalid/opf/item-property-cover-image-wrongtype-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'OPF-012');
    });

    it('one item must have the nav property (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/item-nav-missing-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    // Skip: OPF Schematron nav multiplicity check not yet implemented
    it.skip('at most one item must have the nav property (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/item-nav-multiple-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    // Skip: OPF Schematron nav content-type check not yet implemented
    it.skip('nav property must be on an XHTML Content Document (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/item-nav-not-xhtml-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });
  });

  describe('Bindings element (§5.6.3)', () => {
    // Skip: RSC-017 bindings deprecated check not yet implemented
    it.skip('bindings element is reported as deprecated (RSC-017)', async () => {
      const data = await loadEpub('warnings/bindings-deprecated-warning.epub');
      const result = await EpubCheck.validate(data);
      expectWarning(result, 'RSC-017');
    });
  });

  describe('Spine element (§5.7)', () => {
    it('missing spine is reported (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/spine-missing-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('empty spine is reported (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/spine-empty-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('SVG Content Document is allowed in spine', async () => {
      const data = await loadEpub('valid/spine-item-svg-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Collections (§5.8)', () => {
    // Skip: Collection validation produces OPF-071 instead of passing clean
    it.skip('collection role can be an absolute URL', async () => {
      const data = await loadEpub('valid/collection-role-url-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    // Skip: Collection validation produces OPF-071 instead of expected OPF-070
    it.skip('collection role must not be an invalid URL (OPF-070)', async () => {
      const data = await loadEpub('warnings/collection-role-url-invalid-error.epub');
      const result = await EpubCheck.validate(data);
      expectWarning(result, 'OPF-070');
    });

    // Skip: Collection validation produces OPF-071 instead of expected RSC-005
    it.skip('manifest collection must be child of another collection (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/collection-role-manifest-toplevel-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });
  });

  describe('Legacy content (§5.9)', () => {
    // Skip: OPF Schematron NCX toc attribute check not yet implemented
    it.skip('NCX toc attribute must be set when NCX is present (RSC-005)', async () => {
      const data = await loadEpub('invalid/opf/legacy-ncx-toc-attribute-missing-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('spine toc attribute must point to NCX document (OPF-050)', async () => {
      const data = await loadEpub('invalid/opf/legacy-ncx-toc-attribute-not-ncx-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'OPF-050');
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
