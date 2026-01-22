# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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

[Unreleased]: https://github.com/likecoin/epubcheck-ts/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/likecoin/epubcheck-ts/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/likecoin/epubcheck-ts/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/likecoin/epubcheck-ts/compare/v0.0.0...v0.1.0
