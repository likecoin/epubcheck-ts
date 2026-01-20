# AGENTS.md - AI Agent Guidelines for epubcheck-ts

This document provides guidance for AI agents (Claude, GPT, Copilot, etc.) contributing to this project.

## Project Overview

**epubcheck-ts** is a TypeScript port of the Java-based [EPUBCheck](https://github.com/w3c/epubcheck) library. It validates EPUB publications against the EPUB 2.x and 3.x specifications.

### Key Goals

1. **Feature parity** with Java EPUBCheck for validation results
2. **Cross-platform** support (Node.js 18+ and modern browsers)
3. **TypeScript-first** with strict type checking
4. **Zero native dependencies** - pure JS/WASM only

## Architecture

### Source Structure

```
src/
├── index.ts           # Public API exports - keep minimal
├── checker.ts         # Main EpubCheck class
├── types.ts           # Shared TypeScript types
├── core/              # Validation orchestration
│   ├── index.ts       # Module exports
│   └── report.ts      # Report generation
├── ocf/               # OCF Container validation (ZIP)
│   ├── index.ts       # Module exports
│   ├── validator.ts   # Main OCF validator
│   └── zip.ts         # ZIP reading via fflate (with originalOrder)
├── opf/               # Package Document (OPF) validation
│   ├── index.ts       # Module exports
│   ├── parser.ts      # OPF XML parsing
│   ├── validator.ts   # Main OPF validator
│   └── types.ts       # OPF-specific types
├── content/           # Content Document validation
│   ├── index.ts       # Module exports
│   ├── parser.ts      # XHTML/SVG parsing
│   └── validator.ts   # Content validation
├── css/               # CSS validation
│   ├── index.ts       # Module exports
│   └── validator.ts   # CSS validation via css-tree
├── nav/               # EPUB 3 Navigation validation
│   ├── index.ts       # Module exports
│   └── validator.ts   # Nav document validation
├── ncx/               # EPUB 2 NCX validation
│   └── validator.ts   # NCX validation
├── schema/            # Schema validation infrastructure
│   ├── index.ts       # Module exports
│   ├── validator.ts   # Schema validation entry point
│   ├── orchestrator.ts # Coordinates schema validation
│   ├── relaxng.ts     # RelaxNG via libxml2-wasm
│   ├── xsd.ts         # XSD via libxml2-wasm
│   └── schematron.ts  # Schematron via fontoxpath + slimdom
├── references/        # Cross-reference validation
│   ├── index.ts       # Module exports
│   ├── validator.ts   # Reference validation
│   ├── registry.ts    # ID/href registry
│   ├── url.ts         # URL parsing utilities
│   └── types.ts       # Reference types
├── messages/          # Error messages
│   ├── index.ts       # Module exports
│   └── message-id.ts  # Message ID enum
└── test/              # Test infrastructure
    ├── fixtures/      # Test EPUB files
    └── integration/   # Integration tests
```

### Key Dependencies

| Package | Purpose | Notes |
|---------|---------|-------|
| `libxml2-wasm` | XML parsing, RelaxNG, XSD validation | Core dependency, ~1.5MB WASM |
| `fflate` | ZIP handling | Fast, small, tree-shakable |
| `css-tree` | CSS parsing/validation | Full CSS parser |
| `fontoxpath` | XPath 3.1 evaluation | For Schematron rules |
| `slimdom` | DOM implementation | For Schematron XML processing |
| `slimdom-sax-parser` | SAX parser for slimdom | Parses XML into slimdom DOMs |

### Reference Implementation

The Java source is at `/Users/william/epubcheck`. Key packages to reference:

- `com.adobe.epubcheck.ocf` → `src/ocf/`
- `com.adobe.epubcheck.opf` → `src/opf/`
- `com.adobe.epubcheck.ops` → `src/content/`
- `com.adobe.epubcheck.css` → `src/css/`
- `com.adobe.epubcheck.nav` → `src/nav/`
- `com.adobe.epubcheck.xml` → `src/schema/`
- `com.adobe.epubcheck.messages` → `src/messages/`

## Coding Standards

### TypeScript

- **Strict mode** enabled - no `any` types, explicit return types on public APIs
- **ESM-first** - use `.js` extensions in imports (for NodeNext resolution)
- **Verbatim module syntax** - use `import type` for type-only imports

```typescript
// Good
import type { ValidationMessage } from './types.js';
import { Report } from './core/report.js';

// Bad
import { ValidationMessage } from './types';  // Missing .js, missing type
```

### Naming Conventions

- **Files**: kebab-case (`message-id.ts`, `zip-reader.ts`)
- **Classes**: PascalCase (`EpubCheck`, `OCFValidator`)
- **Interfaces/Types**: PascalCase (`ValidationMessage`, `EpubCheckOptions`)
- **Functions/variables**: camelCase (`validateContainer`, `errorCount`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_OPTIONS`, `MAX_ERRORS`)

### Error Messages

Use the same message IDs as Java EPUBCheck for compatibility:

```typescript
// Message IDs follow the pattern: PREFIX-NNN
// Prefixes: PKG, OPF, CSS, HTM, NAV, MED, RSC, ACC, etc.

context.messages.push({
  id: 'PKG-006',  // Same ID as Java EPUBCheck
  severity: 'error',
  message: 'Mimetype file must be uncompressed',
  location: { path: 'mimetype' },
});
```

### Testing

- **Co-locate unit tests** with source files (`foo.ts` → `foo.test.ts`)
- **Integration tests** in `test/integration/`
- **Test fixtures** in `test/fixtures/`
- Use **Vitest** with globals enabled

```typescript
// src/ocf/zip.test.ts
import { describe, it, expect } from 'vitest';
import { ZipReader } from './zip.js';

describe('ZipReader', () => {
  it('should read mimetype file', async () => {
    const zip = await ZipReader.open(testEpubData);
    const mimetype = await zip.readText('mimetype');
    expect(mimetype).toBe('application/epub+zip');
  });
});
```

## Implementation Guidelines

### Porting from Java

When porting Java code:

1. **Understand the validation logic** - focus on what is being validated, not how
2. **Use TypeScript idioms** - don't directly translate Java patterns
3. **Preserve message IDs** - compatibility with existing tooling
4. **Preserve validation behavior** - same inputs should produce same errors

```java
// Java (original)
public class OCFChecker {
    public void check() {
        if (!mimetype.equals("application/epub+zip")) {
            report.message(MessageId.PKG_007, ...);
        }
    }
}
```

```typescript
// TypeScript (port)
export class OCFValidator {
  validate(context: ValidationContext): void {
    const mimetype = context.files.get('mimetype');
    if (mimetype !== 'application/epub+zip') {
      context.messages.push({
        id: 'PKG-007',
        severity: 'error',
        message: 'Mimetype file must contain "application/epub+zip"',
        location: { path: 'mimetype' },
      });
    }
  }
}
```

### XML Validation with libxml2-wasm

```typescript
import { XmlDocument, RelaxNGValidator, XsdValidator } from 'libxml2-wasm';

// RelaxNG validation
export async function validateRelaxNG(xml: string, schemaPath: string): Promise<ValidationMessage[]> {
  const messages: ValidationMessage[] = [];
  
  const doc = XmlDocument.fromString(xml);
  const schemaDoc = XmlDocument.fromString(await loadSchema(schemaPath));
  
  try {
    const validator = RelaxNGValidator.fromDoc(schemaDoc);
    try {
      validator.validate(doc);
    } catch (error) {
      // Convert validation errors to messages
      messages.push(/* ... */);
    } finally {
      validator.dispose();
    }
  } finally {
    doc.dispose();
    schemaDoc.dispose();
  }
  
  return messages;
}
```

### ZIP Handling with fflate

```typescript
import { unzipSync, strFromU8 } from 'fflate';

export class ZipReader {
  private files: Record<string, Uint8Array>;
  
  static open(data: Uint8Array): ZipReader {
    const files = unzipSync(data);
    return new ZipReader(files);
  }
  
  readText(path: string): string | undefined {
    const data = this.files[path];
    return data ? strFromU8(data) : undefined;
  }
  
  readBinary(path: string): Uint8Array | undefined {
    return this.files[path];
  }
}
```

## Common Tasks

### Adding a New Validator

1. Create validator file in appropriate directory
2. Implement validation logic
3. Add to validation pipeline in `checker.ts`
4. Add tests
5. Update exports in `index.ts` if public

### Adding a New Message ID

1. Add to `src/messages/message-id.ts`
2. Add English message to `src/messages/locales/en.ts`
3. Reference the Java EPUBCheck message for consistency

### Adding Schema Files

1. Add schema to `schemas/` directory
2. Update schema loader to handle new schema
3. Ensure schema is included in `package.json` `files` array

## Commands Reference

```bash
# Development
npm install          # Install dependencies
npm run dev          # Build in watch mode
npm test             # Run tests in watch mode

# Schema generation
npm run generate:schemas  # Regenerate schemas.generated.ts from schemas/ directory

# Quality
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run format       # Biome format
npm run typecheck    # TypeScript check
npm run check        # All checks

# Build
npm run build        # Production build
npm run clean        # Clean dist/
```

## Performance Considerations

1. **Lazy load WASM** - libxml2-wasm is ~1.5MB, load only when needed
2. **Dispose resources** - always call `.dispose()` on libxml2-wasm objects
3. **Stream large files** - avoid loading entire EPUB into memory when possible
4. **Cache schemas** - schema parsing is expensive, cache validators

## Browser Compatibility

- Use `Uint8Array` for binary data (not `Buffer`)
- Avoid Node.js-specific APIs (`fs`, `path`, etc.) in core code
- Use conditional exports for platform-specific code if needed
- Test in both Node.js and browser environments

## Known Limitations

1. **RelaxNG deprecation** - libxml2 plans to remove RelaxNG support in future versions
2. **Schematron** - custom implementation may have edge cases vs Saxon
3. **Large EPUBs** - memory usage for very large files (>100MB)

## Known Issues / TODOs

1. **Schematron XSLT 2.0 limitations** - Some XSLT 2.0 functions (`matches`, `tokenize`) aren't fully supported by fontoxpath. May need workarounds for certain Schematron rules.

## Recently Resolved

- ✅ **RelaxNG Compact (.rnc) format** - Converted EPUB 3.x schemas from RNC to RNG format using jing-trang, then inlined all `<include>` elements for bundling
- ✅ **EPUB 2.0 schema includes** - Added opf20.rng from Java source with proper `<start>` element
- ✅ **Integration tests** - All EPUB 2.0 and 3.0 integration tests now passing

## Questions?

- Check the Java EPUBCheck source at `/Users/william/epubcheck`
- Review existing TypeScript implementations in `src/`
- Run `npm test` to verify changes don't break existing tests
