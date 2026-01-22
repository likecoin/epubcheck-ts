import { describe, expect, it, beforeEach } from 'vitest';
import { NCXValidator } from '../../../src/ncx/validator.js';
import type { ValidationContext } from '../../../src/types.js';

function createValidationContext(): ValidationContext {
  return {
    data: new Uint8Array(),
    options: {
      version: '2.0',
      profile: 'default',
      includeUsage: false,
      includeInfo: false,
      maxErrors: 0,
      locale: 'en',
    },
    version: '2.0',
    messages: [],
    files: new Map(),
    rootfiles: [],
    opfPath: 'OEBPS/content.opf',
  };
}

function createValidNCX(overrides?: { uid?: string; contentSrc?: string }): string {
  const uid = overrides?.uid ?? 'urn:uuid:12345678-1234-1234-1234-123456789abc';
  const contentSrc = overrides?.contentSrc ?? 'chapter1.xhtml';

  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head>
<meta name="dtb:uid" content="${uid}"/>
<meta name="dtb:depth" content="1"/>
<meta name="dtb:totalPageCount" content="0"/>
<meta name="dtb:maxPageNumber" content="0"/>
</head>
<docTitle><text>Test Book</text></docTitle>
<navMap>
<navPoint id="nav1" playOrder="1">
<navLabel><text>Chapter 1</text></navLabel>
<content src="${contentSrc}"/>
</navPoint>
</navMap>
</ncx>`;
}

describe('NCXValidator', () => {
  let validator: NCXValidator;
  let context: ValidationContext;

  beforeEach(() => {
    validator = new NCXValidator();
    context = createValidationContext();

    // Add test file to context for content src validation
    context.files.set('OEBPS/chapter1.xhtml', new TextEncoder().encode('<html></html>'));
  });

  describe('Well-formedness validation', () => {
    it('should add NCX-002 error for malformed NCX', () => {
      const malformedNCX = '<?xml version="1.0" encoding="UTF-8"?><ncx><unclosed>';
      validator.validate(context, malformedNCX, 'OEBPS/toc.ncx');

      expect(context.messages.some((m) => m.id === 'NCX-002')).toBe(true);
    });

    it('should add NCX-002 error for invalid XML', () => {
      const invalidNCX = '<?xml version="1.0" encoding="UTF-8"?><ncx><unclosedTag></ncx>';
      validator.validate(context, invalidNCX, 'OEBPS/toc.ncx');

      expect(context.messages.some((m) => m.id === 'NCX-002')).toBe(true);
    });

    it('should validate well-formed NCX', () => {
      const validNCX = createValidNCX();
      validator.validate(context, validNCX, 'OEBPS/toc.ncx');

      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });
  });

  describe('Root element validation', () => {
    it('should add NCX-001 error when root element is not ncx', () => {
      const invalidNCX = '<?xml version="1.0" encoding="UTF-8"?><html><body></body></html>';
      validator.validate(context, invalidNCX, 'OEBPS/toc.ncx');

      expect(context.messages.some((m) => m.id === 'NCX-001')).toBe(true);
    });

    it('should add NCX-001 error for wrong namespace', () => {
      const wrongNamespace =
        '<?xml version="1.0" encoding="UTF-8"?><ncx xmlns="http://wrong.namespace/"></ncx>';
      validator.validate(context, wrongNamespace, 'OEBPS/toc.ncx');

      expect(context.messages.some((m) => m.id === 'NCX-001')).toBe(true);
    });

    it('should add NCX-001 error for missing namespace', () => {
      const noNamespace = '<?xml version="1.0" encoding="UTF-8"?><ncx></ncx>';
      validator.validate(context, noNamespace, 'OEBPS/toc.ncx');

      expect(context.messages.some((m) => m.id === 'NCX-001')).toBe(true);
    });
  });

  describe('dtb:uid validation', () => {
    it('should add NCX-003 warning for empty dtb:uid content', () => {
      const emptyUID = createValidNCX({ uid: '' });
      validator.validate(context, emptyUID, 'OEBPS/toc.ncx');

      expect(context.messages.some((m) => m.id === 'NCX-003')).toBe(true);
    });

    it('should add NCX-003 warning for whitespace-only dtb:uid', () => {
      const whitespaceUID = createValidNCX({ uid: '   ' });
      validator.validate(context, whitespaceUID, 'OEBPS/toc.ncx');

      expect(context.messages.some((m) => m.id === 'NCX-003')).toBe(true);
    });

    it('should store valid uid in context', () => {
      const validUID = 'urn:uuid:12345678-1234-1234-1234-123456789abc';
      const validNCX = createValidNCX({ uid: validUID });
      validator.validate(context, validNCX, 'OEBPS/toc.ncx');

      expect(context.ncxUid).toBe(validUID);
    });

    it('should not warn for valid dtb:uid', () => {
      const validNCX = createValidNCX();
      validator.validate(context, validNCX, 'OEBPS/toc.ncx');

      expect(context.messages.filter((m) => m.id === 'NCX-003')).toHaveLength(0);
    });
  });

  describe('navMap validation', () => {
    it('should add NCX-001 error when navMap is missing', () => {
      const noNavMap = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head>
<meta name="dtb:uid" content="urn:uuid:12345678"/>
</head>
<docTitle><text>Test</text></docTitle>
</ncx>`;
      validator.validate(context, noNavMap, 'OEBPS/toc.ncx');

      expect(context.messages.some((m) => m.id === 'NCX-001' && m.message.includes('navMap'))).toBe(
        true,
      );
    });

    it('should validate navMap element exists', () => {
      const validNCX = createValidNCX();
      validator.validate(context, validNCX, 'OEBPS/toc.ncx');

      expect(
        context.messages.filter((m) => m.id === 'NCX-001' && m.message.includes('navMap')),
      ).toHaveLength(0);
    });
  });

  describe('content src validation', () => {
    it('should add NCX-006 error for missing content src file', () => {
      const missingFile = createValidNCX({ contentSrc: 'missing.xhtml' });
      validator.validate(context, missingFile, 'OEBPS/toc.ncx');

      expect(context.messages.some((m) => m.id === 'NCX-006')).toBe(true);
    });

    it('should not error for existing content src file', () => {
      const validNCX = createValidNCX({ contentSrc: 'chapter1.xhtml' });
      validator.validate(context, validNCX, 'OEBPS/toc.ncx');

      expect(context.messages.filter((m) => m.id === 'NCX-006')).toHaveLength(0);
    });

    it('should allow remote content src (HTTP)', () => {
      const remoteSrc = createValidNCX({ contentSrc: 'http://example.com/content.xhtml' });
      validator.validate(context, remoteSrc, 'OEBPS/toc.ncx');

      expect(context.messages.filter((m) => m.id === 'NCX-006')).toHaveLength(0);
    });

    it('should allow remote content src (HTTPS)', () => {
      const remoteSrc = createValidNCX({ contentSrc: 'https://example.com/content.xhtml' });
      validator.validate(context, remoteSrc, 'OEBPS/toc.ncx');

      expect(context.messages.filter((m) => m.id === 'NCX-006')).toHaveLength(0);
    });

    it('should handle content src with fragment identifier', () => {
      const fragmentSrc = createValidNCX({ contentSrc: 'chapter1.xhtml#section1' });
      validator.validate(context, fragmentSrc, 'OEBPS/toc.ncx');

      expect(context.messages.filter((m) => m.id === 'NCX-006')).toHaveLength(0);
    });

    it('should handle relative paths correctly', () => {
      // Add file in subdirectory
      context.files.set('OEBPS/chapters/chapter1.xhtml', new TextEncoder().encode('<html></html>'));

      const relativePath = createValidNCX({ contentSrc: 'chapters/chapter1.xhtml' });
      validator.validate(context, relativePath, 'OEBPS/toc.ncx');

      expect(context.messages.filter((m) => m.id === 'NCX-006')).toHaveLength(0);
    });

    it('should handle parent directory references in content src', () => {
      // Add file in parent directory
      context.files.set('root.html', new TextEncoder().encode('<html></html>'));

      const parentRef = createValidNCX({ contentSrc: '../root.html' });
      validator.validate(context, parentRef, 'OEBPS/toc.ncx');

      expect(context.messages.filter((m) => m.id === 'NCX-006')).toHaveLength(0);
    });

    it('should handle absolute paths in content src', () => {
      context.files.set('absolute/path.html', new TextEncoder().encode('<html></html>'));

      const absolutePath = createValidNCX({ contentSrc: '/absolute/path.html' });
      validator.validate(context, absolutePath, 'OEBPS/toc.ncx');

      expect(context.messages.filter((m) => m.id === 'NCX-006')).toHaveLength(0);
    });
  });

  describe('Multiple content src elements', () => {
    it('should validate all content src elements', () => {
      const multiContent = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head>
<meta name="dtb:uid" content="urn:uuid:12345678"/>
</head>
<docTitle><text>Test</text></docTitle>
<navMap>
<navPoint id="nav1" playOrder="1">
<navLabel><text>Chapter 1</text></navLabel>
<content src="chapter1.xhtml"/>
</navPoint>
<navPoint id="nav2" playOrder="2">
<navLabel><text>Chapter 2</text></navLabel>
<content src="chapter2.xhtml"/>
</navPoint>
</navMap>
</ncx>`;

      context.files.set('OEBPS/chapter1.xhtml', new TextEncoder().encode('<html></html>'));
      // Don't add chapter2.xhtml to test error

      validator.validate(context, multiContent, 'OEBPS/toc.ncx');

      expect(
        context.messages.some((m) => m.id === 'NCX-006' && m.message.includes('chapter2.xhtml')),
      ).toBe(true);
    });
  });

  describe('Complex NCX structures', () => {
    it('should handle nested navPoint elements', () => {
      const nestedNCX = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head>
<meta name="dtb:uid" content="urn:uuid:12345678"/>
</head>
<docTitle><text>Test</text></docTitle>
<navMap>
<navPoint id="nav1" playOrder="1">
<navLabel><text>Chapter 1</text></navLabel>
<content src="chapter1.xhtml"/>
<navPoint id="nav1-1" playOrder="2">
<navLabel><text>Section 1.1</text></navLabel>
<content src="chapter1-1.xhtml"/>
</navPoint>
</navPoint>
</navMap>
</ncx>`;

      context.files.set('OEBPS/chapter1.xhtml', new TextEncoder().encode('<html></html>'));
      context.files.set('OEBPS/chapter1-1.xhtml', new TextEncoder().encode('<html></html>'));

      validator.validate(context, nestedNCX, 'OEBPS/toc.ncx');

      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });

    it('should handle NCX with all required elements', () => {
      const completeNCX = createValidNCX();
      validator.validate(context, completeNCX, 'OEBPS/toc.ncx');

      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });
  });

  describe('NCX version variations', () => {
    it('should handle NCX version 2005-1', () => {
      const version2005 = createValidNCX();
      validator.validate(context, version2005, 'OEBPS/toc.ncx');

      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });
  });
});
