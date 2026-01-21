import { beforeEach, describe, expect, it } from 'vitest';
import type { EpubCheckOptions, ValidationContext } from '../types.js';
import { OPFValidator } from './validator.js';

describe('OPFValidator', () => {
  let validator: OPFValidator;

  const defaultOptions: Required<EpubCheckOptions> = {
    version: '3.0',
    profile: 'default',
    includeUsage: false,
    includeInfo: false,
    maxErrors: 0,
    locale: 'en',
  };

  const toBytes = (str: string): Uint8Array => new TextEncoder().encode(str);

  const createContext = (
    opfContent: string,
    additionalFiles: Record<string, string> = {},
  ): ValidationContext => {
    const files = new Map<string, Uint8Array>();
    files.set('OEBPS/content.opf', toBytes(opfContent));
    files.set(
      'OEBPS/nav.xhtml',
      toBytes(
        '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Nav</title></head><body></body></html>',
      ),
    );

    for (const [path, content] of Object.entries(additionalFiles)) {
      files.set(path, toBytes(content));
    }

    return {
      messages: [],
      files,
      opfPath: 'OEBPS/content.opf',
      data: new Uint8Array(),
      options: defaultOptions,
      version: '3.0',
      rootfiles: [{ path: 'OEBPS/content.opf', mediaType: 'application/oebps-package+xml' }],
    };
  };

  const validOPF = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Test Book</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
  </spine>
</package>`;

  beforeEach(() => {
    validator = new OPFValidator();
  });

  describe('collection validation', () => {
    it('should warn about unknown collection role (OPF-071)', () => {
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
  </spine>
  <collection role="unknown-role">
    <link href="chapter1.xhtml"/>
  </collection>
</package>`;
      const context = createContext(opf, { 'OEBPS/chapter1.xhtml': '<html/>' });
      validator.validate(context);

      const warnings = context.messages.filter((m) => m.id === 'OPF-071');
      expect(warnings).toHaveLength(1);
      expect(warnings[0]?.message).toContain('unknown-role');
    });

    it('should accept valid collection roles', () => {
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
  </spine>
  <collection role="index">
    <link href="chapter1.xhtml"/>
  </collection>
</package>`;
      const context = createContext(opf, { 'OEBPS/chapter1.xhtml': '<html/>' });
      validator.validate(context);

      const warnings = context.messages.filter((m) => m.id === 'OPF-071');
      expect(warnings).toHaveLength(0);
    });

    it('should require name attribute for dictionary collection (OPF-072)', () => {
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="dict1" href="dict.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
  </spine>
  <collection role="dictionary">
    <link href="dict.xhtml"/>
  </collection>
</package>`;
      const context = createContext(opf, { 'OEBPS/dict.xhtml': '<html/>' });
      validator.validate(context);

      const errors = context.messages.filter((m) => m.id === 'OPF-072');
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('name');
    });

    it('should report error for collection itemref referencing non-existent manifest item (OPF-073)', () => {
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
  </spine>
  <collection role="index">
    <link href="nonexistent.xhtml"/>
  </collection>
</package>`;
      const context = createContext(opf);
      validator.validate(context);

      const errors = context.messages.filter((m) => m.id === 'OPF-073');
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('non-existent');
    });

    it('should validate dictionary collection items are XHTML or SVG (OPF-074)', () => {
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="image1" href="image.png" media-type="image/png"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
  </spine>
  <collection role="dictionary" id="dict1">
    <metadata>
      <dc:title>My Dictionary</dc:title>
    </metadata>
    <link href="image.png"/>
  </collection>
</package>`;
      const context = createContext(opf, { 'OEBPS/image.png': 'PNG data' });
      validator.validate(context);

      const errors = context.messages.filter((m) => m.id === 'OPF-074');
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('XHTML or SVG');
    });

    it('should validate index collection items are XHTML (OPF-075)', () => {
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="idx-svg" href="index.svg" media-type="image/svg+xml"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
  </spine>
  <collection role="index">
    <link href="index.svg"/>
  </collection>
</package>`;
      const context = createContext(opf, { 'OEBPS/index.svg': '<svg/>' });
      validator.validate(context);

      const errors = context.messages.filter((m) => m.id === 'OPF-075');
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('XHTML');
    });

    it('should accept valid index collection with XHTML items', () => {
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="idx" href="index.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
  </spine>
  <collection role="index">
    <link href="index.xhtml"/>
  </collection>
</package>`;
      const context = createContext(opf, { 'OEBPS/index.xhtml': '<html/>' });
      validator.validate(context);

      const errors = context.messages.filter((m) => m.id === 'OPF-075');
      expect(errors).toHaveLength(0);
    });

    it('should not validate collections for EPUB 2', () => {
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="ch1"/>
  </spine>
</package>`;
      const context = createContext(opf, {
        'OEBPS/chapter1.xhtml': '<html/>',
        'OEBPS/toc.ncx': '<ncx/>',
      });
      validator.validate(context);

      const collectionErrors = context.messages.filter((m) =>
        ['OPF-071', 'OPF-072', 'OPF-073', 'OPF-074', 'OPF-075'].includes(m.id),
      );
      expect(collectionErrors).toHaveLength(0);
    });
  });

  describe('metadata validation', () => {
    it('should report error for empty metadata section (OPF-072)', () => {
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
  </spine>
</package>`;
      const context = createContext(opf);
      validator.validate(context);

      const errors = context.messages.filter(
        (m) => m.id === 'OPF-072' && m.message.includes('Metadata section is empty'),
      );
      expect(errors).toHaveLength(1);
    });

    it('should report error for invalid dc:date format (OPF-053)', () => {
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
    <dc:date>January 1, 2024</dc:date>
    <meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
  </spine>
</package>`;
      const context = createContext(opf);
      validator.validate(context);

      const errors = context.messages.filter((m) => m.id === 'OPF-053');
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('Invalid date format');
    });

    it('should accept valid W3C date formats', () => {
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
    <dc:date>2024-01-15</dc:date>
    <meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
  </spine>
</package>`;
      const context = createContext(opf);
      validator.validate(context);

      const errors = context.messages.filter((m) => m.id === 'OPF-053');
      expect(errors).toHaveLength(0);
    });

    it('should require dcterms:modified for EPUB 3 (OPF-054)', () => {
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
  </spine>
</package>`;
      const context = createContext(opf);
      validator.validate(context);

      const errors = context.messages.filter((m) => m.id === 'OPF-054');
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('dcterms:modified');
    });
  });

  describe('manifest validation', () => {
    it('should report error for missing nav document in EPUB 3 (OPF-013)', () => {
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
  </spine>
</package>`;
      const context = createContext(opf, { 'OEBPS/chapter1.xhtml': '<html/>' });
      validator.validate(context);

      const errors = context.messages.filter((m) => m.id === 'OPF-013');
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('nav');
    });

    it('should report error for undeclared resources (RSC-008)', () => {
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
  </spine>
</package>`;
      const context = createContext(opf, { 'OEBPS/undeclared.css': 'body {}' });
      validator.validate(context);

      const warnings = context.messages.filter((m) => m.id === 'RSC-008');
      expect(warnings).toHaveLength(1);
      expect(warnings[0]?.message).toContain('undeclared.css');
    });

    it('should report error for duplicate manifest IDs (OPF-074)', () => {
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="nav" href="other.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
  </spine>
</package>`;
      const context = createContext(opf, { 'OEBPS/other.xhtml': '<html/>' });
      validator.validate(context);

      const errors = context.messages.filter(
        (m) => m.id === 'OPF-074' && m.message.includes('Duplicate manifest item id'),
      );
      expect(errors).toHaveLength(1);
    });
  });

  describe('spine validation', () => {
    it('should report error for empty spine (OPF-033)', () => {
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine>
  </spine>
</package>`;
      const context = createContext(opf);
      validator.validate(context);

      const errors = context.messages.filter((m) => m.id === 'OPF-033');
      expect(errors).toHaveLength(1);
    });

    it('should report error for spine itemref referencing non-existent item (OPF-049)', () => {
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine>
    <itemref idref="nonexistent"/>
  </spine>
</package>`;
      const context = createContext(opf);
      validator.validate(context);

      const errors = context.messages.filter((m) => m.id === 'OPF-049');
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('nonexistent');
    });
  });

  describe('fallback chain validation', () => {
    it('should detect circular fallback chains (OPF-045)', () => {
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="item1" href="file1.pdf" media-type="application/pdf" fallback="item2"/>
    <item id="item2" href="file2.pdf" media-type="application/pdf" fallback="item1"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
  </spine>
</package>`;
      const context = createContext(opf, {
        'OEBPS/file1.pdf': 'PDF',
        'OEBPS/file2.pdf': 'PDF',
      });
      validator.validate(context);

      const errors = context.messages.filter((m) => m.id === 'OPF-045');
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0]?.message).toContain('Circular fallback');
    });
  });

  describe('package attributes validation', () => {
    it('should accept valid versions', () => {
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.2" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
  </spine>
</package>`;
      const context = createContext(opf);
      validator.validate(context);

      const errors = context.messages.filter((m) => m.id === 'OPF-001');
      expect(errors).toHaveLength(0);
    });

    it('should report error for missing unique-identifier (OPF-048)', () => {
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier>test-id</dc:identifier>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
  </spine>
</package>`;
      const context = createContext(opf);
      validator.validate(context);

      const errors = context.messages.filter((m) => m.id === 'OPF-048');
      expect(errors).toHaveLength(1);
    });

    it('should report error when unique-identifier references non-existent dc:identifier (OPF-030)', () => {
      const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="missing-uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">test-id</dc:identifier>
    <dc:title>Test</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2024-01-01T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
  </manifest>
  <spine>
    <itemref idref="nav"/>
  </spine>
</package>`;
      const context = createContext(opf);
      validator.validate(context);

      const errors = context.messages.filter((m) => m.id === 'OPF-030');
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('missing-uid');
    });
  });

  describe('valid OPF', () => {
    it('should pass validation for a valid OPF', () => {
      const context = createContext(validOPF);
      validator.validate(context);

      const errors = context.messages.filter(
        (m) => m.severity === 'error' || m.severity === 'fatal',
      );
      expect(errors).toHaveLength(0);
    });
  });
});
