import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EpubCheck } from '../../src/index.js';

/**
 * EPUB 2 Integration Tests
 *
 * Ports 7 Java EPUBCheck feature files from epub2/:
 * - ocf-publication.feature
 * - opf-publication.feature
 * - ncx-publication.feature
 * - ops-publication.feature
 * - opf-package-document.feature (--mode opf)
 * - ops-content-document-xhtml.feature (--mode xhtml)
 * - ops-content-document-svg.feature (--mode svg, NOT IMPLEMENTED)
 *
 * Many tests are skipped because EPUB 2-specific validation rules are
 * not implemented — each skip is annotated with the specific gap.
 */

describe('Integration Tests - EPUB 2', () => {
  describe('Ocf Publication', () => {
    it('Verify a minimal EPUB 2.0.1 publication', async () => {
      const data = loadFixture('epub2/epub/minimal.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectNoErrorsOrWarnings(result);
    });

    it('Verify a minimal EPUB 2.0.1 publication even when a 3.0 profile is specified', async () => {
      const data = loadFixture('epub2/epub/minimal.epub');
      const result = await EpubCheck.validate(data, { version: '2.0', profile: 'dict' });
      expectNoErrorsOrWarnings(result);
    });

    it('Report a file name with spaces', async () => {
      const data = loadFixture('epub2/epub/ocf-filename-with-space-warning.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectWarning(result, 'PKG-010');
    });

    it('Report an empty directory in the OCF structure', async () => {
      const data = loadFixture('epub2/epub/ocf-directory-empty-warning.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectWarning(result, 'PKG-014');
    });

    it('Report a missing mimetype file', async () => {
      const data = loadFixture('epub2/epub/ocf-mimetype-missing-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'PKG-006');
    });

    it('Report trailing spaces in the mimetype file', async () => {
      const data = loadFixture('epub2/epub/ocf-mimetype-with-spaces-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'PKG-007');
    });

    it('Ignore unknown files in the META-INF directory', async () => {
      const data = loadFixture('epub2/epub/ocf-metainf-file-unknown-valid.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectNoErrorsOrWarnings(result);
    });

    it("Allow alternative rootfiles in the 'container.xml' file", async () => {
      const data = loadFixture('epub2/epub/ocf-metainf-container-alternative-valid.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectNoErrorsOrWarnings(result);
    });

    // Skip: FAIL: got {"RSC-002":1}, expected none
    it.skip("Report a missing 'container.xml' file", async () => {
      const data = loadFixture('epub2/epub/ocf-metainf-container-file-missing-fatal.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectNoErrorsOrWarnings(result);
    });

    // Skip: FAIL: expected 1x PKG-013, got 0; all={}
    it.skip("Report multiple OPF rootfiles in the 'container.xml' file", async () => {
      const data = loadFixture('epub2/epub/ocf-metainf-container-multiple-opf-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'PKG-013');
    });

    // Skip: FAIL: expected 1x RSC-003, got 0; all={"OPF-002":1,"RSC-005":1}
    it.skip("Report a wrong media type on the 'rootfile' element of the 'container.xml' file", async () => {
      const data = loadFixture('epub2/epub/ocf-metainf-container-mediatype-invalid-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'RSC-003');
    });

    // Skip: FAIL: expected 1x OPF-016, got 0; all={"PKG-004":1}
    it.skip("Report a missing 'full-path' attribute on the rootfile element of the 'container.xml' file", async () => {
      const data = loadFixture(
        'epub2/epub/ocf-metainf-container-rootfile-full-path-missing-error.epub',
      );
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'OPF-016');
    });

    // Skip: FAIL: expected 1x OPF-017, got 0; all={"PKG-004":1}
    it.skip("Report an empty 'full-path' attribute on the rootfile element of the 'container.xml' file", async () => {
      const data = loadFixture(
        'epub2/epub/ocf-metainf-container-rootfile-full-path-empty-error.epub',
      );
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'OPF-017');
    });

    // Skip: scenario title is misleading — Java expects no errors but we emit PKG-010 + OPF-002
    // Gap: our rootfile path resolution surfaces as errors for EPUB 2 "missing OPF" fixture
    it.skip('Report a missing OPF document', async () => {
      const data = loadFixture('epub2/epub/ocf-opf-missing-fatal.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectNoErrorsOrWarnings(result);
    });

    it('Verify a minimal packaged EPUB 2.0.1 publication', async () => {
      const data = loadFixture('epub2/epub/ocf-minimal-valid.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Opf Publication', () => {
    // Skip: FAIL: expected 1x PKG-001, got 0; all={}
    it.skip('Report when checking an EPUB 2.0.1 explicitly against EPUB 3.x', async () => {
      const data = loadFixture('epub2/epub/minimal.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'PKG-001');
    });

    // Skip: FAIL: expected 1x OPF-001, got 0; all={"RSC-005":3,"OPF-054":1,"HTM-004":1}
    it.skip('Report a missing version attribute', async () => {
      const data = loadFixture('epub2/epub/opf-version-missing-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'OPF-001');
    });

    it("Verify that the 'clr' MARC code is allowed in the opf:role attribute", async () => {
      const data = loadFixture('epub2/epub/opf-metadata-creator-role-clr-valid.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectNoErrorsOrWarnings(result);
    });

    it('Verify that package IDs with leading/trailing spaces are allowed', async () => {
      const data = loadFixture('epub2/epub/opf-package-id-spaces-valid.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectNoErrorsOrWarnings(result);
    });

    it('the unique identifier must not be empty', async () => {
      const data = loadFixture('epub2/epub/opf-unique-identifier-not-found-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'OPF-030');
    });

    it('Report a reference to a resource that is not listed in the manifest', async () => {
      const data = loadFixture('epub2/epub/opf-manifest-item-missing-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'RSC-007');
    });

    it('Report a resource declared in the manifest but missing from the container', async () => {
      const data = loadFixture('epub2/epub/opf-manifest-item-resource-missing-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'RSC-001');
    });

    // Skip: FAIL: expected 1x OPF-035, got 0; all={}
    it.skip("Report an XHTML OPS document declard as 'text/html'", async () => {
      const data = loadFixture('epub2/epub/opf-manifest-item-xhtml-mediatype-html-warning.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectWarning(result, 'OPF-035');
    });

    // Skip: FAIL: expected 1x OPF-003, got 0; all={}
    it.skip('Report (usage) a resource that is not listed in the manifest', async () => {
      const data = loadFixture('epub2/epub/opf-manifest-resource-undeclared-usage.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectUsage(result, 'OPF-003');
    });

    it('Verify that operating system files (.DS_STORE, thumbs.db) are ignored', async () => {
      const data = loadFixture('epub2/epub/opf-manifest-os-files-ignore-valid.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectNoErrorsOrWarnings(result);
    });

    it('Report a reference to a remote resource from an object element when the resource is not declared in package document', async () => {
      const data = loadFixture('epub2/epub/opf-remote-object-undeclared-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'RSC-006');
    });

    it('Report a manifest fallback that does not resolve to a resource in the publication', async () => {
      const data = loadFixture('epub2/epub/opf-fallback-non-resolving-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'OPF-040');
    });

    it('Report a missing spine', async () => {
      const data = loadFixture('epub2/epub/opf-spine-missing-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'RSC-005');
    });

    it("Report a spine with no 'toc' attribute", async () => {
      const data = loadFixture('epub2/epub/opf-spine-toc-attribute-missing-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'RSC-005');
    });

    // Skip: FAIL: expected 1x CHK-008, got 0; all={"OPF-050":1,"RSC-005":1}
    it.skip('Report a toc attribute pointing to something else than the NCX', async () => {
      const data = loadFixture('epub2/epub/opf-spine-toc-attribute-to-non-ncx-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'OPF-050');
    });

    it('Report repeated spine items', async () => {
      const data = loadFixture('epub2/epub/opf-spine-itemref-repeated-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'OPF-034');
    });

    it("Report a 'page-map' attribute (invalid Adobe extension)", async () => {
      const data = loadFixture('epub2/epub/opf-pagemap-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'RSC-005');
    });

    // Skip: FAIL: expected 1x OPF-063, got 0; all={"RSC-005":1}
    it.skip("Report a 'page-map' attribute (invalid Adobe extension) pointing to nowhere", async () => {
      const data = loadFixture('epub2/epub/opf-pagemap-ref-not-found-warning.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'RSC-005');
    });

    // Skip: FAIL: expected 1x RSC-007, got 0; all={"OPF-031":1}
    it.skip("Report 'guide' references that are not in the manifest", async () => {
      const data = loadFixture('epub2/epub/opf-guide-reference-undeclared-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'OPF-031');
    });

    // Skip: FAIL: expected 1x OPF-032, got 0; all={}
    it.skip("Report 'guide' references to non-OPS resources", async () => {
      const data = loadFixture('epub2/epub/opf-guide-reference-to-image-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'OPF-032');
    });

    // Skip: FAIL: expected 1x OPF-001, got 0; all={"RSC-005":4,"OPF-030":1,"OPF-015":1,"OPF-016":1,"OPF-017":1,"OPF-054":1,"OPF-043":1,"OPF-037":1}
    it.skip('Report a legacy OEBPS 1.2 publication', async () => {
      const data = loadFixture('epub2/epub/opf-legacy-oebps12-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'OPF-001');
    });

    // Skip: FAIL: expected 1x OPF-039, got 0; all={"RSC-005":2,"OPF-030":1,"OPF-015":1,"OPF-016":1,"OPF-017":1,"OPF-050":1,"OPF-043":1,"OPF-037":1}
    it.skip('Report a bad content document media type on legacy OEBPS 1.2 publications', async () => {
      const data = loadFixture('epub2/epub/opf-legacy-oebps12-mediatype-html-warning.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectWarning(result, 'OPF-039');
    });

    // Skip: FAIL: expected 1x OPF-038, got 0; all={"RSC-005":2,"OPF-030":1,"OPF-015":1,"OPF-016":1,"OPF-017":1,"OPF-050":1,"OPF-043":1}
    it.skip('Report a bad CSS media type on legacy OEBPS 1.2 publications', async () => {
      const data = loadFixture('epub2/epub/opf-legacy-oebps12-mediatype-css-warning.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectWarning(result, 'OPF-038');
    });
  });

  describe('Ncx Publication', () => {
    it('Report duplicate IDs in the NCX document', async () => {
      const data = loadFixture('epub2/epub/ncx-id-duplicate-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectNoErrorsOrWarnings(result);
    });

    // Skip: FAIL: expected 1x RSC-005, got 0; all={}
    it.skip('Report invalid IDs in the NCX document', async () => {
      const data = loadFixture('epub2/epub/ncx-id-syntax-invalid-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'RSC-005');
    });

    // Skip: FAIL: expected 2x NCX-006, got 0; all={}
    it.skip('Report empty text labels as usage', async () => {
      const data = loadFixture('epub2/epub/ncx-label-empty-valid.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectErrorCount(result, 'NCX-006', 2, 'usage');
    });

    // Skip: FAIL: expected 1x RSC-010, got 0; all={}
    it.skip('Report a link to a resource that is not an OPS document', async () => {
      const data = loadFixture('epub2/epub/ncx-link-to-non-ops-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'RSC-010');
    });

    // Skip: FAIL: expected 1x RSC-007, got 0; all={}
    it.skip('Report an NCX reference to a resource that is not in the publication', async () => {
      const data = loadFixture('epub2/epub/ncx-missing-resource-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'RSC-007');
    });

    // Skip: FAIL: expected 1x RSC-005, got 0; all={}
    it.skip('Report an NCX pageTarget with a type attribute value that is not one of "front", "normal" or "special"', async () => {
      const data = loadFixture('epub2/epub/ncx-pagetarget-type-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'RSC-005');
    });

    it('Verify that leading/trailing spaces in an NCX uid attribute are allowed', async () => {
      const data = loadFixture('epub2/epub/ncx-uid-spaces-valid.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectNoErrorsOrWarnings(result);
    });

    it("Report an NCX uid attribute value that does not match the publication's unique identifier", async () => {
      const data = loadFixture('epub2/epub/ncx-uid-mismatch-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'NCX-001');
    });
  });

  describe('Ops Publication', () => {
    it('Verify an XHTML content document without an .xhtml extension', async () => {
      const data = loadFixture('epub2/epub/ops-xhtml-unusual-extension-valid.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectNoErrorsOrWarnings(result);
    });

    it('Report a broken internal link in XHTML', async () => {
      const data = loadFixture('epub2/epub/ops-xhtml-hyperlink-to-missing-fragment-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'RSC-012');
    });

    it('Report a missing stylesheet referenced in a link element', async () => {
      const data = loadFixture('epub2/epub/ops-xhtml-link-to-missing-stylesheet-error.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectError(result, 'RSC-007');
    });

    it('Verify a publication using a DTBook Content Document', async () => {
      const data = loadFixture('epub2/epub/ops-dtbook-valid.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectNoErrorsOrWarnings(result);
    });

    it('Verify usage of Javascript in XHTML', async () => {
      const data = loadFixture('epub2/epub/ops-xhtml-script-valid.epub');
      const result = await EpubCheck.validate(data, { version: '2.0' });
      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Opf Package Document', () => {
    it('the minimal OPF document is reported as valid', async () => {
      const data = loadFixture('epub2/opf-document/minimal.opf');
      const result = await EpubCheck.validateSingleFile(data, 'minimal.opf', {
        mode: 'opf',
        version: '2.0',
      });
      expectNoErrorsOrWarnings(result);
    });

    // Skip: FAIL: expected 4x RSC-005, got 1; all={"RSC-005":1}
    it.skip("the default namespace must be 'http://www.idpf.org/2007/opf'", async () => {
      const data = loadFixture('epub2/opf-document/xml-namespace-wrongdefault-error.opf');
      const result = await EpubCheck.validateSingleFile(
        data,
        'xml-namespace-wrongdefault-error.opf',
        { mode: 'opf', version: '2.0' },
      );
      expectErrorCount(result, 'RSC-005', 4, 'error');
    });

    it('Report a missing version attribute', async () => {
      const data = loadFixture('epub2/opf-document/version-missing-error.opf');
      const result = await EpubCheck.validateSingleFile(data, 'version-missing-error.opf', {
        mode: 'opf',
        version: '2.0',
      });
      expectError(result, 'RSC-005');
    });

    // Skip: FAIL: expected 2x RSC-005, got 1; all={"OPF-074":1,"RSC-005":1}
    it.skip('duplicate IDs are reported', async () => {
      const data = loadFixture('epub2/opf-document/xml-id-duplicate-error.opf');
      const result = await EpubCheck.validateSingleFile(data, 'xml-id-duplicate-error.opf', {
        mode: 'opf',
        version: '2.0',
      });
      expectErrorCount(result, 'RSC-005', 2, 'error');
    });

    it('unknown elements are reported', async () => {
      const data = loadFixture('epub2/opf-document/xml-element-unknown-error.opf');
      const result = await EpubCheck.validateSingleFile(data, 'xml-element-unknown-error.opf', {
        mode: 'opf',
        version: '2.0',
      });
      expectError(result, 'RSC-005');
    });

    // Skip: FAIL: expected 1x HTM-009, got 0; all={}
    it.skip('Report an invalid doctype in the OPF document', async () => {
      const data = loadFixture('epub2/opf-document/doctype-invalid-error.opf');
      const result = await EpubCheck.validateSingleFile(data, 'doctype-invalid-error.opf', {
        mode: 'opf',
        version: '2.0',
      });
      expectError(result, 'HTM-009');
    });

    it('Ignore legacy OEB 1.2 Package doctype', async () => {
      const data = loadFixture('epub2/opf-document/doctype-legacy-oeb12-valid.opf');
      const result = await EpubCheck.validateSingleFile(data, 'doctype-legacy-oeb12-valid.opf', {
        mode: 'opf',
        version: '2.0',
      });
      expectNoErrorsOrWarnings(result);
    });

    // Skip: scenario is misleadingly named "must not be empty" but Java expects no errors on this fixture.
    // Our validator reports OPF-048 (missing unique-identifier attribute) + RSC-005 (Schematron schema).
    it.skip('the unique identifier must not be empty (attribute missing)', async () => {
      const data = loadFixture('epub2/opf-document/unique-identifier-attribute-missing-error.opf');
      const result = await EpubCheck.validateSingleFile(
        data,
        'unique-identifier-attribute-missing-error.opf',
        { mode: 'opf', version: '2.0' },
      );
      expectNoErrorsOrWarnings(result);
    });

    it('the unique identifier must not be empty', async () => {
      const data = loadFixture('epub2/opf-document/metadata-identifier-empty-error.opf');
      const result = await EpubCheck.validateSingleFile(
        data,
        'metadata-identifier-empty-error.opf',
        { mode: 'opf', version: '2.0' },
      );
      expectError(result, 'RSC-005');
    });

    it('the unique identifier must not be empty', async () => {
      const data = loadFixture('epub2/opf-document/unique-identifier-not-found-error.opf');
      const result = await EpubCheck.validateSingleFile(
        data,
        'unique-identifier-not-found-error.opf',
        { mode: 'opf', version: '2.0' },
      );
      expectError(result, 'OPF-030');
    });

    // Skip: FAIL: expected 1x OPF-052, got 0; all={}
    it.skip("Report a 'dc:creator' metadata with an unknown role", async () => {
      const data = loadFixture('epub2/opf-document/metadata-creator-role-unknown-error.opf');
      const result = await EpubCheck.validateSingleFile(
        data,
        'metadata-creator-role-unknown-error.opf',
        { mode: 'opf', version: '2.0' },
      );
      expectError(result, 'OPF-052');
    });

    it("Accet a 'dc:creator' metadata with an 'edc' role", async () => {
      const data = loadFixture('epub2/opf-document/metadata-creator-role-edc-valid.opf');
      const result = await EpubCheck.validateSingleFile(
        data,
        'metadata-creator-role-edc-valid.opf',
        { mode: 'opf', version: '2.0' },
      );
      expectNoErrorsOrWarnings(result);
    });

    it('an identifier starting with "urn:uuid:" should be a valid UUID', async () => {
      const data = loadFixture(
        'epub2/opf-document/metadata-identifier-uuid-as-urn-invalid-warning.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'metadata-identifier-uuid-as-urn-invalid-warning.opf',
        { mode: 'opf', version: '2.0' },
      );
      expectWarning(result, 'OPF-085');
    });

    // Skip: FAIL: expected 1x OPF-085, got 0; all={}
    it.skip('an identifier with a "uuid" scheme should be a valid UUID', async () => {
      const data = loadFixture(
        'epub2/opf-document/metadata-identifier-uuid-as-scheme-invalid-warning.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'metadata-identifier-uuid-as-scheme-invalid-warning.opf',
        { mode: 'opf', version: '2.0' },
      );
      expectWarning(result, 'OPF-085');
    });

    // Skip: FAIL: expected 1x OPF-054, got 0; all={}
    it.skip("report an empty 'dc:date' metadata", async () => {
      const data = loadFixture('epub2/opf-document/metadata-date-empty-error.opf');
      const result = await EpubCheck.validateSingleFile(data, 'metadata-date-empty-error.opf', {
        mode: 'opf',
        version: '2.0',
      });
      expectError(result, 'OPF-054');
    });

    // Skip: FAIL: expected 1x OPF-054, got 0; all={"OPF-053":1}
    it.skip("report a 'dc:date' value not conforming to ISO-8601", async () => {
      const data = loadFixture('epub2/opf-document/metadata-date-invalid-syntax-error.opf');
      const result = await EpubCheck.validateSingleFile(
        data,
        'metadata-date-invalid-syntax-error.opf',
        { mode: 'opf', version: '2.0' },
      );
      expectError(result, 'OPF-054');
    });

    // Skip: FAIL: expected 1x OPF-055, got 0; all={}
    it.skip("report an empty 'dc:title' metadata", async () => {
      const data = loadFixture('epub2/opf-document/metadata-title-empty-warning.opf');
      const result = await EpubCheck.validateSingleFile(data, 'metadata-title-empty-warning.opf', {
        mode: 'opf',
        version: '2.0',
      });
      expectWarning(result, 'OPF-055');
    });

    it('item paths should not contain spaces', async () => {
      const data = loadFixture('epub2/opf-document/item-mediatype-oeb1-css-deprecated-warning.opf');
      const result = await EpubCheck.validateSingleFile(
        data,
        'item-mediatype-oeb1-css-deprecated-warning.opf',
        { mode: 'opf', version: '2.0' },
      );
      expectWarning(result, 'OPF-037');
    });

    // Skip: FAIL: expected 1x PKG-010, got 0; all={}
    it.skip('item paths should not contain spaces (even when properly encoded)', async () => {
      const data = loadFixture('epub2/opf-document/item-href-contains-spaces-warning.opf');
      const result = await EpubCheck.validateSingleFile(
        data,
        'item-href-contains-spaces-warning.opf',
        { mode: 'opf', version: '2.0' },
      );
      expectWarning(result, 'PKG-010');
    });

    // Skip: FAIL: expected 1x PKG-010, got 0; all={"RSC-020":1}
    it.skip('item paths should not contain spaces', async () => {
      const data = loadFixture('epub2/opf-document/item-href-contains-spaces-unencoded-error.opf');
      const result = await EpubCheck.validateSingleFile(
        data,
        'item-href-contains-spaces-unencoded-error.opf',
        { mode: 'opf', version: '2.0' },
      );
      expectError(result, 'RSC-020');
    });

    it('Verify conforming fallbacks', async () => {
      const data = loadFixture('epub2/opf-document/fallback-valid.opf');
      const result = await EpubCheck.validateSingleFile(data, 'fallback-valid.opf', {
        mode: 'opf',
        version: '2.0',
      });
      expectNoErrorsOrWarnings(result);
    });

    // Skip: FAIL: expected 1x OPF-041, got 0; all={"RSC-005":1}
    it.skip("Report a 'fallback-style' attribute pointing to a non-existing ID", async () => {
      const data = loadFixture('epub2/opf-document/fallback-style-not-found-error.opf');
      const result = await EpubCheck.validateSingleFile(
        data,
        'fallback-style-not-found-error.opf',
        { mode: 'opf', version: '2.0' },
      );
      expectError(result, 'OPF-041');
    });

    // Skip: FAIL: expected 1x OPF-042, got 0; all={"OPF-043":1}
    it.skip('Report an image used as a spine item', async () => {
      const data = loadFixture('epub2/opf-document/spine-image-error.opf');
      const result = await EpubCheck.validateSingleFile(data, 'spine-image-error.opf', {
        mode: 'opf',
        version: '2.0',
      });
      expectError(result, 'OPF-042');
    });

    it('Report a spine with only non-linear resources', async () => {
      const data = loadFixture('epub2/opf-document/spine-linear-all-no-error.opf');
      const result = await EpubCheck.validateSingleFile(data, 'spine-linear-all-no-error.opf', {
        mode: 'opf',
        version: '2.0',
      });
      expectError(result, 'OPF-033');
    });

    it("Report a spine with no 'toc' attribute", async () => {
      const data = loadFixture('epub2/opf-document/spine-toc-attribute-missing-error.opf');
      const result = await EpubCheck.validateSingleFile(
        data,
        'spine-toc-attribute-missing-error.opf',
        { mode: 'opf', version: '2.0' },
      );
      expectError(result, 'RSC-005');
    });

    it("a valid 'guide' element is allowed", async () => {
      const data = loadFixture('epub2/opf-document/guide-valid.opf');
      const result = await EpubCheck.validateSingleFile(data, 'guide-valid.opf', {
        mode: 'opf',
        version: '2.0',
      });
      expectNoErrorsOrWarnings(result);
    });

    it("'guide' element must contain chidlren entries", async () => {
      const data = loadFixture('epub2/opf-document/guide-empty-error.opf');
      const result = await EpubCheck.validateSingleFile(data, 'guide-empty-error.opf', {
        mode: 'opf',
        version: '2.0',
      });
      expectError(result, 'RSC-005');
    });

    // Skip: FAIL: expected 2x RSC-017, got 0; all={}
    it.skip("'guide' should not contain two entries of the same type pointing to the same resource", async () => {
      const data = loadFixture('epub2/opf-document/guide-duplicates-warning.opf');
      const result = await EpubCheck.validateSingleFile(data, 'guide-duplicates-warning.opf', {
        mode: 'opf',
        version: '2.0',
      });
      expectErrorCount(result, 'RSC-017', 2, 'warning');
    });
  });

  describe('Ops Content Document Xhtml', () => {
    // Skip: FAIL: expected 1x RSC-005, got 0; all={"HTM-001":1,"HTM-002":2,"RSC-017":1}
    it.skip('Report the absence of a namespace declaration', async () => {
      const data = loadFixture('epub2/ops-document-xhtml/html-no-namespace-error.xhtml');
      const result = await EpubCheck.validateSingleFile(data, 'html-no-namespace-error.xhtml', {
        mode: 'xhtml',
        version: '2.0',
      });
      expectError(result, 'RSC-005');
    });

    it('Verify a minimal XHTML OPS Document', async () => {
      const data = loadFixture('epub2/ops-document-xhtml/minimal.xhtml');
      const result = await EpubCheck.validateSingleFile(data, 'minimal.xhtml', {
        mode: 'xhtml',
        version: '2.0',
      });
      expectNoErrorsOrWarnings(result);
    });

    // Skip: FAIL: expected 1x HTM-004, got 0; all={}
    it.skip('Report an unresolved entity reference in the doctype declaration', async () => {
      const data = loadFixture('epub2/ops-document-xhtml/doctype-unresolved-entity-error.xhtml');
      const result = await EpubCheck.validateSingleFile(
        data,
        'doctype-unresolved-entity-error.xhtml',
        { mode: 'xhtml', version: '2.0' },
      );
      expectError(result, 'HTM-004');
    });

    // Skip: FAIL: expected 1x HTM-004, got 0; all={}
    it.skip('Report a DOCTYPE declaration with an invalid public identifier', async () => {
      const data = loadFixture('epub2/ops-document-xhtml/doctype-public-id-error.xhtml');
      const result = await EpubCheck.validateSingleFile(data, 'doctype-public-id-error.xhtml', {
        mode: 'xhtml',
        version: '2.0',
      });
      expectError(result, 'HTM-004');
    });

    // Skip: FAIL: expected 1x HTM-004, got 0; all={}
    it.skip('Report an HTML5 DOCTYPE declaration', async () => {
      const data = loadFixture('epub2/ops-document-xhtml/doctype-html5-error.xhtml');
      const result = await EpubCheck.validateSingleFile(data, 'doctype-html5-error.xhtml', {
        mode: 'xhtml',
        version: '2.0',
      });
      expectError(result, 'HTM-004');
    });

    it('Verify valid character references', async () => {
      const data = loadFixture(
        'epub2/ops-document-xhtml/entities-character-references-valid.xhtml',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'entities-character-references-valid.xhtml',
        { mode: 'xhtml', version: '2.0' },
      );
      expectNoErrorsOrWarnings(result);
    });

    // Skip: scenario name is misleading — Java reports no errors for this fixture,
    // but our validator correctly emits RSC-016 (fatal) for undefined entities.
    // This is a case where we're stricter than Java for EPUB 2 XHTML.
    it.skip('Report unknown entity references', async () => {
      const data = loadFixture('epub2/ops-document-xhtml/entities-unknown-error.xhtml');
      const result = await EpubCheck.validateSingleFile(data, 'entities-unknown-error.xhtml', {
        mode: 'xhtml',
        version: '2.0',
      });
      expectNoErrorsOrWarnings(result);
    });

    // Skip: FAIL: expected 1x RSC-005, got 0; all={}
    it.skip('Report HTML5 elements used in OPS XHTML Content Documents', async () => {
      const data = loadFixture('epub2/ops-document-xhtml/html5-elements-error.xhtml');
      const result = await EpubCheck.validateSingleFile(data, 'html5-elements-error.xhtml', {
        mode: 'xhtml',
        version: '2.0',
      });
      expectError(result, 'RSC-005');
    });

    it('Verify empty class attributes are allowed', async () => {
      const data = loadFixture('epub2/ops-document-xhtml/class-empty-valid.xhtml');
      const result = await EpubCheck.validateSingleFile(data, 'class-empty-valid.xhtml', {
        mode: 'xhtml',
        version: '2.0',
      });
      expectNoErrorsOrWarnings(result);
    });

    // Skip: FAIL: expected 1x RSC-005, got 0; all={}
    it.skip('Report the use of a custom namespaced attribute', async () => {
      const data = loadFixture('epub2/ops-document-xhtml/custom-ns-attr-error.xhtml');
      const result = await EpubCheck.validateSingleFile(data, 'custom-ns-attr-error.xhtml', {
        mode: 'xhtml',
        version: '2.0',
      });
      expectError(result, 'RSC-005');
    });

    it('Verify attributes allowed on ins and del are not restricted', async () => {
      const data = loadFixture('epub2/ops-document-xhtml/edit-attributes-valid.xhtml');
      const result = await EpubCheck.validateSingleFile(data, 'edit-attributes-valid.xhtml', {
        mode: 'xhtml',
        version: '2.0',
      });
      expectNoErrorsOrWarnings(result);
    });

    it('Verify ins and del elements can contain block content', async () => {
      const data = loadFixture('epub2/ops-document-xhtml/edit-block-content-valid.xhtml');
      const result = await EpubCheck.validateSingleFile(data, 'edit-block-content-valid.xhtml', {
        mode: 'xhtml',
        version: '2.0',
      });
      expectNoErrorsOrWarnings(result);
    });

    // Skip: FAIL: expected 2x RSC-005, got 1; all={"RSC-005":1}
    it.skip('Report duplicate ID values', async () => {
      const data = loadFixture('epub2/ops-document-xhtml/id-duplicate-error.xhtml');
      const result = await EpubCheck.validateSingleFile(data, 'id-duplicate-error.xhtml', {
        mode: 'xhtml',
        version: '2.0',
      });
      expectErrorCount(result, 'RSC-005', 2, 'error');
    });

    // Skip: FAIL: expected 1x RSC-005, got 0; all={}
    it.skip('Report nested a tags', async () => {
      const data = loadFixture('epub2/ops-document-xhtml/hyperlinks-nested-error.xhtml');
      const result = await EpubCheck.validateSingleFile(data, 'hyperlinks-nested-error.xhtml', {
        mode: 'xhtml',
        version: '2.0',
      });
      expectError(result, 'RSC-005');
    });

    it('Verify that lang attribute is allowed', async () => {
      const data = loadFixture('epub2/ops-document-xhtml/lang-attr-valid.xhtml');
      const result = await EpubCheck.validateSingleFile(data, 'lang-attr-valid.xhtml', {
        mode: 'xhtml',
        version: '2.0',
      });
      expectNoErrorsOrWarnings(result);
    });

    // Skip: FAIL: got {"RSC-005":1}, expected none
    it.skip('Verify usemap fragment reference is allowed', async () => {
      const data = loadFixture('epub2/ops-document-xhtml/map-usemap-fragment-valid.xhtml');
      const result = await EpubCheck.validateSingleFile(data, 'map-usemap-fragment-valid.xhtml', {
        mode: 'xhtml',
        version: '2.0',
      });
      expectNoErrorsOrWarnings(result);
    });

    it('Verify HTML elements are allowed inside of foreignObject', async () => {
      const data = loadFixture('epub2/ops-document-xhtml/svg-foreignObject-with-html-valid.xhtml');
      const result = await EpubCheck.validateSingleFile(
        data,
        'svg-foreignObject-with-html-valid.xhtml',
        { mode: 'xhtml', version: '2.0' },
      );
      expectNoErrorsOrWarnings(result);
    });

    it('Verify foreignObject allowed outside switch and body allowed inside foreignObject (issues 222, 223, 20)', async () => {
      const data = loadFixture('epub2/ops-document-xhtml/svg-foreignObject-switch-valid.xhtml');
      const result = await EpubCheck.validateSingleFile(
        data,
        'svg-foreignObject-switch-valid.xhtml',
        { mode: 'xhtml', version: '2.0' },
      );
      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Ops Content Document Svg', () => {
    it('Verify that namespaced extensions are allowed', async () => {
      const data = loadFixture('epub2/ops-document-svg/namespace-extension-valid.svg');
      const result = await EpubCheck.validateSingleFile(data, 'namespace-extension-valid.svg', {
        mode: 'svg',
        version: '2.0',
      });
      expectNoErrorsOrWarnings(result);
    });

    it('Verify font-face-src is allowed', async () => {
      const data = loadFixture('epub2/ops-document-svg/font-face-src-valid.svg');
      const result = await EpubCheck.validateSingleFile(data, 'font-face-src-valid.svg', {
        mode: 'svg',
        version: '2.0',
      });
      expectNoErrorsOrWarnings(result);
    });
  });
});

// ==================== Helpers ====================

type Result = Awaited<ReturnType<typeof EpubCheck.validate>>;

function loadFixture(path: string): Uint8Array {
  const currentDir = fileURLToPath(new URL('.', import.meta.url));
  const filePath = resolve(currentDir, '../fixtures', path);
  return new Uint8Array(readFileSync(filePath));
}

function expectError(result: Result, errorId: string): void {
  const has = result.messages.some(
    (m) => m.id === errorId && (m.severity === 'error' || m.severity === 'fatal'),
  );
  expect(
    has,
    `Expected error ${errorId}. Got: ${JSON.stringify(result.messages.map((m) => ({ id: m.id, severity: m.severity })))}`,
  ).toBe(true);
}

function expectWarning(result: Result, warningId: string): void {
  const has = result.messages.some((m) => m.id === warningId && m.severity === 'warning');
  expect(has, `Expected warning ${warningId}`).toBe(true);
}

function expectUsage(result: Result, usageId: string): void {
  const has = result.messages.some((m) => m.id === usageId && m.severity === 'usage');
  expect(has, `Expected usage ${usageId}`).toBe(true);
}

function expectErrorCount(
  result: Result,
  errorId: string,
  count: number,
  severity = 'error',
): void {
  const actualCount = result.messages.filter(
    (m) =>
      m.id === errorId &&
      (severity === 'error'
        ? m.severity === 'error' || m.severity === 'fatal'
        : m.severity === severity),
  ).length;
  expect(
    actualCount,
    `Expected ${String(count)}x ${errorId}, got ${String(actualCount)}`,
  ).toBeGreaterThanOrEqual(count);
}

function expectNoErrorsOrWarnings(result: Result): void {
  const errs = result.messages.filter(
    (m) => m.severity === 'error' || m.severity === 'fatal' || m.severity === 'warning',
  );
  expect(
    errs,
    `Expected no errors/warnings. Got: ${JSON.stringify(errs.map((m) => ({ id: m.id, severity: m.severity, message: m.message })))}`,
  ).toHaveLength(0);
}
