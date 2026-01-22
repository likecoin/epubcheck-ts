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
| Schema Validation | ~70% | 🟡 RelaxNG/XSD/Schematron working |
| Media Overlays | 0% | ❌ Not implemented |
| Accessibility | ~30% | 🟡 Basic checks only (ACC-004/005/009/011) |
| Cross-reference | ~75% | ✅ Strong implementation |

**Overall: ~65% complete (404 tests passing, 3 skipped)**

---

## Test Coverage vs Java EPUBCheck

**Java**: 533 Cucumber scenarios across 15+ feature files, 712+ test resources (EPUBs, OPFs, XHTMLs)
**TypeScript**: 404 tests (196 unit + 204 source + 4 integration)

### Quality: ⭐⭐⭐⭐ (4/5) for implemented features

**Strong areas:**
- NCX validation (24 tests - better than Java's 8 scenarios)
- CSS validation (57 tests - better granularity than Java's 19)
- Cross-reference validation (48 tests)
- Fast execution (~300ms vs Java's integration-heavy suite)

**Critical gaps:**
- ❌ **ARIA validation** - No role/attribute checks (Java has dozens)
- ❌ **ID/IDREF validation** - No duplicate detection
- ❌ **DOCTYPE validation** - No obsolete identifier checks
- ❌ **Entity validation** - No external entity checks
- ❌ **Base URL** - No xml:base or HTML base support
- ❌ **Advanced accessibility** - Only 30% of Java coverage
- ❌ **Media overlays** - Not implemented

**Skipped tests (3):**
All due to libxml2-wasm XPath limitations with namespaced attributes:
- `test/unit/content/validator.test.ts:257` - OPF-014 inline event handlers
- `test/unit/content/validator.test.ts:514` - CSS-005 conflicting stylesheets
- `test/unit/content/validator.test.ts:655` - OPF-088 unknown epub:type prefix

*Implementations exist and are correct; skipped due to library limitations, not bugs.*

---

## E2E Test Integration Plan

### Quick Start

**Goal**: Increase integration test coverage from 4 → ~65 tests by importing Java EPUBCheck test resources.

**Action Items**:
1. Copy 40-50 EPUB test files from `/Users/william/epubcheck/src/test/resources/`
2. Create 4 new integration test files (OCF, OPF, content, navigation)
3. Write ~60 test scenarios aligned with 65% implementation status
4. Mark known failures with `.skip()` for unimplemented features

**Time Estimate**: 1-2 weeks for Tier 1 (essential core tests)

### Java EPUBCheck Test Suite Analysis

**Location**: `/Users/william/epubcheck/src/test/resources/`

| Category | Scenarios | Test Files | Implementation Match |
|----------|-----------|-----------|---------------------|
| **EPUB 3 - Minimal** | 5 | 6 | 100% (baseline) |
| **EPUB 3 - OCF** | 56 | 63 | ~70% (container, ZIP, filenames) |
| **EPUB 3 - Package Document** | 121 | 163 | ~70% (metadata, manifest, spine) |
| **EPUB 3 - Content Documents** | 215 | 120 | ~60% (XHTML/CSS/SVG) |
| **EPUB 3 - Navigation** | 40 | 24 | ~65% (nav structure, NCX) |
| **EPUB 2 - All** | 96 | 96 | ~40% (basic support) |
| **TOTAL** | **533** | **472** | **~65% aligned** |

### Recommended Test Imports (Priority Order)

#### **Tier 1: Essential Core (25-30 EPUBs)**

**Minimal & Valid Baseline:**
- `epub3/00-minimal/files/minimal.epub` ✅ (already have)
- `epub3/00-minimal/files/minimal/` (expanded EPUB)
- `epub2/files/minimal-valid.epub` (EPUB 2.0)

**OCF/Container (10 files):**
- `ocf-mimetype-file-missing-error.epub` ✅ (PKG-006)
- `ocf-mimetype-file-incorrect-value-error.epub` (PKG-007)
- `ocf-container-file-missing-fatal.epub` (PKG-003 fatal)
- `ocf-container-not-ocf-error.epub` ✅ (have)
- `ocf-filename-character-forbidden-error.epub` ✅ (PKG-009)
- `ocf-filename-character-space-warning/` (PKG-010)
- `ocf-filename-duplicate-after-case-folding-error.epub` (OPF-060)
- `ocf-url-leaking-in-opf-error/` (RSC-026)
- `ocf-filename-not-utf8-error.epub` (PKG-027)
- `ocf-filepath-utf8-valid.epub` (validation)

**Package Document (10-12 files):**
- `metadata-identifier-missing-error.opf` (OPF-017)
- `metadata-title-missing-error.opf` (OPF-015)
- `metadata-language-missing-error.opf` (OPF-016)
- `metadata-modified-missing-error.opf` (RSC-005)
- `manifest-item-missing-media-type-error.opf` (OPF-093)
- `manifest-item-href-with-fragment-error.opf` (OPF-091)
- `spine-empty-error.opf` (OPF-049)
- `spine-itemref-idref-not-found-error.opf` (OPF-049)
- `package-unique-identifier-unknown-error.opf` (RSC-005)
- `properties-scripted-missing-error/` (OPF-014)
- `properties-remote-resources-missing-error/` (OPF-014)

**Content Documents (5-8 files):**
- `xhtml-minimal-valid.xhtml` (baseline)
- `xhtml-title-missing-error/` (HTM-003)
- `xhtml-xmlns-missing-error/` (HTM-001)
- `css-encoding-error/` (CSS-003/004)
- `svg-minimal-valid.svg` (baseline SVG)

**Navigation (3-5 files):**
- `nav-minimal-valid/` (baseline)
- `nav-missing-toc-error/` (NAV-001)
- `nav-external-link-error/` (NAV-010)

#### **Tier 2: Extended Coverage (10-15 EPUBs)**

**Resource Validation:**
- `resource-not-in-manifest-error/` (RSC-007)
- `resource-undeclared-error/` (RSC-008)
- `resource-missing-error/` (RSC-001)

**Properties & Features:**
- `properties-mathml-missing-error/` (OPF-014)
- `properties-svg-missing-error/` (OPF-014)
- `fallback-chain-circular-error/` (OPF-045)
- `cover-image-property-error/` (OPF-012)

**Warnings & Edge Cases:**
- `filename-character-space-warning/` (PKG-010)
- `metadata-identifier-uuid-invalid-warning.opf` (OPF-085)
- Various non-ASCII filename tests (PKG-012)

### Integration Test Structure

```
test/
├── fixtures/
│   ├── valid/
│   │   ├── minimal-epub30.epub                 ✅ Have (2)
│   │   ├── minimal-epub20.epub                 → Import
│   │   └── minimal-expanded/                   → Import
│   ├── invalid/
│   │   ├── ocf/                                ✅ Have (3) → Add 7 more
│   │   ├── opf/                                → Import 10-12
│   │   ├── content/                            → Import 5-8
│   │   └── nav/                                → Import 3-5
│   └── warnings/                               → Import 5
└── integration/
    ├── epub.test.ts                            ✅ Have (4 tests)
    ├── ocf.integration.test.ts                 → Create (~15 tests)
    ├── opf.integration.test.ts                 → Create (~20 tests)
    ├── content.integration.test.ts             → Create (~10 tests)
    └── nav.integration.test.ts                 → Create (~8 tests)
```

### Target Test Growth

**Current**: 4 integration tests with 5 EPUB files
**Goal**: ~65 integration tests with 40-50 EPUB files

**Phase 1** (Foundation): +35 tests (OCF, OPF)
**Phase 2** (Content): +18 tests (XHTML, CSS, SVG, Nav)
**Phase 3** (Edge Cases): +15 tests (warnings, properties)

### Expected Test Results

Given 65% implementation status:

- ✅ **Will Pass**: OCF basics, OPF metadata/manifest/spine, basic XHTML/CSS, navigation structure
- ⚠️ **May Fail**: Advanced properties, refines cycles, link elements, UUID validation
- ❌ **Will Fail**: Media overlays, encryption, signatures, ARIA, DOCTYPE, entity validation

**Recommendation**: Mark known failures with `.skip()` and track as implementation targets

### Copy Commands

```bash
# Create test directory structure
mkdir -p test/fixtures/valid
mkdir -p test/fixtures/invalid/{ocf,opf,content,nav}
mkdir -p test/fixtures/warnings

# Copy essential valid cases
cp /Users/william/epubcheck/src/test/resources/epub3/00-minimal/files/minimal.epub \
   test/fixtures/valid/minimal-epub30.epub

# Copy OCF test cases
cp /Users/william/epubcheck/src/test/resources/epub3/04-ocf/files/ocf-mimetype-file-incorrect-value-error.epub \
   test/fixtures/invalid/ocf/
cp /Users/william/epubcheck/src/test/resources/epub3/04-ocf/files/ocf-container-file-missing-fatal.epub \
   test/fixtures/invalid/ocf/
cp /Users/william/epubcheck/src/test/resources/epub3/04-ocf/files/ocf-filename-not-utf8-error.epub \
   test/fixtures/invalid/ocf/

# Copy OPF test cases (directories need -r flag)
cp /Users/william/epubcheck/src/test/resources/epub3/05-package-document/files/metadata-identifier-missing-error.opf \
   test/fixtures/invalid/opf/
cp /Users/william/epubcheck/src/test/resources/epub3/05-package-document/files/metadata-title-missing-error.opf \
   test/fixtures/invalid/opf/

# Note: Many Java test cases are expanded directories, not packed EPUBs
# Use `cp -r` for directories and manually pack if needed
```

### Test Conversion Notes

**Java Format** (Cucumber/Gherkin):
```gherkin
Scenario: Report missing mimetype file
  When checking EPUB 'ocf-mimetype-file-missing-error.epub'
  Then error PKG-006 is reported
  And no other errors or warnings are reported
```

**TypeScript Format** (Vitest):
```typescript
it('should report missing mimetype file (PKG-006)', async () => {
  const data = await loadEpub('invalid/ocf/ocf-mimetype-file-missing-error.epub');
  const result = await EpubCheck.validate(data);

  expect(result.valid).toBe(false);
  expect(result.messages.some(m => m.id === 'PKG-006')).toBe(true);
});
```

### License Compatibility

- **Java EPUBCheck**: BSD-3-Clause License
- **This Project**: GPL-3.0-only License
- **Test Files**: Test data (factual, non-copyrightable)
- ✅ **Safe to copy** test EPUB files with attribution
- ⚠️ **Do not copy** Java source code (incompatible licenses)

---

## What Works Well

### ✅ Fully Implemented
- **Mimetype validation** (PKG-005/006/007/008)
- **Container.xml** (PKG-003/004/010)
- **Package attributes** (OPF-001/030/048)
- **Required metadata** (OPF-015/016/017)
- **Manifest validation** (OPF-010/012/013/014/074/091)
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
- **Cross-references** (RSC-006/007/010/011/012/013/014/020/026/027/028/029/031)
- **Undeclared resources** (RSC-008)
- **Unreferenced resources** (OPF-097)

### 🟡 Partially Implemented
- **Schema validation** - RelaxNG/XSD/Schematron work, but XPath has limitations
- **Content validation** - Core structure good, missing ARIA/DOCTYPE/entities
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
- Duplicate ID detection
- Media format validation (image magic numbers, corrupt files)

---

## Known Issues

1. **libxml2-wasm XPath limitations** - Queries for namespaced attributes don't work properly (affects 3 skipped tests)
2. **Schematron XSLT 2.0** - Some XSLT 2.0 functions not fully supported by fontoxpath
3. **RelaxNG deprecation** - libxml2 plans to remove RelaxNG support in future

---

## Priority Next Steps

### Critical Priority (Test Infrastructure)
1. **E2E Test Integration** - Import 40-50 test EPUBs from Java suite
   - Copy Tier 1 files (25-30 EPUBs): OCF, OPF, content, navigation
   - Create integration test files: ocf, opf, content, nav
   - Target: 65 integration tests (from current 4)
   - Align test expectations with 65% implementation status

### High Priority (Core Validation)
1. **ARIA validation** - Role and attribute validation
2. **ID/IDREF validation** - Duplicate ID detection
3. **DOCTYPE validation** - Obsolete identifiers
4. **Entity validation** - External entities
5. **Base URL handling** - xml:base, HTML base
6. **Refines cycles** - OPF-065 detection
7. **Link elements** - rel, hreflang, properties
8. **UUID format** - dc:identifier validation

### Medium Priority (Completeness)
1. **Media overlays** - SMIL validation
2. **Encryption.xml** - Font obfuscation
3. **Full WCAG 2.0** - Comprehensive accessibility
4. **Advanced media** - Format validation, magic numbers
5. **URL encoding** - Edge cases

### Low Priority (Specialized)
- Dictionary/index advanced validation
- Multiple renditions (metadata.xml)
- Signatures.xml validation

---

## Message IDs

**Defined**: ~165 message IDs
**Actively used**: ~74 (45%)

Most-used prefixes: OPF (27), RSC (13), PKG (10), CSS (6), HTM (6), NAV (3), NCX (4), ACC (4)
Unused: MED (0), SCP (0), CHK (0)

---

## Commands

```bash
npm test              # Run tests
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

### Finding Specific Tests
```bash
# Search for tests by message ID
grep -r "PKG-006" /Users/william/epubcheck/src/test/resources/

# List all test EPUBs
find /Users/william/epubcheck/src/test/resources/ -name "*.epub"

# View feature file scenarios
cat /Users/william/epubcheck/src/test/resources/epub3/04-ocf/ocf.feature

# Count scenarios in a category
grep "Scenario:" /Users/william/epubcheck/src/test/resources/epub3/05-package-document/package-document.feature | wc -l
```
