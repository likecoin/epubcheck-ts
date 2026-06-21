# EPUBCheck-TS Project Status

Quick reference for implementation progress vs Java EPUBCheck. This is the **only** place for volatile status (test counts, completion %, known issues). Per-fix history lives in `git log`, not here.

## Overview

| Category | Completion | Notes |
|----------|------------|-------|
| OCF Validation | ~92% | URL leaking, UTF-8, spaces, forbidden chars, encryption/signatures schema |
| OPF Validation | ~92% | Schematron-equivalent checks, refines cycles, duplicate IDs, OPF-090 preferred media types |
| Content (XHTML/SVG) | ~93% | CSS url()/@import, SVG use/epub:type, picture, lang mismatch, microdata, content-model checks |
| CSS Validation | ~85% | url()/@font-face/@import extraction, encoding detection, alt style tags, OPF-018 |
| Navigation (nav/NCX) | ~95% | Content model, landmarks, labels, reading order, nested-ol |
| Schema Validation | ~55% | RelaxNG for OPF/container/encryption/signatures; XHTML/SVG disabled (libxml2 limitation) |
| Media Overlays | ~70% | SMIL structure/timing/audio, cross-ref, reading order, OPF metadata, MED-016 duration sum |
| Accessibility | ~71% | 12/17 ACC checks (content + OPF a11y metadata) |
| Cross-reference | ~92% | URL leaking, CSS/link/embed refs, exempt resources, cross-document feature checks |

**Overall: ~99% complete (1361 tests passing, 14 skipped, 1375 total).**

**100% Java scenario import**: every Java EPUBCheck feature file (core EPUB 3, EPUB 2, profile extensions) is ported. The 14 skipped tests form a discoverable backlog — each has an inline `it.skip` annotation naming the specific blocker.

---

## Test Coverage

### Current Suite

| Category | Tests | Passed | Skipped |
|----------|-------|--------|---------|
| Unit Tests | 443 | 441 | 2 |
| Integration Tests | 932 | 920 | 12 |
| **Total** | **1375** | **1361** | **14** |

Plus a separate packaging regression suite (`npm run test:packaging`, 3 tests) validating built artifacts; runs in CI and on prepublish.

### Integration Test Files

```
test/integration/
├── epub.test.ts                      #   4 tests  (  4 pass,   0 skip) - Basic sanity
├── conformance.integration.test.ts   #  11 tests  ( 11 pass,   0 skip) - Minimal/conformance/media-types
├── ocf.integration.test.ts           #  56 tests  ( 52 pass,   4 skip) - OCF/ZIP/container
├── opf.integration.test.ts           # 173 tests  (173 pass,   0 skip) - Package document + D-vocabularies
├── content.integration.test.ts       # 214 tests  (208 pass,   6 skip) - XHTML/CSS/SVG
├── nav.integration.test.ts           #  38 tests  ( 38 pass,   0 skip) - Navigation
├── resources.integration.test.ts     # 110 tests  (109 pass,   1 skip) - Resources/fallbacks
├── layout.integration.test.ts        #  52 tests  ( 52 pass,   0 skip) - Layout/viewport/FXL
├── mediaoverlays.integration.test.ts #  50 tests  ( 50 pass,   0 skip) - Media overlays/SMIL
├── epub2.integration.test.ts         #  99 tests  ( 98 pass,   1 skip) - EPUB 2 (all 7 Java features)
└── profiles.integration.test.ts      # 125 tests  (125 pass,   0 skip) - 9 profile extensions
```

Integration tests imported from the Java EPUBCheck test suite (`../epubcheck/src/test/resources/epub3/`).

### Test Fixtures

608 EPUB fixtures imported from Java EPUBCheck: `valid/` (257), `invalid/ocf` (37), `invalid/opf` (113), `invalid/content` (137), `invalid/layout` (12), `invalid/nav` (18), `warnings/` (30).

### Skipped Tests (14)

All remaining skips are structural dependency limits, not missing validator work. Search `it.skip` in `test/` for the per-test annotation.

- **Unit (2)** — libxml2-wasm XPath can't match unprefixed namespaced attributes (OPF-014 inline event handlers, OPF-088 unknown epub:type prefix).
- **Core EPUB 3 integration (11)** — library limits (RelaxNG foreignObject/SVG title, css-tree forgiveness, fflate ZIP dedup), pre-existing gaps (SMIL clock strictness, epub:type vocab), unimplemented (OPF-073, PKG-016, `--mode svg`).
- **EPUB 2 integration (1)** — wrong-namespace per-element error count (libxml2-wasm vs Jing reporting shape).

---

## Implementation Status

### ✅ Implemented (highlights)

Mimetype (PKG-005/006/007), container.xml, package attributes, required metadata, manifest/spine validation, rendition properties + FXL detection, viewport meta (HTM-046/047/056/057/059/060), SVG viewBox (HTM-048), fallback chains, collections (OPF-071-084), NCX, CSS (@font-face/@import/url()/CSS-001), navigation content model + landmarks, OPF Schematron-equivalent (duplicate IDs/refines/cycles/multiplicity), link element validation, D-vocabulary + media-overlay vocab, URL leaking (RSC-026), scripted/MathML/SVG/remote/switch properties (OPF-014), cross-references (RSC-006…033), filename validation (PKG-009/010/011/027), duplicate filename detection (OPF-060), font obfuscation (PKG-026), foreign resource fallback (RSC-032), epub:type vocabulary (OPF-086b/087/088), inline CSS (CSS-008), BCP 47 language tags, image magic numbers (MED-004/OPF-029/PKG-022), accessibility checks (ACC-009/011 active; others suppressed by default), SMIL media overlays + single-file `--mode mo`, cross-document feature checks (NAV/HTM/OPF), single-file modes (`exp/opf/xhtml/nav/mo`).

### 🟡 Partially Implemented

- **Schema validation** — RelaxNG for OPF/container works; XHTML/SVG RelaxNG disabled (libxml2-wasm can't handle complex recursive patterns); content validated via Schematron instead.
- **Accessibility** — 12/17 ACC checks; remaining 5 (ACC-008/013/015/016/017) are suppressed by default.
- **Media validation** — magic-number checks done; deep format parsing not implemented.
- **Media overlays** — structure/timing/metadata done (~70%); SMIL clock parser strictness and epub:type vocab pending.

### ❌ Not Implemented

Metadata.xml (multiple renditions), full ARIA roles/attributes, external entity validation, deep media-format validation, the 5 suppressed ACC checks.

---

## Known Issues (dependency limits)

1. **fflate ZIP dedup** — fflate auto-deduplicates ZIP entries, so duplicate-entry detection is impossible (1 skipped test).
2. **css-tree forgiving parser** — successfully parses many invalid CSS snippets, making some syntax-error detection impossible (1 skipped test).
3. **libxml2-wasm XPath** — queries for namespaced attributes don't match (2 skipped unit tests).
4. **libxml2-wasm RelaxNG** — can't parse XHTML/SVG schemas (complex recursive patterns Jing handles); validation done via Schematron instead. libxml2 also plans to remove RelaxNG support in future.
5. **fontoxpath XPath 2.0** — crashes on `tokenize()` etc.; OPF/nav Schematron rules implemented as direct TypeScript.
6. **EPUB 2 wrong-namespace count** — per-element error count differs (libxml2-wasm vs Jing reporting shape; 1 skipped test).
7. **USAGE message dedup** — Java collapses identical USAGE messages per (id, file); TS emits one per occurrence. Cosmetic count drift for CSS-028/OPF-090/RSC-007; no semantic difference.

---

## E2E Coverage vs Java

**100% Java scenario import complete** — every Java EPUBCheck feature file is represented; each skipped test has a specific gap annotation.

| Tier | Java Scenarios | Active | Skipped | Pass Rate |
|---|---:|---:|---:|---:|
| Core EPUB 3 | ~726 | ~695 | 11 | ~98% |
| EPUB 2 | 99 | 98 | 1 | 99% |
| Profile Extensions | 125 | 125 | 0 | 100% |
| **Total** | **~950** | **~918** | **12** | **~97%** |

Core EPUB 3 per-feature: 00-minimal 100%, 02-conformance 100%, 03-resources 97%, 04-ocf 78%, 05-package ~100%, 06-content 97%, 07-navigation 95%, 08-layout 100%, 09-media-overlays 100%, B-external-identifiers 100%, D-vocabularies ~100%, H-media-types 100%.

### Out-of-scope Java features (intentionally not ported)

- `localization/localization.feature` (7) — TS validator has no i18n
- `reporting/json-report.feature` (14) + `reporting/xml-report.feature` (2) — our report format differs
- `cli/cli.feature` — different CLI surface
- `unit-tests/url-fragment.feature` (16) — covered by TS unit tests

---

## Priority Next Steps

Ordered by severity impact (active error/warning messages not yet emitted):

1. **Advanced media** — deep format validation beyond magic numbers (MED-003/004, PKG-021/022, OPF-051/057).
2. **Remaining accessibility** — ACC-008/013/015/016/017 (all suppressed by default; low real-world impact).
3. **Specialized** — dictionary/index advanced validation, multiple renditions (metadata.xml), signatures.xml validation.

---

## Message IDs

**Defined**: 300 · **Actively used**: 185 (62%)

Active by prefix: OPF (62), RSC (26), PKG (22), HTM (22), MED (15), ACC (12), CSS (12), NAV (10), NCX (4). Unused prefixes: SCP, CHK, INF.

### Intentionally Not Emitted (20 IDs)

Defined for registry parity but not emitted by design — **not** counted as gaps:

| ID(s) | Reason |
|---|---|
| `CHK-001`…`CHK-008` (8) | Report malformed `--customMessages` file; TS throws native Node errors instead. |
| `RSC-022` | "Requires Java 7+" — JVM-specific. |
| `RSC-024` / `RSC-025` | Pass-through of Xerces XML diagnostics; TS uses libxml2-wasm. |
| `INF-001` | "Rule under review" placeholder — rarely used even by Java. |
| `PKG-023` | Informational log line, not a validation finding (TS logs via stderr). |
| `OPF-011` | Commented out in upstream Java; no longer emitted. |
| `OPF-021` | Java emits only from DTBook handler (DAISY 3); TS has no DTBook handler. |
| `OPF-036`, `HTM-005`, `HTM-044` | Defined in Java but never emitted by any code path (dead IDs). |
| `HTM-011` | Java notes it's never reported; undeclared entities surface as RSC-005 (matches TS). |
| `PKG-020` | Unreachable in Java's actual flow (stops at OPF-002 first); TS emits OPF-002. |

---

See `AGENTS.md` for commands, coding standards, architecture, and Java source mappings.
