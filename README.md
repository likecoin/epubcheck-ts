# epubcheck-ts

Validate EPUB files in Node.js and the browser. A TypeScript implementation of [EPUBCheck](https://github.com/w3c/epubcheck).

[![CI](https://github.com/likecoin/epubcheck-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/likecoin/epubcheck-ts/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40likecoin%2Fepubcheck-ts)](https://www.npmjs.com/package/@likecoin/epubcheck-ts)
[![License](https://img.shields.io/npm/l/%40likecoin%2Fepubcheck-ts)](./LICENSE)

> **Status**: ~97% feature parity with Java EPUBCheck (1323 tests passing, 45 skipped). See [PROJECT_STATUS.md](./PROJECT_STATUS.md) for details. For full EPUB 3 conformance testing, use the official [Java EPUBCheck](https://github.com/w3c/epubcheck).

## Features

- **CLI and API** — Use as a CLI tool (`npx @likecoin/epubcheck-ts book.epub`) or import as a library
- **Browser support** — Works in Node.js 18+ and modern browsers via pure JS + WASM
- **No native dependencies** — No Java, no compilation — `npm install` and go
- **TypeScript** — Full type definitions included
- **Tree-shakable** — ESM with proper exports for minimal bundle impact

## Try it Online

Live demo at **[likecoin.github.io/epubcheck-ts](https://likecoin.github.io/epubcheck-ts/)** — validate EPUB files in the browser without uploading to any server.

## Installation

```bash
npm install @likecoin/epubcheck-ts
```

## Quick Start

### Command Line Interface (CLI)

**Quick validation:**
```bash
npx @likecoin/epubcheck-ts book.epub
```

**Or install globally:**
```bash
npm install -g @likecoin/epubcheck-ts
epubcheck-ts book.epub
```

**CLI Options:**
```bash
epubcheck-ts <file.epub> [options]

Options:
  -j, --json <file>        Output JSON report to file (use '-' for stdout)
  -q, --quiet              Suppress console output (errors only)
  -p, --profile <name>     Validation profile (default|dict|edupub|idx|preview)
  -u, --usage              Include usage messages (best practices)
  -f, --fatal              Show only fatal errors
  -e, --error              Show fatal errors and errors
      --warn               Show fatal errors, errors, and warnings
  -c, --customMessages <file>  Override message severities (TSV: ID<tab>SEVERITY)
  -w, --fail-on-warnings   Exit with code 1 if warnings are found
  -l, --listChecks         List all message IDs and severities
  -v, --version            Show version information
  -h, --help               Show this help message
```

**Examples:**
```bash
# Basic validation
epubcheck-ts book.epub

# Generate JSON report
epubcheck-ts book.epub --json report.json

# Quiet mode for CI/CD
epubcheck-ts book.epub --quiet --fail-on-warnings

# Validate with specific profile
epubcheck-ts dictionary.epub --profile dict

# Show only errors (hide warnings/info)
epubcheck-ts book.epub --error

# Enable suppressed accessibility checks
printf "ACC-004\tWARNING\nACC-005\tWARNING\n" > overrides.txt
epubcheck-ts book.epub -c overrides.txt
```

### ES Modules (recommended)

```typescript
import { EpubCheck } from '@likecoin/epubcheck-ts';
import { readFile } from 'node:fs/promises';

// Load EPUB file
const epubData = await readFile('book.epub');

// Validate
const result = await EpubCheck.validate(epubData);

if (result.valid) {
  console.log('EPUB is valid!');
} else {
  console.log(`Found ${result.errorCount} errors and ${result.warningCount} warnings`);
  
  for (const message of result.messages) {
    console.log(`${message.severity}: ${message.message}`);
    if (message.location) {
      console.log(`  at ${message.location.path}:${message.location.line}`);
    }
  }
}
```

### CommonJS

```javascript
const fs = require('node:fs');

async function validate() {
  const { EpubCheck } = await import('epubcheck-ts');
  
  const epubData = fs.readFileSync('book.epub');
  const result = await EpubCheck.validate(epubData);
  
  console.log(result.valid ? 'Valid!' : 'Invalid');
}

validate();
```

### Browser

```typescript
import { EpubCheck } from '@likecoin/epubcheck-ts';

// From file input
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  const data = new Uint8Array(await file.arrayBuffer());
  
  const result = await EpubCheck.validate(data);
  console.log(result);
});
```

## API

> Full API reference: [online](https://likecoin.github.io/epubcheck-ts/docs/) | [markdown](./docs/md/globals.md)

### `EpubCheck.validate(data, options?)`

Static method to validate an EPUB file.

**Parameters:**
- `data: Uint8Array` - The EPUB file contents
- `options?: EpubCheckOptions` - Optional validation options

**Returns:** `Promise<EpubCheckResult>`

### `new EpubCheck(options?)`

Create a reusable validator instance.

```typescript
const checker = new EpubCheck({
  version: '3.3',
  profile: 'default',
  locale: 'en',
});

const result1 = await checker.check(epub1Data);
const result2 = await checker.check(epub2Data);
```

### Options

```typescript
interface EpubCheckOptions {
  /** EPUB version to validate against (auto-detected if not specified) */
  version?: '2.0' | '3.0' | '3.1' | '3.2' | '3.3';
  
  /** Validation profile */
  profile?: 'default' | 'edupub' | 'idx' | 'dict' | 'preview';
  
  /** Include usage messages in results (default: false) */
  includeUsage?: boolean;
  
  /** Include info messages in results (default: true) */
  includeInfo?: boolean;
  
  /** Maximum errors before stopping, 0 = unlimited (default: 0) */
  maxErrors?: number;
  
  /** Locale for messages (default: 'en') */
  locale?: string;
  
  /** Custom message severity overrides (message ID → severity) */
  customMessages?: Map<string, MessageSeverity>;
}
```

### Result

```typescript
interface EpubCheckResult {
  /** Whether the EPUB is valid (no errors or fatal errors) */
  valid: boolean;
  
  /** All validation messages */
  messages: ValidationMessage[];
  
  /** Counts by severity */
  fatalCount: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  usageCount: number;
  
  /** Detected EPUB version */
  version?: string;
  
  /** Validation time in milliseconds */
  elapsedMs: number;
}

interface ValidationMessage {
  /** Unique message identifier (e.g., 'OPF-001') */
  id: string;
  
  /** Severity level */
  severity: 'fatal' | 'error' | 'warning' | 'info' | 'usage';
  
  /** Human-readable message */
  message: string;
  
  /** Location in the EPUB */
  location?: {
    path: string;
    line?: number;
    column?: number;
    context?: string;
  };
  
  /** Suggestion for fixing the issue */
  suggestion?: string;
}
```

### JSON Report

Generate a JSON report compatible with the original EPUBCheck:

```typescript
import { EpubCheck, Report } from '@likecoin/epubcheck-ts';

const result = await EpubCheck.validate(data);
const jsonReport = Report.toJSON(result);
console.log(jsonReport);
```

## Supported Environments

| Environment | Version | Notes |
|-------------|---------|-------|
| Node.js | 18+ | Full support |
| Chrome | 89+ | Full support |
| Firefox | 89+ | Full support |
| Safari | 15+ | Full support |
| Edge | 89+ | Full support |

## Architecture

This library is a TypeScript port of the Java-based [EPUBCheck](https://github.com/w3c/epubcheck) tool maintained by the W3C. Key implementation details:

- **XML Processing**: Uses [libxml2-wasm](https://github.com/nicklasb/libxml2-wasm) for XML parsing and schema validation (RelaxNG, XSD) via WebAssembly
- **ZIP Handling**: Uses [fflate](https://github.com/101arrowz/fflate) for fast, lightweight EPUB container processing
- **CSS Validation**: Uses [css-tree](https://github.com/nicklasb/css-tree) for CSS parsing and validation
- **Schematron**: Uses [fontoxpath](https://github.com/FontoXML/fontoxpath) with [slimdom](https://github.com/bwrrp/slimdom.js) for XPath 3.1 evaluation

## Validation Coverage

| Component | Status | Completeness | Notes |
|-----------|--------|--------------|-------|
| OCF Container | 🟢 Complete | ~92% | ZIP structure, mimetype, container.xml, encryption.xml obfuscation |
| Package Document (OPF) | 🟢 Complete | ~92% | Metadata, manifest, spine, collections, Schematron-equivalent checks |
| Content Documents | 🟢 Complete | ~93% | XHTML structure, CSS url(), @import, SVG, entities, title, SSML, XML version |
| Navigation Document | 🟢 Complete | ~95% | Nav content model, landmarks, labels, reading order, hidden, nested-ol |
| Schema Validation | 🟡 Partial | ~55% | RelaxNG for OPF/container; XHTML/SVG disabled (libxml2 limitation) |
| CSS | 🟡 Partial | ~85% | @font-face, @import, url() extraction, position, forbidden properties, alt style tags |
| Cross-reference Validation | 🟢 Complete | ~92% | Reference tracking, fragments, fallbacks, remote resources, cross-document features |
| Accessibility Checks | 🟢 Complete | ~71% | 12/17 ACC checks: table, image alt, hyperlink, MathML, SVG, epub:type, OPF metadata |
| Media Overlays | 🟡 Partial | ~70% | SMIL structure, timing, audio, OPF metadata, duration validation |
| Media Validation | 🟡 Partial | ~25% | Magic number checks (MED-004/OPF-029/PKG-022); deep format parsing planned |

Legend: 🟢 Complete | 🟡 Partial | 🔴 Basic | ❌ Not Started

**Overall Progress: ~97% of Java EPUBCheck features**

See [PROJECT_STATUS.md](./PROJECT_STATUS.md) for detailed comparison.

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
# Clone the repository
git clone https://github.com/likecoin/epubcheck-ts.git
cd epubcheck-ts

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

### Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build the library (ESM + CJS) |
| `npm run dev` | Build in watch mode |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Lint with ESLint |
| `npm run lint:fix` | Lint and auto-fix |
| `npm run format` | Format with Biome |
| `npm run typecheck` | TypeScript type checking |
| `npm run check` | Run all checks (format + typecheck) |
| `npm run docs` | Generate API docs (HTML + Markdown) |
| `npm run docs:html` | Generate HTML API docs to `docs/html/` |
| `npm run docs:md` | Generate Markdown API docs to `docs/md/` |

### Project Structure

```
epubcheck-ts/
├── src/
│   ├── index.ts           # Public API exports
│   ├── checker.ts         # Main EpubCheck class
│   ├── types.ts           # TypeScript type definitions
│   ├── core/              # Core validation logic
│   ├── ocf/               # OCF container validation ✅
│   ├── opf/               # Package document validation ✅
│   ├── content/           # Content document validation ✅
│   ├── nav/               # Navigation validation ✅
│   ├── ncx/               # NCX validation (EPUB 2) ✅
│   ├── references/        # Cross-reference validation ✅
│   ├── schema/            # Schema validation ✅
│   │   ├── relaxng.ts     # RelaxNG validation
│   │   ├── xsd.ts         # XSD validation
│   │   ├── schematron.ts  # Schematron validation
│   │   └── orchestrator.ts # Schema orchestration
│   └── messages/          # Error messages
├── schemas/               # Schema files (RNG, RNC, SCH)
├── test/
│   ├── fixtures/          # Test EPUB files
│   └── integration/       # Integration tests
├── docs/
│   └── md/                # Generated API docs (Markdown, checked in)
├── examples/
│   └── web/               # Web demo ✅
└── dist/                  # Build output
```

Legend: ✅ Implemented

## Comparison with Java EPUBCheck

| Aspect | epubcheck-ts | EPUBCheck (Java) |
|--------|--------------|------------------|
| Runtime | Node.js / Browser | JVM |
| Feature Parity | ~97% | 100% |
| Bundle Size | ~450KB JS + ~1.6MB WASM | ~15MB |
| Installation | `npm install` | Download JAR |
| Integration | Native JS/TS | CLI or Java API |
| Performance | Comparable | Baseline |

See [PROJECT_STATUS.md](./PROJECT_STATUS.md) for detailed feature comparison.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

For AI agents contributing to this project, see [AGENTS.md](./AGENTS.md).

## License

[GPL-3.0](./LICENSE)

This is an independent TypeScript implementation inspired by the Java-based [EPUBCheck](https://github.com/w3c/epubcheck) (BSD-3-Clause). No code was directly copied from the original project.

## Acknowledgments

- [W3C EPUBCheck](https://github.com/w3c/epubcheck) - The original Java implementation
- [DAISY Consortium](https://daisy.org/) - Maintainers of EPUBCheck
- [libxml2-wasm](https://github.com/jameslan/libxml2-wasm) - WebAssembly XML processing

## Built by 3ook.com

This project is built and maintained by the [3ook.com](https://3ook.com/about) team. 3ook is a Web3 eBook platform where authors can publish EPUB ebooks and readers can collect them as digital assets. If you're an author looking to publish your ebook, check out [3ook.com](https://3ook.com/about).

## Related Projects

- [EPUBCheck](https://github.com/w3c/epubcheck) - Official Java validator
- [epub.js](https://github.com/futurepress/epub.js) - EPUB reader library
- [r2-shared-js](https://github.com/nicklasb/r2-shared-js) - Readium shared models
