# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - Unreleased

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

[0.1.0]: https://github.com/likecoin/epubcheck-ts/compare/v0.0.0...v0.1.0
