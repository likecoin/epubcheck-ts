# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.3.3] - 2026-02-06

### Added

- **60+ new integration tests** ported from Java EPUBCheck
  - OCF tests: emoji filenames, encryption.xml, signatures.xml, font obfuscation
  - OPF tests: manifest properties, link elements, remote resources, spine validation
  - Nav tests: EPUB CFI, page-list, reading order
  - Content tests: CSS syntax errors, schema validation
- **OPF-027**: Undefined manifest property detection
  - Now correctly reports unknown properties (was incorrectly using OPF-012)
  - Catches prefixed properties like `rendition:layout-pre-paginated`
- **OPF-093**: Missing media-type for local linked resources
  - Reports error when `<link>` element points to local resource without media-type
- **iframe reference validation** (RSC-007)
  - Extracts `<iframe src>` attributes and validates referenced resources

### Fixed

- **Remote link false positive** - `<link>` elements with remote URLs (http/https) no longer trigger RSC-007w
- **Nav document validation** - Now checks all `<nav>` elements, not just the first one
  - Fixed false NAV-001 when toc nav wasn't the first nav element
- **EPUB CFI handling** - Links with `#epubcfi(...)` fragments no longer trigger RSC-011

## [0.3.2] - 2026-02-02

### Added

- **20+ new integration tests** ported from Java EPUBCheck
  - Hyperlink validation (RSC-007, RSC-012)
  - Image validation (SVG fragments, srcset)
  - Iframe, base URL, MathML, and SVG reference tests
  - Remote resources tests (audio, video, fonts, stylesheets, scripts)
- **MathML altimg reference validation** (RSC-007)
  - Extracts `altimg` attributes from `<math>` elements
  - Validates referenced images exist in EPUB
- **Non-SVG fragment warning** (RSC-009)
  - Warns when non-SVG images are referenced with fragment identifiers
- **Remote script detection** (RSC-006)
  - Extracts `<script src>` attributes
  - Reports remote scripts as forbidden resources
- **Img srcset parsing** (RSC-008)
  - Parses `srcset` attribute and validates all referenced images
  - Detects undeclared resources in srcset
- **HTM-045 message** for empty href attributes (USAGE severity)

### Fixed

- **Data URL handling** - No longer rejects all data URLs in EPUB 3
  - Data URLs now allowed for images, audio, video, fonts
  - Only forbidden in hyperlinks, nav links, and cite references (per spec)
- **SVG fragment validation** - Fragments stripped before resource lookup
- **SVG ID extraction** - SVG documents now parsed for ID registration
  - Enables fragment validation like `image.svg#rect`

## [0.3.1] - 2026-01-29

### Changed

- **Refactored message system to use MessageId enum**
  - Consolidated message definitions into a single enum (`MessageId`)
  - All message IDs now use enum references instead of string literals
  - Aligns internal code structure with Java EPUBCheck's approach

### Fixed

- Code formatting cleanup via npm pkg fix

## [0.3.0] - 2026-01-28

### Changed

- **Message registry aligned with Java EPUBCheck**
  - All message severities now match Java's `DefaultSeverities.java` exactly
  - Suppressed messages matching Java: NCX-002, NCX-003, NAV-002, ACC-004, ACC-005, HTM-012
  - PKG-001 severity changed from fatal to warning (matches Java)
  - CSS-006 severity changed from warning to usage (matches Java)
  - Use `pushMessage()` helper for automatic severity lookup from registry
- Refactored all error reporting to use centralized message registry

### Fixed

- Test expectations updated to match Java EPUBCheck behavior
- 20 tests now skipped for messages that are suppressed in Java EPUBCheck

## [0.2.4] - 2026-01-27

### Added

- **Link element validation (RSC-007)**
  - Validates `<link>` element references in content documents
  - Reports missing resources referenced by link elements
- **OPF-099: Self-referencing manifest items**
  - Detects manifest items that reference themselves
- **RSC-026: URL leaking detection**
  - Detects URLs that leak information via test base URL technique
- **CSS url() reference extraction**
  - Extracts and validates references from CSS `url()` declarations
  - Supports background-image, list-style-image, and other CSS properties

### Fixed

- **RSC-001 false positives** for URL-encoded hrefs in OPF manifest
  - Hrefs like `table%20us%202.png` are now properly decoded before file existence check
- **HTM-004 false positives** for HTML entities in EPUB 2 files
  - Common HTML entities (&nbsp;, &copy;, etc.) no longer cause errors
  - Works around libxml2-wasm not loading external DTDs

### Changed

- Removed schemas from published package (smaller npm package size)
- Test coverage improved from 453 to 467 tests passing (7 skipped, down from 17)
- Overall completion improved from ~67% to ~70%
- Web demo updated with library usage description and npm links

## [0.2.3] - 2026-01-23

### Added

- **OPF-060: Duplicate filename detection**
  - Detects filenames that conflict after Unicode NFD normalization
  - Full Unicode case folding support (ß→ss, ẞ→ss, ligatures like ﬁ→fi, ﬂ→fl, etc.)
- **PKG-027: Non-UTF8 filename detection**
  - Validates raw ZIP filename bytes for valid UTF-8 sequences
  - Detects overlong encodings, surrogates, and invalid byte sequences
- **RSC-007: Cite attribute validation**
  - Validates `cite` attribute references on `blockquote`, `q`, `ins`, `del` elements
  - Reports missing resources referenced by cite attributes
- **E2E integration tests**
  - Ported additional test cases from Java EPUBCheck test suite
  - Added tests for OPF-033/034/048/049/050, OPF-040/045, CSS-001, NAV-010, RSC-011

### Fixed

- OPF-034 (duplicate spine itemref) now works for EPUB 3 (was EPUB 2 only)
- OPF-050 (spine toc attribute) validation now works for EPUB 3
- CSS-001 forbidden properties detection (direction, unicode-bidi) now wired up
- Script detection excludes non-JS script types (application/ld+json, application/json)

### Changed

- Test coverage improved from 447 to 453 tests passing (17 skipped, down from 23)
- Overall completion improved from ~65% to ~67%

## [0.2.2] - 2026-01-22

### Added

- Line/column numbers in error messages for content, nav, and NCX validators
- Line/column numbers extracted from RelaxNG and XSD schema validation errors
- Message sorting by severity in web UI "All" filter

### Fixed

- Fix duplicate error reporting for missing resources (RSC-007, RSC-008, MED-001)
- RSC-007 now only reports when file doesn't exist in container (aligns with Java EPUBCheck)
- RSC-008 reports files that exist in container but aren't declared in manifest
- Removed MED-001 check (Java EPUBCheck suppresses this error ID)
- Fix false positive PKG-025 errors for arbitrary files in META-INF directory
- Fix OPF-014 to allow dots in MIME type subtypes (e.g., `application/vnd.ms-opentype`)

### Changed

- Disable RelaxNG validation for XHTML/SVG/NAV content due to libxml2-wasm limitations
  (libxml2 doesn't support complex recursive patterns like `oneOrMore//interleave//attribute`)
  Content validation still works via Schematron and custom validators

## [0.2.1] - 2026-01-22

### Added

- CLI `-u/--usage` flag to include usage messages (matches Java EPUBCheck `-u` option)

### Fixed

- Fix false positive errors for ZIP directory entries (PKG-009, PKG-025, RSC-008)
- Fix NCX-001 UID comparison to use the correct unique-identifier reference
- Fix NCX-001 severity from warning to error (matches Java EPUBCheck)
- Fix RSC-008 severity from warning to error (matches Java EPUBCheck)
- Fix CSS-028 severity from info to usage (matches Java EPUBCheck)
- Filter usage/info messages based on options (usage messages no longer shown by default)

## [0.2.0] - 2026-01-22

### Added

- **OCF Container validation**:
  - Mimetype uncompressed check (PKG-006) - validates compression method = 0
  - Mimetype extra field check (PKG-005) - validates no extra field in ZIP header
  - Filename validation for special characters (PKG-009-012)
  - META-INF directory allowed files check (PKG-025)
  - Empty directory detection (PKG-014)
- **OPF validation**:
  - Package version attribute validation (OPF-001) - validates 2.0, 3.0, 3.1, 3.2, 3.3
  - RFC4288 media type format validation (OPF-014)
  - Deprecated OEB 1.0 media type warnings (OPF-035, OPF-037, OPF-038)
  - W3C date format validation for dc:date (OPF-053) including partial dates
  - W3C date format validation for dcterms:modified (OPF-054)
  - Remote resources property requirement check (RSC-006, RSC-006b)
  - dc:creator MARC relator code validation (OPF-052)
  - Empty metadata section check (OPF-072)
  - Collections validation (OPF-071-084) - Dictionary, Index, Preview collection support
  - Unused resource detection (OPF-097)
- **Content document validation**:
  - MathML detection and missing "mathml" property validation (OPF-014)
  - SVG detection and missing "svg" property validation (OPF-014)
  - Remote resources detection and missing "remote-resources" property validation (OPF-014)
  - Script detection (script elements, event handlers, form elements)
  - Missing "scripted" property validation (OPF-014) for EPUB 3
  - Discouraged element warnings for base and embed (HTM-055)
  - Image src reference validation (MED-001, OPF-051)
  - epub:type vocabulary validation (OPF-088)
  - Alternate stylesheet validation (CSS-005, CSS-015) - title requirement and conflict detection
  - Fixed-layout viewport meta validation (HTM-046-060)
  - Link validation in content documents (RSC-007, RSC-010, RSC-011)
- **NCX validation**:
  - navPoint content src reference validation (NCX-006)
- **Navigation validation**:
  - Remote link validation in toc, landmarks, and page-list navs (NAV-010)
- **Accessibility validation**:
  - Empty link detection (ACC-004)
  - Image alt attribute validation (ACC-005)
  - MathML alttext/annotation validation (ACC-009)
  - SVG link accessible name validation (ACC-011)
- **CSS validation**:
  - @font-face validation with font MIME type checking (CSS-007)
  - @font-face empty declaration warnings (CSS-019)
  - @font-face info messages (CSS-028)
  - @import URL extraction for cross-reference validation
  - Empty URI detection in CSS (CSS-002)
  - Font reference extraction for manifest validation
  - Media overlay class name validation (CSS-029, CSS-030)
- **Cross-reference validation**:
  - Fragment type mismatch validation (RSC-014) - SVG view fragments
  - Data URL validation (RSC-029) - not allowed in EPUB 3
  - Undeclared resources detection (RSC-008) - files in container not in manifest
- 81 new unit tests (208 total, up from 127)

### Changed

- Overall completion improved from ~35% to ~65%
- OCF validation completion improved from ~40% to ~70%
- OPF validation completion improved from ~40% to ~70%
- Content validation completion improved from ~25% to ~70%
- CSS validation completion improved from ~15% to ~50%
- Cross-reference validation improved from ~40% to ~75%
- Accessibility validation from 0% to ~75%
- CSS parse errors now use CSS-008 message ID (more accurate than CSS-001)
- CSSValidator.validate() now returns CSSValidationResult with extracted references

### Fixed

- Fixed layout related messages alignment with Java EPUBCheck
- Severity alignment for usage messages
- OPF-097, OPF-053, and OPF-014 behavior aligned with Java EPUBCheck
- Collection parsing with comprehensive test coverage

### Validation Coverage

| Component | Status | Completeness |
|-----------|--------|--------------|
| OCF Container | 🟡 Partial | ~70% |
| Package Document (OPF) | 🟡 Partial | ~70% |
| Content Documents | 🟡 Partial | ~70% |
| CSS | 🟡 Partial | ~50% |
| Navigation (nav/NCX) | 🟡 Partial | ~40% |
| Schema Validation | 🟡 Partial | ~70% |
| Cross-reference | 🟡 Partial | ~75% |
| Accessibility | 🟡 Partial | ~75% |
| Media Validation | ❌ Not Started | 0% |
| Media Overlays | ❌ Not Started | 0% |

**Overall: ~65% of Java EPUBCheck features**

## [0.1.0] - 2026-01-21

### Added

- EPUB validation library for Node.js (18+) and modern browsers
- OCF (Open Container Format) validation with ~40% feature parity
- OPF (Package Document) validation with ~40% feature parity
- Content Document (XHTML) validation with ~25% feature parity
- Navigation document validation (EPUB 3 nav, EPUB 2 NCX) with ~30% feature parity
- Cross-reference validation with ~40% feature parity
- CSS validation with basic support for position properties (~15% feature parity)
- Schema validation infrastructure:
  - RelaxNG validation via libxml2-wasm
  - XSD validation via libxml2-wasm
  - Schematron validation via fontoxpath + slimdom
- Bundled schema files (gzip-compressed, 87% size reduction)
- 127 unit and integration tests, all passing
- Type-safe TypeScript API with strict type checking
- ESM and CommonJS support
- Full TypeScript type definitions
- Web demo for browser-based validation

### Validation Coverage

| Component | Status | Completeness |
|-----------|--------|--------------|
| OCF Container | 🟡 Partial | ~40% |
| Package Document (OPF) | 🟡 Partial | ~40% |
| Content Documents | 🟡 Partial | ~25% |
| CSS | 🔴 Basic | ~15% |
| Navigation (nav/NCX) | 🟡 Partial | ~30% |
| Schema Validation | 🟡 Partial | ~70% |
| Cross-reference | 🟡 Partial | ~40% |
| Media Validation | ❌ Not Started | 0% |
| Media Overlays | ❌ Not Started | 0% |
| Accessibility | ❌ Not Started | 0% |

**Overall: ~35% of Java EPUBCheck features**

### Technical Details

- **Bundle Size**: ~55KB JS + ~1.5MB WASM (libxml2-wasm)
- **Dependencies**: 0 native dependencies (pure JS/WASM)
- **License**: GPL-3.0
- **TypeScript**: Strict mode with comprehensive type safety

### Known Limitations

- ~35% feature parity with Java EPUBCheck
- Schematron XSLT 2.0 functions (matches, tokenize) not fully supported
- No media validation (images, audio, video)
- No accessibility checks (alt text, etc.)
- No media overlays validation
- No script detection/validation

[Unreleased]: https://github.com/likecoin/epubcheck-ts/compare/v0.3.3...HEAD
[0.3.3]: https://github.com/likecoin/epubcheck-ts/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/likecoin/epubcheck-ts/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/likecoin/epubcheck-ts/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/likecoin/epubcheck-ts/compare/v0.2.4...v0.3.0
[0.2.4]: https://github.com/likecoin/epubcheck-ts/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/likecoin/epubcheck-ts/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/likecoin/epubcheck-ts/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/likecoin/epubcheck-ts/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/likecoin/epubcheck-ts/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/likecoin/epubcheck-ts/compare/v0.0.0...v0.1.0
