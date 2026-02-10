# Copilot Instructions for epubcheck-ts

## Project Overview

**epubcheck-ts** is a TypeScript port of Java-based [EPUBCheck](https://github.com/w3c/epubcheck) for validating EPUB 2.x/3.x publications. Runs cross-platform in Node.js 18+ and modern browsers with zero native dependencies. Currently ~70% feature parity with Java implementation (see PROJECT_STATUS.md).

**Key Technologies:**
- TypeScript 5.7+ with strict type checking (ESM-first with `.js` extensions required)
- Node.js 18+ (tested on 18, 20, 22)
- Dependencies: libxml2-wasm (XML/schema), fflate (ZIP), css-tree (CSS), fontoxpath (XPath)
- Build: tsup (ESM + CJS), Test: vitest, Lint: eslint + biome

## Build & Validation Workflow

**⚠️ CRITICAL: Commands must run in this exact order:**

### 1. Initial Setup
```bash
npm install              # ~4s, 227 packages. Required before any other command.
```

### 2. Development Workflow
```bash
# Build FIRST (required for typecheck to pass)
npm run build            # ~2s. Creates dist/ needed by bin/epubcheck.ts

# Then run validations
npm run lint             # ~5s. CURRENTLY FAILS: 59 errors in bin/epubcheck.ts
                         # ✅ src/ has 0 errors - don't add new ones!
npm run typecheck        # ~2s. Requires dist/ to exist
npm test -- --run        # ~4s. 507 passing, 48 skipped
npm run format           # Auto-fix formatting. ALWAYS run before commit!

# Combined check (after build)
npm run check            # ~8s. biome format + eslint + typecheck
```

**Why build order matters:**
- `bin/epubcheck.ts` imports from `dist/index.js`
- Without build, typecheck fails with "Cannot find module '../dist/index.js'"

### 3. Common Commands
```bash
npm run dev              # Watch mode build
npm test                 # Interactive test watch
npm run test:coverage    # Coverage report (80% thresholds)
npm run clean            # Remove dist/, coverage/. Use when build issues occur.
```

### 4. Known Issues
- **Build dependency**: typecheck fails without dist/ - always build first
- **Lint errors**: bin/epubcheck.ts has 59 errors (known issue). src/ must stay at 0.
- **CI failure**: CI currently fails on lint step due to bin/ errors
- **Stale builds**: Run `npm run clean && npm run build` if changes don't reflect

## CI/CD Pipeline

`.github/workflows/ci.yml` runs on every push/PR:
- Matrix: Node.js 18, 20, 22 on Ubuntu  
- Steps: checkout → setup → `npm ci` → **build** → lint → typecheck → test
- **Currently FAILS on lint** (59 bin/ errors)

Replicate CI locally:
```bash
rm -rf node_modules dist
npm ci                   # ~2s, clean reproducible install
npm run build            # Build first!
npm run lint             # Will fail (exit code 1)
npm run typecheck        # Requires build
npm test -- --run        # 507 pass
```

**To pass CI:** Either fix bin/epubcheck.ts types OR add `bin/` to eslint ignores

## Project Architecture

```
src/
├── index.ts              # Public API exports
├── checker.ts            # Main validation orchestrator
├── types.ts              # Shared TypeScript interfaces
├── core/                 # Report generation, context
├── ocf/                  # ZIP/container validation (~90%)
├── opf/                  # Package document validation (~85%)
├── content/              # XHTML/SVG validation (~75%)
├── nav/                  # Navigation validation (~40%)
├── ncx/                  # EPUB 2 NCX validation
├── css/                  # CSS validation (~70%)
├── schema/               # RelaxNG/XSD/Schematron (~50%)
├── references/           # Cross-reference validation (~80%)
└── messages/             # Error messages & registry
    ├── messages.ts       # Registry: message IDs → default severities
    └── index.ts          # pushMessage helper, re-exports

test/
├── unit/                 # Co-located unit tests (*.test.ts)
├── integration/          # E2E tests imported from Java EPUBCheck
└── fixtures/             # 154 EPUB test files from Java

Configuration: package.json, tsconfig.json, tsup.config.ts, vitest.config.ts, eslint.config.js, biome.json
```

## Key Conventions

**TypeScript imports (critical):**
```typescript
// ALWAYS use .js extensions for local imports (NodeNext resolution)
import type { ValidationMessage } from './types.js';  // ✓ type-only import
import { Report } from './core/report.js';            // ✓ value import
import { ValidationMessage } from './types';          // ✗ missing .js extension
```

**Message IDs** (compatibility with Java EPUBCheck):
```typescript
import { MessageId, pushMessage } from '../messages/index.js';

// Registry auto-maps IDs to severities
pushMessage(context.messages, {
  id: MessageId.PKG_006,
  message: 'Mimetype must be uncompressed',
  location: { path: 'mimetype' },
});
```

Format: `PREFIX-NNN` (PKG-*, OPF-*, HTM-*, CSS-*, NAV-*, NCX-*, RSC-*, ACC-*, MED-*)

**Naming conventions:**
- Files: kebab-case (`message-id.ts`, `zip-reader.ts`)
- Classes/Types: PascalCase (`EpubCheck`, `ValidationMessage`)
- Functions/vars: camelCase (`validateContainer`, `errorCount`)
- Constants: UPPER_SNAKE_CASE (`DEFAULT_OPTIONS`)

## Making Changes

**Before coding:**
1. Check `CONTRIBUTING.md` - coding standards, testing patterns, porting guidelines
2. Check `PROJECT_STATUS.md` - feature completion %, known issues, skipped tests
3. Check `AGENTS.md` - AI agent-specific context (Java source location, CLI usage)

**During development:**
- Keep changes minimal (this is a port, not a rewrite)
- Preserve Java EPUBCheck message IDs and validation behavior
- Write co-located tests: `foo.ts` → `foo.test.ts`
- Avoid Node.js-specific APIs in src/ (must run in browsers)

**Before committing:**
```bash
npm run clean && npm run build
npx eslint src/          # Check only src/ (must have 0 errors)
npm run typecheck        # Must pass
npm test -- --run        # 507 pass, 48 skip OK
npm run format           # ALWAYS run - auto-fixes formatting
git diff --exit-code     # Verify no uncommitted formatting changes
```

## Troubleshooting

**Build Failures:**
- `Cannot find module '../dist/index.js'` → Run `npm run build` before typecheck
- Stale build, changes not reflected → `npm run clean && npm run build`
- `npm ci` vs `npm install` → Use `npm install` for dev, `npm ci` to match CI

**Test Failures:**
- Tests fail after code changes → Rebuild: `npm run build && npm test -- --run`
- Tests timeout → Increase in vitest.config.ts (currently 10s)

**Lint Failures:**
- 59 lint errors → Known issue in bin/. Check your changes: `npx eslint src/`
- CI fails on lint → Fix bin/ types OR add `bin/` to eslint ignores (temporary)

**Common Mistakes:**
1. Running typecheck before build (always build first!)
2. Forgetting to format (always run `npm run format`)
3. Testing with stale dist/ (use `npm run clean` when in doubt)
4. Adding new lint errors to src/ (src/ must stay at 0 errors)

## Quick Reference

**Environment:** Node 18/20/22 • TypeScript 5.7.2 • Vitest 2.1.8 • ESLint 9.17.0 • Biome 1.9.4

**Tests:** 507 passing, 48 skipped (555 total)

**Coverage:** 80% thresholds (statements, branches, functions, lines)

**Java Reference:** `../epubcheck` (sibling directory) - always cross-reference when implementing logic

**Message Registry:** `src/messages/messages.ts` - 165 IDs defined, ~76 actively used

**Other Documentation:**
- `README.md` - Project overview, architecture, API usage, examples
- `CONTRIBUTING.md` - Coding standards, testing, porting rules, common tasks
- `PROJECT_STATUS.md` - Feature completion, test coverage, known issues, priorities
- `AGENTS.md` - AI agent notes (Java CLI, message imports, E2E test rules)

**Trust these instructions.** Only explore/search if information is incomplete or found incorrect.
