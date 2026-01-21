# EPUBCheck-TS Project Status

This document tracks the implementation progress compared to the original Java EPUBCheck.

## Overview

| Category | Java EPUBCheck | TypeScript Port | Status |
|----------|---------------|-----------------|--------|
| OCF Validation | 100% | ~40% | 🟡 Partial |
| OPF Validation | 100% | ~55% | 🟡 Partial |
| Content (XHTML/SVG) | 100% | ~45% | 🟡 Partial |
| CSS Validation | 100% | ~30% | 🟡 Partial |
| Navigation (nav/NCX) | 100% | ~40% | 🟡 Partial |
| Schema Validation | 100% | ~70% | 🟡 Partial |
| Media Overlays | 100% | 0% | ❌ Not Started |
| Accessibility | 100% | ~75% | 🟡 Partial |
| Cross-reference | 100% | ~60% | 🟡 Partial |

**Overall Completion: ~54%**

---

## Detailed Feature Comparison

### 1. OCF (Container) Validation

| Feature | Java | TS | Message IDs | Notes |
|---------|:----:|:--:|------------|-------|
| ZIP file opening | ✅ | ✅ | PKG-001 | Basic validation |
| Mimetype first entry | ✅ | ✅ | PKG-005 | Implemented (uses original ZIP order) |
| Mimetype uncompressed | ✅ | ❌ | PKG-006 | Not implemented |
| Mimetype content | ✅ | ✅ | PKG-007 | Implemented |
| container.xml exists | ✅ | ✅ | PKG-003 | Implemented |
| container.xml parsing | ✅ | ✅ | PKG-004 | Basic parsing |
| container.xml schema | ✅ | 🟡 | RSC-005 | RelaxNG validation available |
| Filename validation | ✅ | ✅ | PKG-009-012 | Special chars, Unicode |
| encryption.xml | ✅ | ❌ | - | Font obfuscation |
| signatures.xml | ✅ | ❌ | - | Digital signatures |
| metadata.xml | ✅ | ❌ | - | Multiple renditions |
| Empty directories | ✅ | ✅ | PKG-014 | - |

**Status: ~65% complete**

---

### 2. OPF (Package Document) Validation

| Feature | Java | TS | Message IDs | Notes |
|---------|:----:|:--:|------------|-------|
| Package schema | ✅ | 🟡 | RSC-005 | RelaxNG + Schematron available |
| unique-identifier | ✅ | ✅ | OPF-030, OPF-048 | Implemented |
| Package version | ✅ | ✅ | OPF-001 | Implemented |
| dc:identifier required | ✅ | ✅ | OPF-015 | Implemented |
| dc:title required | ✅ | ✅ | OPF-016 | Implemented |
| dc:language required | ✅ | ✅ | OPF-017 | Implemented |
| dc:date format | ✅ | ✅ | OPF-053, OPF-054 | W3C date validation |
| dcterms:modified | ✅ | ✅ | OPF-054 | EPUB 3 |
| dc:creator role | ✅ | ✅ | OPF-052 | MARC relator codes |
| Empty metadata | ✅ | ✅ | OPF-072 | - |
| Manifest duplicates | ✅ | ✅ | OPF-074 | Implemented |
| Manifest file exists | ✅ | ✅ | OPF-010 | Implemented |
| Media type format | ✅ | ✅ | OPF-014 | RFC4288 validation |
| Deprecated types | ✅ | ✅ | OPF-035, OPF-037, OPF-038 | OEB 1.x warnings |
| Remote resources | ✅ | ✅ | RSC-006, RSC-006b | Property requirement |
| Data URLs | ✅ | ✅ | RSC-029 | EPUB 3 |
| META-INF items | ✅ | ✅ | PKG-025 | - |
| Item properties | ✅ | ✅ | OPF-012 | nav, cover-image, etc. |
| Unknown properties | ✅ | ✅ | OPF-012 | Warning |
| Invalid nav media type | ✅ | ✅ | OPF-012 | Implemented |
| Fragment in href | ✅ | ✅ | OPF-091 | EPUB 3 |
| Missing nav document | ✅ | ✅ | OPF-013 | EPUB 3 |
| Spine exists | ✅ | ✅ | OPF-033 | Implemented |
| Linear items | ✅ | ✅ | OPF-033 | Implemented |
| Duplicate itemrefs | ✅ | ✅ | OPF-034 | EPUB 2 |
| NCX reference | ✅ | ✅ | OPF-049, OPF-050 | Implemented |
| Invalid itemref | ✅ | ✅ | OPF-049 | Implemented |
| Invalid spine media type | ✅ | ✅ | OPF-043 | Implemented |
| Fallback chains | ✅ | ✅ | OPF-040, OPF-045 | Implemented |
| Guide validation | ✅ | ✅ | OPF-031 | EPUB 2 |
| Collections | ✅ | ❌ | OPF-071-084 | Dict, Index, Preview |

**Status: ~65% complete**

---

### 3. Content Document Validation

| Feature | Java | TS | Message IDs | Notes |
|---------|:----:|:--:|------------|-------|
| NVDL/RNC schema | ✅ | 🟡 | RSC-005 | RelaxNG available |
| Schematron rules | ✅ | 🟡 | SCH-* | Schematron validator implemented |
| XML well-formedness | ✅ | ✅ | HTM-004 | DOM-based parsing |
| XHTML namespace | ✅ | ✅ | HTM-001 | Implemented |
| head/title/body | ✅ | ✅ | HTM-002, HTM-003 | Implemented |
| Unescaped ampersands | ✅ | ✅ | HTM-012 | Implemented |
| Unescaped less-than | ✅ | ✅ | HTM-012 | Implemented |
| Link validation | ✅ | ❌ | RSC-007, RSC-010-011 | Target validation |
| Image validation | ✅ | ✅ | MED-001, OPF-051 | src, alt, media types |
| Script detection | ✅ | ✅ | OPF-014 | Scripted property check |
| MathML detection | ✅ | ❌ | OPF-014 | mathml property |
| SVG validation | ✅ | ❌ | - | Separate schema |
| epub:type validation | ✅ | ✅ | OPF-088 | Vocabulary check |
| Fixed-layout viewport | ✅ | ✅ | HTM-046-060 | Meta viewport |
| img alt text | ✅ | ❌ | ACC-* | Accessibility |
| MathML alt text | ✅ | ❌ | ACC-009 | - |
| Discouraged elements | ✅ | ✅ | HTM-055 | base, embed warnings |

**Status: ~52% complete**

---

### 4. CSS Validation

| Feature | Java | TS | Message IDs | Notes |
|---------|:----:|:--:|------------|-------|
| CSS syntax parsing | ✅ | ✅ | CSS-008 | css-tree integrated |
| @font-face validation | ✅ | ✅ | CSS-007, CSS-019, CSS-028 | Font MIME types, empty check, info |
| position: fixed | ✅ | ✅ | CSS-006 | Warning - discouraged |
| position: absolute | ✅ | ✅ | CSS-019 | Warning - use caution |
| Remote fonts | ✅ | 🟡 | - | Font URLs extracted for validation |
| Empty URIs | ✅ | ✅ | CSS-002 | Implemented |
| Alt stylesheet | ✅ | ✅ | CSS-005, CSS-015 | Conflict, title |
| @import validation | ✅ | ✅ | CSS-002 | Import URLs extracted |
| Media overlay classes | ✅ | ✅ | CSS-029, CSS-030 | - |

**Status: ~50% complete**

---

### 5. Navigation Validation

| Feature | Java | TS | Message IDs | Notes |
|---------|:----:|:--:|------------|-------|
| Nav doc schema | ✅ | 🟡 | RSC-005 | RelaxNG available |
| epub:type="toc" | ✅ | ✅ | NAV-001 | Implemented |
| ol element | ✅ | ✅ | NAV-002 | Implemented |
| TOC link targets | ✅ | ✅ | NAV-010 | Remote links check |
| Reading order | ✅ | ❌ | NAV-011 | - |
| Page-list validation | ✅ | ✅ | NAV-010 | Remote links check |
| Landmarks validation | ✅ | ✅ | NAV-010 | Remote links check |
| NCX schema | ✅ | 🟡 | RSC-005 | RelaxNG available |
| NCX uid match | ✅ | ✅ | NCX-001 | Implemented |
| NCX navMap required | ✅ | ✅ | NCX-002 | Implemented |
| NCX content src | ✅ | ✅ | NCX-006 | Implemented |
| EDUPub sections | ✅ | ❌ | NAV-004 | - |
| EDUPub LOA/LOI/LOT/LOV | ✅ | ❌ | NAV-005-008 | - |

**Status: ~40% complete**

---

### 6. Schema Validation

| Feature | Java | TS | Message IDs | Notes |
|---------|:----:|:--:|------------|-------|
| RelaxNG (RNC/RNG) | ✅ | ✅ | RSC-005 | libxml2-wasm (RNC converted to RNG) |
| XSD | ✅ | ✅ | RSC-005 | libxml2-wasm |
| Schematron | ✅ | ✅ | SCH-* | fontoxpath + slimdom |
| NVDL | ✅ | ❌ | - | Multi-namespace |
| XML Catalog | ✅ | ❌ | - | Schema resolution |
| Schema bundling | ✅ | ✅ | - | Gzip-compressed, lazy decompression |

**Status: ~70% complete** (RelaxNG, XSD, Schematron implemented; schemas bundled)

---

### 7. Cross-Reference Validation

| Feature | Java | TS | Message IDs | Notes |
|---------|:----:|:--:|------------|-------|
| Missing targets | ✅ | ✅ | RSC-007, RSC-007w | Implemented |
| Undeclared resources | ✅ | ✅ | RSC-008 | Files in container not in manifest |
| Fragment validation | ✅ | ✅ | RSC-012 | ID existence check |
| Fragment type mismatch | ✅ | ✅ | RSC-014 | SVG view fragments |
| Hyperlink to non-spine | ✅ | ✅ | RSC-011 | Implemented |
| Non-content hyperlink | ✅ | ✅ | RSC-010 | Implemented |
| Stylesheet fragment | ✅ | ✅ | RSC-013 | Implemented |
| Remote HTTPS | ✅ | ✅ | RSC-031 | Implemented |
| Malformed URL | ✅ | ✅ | RSC-020 | Implemented |
| File URL | ✅ | ✅ | RSC-026 | Implemented |
| Leaking path | ✅ | ✅ | RSC-027, RSC-028 | Implemented |
| Unused resources | ✅ | ✅ | OPF-097 | Implemented |

**Status: ~60% complete**

---

### 8. Media Validation

| Feature | Java | TS | Message IDs | Notes |
|---------|:----:|:--:|------------|-------|
| Audio media types | ✅ | ❌ | MED-005 | Core types only |
| Video media types | ✅ | ❌ | MED-005 | - |
| Image validation | ✅ | ❌ | OPF-029, OPF-051, OPF-057 | Magic, size, dims |
| Format mismatch | ✅ | ❌ | PKG-022 | Ext vs content |
| Corrupt images | ✅ | ❌ | PKG-021 | - |
| Picture fallback | ✅ | ❌ | MED-003, MED-007 | - |
| Track validation | ✅ | ❌ | - | - |
| Object fallback | ✅ | ❌ | - | - |

**Status: 0% complete**

---

### 9. Media Overlay Validation

| Feature | Java | TS | Message IDs | Notes |
|---------|:----:|:--:|------------|-------|
| SMIL schema | ✅ | ❌ | - | RNC/Schematron |
| Clip times | ✅ | ❌ | MED-008, MED-009 | clipBegin < clipEnd |
| Audio source | ✅ | ❌ | MED-005 | Blessed types |
| Text src | ✅ | ❌ | MED-011, MED-017 | Reference content doc |
| epub:textref | ✅ | ❌ | - | - |
| SVG fragment | ✅ | ❌ | MED-018 | - |
| Media overlay attr | ✅ | ❌ | MED-010-013 | Bidirectional |
| Duration sum | ✅ | ❌ | MED-016 | Match total |

**Status: 0% complete**

---

### 10. Accessibility Validation

| Feature | Java | TS | Message IDs | Notes |
|---------|:----:|:--:|------------|-------|
| Empty links | ✅ | ✅ | ACC-004 | Anchors need text |
| Image alt | ✅ | ✅ | ACC-005 | Alt text required |
| MathML alt | ✅ | ✅ | ACC-009 | alttext/annotation |
| SVG link title | ✅ | ✅ | ACC-011 | Accessible name |

**Status: ~75% complete**

---

### 11. Scripting Validation

| Feature | Java | TS | Message IDs | Notes |
|---------|:----:|:--:|------------|-------|
| Script detection | ✅ | ✅ | OPF-014 | script, svg:script elements |
| Scripted property | ✅ | ✅ | OPF-014 | Required if scripts (EPUB 3) |
| Script events | ✅ | ✅ | OPF-014 | onclick, onload, etc. |
| Form detection | ✅ | ✅ | OPF-014 | form element detection |

**Status: ~80% complete**

---

## Implementation Priority

### High Priority (for core validation)

1. **Remote resources property (RSC-006, RSC-006b)**
   - Check manifest items with remote resources have "remote-resources" property
   - Required for EPUB 3 compliance
   - Directly impacts validity of many EPUBs

2. **Image validation (MED-001, OPF-051)**
   - Image src attribute validation
   - Image alt text validation (partially done via ACC-005)
   - Core to EPUB publications

3. **epub:type validation (OPF-088)**
   - Vocabulary/structure validation
   - Important for specialized EPUBs (indexes, dictionaries)

4. **CSS alt stylesheet validation (CSS-005, CSS-015)**
   - Alternate stylesheet conflict detection
   - Title validation for alt stylesheets
   - Straightforward to implement

5. **dc:creator role validation (OPF-052)**
   - MARC relator code validation
   - Important for library/publishing workflows

### Medium Priority (for completeness)

6. **Link validation in content documents (RSC-007, RSC-010-011)**
   - Target validation within XHTML/SVG content
   - Hyperlink to non-spine detection in context
   - Improve content document validation quality

7. **Collections (OPF-071-084)**
   - Dictionary, Index, Preview collection validation
   - Specialized but important for certain EPUB types

8. **OCF container improvements**
   - Mimetype uncompressed check (PKG-006)
   - Filename validation for special characters (PKG-009-012)
   - Empty directory detection (PKG-014)

9. **CSS media overlay classes (CSS-029, CSS-030)**
   - EPUB 3 media overlays CSS support

### Lower Priority (specialized features)

10. **Media Validation** - Audio/video format checks
11. **Media Overlays** - EPUB 3 synchronized text/audio
12. **Advanced Accessibility** - ARIA, table headers, page breaks

---

## Test Coverage

| Module | Tests | Status |
|--------|-------|--------|
| src/ocf/validator.ts | 11 | ✅ Passing |
| src/ocf/zip.ts | 15 | ✅ Passing |
| src/opf/parser.ts | 12 | ✅ Passing |
| src/content/validator.ts | 34 | ✅ Passing |
| src/content/parser.ts | 23 | ✅ Passing |
| src/references/validator.ts | 19 | ✅ Passing |
| src/css/validator.ts | 17 | ✅ Passing |
| src/nav/validator.ts | 7 | ✅ Passing |
| src/schema/*.ts | 9 | ✅ Passing |
| Integration tests | 4 | ✅ Passing |
| **Total** | **151** | **✅ All passing** |

---

## Message IDs Defined

| Prefix | Category | Defined | Used | Progress |
|--------|----------|---------|------|----------|
| PKG | Package/Container | 15 | 10 | 67% |
| OPF | Package Document | 15 | 27 | N/A* |
| RSC | Resources | 20 | 13 | 65% |
| HTM | HTML/XHTML | 33 | 6 | 18% |
| CSS | CSS Validation | 19 | 6 | 32% |
| NAV | Navigation | 9 | 3 | 33% |
| NCX | NCX (EPUB 2) | 5 | 4 | 80% |
| ACC | Accessibility | 17 | 4 | 24% |
| MED | Media | 15 | 0 | 0% |
| SCP | Scripting | 10 | 0 | 0% |
| SCH | Schematron | 5 | 1 | 20% |
| CHK | Internal Errors | 7 | 0 | 0% |

**Total: ~165 defined, ~74 actively used (45%)**

*Note: OPF uses additional message IDs beyond those originally defined, covering extended validation scenarios.*

---

## Release Readiness (0.1.0)

### ✅ Ready
- All 151 tests passing
- Build successful (ESM + CJS + type definitions)
- ESLint and TypeScript checks passing
- Documentation complete (README, AGENTS.md, PROJECT_STATUS.md)
- Integration tests with valid/invalid EPUB files
- Schema infrastructure working (RelaxNG, XSD, Schematron)
- Web demo functional
- CI/CD workflows configured
- CSS validation with @font-face, @import, empty URI detection
- Content validation with script detection, discouraged elements
- Accessibility validation with empty links, image alt, SVG titles
- Undeclared resources detection (RSC-008)

### 📋 Post-Release Tasks
- Add remote resources property check (RSC-006, RSC-006b)
- Add image validation (MED-001, OPF-051)
- Add epub:type validation (OPF-088)
- Add CSS alt stylesheet validation (CSS-005, CSS-015)
- Implement media validation
- Add CLI tool

## Next Steps

### Completed ✅
1. ~~Implement schema validation infrastructure (libxml2-wasm)~~
2. ~~Add comprehensive integration tests~~
3. ~~Fix lint/format configuration conflicts~~
4. ~~Enhance CSS validation (@font-face, @import)~~
5. ~~Add script detection and OPF-014 validation~~
6. ~~Add discouraged element warnings (HTM-055)~~
7. ~~Add accessibility validation (ACC-004, ACC-005, ACC-009, ACC-011)~~
8. ~~Add undeclared resources check (RSC-008)~~
9. ~~Add package version validation (OPF-001)~~
10. ~~Add media type format validation (RFC4288)~~
11. ~~Add deprecated media type warnings (OPF-035, OPF-037, OPF-038)~~
12. ~~Add NCX content src validation (NCX-006)~~
13. ~~Add MathML accessibility check (ACC-009)~~
14. ~~Add nav remote link validation (NAV-010)~~
15. ~~Add fragment type mismatch validation (RSC-014)~~
16. ~~Add data URL validation (RSC-029)~~
17. ~~Add dc:date format validation (OPF-053, OPF-054)~~
18. ~~Add remote resources property check (RSC-006, RSC-006b)~~
19. ~~Add image validation (MED-001, OPF-051)~~
20. ~~Add epub:type validation (OPF-088)~~
21. ~~Add CSS alt stylesheet validation (CSS-005, CSS-015)~~
22. ~~Add dc:creator role validation (OPF-052)~~
23. ~~Add empty metadata check (OPF-072)~~
24. ~~Add META-INF items validation (PKG-025)~~
25. ~~Add filename validation (PKG-009-012)~~
26. ~~Add empty directories check (PKG-014)~~
27. ~~Add CSS media overlay classes validation (CSS-029, CSS-030)~~
28. ~~Add fixed-layout viewport validation (HTM-046-060)~~

### In Progress 🚧
- None

### Upcoming 📋
1. Link validation in content documents (RSC-007, RSC-010-011) - Medium Priority
2. Collections validation (OPF-071-084) - Medium Priority
3. OCF mimetype uncompressed check (PKG-006) - Medium Priority
