# EPUBCheck-TS Project Status

Quick reference for implementation progress vs Java EPUBCheck.

## Overview

| Category | Completion | Status |
|----------|------------|--------|
| OCF Validation | ~70% | 🟡 Core features done, missing encryption/signatures |
| OPF Validation | ~70% | 🟡 Core features done, missing link elements/refines cycles |
| Content (XHTML/SVG) | ~70% | 🟡 Core done, missing ARIA/DOCTYPE/entities |
| CSS Validation | ~50% | 🟡 Basic validation, missing vendor prefixes |
| Navigation (nav/NCX) | ~40% | 🟡 Basic nav done, NCX strong |
| Schema Validation | ~50% | 🟡 RelaxNG for OPF/container; XHTML/SVG disabled (libxml2 limitation) |
| Media Overlays | 0% | ❌ Not implemented |
| Accessibility | ~30% | 🟡 Basic checks only (ACC-004/005/009/011) |
| Cross-reference | ~75% | ✅ Strong implementation |

**Overall: ~67% complete (453 tests passing, 17 skipped)**

---

## Test Coverage

### Current Test Suite

| Category | Tests | Passed | Skipped |
|----------|-------|--------|---------|
| **Unit Tests** | 422 | 419 | 3 |
| **Integration Tests** | 48 | 34 | 14 |
| **Total** | **470** | **453** | **17** |

### Integration Test Files

```
test/integration/
├── epub.test.ts               # 4 tests  - Basic EPUB validation
├── ocf.integration.test.ts    # 33 tests (27 pass, 6 skip) - OCF/ZIP/container
├── opf.integration.test.ts    # 18 tests (13 pass, 5 skip)  - Package document
├── content.integration.test.ts # 11 tests (8 pass, 3 skip)  - XHTML/CSS/SVG
└── nav.integration.test.ts    # 4 tests  (4 pass, 0 skip)   - Navigation
```

**Note**: Integration tests imported from Java EPUBCheck test suite (`/Users/william/epubcheck/src/test/resources/epub3/`).

### Test Fixtures

```
test/fixtures/
├── valid/                 # 17 valid EPUBs
├── invalid/
│   ├── ocf/              # 25 OCF error cases
│   ├── opf/              # 15 OPF error cases
│   ├── content/          # 6 content error cases
│   └── nav/              # 3 navigation error cases
└── warnings/             # 2 warning cases
```

**Total**: 68 EPUB test fixtures (imported from Java EPUBCheck)

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

**Unit tests (3)** - libxml2-wasm XPath limitations with namespaced attributes:
- `test/unit/content/validator.test.ts:257` - OPF-014 inline event handlers
- `test/unit/content/validator.test.ts:514` - CSS-005 conflicting stylesheets
- `test/unit/content/validator.test.ts:655` - OPF-088 unknown epub:type prefix

**Integration tests (14)** - Features not yet implemented or library limitations:
- OPF-060: Duplicate ZIP entry detection (1 test) - fflate deduplicates entries
- Unicode compatibility normalization NFKC (2 tests)
- CSS-008: CSS syntax error detection (1 test)
- RSC-026: URL leaking/path-absolute detection (2 tests)
- Unicode character composition in filenames (1 test)
- Percent-encoded URLs (1 test)
- Various: Link, font, remote resource validation (6 tests)

---

## What Works Well

### ✅ Fully Implemented
- **Mimetype validation** (PKG-005/006/007)
- **Container.xml** (RSC-002/005, PKG-004)
- **Package attributes** (OPF-001/030/048)
- **Required metadata** (OPF-015/016/017)
- **Manifest validation** (RSC-001, OPF-012/013/014/074/091)
- **Spine validation** (OPF-033/034/043/049/050)
- **Fallback chains** (OPF-040/045)
- **Collections** (OPF-071-084)
- **NCX validation** (NCX-001/002/003/006)
- **CSS validation** (@font-face, @import, position, forbidden properties CSS-001)
- **Navigation** (NAV-001/002/010)
- **Scripted property** (OPF-014)
- **MathML/SVG properties** (OPF-014)
- **Remote resources property** (OPF-014)
- **Basic accessibility** (ACC-004/005/009/011)
- **Cross-references** (RSC-006/007/008/010/011/012/013/014/020/026/027/028/029/031)
- **Filename validation** (PKG-009/010/011/027)
- **Duplicate filename detection** (OPF-060) - Unicode NFC normalization, case folding
- **Non-UTF8 filename detection** (PKG-027)
- **Cite attribute validation** (RSC-007 for blockquote/q/ins/del cite attributes)
- **Unreferenced resources** (OPF-097)

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

1. **libxml2-wasm XPath limitations** - Queries for namespaced attributes don't work properly (affects 3 skipped tests)
2. **libxml2-wasm RelaxNG limitations** - Cannot parse XHTML/SVG schemas due to complex recursive patterns (`oneOrMore//interleave//attribute`). Java uses Jing which handles these. XHTML/SVG RelaxNG validation disabled; content validated via Schematron instead.
3. **Schematron XSLT 2.0** - Some XSLT 2.0 functions not fully supported by fontoxpath
4. **RelaxNG deprecation** - libxml2 plans to remove RelaxNG support in future

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
| 07-navigation-document | 40 | 4 | 4 | 10% |
| 08-layout | 51 | 0 | 0 | 0% |
| 09-media-overlays | 51 | 0 | 0 | 0% |
| D-vocabularies (ARIA) | 56 | 0 | 0 | 0% |
| Other | 6 | 0 | 0 | 0% |
| **Total** | **719** | **70** | **50** | **7%** |

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
- `CSS-001` - Forbidden CSS properties (direction, unicode-bidi)
- `NAV-010` - Remote links in toc/landmarks/page-list navigation
- `RSC-011` - Navigation links to items not in spine
- Script detection excludes non-JS types (application/ld+json, application/json)

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
