import { beforeEach, describe, expect, it } from 'vitest';
import type { EpubCheckOptions, ValidationContext } from '../types.js';
import { CSSValidator } from './validator.js';

describe('CSSValidator', () => {
  let validator: CSSValidator;
  let context: ValidationContext;

  const defaultOptions: Required<EpubCheckOptions> = {
    version: '3.0',
    profile: 'default',
    includeUsage: false,
    includeInfo: false,
    maxErrors: 0,
    locale: 'en',
  };

  const createContext = (options?: {
    includeInfo?: boolean;
    includeUsage?: boolean;
  }): ValidationContext => ({
    messages: [],
    files: new Map(),
    data: new Uint8Array(),
    options: { ...defaultOptions, ...options },
    version: '3.0',
    rootfiles: [{ path: 'OEBPS/content.opf', mediaType: 'application/oebps-package+xml' }],
  });

  beforeEach(() => {
    validator = new CSSValidator();
    context = createContext();
  });

  describe('CSS parsing', () => {
    it('should accept valid CSS', () => {
      const css = `
        body { margin: 0; padding: 0; }
        h1 { font-size: 2em; }
      `;
      validator.validate(context, css, 'OEBPS/styles.css');
      expect(context.messages.filter((m) => m.id === 'CSS-001')).toHaveLength(0);
    });

    it('should handle malformed CSS without crashing', () => {
      // css-tree is lenient with parse errors, so just verify no crash
      const css = 'body { @invalid-at-rule { nested } }';
      validator.validate(context, css, 'OEBPS/styles.css');
      expect(context.messages).toBeDefined();
    });
  });

  describe('discouraged properties', () => {
    // CSS-006 is 'usage' severity in Java EPUBCheck (informational)
    it('should report position: fixed (CSS-006)', () => {
      const css = '.fixed-header { position: fixed; top: 0; }';
      validator.validate(context, css, 'OEBPS/styles.css');
      const messages = context.messages.filter((m) => m.id === 'CSS-006');
      expect(messages).toHaveLength(1);
      expect(messages[0]?.severity).toBe('usage');
      expect(messages[0]?.message).toContain('position: fixed');
    });

    it('should not warn about position: absolute (Java has no such check)', () => {
      const css = '.popup { position: absolute; left: 0; }';
      validator.validate(context, css, 'OEBPS/styles.css');
      const warnings = context.messages.filter((m) => m.id === 'CSS-019');
      expect(warnings).toHaveLength(0);
    });

    it('should not warn about position: relative', () => {
      const css = '.container { position: relative; }';
      validator.validate(context, css, 'OEBPS/styles.css');
      const cssWarnings = context.messages.filter((m) => m.id === 'CSS-006' || m.id === 'CSS-019');
      expect(cssWarnings).toHaveLength(0);
    });

    it('should not warn about position: static', () => {
      const css = '.normal { position: static; }';
      validator.validate(context, css, 'OEBPS/styles.css');
      const cssWarnings = context.messages.filter((m) => m.id === 'CSS-006' || m.id === 'CSS-019');
      expect(cssWarnings).toHaveLength(0);
    });
  });

  describe('@import validation', () => {
    it('should extract @import url references', () => {
      const css = '@import url("other.css");';
      const result = validator.validate(context, css, 'OEBPS/styles.css');
      expect(result.references).toHaveLength(1);
      expect(result.references[0]).toMatchObject({
        url: 'other.css',
        type: 'import',
      });
    });

    it('should extract @import string references', () => {
      const css = '@import "typography.css";';
      const result = validator.validate(context, css, 'OEBPS/styles.css');
      expect(result.references).toHaveLength(1);
      expect(result.references[0]).toMatchObject({
        url: 'typography.css',
        type: 'import',
      });
    });

    it('should report empty @import URL (CSS-002)', () => {
      const css = '@import url("");';
      validator.validate(context, css, 'OEBPS/styles.css');
      const errors = context.messages.filter((m) => m.id === 'CSS-002');
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('Empty');
    });
  });

  describe('@font-face validation', () => {
    it('should extract font references from @font-face src', () => {
      const css = `
        @font-face {
          font-family: "MyFont";
          src: url("fonts/myfont.woff2");
        }
      `;
      const result = validator.validate(context, css, 'OEBPS/styles.css');
      expect(result.references).toHaveLength(1);
      expect(result.references[0]).toMatchObject({
        url: 'fonts/myfont.woff2',
        type: 'font',
      });
      expect(result.fontFamilies).toContain('MyFont');
    });

    it('should warn about empty @font-face (CSS-019)', () => {
      const css = '@font-face {}';
      validator.validate(context, css, 'OEBPS/styles.css');
      const warnings = context.messages.filter((m) => m.id === 'CSS-019');
      expect(warnings).toHaveLength(1);
    });

    it('should warn about @font-face missing src (CSS-019)', () => {
      const css = '@font-face { font-family: "NoSrc"; }';
      validator.validate(context, css, 'OEBPS/styles.css');
      const warnings = context.messages.filter((m) => m.id === 'CSS-019');
      expect(warnings).toHaveLength(1);
      expect(warnings[0]?.message).toContain('src');
    });

    it('should report empty font src URL (CSS-002)', () => {
      const css = '@font-face { font-family: "Test"; src: url(""); }';
      validator.validate(context, css, 'OEBPS/styles.css');
      const errors = context.messages.filter((m) => m.id === 'CSS-002');
      expect(errors).toHaveLength(1);
    });

    it('should report usage for @font-face when includeUsage is true (CSS-028)', () => {
      context = createContext({ includeUsage: true });
      const css = '@font-face { font-family: "Test"; src: url("font.woff"); }';
      validator.validate(context, css, 'OEBPS/styles.css');
      const usages = context.messages.filter((m) => m.id === 'CSS-028');
      expect(usages).toHaveLength(1);
      expect(usages[0]?.severity).toBe('usage');
    });

    it('should skip data: URLs in @font-face', () => {
      const css = '@font-face { font-family: "Test"; src: url("data:font/woff2;base64,AAA"); }';
      const result = validator.validate(context, css, 'OEBPS/styles.css');
      expect(result.references).toHaveLength(0);
    });

    it('should handle multiple src URLs in @font-face', () => {
      const css = `
        @font-face {
          font-family: "MyFont";
          src: url("fonts/myfont.woff2") format("woff2"),
               url("fonts/myfont.woff") format("woff");
        }
      `;
      const result = validator.validate(context, css, 'OEBPS/styles.css');
      expect(result.references).toHaveLength(2);
    });
  });

  describe('CSS result structure', () => {
    it('should return CSSValidationResult with references and fontFamilies', () => {
      const css = `
        @import "base.css";
        @font-face {
          font-family: "CustomFont";
          src: url("custom.woff2");
        }
        body { margin: 0; }
      `;
      const result = validator.validate(context, css, 'OEBPS/styles.css');
      expect(result).toHaveProperty('references');
      expect(result).toHaveProperty('fontFamilies');
      expect(result.references).toHaveLength(2);
      expect(result.fontFamilies).toContain('CustomFont');
    });
  });

  describe('media overlay class names', () => {
    it('should report error for reserved media overlay class names (CSS-029)', () => {
      const css = `
        .-epub-media-overlay-active { background: yellow; }
      `;
      validator.validate(context, css, 'OEBPS/styles.css');
      const errors = context.messages.filter((m) => m.id === 'CSS-029');
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('-epub-media-overlay-active');
    });

    it('should report error for media-overlay-active class (CSS-029)', () => {
      const css = `
        .media-overlay-active { color: red; }
      `;
      validator.validate(context, css, 'OEBPS/styles.css');
      const errors = context.messages.filter((m) => m.id === 'CSS-029');
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('media-overlay-active');
    });

    it('should report error for -epub-media-overlay-playing class (CSS-029)', () => {
      const css = `
        .-epub-media-overlay-playing { font-weight: bold; }
      `;
      validator.validate(context, css, 'OEBPS/styles.css');
      const errors = context.messages.filter((m) => m.id === 'CSS-029');
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('-epub-media-overlay-playing');
    });

    it('should report error for media-overlay-playing class (CSS-029)', () => {
      const css = `
        .media-overlay-playing { text-decoration: underline; }
      `;
      validator.validate(context, css, 'OEBPS/styles.css');
      const errors = context.messages.filter((m) => m.id === 'CSS-029');
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('media-overlay-playing');
    });

    it('should not report error for regular class names', () => {
      const css = `
        .highlight { background: yellow; }
        .active { color: blue; }
        .media-item { padding: 10px; }
      `;
      validator.validate(context, css, 'OEBPS/styles.css');
      const errors = context.messages.filter((m) => m.id === 'CSS-029');
      expect(errors).toHaveLength(0);
    });
  });
});
