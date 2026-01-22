/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, it, beforeEach } from 'vitest';
import { CSSValidator } from '../../../src/css/validator.js';
import type { ValidationContext } from '../../../src/types.js';
import type { PackageDocument } from '../../../src/opf/types.js';

function createValidationContext(): ValidationContext {
  return {
    data: new Uint8Array(),
    options: {
      version: '3.0',
      profile: 'default',
      includeUsage: false,
      includeInfo: false,
      maxErrors: 0,
      locale: 'en',
    },
    version: '3.0',
    messages: [],
    files: new Map(),
    rootfiles: [],
    opfPath: 'OEBPS/content.opf',
  };
}

function createMinimalPackage(overrides?: Partial<PackageDocument>): PackageDocument {
  return {
    version: '3.0',
    uniqueIdentifier: 'bookid',
    dcElements: [
      { name: 'identifier', value: 'urn:uuid:12345678-1234-1234-1234-123456789abc', id: 'bookid' },
      { name: 'title', value: 'Test Book' },
      { name: 'language', value: 'en' },
    ],
    metaElements: [{ property: 'dcterms:modified', value: '2023-01-01T00:00:00Z' }],
    linkElements: [],
    manifest: [],
    spine: [],
    guide: [],
    collections: [],
    ...overrides,
  };
}

describe('CSSValidator', () => {
  let validator: CSSValidator;
  let context: ValidationContext;

  beforeEach(() => {
    validator = new CSSValidator();
    context = createValidationContext();
  });

  describe('CSS parsing', () => {
    it('should validate correct CSS without errors', () => {
      const validCSS = 'body { color: #333; }';
      const result = validator.validate(context, validCSS, 'styles/test.css');

      expect(result.references).toEqual([]);
      expect(result.fontFamilies).toEqual([]);
      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });
  });

  describe('Position property validation', () => {
    it('should add CSS-006 warning for position: fixed', () => {
      const css = '.fixed { position: fixed; }';
      validator.validate(context, css, 'styles/test.css');

      expect(context.messages.some((m) => m.id === 'CSS-006')).toBe(true);
      expect(context.messages[0]!.severity).toBe('warning');
    });

    it('should add CSS-019 warning for position: absolute', () => {
      const css = '.absolute { position: absolute; }';
      validator.validate(context, css, 'styles/test.css');

      expect(
        context.messages.some((m) => m.id === 'CSS-019' && m.message.includes('absolute')),
      ).toBe(true);
      expect(context.messages[0]!.severity).toBe('warning');
    });

    it('should not warn for position: relative or static', () => {
      const css = '.relative { position: relative; } .static { position: static; }';
      validator.validate(context, css, 'styles/test.css');

      expect(context.messages.filter((m) => m.severity === 'warning')).toHaveLength(0);
    });
  });

  describe('@import validation', () => {
    it('should add CSS-002 error for empty @import', () => {
      const css = '@import;';
      validator.validate(context, css, 'styles/test.css');

      expect(
        context.messages.some((m) => m.id === 'CSS-002' && m.message.includes('Empty @import')),
      ).toBe(true);
    });

    it('should add CSS-002 error for @import with empty URL', () => {
      const css = '@import url("");';
      validator.validate(context, css, 'styles/test.css');

      expect(context.messages.some((m) => m.id === 'CSS-002')).toBe(true);
    });

    it('should extract reference from @import url()', () => {
      const css = '@import url("../styles/base.css");';
      const result = validator.validate(context, css, 'styles/test.css');

      expect(result.references).toHaveLength(1);
      expect(result.references[0]).toMatchObject({
        url: '../styles/base.css',
        type: 'import',
      });
    });

    it('should extract reference from @import with string', () => {
      const css = '@import "../styles/base.css";';
      const result = validator.validate(context, css, 'styles/test.css');

      expect(result.references).toHaveLength(1);
      expect(result.references[0]).toMatchObject({
        url: '../styles/base.css',
        type: 'import',
      });
    });
  });

  describe('@font-face validation', () => {
    it('should add CSS-019 warning for @font-face without attributes', () => {
      const css = '@font-face {}';
      validator.validate(context, css, 'styles/test.css');

      expect(
        context.messages.some((m) => m.id === 'CSS-019' && m.message.includes('no attributes')),
      ).toBe(true);
    });

    it('should add CSS-019 warning for @font-face without src', () => {
      const css = '@font-face { font-family: "TestFont"; }';
      validator.validate(context, css, 'styles/test.css');

      expect(context.messages.some((m) => m.id === 'CSS-019' && m.message.includes('src'))).toBe(
        true,
      );
    });

    it('should add CSS-002 error for empty src in @font-face', () => {
      const css = '@font-face { src: url(""); }';
      validator.validate(context, css, 'styles/test.css');

      expect(context.messages.some((m) => m.id === 'CSS-002' && m.message.includes('src'))).toBe(
        true,
      );
    });

    it('should extract font family from @font-face with string', () => {
      const css = '@font-face { font-family: "TestFont"; src: url("test.woff"); }';
      const result = validator.validate(context, css, 'styles/test.css');

      expect(result.fontFamilies).toContain('TestFont');
    });

    it('should extract font family from @font-face with identifier', () => {
      const css = '@font-face { font-family: TestFont; src: url("test.woff"); }';
      const result = validator.validate(context, css, 'styles/test.css');

      expect(result.fontFamilies).toContain('TestFont');
    });

    it('should extract reference from @font-face src', () => {
      const css = '@font-face { font-family: "TestFont"; src: url("fonts/test.woff"); }';
      const result = validator.validate(context, css, 'styles/test.css');

      expect(result.references).toHaveLength(1);
      expect(result.references[0]).toMatchObject({
        url: 'fonts/test.woff',
        type: 'font',
      });
    });

    it('should skip data: URLs in @font-face src', () => {
      const css = '@font-face { font-family: "TestFont"; src: url("data:font/woff;base64,..."); }';
      const result = validator.validate(context, css, 'styles/test.css');

      expect(result.references).toHaveLength(0);
    });

    it('should skip fragment-only URLs in @font-face src', () => {
      const css = '@font-face { font-family: "TestFont"; src: url("#fragment"); }';
      const result = validator.validate(context, css, 'styles/test.css');

      expect(result.references).toHaveLength(0);
    });

    it('should extract multiple font sources', () => {
      const css =
        '@font-face { font-family: "TestFont"; src: url("test.woff") format("woff"), url("test.woff2") format("woff2"); }';
      const result = validator.validate(context, css, 'styles/test.css');

      expect(result.references).toHaveLength(2);
      expect(result.references[0]!.url).toBe('test.woff');
      expect(result.references[1]!.url).toBe('test.woff2');
    });
  });

  describe('Font type validation', () => {
    it('should validate WOFF font type', () => {
      const css = '@font-face { src: url("font.woff"); }';
      validator.validate(context, css, 'styles/test.css');

      expect(context.messages.filter((m) => m.id === 'CSS-007')).toHaveLength(0);
    });

    it('should validate WOFF2 font type', () => {
      const css = '@font-face { src: url("font.woff2"); }';
      validator.validate(context, css, 'styles/test.css');

      expect(context.messages.filter((m) => m.id === 'CSS-007')).toHaveLength(0);
    });

    it('should validate OTF font type', () => {
      const css = '@font-face { src: url("font.otf"); }';
      validator.validate(context, css, 'styles/test.css');

      expect(context.messages.filter((m) => m.id === 'CSS-007')).toHaveLength(0);
    });

    it('should validate TTF font type', () => {
      const css = '@font-face { src: url("font.ttf"); }';
      validator.validate(context, css, 'styles/test.css');

      expect(context.messages.filter((m) => m.id === 'CSS-007')).toHaveLength(0);
    });

    it('should add CSS-007 error when manifest has non-standard font type', () => {
      context.packageDocument = createMinimalPackage({
        manifest: [
          { id: 'font1', href: 'styles/font.woff', mediaType: 'application/octet-stream' },
        ],
      });

      const css = '@font-face { src: url("font.woff"); }';
      validator.validate(context, css, 'styles/test.css');

      expect(
        context.messages.some((m) => m.id === 'CSS-007' && m.message.includes('media type')),
      ).toBe(true);
    });
  });

  describe('Media overlay class validation', () => {
    it('should add CSS-029 error for reserved class name -epub-media-overlay-active', () => {
      const css = '.-epub-media-overlay-active { color: red; }';
      validator.validate(context, css, 'styles/test.css');

      expect(context.messages.some((m) => m.id === 'CSS-029')).toBe(true);
    });

    it('should add CSS-029 error for reserved class name media-overlay-active', () => {
      const css = '.media-overlay-active { color: red; }';
      validator.validate(context, css, 'styles/test.css');

      expect(context.messages.some((m) => m.id === 'CSS-029')).toBe(true);
    });

    it('should add CSS-029 error for reserved class name -epub-media-overlay-playing', () => {
      const css = '.-epub-media-overlay-playing { color: red; }';
      validator.validate(context, css, 'styles/test.css');

      expect(context.messages.some((m) => m.id === 'CSS-029')).toBe(true);
    });

    it('should add CSS-029 error for reserved class name media-overlay-playing', () => {
      const css = '.media-overlay-playing { color: red; }';
      validator.validate(context, css, 'styles/test.css');

      expect(context.messages.some((m) => m.id === 'CSS-029')).toBe(true);
    });

    it('should add CSS-030 warning for -epub-media-overlay- prefix', () => {
      const css = '.-epub-media-overlay-test { color: red; }';
      validator.validate(context, css, 'styles/test.css');

      expect(context.messages.some((m) => m.id === 'CSS-030')).toBe(true);
    });

    it('should validate non-reserved class names', () => {
      const css = '.my-class { color: red; } .overlay { background: blue; }';
      validator.validate(context, css, 'styles/test.css');

      expect(
        context.messages.filter((m) => m.id.startsWith('CSS-029') || m.id.startsWith('CSS-030')),
      ).toHaveLength(0);
    });
  });

  describe('Complex CSS', () => {
    it('should handle multiple rules and declarations', () => {
      const css = `
        body { font-family: serif; }
        p { line-height: 1.5; }
        .test { color: #333; }
      `;
      const result = validator.validate(context, css, 'styles/test.css');

      expect(result.references).toHaveLength(0);
      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });

    it('should handle nested selectors', () => {
      const css = `
        .container > .child { color: blue; }
        ul li { list-style: disc; }
        a:hover { text-decoration: underline; }
      `;
      validator.validate(context, css, 'styles/test.css');

      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });

    it('should handle media queries', () => {
      const css = `
        @media (max-width: 600px) {
          body { font-size: 14px; }
        }
      `;
      validator.validate(context, css, 'styles/test.css');

      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });

    it('should handle multiple @font-face declarations', () => {
      const css = `
        @font-face { font-family: "Font1"; src: url("font1.woff"); }
        @font-face { font-family: "Font2"; src: url("font2.woff2"); }
      `;
      const result = validator.validate(context, css, 'styles/test.css');

      expect(result.fontFamilies).toHaveLength(2);
      expect(result.fontFamilies).toContain('Font1');
      expect(result.fontFamilies).toContain('Font2');
      expect(result.references).toHaveLength(2);
    });
  });

  describe('Path resolution', () => {
    it('should resolve relative paths correctly', () => {
      context.packageDocument = createMinimalPackage({
        manifest: [{ id: 'font1', href: 'fonts/test.woff', mediaType: 'font/woff' }],
      });

      const css = '@font-face { src: url("../fonts/test.woff"); }';
      validator.validate(context, css, 'styles/main.css');

      expect(context.messages.filter((m) => m.id === 'CSS-007')).toHaveLength(0);
    });

    it('should handle absolute paths', () => {
      const css = '@import url("/styles/base.css");';
      const result = validator.validate(context, css, 'styles/test.css');

      expect(result.references[0]!.url).toBe('/styles/base.css');
    });
  });
});
