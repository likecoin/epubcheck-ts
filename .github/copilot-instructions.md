# Copilot Instructions for epubcheck-ts

## Project Overview

**epubcheck-ts** is a TypeScript port of the Java-based [EPUBCheck](https://github.com/w3c/epubcheck) library for validating EPUB publications against EPUB 2.x and 3.x specifications. The project aims for 1:1 feature parity with the Java implementation while running cross-platform in Node.js 18+ and modern browsers with zero native dependencies.

**Current Status:** ~20% feature parity with Java EPUBCheck (see PROJECT_STATUS.md for detailed comparison)

**Key Technologies:**
- TypeScript 5.7+ with strict type checking (ESM-first with `.js` extensions)
- Node.js 18+ (tested on 18, 20, 22)
- Dependencies: `libxml2-wasm` (XML/schema validation), `fflate` (ZIP), `css-tree` (CSS), `fontoxpath` (XPath)
- Build: `tsup` (ESM + CJS), Test: `vitest`, Lint: `eslint` + `biome`

## Build & Validation Workflow

**CRITICAL: Always run commands in this exact order to avoid issues:**

### 1. Initial Setup (Required)
```bash
npm install  # Takes ~5s, installs 245 packages. MUST run before any other command.
```

### 2. Development Workflow
```bash
# Run ALL checks before committing (matches CI):
npm run lint       # ESLint - strict TypeScript rules (takes ~2s)
npm run typecheck  # tsc --noEmit (takes ~3s)
npm test -- --run  # Vitest - 82 tests pass, 1 skipped (takes ~1s)
npm run build      # tsup builds ESM + CJS + DTS (takes ~2s)

# Or run format + typecheck together:
npm run check      # biome check + tsc --noEmit (takes ~3s)
```

### 3. Common Commands
```bash
npm run dev          # Watch mode build (for development)
npm test             # Interactive test watch mode
npm run test:coverage # Coverage report (80% thresholds)
npm run lint:fix     # Auto-fix ESLint issues
npm run format       # Auto-fix Biome formatting
npm run clean        # Remove dist/ and coverage/
```

### 4. Known Issues & Workarounds

- **Formatting**: Some files have Biome formatting issues (`src/core/report.ts`, `examples/web/main.js`). Run `npm run format` to fix before committing.
- **Security**: `npm install` reports 6 moderate vulnerabilities (transitive deps). These are in dev dependencies only and can be ignored.
- **Test timeout**: Default is 10s. If tests timeout, check `vitest.config.ts`.

## CI/CD Pipeline

**GitHub Actions CI** (`.github/workflows/ci.yml`) runs on every push/PR:

1. Matrix build: Node.js 18, 20, 22 on Ubuntu
2. Steps: checkout → setup Node → `npm ci` → lint → typecheck → test → build
3. **Key difference**: CI uses `npm ci` (clean install) vs `npm install` (dev)

To replicate CI locally:
```bash
rm -rf node_modules package-lock.json
npm install  # Generates fresh lockfile
npm run lint && npm run typecheck && npm test -- --run && npm run build
```

## Project Architecture

### Directory Structure
```
src/
├── index.ts              # Public API exports (keep minimal)
├── checker.ts            # Main EpubCheck class & validation orchestration
├── types.ts              # Shared TypeScript interfaces
├── core/                 # Report generation, context management
├── ocf/                  # OCF Container (ZIP) validation (~30% complete)
│   ├── validator.ts      # Mimetype, container.xml, ZIP structure
│   └── zip.ts            # fflate-based ZIP reader
├── opf/                  # Package Document (OPF) validation (~35% complete)
│   ├── parser.ts         # OPF XML parsing
│   ├── validator.ts      # Metadata, manifest, spine, fallbacks
│   └── types.ts          # OPF-specific types
├── content/              # Content Document validation (~15% complete)
│   └── validator.ts      # XHTML/SVG validation (regex-based, TODO: DOM)
├── nav/                  # Navigation validation (~5% complete)
│   └── validator.ts      # EPUB 3 nav, NCX basic checks
├── schema/               # Schema validation (0% - stubs only)
│   ├── relaxng.ts        # RelaxNG via libxml2-wasm (TODO)
│   ├── xsd.ts            # XSD validation (TODO)
│   └── validator.ts      # Schema loading infrastructure
├── references/           # Cross-reference validation (partial)
│   ├── registry.ts       # Resource ID tracking
│   └── validator.ts      # Link target validation
├── css/                  # CSS validation (0% - parser available)
│   └── validator.ts      # css-tree integration (TODO)
└── messages/             # Error messages & i18n
    ├── message-id.ts     # Message ID enum (PKG-*, OPF-*, HTM-*, etc.)
    └── index.ts          # Message formatting
```

### Key Files to Know

- **Configuration:**
  - `package.json` - scripts, dependencies, exports
  - `tsconfig.json` - strict TypeScript settings, NodeNext module resolution
  - `tsup.config.ts` - build configuration (ESM + CJS + DTS)
  - `vitest.config.ts` - test configuration, 80% coverage thresholds
  - `eslint.config.js` - TypeScript ESLint rules (strict, explicit types)
  - `biome.json` - formatting rules (line width 100, single quotes)

- **Entry Points:**
  - `src/index.ts` - public API exports
  - `src/checker.ts` - main validation logic (see TODOs at lines 94, 97)

- **Testing:**
  - Tests co-located with source: `*.test.ts` (6 test files, 82 passing + 1 skipped)
  - No integration tests or fixtures yet
  - Run specific test: `npm test -- src/ocf/validator.test.ts`

### Important Patterns

**TypeScript Conventions:**
```typescript
// ALWAYS use .js extensions for local imports (NodeNext resolution)
import type { ValidationMessage } from './types.js';  // ✓ Correct
import { Report } from './core/report.js';            // ✓ Correct
import { ValidationMessage } from './types';          // ✗ Wrong - missing .js

// Use type imports for types only (verbatimModuleSyntax)
import type { Foo } from './types.js';                // ✓ For types
import { bar } from './utils.js';                     // ✓ For values
```

**Message IDs:** Use same IDs as Java EPUBCheck for compatibility:
- Format: `PREFIX-NNN` (e.g., `PKG-006`, `OPF-030`, `HTM-001`)
- Prefixes: PKG (container), OPF (package doc), HTM (HTML), CSS, NAV, RSC (resources), ACC (accessibility)
- See `src/messages/message-id.ts` for full list (~165 defined, ~35 used)

**Test Structure:** Use Vitest with globals enabled:
```typescript
import { describe, it, expect } from 'vitest';

describe('ComponentName', () => {
  it('should do something specific', () => {
    // Arrange, Act, Assert
  });
});
```

## Areas Under Active Development

**TODO markers in codebase:**
- `src/checker.ts:94, 97` - Navigation and schema validation not implemented
- `src/ocf/validator.ts:147` - Need libxml2-wasm for proper XML parsing
- `src/schema/relaxng.ts:31, 72` - Schema loading from bundled schemas
- `src/references/validator.test.ts:100` - ID registration logic needs fixing

**High-priority missing features:**
1. Schema validation (RelaxNG, XSD, Schematron) - required for many validations
2. Full XML DOM parsing - currently using regex (error-prone)
3. Cross-reference validation - link targets, fragments, unused resources
4. CSS validation - parser available (css-tree), validation not implemented

## Making Changes

**Before coding:**
1. Review `AGENTS.md` for detailed coding guidelines
2. Check `PROJECT_STATUS.md` for feature completeness
3. Search for existing TODOs related to your work: `grep -r "TODO" src/`

**During development:**
1. Keep changes minimal - this is a port, not a rewrite
2. Preserve Java EPUBCheck message IDs and validation behavior
3. Use TypeScript idioms, don't directly translate Java patterns
4. Write co-located tests (`foo.ts` → `foo.test.ts`)
5. Avoid Node.js-specific APIs in core code (must run in browsers)

**Before committing:**
```bash
npm run lint       # Must pass (1 warning is acceptable)
npm run typecheck  # Must pass
npm test -- --run  # Must pass (currently 82 pass, 1 skipped)
npm run build      # Must succeed
```

**Validation Checklist:**
- [ ] TypeScript strict mode compliance (no `any`, explicit return types)
- [ ] ESM imports with `.js` extensions
- [ ] Type-only imports use `import type`
- [ ] Message IDs match Java EPUBCheck
- [ ] Tests added/updated
- [ ] No Node.js-specific APIs in src/ (except examples/)
- [ ] Biome formatting applied (`npm run format`)

## Quick Reference

**File Naming:** kebab-case (`message-id.ts`, `zip-reader.ts`)  
**Classes/Types:** PascalCase (`EpubCheck`, `ValidationMessage`)  
**Functions/vars:** camelCase (`validateContainer`, `errorCount`)  
**Constants:** UPPER_SNAKE_CASE (`DEFAULT_OPTIONS`, `MAX_ERRORS`)

**Dependencies versions (from package.json):**
- Node.js: >=18 (tested 18, 20, 22)
- TypeScript: 5.7.2
- Vitest: 2.1.8
- ESLint: 9.17.0
- Biome: 1.9.4

**Java EPUBCheck Reference:** Code being ported is at `/Users/william/epubcheck` (not in this repo)

## Getting Help

- Check existing documentation: `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `PROJECT_STATUS.md`
- Search for similar code patterns in `src/`
- Look at test files for usage examples
- Review Java EPUBCheck source for validation logic reference

**Trust these instructions.** Only search/explore if information here is incomplete or incorrect.
