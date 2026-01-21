# EPUBCheck-TS Project Status

This document tracks the implementation progress compared to the original Java EPUBCheck.

## Overview

| Category | Java EPUBCheck | TypeScript Port | Status |
|----------|---------------|-----------------|--------|
| OCF Validation | 100% | ~40% | 🟡 Partial |
| OPF Validation | 100% | ~40% | 🟡 Partial |
| Content (XHTML/SVG) | 100% | ~25% | 🟡 Partial |
| CSS Validation | 100% | ~15% | 🔴 Basic |
| Navigation (nav/NCX) | 100% | ~30% | 🟡 Partial |
| Schema Validation | 100% | ~70% | 🟡 Partial |
| Media Overlays | 100% | 0% | ❌ Not Started |
| Accessibility | 100% | 0% | ❌ Not Started |
| Cross-reference | 100% | ~40% | 🟡 Partial |

**Overall Completion: ~35%**

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
| Filename validation | ✅ | ❌ | PKG-009-012 | Special chars, Unicode |
| encryption.xml | ✅ | ❌ | - | Font obfuscation |
| signatures.xml | ✅ | ❌ | - | Digital signatures |
| metadata.xml | ✅ | ❌ | - | Multiple renditions |
| Empty directories | ✅ | ❌ | PKG-014 | - |

**Status: ~40% complete**

---

### 2. OPF (Package Document) Validation

| Feature | Java | TS | Message IDs | Notes |
|---------|:----:|:--:|------------|-------|
| Package schema | ✅ | 🟡 | RSC-005 | RelaxNG + Schematron available |
| unique-identifier | ✅ | ✅ | OPF-030, OPF-048 | Implemented |
| Package version | ✅ | ❌ | OPF-001 | Not validated |
| dc:identifier required | ✅ | ✅ | OPF-015 | Implemented |
| dc:title required | ✅ | ✅ | OPF-016 | Implemented |
| dc:language required | ✅ | ✅ | OPF-017 | Implemented |
| dc:date format | ✅ | ❌ | OPF-053, OPF-054 | W3C date validation |
| dcterms:modified | ✅ | ✅ | OPF-054 | EPUB 3 |
| dc:creator role | ✅ | ❌ | OPF-052 | MARC relator codes |
| Empty metadata | ✅ | ❌ | OPF-072 | - |
| Manifest duplicates | ✅ | ✅ | OPF-074 | Implemented |
| Manifest file exists | ✅ | ✅ | OPF-010 | Implemented |
| Media type format | ✅ | ❌ | - | RFC4288 validation |
| Deprecated types | ✅ | ❌ | OPF-035, OPF-037, OPF-038 | OEB 1.x |
| Remote resources | ✅ | ❌ | RSC-006, RSC-006b | Property requirement |
| Data URLs | ✅ | ❌ | RSC-029 | EPUB 3 |
| META-INF items | ✅ | ❌ | PKG-025 | - |
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

**Status: ~40% complete**

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
| Image validation | ✅ | ❌ | MED-001, OPF-051 | src, alt, media types |
| Script detection | ✅ | ❌ | SCP-* | Scripted property |
| MathML detection | ✅ | ❌ | OPF-014 | mathml property |
| SVG validation | ✅ | ❌ | - | Separate schema |
| epub:type validation | ✅ | ❌ | OPF-088 | Vocabulary check |
| Fixed-layout viewport | ✅ | ❌ | HTM-046-060 | Meta viewport |
| img alt text | ✅ | ❌ | ACC-* | Accessibility |
| MathML alt text | ✅ | ❌ | ACC-009 | - |
| Discouraged elements | ✅ | ❌ | HTM-055 | base, embed |

**Status: ~25% complete**

---

### 4. CSS Validation

| Feature | Java | TS | Message IDs | Notes |
|---------|:----:|:--:|------------|-------|
| CSS syntax parsing | ✅ | ✅ | CSS-001 | css-tree integrated |
| @font-face validation | ✅ | ❌ | CSS-007 | Font MIME types |
| position: fixed | ✅ | ✅ | CSS-006 | Warning - discouraged |
| position: absolute | ✅ | ✅ | CSS-019 | Warning - use caution |
| Remote fonts | ✅ | ❌ | - | Property requirement |
| Empty URIs | ✅ | ❌ | CSS-002 | - |
| Alt stylesheet | ✅ | ❌ | CSS-005, CSS-015 | Conflict, title |
| @import validation | ✅ | ❌ | - | - |
| Media overlay classes | ✅ | ❌ | CSS-029, CSS-030 | - |

**Status: ~15% complete** (parsing + position warnings)

---

### 5. Navigation Validation

| Feature | Java | TS | Message IDs | Notes |
|---------|:----:|:--:|------------|-------|
| Nav doc schema | ✅ | 🟡 | RSC-005 | RelaxNG available |
| epub:type="toc" | ✅ | ✅ | NAV-001 | Implemented |
| ol element | ✅ | ✅ | NAV-002 | Implemented |
| TOC link targets | ✅ | ❌ | NAV-010 | RSC-007 equivalent |
| Reading order | ✅ | ❌ | NAV-011 | - |
| Page-list validation | ✅ | ❌ | NAV-010 | - |
| Landmarks validation | ✅ | ❌ | NAV-010 | - |
| NCX schema | ✅ | 🟡 | RSC-005 | RelaxNG available |
| NCX uid match | ✅ | ✅ | NCX-001 | Implemented |
| NCX navMap required | ✅ | ✅ | NCX-002 | Implemented |
| NCX content src | ✅ | ❌ | NCX-006 | - |
| EDUPub sections | ✅ | ❌ | NAV-004 | - |
| EDUPub LOA/LOI/LOT/LOV | ✅ | ❌ | NAV-005-008 | - |

**Status: ~30% complete**

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
| Undeclared resources | ✅ | ❌ | RSC-008 | Files in container not in manifest |
| Fragment validation | ✅ | ✅ | RSC-012 | ID existence check |
| Fragment type mismatch | ✅ | ❌ | RSC-014 | SVG vs XHTML |
| Hyperlink to non-spine | ✅ | ✅ | RSC-011 | Implemented |
| Non-content hyperlink | ✅ | ✅ | RSC-010 | Implemented |
| Stylesheet fragment | ✅ | ✅ | RSC-013 | Implemented |
| Remote HTTPS | ✅ | ✅ | RSC-031 | Implemented |
| Malformed URL | ✅ | ✅ | RSC-020 | Implemented |
| File URL | ✅ | ✅ | RSC-026 | Implemented |
| Leaking path | ✅ | ✅ | RSC-027, RSC-028 | Implemented |
| Unused resources | ✅ | ✅ | OPF-097 | Implemented |

**Status: ~40% complete**

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
| Empty links | ✅ | ❌ | ACC-004 | Anchors need text |
| Image alt | ✅ | ❌ | - | Alt text required |
| MathML alt | ✅ | ❌ | ACC-009 | alttext/annotation |
| SVG link title | ✅ | ❌ | ACC-011 | Accessible name |

**Status: 0% complete**

---

### 11. Scripting Validation

| Feature | Java | TS | Message IDs | Notes |
|---------|:----:|:--:|------------|-------|
| Script detection | ✅ | ❌ | SCP-* | In XHTML |
| Scripted property | ✅ | ❌ | OPF-014 | Required if scripts |
| Script events | ✅ | ❌ | SCP-* | onclick, etc. |
| Form detection | ✅ | ❌ | SCP-* | - |

**Status: 0% complete**

---

## Implementation Priority

### High Priority (for basic validation)
1. **Schema Validation** - Required for many other validations
   - RelaxNG via libxml2-wasm
   - Schematron via fontoxpath

2. **Cross-Reference Validation** - High impact on validation quality
   - Link target validation
   - Fragment validation

3. **Full XML Parsing** - Replace regex-based with proper DOM
   - Better content validation
   - Accurate error reporting

### Medium Priority
4. **CSS Validation** - Straightforward, library already installed
5. **Navigation Validation** - Complete nav and NCX validation
6. **NCX Validation** - EPUB 2 support

### Lower Priority
7. **Media Validation** - Image/audio/video checks
8. **Media Overlays** - EPUB 3 feature
9. **Accessibility** - Nice to have

---

## Test Coverage

| Module | Tests | Status |
|--------|-------|--------|
| src/ocf/validator.ts | 11 | ✅ Passing |
| src/ocf/zip.ts | 15 | ✅ Passing |
| src/opf/parser.ts | 12 | ✅ Passing |
| src/content/validator.ts | 21 | ✅ Passing |
| src/references/validator.ts | 19 | ✅ Passing |
| src/css/validator.ts | 6 | ✅ Passing |
| Integration tests | 4 | ✅ Passing |
| **Total** | **127** | **✅ All passing** |

---

## Message IDs Defined

| Prefix | Category | Defined | Used | Progress |
|--------|----------|---------|------|----------|
| PKG | Package/Container | 15 | 8 | 53% |
| OPF | Package Document | 15 | 13 | 87% |
| RSC | Resources | 20 | 0 | 0% |
| HTM | HTML/XHTML | 33 | 4 | 12% |
| CSS | CSS Validation | 19 | 0 | 0% |
| NAV | Navigation | 9 | 2 | 22% |
| NCX | NCX (EPUB 2) | 5 | 0 | 0% |
| ACC | Accessibility | 17 | 0 | 0% |
| MED | Media | 15 | 0 | 0% |
| SCP | Scripting | 10 | 0 | 0% |
| CHK | Internal Errors | 7 | 0 | 0% |

**Total: ~165 defined, ~35 actively used (21%)**

---

## Next Steps

1. ~~Implement schema validation infrastructure (libxml2-wasm)~~ ✅ Complete
2. Add full XML DOM parsing for content validation
3. Implement cross-reference validation
4. Complete CSS validation
5. ~~Add comprehensive integration tests~~ ✅ Integration tests added
