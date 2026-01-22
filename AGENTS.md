# AI Agent Guide - epubcheck-ts

**Quick start for AI agents contributing to this EPUB validation library.**

## Project Overview

TypeScript port of Java EPUBCheck - validates EPUB 2.x and 3.x publications.

**Goals**: Feature parity with Java, cross-platform (Node.js 18+/browsers), TypeScript-first, zero native deps.

**Reference**: Java source at `/Users/william/epubcheck`

---

## Architecture Quick Reference

```
src/
├── checker.ts         # Main entry point
├── types.ts           # Shared types
├── ocf/               # ZIP/container validation
├── opf/               # Package document validation
├── content/           # XHTML/SVG validation
├── css/               # CSS validation
├── nav/               # EPUB 3 navigation
├── ncx/               # EPUB 2 NCX
├── schema/            # RelaxNG/XSD/Schematron
├── references/        # Cross-reference tracking
└── messages/          # Error message IDs
```

**Key dependencies:**
- `libxml2-wasm` - XML parsing, RelaxNG, XSD (~1.5MB WASM)
- `fflate` - ZIP handling
- `css-tree` - CSS parsing
- `fontoxpath` + `slimdom` - Schematron XPath evaluation

**Java → TypeScript mappings:**
- `com.adobe.epubcheck.ocf` → `src/ocf/`
- `com.adobe.epubcheck.opf` → `src/opf/`
- `com.adobe.epubcheck.ops` → `src/content/`
- `com.adobe.epubcheck.css` → `src/css/`
- `com.adobe.epubcheck.nav` → `src/nav/`

---

## Coding Standards

### TypeScript
- **Strict mode** - no `any`, explicit return types on public APIs
- **ESM imports** - use `.js` extensions, `import type` for types only
- **Naming**: kebab-case files, PascalCase classes/types, camelCase functions, UPPER_SNAKE_CASE constants

```typescript
// ✅ Good
import type { ValidationMessage } from './types.js';
import { Report } from './core/report.js';

// ❌ Bad
import { ValidationMessage } from './types';  // Missing .js and type
```

### Message IDs
Use same IDs as Java EPUBCheck (PKG-*, OPF-*, CSS-*, HTM-*, NAV-*, NCX-*, RSC-*, ACC-*, MED-*):

```typescript
context.messages.push({
  id: 'PKG-006',  // Same as Java
  severity: 'error',
  message: 'Mimetype file must be uncompressed',
  location: { path: 'mimetype' },
});
```

### Testing
- Co-locate unit tests: `foo.ts` → `foo.test.ts` (or `test/unit/`)
- Integration tests: `test/integration/`
- Use Vitest with globals

```typescript
import { describe, it, expect } from 'vitest';

describe('ZipReader', () => {
  it('should read mimetype file', async () => {
    const zip = await ZipReader.open(data);
    expect(zip.readText('mimetype')).toBe('application/epub+zip');
  });
});
```

---

## Common Tasks

### Adding a Validator
1. Create `src/module/validator.ts`
2. Implement validation logic
3. Add to pipeline in `checker.ts`
4. Add tests
5. Update exports

### Adding a Message ID
1. Add to `src/messages/message-id.ts`
2. Reference Java EPUBCheck for consistency

### Adding Schemas
1. Add to `schemas/` directory
2. Run `npm run generate:schemas`
3. Schemas auto-compressed with gzip, lazy-loaded at runtime

---

## Known Issues

### libxml2-wasm XPath Limitations
XPath queries for namespaced attributes don't work: `.//*[@epub:type]`, `.//html:link[@rel]`, `.//*[@onclick]`

**Affects 3 skipped tests:**
- `test/unit/content/validator.test.ts:257` - Event handler detection
- `test/unit/content/validator.test.ts:514` - Stylesheet title conflicts
- `test/unit/content/validator.test.ts:655` - Unknown epub:type prefix

*Implementations exist and work; tests skipped due to library limitation, not bugs.*

### Other Limitations
- **Schematron XSLT 2.0** - Some functions (`matches`, `tokenize`) not fully supported by fontoxpath
- **RelaxNG deprecation** - libxml2 may remove RelaxNG in future
- **Large EPUBs** - Memory usage for files >100MB

---

## Commands

```bash
npm test              # Run tests in watch mode
npm run test:run      # Run tests once
npm run lint          # ESLint
npm run lint:fix      # ESLint with auto-fix
npm run typecheck     # TypeScript check
npm run build         # Production build
```

---

## Porting from Java

1. **Understand validation logic** - focus on what, not how
2. **Use TypeScript idioms** - don't translate Java patterns directly
3. **Preserve message IDs** - compatibility matters
4. **Same inputs = same errors**

```java
// Java
if (!mimetype.equals("application/epub+zip")) {
    report.message(MessageId.PKG_007, ...);
}
```

```typescript
// TypeScript
const mimetype = context.files.get('mimetype');
if (mimetype !== 'application/epub+zip') {
  context.messages.push({
    id: 'PKG-007',
    severity: 'error',
    message: 'Mimetype file must contain "application/epub+zip"',
    location: { path: 'mimetype' },
  });
}
```

---

## Critical Implementation Notes

### libxml2-wasm Memory Management
Always dispose resources:

```typescript
const doc = XmlDocument.fromString(xml);
try {
  // Use doc
} finally {
  doc.dispose();  // Critical!
}
```

### Browser Compatibility
- Use `Uint8Array`, not `Buffer`
- Avoid Node.js-specific APIs (`fs`, `path`)
- Test in both Node.js and browsers

### Performance
- Lazy load WASM (~1.5MB)
- Cache schema validators
- Stream large files when possible

---

**See PROJECT_STATUS.md for implementation progress and priorities.**
