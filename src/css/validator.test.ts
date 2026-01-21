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

  const createContext = (): ValidationContext => ({
    messages: [],
    files: new Map(),
    data: new Uint8Array(),
    options: defaultOptions,
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
    it('should warn about position: fixed (CSS-006)', () => {
      const css = '.fixed-header { position: fixed; top: 0; }';
      validator.validate(context, css, 'OEBPS/styles.css');
      const warnings = context.messages.filter((m) => m.id === 'CSS-006');
      expect(warnings).toHaveLength(1);
      expect(warnings[0]?.severity).toBe('warning');
      expect(warnings[0]?.message).toContain('position: fixed');
    });

    it('should warn about position: absolute (CSS-019)', () => {
      const css = '.popup { position: absolute; left: 0; }';
      validator.validate(context, css, 'OEBPS/styles.css');
      const warnings = context.messages.filter((m) => m.id === 'CSS-019');
      expect(warnings).toHaveLength(1);
      expect(warnings[0]?.severity).toBe('warning');
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
});
