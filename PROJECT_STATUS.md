# EPUBCheck-TS Project Status

Quick reference for implementation progress vs Java EPUBCheck.

## Overview

| Category | Completion | Status |
|----------|------------|--------|
| OCF Validation | ~90% | 🟢 URL leaking, UTF-8, spaces, forbidden chars all done |
| OPF Validation | ~90% | 🟢 Schematron-equivalent checks, refines cycles, duplicate IDs done |
| Content (XHTML/SVG) | ~90% | 🟢 CSS url() references, @import, inline CSS remote font, SVG remote font, picture elements, SVG use, epub:type vocab, lang mismatch, switch/trigger, SVG epub:type, media magic numbers done |
| CSS Validation | ~70% | 🟢 url() extraction from declarations, @font-face src |
| Navigation (nav/NCX) | ~85% | 🟢 Content model, structural validation, landmarks, labels, reading order done |
| Schema Validation | ~50% | 🟡 RelaxNG for OPF/container; XHTML/SVG disabled (libxml2 limitation) |
| Media Overlays | 0% | ❌ Not implemented |
| Accessibility | ~30% | 🟡 Basic checks only (ACC-004/005/009/011) |
| Cross-reference | ~90% | 🟢 URL leaking, CSS references, link elements, embed/input/object, exempt resources, SVG stylesheet/use refs done |

**Overall: ~89% complete (922 tests passing, 69 skipped)**

---

## Test Coverage

### Current Test Suite

| Category | Tests | Passed | Skipped |
|----------|-------|--------|---------|
| **Unit Tests** | 404 | 387 | 17 |
| **Integration Tests** | 587 | 535 | 52 |
| **Total** | **991** | **922** | **69** |

### Integration Test Files

```
test/integration/
├── epub.test.ts                 # 4 tests   (4 pass, 0 skip)  - Basic EPUB validation
├── ocf.integration.test.ts      # 56 tests  (46 pass, 10 skip) - OCF/ZIP/container
├── opf.integration.test.ts      # 167 tests (166 pass, 1 skip)  - Package document
├── content.integration.test.ts  # 214 tests (183 pass, 31 skip)  - XHTML/CSS/SVG
├── nav.integration.test.ts      # 36 tests  (36 pass, 0 skip)  - Navigation
└── resources.integration.test.ts # 110 tests (99 pass, 11 skip)  - Resources/fallbacks
```

**Note**: Integration tests imported from Java EPUBCheck test suite (`../epubcheck/src/test/resources/epub3/`).

### Test Fixtures

```
test/fixtures/
├── valid/                 # 244 valid EPUBs
├── invalid/
│   ├── ocf/              # 37 OCF error cases
│   ├── opf/              # 113 OPF error cases
│   ├── content/          # 133 content error cases
│   └── nav/              # 18 navigation error cases
└── warnings/             # 30 warning cases
```

**Total**: 575 EPUB test fixtures (imported from Java EPUBCheck)

### Quality: ⭐⭐⭐⭐ (4/5) for implemented features

**Strong areas:**
- NCX validation (24 tests - better than Java's 8 scenarios)
- CSS validation (57 tests - better granularity than Java's 19)
- Cross-reference validation (48 tests)
- Fast execution (~700ms vs Java's integration-heavy suite)

**Critical gaps:**
- 🟡 **ARIA validation** - DPUB-ARIA deprecated roles done; full role/attribute checks not yet (Java has dozens)
- 🟡 **ID/IDREF validation** - OPF + XHTML + SVG duplicate IDs done; IDREF resolution not yet
- 🟡 **Entity validation** - RSC-016 for undefined/malformed entities; HTM-003 external entity declarations done; encoding detection HTM-058 not yet
- ❌ **Base URL** - No xml:base or HTML base support
- ❌ **Advanced accessibility** - Only 30% of Java coverage
- ❌ **Media overlays** - Not implemented

### Skipped Tests

**Unit tests (16)** - Various reasons:
- **libxml2-wasm XPath limitations (3)** - OPF-014 inline event handlers, CSS-005 conflicting stylesheets, OPF-088 unknown epub:type prefix
- **Messages suppressed in Java EPUBCheck (13)** - NCX-002 (2), NCX-003 (2), NAV-002 (1), ACC-004 (1), ACC-005 (1), HTM-012 (1), and parameterized variants

**Integration tests (37)** - Unimplemented features and library limitations:
- **Content (31 skipped)**:
  - *RelaxNG/Schematron content schema (~11)*: image map, foreignObject/SVG title HTML validation, microdata, Schematron, IDREF resolution — requires XHTML/SVG schema (libxml2-wasm limitation)
  - *CSS encoding/syntax (4)*: CSS-003/CSS-004 encoding detection, CSS syntax error ordering
  - *URL/base handling (2)*: base/xml:base external URL RSC-006
  - *ARIA (1)*: aria-describedAt RSC-005
  - *Encoding/entities (1)*: Encoding detection HTM-058
  - *SVG fixtures (~2)*: foreignObject HTML validation
  - *Standalone SVG (1)*: ACC-011 accessibility check not wired for standalone SVG documents
  - *Namespace (1)*: HTM-010 unusual epub namespace not implemented (false positive HTM-004)
  - *RDFa (1)*: OPF-096 non-linear content linked only via `<link rel="prev/next">`
  - *Other (~6)*: file URL, SVG regression
- **Resources (11 skipped)**:
  - *XML encoding detection (6)*: RSC-027/RSC-028 encoding detection not implemented (UTF-16, Latin-1, UTF-32, unknown)
  - *XML conformance (2)*: RSC-016 for OPF XML parse errors (emits OPF-002/RSC-005 instead)
  - *Single-file validation mode (2)*: remote XHTML/SVG font validation not supported
  - *OPF-090 usage (1)*: not-preferred media type usage message not emitted
- **OCF (10 skipped)**: OPF-060 duplicate ZIP entry (1), encryption/signatures schema (4), single-file/directory validation mode (5)
- **OPF (1 skipped)**: OPF-014 remote audio overlays (1)

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
- **Navigation** (NAV-001/002/010/011) + content model, landmarks, labels, hidden attribute, reading order
- **OPF Schematron-equivalent** (RSC-005 duplicate IDs/refines/modified/multiplicity, OPF-065 cycles, OPF-092 xml:lang, OPF-098 link-to-OPF, RSC-017 bindings/refines, RSC-020 spaces)
- **Link element validation** (RSC-007w warning for missing resources, OPF-093 missing media-type, OPF-086 deprecated rel, OPF-089 alternate+others, OPF-094 record/voicing need media-type, OPF-095 voicing audio type, RSC-005 record/voicing refines)
- **Meta-properties vocab validation** (D-vocabulary: authority/term/belongs-to-collection/collection-type/display-seq/file-as/group-position/identifier-type/meta-auth/role/source-of/title-type)
- **URL leaking detection** (RSC-026 for path-absolute URLs)
- **Scripted property** (OPF-014)
- **MathML/SVG properties** (OPF-014)
- **Remote resources property** (OPF-014, OPF-018 unnecessary declaration warning)
- **Switch property** (OPF-014 for epub:switch detection)
- **Inline CSS remote font detection** (OPF-014 for @font-face with remote URLs in `<style>` blocks)
- **SVG remote font detection** (OPF-014 for font-face-uri with remote xlink:href)
- **Basic accessibility** (ACC-009/011 active; ACC-004/005 suppressed in Java)
- **Cross-references** (RSC-006/007/008/009/010/011/012/013/014/015/020/026/029/031/032/033)
- **Filename validation** (PKG-009/010/011/027)
- **Duplicate filename detection** (OPF-060) - Unicode NFC normalization, case folding
- **Non-UTF8 filename detection** (PKG-027)
- **Cite attribute validation** (RSC-007 for blockquote/q/ins/del cite attributes, typed as CITE not HYPERLINK)
- **Non-linear reachability** (OPF-096/096b)
- **Unreferenced resources** (OPF-097) - Uses manifest property flags, not string matching
- **Percent-encoded URLs** - Proper handling of URL-encoded paths
- **ZIP UTF-8 filename decoding** - Re-decode Latin-1 filenames as UTF-8 (fflate workaround)
- **XML ID whitespace normalization** - Trim leading/trailing spaces from id/idref attributes
- **Unicode NFC normalization** - Consistent NFC normalization for manifest hrefs and file lookups
- **Font obfuscation validation** (PKG-026) - Obfuscated resources must be blessed font types
- **Non-ASCII filename detection** (PKG-012) - Usage message for non-ASCII characters in filenames
- **Foreign resource fallback** (RSC-032) - Foreign resources must have CMT fallback chain; all video/* types are CMT
- **Exempt resources** - Fonts, tracks, stylesheets exempt from RSC-032
- **epub:type vocabulary** (OPF-086b/087/088) - Deprecated, disallowed, and unknown epub:type values
- **Lang/xml:lang mismatch** (RSC-005) - Case-insensitive comparison on HTML elements
- **DPUB-ARIA deprecated roles** (RSC-017) - doc-endnote, doc-biblioentry
- **Inline CSS validation** (CSS-008) - `<style>` element content parsed via CSSValidator
- **svgView fragment** (RSC-012) - Functional SVG fragments skip fragment-not-found check
- **CMT parameter stripping** - Media types with parameters (e.g., `audio/ogg;codecs=opus`) correctly matched
- **Intrinsic source fallback** - `<source>` children with CMT types provide fallback for audio/video; `<picture>` propagates to `<img>` child
- **Embedded element references** - embed[@src], input[type=image][@src], object[@data], area[@href] extracted
- **Data URL validation** - Base64 whitespace handled; RSC-032 for foreign data URLs; default MIME type text/plain
- **OPF-044** - Spine fallback chain must resolve to content document
- **RSC-033** - Relative URL query component detection
- **OPF-015** - Declared-but-not-found checks for mathml/switch properties (in addition to scripted/svg)
- **Nav reference types** - NAV_TOC_LINK/NAV_PAGELIST_LINK correctly distinguished from HYPERLINK
- **BCP 47** - Full language tag validation (extensions, private-use, grandfathered tags)
- **Image magic number validation** (MED-004/OPF-029/PKG-022) - Corrupt header detection, MIME type mismatch, wrong file extension
- **SVG fragment-only reference resolution** - `<use xlink:href="#id">` correctly resolves to current document

### 🟡 Partially Implemented
- **Schema validation** - RelaxNG for OPF/container works; XHTML/SVG RelaxNG disabled (libxml2-wasm doesn't support complex patterns)
- **Content validation** - Core structure good; entity/title/XML version/SSML/discouraged elements/obsolete HTML/duplicate IDs/HTTP-equiv/img src/style-in-body/table border/time datetime/MathML annotations/Content MathML/reserved namespaces/data-* attributes/epub:type vocab/lang mismatch/DPUB-ARIA deprecated/inline CSS/epub:switch-trigger/style attrs/SVG epub:type checks done; missing full ARIA/DOCTYPE/external entities; Schematron validation works
- **Image validation** - MED-001/OPF-051 work; MED-004/OPF-029/PKG-022 magic number checks done

### ❌ Not Implemented
- Media overlays validation
- Encryption.xml schema validation (obfuscation detection via PKG-026 is implemented)
- Signatures.xml validation
- Metadata.xml (multiple renditions)
- Advanced accessibility (WCAG 2.0 comprehensive)
- Full ARIA roles and attributes (DPUB-ARIA deprecated roles done)
- DOCTYPE obsolete identifiers
- External entity validation
- Base URL handling (xml:base, HTML base)
- Media format validation (beyond magic numbers — e.g., dimension checks, format-specific parsing)

---

## Known Issues

1. **fflate ZIP deduplication** - The fflate library automatically deduplicates ZIP entries when unzipping, making it impossible to detect duplicate entries (affects 1 skipped test)
2. **css-tree syntax error handling** - The CSS parser is designed to be forgiving and successfully parses many invalid CSS snippets, making syntax error detection difficult (affects 1 skipped test)
3. **libxml2-wasm XPath limitations** - Queries for namespaced attributes don't work properly (affects 3 skipped unit tests)
4. **libxml2-wasm RelaxNG limitations** - Cannot parse XHTML/SVG schemas due to complex recursive patterns (`oneOrMore//interleave//attribute`). Java uses Jing which handles these. XHTML/SVG RelaxNG validation disabled; content validated via Schematron instead.
5. **fontoxpath XPath 2.0** - fontoxpath crashes on XPath 2.0 functions like `tokenize()` used in OPF/nav Schematron; OPF and nav validation rules implemented as direct TypeScript instead
6. **RelaxNG deprecation** - libxml2 plans to remove RelaxNG support in future
7. **Unicode NFKC normalization** - Not implemented (affects 1 skipped test)
8. **Single-file/directory validation mode** - TS validator only accepts full EPUB ZIP data; cannot validate standalone .opf/.xhtml files or unpacked directories (affects 5 skipped OCF tests, 2 skipped Resources tests)

---

## E2E Test Coverage vs Java

### Current Coverage

| Java Category | Java Scenarios | TS Ported | TS Passing | Coverage |
|---------------|----------------|-----------|------------|----------|
| 00-minimal | 5 | 4 | 4 | 80% |
| 03-resources | 113 | 110 | 99 | 88% |
| 04-ocf | 61 | 56 | 46 | 75% |
| 05-package-document | 121 | 119 | 118 | 98% |
| 06-content-document | 215 | 214 | 183 | 85% |
| 07-navigation-document | 40 | 36 | 36 | 90% |
| 08-layout | 51 | 0 | 0 | 0% |
| 09-media-overlays | 51 | 0 | 0 | 0% |
| D-vocabularies (ARIA) | 56 | 48 | 48 | 86% |
| Other | 6 | 0 | 0 | 0% |
| **Total** | **719** | **587** | **535** | **74%** |

### E2E Porting Priorities

**Completed** - High coverage achieved:
1. **05-package-document** (121 scenarios) - 98% coverage (119 ported, 118 passing)
2. **07-navigation-document** (40 scenarios) - 90% coverage (36 ported, all passing)
3. **04-ocf** (61 scenarios) - 75% coverage (56 ported, 46 passing)
4. **D-vocabularies** (56 scenarios) - 86% coverage (48 ported, 48 passing); remaining 8 need media overlays / rendition

**High Priority** - Largest remaining gaps:
5. **06-content-document** (215 scenarios) - 85% coverage, needs ARIA/DOCTYPE/entity validation
6. **03-resources** (113 scenarios) - 88% coverage, data/file URL checks, fallback chains, XML conformance done

**Low Priority** - Specialized features:
7. **08-layout** (51 scenarios) - Rendition/viewport (not implemented)
8. **09-media-overlays** (51 scenarios) - SMIL validation (not implemented)

---

## Remaining E2E Porting Gaps

All planned OPF (batches 1-5) and Nav (batches 6-8) tests have been ported. Remaining gaps:

| Area | Gap | Tests Blocked | Blocker |
|------|-----|---------------|---------|
| **06-content-document** | ARIA validation, DOCTYPE, entities | ~35 tests | Needs new validation subsystems |
| **03-resources** | XML encoding detection, RSC-016 OPF parse, single-file mode | 11 skipped | Encoding detection, OPF parser architecture, single-file mode |
| **D-vocabularies** | media-overlays-vocab, package-rendering-vocab | ~8 tests | Needs media overlay / rendition implementation |
| **08-layout** | Rendition/viewport validation | ~51 tests | Not implemented |
| **09-media-overlays** | SMIL validation | ~51 tests | Not implemented |

---

## Priority Next Steps

### High Priority (Core Validation)
1. **ARIA validation** - Role and attribute validation (blocks ~56 D-vocabulary tests)
2. **DOCTYPE validation** - Obsolete identifiers
3. **Entity validation** - External entities
4. **Base URL handling** - xml:base, HTML base

### Medium Priority (Completeness)

Ordered by severity impact (number of active error/warning messages not yet emitted):

1. **Media overlays** - SMIL validation (10 errors: MED-003/005/007/008/009/010/011/012/013/014, 3 warnings: MED-016/017/018, 1 usage: MED-015, 3 suppressed: MED-001/002/006). Highest impact — 51 Java test scenarios, 0% implemented.
2. **Advanced media** - Format validation, magic numbers (3 errors: MED-003/004, PKG-021, 1 warning: PKG-022, 2 suppressed: OPF-051/057).
3. **Full WCAG 2.0** - Comprehensive accessibility. Lowest real-world impact — all 15 unimplemented ACC messages (ACC-001/002/003/005/006/007/008/010/012/013/014/015/016/017) are **suppressed** by default. Only fires if user explicitly enables via customMessages. ACC-009 and ACC-011 (usage) are already implemented.

### Low Priority (Specialized)
- Dictionary/index advanced validation
- Multiple renditions (metadata.xml)
- Signatures.xml validation

---

## Message IDs

**Defined**: 300 message IDs
**Actively used**: 122 (41%)

Active by prefix: OPF (50), RSC (26), PKG (13), CSS (10), HTM (11), NAV (4), NCX (3), ACC (4), MED (2)
Unused prefixes: SCP (0), CHK (0), INF (0)

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
- `OPF-027` - Undefined manifest item properties (including prefixed properties)
- `OPF-093` - Missing media-type for local linked resources
- `OPF-065` - Refines metadata cycle detection via DFS
- `OPF-085` - UUID format validation for dc:identifier
- `OPF-092` - Language tag well-formedness (dc:language, link hreflang, xml:lang)
- `OPF-098` - Link href must not target package document elements
- `RSC-005` - OPF Schematron-equivalent: duplicate IDs, refines validation, modified date, cover-image/nav multiplicity, NCX toc attribute
- `RSC-017` - Bindings deprecated, refines not-a-fragment
- `RSC-020` - Unencoded spaces in manifest item href
- Nav content model validation (headings, labels, anchors, lists, hidden attribute)
- Nav type validation (page-list/landmarks multiplicity, landmarks epub:type, other nav heading)
- iframe `<iframe src>` reference extraction for RSC-007 validation
- Script detection excludes non-JS types (application/ld+json, application/json)
- `RSC-009` - Non-SVG image fragment identifiers (warning)
- `HTM-045` - Empty href attribute handling (USAGE severity)
- MathML altimg reference validation
- Img srcset attribute parsing
- Remote script src detection (RSC-006)
- SVG ID extraction for fragment validation
- Data URL handling aligned with EPUB 3 spec (allowed for images/audio/video/fonts)
- `OPF-013` - MIME type mismatch detection for object/embed/audio source/picture source elements
- `MED-003` - Picture img must reference blessed image type (src and srcset)
- `MED-007` - Picture source with foreign resource must have type attribute
- `RSC-015` - SVG use element must have fragment identifier (XHTML and standalone SVG)
- `RSC-014` - Hyperlinks to SVG symbols are incompatible (inline and standalone SVG)
- SVG stylesheet reference extraction (xml-stylesheet PI, @import in style elements)
- SVG font-face-uri reference extraction for remote font tracking
- Remote resource RSC-006 validation for non-spine manifest items
- `RSC-026` - Corrected from RSC-027/028 (which are UTF encoding IDs); container escape in all contexts
- `RSC-031` - Now correctly scoped to publication resource references only (not hyperlinks)
- `RSC-033` - Relative URL query component check (new)
- `OPF-015` - Declared-but-not-found for mathml/switch properties (was missing)
- `OPF-044` - Spine fallback chain content document resolution (new)
- `RSC-011` - Now has EPUB 2 guard (EPUB 3 only)
- `NAV-001` - Updated description to match Java EPUBCheck
- Nav link reference types (NAV_TOC_LINK/NAV_PAGELIST_LINK) correctly distinguished
- `checkNavRemoteLinks` now scoped per-nav element instead of document-wide
- `isPublicationResourceReference` includes SVG_SYMBOL/SVG_PAINT/SVG_CLIP_PATH
- `isRemoteResourceType` includes application/font-woff2
- BCP 47 language tag validation expanded (extensions, private-use, grandfathered)
- CSS @import references now use AST extraction instead of duplicate regex
- Picture intrinsic fallback propagated to img child
- Data URL default MIME type is text/plain per spec
- Area element href extraction (was missing)
- `RSC-029` - Data URL checks in OPF manifest item hrefs and package link hrefs
- `RSC-030` - File URL checks in OPF package link hrefs
- Data/file URL passthrough in content validator — `data:` and `file:` URLs in anchor/area hrefs now pass to reference validator (were silently skipped by ABSOLUTE_URI_RE)
- Multiple dcterms:modified detection
- Resource flags (isNav, isCoverImage, isNcx) replace fragile string matching
- `RSC-015` - SVG `<use>` empty href now fires RSC-015 instead of silently skipping
- Spine itemref IDs included in OPF duplicate ID check
- CSS remote-resources check now also verifies referencing XHTML document manifest items
- Removed dead `NavValidator` class (nav validation fully handled by `ContentValidator`)
- `RSC-016` - Entity parse errors (undefined entity, missing semicolon) now correctly fatal
- `HTM-001` - XML 1.1 version declaration detection (pre-parse check)
- `HTM-007` - SSML empty/whitespace-only ph attribute warning
- `HTM-055` - Discouraged elements: added `rp` (was missing alongside `base`/`embed`)
- `RSC-005` - Empty title element detection
- `RSC-017` - Missing title element (was incorrectly using HTM-003)
- Absolute URI detection (generic `scheme:` pattern) for hyperlink/area extraction — fixes false RSC-007 on `irc://`, `ftp://`, etc.
- `RSC-005` - Obsolete HTML attributes: `contextmenu`, `dropzone`, `typemustmatch`, `pubdate`, `seamless`
- `RSC-005` - Obsolete HTML elements: `keygen`, `command`, `menu[type]`
- `RSC-005` - Duplicate ID detection for XHTML and SVG content documents
- `RSC-005` - Invalid SVG ID detection (IDs must match XML Name production)
- `RSC-005` - Empty `img[src]` attribute detection
- `RSC-005` - `style` element in document body detection
- `RSC-005` - HTTP-equiv non-UTF-8 charset and duplicate charset declaration detection
- `OPF-086b` - Deprecated epub:type values (annoref, annotation, biblioentry, etc.)
- `OPF-087` - epub:type values disallowed on content documents (aside, figure, list, etc.)
- `OPF-088` - Unknown epub:type values in default EPUB SSV vocabulary
- `RSC-005` - lang/xml:lang mismatch on HTML root element
- `RSC-017` - DPUB-ARIA deprecated roles (doc-endnote, doc-biblioentry)
- `CSS-008` - Inline `<style>` element CSS parsing (validation via CSSValidator)
- `RSC-012` - svgView() fragment handling (skip fragment-not-found for functional SVG fragments)
- `RSC-032` - Exempt video/* types from foreign resource check (all video types are CMT)
- `RSC-017` - epub:switch deprecation warning (structural validation: case ordering, default count, required-namespace)
- `RSC-017` - epub:trigger deprecation warning (IDREF validation: ref, ev:observer)
- `RSC-005` - epub:switch structural errors (default before case, multiple defaults, missing case/default, missing required-namespace)
- `RSC-005` - epub:trigger IDREF errors (ref/ev:observer not found in document)
- `RSC-005` - Nested `<math>` detection inside epub:switch
- `CSS-008` - Style attribute CSS syntax validation (declaration list parsing)
- `RSC-005` - SVG epub:type not allowed on disallowed elements (title, desc, defs, foreignObject, etc.)
- `RSC-005` - Unknown epub:* attributes in SVG (only epub:type is allowed)
- `HTM-025` - Unregistered URI scheme detection in hyperlinks (anchor, area, SVG `<a>`)
- `RSC-020` - Malformed URL detection in content document hyperlinks (whitespace, missing `://` for special schemes)
- `RSC-004` - Encrypted resource info message (non-IDPF-obfuscation encryption detected in encryption.xml)
- `RSC-033` - Query component check extended to OPF manifest item hrefs and package link hrefs

---

See `AGENTS.md` for commands, coding standards, architecture, and Java source mappings.
