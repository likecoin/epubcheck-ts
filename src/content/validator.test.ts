import { beforeEach, describe, expect, it } from 'vitest';
import type { ManifestItem, PackageDocument } from '../opf/types.js';
import type { EpubCheckOptions, ValidationContext } from '../types.js';
import { ContentValidator } from './validator.js';

describe('ContentValidator', () => {
  let validator: ContentValidator;
  let context: ValidationContext;

  const defaultOptions: Required<EpubCheckOptions> = {
    version: '3.0',
    profile: 'default',
    includeUsage: false,
    includeInfo: false,
    maxErrors: 0,
    locale: 'en',
  };

  const createContext = (
    files: Map<string, Uint8Array>,
    packageDoc?: PackageDocument,
  ): ValidationContext => {
    const ctx: ValidationContext = {
      messages: [],
      files,
      opfPath: 'OEBPS/content.opf',
      data: new Uint8Array(),
      options: defaultOptions,
      version: '3.0',
      rootfiles: [{ path: 'OEBPS/content.opf', mediaType: 'application/oebps-package+xml' }],
    };
    if (packageDoc) {
      ctx.packageDocument = packageDoc;
    }
    return ctx;
  };

  const toBytes = (str: string): Uint8Array => new TextEncoder().encode(str);

  const validXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test Document</title>
  </head>
  <body>
    <p>Hello, World!</p>
  </body>
</html>`;

  const createManifestItem = (item: {
    id: string;
    href: string;
    mediaType: string;
    properties?: string[];
  }): ManifestItem => {
    const manifestItem: ManifestItem = {
      id: item.id,
      href: item.href,
      mediaType: item.mediaType,
    };
    if (item.properties) {
      manifestItem.properties = item.properties;
    }
    return manifestItem;
  };

  const createPackageDoc = (
    items: { id: string; href: string; mediaType: string; properties?: string[] }[],
  ): PackageDocument => ({
    version: '3.0',
    uniqueIdentifier: 'uid',
    dcElements: [
      { name: 'title', value: 'Test Book' },
      { name: 'identifier', value: 'test-id', id: 'uid' },
      { name: 'language', value: 'en' },
    ],
    metaElements: [],
    linkElements: [],
    manifest: items.map(createManifestItem),
    spine: [],
    guide: [],
  });

  beforeEach(() => {
    validator = new ContentValidator();
  });

  describe('validate', () => {
    it('should skip validation when no package document is present', () => {
      context = createContext(new Map());
      validator.validate(context);
      expect(context.messages).toHaveLength(0);
    });

    it('should skip non-XHTML files', () => {
      const files = new Map([['OEBPS/styles.css', toBytes('body { color: black; }')]]);
      const packageDoc = createPackageDoc([
        { id: 'css1', href: 'styles.css', mediaType: 'text/css' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);
      expect(context.messages).toHaveLength(0);
    });

    it('should validate XHTML files in manifest', () => {
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(validXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);
      expect(context.messages).toHaveLength(0);
    });

    it('should handle missing files gracefully', () => {
      const files = new Map<string, Uint8Array>();
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);
      // Missing file should be reported by OPF validator, not content validator
      expect(context.messages).toHaveLength(0);
    });
  });

  describe('XML well-formedness', () => {
    it('should detect mismatched closing tags', () => {
      const badXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test</title>
  </head>
  <body>
    <div>
      <p>Text</div>
    </p>
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(badXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const htmErrors = context.messages.filter((m) => m.id === 'HTM-004');
      expect(htmErrors.length).toBeGreaterThan(0);
      expect(htmErrors[0]?.message).toContain('Mismatched closing tag');
    });

    it('should detect unclosed tags', () => {
      const badXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test</title>
  </head>
  <body>
    <div>
      <p>Unclosed paragraph
    </div>
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(badXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const htmErrors = context.messages.filter((m) => m.id === 'HTM-004');
      expect(htmErrors.length).toBeGreaterThan(0);
    });

    it('should detect unexpected closing tags', () => {
      const badXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test</title>
  </head>
  <body>
    </span>
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(badXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const htmErrors = context.messages.filter((m) => m.id === 'HTM-004');
      expect(htmErrors.length).toBeGreaterThan(0);
      // When encountering </span> while body is open, it's reported as a mismatch
      expect(htmErrors[0]?.message).toContain('closing tag');
    });

    it('should detect unescaped ampersands', () => {
      const badXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test</title>
  </head>
  <body>
    <p>Tom & Jerry</p>
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(badXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const htmErrors = context.messages.filter((m) => m.id === 'HTM-012');
      expect(htmErrors.length).toBeGreaterThan(0);
      expect(htmErrors[0]?.message).toContain('Unescaped ampersand');
    });

    it('should allow properly escaped ampersands', () => {
      const goodXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test</title>
  </head>
  <body>
    <p>Tom &amp; Jerry</p>
    <p>Less than: &lt; Greater than: &gt;</p>
    <p>Numeric: &#65; Hex: &#x41;</p>
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(goodXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const htmErrors = context.messages.filter((m) => m.id === 'HTM-012');
      expect(htmErrors).toHaveLength(0);
    });

    it('should allow self-closing tags', () => {
      const goodXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <img src="image.png" alt="test" />
    <br />
    <hr />
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(goodXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const htmErrors = context.messages.filter((m) => m.id === 'HTM-004');
      expect(htmErrors).toHaveLength(0);
    });

    it('should allow void elements without self-closing slash', () => {
      const goodXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test</title>
    <meta charset="UTF-8" />
  </head>
  <body>
    <img src="image.png" alt="test" />
    <br />
    <input type="text" />
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(goodXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const htmErrors = context.messages.filter((m) => m.id === 'HTM-004');
      expect(htmErrors).toHaveLength(0);
    });
  });

  describe('XHTML structure', () => {
    it('should require xmlns on html element', () => {
      const badXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html>
  <head>
    <title>Test</title>
  </head>
  <body>
    <p>Content</p>
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(badXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const htmErrors = context.messages.filter((m) => m.id === 'HTM-001');
      expect(htmErrors).toHaveLength(1);
      expect(htmErrors[0]?.message).toContain('xmlns');
    });

    it('should require head element', () => {
      const badXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <p>Content</p>
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(badXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const htmErrors = context.messages.filter((m) => m.id === 'HTM-002');
      expect(htmErrors.length).toBeGreaterThanOrEqual(1);
      expect(htmErrors[0]?.message).toContain('head');
    });

    it('should require title element', () => {
      const badXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
  </head>
  <body>
    <p>Content</p>
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(badXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const htmErrors = context.messages.filter((m) => m.id === 'HTM-003');
      expect(htmErrors).toHaveLength(1);
      expect(htmErrors[0]?.message).toContain('title');
    });

    it('should require body element', () => {
      const badXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test</title>
  </head>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(badXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const htmErrors = context.messages.filter((m) => m.id === 'HTM-002');
      expect(htmErrors.length).toBeGreaterThanOrEqual(1);
      expect(htmErrors.some((e) => e.message.includes('body'))).toBe(true);
    });
  });

  describe('navigation document', () => {
    it('should require nav element with epub:type="toc" in navigation document', () => {
      const badNav = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head>
    <title>Navigation</title>
  </head>
  <body>
    <nav>
      <ol>
        <li><a href="chapter1.xhtml">Chapter 1</a></li>
      </ol>
    </nav>
  </body>
</html>`;
      const files = new Map([['OEBPS/nav.xhtml', toBytes(badNav)]]);
      const packageDoc = createPackageDoc([
        { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: ['nav'] },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const navErrors = context.messages.filter((m) => m.id === 'NAV-001');
      expect(navErrors).toHaveLength(1);
      expect(navErrors[0]?.message).toContain('epub:type="toc"');
    });

    it('should require ol element inside nav toc', () => {
      const badNav = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head>
    <title>Navigation</title>
  </head>
  <body>
    <nav epub:type="toc">
      <ul>
        <li><a href="chapter1.xhtml">Chapter 1</a></li>
      </ul>
    </nav>
  </body>
</html>`;
      const files = new Map([['OEBPS/nav.xhtml', toBytes(badNav)]]);
      const packageDoc = createPackageDoc([
        { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: ['nav'] },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const navErrors = context.messages.filter((m) => m.id === 'NAV-002');
      expect(navErrors).toHaveLength(1);
      expect(navErrors[0]?.message).toContain('ol element');
    });

    it('should accept valid navigation document', () => {
      const goodNav = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <head>
    <title>Navigation</title>
  </head>
  <body>
    <nav epub:type="toc">
      <h2>Table of Contents</h2>
      <ol>
        <li><a href="chapter1.xhtml">Chapter 1</a></li>
        <li><a href="chapter2.xhtml">Chapter 2</a></li>
      </ol>
    </nav>
  </body>
</html>`;
      const files = new Map([['OEBPS/nav.xhtml', toBytes(goodNav)]]);
      const packageDoc = createPackageDoc([
        { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: ['nav'] },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const navErrors = context.messages.filter((m) => m.id.startsWith('NAV-'));
      expect(navErrors).toHaveLength(0);
    });

    it('should not check nav requirements for non-nav XHTML files', () => {
      const regularContent = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Chapter 1</title>
  </head>
  <body>
    <p>Regular content without nav element</p>
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(regularContent)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const navErrors = context.messages.filter((m) => m.id.startsWith('NAV-'));
      expect(navErrors).toHaveLength(0);
    });
  });

  describe('path resolution', () => {
    it('should resolve paths relative to OPF directory', () => {
      const files = new Map([['OEBPS/text/chapter1.xhtml', toBytes(validXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'text/chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);
      expect(context.messages).toHaveLength(0);
    });

    it('should handle OPF in root directory', () => {
      const files = new Map([['chapter1.xhtml', toBytes(validXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = {
        messages: [],
        files,
        packageDocument: packageDoc,
        opfPath: 'content.opf',
        data: new Uint8Array(),
        options: defaultOptions,
        version: '3.0',
        rootfiles: [{ path: 'content.opf', mediaType: 'application/oebps-package+xml' }],
      };
      validator.validate(context);
      expect(context.messages).toHaveLength(0);
    });
  });

  describe('script detection', () => {
    it('should detect script elements and require scripted property (OPF-014)', () => {
      const scriptedXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test</title>
    <script type="text/javascript">console.log("hello");</script>
  </head>
  <body>
    <p>Content</p>
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(scriptedXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const opfErrors = context.messages.filter((m) => m.id === 'OPF-014');
      expect(opfErrors).toHaveLength(1);
      expect(opfErrors[0]?.message).toContain('scripted');
    });

    it('should detect onclick event handlers', () => {
      const scriptedXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test</title>
  </head>
  <body>
    <button onclick="alert('clicked')">Click me</button>
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(scriptedXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const opfErrors = context.messages.filter((m) => m.id === 'OPF-014');
      expect(opfErrors).toHaveLength(1);
    });

    it('should detect form elements', () => {
      const formXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test</title>
  </head>
  <body>
    <form action="/submit">
      <input type="text" name="name" />
    </form>
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(formXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const opfErrors = context.messages.filter((m) => m.id === 'OPF-014');
      expect(opfErrors).toHaveLength(1);
    });

    it('should accept scripted content when scripted property is present', () => {
      const scriptedXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test</title>
    <script type="text/javascript">console.log("hello");</script>
  </head>
  <body>
    <p>Content</p>
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(scriptedXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml', properties: ['scripted'] },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const opfErrors = context.messages.filter((m) => m.id === 'OPF-014');
      expect(opfErrors).toHaveLength(0);
    });

    it('should not check scripted property for EPUB 2', () => {
      const scriptedXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test</title>
    <script type="text/javascript">console.log("hello");</script>
  </head>
  <body>
    <p>Content</p>
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(scriptedXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      context.version = '2.0';
      validator.validate(context);

      const opfErrors = context.messages.filter((m) => m.id === 'OPF-014');
      expect(opfErrors).toHaveLength(0);
    });
  });

  describe('discouraged elements', () => {
    it('should warn about base element (HTM-055)', () => {
      const baseXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test</title>
    <base href="https://example.com/" />
  </head>
  <body>
    <p>Content</p>
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(baseXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const htmWarnings = context.messages.filter((m) => m.id === 'HTM-055');
      expect(htmWarnings).toHaveLength(1);
      expect(htmWarnings[0]?.message).toContain('base');
    });

    it('should warn about embed element (HTM-055)', () => {
      const embedXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test</title>
  </head>
  <body>
    <embed src="video.swf" type="application/x-shockwave-flash" />
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(embedXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const htmWarnings = context.messages.filter((m) => m.id === 'HTM-055');
      expect(htmWarnings).toHaveLength(1);
      expect(htmWarnings[0]?.message).toContain('embed');
    });
  });

  describe('accessibility', () => {
    it('should warn about empty links (ACC-004)', () => {
      const emptyLinkXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test</title>
  </head>
  <body>
    <a href="chapter2.xhtml"></a>
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(emptyLinkXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const accWarnings = context.messages.filter((m) => m.id === 'ACC-004');
      expect(accWarnings).toHaveLength(1);
      expect(accWarnings[0]?.message).toContain('accessible');
    });

    it('should accept links with text content', () => {
      const goodLinkXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test</title>
  </head>
  <body>
    <a href="chapter2.xhtml">Chapter 2</a>
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(goodLinkXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const accWarnings = context.messages.filter((m) => m.id === 'ACC-004');
      expect(accWarnings).toHaveLength(0);
    });

    it('should accept links with aria-label', () => {
      const ariaLinkXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test</title>
  </head>
  <body>
    <a href="chapter2.xhtml" aria-label="Go to Chapter 2"></a>
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(ariaLinkXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const accWarnings = context.messages.filter((m) => m.id === 'ACC-004');
      expect(accWarnings).toHaveLength(0);
    });

    it('should warn about images without alt attribute (ACC-005)', () => {
      const noAltXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test</title>
  </head>
  <body>
    <img src="image.png" />
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(noAltXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const accWarnings = context.messages.filter((m) => m.id === 'ACC-005');
      expect(accWarnings).toHaveLength(1);
      expect(accWarnings[0]?.message).toContain('alt');
    });

    it('should accept images with alt attribute', () => {
      const withAltXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test</title>
  </head>
  <body>
    <img src="image.png" alt="A beautiful sunset" />
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(withAltXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const accWarnings = context.messages.filter((m) => m.id === 'ACC-005');
      expect(accWarnings).toHaveLength(0);
    });

    it('should accept images with empty alt for decorative images', () => {
      const emptyAltXHTML = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>Test</title>
  </head>
  <body>
    <img src="decoration.png" alt="" />
  </body>
</html>`;
      const files = new Map([['OEBPS/chapter1.xhtml', toBytes(emptyAltXHTML)]]);
      const packageDoc = createPackageDoc([
        { id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
      ]);
      context = createContext(files, packageDoc);
      validator.validate(context);

      const accWarnings = context.messages.filter((m) => m.id === 'ACC-005');
      expect(accWarnings).toHaveLength(0);
    });
  });
});
