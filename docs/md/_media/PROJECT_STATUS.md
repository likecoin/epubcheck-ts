# EPUBCheck-TS Project Status

Quick reference for implementation progress vs Java EPUBCheck. This is the **only** place for volatile status (test counts, completion %, known issues). Per-fix history lives in `git log`, not here.

## Overview

Per-component estimates. For measured agreement with Java, see [Measured Parity](#measured-parity-vs-java-epubcheck) below — that is the number to quote.

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

**100% Java scenario import**: every Java EPUBCheck feature file (core EPUB 3, EPUB 2, profile extensions) is ported. The 14 skipped tests form a discoverable backlog — each has an inline `it.skip` annotation naming the specific blocker.

---

## Measured Parity vs Java EPUBCheck

Test pass rate measures whether ported scenarios still pass; it cannot see a check that fires when Java stays silent, nor missing location data. These figures come from running both engines over identical inputs and diffing the emitted message IDs. **Java is the oracle.**

Baseline: **EPUBCheck 5.3.0**, measured 2026-08-07 by `npm run parity`. Every row below is reproducible with that command; none are estimates.

### Packaged EPUBs (`test/fixtures/`, n=763)

| Metric | Agreement | |
|---|---|---|
| **Valid/invalid verdict** | **96.7%** | 738/763 |
| Message-ID set, errors + warnings only | 88.5% | 675/763 |
| Message-ID set, all severities | 74.0% | 565/763 |
| Exact match (IDs + counts, all severities) | 67.4% | 514/763 |

Severity assignment agrees on **100%** of paired messages (791/791) — zero mismatches across the corpus.

### Standalone single-file modes (Java's own fixtures, n=1286)

| Mode | n | Exact | Verdict |
|---|---:|---:|---:|
| `--mode opf` | 489 | 93.7% | 97.8% |
| `--mode xhtml` | 745 | 95.6% | 97.9% |
| `--mode svg` | 52 | 88.5% | 92.3% |
| **Total** | **1286** | **94.6%** | **97.6%** |

Regenerate with `npm run parity:standalone`, which needs `../epubcheck` checked out as a sibling. The corpus is every `.opf`/`.xhtml`/`.svg` under `epub3/`, excluding `test-files-unused/`. Severity agrees on 100% of paired messages; 61.9% of messages carry a line (Java: 97.1%), and where both engines locate the same message, 79.0% of lines match.

### Real-world EPUBs (n=5)

5/5 verdict agreement; 4/5 byte-identical message sets. The fifth differs only in report shape (see USAGE dedup under Known Issues). Guarded by `test/integration/real-world.test.ts`.

### Message locations

**73.6%** of messages carry a line number (Java: 81.6%), measured across all severities. Where both engines report the same ID on the same file, **88.4%** of line numbers match exactly; the rest are attribution or convention differences, not arithmetic. Messages still lacking a line come mostly from `RSC-005` rules and from document-level checks where nothing has a position — `OPF-003` has no line in Java either.

Java encodes "no line" as `-1`, not as a missing field. Counting that as a location pins the Java figure at exactly 100%, which is how the harness's first run was caught being wrong; `scripts/parity/engine.ts` normalizes it. A location metric that cannot fall below 100% is not measuring anything.

### Reading these numbers

- **Verdict agreement** is what a user feels: do both tools call the same file valid or invalid?
- **Message-ID agreement** is stricter: do they report the *same* problems? It ignores how many times each ID fired.
- **Exact match** additionally requires identical counts, so it is depressed by the USAGE dedup difference below and is the least meaningful of the three. A fixture where this port reports `RSC-005` twice and Java once agrees on message-ID and disagrees on exact match — which is most of the ~21-point gap between those rows.

### Method

Every figure above is produced by the checked-in harness in `scripts/parity/` — not by hand:

```bash
npm run parity              # packaged corpus: verdict, ID, severity and location figures
npm run parity:standalone   # the single-file table (needs ../epubcheck)
npm run parity:check        # fail if any fixture regressed against the committed baseline
npm run parity:update       # rewrite the baseline after an intended change
```

Both engines run over the same bytes and the message-ID multisets are diffed per fixture, after normalizing Java's `HTM_060b` form to `HTM-060b`. Java is invoked with `-u` always and the extra severities are filtered at comparison time — verified across 24 fixtures spanning the corpus, `-u` leaves the non-USAGE message set byte-identical, so one cached answer serves both the default and `--usage` comparisons.

Java's answers are committed under `test/parity/java/`, keyed on a hash of its version, the fixture path, the argv **and the fixture's bytes**. That is what makes a warm run seconds instead of ~11 minutes, and what makes `npm run parity:check` runnable in CI with no JVM. It is also a correctness property, not just a speed one: an earlier throwaway harness keyed on path alone, which would have served pre-`4b855e9` results for the rewritten placeholder images and reported an improvement that never happened.

Per-fixture state lives in `test/parity/baseline.json`, so a change that fixes four fixtures and breaks three shows up as both, rather than as a flat percentage that barely moves.

Three corpus caveats worth knowing before trusting a delta:
- Roughly half of `test/fixtures/` are synthetic EPUBs wrapping Java's *standalone* fixtures, with fabricated stub assets. Java flags that scaffolding, which inflates apparent gaps; the standalone table above avoids this entirely. This produced all 20 of the former `PKG-021` gaps — `build-fixtures.sh` wrote a 22-byte header-only JPEG and a bare 8-byte PNG signature, neither carrying the dimensions `ImageIO` needs. Both are now real 1×1 images in `test/fixtures/assets/`, and `repair-stub-images.sh` fixed the 22 EPUBs built before that change. When adding a fixture asset, make it a *complete* file of its type, not just magic bytes.
- Java auto-detects the publication version; a differential run must not pass an explicit version, or it will mask version-gating bugs.
- Standalone fixtures must be addressed by **basename**, with the bytes read from wherever they live. Passing a path-qualified name makes every sibling `href` resolve outside the notional container, so `RSC-026` fires on nearly every OPF and the mode's exact-match score collapses to near zero. That is a measurement artifact, not a regression. `scripts/parity/corpus.ts` does this on both sides; it is the single easiest way to get these numbers catastrophically wrong.

The standalone corpus is every `.opf`/`.xhtml`/`.svg` under `../epubcheck/src/test/resources/epub3/`, excluding `test-files-unused/` — fixtures Java's own suite stopped referencing. That is 496/757/52 minus 7/12/0, giving the 489 / 745 / 52 above.

---

## Test Coverage

### Current Suite

| Category | Tests | Passed | Skipped |
|----------|-------|--------|---------|
| Unit Tests | 484 | 482 | 2 |
| Integration Tests | 947 | 935 | 12 |
| **Total** | **1431** | **1417** | **14** |

Unit tests include 17 for the parity harness itself (`test/unit/parity.test.ts`) — cache keying, the ID-set vs ID-count distinction, and the location metric. The harness gates CI, so a silent bug there would not make a check wrong; it would make every check unverifiable while still printing a confident percentage.

Plus a separate packaging regression suite (`npm run test:packaging`, 17 tests) validating the built artifacts and the CLI contract; runs in CI and on prepublish. Both need a prior `npm run build`, which is why they are excluded from the default suite — left in it they pass wherever `dist/` happens to exist and fail on a fresh clone.

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
├── profiles.integration.test.ts      # 125 tests  (125 pass,   0 skip) - 9 profile extensions
├── single-file.integration.test.ts   #  10 tests  ( 10 pass,   0 skip) - --mode xhtml/svg container guard
└── real-world.test.ts                #   5 tests  (  5 pass,   0 skip) - Public-domain books
```

`real-world.test.ts` runs against real published EPUBs rather than spec fixtures. The books are fetched on demand by `npm run fetch:real-epubs` into a gitignored cache; the tests skip themselves when it is absent, so offline runs and CI are unaffected.

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

- **Schema validation** — RelaxNG for OPF/container works; XHTML/SVG RelaxNG disabled (libxml2-wasm can't handle complex recursive patterns); content documents are checked by hand-ported rules in `src/content/validator.ts` instead.
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
4. **libxml2-wasm RelaxNG** — can't parse XHTML/SVG schemas (complex recursive patterns Jing handles); those documents are checked by hand-ported rules instead. libxml2 also plans to remove RelaxNG support in future.
5. **No Schematron engine** — every `.sch` rule is hand-ported to TypeScript. A generic evaluator was tried (fontoxpath + slimdom) and abandoned: fontoxpath lacks the XPath 2.0 functions the EPUB schemas rely on (`matches`, `tokenize`), so it could never have reached parity. Deleted in favour of the hand-ports that already shipped.
6. **EPUB 2 wrong-namespace count** — per-element error count differs (libxml2-wasm vs Jing reporting shape; 1 skipped test).
7. **USAGE message dedup** — Java collapses identical USAGE messages per (id, file); TS emits one per occurrence. Cosmetic count drift for CSS-028/OPF-090/RSC-007; no semantic difference.
8. **`PKG-009` in single-file mode** — with no container, Java resolves each manifest `href` against the document's `file:` URL, so an href that leaks above the base or is path-absolute yields a URL containing `:` and trips the OCF filename-character check. This port has no `file:` base to resolve against and stays silent. Four `--mode opf` fixtures (`ocf-url-leaking-in-opf-error`, `ocf-url-path-absolute-error`, `ocf-meta-inf-with-publication-resource-error`, `file-url-in-css-error`) therefore disagree on verdict. They previously agreed only because a false-positive `RSC-026` supplied an unrelated error; removing it exposed the real gap. Matching Java faithfully would mean emitting local absolute filesystem paths in message text.
9. **Spurious `RSC-005` pair in `--mode opf`** — `unique-identifier-not-found-error.opf` draws two `RSC-005` errors where EPUBCheck 5.3.0 reports nothing, and the second carries an empty `message` string. The empty text suggests a libxml2 DTD-validation error surfacing without a formatted message rather than a rule of ours; not yet diagnosed. Covered by the single-document `OPF-030` test in `test/integration/epub2.integration.test.ts`, which asserts only the absence of `OPF-030` because of this.
10. **Partial parse after a fatal XML error** — Java's SAX handler keeps whatever it read before aborting, so a package document that fails mid-file still yields `OPF-030` from the attributes read before the abort. This port's package parser is regex-based and cannot reproduce a per-element cut-off. The item model *is* matched: Java builds its items in `endElement` on `</package>`, so a parse that aborts earlier leaves an empty manifest, and OPFValidator now skips its structural checks in that case (reporting `OPF-003` against the empty manifest, as Java does). Only `OPF-030` remains, affecting `conformance-xml-malformed-error` and `conformance-xml-undeclared-namespace-error`.

---

## E2E Coverage vs Java

**100% Java scenario import complete** — every Java EPUBCheck feature file is represented; each skipped test has a specific gap annotation.

This table reports how many *ported scenarios* pass, which is a different question from whether the two engines agree — a scenario ported with a subtly wrong expectation passes forever. See [Measured Parity](#measured-parity-vs-java-epubcheck) for the differential figures.

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

Ordered by measured impact on agreement with Java:

1. **Remaining false positives** — 141 error/warning occurrences across 40 IDs that Java does not emit, led by `RSC-005` (45), `RSC-017` (10) and `RSC-006` (9). At usage severity `OPF-088` (495), `OPF-097` (78) and `OPF-003` (55) dominate. These cost more agreement than any unimplemented check.
2. **Remaining coverage gaps** — 90 error/warning occurrences across 20 IDs Java emits and we do not, more than half of them `RSC-005` (50), then `RSC-007` (10). Nothing else reaches five.
3. **Line numbers for `RSC-005`** — ~130 messages still carry no line; the OPF model now records positions, so the remaining work is per-rule attribution.
4. **Advanced media** — deep format validation beyond magic numbers (MED-003/004, PKG-021/022, OPF-051/057). No fixture exercises this any more now that the stub images are real, so it carries no measurable parity cost — but a truncated image in a real book still goes unflagged, and `PKG-021` currently fires only for files under 4 bytes.
5. **Remaining accessibility** — ACC-008/013/015/016/017 (all suppressed by default; low real-world impact).
6. **Specialized** — dictionary/index advanced validation, multiple renditions (metadata.xml), signatures.xml validation.

### Unreachable code

Resolved. `SchematronValidator` and `XMLParser`/`XMLWalker` were deleted — neither was ever imported outside its own test, in any commit. Schematron's rules ship as hand-ported TypeScript in `src/content/validator.ts` and `src/opf/validator.ts`; the misleading comment in `src/schema/orchestrator.ts` now says so. Removing them dropped `slimdom`, `slimdom-sax-parser` and `fontoxpath` (plus `saxes`, `prsc`, `xspattern` transitively) from the install, leaving three runtime dependencies: `css-tree`, `fflate`, `libxml2-wasm`.

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
