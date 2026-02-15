import { beforeEach, describe, expect, it } from 'vitest';
import type { EpubCheckOptions, ValidationContext } from '../types.js';
import { ResourceRegistry } from './registry.js';
import { type Reference, ReferenceType, type Resource } from './types.js';
import { ReferenceValidator } from './validator.js';

describe('ReferenceValidator', () => {
  let validator: ReferenceValidator;
  let registry: ResourceRegistry;
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

  const createReference = (url: string, type: ReferenceType, path: string): Reference => {
    const hashIndex = url.indexOf('#');
    const ref: Reference = {
      url,
      targetResource: hashIndex !== -1 ? url.substring(0, hashIndex) : url,
      type,
      location: { path, line: 1, column: 1 },
    };

    if (hashIndex !== -1 && hashIndex < url.length - 1) {
      ref.fragment = url.substring(hashIndex + 1);
    }

    return ref;
  };

  const createResource = (url: string, inSpine: boolean, ids: string[] = []): Resource => ({
    url,
    mimeType: 'application/xhtml+xml',
    inSpine,
    ids: new Set(ids),
  });

  beforeEach(() => {
    registry = new ResourceRegistry();
    validator = new ReferenceValidator(registry, '3.0');
    context = createContext();
  });

  describe('local reference validation', () => {
    it('should accept valid reference to existing resource', () => {
      registry.registerResource(createResource('chapter1.xhtml', true));
      validator.addReference(
        createReference('chapter1.xhtml', ReferenceType.IMAGE, 'OEBPS/nav.xhtml'),
      );
      validator.validate(context);
      expect(context.messages).toHaveLength(0);
    });

    it('should report missing resource (RSC-007)', () => {
      validator.addReference(
        createReference('missing.xhtml', ReferenceType.HYPERLINK, 'OEBPS/nav.xhtml'),
      );
      validator.validate(context);
      const rscErrors = context.messages.filter((m) => m.id === 'RSC-007');
      expect(rscErrors).toHaveLength(1);
      expect(rscErrors[0]?.message).toContain('not found in EPUB');
    });

    it('should report missing LINK reference as warning (RSC-007w)', () => {
      validator.addReference(
        createReference('missing.css', ReferenceType.LINK, 'OEBPS/chapter1.xhtml'),
      );
      validator.validate(context);
      const rscWarnings = context.messages.filter((m) => m.id === 'RSC-007w');
      expect(rscWarnings).toHaveLength(1);
      expect(rscWarnings[0]?.severity).toBe('warning');
    });

    it('should report absolute paths', () => {
      validator.addReference(
        createReference('/absolute/path.xhtml', ReferenceType.HYPERLINK, 'OEBPS/nav.xhtml'),
      );
      validator.validate(context);
      const rscErrors = context.messages.filter((m) => m.id === 'RSC-026');
      expect(rscErrors).toHaveLength(1);
    });

    it('should report parent directory references', () => {
      validator.addReference(
        createReference('../parent.xhtml', ReferenceType.HYPERLINK, 'OEBPS/nav.xhtml'),
      );
      validator.validate(context);
      const rscErrors = context.messages.filter((m) => m.id === 'RSC-026');
      expect(rscErrors).toHaveLength(1);
    });
  });

  describe('fragment validation', () => {
    it('should accept valid fragment', () => {
      const resource = createResource('chapter1.xhtml', true, ['section1']);
      registry.registerResource(resource);
      validator.addReference(
        createReference('chapter1.xhtml#section1', ReferenceType.HYPERLINK, 'OEBPS/nav.xhtml'),
      );
      validator.validate(context);
      const rscErrors = context.messages.filter((m) => m.id === 'RSC-012');
      expect(rscErrors).toHaveLength(0);
    });

    it('should report missing fragment', () => {
      registry.registerResource(createResource('chapter1.xhtml', true, []));
      validator.addReference(
        createReference('chapter1.xhtml#missing', ReferenceType.HYPERLINK, 'OEBPS/nav.xhtml'),
      );
      validator.validate(context);
      const rscErrors = context.messages.filter((m) => m.id === 'RSC-012');
      expect(rscErrors).toHaveLength(1);
    });

    it('should reject fragments in stylesheet references (RSC-013)', () => {
      registry.registerResource(createResource('styles.css', false, ['section1']));
      validator.addReference(
        createReference('styles.css#section1', ReferenceType.STYLESHEET, 'OEBPS/chapter1.xhtml'),
      );
      validator.validate(context);
      const rscErrors = context.messages.filter((m) => m.id === 'RSC-013');
      expect(rscErrors).toHaveLength(1);
    });
  });

  describe('URL validation', () => {
    it('should reject file URLs', () => {
      validator.addReference(
        createReference('file:///path/to/file', ReferenceType.HYPERLINK, 'OEBPS/nav.xhtml'),
      );
      validator.validate(context);
      const rscErrors = context.messages.filter((m) => m.id === 'RSC-030');
      expect(rscErrors).toHaveLength(1);
    });

    it('should reject data URLs in EPUB 3', () => {
      validator = new ReferenceValidator(registry, '3.0');
      validator.addReference(
        createReference('data:text/plain,Hello', ReferenceType.HYPERLINK, 'OEBPS/nav.xhtml'),
      );
      validator.validate(context);
      const rscErrors = context.messages.filter((m) => m.id === 'RSC-029');
      expect(rscErrors).toHaveLength(1);
    });

    it('should require HTTPS for remote resources', () => {
      validator.addReference(
        createReference(
          'http://example.com/audio.mp3',
          ReferenceType.AUDIO,
          'OEBPS/chapter1.xhtml',
        ),
      );
      validator.validate(context);
      const rscErrors = context.messages.filter((m) => m.id === 'RSC-031');
      expect(rscErrors).toHaveLength(1);
    });

    it('should accept HTTPS for remote resources', () => {
      validator.addReference(
        createReference(
          'https://example.com/audio.mp3',
          ReferenceType.AUDIO,
          'OEBPS/chapter1.xhtml',
        ),
      );
      validator.validate(context);
      expect(context.messages.filter((m) => m.id === 'RSC-031')).toHaveLength(0);
    });
  });

  describe('reference type restrictions', () => {
    it('should reject hyperlinks to non-spine resources', () => {
      registry.registerResource(createResource('style.css', false));
      validator.addReference(
        createReference('style.css', ReferenceType.HYPERLINK, 'OEBPS/nav.xhtml'),
      );
      validator.validate(context);
      const rscErrors = context.messages.filter((m) => m.id === 'RSC-011');
      expect(rscErrors).toHaveLength(1);
    });

    it('should reject remote images', () => {
      validator.addReference(
        createReference('https://example.com/image.png', ReferenceType.IMAGE, 'OEBPS/nav.xhtml'),
      );
      validator.validate(context);
      const rscErrors = context.messages.filter((m) => m.id === 'RSC-006');
      expect(rscErrors).toHaveLength(1);
    });

    it('should allow remote audio', () => {
      validator.addReference(
        createReference('https://example.com/audio.mp3', ReferenceType.AUDIO, 'OEBPS/nav.xhtml'),
      );
      validator.validate(context);
      expect(context.messages.filter((m) => m.id === 'RSC-006')).toHaveLength(0);
    });

    it('should allow remote video', () => {
      validator.addReference(
        createReference('https://example.com/video.mp4', ReferenceType.VIDEO, 'OEBPS/nav.xhtml'),
      );
      validator.validate(context);
      expect(context.messages.filter((m) => m.id === 'RSC-006')).toHaveLength(0);
    });

    it('should allow remote fonts', () => {
      validator.addReference(
        createReference('https://example.com/font.woff2', ReferenceType.FONT, 'OEBPS/nav.xhtml'),
      );
      validator.validate(context);
      expect(context.messages.filter((m) => m.id === 'RSC-006')).toHaveLength(0);
    });
  });

  describe('RSC-033 query component', () => {
    it('should report RSC-033 for relative URLs with query component', () => {
      registry.registerResource(createResource('chapter1.xhtml', true));
      validator.addReference(
        createReference('chapter1.xhtml?foo=bar', ReferenceType.HYPERLINK, 'OEBPS/nav.xhtml'),
      );
      validator.validate(context);
      const errors = context.messages.filter((m) => m.id === 'RSC-033');
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('query component');
    });

    it('should not report RSC-033 for remote URLs with query component', () => {
      validator.addReference(
        createReference('https://example.com/page?q=1', ReferenceType.HYPERLINK, 'OEBPS/nav.xhtml'),
      );
      validator.validate(context);
      const errors = context.messages.filter((m) => m.id === 'RSC-033');
      expect(errors).toHaveLength(0);
    });
  });

  describe('CITE reference type', () => {
    it('should not report RSC-011 for CITE references to non-spine items', () => {
      registry.registerResource(createResource('appendix.xhtml', false));
      validator.addReference(
        createReference('appendix.xhtml', ReferenceType.CITE, 'OEBPS/chapter1.xhtml'),
      );
      validator.validate(context);
      const errors = context.messages.filter((m) => m.id === 'RSC-011');
      expect(errors).toHaveLength(0);
    });

    it('should not report RSC-010 for CITE references to non-content documents', () => {
      registry.registerResource({
        url: 'data.json',
        mimeType: 'application/json',
        inSpine: false,
        ids: new Set(),
      });
      validator.addReference(
        createReference('data.json', ReferenceType.CITE, 'OEBPS/chapter1.xhtml'),
      );
      validator.validate(context);
      const errors = context.messages.filter((m) => m.id === 'RSC-010');
      expect(errors).toHaveLength(0);
    });
  });

  describe('NAV_TOC_LINK and NAV_PAGELIST_LINK types', () => {
    it('should report RSC-011 for NAV_TOC_LINK to non-spine item', () => {
      registry.registerResource(createResource('style.css', false));
      validator.addReference(
        createReference('style.css', ReferenceType.NAV_TOC_LINK, 'OEBPS/nav.xhtml'),
      );
      validator.validate(context);
      const errors = context.messages.filter((m) => m.id === 'RSC-011');
      expect(errors).toHaveLength(1);
    });

    it('should report RSC-011 for NAV_PAGELIST_LINK to non-spine item', () => {
      registry.registerResource(createResource('style.css', false));
      validator.addReference(
        createReference('style.css', ReferenceType.NAV_PAGELIST_LINK, 'OEBPS/nav.xhtml'),
      );
      validator.validate(context);
      const errors = context.messages.filter((m) => m.id === 'RSC-011');
      expect(errors).toHaveLength(1);
    });

    it('should not report RSC-011 for NAV_TOC_LINK to spine item', () => {
      registry.registerResource(createResource('chapter1.xhtml', true));
      validator.addReference(
        createReference('chapter1.xhtml', ReferenceType.NAV_TOC_LINK, 'OEBPS/nav.xhtml'),
      );
      validator.validate(context);
      const errors = context.messages.filter((m) => m.id === 'RSC-011');
      expect(errors).toHaveLength(0);
    });
  });

  describe('RSC-011 EPUB 2 guard', () => {
    it('should not report RSC-011 for hyperlinks in EPUB 2', () => {
      const epub2Validator = new ReferenceValidator(registry, '2.0');
      registry.registerResource(createResource('style.css', false));
      epub2Validator.addReference(
        createReference('style.css', ReferenceType.HYPERLINK, 'OEBPS/nav.xhtml'),
      );
      epub2Validator.validate(context);
      const errors = context.messages.filter((m) => m.id === 'RSC-011');
      expect(errors).toHaveLength(0);
    });
  });

  describe('RSC-031 only for publication resource references', () => {
    it('should not report RSC-031 for HTTP hyperlinks', () => {
      validator.addReference(
        createReference('http://example.com/page', ReferenceType.HYPERLINK, 'OEBPS/chapter1.xhtml'),
      );
      validator.validate(context);
      const errors = context.messages.filter((m) => m.id === 'RSC-031');
      expect(errors).toHaveLength(0);
    });

    it('should report RSC-031 for HTTP image references', () => {
      validator.addReference(
        createReference(
          'http://example.com/image.png',
          ReferenceType.IMAGE,
          'OEBPS/chapter1.xhtml',
        ),
      );
      validator.validate(context);
      const errors = context.messages.filter((m) => m.id === 'RSC-031');
      expect(errors).toHaveLength(1);
    });
  });

  describe('data URL default MIME type', () => {
    it('should default to text/plain for data URLs without MIME type', () => {
      validator.addReference(
        createReference('data:,Hello', ReferenceType.IMAGE, 'OEBPS/chapter1.xhtml'),
      );
      validator.validate(context);
      // text/plain is not a core media type for images, so RSC-032 should fire
      const errors = context.messages.filter((m) => m.id === 'RSC-032');
      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('text/plain');
    });
  });

  describe('isRemoteResourceType WOFF2', () => {
    it('should allow remote WOFF2 font resources by MIME type', () => {
      registry.registerResource({
        url: 'https://example.com/font.woff2',
        mimeType: 'application/font-woff2',
        inSpine: false,
        ids: new Set(),
      });
      validator.addReference({
        url: 'https://example.com/font.woff2',
        targetResource: 'https://example.com/font.woff2',
        type: ReferenceType.STYLESHEET,
        location: { path: 'OEBPS/chapter1.xhtml', line: 1, column: 1 },
      });
      validator.validate(context);
      const errors = context.messages.filter((m) => m.id === 'RSC-006');
      expect(errors).toHaveLength(0);
    });
  });

  describe('container escape detection (checkUrlLeaking)', () => {
    it('should report RSC-026 for URLs that leak outside container', () => {
      // A URL like "//evil.com/hack" resolves to a different host
      validator.addReference(
        createReference('//evil.com/hack', ReferenceType.HYPERLINK, 'OEBPS/chapter1.xhtml'),
      );
      validator.validate(context);
      const errors = context.messages.filter((m) => m.id === 'RSC-026');
      expect(errors).toHaveLength(1);
    });

    it('should not double-report RSC-026 for absolute paths', () => {
      validator.addReference(
        createReference('/absolute/path', ReferenceType.HYPERLINK, 'OEBPS/chapter1.xhtml'),
      );
      validator.validate(context);
      const errors = context.messages.filter((m) => m.id === 'RSC-026');
      expect(errors).toHaveLength(1);
    });
  });

  describe('non-linear reachability with nav types', () => {
    it('should count NAV_TOC_LINK as valid reachability for non-linear items', () => {
      const chapterResource = createResource('OEBPS/chapter1.xhtml', true);
      registry.registerResource(chapterResource);
      validator.addReference({
        url: 'chapter1.xhtml',
        targetResource: 'OEBPS/chapter1.xhtml',
        type: ReferenceType.NAV_TOC_LINK,
        location: { path: 'OEBPS/nav.xhtml', line: 1, column: 1 },
      });
      context.packageDocument = {
        version: '3.0',
        uniqueIdentifier: 'uid',
        manifest: [{ id: 'ch1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' }],
        spine: [{ idref: 'ch1', linear: false }],
        dcElements: [],
        metaElements: [],
        linkElements: [],
        guide: [],
        collections: [],
      };
      context.opfPath = 'OEBPS/content.opf';
      validator.validate(context);
      const errors = context.messages.filter((m) => m.id === 'OPF-096' || m.id === 'OPF-096b');
      expect(errors).toHaveLength(0);
    });
  });

  describe('unused resources', () => {
    it('should report unreferenced resources', () => {
      // Register a resource that is NOT in spine (inSpine: false)
      // Spine items are implicitly referenced and should NOT trigger OPF-097
      registry.registerResource(createResource('unused.xhtml', false));
      validator.validate(context);
      const opfErrors = context.messages.filter((m) => m.id === 'OPF-097');
      expect(opfErrors).toHaveLength(1);
      expect(opfErrors[0]?.severity).toBe('usage');
    });

    it('should not report referenced resources', () => {
      registry.registerResource(createResource('used.xhtml', true));
      validator.addReference(createReference('used.xhtml', ReferenceType.IMAGE, 'OEBPS/nav.xhtml'));
      validator.validate(context);
      const opfErrors = context.messages.filter((m) => m.id === 'OPF-097');
      expect(opfErrors).toHaveLength(0);
    });
  });
});
