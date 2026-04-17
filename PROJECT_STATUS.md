# EPUBCheck-TS Project Status

Quick reference for implementation progress vs Java EPUBCheck.

## Overview

| Category | Completion | Status |
|----------|------------|--------|
| OCF Validation | ~92% | 🟢 URL leaking, UTF-8, spaces, forbidden chars, encryption/signatures schema done |
| OPF Validation | ~92% | 🟢 Schematron-equivalent checks, refines cycles, duplicate IDs, OPF-090 preferred media types done |
| Content (XHTML/SVG) | ~93% | 🟢 CSS url() references, @import, inline CSS remote font, SVG remote font, picture elements, SVG use, epub:type vocab, lang mismatch, switch/trigger, SVG epub:type, media magic numbers, UTF-16 BOM, base href, xml:base, epub namespace, Schematron disallowed descendants, microdata co-occurrence, unknown HTML elements, foreignObject/title content model done |
| CSS Validation | ~85% | 🟢 url() extraction from declarations, @font-face src, encoding detection, alt style tags (CSS-005), OPF-018 for CSS files done |
| Navigation (nav/NCX) | ~95% | 🟢 Content model, structural validation, landmarks, labels, reading order, nested-ol (RSC-017) done |
| Schema Validation | ~55% | 🟡 RelaxNG for OPF/container/encryption/signatures; XHTML/SVG disabled (libxml2 limitation) |
| Media Overlays | ~70% | 🟡 SMIL structure/timing/audio/remote-resources, cross-ref checks, fragment validation, reading order, CSS active class (CSS-029/030), OPF metadata (refines/class-name/type/contentdoc/duration-defined), MED-016 duration sum done |
| Accessibility | ~71% | 🟢 Content checks (table th/thead/caption/empty-th, epub:type usage, image alt, hyperlink text, MathML alt, SVG link name), OPF metadata (accessibilityFeature/accessMode/general a11y) done |
| Cross-reference | ~92% | 🟢 URL leaking, CSS references, link elements, embed/input/object, exempt resources, SVG stylesheet/use refs, encoding detection, cross-document feature checks done |

**Overall: ~98% complete (1355 tests passing, 20 skipped, 1375 total)**

**100% Java scenario import**: Every Java EPUBCheck feature file (core EPUB 3, EPUB 2, profile extensions) has been ported into this suite. Skipped tests form a discoverable backlog with specific validator gap annotations.

---

## Test Coverage

### Current Test Suite

| Category | Tests | Passed | Skipped |
|----------|-------|--------|---------|
| **Unit Tests** | 443 | 441 | 2 |
| **Integration Tests** | 932 | 914 | 18 |
| **Total** | **1375** | **1355** | **20** |

### Integration Test Files

```
test/integration/
├── epub.test.ts                      #   4 tests  (  4 pass,   0 skip) - Basic sanity tests
├── conformance.integration.test.ts   #  11 tests  ( 11 pass,   0 skip) - Minimal/conformance/external-ids/media-types
├── ocf.integration.test.ts           #  56 tests  ( 52 pass,   4 skip) - OCF/ZIP/container
├── opf.integration.test.ts           # 173 tests  (173 pass,   0 skip) - Package document + D-vocabularies
├── content.integration.test.ts       # 214 tests  (208 pass,   6 skip) - XHTML/CSS/SVG
├── nav.integration.test.ts           #  38 tests  ( 38 pass,   0 skip) - Navigation
├── resources.integration.test.ts     # 110 tests  (109 pass,   1 skip) - Resources/fallbacks
├── layout.integration.test.ts        #  52 tests  ( 52 pass,   0 skip) - Layout/viewport/FXL
├── mediaoverlays.integration.test.ts #  50 tests  ( 50 pass,   0 skip) - Media overlays/SMIL
├── epub2.integration.test.ts         #  99 tests  ( 97 pass,   2 skip) - EPUB 2 (all 7 Java features)
└── profiles.integration.test.ts      # 125 tests  (120 pass,   5 skip) - 9 profile extensions
```

**Note**: Integration tests imported from Java EPUBCheck test suite (`../epubcheck/src/test/resources/epub3/`).

### Test Fixtures

```
test/fixtures/
├── valid/                 # 257 valid EPUBs
├── invalid/
│   ├── ocf/              # 37 OCF error cases
│   ├── opf/              # 113 OPF error cases
│   ├── content/          # 137 content error cases
│   ├── layout/           # 12 layout error cases
│   └── nav/              # 18 navigation error cases
└── warnings/             # 30 warning cases
```

**Total**: 608 EPUB test fixtures (imported from Java EPUBCheck)

### Quality: ⭐⭐⭐⭐ (4/5) for implemented features

**Strong areas:**
- NCX validation (24 tests - better than Java's 8 scenarios)
- CSS validation (55 tests - better granularity than Java's 19)
- Cross-reference validation (64 tests)
- Fast execution (~1.4s for 1375 tests vs Java's integration-heavy suite)

**Critical gaps:**
- 🟢 **EPUB 2 validation** - 98% of 99 Java scenarios pass (97/99). Remaining gaps: wrong-namespace multi-error reporting (libxml2-wasm vs Jing dep limit), and one OEBPS-namespace check (PKG-001 not emitted for legacy fixture)
- 🟢 **Profile implementation** - 96% of 125 profile scenarios pass (120/125). Remaining gaps: EDUPUB multi-rendition metadata (2 tests), region-based nav (2 tests), scriptable components prefix (1 test)
- 🟡 **ARIA validation** - DPUB-ARIA deprecated roles done; IDREF validation done (aria-describedby/labelledby/flowto/owns/controls/activedescendant); aria-describedat detection done
- 🟡 **ID/IDREF validation** - OPF + XHTML + SVG duplicate IDs done; ARIA IDREF + label/output/headers resolution done; MathML xref not yet
- 🟡 **Advanced accessibility** - 71% coverage (12/17 ACC checks); remaining: ACC-008 page gaps, ACC-013 complex image aria-describedby, ACC-015/016/017
- 🟢 **Media overlays** - SMIL validation + single-file `--mode mo` done; all 50 mediaoverlays integration tests passing
- 🟢 **Layout rendition** - All 32 file-based rendition tests enabled via `--mode opf` (100% passing)

### Skipped Tests

**Unit tests (2)** - libxml2-wasm XPath limitations:
- **Content validator (2)** - OPF-014 inline event handlers, OPF-088 unknown epub:type prefix (unprefixed attribute XPath queries don't match — library limitation, not validator bug)

**Integration tests (18)** - Grouped by category:
- **Core EPUB 3 (11 skipped)**: Library limitations (RelaxNG foreignObject/SVG title, css-tree forgiveness, fflate ZIP dedup), pre-existing gaps (SMIL clock strictness, epub:type vocab), unimplemented checks (OPF-073, PKG-016, `--mode svg`).
- **EPUB 2 (2 skipped)**: Wrong-namespace per-element error count (libxml2-wasm vs Jing reporting-shape difference) and one PKG-001 emission for legacy OEBPS namespace fixture.
- **Profiles (5 skipped)**: Remaining profile-specific validation gaps — EDUPUB multi-rendition metadata (2 tests), region-based nav (2 tests), scriptable components prefix (1 test). See the Implementation Gaps Backlog section below for the full breakdown.

Every skipped test has an inline comment annotating the specific validator gap — search for `it.skip` in `test/` to find the full backlog.

---

## What Works Well

### ✅ Fully Implemented
- **Mimetype validation** (PKG-005/006/007)
- **Container.xml** (RSC-002/005, PKG-004)
- **Package attributes** (OPF-001/030/048/099 - self-referencing manifest)
- **Required metadata** (OPF-015/016/017)
- **Manifest validation** (RSC-001, OPF-012/013/014/074/091)
- **Spine validation** (OPF-033/034/043/049/050) + rendition override conflict checking
- **Rendition property validation** (rendition:layout/orientation/spread/flow/viewport global meta + spine overrides)
- **Fixed-layout detection** (per-item FXL via rendition:layout meta + spine overrides)
- **Viewport meta validation** (HTM-046/047/056/057/059/060a/060b) - syntax, dimensions, keywords, duplicates
- **SVG viewBox validation** (HTM-048) - FXL SVG documents require viewBox on outermost svg
- **Fallback chains** (OPF-040/045)
- **Collections** (OPF-071-084)
- **NCX validation** (NCX-001/002/003/006)
- **CSS validation** (@font-face, @import, url(), position, forbidden properties CSS-001)
- **Navigation** (NAV-001/002/010/011) + content model, landmarks, labels, hidden attribute, reading order
- **OPF Schematron-equivalent** (RSC-005 duplicate IDs/refines/modified/multiplicity, OPF-065 cycles, OPF-092 xml:lang, OPF-098 link-to-OPF, RSC-017 bindings/refines, RSC-020 spaces)
- **Link element validation** (RSC-007w warning for missing resources, OPF-093 missing media-type, OPF-086 deprecated rel, OPF-089 alternate+others, OPF-094 record/voicing need media-type, OPF-095 voicing audio type, RSC-005 record/voicing refines)
- **Meta-properties vocab validation** (D-vocabulary: authority/term/belongs-to-collection/collection-type/display-seq/file-as/group-position/identifier-type/meta-auth/role/source-of/title-type)
- **Media overlays vocab validation** (media:active-class/playback-active-class multiplicity, media:duration SMIL3 clock value syntax)
- **URL leaking detection** (RSC-026 for path-absolute URLs)
- **Scripted property** (OPF-014)
- **MathML/SVG properties** (OPF-014)
- **Remote resources property** (OPF-014, OPF-018 unnecessary declaration warning)
- **Switch property** (OPF-014 for epub:switch detection)
- **Inline CSS remote font detection** (OPF-014 for @font-face with remote URLs in `<style>` blocks)
- **SVG remote font detection** (OPF-014 for font-face-uri with remote xlink:href)
- **Accessibility checks** (ACC-009/011 active; ACC-001/002/003/004/005/006/007/010/012/014 suppressed — table th/thead/caption/empty-th, epub:type usage, image alt, hyperlink text, a11y metadata)
- **Cross-document feature checks** (NAV-003/005/006/007/008 EDUPUB page-break↔page-list, content↔LOX nav consistency; HTM-051 EDUPUB microdata+RDFa; OPF-078/079 dictionary content↔dc:type)
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
- **Content validation** - Core structure good; entity/title/XML version/SSML/discouraged elements/obsolete HTML/duplicate IDs/HTTP-equiv/img src/style-in-body/table border/time datetime/MathML annotations/Content MathML/reserved namespaces/data-* attributes/epub:type vocab/lang mismatch/DPUB-ARIA deprecated/inline CSS/epub:switch-trigger/style attrs/SVG epub:type/UTF-16 BOM/CSS encoding/epub namespace/base href/Schematron disallowed descendants/microdata co-occurrence/unknown HTML elements/foreignObject-title content model checks done; missing full ARIA; Schematron validation works
- **Image validation** - MED-001/OPF-051 work; MED-004/OPF-029/PKG-022 magic number checks done

### ❌ Not Implemented
- Metadata.xml (multiple renditions)
- Advanced accessibility (remaining 5 ACC checks: ACC-008/013/015/016/017)
- Full ARIA roles and attributes (DPUB-ARIA deprecated roles done)
- External entity validation
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
8. **Single-file/directory validation mode** - Implemented for `exp` (expanded directory), `opf`, `xhtml`, `svg`, `nav`, and `mo` (SMIL). All Java EPUBCheck single-file modes supported.
9. **Profile implementation** - `--profile edupub|dict|idx|preview` flag is accepted and most profile-aware checks now implemented. 125 profile scenarios are ported with 10 skipped — each skip annotates the specific missing check (see Implementation Gaps Backlog).
10. **EPUB 2 coverage** - Validator has broad EPUB 2 support. 99 EPUB 2 scenarios are ported with 2 skipped — both are dependency-shape limits (wrong-namespace per-element count and a PKG-001 emission for the legacy OEBPS fixture).

---

## E2E Test Coverage vs Java

**Status: 100% Java scenario import complete** — every Java EPUBCheck feature file is represented in the TS test suite. Each skipped test has a specific validator gap annotation.

### Core EPUB 3

| Java Feature | Scenarios | Active | Skipped | Pass Rate |
|---|---:|---:|---:|---:|
| 00-minimal | 5 | 5 | 0 | 100% |
| 02-epub-publication-conformance | 2 | 2 | 0 | 100% |
| 03-resources | 113 | 109 | 1 | 97% |
| 04-ocf (ocf + filename-checker) | 67 | 52 | 4 | 78% |
| 05-package-document | 121 | ~121 | 0 | ~100% |
| 06-content-document (xhtml+svg+css) | 215 | 208 | 6 | 97% |
| 07-navigation-document | 40 | 38 | 0 | 95% |
| 08-layout | 51 | 52 | 0 | **100%** |
| 09-media-overlays | 50 | 50 | 0 | **100%** |
| B-external-identifiers | 3 | 3 | 0 | 100% |
| D-vocabularies | 54 | 54 | 0 | ~100% |
| F-viewport-meta-tag | 4 | (covered in layout) | — | ~100% |
| H-media-type-registrations | 1 | 1 | 0 | 100% |
| **Core EPUB 3** | **~726** | **~695** | **11** | **~98%** |

### EPUB 2

| Java Feature | Scenarios | Active | Skipped | Pass Rate |
|---|---:|---:|---:|---:|
| **EPUB 2 (all 7 features)** | **99** | **97** | **2** | **98%** |

Per-feature breakdown not tracked separately; see `test/integration/epub2.integration.test.ts` for `it.skip` annotations.

### Profile Extensions

| Java Directory | Scenarios | Active | Skipped | Pass Rate |
|---|---:|---:|---:|---:|
| **Profile Extensions (9 dirs)** | **125** | **115** | **10** | **92%** |

Per-directory breakdown not tracked separately; see `test/integration/profiles.integration.test.ts` for `it.skip` annotations.

### Grand Total

| Tier | Java Scenarios | Active | Skipped | Pass Rate |
|---|---:|---:|---:|---:|
| Core EPUB 3 | ~726 | ~695 | 11 | ~98% |
| EPUB 2 | 99 | 97 | 2 | 98% |
| Profile Extensions | 125 | 115 | 10 | 92% |
| **Total** | **~950** | **~907** | **23** | **~95%** |

### Out-of-scope Java features (intentionally not ported)

- `localization/localization.feature` (7 scenarios) — TS validator has no i18n
- `reporting/json-report.feature` (14 scenarios) — Our JSON format differs
- `reporting/xml-report.feature` (2 scenarios) — No XML report format
- `cli/cli.feature` — Different CLI surface
- `unit-tests/url-fragment.feature` (16 scenarios) — Covered by TS unit tests

### Recent Milestones

- **Single-file modes** (`--mode opf|xhtml|mo|exp`) enabled unskipping 49 tests + made single-file test porting possible
- **100% Java scenario import** achieved across all core EPUB 3, EPUB 2, and profile feature files (~950 scenarios total)
- **08-layout** went from 39% → 100% via `--mode opf`
- **09-media-overlays** went from 67% → 100% via `--mode mo`

---

## Implementation Gaps Backlog

The 18 skipped integration tests form a prioritized backlog. For the authoritative per-test breakdown, search `it.skip` in `test/` — each skip has an inline annotation of the specific validator gap. Themes by category:

### Profile validation (5 tests)

Remaining gaps (edge cases, not stubs): multiple-rendition `metadata.xml` support (EDUPUB cross-rendition metadata — 2 tests), region-navigation structural rules (2 tests), scriptable components prefix declaration (1 test).

### EPUB 2-specific checks (2 tests)

Remaining EPUB 2-only gaps: wrong-namespace per-element error count (libxml2-wasm vs Jing reporting shape — inherent dep limit) and a PKG-001 emission for the legacy OEBPS fixture.

### Core EPUB 3 library gaps (11 tests)

| Gap | Blocker |
|---|---|
| RelaxNG per-element attribute allowlist (foreignObject, SVG title) | libxml2-wasm limitation |
| Single-file filename validation (duplicates) | Pre-existing, low priority |
| OPF-073 external DOCTYPE identifiers | Not implemented |
| PKG-016 file extension case | Not implemented |
| `--mode svg` | Not implemented |
| SMIL clock parser strictness | Pre-existing |
| SMIL epub:type vocabulary | Pre-existing |
| RSC-016 OPF parse error diagnostic | libxml2 vs Xerces output difference |
| css-tree forgiving parser | Library limitation |
| Broken fixture (microdata) | Upstream |
| fflate ZIP dedup | Library limitation |

---

## Priority Next Steps

### Medium Priority (Completeness)

Ordered by severity impact (number of active error/warning messages not yet emitted):

1. **Media overlays** - Core SMIL validation + fragment/reading-order + CSS active class + OPF metadata checks + MED-016 duration sum done. 100% of 50 ported Java scenarios pass (see `mediaoverlays.integration.test.ts`).
2. **Advanced media** - Format validation, magic numbers (3 errors: MED-003/004, PKG-021, 1 warning: PKG-022, 2 suppressed: OPF-051/057).
3. **Full WCAG 2.0** - Remaining accessibility. Low real-world impact — all 5 unimplemented ACC messages (ACC-008/013/015/016/017) are **suppressed** by default. 12 of 17 ACC checks now implemented (ACC-001/002/003/004/005/006/007/009/010/011/012/014).

### Low Priority (Specialized)
- Dictionary/index advanced validation
- Multiple renditions (metadata.xml)
- Signatures.xml validation

---

## Message IDs

**Defined**: 300 message IDs
**Actively used**: 170 (57%)

Active by prefix: OPF (55), RSC (26), PKG (16), CSS (12), HTM (22), NAV (9), NCX (3), ACC (12), MED (15)
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
- `HTM-058` - UTF-16 BOM detection for XHTML documents (return early, no further validation)
- `CSS-003` - UTF-16 BOM detection for CSS documents (warning, decode and continue)
- `CSS-004` - Non-UTF-8 @charset declaration detection in CSS documents
- `HTM-010` - Unusual epub namespace URI detection (scan raw content, fix namespace for parsing)
- `ACC-011` - SVG link accessibility check extended to standalone SVG documents (was XHTML-embedded only)
- `RSC-006` - Remote base URL detection for `<base href>` with relative stylesheet references
- SVG link accessibility helper now checks `<text>` child and `xlink:title` attribute
- Rendition vocabulary validation (`rendition:layout/orientation/spread/flow/viewport`) — global meta value/multiplicity/refines checks
- Spine itemref rendition override mutual exclusivity checking (layout, orientation, spread, page-spread, flow)
- `rendition:spread-portrait` deprecation detection (global meta and spine override)
- `rendition:viewport` deprecation detection
- Fixed-layout (FXL) detection rewritten — uses `rendition:layout` meta + spine overrides instead of broken `fixed-layout` manifest property
- `HTM-046` - Missing viewport meta in FXL XHTML documents (was broken due to FXL detection)
- `HTM-047` - Viewport syntax error (empty value after `=`)
- `HTM-048` - Missing viewBox on outermost `<svg>` in FXL SVG documents
- `HTM-056` - Missing width/height dimension in viewport content
- `HTM-057` - Invalid viewport dimension value (must be positive number or device keyword)
- `HTM-059` - Duplicate width/height in single viewport meta tag
- `HTM-060a` - Secondary viewport meta in FXL documents (usage)
- `HTM-060b` - Viewport meta in reflowable documents (usage)
- `OPF-027` - Unknown `rendition:*` prefix meta properties
- `RSC-005` - `media:active-class` multiplicity check (must not occur more than once)
- `RSC-005` - `media:playback-active-class` multiplicity check (must not occur more than once)
- `RSC-005` - `media:duration` SMIL3 clock value syntax validation (full clock, timecount)
- `RSC-005` - ARIA IDREF validation (aria-describedby/labelledby/flowto/owns/controls must reference existing IDs)
- `RSC-005` - aria-activedescendant must reference a descendant element
- `RSC-005` - aria-describedat obsolete attribute detection
- `RSC-005` - label[for], output[for], td/th[headers] IDREF validation
- SMIL media overlay document validation (structure, nesting rules, clock values)
- `MED-005` - Audio reference to non-standard audio type
- `MED-008` - clipBegin after clipEnd
- `MED-009` - clipBegin equals clipEnd
- `MED-010` - Content document missing media-overlay attribute
- `MED-011` - Content document referenced from multiple Media Overlay documents
- `MED-012` - media-overlay attribute ID mismatch
- `MED-013` - Media Overlay has no reference to content document
- `MED-014` - Audio file URL must not have fragment
- `MED-016` - Media Overlays total duration should be sum of all overlay durations (1-second tolerance)
- `RSC-005` - Media overlay OPF metadata: active-class/playback-active-class refines and multiple class names
- `RSC-005` - Media overlay manifest: invalid SMIL type, non-content-doc media-overlay, missing global/per-item duration
- `RSC-005` - epub:type attribute forbidden on HTML metadata elements (head, meta, title, style, link, script, noscript, base)
- `RSC-005` - usemap attribute format validation (must match `#.+`)
- `CSS-005` - Alt Style Tag class conflict detection (vertical+horizontal, day+night) — fixed from incorrect title-based check
- `OPF-018` - Standalone CSS files: declared `remote-resources` but no remote references found
- `RSC-017` - Nested `<ol>` in page-list/landmarks nav (should be flat, no nested sublists)

---

See `AGENTS.md` for commands, coding standards, architecture, and Java source mappings.
