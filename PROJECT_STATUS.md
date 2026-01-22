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

**Overall: ~65% complete (434 tests passing, 29 skipped)**

---

## Test Coverage

### Current Test Suite

| Category | Tests | Passed | Skipped |
|----------|-------|--------|---------|
| **Unit Tests** | 375 | 372 | 3 |
| **Integration Tests** | 63 | 62 | 26 |
| **Total** | **463** | **434** | **29** |

### Integration Test Files

```
test/integration/
├── epub.test.ts               # 4 tests  - Basic EPUB validation
├── ocf.integration.test.ts    # 33 tests (21 pass, 12 skip) - OCF/ZIP/container
├── opf.integration.test.ts    # 11 tests (5 pass, 6 skip)   - Package document
├── content.integration.test.ts # 11 tests (5 pass, 6 skip)  - XHTML/CSS/SVG
└── nav.integration.test.ts    # 4 tests  (2 pass, 2 skip)   - Navigation
```

**Note**: Integration tests imported from Java EPUBCheck test suite (`/Users/william/epubcheck/src/test/resources/epub3/`).

### Test Fixtures

```
test/fixtures/
├── valid/                 # 17 valid EPUBs
├── invalid/
│   ├── ocf/              # 25 OCF error cases
│   ├── opf/              # 8 OPF error cases
│   ├── content/          # 6 content error cases
│   └── nav/              # 3 navigation error cases
└── warnings/             # 2 warning cases
```

**Total**: 61 EPUB test fixtures (imported from Java EPUBCheck)

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

**Integration tests (26)** - Features not yet implemented:
- OPF-060: Duplicate filename case folding (4 tests)
- PKG-027: Non-UTF8 filename detection (2 tests)
- CSS-001: Forbidden CSS properties (2 tests)
- CSS-008: CSS syntax error detection (1 test)
- RSC-001/007: CSS resource validation (3 tests)
- NAV-010/011: Navigation link validation (2 tests)
- Various: Link, font, remote resource validation (12 tests)

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
- **CSS basics** (@font-face, @import, position, media overlays)
- **Navigation** (NAV-001/002/010)
- **Scripted property** (OPF-014)
- **MathML/SVG properties** (OPF-014)
- **Remote resources property** (OPF-014)
- **Basic accessibility** (ACC-004/005/009/011)
- **Cross-references** (RSC-006/007/008/010/011/012/013/014/020/026/027/028/029/031)
- **Filename validation** (PKG-009/010/011)
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
- CSS direction/unicode-bidi validation (CSS-001)
- Media format validation (image magic numbers, corrupt files)

---

## Known Issues

1. **libxml2-wasm XPath limitations** - Queries for namespaced attributes don't work properly (affects 3 skipped tests)
2. **libxml2-wasm RelaxNG limitations** - Cannot parse XHTML/SVG schemas due to complex recursive patterns (`oneOrMore//interleave//attribute`). Java uses Jing which handles these. XHTML/SVG RelaxNG validation disabled; content validated via Schematron instead.
3. **Schematron XSLT 2.0** - Some XSLT 2.0 functions not fully supported by fontoxpath
4. **RelaxNG deprecation** - libxml2 plans to remove RelaxNG support in future

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
5. **CSS forbidden properties** - direction, unicode-bidi (CSS-001)
6. **URL encoding** - Edge cases

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
- **EPUB 3 Tests**: `epub3/` (437 scenarios, 8 categories)
  - `00-minimal/` - Baseline valid EPUBs
  - `04-ocf/` - Container/ZIP validation (56 scenarios)
  - `05-package-document/` - OPF validation (121 scenarios)
  - `06-content-document/` - XHTML/CSS/SVG (215 scenarios)
  - `07-navigation-document/` - Nav/NCX (40 scenarios)
- **EPUB 2 Tests**: `epub2/` (96 scenarios)
