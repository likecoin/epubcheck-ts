# EPUBCheck-TS Project Status

Quick reference for implementation progress vs Java EPUBCheck.

## Overview

| Category | Completion | Status |
|----------|------------|--------|
| OCF Validation | ~90% | 🟢 URL leaking, UTF-8, spaces, forbidden chars all done |
| OPF Validation | ~85% | 🟢 Link elements, self-reference, remote resources done |
| Content (XHTML/SVG) | ~75% | 🟢 CSS url() references, @import validation done |
| CSS Validation | ~70% | 🟢 url() extraction from declarations, @font-face src |
| Navigation (nav/NCX) | ~40% | 🟡 Basic nav done, NCX strong |
| Schema Validation | ~50% | 🟡 RelaxNG for OPF/container; XHTML/SVG disabled (libxml2 limitation) |
| Media Overlays | 0% | ❌ Not implemented |
| Accessibility | ~30% | 🟡 Basic checks only (ACC-004/005/009/011) |
| Cross-reference | ~80% | 🟢 URL leaking, CSS references, link elements done |

**Overall: ~70% complete (476 tests passing, 28 skipped)**

---

## Test Coverage

### Current Test Suite

| Category | Tests | Passed | Skipped |
|----------|-------|--------|---------|
| **Unit Tests** | 408 | 391 | 17 |
| **Integration Tests** | 96 | 85 | 11 |
| **Total** | **504** | **476** | **28** |

### Integration Test Files

```
test/integration/
├── epub.test.ts                 # 4 tests  - Basic EPUB validation
├── ocf.integration.test.ts      # 30 tests (27 pass, 3 skip) - OCF/ZIP/container
├── opf.integration.test.ts      # 23 tests (23 pass, 0 skip) - Package document
├── content.integration.test.ts  # 26 tests (21 pass, 5 skip) - XHTML/CSS/SVG
├── nav.integration.test.ts      # 5 tests  (5 pass, 0 skip)  - Navigation
└── resources.integration.test.ts # 8 tests  (6 pass, 2 skip)  - Remote resources
```

**Note**: Integration tests imported from Java EPUBCheck test suite (`/Users/william/epubcheck/src/test/resources/epub3/`).

### Test Fixtures

```
test/fixtures/
├── valid/                 # 33 valid EPUBs
├── invalid/
│   ├── ocf/              # 25 OCF error cases
│   ├── opf/              # 15 OPF error cases
│   ├── content/          # 16 content error cases
│   └── nav/              # 4 navigation error cases
└── warnings/             # 8 warning cases
```

**Total**: 101 EPUB test fixtures (imported from Java EPUBCheck)

### Quality: ⭐⭐⭐⭐ (4/5) for implemented features

**Strong areas:**
- NCX validation (24 tests - better than Java's 8 scenarios)
- CSS validation (57 tests - better granularity than Java's 19)
- Cross-reference validation (48 tests)
- Fast execution (~700ms vs Java's integration-heavy suite)

**Critical gaps:**
- ❌ **ARIA validation** - No role/attribute checks (Java has dozens)
- ❌ **ID/IDREF validation** - No duplicate detection
- ❌ **DOCTYPE validation** - No obsolete identifier checks
- ❌ **Entity validation** - No external entity checks
- ❌ **Base URL** - No xml:base or HTML base support
- ❌ **Advanced accessibility** - Only 30% of Java coverage
- ❌ **Media overlays** - Not implemented

### Skipped Tests

**Unit tests (13)** - Various reasons:
- **libxml2-wasm XPath limitations (3)**:
  - `test/unit/content/validator.test.ts:257` - OPF-014 inline event handlers
  - `test/unit/content/validator.test.ts:514` - CSS-005 conflicting stylesheets
  - `test/unit/content/validator.test.ts:655` - OPF-088 unknown epub:type prefix
- **Messages suppressed in Java EPUBCheck (10)**:
  - NCX-002 (2 tests) - Invalid NCX reference
  - NCX-003 (2 tests) - NavPoint missing text content
  - NAV-002 (3 tests) - Missing toc nav ol element
  - ACC-004 (1 test) - Anchor element must have text
  - ACC-005 (1 test) - Image missing alt attribute
  - HTM-012 (1 test) - Unescaped ampersands

**Integration tests (7)** - Library limitations:
- **CSS-008**: CSS syntax error detection (1 test) - css-tree is forgiving, parses invalid CSS successfully
- **OPF-060**: Duplicate ZIP entry detection (1 test) - fflate deduplicates entries when unzipping
- **Unicode NFKC normalization** (1 test) - Requires compatibility normalization, not implemented
- **Unicode NFC normalization for diacritics** (1 test) - Requires composed/precomposed char comparison
- **Unicode NFC normalization duplicate** (1 test) - Already handled, test expects NFKC
- **Unit tests (3)** - libxml2-wasm XPath with namespaced attributes

---

## What Works Well

### ✅ Fully Implemented
- **Mimetype validation** (PKG-005/006/007)
- **Container.xml** (RSC-002/005, PKG-004)
- **Package attributes** (OPF-001/030/048/099 - self-referencing manifest)
- **Required metadata** (OPF-015/016/017)
- **Manifest validation** (RSC-001, OPF-012/013/014/074/091)
- **Spine validation** (OPF-033/034/043/049/050)
- **Fallback chains** (OPF-040/045)
- **Collections** (OPF-071-084)
- **NCX validation** (NCX-001/002/003/006)
- **CSS validation** (@font-face, @import, url(), position, forbidden properties CSS-001)
- **Navigation** (NAV-001/002/010)
- **Link element validation** (RSC-007w warning for missing resources)
- **URL leaking detection** (RSC-026 for path-absolute URLs)
- **Scripted property** (OPF-014)
- **MathML/SVG properties** (OPF-014)
- **Remote resources property** (OPF-014)
- **Basic accessibility** (ACC-009/011 active; ACC-004/005 suppressed in Java)
- **Cross-references** (RSC-006/007/008/009/010/011/012/013/014/020/026/027/028/029/031)
- **Filename validation** (PKG-009/010/011/027)
- **Duplicate filename detection** (OPF-060) - Unicode NFC normalization, case folding
- **Non-UTF8 filename detection** (PKG-027)
- **Cite attribute validation** (RSC-007 for blockquote/q/ins/del cite attributes)
- **Unreferenced resources** (OPF-097)
- **Percent-encoded URLs** - Proper handling of URL-encoded paths

### 🟡 Partially Implemented
- **Schema validation** - RelaxNG for OPF/container works; XHTML/SVG RelaxNG disabled (libxml2-wasm doesn't support complex patterns)
- **Content validation** - Core structure good, missing ARIA/DOCTYPE/entities; Schematron validation works
- **Image validation** - MED-001/OPF-051 work, no format/size checks

### ❌ Not Implemented
- Media overlays validation
- Encryption.xml validation
- Signatures.xml validation
- Metadata.xml (multiple renditions)
- Advanced accessibility (WCAG 2.0 comprehensive)
- ARIA roles and attributes
- DOCTYPE obsolete identifiers
- External entity validation
- Base URL handling (xml:base, HTML base)
- Duplicate ID detection (OPF-060)
- Non-UTF8 filename detection (PKG-027)
- Media format validation (image magic numbers, corrupt files)

---

## Known Issues

1. **fflate ZIP deduplication** - The fflate library automatically deduplicates ZIP entries when unzipping, making it impossible to detect duplicate entries (affects 1 skipped test)
2. **css-tree syntax error handling** - The CSS parser is designed to be forgiving and successfully parses many invalid CSS snippets, making syntax error detection difficult (affects 1 skipped test)
3. **libxml2-wasm XPath limitations** - Queries for namespaced attributes don't work properly (affects 3 skipped unit tests)
4. **libxml2-wasm RelaxNG limitations** - Cannot parse XHTML/SVG schemas due to complex recursive patterns (`oneOrMore//interleave//attribute`). Java uses Jing which handles these. XHTML/SVG RelaxNG validation disabled; content validated via Schematron instead.
5. **Schematron XSLT 2.0** - Some XSLT 2.0 functions not fully supported by fontoxpath
6. **RelaxNG deprecation** - libxml2 plans to remove RelaxNG support in future
7. **Unicode NFKC normalization** - Not implemented (affects 1 skipped test)

---

## E2E Test Coverage vs Java

### Current Coverage

| Java Category | Java Scenarios | TS Ported | TS Passing | Coverage |
|---------------|----------------|-----------|------------|----------|
| 00-minimal | 5 | 4 | 4 | 80% |
| 03-resources | 113 | 15 | ~10 | 9% |
| 04-ocf | 61 | 33 | 21 | 34% |
| 05-package-document | 121 | 18 | 13 | 11% |
| 06-content-document | 215 | 11 | 8 | 4% |
| 07-navigation-document | 40 | 5 | 5 | 12.5% |
| 08-layout | 51 | 0 | 0 | 0% |
| 09-media-overlays | 51 | 0 | 0 | 0% |
| D-vocabularies (ARIA) | 56 | 0 | 0 | 0% |
| Other | 6 | 0 | 0 | 0% |
| **Total** | **719** | **71** | **63** | **9%** |

### E2E Porting Priorities

**High Priority** - Core validation parity:
1. **05-package-document** (121 scenarios) - OPF is central to validation
2. **04-ocf** (61 scenarios) - Already 34%, finish remaining
3. **03-resources** (113 scenarios) - Cross-reference validation

**Medium Priority** - Content completeness:
4. **06-content-document** (215 scenarios) - Largest gap, needs ARIA/DOCTYPE
5. **07-navigation-document** (40 scenarios) - Nav validation
6. **D-vocabularies** (56 scenarios) - ARIA roles, epub:type

**Low Priority** - Specialized features:
7. **08-layout** (51 scenarios) - Rendition/viewport
8. **09-media-overlays** (51 scenarios) - SMIL validation (not implemented)

---

## E2E Test Porting Roadmap

### Tests Ready to Port (Features Already Implemented)

The following tests from Java EPUBCheck can be added immediately without new implementation:

#### 1. OCF Tests (04-ocf) - 16 tests ready

| Test Fixture | Feature | Message ID |
|--------------|---------|------------|
| `ocf-obfuscation-valid.epub` | Font obfuscation | PKG-026 |
| `ocf-obfuscation-duplicate-valid.epub` | Duplicate encryption | PKG-026 |
| `ocf-obfuscation-not-cmt-error.epub` | Non-CMT obfuscation | PKG-026 |
| `ocf-obfuscation-not-font-error.epub` | Non-font obfuscation | PKG-026 |
| `ocf-encryption-content-model-error` | Encryption.xml structure | RSC-005 |
| `ocf-encryption-unknown-valid` | Encryption info message | RSC-004 |
| `ocf-encryption-duplicate-ids-error` | Duplicate encryption IDs | RSC-005 |
| `ocf-signatures-content-model-error` | Signatures.xml structure | RSC-005 |
| `ocf-filename-character-non-ascii-usage` | Non-ASCII filename info | PKG-012 |
| `url-xhtml-cite-absolute-valid` | Absolute cite URLs | RSC-007 |
| `url-xhtml-iframe-missing-resource-error` | Missing iframe resource | RSC-007 |
| `url-xhtml-track-missing-resource-error` | Missing track resource | RSC-007 |
| `ocf-container-filename-character-forbidden-error.opf` | Forbidden container chars | PKG-009 |
| `ocf-filename-character-forbidden-in-remote-URL-valid.opf` | Forbidden chars in remote | PKG-009 |

#### 2. Package Document Tests (05-package-document) - 45 tests ready

**Metadata validation (15 tests):**
| Test Fixture | Feature | Message ID |
|--------------|---------|------------|
| `metadata-identifier-empty-error.opf` | Empty identifier | OPF-015 |
| `metadata-identifier-uuid-invalid-warning.opf` | Invalid UUID format | OPF-085 |
| `metadata-language-empty-error.opf` | Empty language | OPF-017 |
| `metadata-language-not-well-formed-error.opf` | Invalid language | OPF-092 |
| `metadata-title-empty-error.opf` | Empty title | OPF-016 |
| `metadata-title-missing-error.opf` | Missing title | OPF-016 |
| `metadata-date-iso-syntax-error-warning.opf` | Invalid ISO date | OPF-053 |
| `metadata-date-multiple-error.opf` | Multiple dates | RSC-005 |
| `metadata-date-single-year-valid.opub` | Single year date | - |
| `metadata-date-unknown-format-warning.opub` | Unknown date format | OPF-053 |
| `metadata-date-with-whitespace-valid.opub` | Date with whitespace | - |
| `metadata-modified-missing-error.opub` | Missing dcterms:modified | OPF-015 |
| `metadata-modified-syntax-error.opub` | Invalid modified date | OPF-053 |
| `metadata-meta-property-empty-error.opf` | Empty property | RSC-005 |
| `metadata-meta-property-list-error.opf` | Property list | OPF-025 |
| `metadata-meta-property-malformed-error.opf` | Malformed property | OPF-026 |
| `metadata-meta-scheme-list-error.opf` | Scheme list | RSC-005 |
| `metadata-meta-scheme-unknown-error.opub` | Unknown scheme | - |
| `metadata-meta-scheme-valid.opub` | Valid scheme | - |
| `metadata-meta-value-empty-error.opf` | Empty meta value | RSC-005 |
| `metadata-refines-cycle-error.opub` | Refines cycle | OPF-065 |
| `metadata-refines-not-a-fragment-warning.opub` | Non-fragment refines | RSC-017 |
| `metadata-refines-not-relative-error.opub` | Non-relative refines | RSC-005 |
| `metadata-refines-unknown-id-error.opub` | Unknown refines target | RSC-005 |

**Link element validation (8 tests):**
| Test Fixture | Feature | Message ID |
|--------------|---------|------------|
| `link-hreflang-empty-valid.opub` | Empty hreflang | - |
| `link-hreflang-not-well-formed-error.opub` | Invalid hreflang | RSC-005 |
| `link-hreflang-valid.opub` | Valid hreflang | - |
| `link-hreflang-whitespace-error.opub` | Whitespace in hreflang | RSC-005 |
| `package-link-media-type-missing-local-error` | Missing media-type local | RSC-007 |
| `package-link-media-type-missing-remote-valid` | Media-type optional remote | - |
| `link-rel-multiple-properties-valid.opub` | Multiple rel | - |
| `link-rel-record-properties-empty-error.opub` | Empty rel properties | RSC-005 |
| `link-rel-record-properties-undefined-error.opub` | Undefined rel properties | - |
| `link-to-package-document-id-error.opub` | Link to package ID | OPF-098 |
| `link-to-spine-item-valid.opub` | Link to spine item | - |

**Manifest/item validation (7 tests):**
| Test Fixture | Feature | Message ID |
|--------------|---------|------------|
| `item-duplicate-resource-error.opub` | Duplicate resource | OPF-074 |
| `item-href-contains-spaces-unencoded-error.opub` | Unencoded spaces | PKG-010 |
| `item-media-type-missing-error.opub` | Missing media-type | RSC-005 |
| `item-nav-missing-error.opub` | Missing nav | OPF-030 |
| `item-nav-multiple-error.opub` | Multiple nav items | OPF-030 |
| `item-nav-not-xhtml-error.opub` | Nav not XHTML | OPF-030 |
| `item-property-cover-image-multiple-error.opub` | Multiple cover images | RSC-005 |
| `item-property-cover-image-webp-valid.opub` | WebP cover image | - |
| `item-property-cover-image-wrongtype-error.opub` | Cover image wrong type | RSC-005 |
| `item-property-unknown-error.opub` | Unknown property | - |

**Collections validation (3 tests):**
| Test Fixture | Feature | Message ID |
|--------------|---------|------------|
| `collection-role-manifest-toplevel-error.opub` | Collection role placement | OPF-072 |
| `collection-role-url-invalid-error.opub` | Invalid collection URL | OPF-073 |
| `collection-role-url-valid.opub` | Valid collection URL | - |

**Remote resources validation (12 tests):**
| Test Fixture | Feature | Message ID |
|--------------|---------|------------|
| `package-remote-audio-in-overlays-missing-property-error` | Remote audio in overlays | OPF-014 |
| `package-remote-audio-missing-property-error` | Remote audio property | OPF-014 |
| `package-remote-audio-sources-undeclared-error` | Undeclared audio sources | RSC-007 |
| `package-remote-audio-undeclared-error` | Undeclared remote audio | RSC-007 |
| `package-remote-font-in-css-missing-property-error` | Remote font in CSS | OPF-014 |
| `package-remote-font-in-inline-css-missing-property-error` | Remote font inline CSS | OPF-014 |
| `package-remote-font-in-svg-missing-property-error` | Remote font in SVG | OPF-014 |
| `package-remote-font-in-xhtml-missing-property-error` | Remote font in XHTML | OPF-014 |
| `package-remote-font-undeclared-error` | Undeclared remote font | RSC-007 |
| `package-remote-img-in-link-error` | Remote img in link | RSC-006 |
| `package-remote-resource-and-inline-css-valid` | Remote with inline CSS | - |
| `package-manifest-prop-remote-resource-declared-but-unnecessary-error` | Unnecessary remote property | - |
| `package-manifest-prop-remote-resource-object-param-warning` | Remote object param | OPF-014 |

**Package attributes/spine (8 tests):**
| Test Fixture | Feature | Message ID |
|--------------|---------|------------|
| `package-unique-identifier-attribute-missing-error.opub` | Missing unique-identifier | OPF-048 |
| `package-unique-identifier-not-targeting-identifier-error.opub` | Unique-identifier target | RSC-005 |
| `package-unique-identifier-unknown-error.opub` | Unknown unique-identifier | RSC-005 |
| `package-manifest-before-metadata-error.opub` | Manifest before metadata | RSC-005 |
| `spine-item-svg-valid.opub` | SVG in spine | - |
| `spine-nonlinear-not-reachable` | Non-linear not reachable | - |
| `spine-nonlinear-reachable-via-hyperlink-valid` | Reachable via hyperlink | - |
| `spine-nonlinear-reachable-via-nav-valid` | Reachable via nav | - |
| `spine-nonlinear-reachable-via-script-valid` | Reachable via script | - |
| `spine-not-listing-hyperlink-target-error` | Spine missing hyperlink target | - |
| `spine-not-listing-navigation-document-target-error` | Spine missing nav target | - |

**Legacy/other (5 tests):**
| Test Fixture | Feature | Message ID |
|--------------|---------|------------|
| `legacy-guide-duplicates-warning.opub` | Duplicate guide entries | - |
| `legacy-ncx-toc-attribute-missing-error.opub` | Missing NCX toc | OPF-012 |
| `legacy-ncx-toc-attribute-not-ncx-error.opub` | NCX toc not NCX | RSC-005 |
| `bindings-deprecated-warning.opub` | Deprecated bindings | - |
| `attr-dir-auto-valid.opub` | dir="auto" | - |
| `attr-id-duplicate-error.opub` | Duplicate ID | RSC-005 |
| `attr-id-duplicate-with-spaces-error.opub` | Duplicate ID whitespace | RSC-005 |
| `attr-id-with-spaces-valid.opub` | ID with spaces | - |

#### 3. Navigation Document Tests (07-navigation-document) - 30 tests ready

**Nav content model (12 tests):**
| Test Fixture | Feature | Message ID |
|--------------|---------|------------|
| `content-model-heading-empty-error.xhtml` | Empty nav heading | RSC-005 |
| `content-model-heading-p-error.xhtml` | P element as heading | RSC-005 |
| `content-model-li-label-missing-error.xhtml` | Missing list item label | RSC-005 |
| `content-model-li-label-empty-error.xhtml` | Empty list item label | RSC-005 |
| `content-model-li-label-multiple-images-valid.xhtml` | Multiple images in label | - |
| `content-model-li-leaf-with-no-link-error.xhtml` | Leaf with no link | RSC-005 |
| `content-model-a-empty-error.xhtml` | Empty anchor | RSC-005 |
| `content-model-a-multiple-images-valid.xhtml` | Multiple images in anchor | - |
| `content-model-a-span-empty-error.xhtml` | Empty span in anchor | RSC-005 |
| `content-model-a-with-leading-trailing-spaces-valid.xhtml` | Leading/trailing spaces | - |
| `content-model-ol-empty-error.xhtml` | Empty ordered list | RSC-005 |
| `nav-toc-nested-valid.xhtml` | Nested TOC nav | - |
| `nav-toc-missing-references-to-spine-valid` | TOC missing spine refs | - |

**Nav types validation (15 tests):**
| Test Fixture | Feature | Message ID |
|--------------|---------|------------|
| `nav-page-list-valid.xhtml` | Valid page list | - |
| `nav-page-list-multiple-error.xhtml` | Multiple page-list nav | RSC-005 |
| `nav-page-list-reading-order-valid` | Page list reading order | - |
| `nav-page-list-unordered-spine-warning` | Page list spine unordered | (NAV-011 needed) |
| `nav-landmarks-valid.xhtml` | Valid landmarks nav | - |
| `nav-landmarks-link-type-missing-error.xhtml` | Missing epub:type | RSC-005 |
| `nav-landmarks-multiple-error.xhtml` | Multiple landmarks nav | RSC-005 |
| `nav-landmarks-nested-warning.xhtml` | Nested landmarks | (RSC-017 needed) |
| `nav-landmarks-type-twice-valid.xhtml` | Same type different resources | - |
| `nav-landmarks-type-twice-same-resource-error.xhtml` | Same type same resource | RSC-005 |
| `nav-other-lot-valid.xhtml` | Valid lot nav | - |
| `nav-other-heading-missing-error.xhtml` | Other nav missing heading | RSC-005 |
| `nav-type-missing-not-restricted-valid.xhtml` | Missing epub:type allowed | - |
| `hidden-nav-valid.xhtml` | Hidden nav valid | - |
| `hidden-attribute-invalid-error.xhtml` | Invalid hidden attribute | RSC-005 |

**CFI validation (1 test):**
| Test Fixture | Feature | Message ID |
|--------------|---------|------------|
| `nav-cfi-valid` | EPUB CFI in nav | (CFI parser needed) |

---

### Tests Requiring Implementation First

| Message ID | Feature | Tests Blocked | Priority |
|------------|---------|---------------|----------|
| **RSC-033** | URL query strings in package links | 3 tests | High |
| **NAV-011** | TOC unordered vs spine order warning | 3 tests | High |
| **RSC-017** | Nested sublists in nav warning | 2 tests | Medium |
| **EPUB CFI** | CFI fragment parsing | 1 test | Low |

---

## Priority Next Steps

### High Priority (Core Validation)
1. **ARIA validation** - Role and attribute validation
2. **ID/IDREF validation** - Duplicate ID detection (OPF-060)
3. **DOCTYPE validation** - Obsolete identifiers
4. **Entity validation** - External entities
5. **Base URL handling** - xml:base, HTML base
6. **Refines cycles** - OPF-065 detection
7. **Link elements** - rel, hreflang, properties
8. **UUID format** - dc:identifier validation
9. **Non-UTF8 detection** - PKG-027 for filenames

### Medium Priority (Completeness)
1. **Media overlays** - SMIL validation
2. **Encryption.xml** - Font obfuscation
3. **Full WCAG 2.0** - Comprehensive accessibility
4. **Advanced media** - Format validation, magic numbers
5. **URL encoding** - Edge cases (percent-encoded paths)

### Low Priority (Specialized)
- Dictionary/index advanced validation
- Multiple renditions (metadata.xml)
- Signatures.xml validation

---

## Message IDs

**Defined**: ~165 message IDs
**Actively used**: ~76 (46%)

Most-used prefixes: OPF (27), RSC (15), PKG (12), CSS (6), HTM (6), NAV (3), NCX (4), ACC (4)
Unused: MED (0), SCP (0), CHK (0)

### Recent Message ID Fixes (aligned with Java EPUBCheck)
- `RSC-001` - Missing manifest resource (was OPF-010)
- `RSC-002` - Missing container.xml (was PKG-003)
- `RSC-008` - Reports from referencing document location (not referenced resource)
- `PKG-007` - Mimetype content mismatch (now checks exact value, no trimming)
- `PKG-009` - Disallowed characters in filenames (EPUB 3 spec compliance)
- `PKG-010` - Whitespace in filenames (warning)

### Recent Validation Improvements
- `OPF-034` - Duplicate spine itemref (now works for EPUB 3, was EPUB 2 only)
- `OPF-050` - Spine toc attribute validation (now works for EPUB 3)
- `OPF-060` - Duplicate filename detection with Unicode NFD normalization and full case folding
- `PKG-027` - Non-UTF8 filename detection (validates raw ZIP filename bytes)
- `RSC-007` - Cite attribute validation for blockquote/q/ins/del elements
- `RSC-010` - Links to non-content document types (tested via nav-links-to-non-content-document-type-error)
- `CSS-001` - Forbidden CSS properties (direction, unicode-bidi)
- `NAV-010` - Remote links in toc/landmarks/page-list navigation
- `RSC-011` - Navigation links to items not in spine
- Script detection excludes non-JS types (application/ld+json, application/json)
- `RSC-009` - Non-SVG image fragment identifiers (warning)
- `HTM-045` - Empty href attribute handling (USAGE severity)
- MathML altimg reference validation
- Img srcset attribute parsing
- Remote script src detection (RSC-006)
- SVG ID extraction for fragment validation
- Data URL handling aligned with EPUB 3 spec (allowed for images/audio/video/fonts)

---

## Commands

```bash
npm test              # Run tests in watch mode
npm run test:run      # Run tests once
npm run lint          # Check code quality
npm run typecheck     # TypeScript checks
npm run build         # Build for production
```

---

## Java Reference

Java EPUBCheck source: `/Users/william/epubcheck`

### Source Code Mappings
- `com.adobe.epubcheck.ocf` → `src/ocf/`
- `com.adobe.epubcheck.opf` → `src/opf/`
- `com.adobe.epubcheck.ops` → `src/content/`
- `com.adobe.epubcheck.css` → `src/css/`
- `com.adobe.epubcheck.nav` → `src/nav/`
- `com.adobe.epubcheck.xml` → `src/schema/`

### Test Suite Location
- **Base**: `/Users/william/epubcheck/src/test/resources/`
- **EPUB 3 Tests**: `epub3/` (719 scenarios, 16 categories)
  - `00-minimal/` - Baseline valid EPUBs (5 scenarios)
  - `03-resources/` - Cross-reference validation (113 scenarios)
  - `04-ocf/` - Container/ZIP validation (61 scenarios)
  - `05-package-document/` - OPF validation (121 scenarios)
  - `06-content-document/` - XHTML/CSS/SVG (215 scenarios)
  - `07-navigation-document/` - Nav/NCX (40 scenarios)
  - `08-layout/` - Rendition/viewport (51 scenarios)
  - `09-media-overlays/` - SMIL validation (51 scenarios)
  - `D-vocabularies/` - ARIA, epub:type (56 scenarios)
- **EPUB 2 Tests**: `epub2/` (96 scenarios)
