import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { ValidationContext } from '../types.js';
import { OCFValidator } from './validator.js';

/**
 * Helper to create a test EPUB ZIP file
 */
function createEpubZip(files: Record<string, string | Uint8Array>): Uint8Array {
  const zipFiles: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(files)) {
    zipFiles[path] = typeof content === 'string' ? strToU8(content) : content;
  }
  return zipSync(zipFiles);
}

/**
 * Helper to create a minimal valid EPUB structure
 */
function createMinimalEpub(overrides: Record<string, string | Uint8Array> = {}): Uint8Array {
  const defaults: Record<string, string> = {
    mimetype: 'application/epub+zip',
    'META-INF/container.xml': `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
    'OEBPS/content.opf': `<?xml version="1.0" encoding="UTF-8"?>
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
</package>`,
    'OEBPS/nav.xhtml': `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Navigation</title></head>
<body>
  <nav epub:type="toc">
    <ol><li><a href="nav.xhtml">Start</a></li></ol>
  </nav>
</body>
</html>`,
  };

  return createEpubZip({ ...defaults, ...overrides });
}

/**
 * Create a basic validation context for testing
 */
function createContext(data: Uint8Array): ValidationContext {
  return {
    data,
    options: {
      version: '3.3',
      profile: 'default',
      includeUsage: false,
      includeInfo: true,
      maxErrors: 0,
      locale: 'en',
    },
    version: '3.3',
    messages: [],
    files: new Map(),
    rootfiles: [],
  };
}

describe('OCFValidator', () => {
  describe('mimetype validation', () => {
    it('should pass for valid mimetype content', () => {
      const data = createMinimalEpub();
      const context = createContext(data);
      const validator = new OCFValidator();

      validator.validate(context);

      // Check that there's no PKG-006 (missing) or PKG-007 (wrong content) error
      const contentErrors = context.messages.filter(
        (m) => m.id === 'PKG-006' || m.id === 'PKG-007',
      );
      expect(contentErrors).toHaveLength(0);
    });

    it('should report error for missing mimetype', () => {
      const data = createEpubZip({
        'META-INF/container.xml': '<container/>',
      });
      const context = createContext(data);
      const validator = new OCFValidator();

      validator.validate(context);

      const error = context.messages.find((m) => m.id === 'PKG-006');
      expect(error).toBeDefined();
      expect(error?.severity).toBe('error');
    });

    it('should report error for wrong mimetype content', () => {
      const data = createEpubZip({
        mimetype: 'application/wrong',
        'META-INF/container.xml': '<container/>',
      });
      const context = createContext(data);
      const validator = new OCFValidator();

      validator.validate(context);

      const error = context.messages.find((m) => m.id === 'PKG-007');
      expect(error).toBeDefined();
      expect(error?.message).toContain('application/epub+zip');
    });

    it('should warn about whitespace in mimetype', () => {
      const data = createEpubZip({
        mimetype: 'application/epub+zip\n',
        'META-INF/container.xml': `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
        'content.opf': '<package/>',
      });
      const context = createContext(data);
      const validator = new OCFValidator();

      validator.validate(context);

      const warning = context.messages.find((m) => m.id === 'PKG-008');
      expect(warning).toBeDefined();
      expect(warning?.severity).toBe('warning');
    });
  });

  describe('container.xml validation', () => {
    it('should report error for missing container.xml', () => {
      const data = createEpubZip({
        mimetype: 'application/epub+zip',
      });
      const context = createContext(data);
      const validator = new OCFValidator();

      validator.validate(context);

      const error = context.messages.find((m) => m.id === 'PKG-003');
      expect(error).toBeDefined();
      expect(error?.severity).toBe('fatal');
    });

    it('should extract rootfile path from container.xml', () => {
      const data = createMinimalEpub();
      const context = createContext(data);
      const validator = new OCFValidator();

      validator.validate(context);

      expect(context.rootfiles).toHaveLength(1);
      expect(context.rootfiles[0]?.path).toBe('OEBPS/content.opf');
      expect(context.opfPath).toBe('OEBPS/content.opf');
    });

    it('should report error when no rootfile is found', () => {
      const data = createEpubZip({
        mimetype: 'application/epub+zip',
        'META-INF/container.xml': `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
  </rootfiles>
</container>`,
      });
      const context = createContext(data);
      const validator = new OCFValidator();

      validator.validate(context);

      const error = context.messages.find((m) => m.id === 'PKG-004');
      expect(error).toBeDefined();
      expect(error?.severity).toBe('fatal');
    });

    it('should report error when rootfile points to missing file', () => {
      const data = createEpubZip({
        mimetype: 'application/epub+zip',
        'META-INF/container.xml': `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="missing.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
      });
      const context = createContext(data);
      const validator = new OCFValidator();

      validator.validate(context);

      const error = context.messages.find((m) => m.id === 'PKG-010');
      expect(error).toBeDefined();
      expect(error?.message).toContain('missing.opf');
    });
  });

  describe('META-INF validation', () => {
    it('should report error for missing META-INF directory', () => {
      const data = createEpubZip({
        mimetype: 'application/epub+zip',
      });
      const context = createContext(data);
      const validator = new OCFValidator();

      validator.validate(context);

      const error = context.messages.find((m) => m.id === 'PKG-002');
      expect(error).toBeDefined();
    });
  });

  describe('ZIP handling', () => {
    it('should report fatal error for invalid ZIP', () => {
      const invalidData = new Uint8Array([1, 2, 3, 4, 5]);
      const context = createContext(invalidData);
      const validator = new OCFValidator();

      validator.validate(context);

      const error = context.messages.find((m) => m.id === 'PKG-001');
      expect(error).toBeDefined();
      expect(error?.severity).toBe('fatal');
    });

    it('should populate files map from ZIP', () => {
      const data = createMinimalEpub();
      const context = createContext(data);
      const validator = new OCFValidator();

      validator.validate(context);

      expect(context.files.size).toBeGreaterThan(0);
      expect(context.files.has('mimetype')).toBe(true);
      expect(context.files.has('META-INF/container.xml')).toBe(true);
    });
  });
});
