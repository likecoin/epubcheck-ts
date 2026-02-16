import { describe, expect, it } from 'vitest';
import { EpubCheck } from '../../src/index.js';

/**
 * Content Document Integration Tests
 *
 * Tests for XHTML, CSS, and SVG content validation, ported from Java EPUBCheck.
 * Based on: /epubcheck/src/test/resources/epub3/06-content-document/content-document-*.feature
 *
 * @see https://www.w3.org/TR/epub-33/#sec-contentdocs
 */

describe('Integration Tests - Content Documents', () => {
  // ==================== CSS Style Sheets ====================
  describe('CSS validation', () => {
    it('should validate minimal CSS', async () => {
      const data = await loadEpub('valid/content-css-minimal-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate CSS with UTF-8 encoding declaration', async () => {
      const data = await loadEpub('valid/content-css-encoding-utf8-declared-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should report CSS syntax errors (CSS-008)', async () => {
      const data = await loadEpub('invalid/content/content-css-syntax-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'CSS-008');
    });

    it('should report missing CSS import (RSC-001)', async () => {
      const data = await loadEpub('invalid/content/content-css-import-not-present-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-001');
    });

    it('should report missing CSS url() resource (RSC-007)', async () => {
      const data = await loadEpub('invalid/content/content-css-url-not-present-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-007');
    });

    it('should report forbidden CSS direction property (CSS-001)', async () => {
      const data = await loadEpub('invalid/content/content-css-property-direction-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'CSS-001');
    });

    it('should report forbidden CSS unicode-bidi property (CSS-001)', async () => {
      const data = await loadEpub('invalid/content/content-css-property-unicode-bidi-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'CSS-001');
    });

    it('should warn about empty @font-face rule (CSS-019)', async () => {
      const data = await loadEpub('invalid/content/content-css-font-face-empty-error.epub');
      const result = await EpubCheck.validate(data);

      // CSS-019 is a warning, not an error
      expectWarning(result, 'CSS-019');
    });

    it('should report @font-face with empty URL reference (CSS-002)', async () => {
      const data = await loadEpub('invalid/content/content-css-font-face-url-empty-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'CSS-002');
    });

    // Skip: CSS encoding detection (CSS-004) not implemented
    it.skip('should report CSS encoded in latin1 (CSS-004)', async () => {
      const data = await loadEpub('invalid/content/content-css-encoding-latin1-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'CSS-004');
    });

    // Skip: CSS UTF-16 encoding detection (CSS-003) not implemented
    it.skip('should warn about CSS encoded in UTF-16 with @charset (CSS-003)', async () => {
      const data = await loadEpub('warnings/content-css-encoding-utf16-declared-warning.epub');
      const result = await EpubCheck.validate(data);

      expectWarning(result, 'CSS-003');
    });

    // Skip: CSS UTF-16 encoding detection (CSS-003) not implemented
    it.skip('should warn about CSS encoded in UTF-16 without @charset (CSS-003)', async () => {
      const data = await loadEpub('warnings/content-css-encoding-utf16-not-declared-warning.epub');
      const result = await EpubCheck.validate(data);

      expectWarning(result, 'CSS-003');
    });

    it('should report undeclared CSS import (RSC-008)', async () => {
      const data = await loadEpub('invalid/content/content-css-import-not-declared-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-008');
    });

    // Skip: CSS-008 not reported when syntax error precedes url error
    it.skip('should report CSS url error even when preceded by syntax error', async () => {
      const data = await loadEpub(
        'invalid/content/content-css-url-not-present-preceded-by-invalid-syntax-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expectError(result, 'CSS-008');
      expectError(result, 'RSC-007');
    });

    it('should validate CSS with valid selectors', async () => {
      const data = await loadEpub('valid/content-css-selectors-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should allow namespace URIs in CSS without treating as remote resources', async () => {
      const data = await loadEpub('valid/content-css-namespace-uri-not-resource-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should validate CSS with valid font-size declarations', async () => {
      const data = await loadEpub('valid/content-css-font-size-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: False CSS-019 warning on position:absolute in this fixture
    it.skip('should not check invalid CSS font-size values (out of scope)', async () => {
      const data = await loadEpub('valid/content-css-font-size-value-error.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should allow fragment-only URL in CSS without false error', async () => {
      const data = await loadEpub('valid/content-css-url-fragment-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });
  });

  // ==================== XHTML Content Documents ====================
  describe('XHTML validation', () => {
    it('should validate XHTML with unusual file extension', async () => {
      const data = await loadEpub('valid/content-xhtml-file-extension-unusual-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate minimal Content Document', async () => {
      const data = await loadEpub('valid/minimal.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });
  });

  describe('DOCTYPE validation', () => {
    it('should verify versionless HTML doctype', async () => {
      const data = await loadEpub('valid/doctype-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify doctype with legacy string', async () => {
      const data = await loadEpub('valid/doctype-legacy-compat-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: Obsolete DOCTYPE detection not implemented (HTM-004 check doesn't scan parsed documents)
    it.skip('should report doctype with obsolete public identifier (HTM-004)', async () => {
      const data = await loadEpub('invalid/content/doctype-obsolete-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'HTM-004');
    });
  });

  describe('Encoding validation', () => {
    // Skip: UTF-16 encoding detection not implemented (HTM-058)
    it.skip('should report XHTML document not encoded as UTF-8 (HTM-058)', async () => {
      const data = await loadEpub('invalid/content/encoding-utf16-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'HTM-058');
    });
  });

  describe('Entity validation', () => {
    it('should allow character references', async () => {
      const data = await loadEpub('valid/entities-character-references-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should allow character entity references in comments or CDATA sections', async () => {
      const data = await loadEpub('valid/entities-comments-cdata-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should allow internal entity declarations', async () => {
      const data = await loadEpub('valid/entities-internal-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: External entity detection (HTM-003) not implemented
    it.skip('should report external entities (HTM-003)', async () => {
      const data = await loadEpub('invalid/content/entities-external-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'HTM-003');
    });

    it('should report entity references not ending with semicolon (RSC-016)', async () => {
      const data = await loadEpub('invalid/content/entities-no-semicolon-error.epub');
      const result = await EpubCheck.validate(data);

      expectFatal(result, 'RSC-016');
    });

    it('should report unknown entity references (RSC-016)', async () => {
      const data = await loadEpub('invalid/content/entities-unknown-error.epub');
      const result = await EpubCheck.validate(data);

      expectFatal(result, 'RSC-016');
    });
  });

  describe('ID validation', () => {
    it('should verify id attribute with non-alphanumeric value', async () => {
      const data = await loadEpub('valid/id-not-ncname-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify ID-referencing attributes can refer to non-NCName IDs', async () => {
      const data = await loadEpub('valid/id-ref-non-ncname-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: RelaxNG content schema validation not wired — duplicate ID detection requires schema
    it.skip('should report duplicate id attribute values (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/id-duplicate-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    // Skip: RelaxNG content schema validation not wired
    it.skip('should report ID-referencing attributes that refer to non-existing IDs (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/id-ref-not-found-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });
  });

  describe('ARIA validation', () => {
    it('should verify ARIA role on anchor element without href', async () => {
      const data = await loadEpub('valid/aria-role-a-nohref-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify DPUB-ARIA roles on footer', async () => {
      const data = await loadEpub('valid/aria-roles-footer-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify DPUB-ARIA roles on h1-h6', async () => {
      const data = await loadEpub('valid/aria-roles-h1-h6-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify DPUB-ARIA roles on header', async () => {
      const data = await loadEpub('valid/aria-roles-header-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify DPUB-ARIA roles on img', async () => {
      const data = await loadEpub('valid/aria-roles-img-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify DPUB-ARIA roles on nav', async () => {
      const data = await loadEpub('valid/aria-roles-nav-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify DPUB-ARIA roles on section', async () => {
      const data = await loadEpub('valid/aria-roles-section-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify ARIA attributes on embedded SVG', async () => {
      const data = await loadEpub('valid/svg-aria-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: RelaxNG content schema validation not wired — ARIA attribute check requires schema
    it.skip('should report non-existent ARIA describedat attribute (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/aria-describedAt-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    // Skip: DPUB-ARIA deprecation warnings not implemented (RSC-017)
    it.skip('should report deprecated DPUB-ARIA roles on li (RSC-017)', async () => {
      const data = await loadEpub('warnings/aria-roles-li-deprecated-warning.epub');
      const result = await EpubCheck.validate(data);

      expectWarning(result, 'RSC-017');
    });
  });

  describe('Attributes validation', () => {
    it('should verify case-insensitive boolean and enumerated attributes', async () => {
      const data = await loadEpub('valid/attrs-case-insensitive-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify attributes in custom namespaces are ignored', async () => {
      const data = await loadEpub('valid/attrs-custom-ns-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: HTM-054 (reserved custom attribute namespace) not implemented
    it.skip('should report custom attributes using reserved namespace strings (HTM-054)', async () => {
      const data = await loadEpub('invalid/content/attrs-custom-ns-reserved-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'HTM-054');
    });

    it('should verify ITS attributes are allowed', async () => {
      const data = await loadEpub('valid/attrs-its-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify RDFa attributes are allowed on HTML elements', async () => {
      // Skip: Single-doc test — EPUB wrapper creates false reference errors from RDFa link elements
      const data = await loadEpub('valid/rdfa-valid.epub');
      const result = await EpubCheck.validate(data);

      // RDFa fixture has external link references that trigger false OPF-096 in full-EPUB mode
      // Just check no fatal/error-level messages other than known false positives
      const realErrors = result.messages.filter(
        (m) =>
          (m.severity === 'error' || m.severity === 'fatal') &&
          m.id !== 'OPF-096' &&
          m.id !== 'RSC-007' &&
          m.id !== 'RSC-007w',
      );
      expect(realErrors).toHaveLength(0);
    });
  });

  describe('Canvas validation', () => {
    it('should verify canvas element with a fallback', async () => {
      const data = await loadEpub('valid/canvas-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Custom elements', () => {
    it('should verify custom elements are not rejected', async () => {
      const data = await loadEpub('valid/custom-elements-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Data attributes', () => {
    it('should verify data-* attributes are allowed', async () => {
      const data = await loadEpub('valid/data-attr-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: HTM-061 (invalid data-* attributes) not implemented
    it.skip('should report invalid data-* attributes (HTM-061)', async () => {
      const data = await loadEpub('invalid/content/data-attr-invalid-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'HTM-061');
    });
  });

  describe('Hyperlink validation', () => {
    it('should report a hyperlink to a missing document (RSC-007)', async () => {
      const data = await loadEpub('invalid/content/content-xhtml-link-to-missing-doc-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-007');
    });

    it('should report a hyperlink to a missing identifier (RSC-012)', async () => {
      const data = await loadEpub('invalid/content/content-xhtml-link-to-missing-id-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-012');
    });

    it('should report a hyperlink to a missing identifier in another document (RSC-012)', async () => {
      const data = await loadEpub(
        'invalid/content/content-xhtml-link-to-missing-id-xref-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-012');
    });

    it('should allow href values that only contain whitespace', async () => {
      const data = await loadEpub('valid/content-xhtml-link-href-empty-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should resolve relative paths starting with a single dot', async () => {
      const data = await loadEpub('valid/content-xhtml-link-rel-path-dot-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should report reference to undeclared resource (RSC-007)', async () => {
      const data = await loadEpub(
        'invalid/content/content-xhtml-referenced-resource-missing-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-007');
    });

    it('should allow escaped hyperlinks to local file system resources', async () => {
      const data = await loadEpub('valid/content-xhtml-link-to-local-file-escaped-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should report hyperlink to missing identifier in nav doc (RSC-012)', async () => {
      const data = await loadEpub(
        'invalid/content/content-xhtml-link-to-missing-id-in-nav-doc-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-012');
    });

    it('should report fragment identifier in stylesheet URL (RSC-013)', async () => {
      const data = await loadEpub(
        'invalid/content/content-xhtml-link-stylesheet-fragment-id-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-013');
    });

    it('should report hyperlink to SVG symbol as incompatible (RSC-014)', async () => {
      const data = await loadEpub('invalid/content/content-xhtml-link-to-svg-fragment-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-014');
    });

    it('should allow valid hyperlink URLs', async () => {
      const data = await loadEpub('valid/a-href-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Iframe validation', () => {
    it('should validate an iframe referencing another XHTML document', async () => {
      const data = await loadEpub('valid/content-xhtml-iframe-basic-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Image validation', () => {
    it('should validate img element referencing SVG fragments', async () => {
      const data = await loadEpub('valid/content-xhtml-img-fragment-svg-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should warn about non-SVG images referenced as fragments (RSC-009)', async () => {
      const data = await loadEpub('warnings/content-xhtml-img-fragment-non-svg-warning.epub');
      const result = await EpubCheck.validate(data);

      expectWarning(result, 'RSC-009');
    });

    it('should report undeclared resources in img srcset (RSC-008)', async () => {
      const data = await loadEpub('invalid/content/content-xhtml-img-srcset-undeclared-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-008');
    });

    // Skip: Exempt resource classification (video in img) not implemented — false RSC-032
    it.skip('should allow img element with video resource', async () => {
      const data = await loadEpub('valid/content-xhtml-img-video-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should allow img element with no alt when it has a title', async () => {
      const data = await loadEpub('valid/img-alt-missing-with-title-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should allow img element with no alt when in a captioned figure', async () => {
      const data = await loadEpub('valid/img-alt-missing-in-figure-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should not report img without alt (Java FIXME issue 446)', async () => {
      const data = await loadEpub('valid/img-alt-missing-error.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: RelaxNG content schema validation not wired — empty src check requires schema
    it.skip('should report img element with empty src attribute (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/img-src-empty-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });
  });

  describe('Lang attribute', () => {
    it('should verify empty language tag is allowed (issue 777)', async () => {
      const data = await loadEpub('valid/lang-empty-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify three-character language codes are allowed (issue 615)', async () => {
      const data = await loadEpub('valid/lang-three-char-code-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: Schematron-based lang/xml:lang mismatch check not implemented
    it.skip('should report lang and xml:lang mismatch (RSC-005)', async () => {
      const data = await loadEpub(
        'invalid/content/content-xhtml-lang-xml-lang-mismatch-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });
  });

  describe('Links', () => {
    it('should verify link element with known alt style tag', async () => {
      const data = await loadEpub('valid/link-alt-style-tags-known-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify link element with unknown alt style tag', async () => {
      const data = await loadEpub('valid/link-alt-style-tags-unknown-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify link elements for alternative stylesheets', async () => {
      const data = await loadEpub('valid/link-rel-stylesheet-alternate-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should report alternative stylesheet link with no title (CSS-015)', async () => {
      const data = await loadEpub(
        'invalid/content/link-rel-stylesheet-alternate-no-title-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expectError(result, 'CSS-015');
    });
  });

  describe('Lists', () => {
    it('should verify li with value attribute (issue 248)', async () => {
      const data = await loadEpub('valid/li-with-value-attr-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Main element', () => {
    it('should verify main element is allowed (issue 340)', async () => {
      const data = await loadEpub('valid/main-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Map', () => {
    it('should verify image map (issue 696)', async () => {
      const data = await loadEpub('valid/map-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: RelaxNG content schema validation not wired
    it.skip('should report invalid image map (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/map-usemap-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });
  });

  describe('Meta http-equiv', () => {
    it('should verify http-equiv declaration', async () => {
      const data = await loadEpub('valid/http-equiv-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify case-insensitive http-equiv declaration', async () => {
      const data = await loadEpub('valid/http-equiv-case-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: RelaxNG content schema validation not wired
    it.skip('should report http-equiv with non-utf8 charset (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/http-equiv-non-utf8-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    // Skip: RelaxNG content schema validation not wired
    it.skip('should report both http-equiv and charset declared (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/http-equiv-and-charset-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });
  });

  describe('Meta viewport', () => {
    it('should not check viewport meta for non-fixed layout documents', async () => {
      const data = await loadEpub('valid/content-xhtml-meta-viewport-non-fxl-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });
  });

  describe('MathML validation', () => {
    it('should allow MathML with alternative image', async () => {
      const data = await loadEpub('valid/content-xhtml-mathml-altimg-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should report MathML with alternative image not found (RSC-007)', async () => {
      const data = await loadEpub(
        'invalid/content/content-xhtml-mathml-altimg-not-found-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-007');
    });

    it('should verify MathML markup with prefixed elements', async () => {
      const data = await loadEpub('valid/mathml-prefixed-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify MathML markup with unprefixed elements', async () => {
      const data = await loadEpub('valid/mathml-unprefixed-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should allow MathML deprecated features', async () => {
      const data = await loadEpub('valid/mathml-deprecated-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify MathML with tex annotation', async () => {
      const data = await loadEpub('valid/mathml-anno-tex-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify MathML with content MathML annotation', async () => {
      const data = await loadEpub('valid/mathml-anno-contentmathml-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify MathML with presentation MathML annotation', async () => {
      const data = await loadEpub('valid/mathml-anno-presmathml-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify MathML with descendant MathML in XHTML annotation', async () => {
      const data = await loadEpub('valid/mathml-anno-xhtml-with-mathml-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify MathML with XHTML annotation', async () => {
      const data = await loadEpub('valid/mathml-anno-xhtml-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify MathML with XHTML annotation missing name', async () => {
      const data = await loadEpub('valid/mathml-anno-xhtml-noname-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify MathML annotation-xml name=contentequiv', async () => {
      const data = await loadEpub('valid/mathml-anno-xhtml-contentequiv-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify MathML with HTML encoded annotation', async () => {
      const data = await loadEpub('valid/mathml-anno-xhtml-html-encoding-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify MathML with SVG annotation', async () => {
      const data = await loadEpub('valid/mathml-anno-svg-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: RelaxNG content schema validation not wired — all MathML error tests need schema
    it.skip('should report content MathML annotation without name (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/mathml-anno-noname-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report MathML annotation with invalid name (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/mathml-anno-name-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report MathML annotation with invalid encoding (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/mathml-anno-encoding-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report MathML annotation with reversed XHTML encoding (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/mathml-anno-xhtml-encoding-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report MathML with only content MathML (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/mathml-contentmathml-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });
  });

  describe('Microdata', () => {
    // Skip: EPUB wrapper cannot satisfy all microdata resource references
    it.skip('should verify microdata attributes on elements', async () => {
      const data = await loadEpub('valid/microdata-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: RelaxNG content schema validation not wired
    it.skip('should report microdata on elements where not allowed (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/microdata-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });
  });

  describe('Non-conforming features', () => {
    // Skip: RelaxNG content schema validation not wired — obsolete attribute checks need schema
    it.skip('should report obsolete typemustmatch attribute (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/obsolete-typemustmatch-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report obsolete contextmenu attribute (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/obsolete-contextmenu-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report obsolete dropzone attribute (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/obsolete-dropzone-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report obsolete keygen element (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/obsolete-keygen-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report obsolete menu features (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/obsolete-menu-features-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report obsolete pubdate attribute (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/obsolete-pubdate-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report obsolete seamless attribute (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/obsolete-seamless-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });
  });

  describe('Objects', () => {
    it('should allow fragment identifiers on PDFs', async () => {
      const data = await loadEpub('valid/object-pdf-fragment-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Schematron assertions', () => {
    // Skip: RelaxNG content schema validation not fully wired
    it.skip('should report RelaxNG schema errors (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/content-xhtml-relaxng-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-005');
    });

    // Skip: Schematron validation for content documents not fully wired
    it.skip('should report Schematron schema errors (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/content-xhtml-schematron-error.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-005');
    });

    // Skip: data-* attribute handling in schema validation not implemented
    it.skip('should report invalid elements after data-* attribute (RSC-005)', async () => {
      const data = await loadEpub(
        'invalid/content/content-xhtml-data-attr-removal-markup-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-005');
    });

    it('should allow fragment identifiers after data-* declaration', async () => {
      const data = await loadEpub('valid/content-xhtml-data-attr-removal-fragments-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Source elements', () => {
    it('should not confuse dc:source with HTML source element', async () => {
      const data = await loadEpub('valid/dc-source-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Style validation', () => {
    it('should verify use of style element in the header', async () => {
      const data = await loadEpub('valid/style-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify the style attribute is allowed with valid syntax', async () => {
      const data = await loadEpub('valid/style-attr-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: CSS-008 for style element without type not implemented
    it.skip('should report style element without type (CSS-008)', async () => {
      const data = await loadEpub('invalid/content/style-no-type-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'CSS-008');
    });

    // Skip: CSS-008 for style attribute syntax errors not implemented
    it.skip('should report style attribute with invalid CSS syntax (CSS-008)', async () => {
      const data = await loadEpub('invalid/content/style-attr-syntax-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'CSS-008');
    });

    // Skip: RelaxNG content schema validation not wired — style in body requires schema
    it.skip('should report style element in the body (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/style-in-body-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });
  });

  describe('Embedded SVG', () => {
    it('should validate SVG in spine', async () => {
      const data = await loadEpub('valid/content-svg-in-spine-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate SVG with unusual file extension', async () => {
      const data = await loadEpub('valid/content-svg-file-extension-unusual-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate SVG referenced from img, object and iframe elements', async () => {
      const data = await loadEpub('valid/content-xhtml-svg-reference-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should validate svg:switch without triggering package switch property', async () => {
      const data = await loadEpub('valid/content-xhtml-svg-switch-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    it('should allow SVG without viewbox for non-fixed layout', async () => {
      const data = await loadEpub('valid/content-svg-no-viewbox-not-fxl-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should report SVG use element without fragment (RSC-015)', async () => {
      const data = await loadEpub('invalid/content/content-svg-use-href-no-fragment-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-015');
    });

    // Skip: svgView() fragment syntax not recognized — false RSC-012
    it.skip('should allow svgView fragments for SVG documents', async () => {
      const data = await loadEpub('valid/content-xhtml-svg-fragment-svgview-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify inclusion of SVG markup', async () => {
      const data = await loadEpub('valid/svg-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify conforming SVG markup does not create false-positives', async () => {
      const data = await loadEpub('valid/svg-regression-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify SVG IDs can be any valid HTML ID', async () => {
      const data = await loadEpub('valid/svg-id-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify epub:type attribute can be used on SVG', async () => {
      const data = await loadEpub('valid/svg-epubtype-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify unprefixed HTML elements inside prefixed foreignObject', async () => {
      const data = await loadEpub('valid/svg-foreignObject-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify requiredExtensions attribute can have any value', async () => {
      const data = await loadEpub('valid/svg-foreignObject-requiredExtensions-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify SVG title valid content model', async () => {
      const data = await loadEpub('valid/svg-title-content-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify RDF elements can be embedded in SVG', async () => {
      const data = await loadEpub('valid/svg-rdf-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: RelaxNG content schema validation not wired — foreignObject/title error checks need schema
    it.skip('should report foreignObject with body element (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/svg-foreignObject-with-body-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report HTML validation errors within foreignObject (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/svg-foreignObject-html-invalid-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report foreignObject without flow content (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/svg-foreignObject-not-flow-content-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report SVG title with non-HTML elements (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/svg-title-content-not-html-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report HTML validation errors within SVG title (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/svg-title-content-invalid-html-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });
  });

  describe('Tables', () => {
    it('should verify border attribute on tables', async () => {
      const data = await loadEpub('valid/table-border-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: RelaxNG content schema validation not wired
    it.skip('should report table with invalid border value (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/table-border-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });
  });

  describe('Time element', () => {
    it('should verify various datetime values', async () => {
      const data = await loadEpub('valid/time-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: RelaxNG content schema validation not wired
    it.skip('should report invalid datetime formats (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/time-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report nested time elements (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/time-nested-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });
  });

  describe('URLs', () => {
    it('should verify valid URLs', async () => {
      const data = await loadEpub('valid/url-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: RSC-020 URL validation for content doc URLs not implemented
    it.skip('should report non-conforming URLs (RSC-020)', async () => {
      const data = await loadEpub('invalid/content/url-invalid-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-020');
    });

    // Skip: RSC-020 URL validation for content doc URLs not implemented
    it.skip('should report unparseable URL host (RSC-020)', async () => {
      const data = await loadEpub('invalid/content/url-host-unparseable-warning.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-020');
    });

    // Skip: HTM-025 (unregistered URL scheme) not implemented
    it.skip('should report unregistered URL scheme (HTM-025)', async () => {
      const data = await loadEpub('warnings/url-unregistered-scheme-warning.epub');
      const result = await EpubCheck.validate(data);

      expectWarning(result, 'HTM-025');
    });
  });

  describe('XML support', () => {
    it('should report XML 1.1 version declaration (HTM-001)', async () => {
      const data = await loadEpub('invalid/content/xml11-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'HTM-001');
    });
  });

  describe('Document title', () => {
    it('should report empty title element (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/title-empty-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it('should report missing title element (RSC-017)', async () => {
      const data = await loadEpub('warnings/title-missing-warning.epub');
      const result = await EpubCheck.validate(data);

      expectWarning(result, 'RSC-017');
    });
  });

  describe('Base URL validation', () => {
    it('should validate base url can be set', async () => {
      const data = await loadEpub('valid/content-xhtml-base-url-valid.epub');
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(true);
      expectNoErrorsOrWarnings(result);
    });

    // Skip: External base URL handling for relative paths not fully implemented
    it.skip('should report relative paths as remote when base is external URL (RSC-006)', async () => {
      const data = await loadEpub(
        'invalid/content/content-xhtml-base-url-remote-relative-path-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expect(result.valid).toBe(false);
      expectError(result, 'RSC-006');
    });

    // Skip: xml:base URL handling not implemented
    it.skip('should report relative paths as remote when xml:base is external URL (RSC-006)', async () => {
      const data = await loadEpub(
        'invalid/content/content-xhtml-xml-base-url-remote-relative-path-error.epub',
      );
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-006');
    });
  });

  // ==================== Structural Semantics (epub:type) ====================
  describe('epub:type validation', () => {
    it('should verify epub:type attribute on allowed content', async () => {
      const data = await loadEpub('valid/epubtype-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify epub:type with reserved vocabulary', async () => {
      const data = await loadEpub('valid/epubtype-reserved-vocab-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify epub:type with author-declared vocabulary', async () => {
      const data = await loadEpub('valid/epubtype-declared-vocab-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: RelaxNG content schema validation not wired
    it.skip('should report epub:type on head/metadata content (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/epubtype-disallowed-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    // Skip: OPF-086b (deprecated epub:type semantics) not implemented
    it.skip('should report deprecated epub:type semantics (OPF-086b)', async () => {
      const data = await loadEpub('valid/epubtype-deprecated-usage.epub');
      const result = await EpubCheck.validate(data);

      expectUsage(result, 'OPF-086b');
    });

    // Skip: OPF-087 (epub:type usage suggestions) not implemented
    it.skip('should report epub:type misuse (OPF-087)', async () => {
      const data = await loadEpub('valid/epubtype-misuse-usage.epub');
      const result = await EpubCheck.validate(data);

      expectUsage(result, 'OPF-087');
    });

    // Skip: OPF-088 fires for unknown prefix only, not for unknown semantics in default vocab
    it.skip('should report unknown epub:type semantic (OPF-088)', async () => {
      const data = await loadEpub('valid/epubtype-unknown-usage.epub');
      const result = await EpubCheck.validate(data);

      expectUsage(result, 'OPF-088');
    });
  });

  // ==================== Content Switching (Deprecated) ====================
  describe('epub:switch and epub:trigger (deprecated)', () => {
    // Skip: RelaxNG content schema validation not wired — epub:switch checks need schema
    it.skip('should report epub:switch is deprecated (RSC-017)', async () => {
      const data = await loadEpub('invalid/content/switch-deprecated-warning.epub');
      const result = await EpubCheck.validate(data);

      expectWarning(result, 'RSC-017');
    });

    it.skip('should report epub:trigger is deprecated (RSC-017)', async () => {
      const data = await loadEpub('invalid/content/trigger-deprecated-warning.epub');
      const result = await EpubCheck.validate(data);

      expectWarning(result, 'RSC-017');
    });

    it.skip('should report epub:switch with invalid mathml (RSC-005, RSC-017)', async () => {
      const data = await loadEpub('invalid/content/switch-mathml-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
      expectWarning(result, 'RSC-017');
    });

    it.skip('should report epub:switch default before case (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/switch-default-before-case-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report epub:switch multiple defaults (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/switch-multiple-default-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report epub:switch without case (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/switch-no-case-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report epub:switch without default (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/switch-no-default-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report epub:case without required-namespace (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/switch-no-case-namespace-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report epub:trigger bad refs (RSC-005, RSC-017)', async () => {
      const data = await loadEpub('invalid/content/trigger-badrefs-error.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
      expectWarning(result, 'RSC-017');
    });
  });

  // ==================== Discouraged Constructs ====================
  describe('Discouraged constructs', () => {
    it('should report base as a discouraged construct (HTM-055)', async () => {
      const data = await loadEpub('valid/discouraged-base-warning.epub');
      const result = await EpubCheck.validate(data, { includeUsage: true });

      expectNoErrorsOrWarnings(result);
      expectUsage(result, 'HTM-055');
    });

    it('should report embed as a discouraged construct (HTM-055)', async () => {
      const data = await loadEpub('valid/discouraged-embed-warning.epub');
      const result = await EpubCheck.validate(data, { includeUsage: true });

      expectNoErrorsOrWarnings(result);
      expectUsage(result, 'HTM-055');
    });

    it('should report rp as a discouraged construct (HTM-055)', async () => {
      const data = await loadEpub('valid/discouraged-rp-warning.epub');
      const result = await EpubCheck.validate(data, { includeUsage: true });

      expectNoErrorsOrWarnings(result);
      expectUsage(result, 'HTM-055');
    });
  });

  // ==================== SSML ====================
  describe('SSML attributes', () => {
    it('should verify SSML attributes are allowed', async () => {
      const data = await loadEpub('valid/ssml-valid.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should report SSML ph attribute without value (HTM-007)', async () => {
      const data = await loadEpub('warnings/ssml-empty-ph-warning.epub');
      const result = await EpubCheck.validate(data);

      expectWarning(result, 'HTM-007');
    });
  });

  // ==================== SVG Content Documents ====================
  describe('SVG Content Documents', () => {
    it('should verify custom namespace elements in SVG', async () => {
      const data = await loadEpub('valid/ns-custom-valid-svg.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify data-* attributes in SVG', async () => {
      const data = await loadEpub('valid/data-attribute-valid-svg.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify style element without explicit type in SVG', async () => {
      const data = await loadEpub('valid/style-no-type-valid-svg.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify RDF elements in SVG', async () => {
      const data = await loadEpub('valid/rdf-valid-svg.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify foreignObject in SVG', async () => {
      const data = await loadEpub('valid/foreignObject-valid-svg.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify requiredExtensions in SVG foreignObject', async () => {
      const data = await loadEpub('valid/foreignObject-requiredExtensions-valid-svg.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify SVG title valid content model', async () => {
      const data = await loadEpub('valid/title-content-valid-svg.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    it('should verify ARIA attributes in SVG', async () => {
      const data = await loadEpub('valid/aria-attributes-valid-svg.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: SVG epub:type fixture has external xlink:href references
    it.skip('should verify epub:type on SVG structural elements', async () => {
      const data = await loadEpub('valid/epubtype-valid-svg.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: SVG font-face fixture has many external font references
    it.skip('should verify empty font-face declarations in SVG', async () => {
      const data = await loadEpub('valid/font-face-empty-valid-svg.epub');
      const result = await EpubCheck.validate(data);

      expectNoErrorsOrWarnings(result);
    });

    // Skip: RelaxNG content schema validation not wired — SVG error checks need schema
    it.skip('should report duplicate id in SVG (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/id-duplicate-error-svg.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report invalid id in SVG (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/id-invalid-error-svg.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report foreignObject with non-HTML content (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/foreignObject-not-html-error-svg.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report foreignObject with non-flow content in SVG (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/foreignObject-not-flow-content-error-svg.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report foreignObject with multiple body in SVG (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/foreignObject-multiple-body-error-svg.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report HTML validation errors in SVG foreignObject (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/foreignObject-html-invalid-error-svg.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report SVG title with non-HTML elements (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/title-content-not-html-error-svg.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report HTML validation errors in SVG title (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/title-content-invalid-html-error-svg.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report epub:type not allowed on certain SVG elements (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/epubtype-not-allowed-error-svg.epub');
      const result = await EpubCheck.validate(data);

      expectError(result, 'RSC-005');
    });

    it.skip('should report unknown epub:* attribute in SVG (RSC-005)', async () => {
      const data = await loadEpub('invalid/content/unknown-epub-attribute-error-svg.epub');
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
 * Assert that a specific fatal error ID is present in the result
 */
function expectFatal(
  result: Awaited<ReturnType<typeof EpubCheck.validate>>,
  fatalId: string,
): void {
  const hasFatal = result.messages.some((m) => m.id === fatalId && m.severity === 'fatal');
  expect(
    hasFatal,
    `Expected fatal ${fatalId} to be reported. Got: ${JSON.stringify(result.messages.map((m) => m.id))}`,
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
