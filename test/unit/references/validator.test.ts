/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, it, beforeEach } from 'vitest';
import { ReferenceValidator } from '../../../src/references/validator.js';
import { ResourceRegistry } from '../../../src/references/registry.js';
import { ReferenceType } from '../../../src/references/types.js';
import type { ValidationContext } from '../../../src/types.js';

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

describe('ReferenceValidator', () => {
  let context: ValidationContext;
  let registry: ResourceRegistry;
  let validator: ReferenceValidator;

  beforeEach(() => {
    context = createValidationContext();
    registry = new ResourceRegistry();
    validator = new ReferenceValidator(registry, '3.0');

    // Register some default resources
    registry.registerResource({
      url: 'OEBPS/chapter1.xhtml',
      mimeType: 'application/xhtml+xml',
      inSpine: true,
      ids: new Set(['chapter1', 'section1']),
    });
    registry.registerResource({
      url: 'OEBPS/nav.xhtml',
      mimeType: 'application/xhtml+xml',
      inSpine: true,
      ids: new Set(['toc']),
    });
    registry.registerResource({
      url: 'OEBPS/styles/main.css',
      mimeType: 'text/css',
      inSpine: false,
      ids: new Set(),
    });
    registry.registerResource({
      url: 'OEBPS/images/cover.jpg',
      mimeType: 'image/jpeg',
      inSpine: false,
      ids: new Set(),
    });
  });

  describe('URL validation', () => {
    it('should add RSC-020 error for malformed URLs', () => {
      validator.addReference({
        url: 'http://example .com',
        targetResource: 'http://example .com',
        type: ReferenceType.HYPERLINK,
        location: { path: 'OEBPS/chapter1.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.some((m) => m.id === 'RSC-020')).toBe(true);
    });

    it('should add RSC-030 error for file URLs', () => {
      validator.addReference({
        url: 'file:///path/to/file.html',
        targetResource: 'file:///path/to/file.html',
        type: ReferenceType.HYPERLINK,
        location: { path: 'OEBPS/chapter1.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.some((m) => m.id === 'RSC-030')).toBe(true);
    });

    it('should add RSC-029 error for data URLs in hyperlinks (EPUB 3)', () => {
      // Data URLs are forbidden in hyperlinks (a href, area href)
      validator.addReference({
        url: 'data:text/plain,Hello',
        targetResource: 'data:text/plain,Hello',
        type: ReferenceType.HYPERLINK,
        location: { path: 'OEBPS/chapter1.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.some((m) => m.id === 'RSC-029')).toBe(true);
    });

    it('should allow data URLs for images (EPUB 3)', () => {
      // Data URLs are allowed for images with core media types
      validator.addReference({
        url: 'data:image/png;base64,iVBORw0KG...',
        targetResource: 'data:image/png;base64,iVBORw0KG...',
        type: ReferenceType.IMAGE,
        location: { path: 'OEBPS/chapter1.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.filter((m) => m.id === 'RSC-029')).toHaveLength(0);
    });

    it('should not warn for data URLs in EPUB 2', () => {
      const epub2Validator = new ReferenceValidator(registry, '2.0');
      epub2Validator.addReference({
        url: 'data:image/png;base64,iVBORw0KG...',
        targetResource: 'data:image/png;base64,iVBORw0KG...',
        type: ReferenceType.IMAGE,
        location: { path: 'OEBPS/chapter1.xhtml' },
      });

      epub2Validator.validate(context);
      expect(context.messages.filter((m) => m.id === 'RSC-029')).toHaveLength(0);
    });
  });

  describe('Local reference validation', () => {
    it('should add RSC-026 error for absolute paths', () => {
      validator.addReference({
        url: '/absolute/path.html',
        targetResource: '/absolute/path.html',
        type: ReferenceType.HYPERLINK,
        location: { path: 'OEBPS/chapter1.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.some((m) => m.id === 'RSC-026')).toBe(true);
    });

    it('should add RSC-026 error for parent directory references', () => {
      validator.addReference({
        url: '../outside/file.html',
        targetResource: 'outside/file.html',
        type: ReferenceType.HYPERLINK,
        location: { path: 'OEBPS/chapter1.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.some((m) => m.id === 'RSC-026')).toBe(true);
    });

    it('should add RSC-007 error for non-existent manifest resource', () => {
      validator.addReference({
        url: 'missing.html',
        targetResource: 'OEBPS/missing.html',
        type: ReferenceType.IMAGE,
        location: { path: 'OEBPS/chapter1.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.some((m) => m.id === 'RSC-007')).toBe(true);
    });

    it('should add RSC-007w warning for non-existent link target', () => {
      validator.addReference({
        url: 'missing.html',
        targetResource: 'OEBPS/missing.html',
        type: ReferenceType.LINK,
        location: { path: 'OEBPS/chapter1.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.some((m) => m.id === 'RSC-007w')).toBe(true);
      expect(context.messages[0]!.severity).toBe('warning');
    });

    it('should add RSC-011 error for hyperlink not pointing to spine item', () => {
      validator.addReference({
        url: '../styles/main.css',
        targetResource: 'OEBPS/styles/main.css',
        type: ReferenceType.HYPERLINK,
        location: { path: 'OEBPS/chapter1.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.some((m) => m.id === 'RSC-011')).toBe(true);
    });

    it('should validate stylesheet references without errors', () => {
      // Stylesheets are support resources and don't need to be in spine
      validator.addReference({
        url: '../styles/main.css',
        targetResource: 'OEBPS/styles/main.css',
        type: ReferenceType.STYLESHEET,
        location: { path: 'OEBPS/chapter1.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });

    it('should validate valid local references', () => {
      validator.addReference({
        url: 'chapter1.xhtml',
        targetResource: 'OEBPS/chapter1.xhtml',
        type: ReferenceType.HYPERLINK,
        location: { path: 'OEBPS/nav.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });
  });

  describe('Remote reference validation', () => {
    it('should add RSC-031 error for HTTP (non-HTTPS) URLs', () => {
      validator.addReference({
        url: 'http://example.com/resource.jpg',
        targetResource: 'http://example.com/resource.jpg',
        type: ReferenceType.IMAGE,
        location: { path: 'OEBPS/chapter1.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.some((m) => m.id === 'RSC-031')).toBe(true);
    });

    it('should add RSC-006 error for remote resource of disallowed type', () => {
      validator.addReference({
        url: 'https://example.com/script.js',
        targetResource: 'https://example.com/script.js',
        type: ReferenceType.STYLESHEET,
        location: { path: 'OEBPS/chapter1.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.some((m) => m.id === 'RSC-006')).toBe(true);
    });

    it('should allow remote audio resources when declared in manifest', () => {
      registry.registerResource({
        url: 'https://example.com/audio.mp3',
        mimeType: 'audio/mpeg',
        inSpine: false,
        ids: new Set(),
      });

      validator.addReference({
        url: 'https://example.com/audio.mp3',
        targetResource: 'https://example.com/audio.mp3',
        type: ReferenceType.AUDIO,
        location: { path: 'OEBPS/chapter1.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });

    it('should allow remote video resources when declared in manifest', () => {
      registry.registerResource({
        url: 'https://example.com/video.mp4',
        mimeType: 'video/mp4',
        inSpine: false,
        ids: new Set(),
      });

      validator.addReference({
        url: 'https://example.com/video.mp4',
        targetResource: 'https://example.com/video.mp4',
        type: ReferenceType.VIDEO,
        location: { path: 'OEBPS/chapter1.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });

    it('should allow remote font resources when declared in manifest', () => {
      registry.registerResource({
        url: 'https://example.com/font.woff',
        mimeType: 'font/woff',
        inSpine: false,
        ids: new Set(),
      });

      validator.addReference({
        url: 'https://example.com/font.woff',
        targetResource: 'https://example.com/font.woff',
        type: ReferenceType.FONT,
        location: { path: 'OEBPS/chapter1.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });
  });

  describe('Fragment identifier validation', () => {
    it('should add RSC-013 error for stylesheet fragment', () => {
      validator.addReference({
        url: '../styles/main.css#screen',
        targetResource: 'OEBPS/styles/main.css',
        fragment: 'screen',
        type: ReferenceType.STYLESHEET,
        location: { path: 'OEBPS/chapter1.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.some((m) => m.id === 'RSC-013')).toBe(true);
    });

    it('should add RSC-014 error for SVG view fragment from HTML', () => {
      registry.registerResource({
        url: 'OEBPS/images/diagram.svg',
        mimeType: 'image/svg+xml',
        inSpine: false,
        ids: new Set(['view1']),
      });

      validator.addReference({
        url: '../images/diagram.svg#svgView(0,0,100,100)',
        targetResource: 'OEBPS/images/diagram.svg',
        fragment: 'svgView(0,0,100,100)',
        type: ReferenceType.HYPERLINK,
        location: { path: 'OEBPS/chapter1.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.some((m) => m.id === 'RSC-014')).toBe(true);
    });

    it('should add RSC-012 error for non-existent fragment', () => {
      validator.addReference({
        url: 'chapter1.xhtml#nonexistent',
        targetResource: 'OEBPS/chapter1.xhtml',
        fragment: 'nonexistent',
        type: ReferenceType.HYPERLINK,
        location: { path: 'OEBPS/nav.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.some((m) => m.id === 'RSC-012')).toBe(true);
    });

    it('should validate valid fragment identifiers', () => {
      validator.addReference({
        url: 'chapter1.xhtml#chapter1',
        targetResource: 'OEBPS/chapter1.xhtml',
        fragment: 'chapter1',
        type: ReferenceType.HYPERLINK,
        location: { path: 'OEBPS/nav.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });
  });

  describe('Undeclared resources check', () => {
    it('should add OPF-097 warning for unreferenced manifest items', () => {
      // Add a resource that won't be referenced
      registry.registerResource({
        url: 'OEBPS/images/unreferenced.jpg',
        mimeType: 'image/jpeg',
        inSpine: false,
        ids: new Set(),
      });

      // Reference only the cover image
      validator.addReference({
        url: '../images/cover.jpg',
        targetResource: 'OEBPS/images/cover.jpg',
        type: ReferenceType.IMAGE,
        location: { path: 'OEBPS/nav.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.some((m) => m.id === 'OPF-097')).toBe(true);
    });

    it('should not warn for resources in spine', () => {
      // Add references to the non-spine resources to avoid false positives
      validator.addReference({
        url: '../images/cover.jpg',
        targetResource: 'OEBPS/images/cover.jpg',
        type: ReferenceType.IMAGE,
        location: { path: 'OEBPS/nav.xhtml' },
      });

      // Spine resources should not trigger OPF-097 even without explicit reference
      validator.validate(context);

      // Check that nav.xhtml (in spine) is not reported
      expect(
        context.messages.filter((m) => m.id === 'OPF-097' && m.message.includes('nav.xhtml')),
      ).toHaveLength(0);
    });

    it('should not warn for nav resources', () => {
      registry.registerResource({
        url: 'OEBPS/navigation.xhtml',
        mimeType: 'application/xhtml+xml',
        inSpine: false,
        isNav: true,
        ids: new Set(),
      });

      validator.validate(context);
      expect(
        context.messages.filter((m) => m.id === 'OPF-097' && m.message.includes('navigation')),
      ).toHaveLength(0);
    });

    it('should not warn for NCX resources', () => {
      registry.registerResource({
        url: 'OEBPS/toc.ncx',
        mimeType: 'application/x-dtbncx+xml',
        inSpine: false,
        isNcx: true,
        ids: new Set(),
      });

      validator.validate(context);
      expect(
        context.messages.filter((m) => m.id === 'OPF-097' && m.message.includes('ncx')),
      ).toHaveLength(0);
    });

    it('should not warn for cover-image resources', () => {
      registry.registerResource({
        url: 'OEBPS/images/cover-image.jpg',
        mimeType: 'image/jpeg',
        inSpine: false,
        isCoverImage: true,
        ids: new Set(),
      });

      validator.validate(context);
      expect(
        context.messages.filter((m) => m.id === 'OPF-097' && m.message.includes('cover-image')),
      ).toHaveLength(0);
    });
  });

  describe('Reference type handling', () => {
    it('should handle different reference types correctly', () => {
      const types = [
        ReferenceType.IMAGE,
        ReferenceType.FONT,
        ReferenceType.AUDIO,
        ReferenceType.VIDEO,
        ReferenceType.TRACK,
        ReferenceType.MEDIA_OVERLAY,
      ];

      for (const type of types) {
        const typeValidator = new ReferenceValidator(registry, '3.0');
        typeValidator.addReference({
          url: '../images/cover.jpg',
          targetResource: 'OEBPS/images/cover.jpg',
          type,
          location: { path: 'OEBPS/chapter1.xhtml' },
        });

        typeValidator.validate(context);
      }

      // These should all validate without RSC-006 errors since they're local
      expect(context.messages.filter((m) => m.id === 'RSC-006')).toHaveLength(0);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle multiple references in one validation', () => {
      validator.addReference({
        url: 'chapter1.xhtml',
        targetResource: 'OEBPS/chapter1.xhtml',
        type: ReferenceType.HYPERLINK,
        location: { path: 'OEBPS/nav.xhtml' },
      });
      // Don't use IMAGE type for non-spine resources - use LINK which only generates warning
      validator.addReference({
        url: 'images/cover.jpg',
        targetResource: 'OEBPS/images/cover.jpg',
        type: ReferenceType.LINK,
        location: { path: 'OEBPS/chapter1.xhtml' },
      });
      validator.addReference({
        url: 'chapter1.xhtml#section1',
        targetResource: 'OEBPS/chapter1.xhtml',
        fragment: 'section1',
        type: ReferenceType.HYPERLINK,
        location: { path: 'OEBPS/nav.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });

    it('should handle references to same resource with different fragments', () => {
      validator.addReference({
        url: 'chapter1.xhtml#chapter1',
        targetResource: 'OEBPS/chapter1.xhtml',
        fragment: 'chapter1',
        type: ReferenceType.HYPERLINK,
        location: { path: 'OEBPS/nav.xhtml' },
      });
      validator.addReference({
        url: 'chapter1.xhtml#section1',
        targetResource: 'OEBPS/chapter1.xhtml',
        fragment: 'section1',
        type: ReferenceType.HYPERLINK,
        location: { path: 'OEBPS/nav.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });

    it('should handle EPUB 2 vs EPUB 3 differences', () => {
      // Data URL in hyperlink should error in EPUB 3
      validator.addReference({
        url: 'data:text/plain,hello',
        targetResource: 'data:text/plain,hello',
        type: ReferenceType.HYPERLINK,
        location: { path: 'OEBPS/chapter1.xhtml' },
      });

      validator.validate(context);
      expect(context.messages.some((m) => m.id === 'RSC-029')).toBe(true);

      // Clear and try EPUB 2 - data URLs not checked in EPUB 2
      context.messages = [];
      const epub2Validator = new ReferenceValidator(registry, '2.0');
      epub2Validator.addReference({
        url: 'data:text/plain,hello',
        targetResource: 'data:text/plain,hello',
        type: ReferenceType.HYPERLINK,
        location: { path: 'OEBPS/chapter1.xhtml' },
      });

      epub2Validator.validate(context);
      expect(context.messages.filter((m) => m.id === 'RSC-029')).toHaveLength(0);
    });
  });
});
