import { beforeEach, describe, expect, it } from 'vitest';
import type { EpubCheckOptions, ValidationContext } from '../types.js';
import { NavValidator } from './validator.js';

describe('NavValidator', () => {
  let validator: NavValidator;
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
    validator = new NavValidator();
    context = createContext();
  });

  describe('nav element validation', () => {
    it('should accept valid nav element', () => {
      const nav = `<nav epub:type="toc"><ol><li><a href="chapter1.xhtml">Chapter 1</a></li></ol></nav>`;
      validator.validate(context, nav, 'nav.xhtml');
      expect(context.messages).toHaveLength(0);
    });

    it('should reject document without nav element', () => {
      const content = `<html><body><p>No nav</p></body></html>`;
      validator.validate(context, content, 'nav.xhtml');
      const nav001 = context.messages.filter((m) => m.id === 'NAV-001');
      expect(nav001).toHaveLength(2);
      expect(nav001[0]?.message).toContain('nav element');
      expect(nav001[1]?.message).toContain('epub:type="toc"');
    });

    it('should reject nav without epub:type="toc"', () => {
      const nav = `<nav><ol><li><a href="chapter1.xhtml">Chapter 1</a></li></ol></nav>`;
      validator.validate(context, nav, 'nav.xhtml');
      const nav001 = context.messages.filter((m) => m.id === 'NAV-001');
      expect(nav001).toHaveLength(1);
      expect(nav001[0]?.message).toContain('epub:type="toc"');
    });
  });

  describe('ol element validation', () => {
    it('should accept valid ol element', () => {
      const nav = `<nav epub:type="toc"><ol><li><a href="chapter1.xhtml">Chapter 1</a></li></ol></nav>`;
      validator.validate(context, nav, 'nav.xhtml');
      expect(context.messages).toHaveLength(0);
    });

    it('should reject nav toc without ol element', () => {
      const nav = `<nav epub:type="toc"><ul><li><a href="chapter1.xhtml">Chapter 1</a></li></ul></nav>`;
      validator.validate(context, nav, 'nav.xhtml');
      const nav002 = context.messages.filter((m) => m.id === 'NAV-002');
      expect(nav002).toHaveLength(1);
      expect(nav002[0]?.message).toContain('ol element');
    });

    it('should accept nav with multiple nav elements', () => {
      const nav = `<html>
        <nav epub:type="toc"><ol><li>TOC</li></ol></nav>
        <nav epub:type="landmarks"><ul><li>Landmarks</li></ul></nav>
      </html>`;
      validator.validate(context, nav, 'nav.xhtml');
      expect(context.messages).toHaveLength(0);
    });

    it('should reject nav without required epub:type in toc', () => {
      const nav = `<nav><ol><li><a href="chapter1.xhtml">Chapter 1</a></li></ol></nav>`;
      validator.validate(context, nav, 'nav.xhtml');
      const nav001 = context.messages.filter((m) => m.id === 'NAV-001');
      expect(nav001).toHaveLength(1);
    });
  });
});
