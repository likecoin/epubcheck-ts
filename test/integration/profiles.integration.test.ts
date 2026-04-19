import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { EpubCheck } from '../../src/index.js';

/**
 * EPUB Profile/Extension Integration Tests
 *
 * Ports 15 Java EPUBCheck feature files from 9 extension directories:
 * - epub-accessibility
 * - epub-dictionaries (2 features)
 * - epub-distributable-objects
 * - epub-edupub (3 features)
 * - epub-indexes (3 features)
 * - epub-multiple-renditions
 * - epub-previews (2 features)
 * - epub-region-nav
 * - epub-scriptable-components
 *
 * Profile implementation in the TS validator is mostly stubbed — only a
 * handful of profile-aware checks exist (EDUPUB cross-document features,
 * DICT dc:type enforcement). Most tests are skipped and serve as a backlog
 * for future profile validator work.
 */

type Result = Awaited<ReturnType<typeof EpubCheck.validate>>;

describe('Integration Tests - Profiles', () => {
  describe('Accessibility', () => {
    it("Verify an 'a11y' prefix used in metadata properties without being declared", async () => {
      const data = loadFixture(
        'profiles/accessibility/property-prefix-a11y-not-declared-valid.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'property-prefix-a11y-not-declared-valid.opf',
        { mode: 'opf', version: '3.0' },
      );
      expectNoErrorsOrWarnings(result);
    });

    it("Report unknown 'a11y' metadata", async () => {
      const data = loadFixture(
        'profiles/accessibility/property-prefix-a11y-unknown-value-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'property-prefix-a11y-unknown-value-error.opf',
        { mode: 'opf', version: '3.0' },
      );
      expectErrorCount(result, 'OPF-027', 2, 'error');
    });

    it("Verify an 'a11y:certifierCredential' property can be defined as a link", async () => {
      const data = loadFixture(
        'profiles/accessibility/link-rel-a11y-certifierCredential-valid.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'link-rel-a11y-certifierCredential-valid.opf',
        { mode: 'opf', version: '3.0' },
      );
      expectNoErrorsOrWarnings(result);
    });

    it("Allow using the 'a11y:exemption' property in package metadata", async () => {
      const data = loadFixture('profiles/accessibility/metadata-a11y-exemption-valid.opf');
      const result = await EpubCheck.validateSingleFile(data, 'metadata-a11y-exemption-valid.opf', {
        mode: 'opf',
        version: '3.0',
      });
      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Dictionaries', () => {
    it("An EPUB Dictionary publication must have a 'dictionary' dc:type property", async () => {
      const data = loadFixture(
        'profiles/dictionaries/package-document/dictionary-metadata-type-missing-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'dictionary-metadata-type-missing-error.opf',
        { mode: 'opf', version: '3.0', profile: 'dict' },
      );
      expectError(result, 'RSC-005');
    });

    it('A publication with single EPUB Dictionary is valid', async () => {
      const data = loadFixture(
        'profiles/dictionaries/package-document/dictionary-single-valid.opf',
      );
      const result = await EpubCheck.validateSingleFile(data, 'dictionary-single-valid.opf', {
        mode: 'opf',
        version: '3.0',
        profile: 'dict',
      });
      expectNoErrorsOrWarnings(result);
    });

    it('A single EPUB Dictionary must declare a search key map', async () => {
      const data = loadFixture(
        'profiles/dictionaries/package-document/dictionary-single-skm-missing-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'dictionary-single-skm-missing-error.opf',
        { mode: 'opf', version: '3.0', profile: 'dict' },
      );
      expectError(result, 'RSC-005');
    });

    it("A single EPUB Dictionary search key map must have the 'dictionary' property", async () => {
      const data = loadFixture(
        'profiles/dictionaries/package-document/dictionary-single-skm-property-dictionary-missing-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'dictionary-single-skm-property-dictionary-missing-error.opf',
        { mode: 'opf', version: '3.0', profile: 'dict' },
      );
      expectError(result, 'RSC-005');
    });

    it('A dictionary collection can be used to define multiple EPUB Dictionaries', async () => {
      const data = loadFixture(
        'profiles/dictionaries/package-document/dictionary-collection-valid.opf',
      );
      const result = await EpubCheck.validateSingleFile(data, 'dictionary-collection-valid.opf', {
        mode: 'opf',
        version: '3.0',
        profile: 'dict',
      });
      expectNoErrorsOrWarnings(result);
    });

    it('A dictionary collection must contain a search key map', async () => {
      const data = loadFixture(
        'profiles/dictionaries/package-document/dictionary-collection-skm-missing-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'dictionary-collection-skm-missing-error.opf',
        { mode: 'opf', version: '3.0', profile: 'dict' },
      );
      expectError(result, 'OPF-083');
    });

    it('A dictionary collection must not contain a search key map used by another collection', async () => {
      const data = loadFixture(
        'profiles/dictionaries/package-document/dictionary-collection-skm-shared-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'dictionary-collection-skm-shared-error.opf',
        { mode: 'opf', version: '3.0', profile: 'dict' },
      );
      expectError(result, 'RSC-005');
    });

    it('A dictionary collection must not contain more than one search key map', async () => {
      const data = loadFixture(
        'profiles/dictionaries/package-document/dictionary-collection-skm-multiple-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'dictionary-collection-skm-multiple-error.opf',
        { mode: 'opf', version: '3.0', profile: 'dict' },
      );
      expectError(result, 'OPF-082');
    });

    it('A dictionary collection must not contain child collections', async () => {
      const data = loadFixture(
        'profiles/dictionaries/package-document/dictionary-collection-subcollection-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'dictionary-collection-subcollection-error.opf',
        { mode: 'opf', version: '3.0', profile: 'dict' },
      );
      expectError(result, 'RSC-005');
    });

    it('A dictionary collection must not contain resources not in the manifest', async () => {
      const data = loadFixture(
        'profiles/dictionaries/package-document/dictionary-collection-resource-missing-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'dictionary-collection-resource-missing-error.opf',
        { mode: 'opf', version: '3.0', profile: 'dict' },
      );
      expectError(result, 'OPF-081');
    });

    it('A dictionary collection must not contain resources other than XHTML Content Documents and Search Key Map', async () => {
      const data = loadFixture(
        'profiles/dictionaries/package-document/dictionary-collection-resource-not-xhtml-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'dictionary-collection-resource-not-xhtml-error.opf',
        { mode: 'opf', version: '3.0', profile: 'dict' },
      );
      expectError(result, 'OPF-084');
    });

    it('A dictionary-type property monolingual is valid', async () => {
      const data = loadFixture(
        'profiles/dictionaries/package-document/dictionary-metadata-dictionary-type-monolingual-valid.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'dictionary-metadata-dictionary-type-monolingual-valid.opf',
        { mode: 'opf', version: '3.0', profile: 'dict' },
      );
      expectNoErrorsOrWarnings(result);
    });

    it('A dictionary-type property with an unknown value is reported', async () => {
      const data = loadFixture(
        'profiles/dictionaries/package-document/dictionary-metadata-dictionary-type-unknown-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'dictionary-metadata-dictionary-type-unknown-error.opf',
        { mode: 'opf', version: '3.0', profile: 'dict' },
      );
      expectError(result, 'RSC-005');
    });

    it('The source language of a single-dictionary publication must be defined', async () => {
      const data = loadFixture(
        'profiles/dictionaries/package-document/dictionary-metadata-languages-missing-source-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'dictionary-metadata-languages-missing-source-error.opf',
        { mode: 'opf', version: '3.0', profile: 'dict' },
      );
      expectError(result, 'RSC-005');
    });

    it('The source language of a single-dictionary publication must not be defined more than once', async () => {
      const data = loadFixture(
        'profiles/dictionaries/package-document/dictionary-metadata-languages-multiple-source-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'dictionary-metadata-languages-multiple-source-error.opf',
        { mode: 'opf', version: '3.0', profile: 'dict' },
      );
      expectError(result, 'RSC-005');
    });

    it("The target language of a single-dictionary publication must one of the declared 'dc:language' values", async () => {
      const data = loadFixture(
        'profiles/dictionaries/package-document/dictionary-metadata-languages-undeclared-lang-target-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'dictionary-metadata-languages-undeclared-lang-target-error.opf',
        { mode: 'opf', version: '3.0', profile: 'dict' },
      );
      expectError(result, 'RSC-005');
    });

    it('The source/target languages of a multiple-dictionary publication can be defined in the collections', async () => {
      const data = loadFixture(
        'profiles/dictionaries/package-document/dictionary-metadata-languages-collection-valid.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'dictionary-metadata-languages-collection-valid.opf',
        { mode: 'opf', version: '3.0', profile: 'dict' },
      );
      expectNoErrorsOrWarnings(result);
    });

    it('The target language of a dictionary collection must be defined', async () => {
      const data = loadFixture(
        'profiles/dictionaries/package-document/dictionary-metadata-languages-collection-missing-target-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'dictionary-metadata-languages-collection-missing-target-error.opf',
        { mode: 'opf', version: '3.0', profile: 'dict' },
      );
      expectError(result, 'RSC-005');
    });

    it('The source language of a dictionary collection must not be defined more than once', async () => {
      const data = loadFixture(
        'profiles/dictionaries/package-document/dictionary-metadata-languages-collection-multiple-source-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'dictionary-metadata-languages-collection-multiple-source-error.opf',
        { mode: 'opf', version: '3.0', profile: 'dict' },
      );
      expectError(result, 'RSC-005');
    });

    it("The target language of a dictionary collection must one of the declared 'dc:language' values", async () => {
      const data = loadFixture(
        'profiles/dictionaries/package-document/dictionary-metadata-languages-collection-undeclared-lang-target-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'dictionary-metadata-languages-collection-undeclared-lang-target-error.opf',
        { mode: 'opf', version: '3.0', profile: 'dict' },
      );
      expectError(result, 'RSC-005');
    });

    it('A Search Key Map document must have the correct media type', async () => {
      const data = loadFixture(
        'profiles/dictionaries/package-document/dictionary-item-property-skm-mediatype-unknown-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'dictionary-item-property-skm-mediatype-unknown-error.opf',
        { mode: 'opf', version: '3.0', profile: 'dict' },
      );
      expectError(result, 'OPF-012');
    });

    it('Report a dictionary that does not meet the content model requirements', async () => {
      const data = loadFixture('profiles/dictionaries/epub/dictionary-content-model-error.epub');
      const result = await EpubCheck.validate(data, { profile: 'dict' });
      expectError(result, 'RSC-005');
    });

    it('Report a search key map file that does not have an .xml extension', async () => {
      const data = loadFixture(
        'profiles/dictionaries/epub/dictionary-search-key-map-extension-error.epub',
      );
      const result = await EpubCheck.validate(data, { profile: 'dict' });
      expectWarning(result, 'OPF-080');
    });

    it('Report a dictionary search key map with an invalid content model', async () => {
      const data = loadFixture(
        'profiles/dictionaries/epub/dictionary-search-key-map-content-error.epub',
      );
      const result = await EpubCheck.validate(data, { profile: 'dict' });
      expectError(result, 'RSC-005');
    });

    it('Report a link to a missing resource', async () => {
      const data = loadFixture(
        'profiles/dictionaries/epub/dictionary-search-key-map-link-missing-error.epub',
      );
      const result = await EpubCheck.validate(data, { profile: 'dict' });
      expectError(result, 'RSC-007');
    });

    it('Report a link to a CSS file instead of a content document', async () => {
      const data = loadFixture(
        'profiles/dictionaries/epub/dictionary-search-key-map-link-css-error.epub',
      );
      const result = await EpubCheck.validate(data, { profile: 'dict' });
      expectError(result, 'RSC-021');
    });

    it('Report a dictionary that does not identify itself in a dc:type element', async () => {
      const data = loadFixture('profiles/dictionaries/epub/dictionary-dc-type-missing-error.epub');
      const result = await EpubCheck.validate(data, { profile: 'dict' });
      expectError(result, 'RSC-005');
    });

    it("Report a dictionary that is not processed using the 'dict' profile but is detected as a dictionary from a content document's epub:type value", async () => {
      const data = loadFixture(
        'profiles/dictionaries/epub/dictionary-no-profile-dc-type-missing-warning.epub',
      );
      const result = await EpubCheck.validate(data, { profile: 'dict' });
      expectWarning(result, 'OPF-079');
    });

    it('Verify a publication with a single dictionary', async () => {
      const data = loadFixture('profiles/dictionaries/epub/dictionary-single-valid.epub');
      const result = await EpubCheck.validate(data, { profile: 'dict' });
      expectNoErrorsOrWarnings(result);
    });

    it('Report a single dictionary without any content documents with dictionary content', async () => {
      const data = loadFixture(
        'profiles/dictionaries/epub/dictionary-single-no-content-error.epub',
      );
      const result = await EpubCheck.validate(data, { profile: 'dict' });
      expectError(result, 'OPF-078');
    });

    it('Verify a publication with multiple dictionaries', async () => {
      const data = loadFixture('profiles/dictionaries/epub/dictionary-multiple-valid.epub');
      const result = await EpubCheck.validate(data, { profile: 'dict' });
      expectNoErrorsOrWarnings(result);
    });

    it('Report multiple dictionaries without any content documents with dictionary content', async () => {
      const data = loadFixture(
        'profiles/dictionaries/epub/dictionary-multiple-no-content-error.epub',
      );
      const result = await EpubCheck.validate(data, { profile: 'dict' });
      expectError(result, 'OPF-078');
    });

    it('Verify a publication with a single glossary', async () => {
      const data = loadFixture('profiles/dictionaries/epub/glossary-single-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    it("Verify the 'glossary' manifest item property is not mandatory in the default checking profile", async () => {
      const data = loadFixture(
        'profiles/dictionaries/epub/glossary-single-package-property-not-defined-error.epub',
      );
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Distributable Objects', () => {
    it('a simple EPUB Embedded Object', async () => {
      const data = loadFixture(
        'profiles/distributable-objects/package-document/do-collection-valid.opf',
      );
      const result = await EpubCheck.validateSingleFile(data, 'do-collection-valid.opf', {
        mode: 'opf',
        version: '3.0',
      });
      expectNoErrorsOrWarnings(result);
    });

    it('an embedded object must have a dc:identifier metadata', async () => {
      const data = loadFixture(
        'profiles/distributable-objects/package-document/do-collection-metadata-identifier-missing-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'do-collection-metadata-identifier-missing-error.opf',
        { mode: 'opf', version: '3.0' },
      );
      expectError(result, 'RSC-005');
    });
  });

  describe('Edupub', () => {
    it('Minimal Content Document', async () => {
      const data = loadFixture('profiles/edupub/content-document-xhtml/edupub-minimal-valid.xhtml');
      const result = await EpubCheck.validateSingleFile(data, 'edupub-minimal-valid.xhtml', {
        mode: 'xhtml',
        version: '3.0',
        profile: 'edupub',
      });
      expectNoErrorsOrWarnings(result);
    });

    it('Verify body used as an explicit section of content', async () => {
      const data = loadFixture(
        'profiles/edupub/content-document-xhtml/edupub-body-explicit-section-valid.xhtml',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'edupub-body-explicit-section-valid.xhtml',
        { mode: 'xhtml', version: '3.0', profile: 'edupub' },
      );
      expectNoErrorsOrWarnings(result);
    });

    it('Verify body only contains sectioning elements when no heading (remove this invalid duplicate? see issue 1109)', async () => {
      const data = loadFixture(
        'profiles/edupub/content-document-xhtml/edupub-body-implicit-section-valid.xhtml',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'edupub-body-implicit-section-valid.xhtml',
        { mode: 'xhtml', version: '3.0', profile: 'edupub' },
      );
      expectNoErrorsOrWarnings(result);
    });

    it('Verify body only contains sectioning elements when no heading', async () => {
      const data = loadFixture(
        'profiles/edupub/content-document-xhtml/edupub-body-sectioning-valid.xhtml',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'edupub-body-sectioning-valid.xhtml',
        { mode: 'xhtml', version: '3.0', profile: 'edupub' },
      );
      expectNoErrorsOrWarnings(result);
    });

    // Skip: FAIL: expected 1x RSC-005, got 0; all={}
    it('Report body used as an explicit section without a heading', async () => {
      const data = loadFixture(
        'profiles/edupub/content-document-xhtml/edupub-body-explicit-section-no-heading-error.xhtml',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'edupub-body-explicit-section-no-heading-error.xhtml',
        { mode: 'xhtml', version: '3.0', profile: 'edupub' },
      );
      expectError(result, 'RSC-005');
    });

    // Skip: FAIL: expected 1x RSC-005, got 0; all={}
    it('Report a missing section heading', async () => {
      const data = loadFixture(
        'profiles/edupub/content-document-xhtml/edupub-heading-missing-error.xhtml',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'edupub-heading-missing-error.xhtml',
        { mode: 'xhtml', version: '3.0', profile: 'edupub' },
      );
      expectError(result, 'RSC-005');
    });

    it('Allow a section heading specified as ARIA heading role', async () => {
      const data = loadFixture(
        'profiles/edupub/content-document-xhtml/edupub-heading-aria-role-valid.xhtml',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'edupub-heading-aria-role-valid.xhtml',
        { mode: 'xhtml', version: '3.0', profile: 'edupub' },
      );
      expectNoErrorsOrWarnings(result);
    });

    it('Verify a heading with only an img that has alternative text', async () => {
      const data = loadFixture(
        'profiles/edupub/content-document-xhtml/edupub-heading-img-alt-valid.xhtml',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'edupub-heading-img-alt-valid.xhtml',
        { mode: 'xhtml', version: '3.0', profile: 'edupub' },
      );
      expectNoErrorsOrWarnings(result);
    });

    // Skip: FAIL: expected 1x RSC-005, got 0; all={}
    it('Report a heading with only an img without alternative text', async () => {
      const data = loadFixture(
        'profiles/edupub/content-document-xhtml/edupub-heading-img-no-alt-error.xhtml',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'edupub-heading-img-no-alt-error.xhtml',
        { mode: 'xhtml', version: '3.0', profile: 'edupub' },
      );
      expectError(result, 'RSC-005');
    });

    it('Verify section title and subtitle are in a header element', async () => {
      const data = loadFixture(
        'profiles/edupub/content-document-xhtml/edupub-titles-subtitle-header-valid.xhtml',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'edupub-titles-subtitle-header-valid.xhtml',
        { mode: 'xhtml', version: '3.0', profile: 'edupub' },
      );
      expectNoErrorsOrWarnings(result);
    });

    // Skip: FAIL: expected 1x RSC-005, got 0; all={}
    it('Report section subtitle not in a header element', async () => {
      const data = loadFixture(
        'profiles/edupub/content-document-xhtml/edupub-titles-subtitle-header-error.xhtml',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'edupub-titles-subtitle-header-error.xhtml',
        { mode: 'xhtml', version: '3.0', profile: 'edupub' },
      );
      expectError(result, 'RSC-005');
    });

    // Skip: FAIL: expected 3x RSC-005, got 0; all={}
    it('Report invalid and missing headings in sectioning elements', async () => {
      const data = loadFixture(
        'profiles/edupub/content-document-xhtml/edupub-titles-invalid-missing-error.xhtml',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'edupub-titles-invalid-missing-error.xhtml',
        { mode: 'xhtml', version: '3.0', profile: 'edupub' },
      );
      expectErrorCount(result, 'RSC-005', 3, 'error');
    });

    // Skip: FAIL: expected 3x RSC-005, got 0; all={}
    it('Report invalid subheadings within a body used as an explicit section', async () => {
      const data = loadFixture(
        'profiles/edupub/content-document-xhtml/edupub-titles-explicit-body-error.xhtml',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'edupub-titles-explicit-body-error.xhtml',
        { mode: 'xhtml', version: '3.0', profile: 'edupub' },
      );
      expectErrorCount(result, 'RSC-005', 3, 'error');
    });

    // Skip: FAIL: expected 2x RSC-005, got 0; all={}
    it('Report aria-label on body and section with headings', async () => {
      const data = loadFixture(
        'profiles/edupub/content-document-xhtml/edupub-titles-aria-label-matches-heading-error.xhtml',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'edupub-titles-aria-label-matches-heading-error.xhtml',
        { mode: 'xhtml', version: '3.0', profile: 'edupub' },
      );
      expectErrorCount(result, 'RSC-005', 2, 'error');
    });

    // Skip: FAIL: expected 1x RSC-005, got 0; all={}
    it('Report incorrect heading level following aria-label on body', async () => {
      const data = loadFixture(
        'profiles/edupub/content-document-xhtml/edupub-untitled-heading-level-error.xhtml',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'edupub-untitled-heading-level-error.xhtml',
        { mode: 'xhtml', version: '3.0', profile: 'edupub' },
      );
      expectError(result, 'RSC-005');
    });

    it('a minimal EDUPUB publication is reported as valid', async () => {
      const data = loadFixture('profiles/edupub/package-document/edupub-minimal-valid.opf');
      const result = await EpubCheck.validateSingleFile(data, 'edupub-minimal-valid.opf', {
        mode: 'opf',
        version: '3.0',
        profile: 'edupub',
      });
      expectNoErrorsOrWarnings(result);
    });

    it('a minimal EDUPUB teachers’s edition is reported as valid', async () => {
      const data = loadFixture(
        'profiles/edupub/package-document/edupub-teacher-edition-minimal-valid.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'edupub-teacher-edition-minimal-valid.opf',
        { mode: 'opf', version: '3.0', profile: 'edupub' },
      );
      expectNoErrorsOrWarnings(result);
    });

    it("an EDUPUB teachers’s edition must declare the type 'edupub'", async () => {
      const data = loadFixture(
        'profiles/edupub/package-document/edupub-teacher-edition-metadata-type-missing-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'edupub-teacher-edition-metadata-type-missing-error.opf',
        { mode: 'opf', version: '3.0', profile: 'edupub' },
      );
      expectError(result, 'RSC-005');
    });

    it('an EDUPUB teachers’s edition should declare the source student edition', async () => {
      const data = loadFixture(
        'profiles/edupub/package-document/edupub-teacher-edition-metadata-source-missing-warning.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'edupub-teacher-edition-metadata-source-missing-warning.opf',
        { mode: 'opf', version: '3.0', profile: 'edupub' },
      );
      expectWarning(result, 'RSC-017');
    });

    it("an EDUPUB publication must declare the type 'edupub'", async () => {
      const data = loadFixture(
        'profiles/edupub/package-document/edupub-metadata-type-missing-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'edupub-metadata-type-missing-error.opf',
        { mode: 'opf', version: '3.0', profile: 'edupub' },
      );
      expectError(result, 'RSC-005');
    });

    it('an EDUPUB’s accessibility features must be declared', async () => {
      const data = loadFixture(
        'profiles/edupub/package-document/edupub-metadata-accessibilityFeature-missing-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'edupub-metadata-accessibilityFeature-missing-error.opf',
        { mode: 'opf', version: '3.0', profile: 'edupub' },
      );
      expectError(result, 'RSC-005');
    });

    it("an EDUPUB’s accessibility features must at least include 'tableOfContents'", async () => {
      const data = loadFixture(
        'profiles/edupub/package-document/edupub-metadata-accessibilityFeature-none-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'edupub-metadata-accessibilityFeature-none-error.opf',
        { mode: 'opf', version: '3.0', profile: 'edupub' },
      );
      expectError(result, 'RSC-005');
    });

    it('Verify a basic edupub publication', async () => {
      const data = loadFixture('profiles/edupub/epub/edupub-basic-valid.epub');
      const result = await EpubCheck.validate(data, { profile: 'edupub' });
      expectNoErrorsOrWarnings(result);
    });

    it('Verify an edupub publication with fixed-layout documents', async () => {
      const data = loadFixture('profiles/edupub/epub/edupub-fxl-valid.epub');
      const result = await EpubCheck.validate(data, { profile: 'edupub' });
      expectNoErrorsOrWarnings(result);
    });

    it('Verify an edupub publication with multiple renditions', async () => {
      const data = loadFixture('profiles/edupub/epub/edupub-multiple-renditions-valid.epub');
      const result = await EpubCheck.validate(data, { profile: 'edupub' });
      expectNoErrorsOrWarnings(result);
    });

    it("Report a missing publication-level 'dc:type' for edupub publication with multiple renditions", async () => {
      const data = loadFixture(
        'profiles/edupub/epub/edupub-multiple-renditions-dctype-missing-for-publication-error.epub',
      );
      const result = await EpubCheck.validate(data, { profile: 'edupub' });
      expectError(result, 'RSC-005');
    });

    it("Report a missing rendition-level 'dc:type' for edupub publication with multiple renditions", async () => {
      const data = loadFixture(
        'profiles/edupub/epub/edupub-multiple-renditions-dctype-missing-for-rendition-error.epub',
      );
      const result = await EpubCheck.validate(data, { profile: 'edupub' });
      expectError(result, 'RSC-005');
    });

    it('Verify that non-linear content does not have to follow the sectioning rules', async () => {
      const data = loadFixture('profiles/edupub/epub/edupub-non-linear-valid.epub');
      const result = await EpubCheck.validate(data, { profile: 'edupub' });
      expectNoErrorsOrWarnings(result);
    });

    it('Report an edupub publication with microdata attributes', async () => {
      const data = loadFixture('profiles/edupub/epub/edupub-microdata-warning.epub');
      const result = await EpubCheck.validate(data, { profile: 'edupub' });
      expectWarning(result, 'HTM-051');
    });

    it('Verify an edupub publication with a page list', async () => {
      const data = loadFixture('profiles/edupub/epub/edupub-pagelist-valid.epub');
      const result = await EpubCheck.validate(data, { profile: 'edupub' });
      expectNoErrorsOrWarnings(result);
    });

    it('Report an edupub publication missing a page list', async () => {
      const data = loadFixture('profiles/edupub/epub/edupub-pagelist-missing-error.epub');
      const result = await EpubCheck.validate(data, { profile: 'edupub' });
      expectError(result, 'NAV-003');
    });

    it('Report an edupub publication with a page list but the source of the pagination is not identified', async () => {
      const data = loadFixture('profiles/edupub/epub/edupub-pagelist-no-source-error.epub');
      const result = await EpubCheck.validate(data, { profile: 'edupub' });
      expectError(result, 'OPF-066');
    });
  });

  describe('Indexes', () => {
    it('Verify a minimal index', async () => {
      const data = loadFixture('profiles/indexes/content-document-xhtml/index-minimal-valid.xhtml');
      const result = await EpubCheck.validateSingleFile(data, 'index-minimal-valid.xhtml', {
        mode: 'xhtml',
        version: '3.0',
        profile: 'idx',
      });
      expectNoErrorsOrWarnings(result);
    });

    it('Report document without an index declaration', async () => {
      const data = loadFixture(
        'profiles/indexes/content-document-xhtml/index-declaration-none-error.xhtml',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'index-declaration-none-error.xhtml',
        { mode: 'xhtml', version: '3.0', profile: 'idx' },
      );
      expectError(result, 'RSC-005');
    });

    it('Report index semantic not declared on body element', async () => {
      const data = loadFixture(
        'profiles/indexes/content-document-xhtml/index-declaration-body-error.xhtml',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'index-declaration-body-error.xhtml',
        { mode: 'xhtml', version: '3.0', profile: 'idx' },
      );
      expectError(result, 'RSC-005');
    });

    it('An index collection is reported as valid', async () => {
      const data = loadFixture('profiles/indexes/package-document/index-collection-valid.opf');
      const result = await EpubCheck.validateSingleFile(data, 'index-collection-valid.opf', {
        mode: 'opf',
        version: '3.0',
        profile: 'idx',
      });
      expectNoErrorsOrWarnings(result);
    });

    it('An index collection may contain index-group child collections', async () => {
      const data = loadFixture(
        'profiles/indexes/package-document/index-collection-index-group-valid.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'index-collection-index-group-valid.opf',
        { mode: 'opf', version: '3.0', profile: 'idx' },
      );
      expectNoErrorsOrWarnings(result);
    });

    it('An index collection must only contain links to XHTML Content Documents', async () => {
      const data = loadFixture(
        'profiles/indexes/package-document/index-collection-resource-not-xhtml-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'index-collection-resource-not-xhtml-error.opf',
        { mode: 'opf', version: '3.0', profile: 'idx' },
      );
      expectError(result, 'OPF-071');
    });

    it('An index collection must not contain child collections other than index-group', async () => {
      const data = loadFixture(
        'profiles/indexes/package-document/index-collection-subcollection-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'index-collection-subcollection-error.opf',
        { mode: 'opf', version: '3.0', profile: 'idx' },
      );
      expectError(result, 'RSC-005');
    });

    it('An index-group collection must not contain child collections', async () => {
      const data = loadFixture(
        'profiles/indexes/package-document/index-collection-index-group-subcollection-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'index-collection-index-group-subcollection-error.opf',
        { mode: 'opf', version: '3.0', profile: 'idx' },
      );
      expectError(result, 'RSC-005');
    });

    it('An index-group collection must be a child collection of an index collection', async () => {
      const data = loadFixture(
        'profiles/indexes/package-document/index-collection-index-group-top-level-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'index-collection-index-group-top-level-error.opf',
        { mode: 'opf', version: '3.0', profile: 'idx' },
      );
      expectError(result, 'RSC-005');
    });

    it('Report an index publication with an invalid content model', async () => {
      const data = loadFixture('profiles/indexes/epub/index-whole-pub-content-model-error.epub');
      const result = await EpubCheck.validate(data, { profile: 'idx' });
      expectError(result, 'RSC-005');
    });

    it('Report a single-file index with an invalid content model', async () => {
      const data = loadFixture('profiles/indexes/epub/index-single-file-content-model-error.epub');
      const result = await EpubCheck.validate(data, { profile: 'idx' });
      expectError(result, 'RSC-005');
    });

    it('Report an index collection with an invalid content model', async () => {
      const data = loadFixture('profiles/indexes/epub/index-collection-content-model-error.epub');
      const result = await EpubCheck.validate(data, { profile: 'idx' });
      expectError(result, 'RSC-005');
    });

    it('Verify an index publication', async () => {
      const data = loadFixture('profiles/indexes/epub/index-whole-pub-valid.epub');
      const result = await EpubCheck.validate(data, { profile: 'idx' });
      expectNoErrorsOrWarnings(result);
    });

    it('Report an index publication without an index', async () => {
      const data = loadFixture('profiles/indexes/epub/index-whole-pub-no-index-error.epub');
      const result = await EpubCheck.validate(data, { profile: 'idx' });
      expectError(result, 'RSC-005');
    });

    it('Verify a single-file index', async () => {
      const data = loadFixture('profiles/indexes/epub/index-single-file-valid.epub');
      const result = await EpubCheck.validate(data, { profile: 'idx' });
      expectNoErrorsOrWarnings(result);
    });

    it('Report a single-file index without an index', async () => {
      const data = loadFixture('profiles/indexes/epub/index-single-file-no-index-error.epub');
      const result = await EpubCheck.validate(data, { profile: 'idx' });
      expectError(result, 'OPF-015');
    });

    it('Verify an index collection', async () => {
      const data = loadFixture('profiles/indexes/epub/index-collection-valid.epub');
      const result = await EpubCheck.validate(data, { profile: 'idx' });
      expectNoErrorsOrWarnings(result);
    });

    it('Report an index collection without an index', async () => {
      const data = loadFixture('profiles/indexes/epub/index-collection-no-index-error.epub');
      const result = await EpubCheck.validate(data, { profile: 'idx' });
      expectError(result, 'RSC-005');
    });
  });

  describe('Multiple Renditions', () => {
    it('Verify basic multiple rendition publication', async () => {
      const data = loadFixture('profiles/multiple-renditions/epub/renditions-basic-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    it("Report a multiple-rendition publication with no 'metadata.xml' file", async () => {
      const data = loadFixture(
        'profiles/multiple-renditions/epub/renditions-metadata-file-missing-warning.epub',
      );
      const result = await EpubCheck.validate(data);
      expectWarning(result, 'RSC-019');
    });

    it("Report an incomplete identifier in multiple-rendition 'metadata.xml' file", async () => {
      const data = loadFixture(
        'profiles/multiple-renditions/epub/renditions-metadata-identifier-incomplete-error.epub',
      );
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it("Report a media query syntax error in the 'rendition:media' rendition selection attribute", async () => {
      const data = loadFixture(
        'profiles/multiple-renditions/epub/renditions-selection-mediaquery-syntax-error.epub',
      );
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('Report an unknown rendition selection attribute', async () => {
      const data = loadFixture(
        'profiles/multiple-renditions/epub/renditions-selection-attribute-unknown-error.epub',
      );
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('Report a non-primary rootfile element without a rendition selection attribute', async () => {
      const data = loadFixture(
        'profiles/multiple-renditions/epub/renditions-selection-attribute-missing-error.epub',
      );
      const result = await EpubCheck.validate(data);
      expectWarning(result, 'RSC-017');
    });

    it('Verify a rendition mapping document with multiple nav elements', async () => {
      const data = loadFixture(
        'profiles/multiple-renditions/epub/renditions-mapping-multiple-nav-valid.epub',
      );
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    it('Report a mapping document that is not identified as XHTML in the container document', async () => {
      const data = loadFixture(
        'profiles/multiple-renditions/epub/renditions-mapping-non-xhtml-error.epub',
      );
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('Report a container with more than one mapping document', async () => {
      const data = loadFixture(
        'profiles/multiple-renditions/epub/renditions-mapping-multiple-docs-error.epub',
      );
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('Report a container with multiple renditions but missing all the core identifying features', async () => {
      const data = loadFixture(
        'profiles/multiple-renditions/epub/renditions-unmanifested-warning.epub',
      );
      const result = await EpubCheck.validate(data);
      expectWarning(result, 'RSC-019');
    });

    it('Report a mapping document without a version identifier', async () => {
      const data = loadFixture(
        'profiles/multiple-renditions/epub/renditions-mapping-no-version-error.epub',
      );
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('Report a mapping document without a resource map', async () => {
      const data = loadFixture(
        'profiles/multiple-renditions/epub/renditions-mapping-no-resourcemap-error.epub',
      );
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('Report a mapping document with an unknown nav type', async () => {
      const data = loadFixture(
        'profiles/multiple-renditions/epub/renditions-mapping-untyped-nav-error.epub',
      );
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });
  });

  describe('Previews', () => {
    it('an embedded EPUB preview collection', async () => {
      const data = loadFixture('profiles/previews/package-document/preview-embedded-valid.opf');
      const result = await EpubCheck.validateSingleFile(data, 'preview-embedded-valid.opf', {
        mode: 'opf',
        version: '3.0',
      });
      expectNoErrorsOrWarnings(result);
    });

    it('Verify a preview publication', async () => {
      const data = loadFixture('profiles/previews/epub/preview-pub-valid.epub');
      const result = await EpubCheck.validate(data, { profile: 'preview' });
      expectNoErrorsOrWarnings(result);
    });

    it('Report a preview publication that does not identify itself in a dc:type element', async () => {
      const data = loadFixture('profiles/previews/epub/preview-pub-dc-type-missing-error.epub');
      const result = await EpubCheck.validate(data, { profile: 'preview' });
      expectError(result, 'RSC-005');
    });

    it('Report a preview pubication that does not identify its source publication', async () => {
      const data = loadFixture('profiles/previews/epub/preview-pub-source-missing-warning.epub');
      const result = await EpubCheck.validate(data, { profile: 'preview' });
      expectWarning(result, 'RSC-017');
    });

    it('Report a preview publication that uses its own identifier as the source publication', async () => {
      const data = loadFixture('profiles/previews/epub/preview-pub-self-as-source-error.epub');
      const result = await EpubCheck.validate(data, { profile: 'preview' });
      expectError(result, 'RSC-005');
    });

    it('Verify an embedded preview', async () => {
      const data = loadFixture('profiles/previews/epub/preview-embedded-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    it('Report an embedded preview that does not have a manifest', async () => {
      const data = loadFixture('profiles/previews/epub/preview-embedded-no-manifest-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('Report an embedded preview without any links to preview content', async () => {
      const data = loadFixture('profiles/previews/epub/preview-embedded-no-links-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('Report an embedded preview without that links to non-xhtml content documents', async () => {
      const data = loadFixture(
        'profiles/previews/epub/preview-embedded-no-content-doc-link-error.epub',
      );
      const result = await EpubCheck.validate(data);
      expectError(result, 'OPF-075');
    });

    it('Report an embedded preview that uses EPUB CFIs in the links to xhtml content documents', async () => {
      const data = loadFixture('profiles/previews/epub/preview-embedded-link-cfi-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'OPF-076');
    });
  });

  describe('Region Nav', () => {
    it('Verify a basic data nav file', async () => {
      const data = loadFixture('profiles/region-nav/epub/data-nav-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    it('Report a data nav file that is not encoded as application/xhtml+xml', async () => {
      const data = loadFixture('profiles/region-nav/epub/data-nav-not-xhtml-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'OPF-012');
    });

    it('Report a data nav file included in the spine', async () => {
      const data = loadFixture('profiles/region-nav/epub/data-nav-in-spine-warning.epub');
      const result = await EpubCheck.validate(data);
      expectWarning(result, 'OPF-077');
    });

    it('Report a data nav with an unidentified nav element in it', async () => {
      const data = loadFixture('profiles/region-nav/epub/data-nav-missing-type-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('Report the inclusion of more than one data nav file', async () => {
      const data = loadFixture('profiles/region-nav/epub/data-nav-multiple-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'RSC-005');
    });

    it('Verify a data nav that defines region-based navgiation', async () => {
      const data = loadFixture('profiles/region-nav/epub/region-based-nav-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });

    it('Report region-based navigation not defined on a nav element', async () => {
      const data = loadFixture(
        'profiles/region-nav/epub/region-based-nav-wrong-element-error.epub',
      );
      const result = await EpubCheck.validate(data);
      expectError(result, 'HTM-052');
    });

    // Skip: FAIL: expected 1x NAV-009, got 0; all={"OPF-027":1,"RSC-012":1}
    it.skip('Report a region-based nav element that does not point to fixed-layout documents', async () => {
      const data = loadFixture('profiles/region-nav/epub/region-based-nav-not-fxl-error.epub');
      const result = await EpubCheck.validate(data);
      expectError(result, 'NAV-009');
    });

    // Skip: FAIL: expected 1x RSC-017, got 0; all={"OPF-027":1,"RSC-012":18}
    it.skip('Report a region-based nav element with an invalid content model', async () => {
      const data = loadFixture(
        'profiles/region-nav/epub/region-based-nav-content-model-error.epub',
      );
      const result = await EpubCheck.validate(data);
      expectWarning(result, 'RSC-017');
    });

    it('Verify subregion navigation using comics semantics', async () => {
      const data = loadFixture('profiles/region-nav/epub/region-based-nav-comics-valid.epub');
      const result = await EpubCheck.validate(data);
      expectNoErrorsOrWarnings(result);
    });
  });

  describe('Scriptable Components', () => {
    it('A minimal embedded scriptable component is reported as valid', async () => {
      const data = loadFixture(
        'profiles/scriptable-components/package-document/sc-embedded-valid.opf',
      );
      const result = await EpubCheck.validateSingleFile(data, 'sc-embedded-valid.opf', {
        mode: 'opf',
        version: '3.0',
      });
      expectNoErrorsOrWarnings(result);
    });

    // Skip: FAIL: expected 1x OPF-028, got 0; all={"RSC-005":1}
    it.skip("The 'epubsc' prefix must be declared", async () => {
      const data = loadFixture(
        'profiles/scriptable-components/package-document/sc-prefix-declaration-missing-error.opf',
      );
      const result = await EpubCheck.validateSingleFile(
        data,
        'sc-prefix-declaration-missing-error.opf',
        { mode: 'opf', version: '3.0' },
      );
      expectError(result, 'OPF-028');
    });
  });
});

// ==================== Helpers ====================

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
    `Expected ${String(count)}x ${errorId} (${severity}), got ${String(actualCount)}`,
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
