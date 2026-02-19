/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { beforeEach, describe, expect, it } from 'vitest';
import type { PackageDocument } from '../../../src/opf/types.js';
import { OPFValidator } from '../../../src/opf/validator.js';
import type { ValidationContext } from '../../../src/types.js';

// Helper interface to access private members in tests
interface OPFValidatorTest {
  packageDoc: PackageDocument;
  validatePackageAttributes(context: ValidationContext, path: string): void;
  validateMetadata(context: ValidationContext, path: string): void;
  validateManifest(context: ValidationContext, path: string): void;
  validateSpine(context: ValidationContext, path: string): void;
  validateFallbackChains(context: ValidationContext, path: string): void;
  validateGuide(context: ValidationContext, path: string): void;
  validateCollections(context: ValidationContext, path: string): void;
  buildManifestMaps(): void;
}

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
    manifest: [
      { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: ['nav'] },
      { id: 'chapter1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
    ],
    spine: [{ idref: 'chapter1', linear: true }],
    guide: [],
    collections: [],
    ...overrides,
  };
}

function addFileToContext(context: ValidationContext, path: string, content: string): void {
  context.files.set(path, new TextEncoder().encode(content));
}

describe('OPFValidator', () => {
  let validator: OPFValidator;
  let validatorTest: OPFValidatorTest;

  beforeEach(() => {
    validator = new OPFValidator();
    validatorTest = validator as unknown as OPFValidatorTest;
  });

  describe('package attributes validation', () => {
    it('should add OPF-001 error for invalid version', () => {
      const context = createValidationContext();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const packageDoc = createMinimalPackage({ version: '1.0' as any });
      addFileToContext(context, 'OEBPS/content.opf', '');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validatePackageAttributes(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-001')).toBe(true);
      expect(context.messages[0]!.severity).toBe('error');
    });

    it('should add OPF-048 error when unique-identifier is missing', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({ uniqueIdentifier: '' });
      addFileToContext(context, 'OEBPS/content.opf', '');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validatePackageAttributes(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-048')).toBe(true);
    });

    it('should add OPF-030 error when unique-identifier references non-existent dc:identifier', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        uniqueIdentifier: 'nonexistent',
      });
      addFileToContext(context, 'OEBPS/content.opf', '');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validatePackageAttributes(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-030')).toBe(true);
    });

    it('should validate correct package attributes without errors', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage();
      addFileToContext(context, 'OEBPS/content.opf', '');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validatePackageAttributes(context, 'OEBPS/content.opf');

      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });
  });

  describe('metadata validation', () => {
    it('should add OPF-072 error when metadata section is empty', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        dcElements: [],
        metaElements: [],
      });
      addFileToContext(context, 'OEBPS/content.opf', '');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateMetadata(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-072')).toBe(true);
    });

    it('should add OPF-015 error when dc:identifier is missing', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        dcElements: [
          { name: 'title', value: 'Test Book' },
          { name: 'language', value: 'en' },
        ],
      });
      addFileToContext(context, 'OEBPS/content.opf', '');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateMetadata(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-015')).toBe(true);
    });

    it('should add OPF-016 error when dc:title is missing', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        dcElements: [
          { name: 'identifier', value: 'urn:uuid:12345678', id: 'bookid' },
          { name: 'language', value: 'en' },
        ],
      });
      addFileToContext(context, 'OEBPS/content.opf', '');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateMetadata(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-016')).toBe(true);
    });

    it('should add OPF-017 error when dc:language is missing', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        dcElements: [
          { name: 'identifier', value: 'urn:uuid:12345678', id: 'bookid' },
          { name: 'title', value: 'Test Book' },
        ],
      });
      addFileToContext(context, 'OEBPS/content.opf', '');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateMetadata(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-017')).toBe(true);
    });

    it('should add OPF-092 error for invalid language tag', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        dcElements: [
          { name: 'identifier', value: 'urn:uuid:12345678', id: 'bookid' },
          { name: 'title', value: 'Test Book' },
          { name: 'language', value: 'invalid@tag!' },
        ],
      });
      addFileToContext(context, 'OEBPS/content.opf', '');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateMetadata(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-092')).toBe(true);
    });

    it('should add OPF-053 error for invalid date format', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        dcElements: [
          { name: 'identifier', value: 'urn:uuid:12345678', id: 'bookid' },
          { name: 'title', value: 'Test Book' },
          { name: 'language', value: 'en' },
          { name: 'date', value: 'invalid-date' },
        ],
      });
      addFileToContext(context, 'OEBPS/content.opf', '');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateMetadata(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-053')).toBe(true);
    });

    it('should accept valid W3C date formats', () => {
      const validDates = [
        '2023',
        '2023-01',
        '2023-01-15',
        '2023-01-15T10:30:00Z',
        '2023-01-15T10:30:00+02:00',
        '2023-01-15T10:30:00.5Z',
      ];

      for (const date of validDates) {
        const context = createValidationContext();
        const packageDoc = createMinimalPackage({
          dcElements: [
            { name: 'identifier', value: 'urn:uuid:12345678', id: 'bookid' },
            { name: 'title', value: 'Test Book' },
            { name: 'language', value: 'en' },
            { name: 'date', value: date },
          ],
        });
        addFileToContext(context, 'OEBPS/content.opf', '');

        validatorTest.packageDoc = packageDoc;
        validatorTest.validateMetadata(context, 'OEBPS/content.opf');

        expect(
          context.messages.filter((m) => m.id === 'OPF-053'),
          `Date "${date}" should be valid`,
        ).toHaveLength(0);
      }
    });

    it('should add OPF-052 error for unknown role code', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        dcElements: [
          { name: 'identifier', value: 'urn:uuid:12345678', id: 'bookid' },
          { name: 'title', value: 'Test Book' },
          { name: 'language', value: 'en' },
          {
            name: 'creator',
            value: 'John Doe',
            attributes: { 'opf:role': 'invalid_code' },
          },
        ],
      });
      addFileToContext(context, 'OEBPS/content.opf', '');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateMetadata(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-052')).toBe(true);
    });

    it('should accept valid MARC relator codes', () => {
      const validCodes = ['aut', 'edt', 'trl', 'ill', 'pbl'];

      for (const code of validCodes) {
        const context = createValidationContext();
        const packageDoc = createMinimalPackage({
          dcElements: [
            { name: 'identifier', value: 'urn:uuid:12345678', id: 'bookid' },
            { name: 'title', value: 'Test Book' },
            { name: 'language', value: 'en' },
            {
              name: 'creator',
              value: 'John Doe',
              attributes: { 'opf:role': code },
            },
          ],
        });
        addFileToContext(context, 'OEBPS/content.opf', '');

        validatorTest.packageDoc = packageDoc;
        validatorTest.validateMetadata(context, 'OEBPS/content.opf');

        expect(
          context.messages.filter((m) => m.id === 'OPF-052'),
          `MARC code "${code}" should be valid`,
        ).toHaveLength(0);
      }
    });

    it('should accept oth. prefixed role codes', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        dcElements: [
          { name: 'identifier', value: 'urn:uuid:12345678', id: 'bookid' },
          { name: 'title', value: 'Test Book' },
          { name: 'language', value: 'en' },
          {
            name: 'creator',
            value: 'John Doe',
            attributes: { 'opf:role': 'oth.custom' },
          },
        ],
      });
      addFileToContext(context, 'OEBPS/content.opf', '');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateMetadata(context, 'OEBPS/content.opf');

      expect(context.messages.filter((m) => m.id === 'OPF-052')).toHaveLength(0);
    });

    it('should add OPF-054 error when dcterms:modified is missing in EPUB 3', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        metaElements: [],
      });
      addFileToContext(context, 'OEBPS/content.opf', '');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateMetadata(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-054')).toBe(true);
    });

    it('should add OPF-054 error when dcterms:modified has invalid format', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        metaElements: [{ property: 'dcterms:modified', value: 'invalid-date' }],
      });
      addFileToContext(context, 'OEBPS/content.opf', '');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateMetadata(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-054')).toBe(true);
    });
  });

  describe('manifest validation', () => {
    it('should add OPF-074 error for duplicate manifest item IDs', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        manifest: [
          { id: 'chapter1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
          { id: 'chapter1', href: 'chapter2.xhtml', mediaType: 'application/xhtml+xml' },
        ],
      });
      addFileToContext(context, 'OEBPS/content.opf', '');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateManifest(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-074')).toBe(true);
    });

    it('should add OPF-074 error for duplicate manifest item hrefs', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        manifest: [
          { id: 'chapter1', href: 'chapter.xhtml', mediaType: 'application/xhtml+xml' },
          { id: 'chapter2', href: 'chapter.xhtml', mediaType: 'application/xhtml+xml' },
        ],
      });
      addFileToContext(context, 'OEBPS/content.opf', '');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateManifest(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-074')).toBe(true);
    });

    it('should add RSC-001 error for missing manifest files', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        manifest: [
          { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: ['nav'] },
          { id: 'chapter1', href: 'missing.xhtml', mediaType: 'application/xhtml+xml' },
        ],
      });
      addFileToContext(context, 'OEBPS/nav.xhtml', '<html></html>');
      // Don't add missing.xhtml

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateManifest(context, 'OEBPS/content.opf');

      // RSC-001: Referenced resource could not be found (per Java EPUBCheck)
      expect(context.messages.some((m) => m.id === 'RSC-001')).toBe(true);
    });

    it('should add OPF-014 error for invalid media type format', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        manifest: [
          { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: ['nav'] },
          { id: 'chapter1', href: 'chapter1.xhtml', mediaType: 'invalid' },
        ],
      });
      addFileToContext(context, 'OEBPS/nav.xhtml', '<html></html>');
      addFileToContext(context, 'OEBPS/chapter1.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateManifest(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-014')).toBe(true);
    });

    it('should add OPF-035 warning for deprecated OEB 1.0 media types', () => {
      const deprecatedTypes = [
        'text/x-oeb1-document',
        'text/x-oeb1-css',
        'application/x-oeb1-package',
        'text/x-oeb1-html',
      ];

      for (const mediaType of deprecatedTypes) {
        const context = createValidationContext();
        const packageDoc = createMinimalPackage({
          manifest: [
            {
              id: 'nav',
              href: 'nav.xhtml',
              mediaType: 'application/xhtml+xml',
              properties: ['nav'],
            },
            { id: 'chapter1', href: 'chapter1.xhtml', mediaType },
          ],
        });
        addFileToContext(context, 'OEBPS/nav.xhtml', '<html></html>');
        addFileToContext(context, 'OEBPS/chapter1.xhtml', '<html></html>');

        validatorTest.packageDoc = packageDoc;
        validatorTest.validateManifest(context, 'OEBPS/content.opf');

        expect(
          context.messages.some((m) => m.severity === 'warning' && m.id.startsWith('OPF-0')),
          `Should warn about deprecated type "${mediaType}"`,
        ).toBe(true);
      }
    });

    it('should add OPF-027 error for unknown item properties', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        manifest: [
          {
            id: 'nav',
            href: 'nav.xhtml',
            mediaType: 'application/xhtml+xml',
            properties: ['nav', 'unknown-property'],
          },
          { id: 'chapter1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
        ],
      });
      addFileToContext(context, 'OEBPS/nav.xhtml', '<html></html>');
      addFileToContext(context, 'OEBPS/chapter1.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateManifest(context, 'OEBPS/content.opf');

      expect(
        context.messages.some((m) => m.id === 'OPF-027' && m.message.includes('unknown-property')),
      ).toBe(true);
    });

    it('should add OPF-012 error when nav property is on non-XHTML item', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        manifest: [
          {
            id: 'nav',
            href: 'nav.svg',
            mediaType: 'image/svg+xml',
            properties: ['nav'],
          },
          { id: 'chapter1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
        ],
      });
      addFileToContext(context, 'OEBPS/nav.svg', '<svg></svg>');
      addFileToContext(context, 'OEBPS/chapter1.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateManifest(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-012' && m.message.includes('nav'))).toBe(
        true,
      );
    });

    it('should add OPF-091 error for href with fragment in EPUB 3', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        manifest: [
          { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: ['nav'] },
          { id: 'chapter1', href: 'chapter1.xhtml#chapter', mediaType: 'application/xhtml+xml' },
        ],
      });
      addFileToContext(context, 'OEBPS/nav.xhtml', '<html></html>');
      addFileToContext(context, 'OEBPS/chapter1.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateManifest(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-091')).toBe(true);
    });

    it('should add RSC-006 error for remote spine item without remote-resources property', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        manifest: [
          { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: ['nav'] },
          {
            id: 'chapter1',
            href: 'https://example.com/chapter1.xhtml',
            mediaType: 'application/xhtml+xml',
          },
        ],
        spine: [{ idref: 'chapter1', linear: true }],
      });
      addFileToContext(context, 'OEBPS/nav.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateManifest(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'RSC-006')).toBe(true);
    });

    it('should add RSC-005 error when nav property is missing in EPUB 3', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        manifest: [{ id: 'chapter1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' }],
      });
      addFileToContext(context, 'OEBPS/chapter1.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateManifest(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'RSC-005')).toBe(true);
    });
  });

  describe('spine validation', () => {
    it('should add OPF-033 error when spine is empty', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        spine: [],
      });
      addFileToContext(context, 'OEBPS/nav.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateSpine(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-033')).toBe(true);
    });

    it('should add OPF-033 error when spine has no linear items', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        spine: [{ idref: 'chapter1', linear: false }],
      });
      addFileToContext(context, 'OEBPS/nav.xhtml', '<html></html>');
      addFileToContext(context, 'OEBPS/chapter1.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateSpine(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-033')).toBe(true);
    });

    it('should add OPF-049 error when spine itemref references non-existent manifest item', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        spine: [{ idref: 'nonexistent', linear: true }],
      });
      addFileToContext(context, 'OEBPS/nav.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateSpine(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-049')).toBe(true);
    });

    it('should add OPF-043 error for non-standard media type without fallback', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        manifest: [
          { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: ['nav'] },
          { id: 'chapter1', href: 'chapter1.pdf', mediaType: 'application/pdf' },
        ],
        spine: [{ idref: 'chapter1', linear: true }],
      });
      addFileToContext(context, 'OEBPS/nav.xhtml', '<html></html>');
      addFileToContext(context, 'OEBPS/chapter1.pdf', 'pdf');

      validatorTest.packageDoc = packageDoc;
      validatorTest.buildManifestMaps();
      validatorTest.validateSpine(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-043')).toBe(true);
    });

    it('should add OPF-012 warning for unknown spine itemref properties', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        spine: [{ idref: 'chapter1', linear: true, properties: ['unknown-prop'] }],
      });
      addFileToContext(context, 'OEBPS/nav.xhtml', '<html></html>');
      addFileToContext(context, 'OEBPS/chapter1.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.buildManifestMaps();
      validatorTest.validateSpine(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-012' && m.message.includes('spine'))).toBe(
        true,
      );
    });
  });

  describe('EPUB 2 specific validation', () => {
    it('should add OPF-050 warning when NCX reference is missing', () => {
      const context = createValidationContext();
      context.version = '2.0';
      const packageDoc = createMinimalPackage({
        version: '2.0',
        manifest: [{ id: 'chapter1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' }],
        spine: [{ idref: 'chapter1', linear: true }],
        metaElements: [],
      });
      addFileToContext(context, 'OEBPS/chapter1.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.buildManifestMaps();
      validatorTest.validateSpine(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-050')).toBe(true);
    });

    it('should add OPF-049 error when NCX ID is not in manifest', () => {
      const context = createValidationContext();
      context.version = '2.0';
      const packageDoc = createMinimalPackage({
        version: '2.0',
        manifest: [{ id: 'chapter1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' }],
        spine: [{ idref: 'chapter1', linear: true }],
        spineToc: 'ncx',
        metaElements: [],
      });
      addFileToContext(context, 'OEBPS/chapter1.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.buildManifestMaps();
      validatorTest.validateSpine(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-049' && m.message.includes('toc'))).toBe(
        true,
      );
    });

    it('should add OPF-050 error when NCX has wrong media type', () => {
      const context = createValidationContext();
      context.version = '2.0';
      const packageDoc = createMinimalPackage({
        version: '2.0',
        manifest: [
          { id: 'ncx', href: 'toc.ncx', mediaType: 'application/xml' },
          { id: 'chapter1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
        ],
        spine: [{ idref: 'chapter1', linear: true }],
        spineToc: 'ncx',
        metaElements: [],
      });
      addFileToContext(context, 'OEBPS/toc.ncx', '<ncx/>');
      addFileToContext(context, 'OEBPS/chapter1.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.buildManifestMaps();
      validatorTest.validateSpine(context, 'OEBPS/content.opf');

      expect(
        context.messages.some((m) => m.id === 'OPF-050' && m.message.includes('media-type')),
      ).toBe(true);
    });

    it('should add OPF-034 error for duplicate spine itemrefs in EPUB 2', () => {
      const context = createValidationContext();
      context.version = '2.0';
      const packageDoc = createMinimalPackage({
        version: '2.0',
        manifest: [{ id: 'chapter1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' }],
        spine: [
          { idref: 'chapter1', linear: true },
          { idref: 'chapter1', linear: false },
        ],
        metaElements: [],
      });
      addFileToContext(context, 'OEBPS/chapter1.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.buildManifestMaps();
      validatorTest.validateSpine(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-034')).toBe(true);
    });
  });

  describe('fallback chain validation', () => {
    it('should add OPF-045 error for circular fallback chains', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        manifest: [
          { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: ['nav'] },
          { id: 'item1', href: 'item1.svg', mediaType: 'image/svg+xml', fallback: 'item2' },
          { id: 'item2', href: 'item2.png', mediaType: 'image/png', fallback: 'item3' },
          { id: 'item3', href: 'item3.gif', mediaType: 'image/gif', fallback: 'item1' }, // Circular
        ],
      });
      addFileToContext(context, 'OEBPS/nav.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.buildManifestMaps();
      validatorTest.validateFallbackChains(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-045')).toBe(true);
    });

    it('should add OPF-040 error for non-existent fallback item', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        manifest: [
          { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: ['nav'] },
          { id: 'item1', href: 'item1.svg', mediaType: 'image/svg+xml', fallback: 'nonexistent' },
        ],
      });
      addFileToContext(context, 'OEBPS/nav.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.buildManifestMaps();
      validatorTest.validateFallbackChains(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-040')).toBe(true);
    });

    it('should validate valid fallback chains', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        manifest: [
          { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: ['nav'] },
          { id: 'item1', href: 'item1.svg', mediaType: 'image/svg+xml', fallback: 'item2' },
          { id: 'item2', href: 'item2.png', mediaType: 'image/png' },
        ],
      });
      addFileToContext(context, 'OEBPS/nav.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.buildManifestMaps();
      validatorTest.validateFallbackChains(context, 'OEBPS/content.opf');

      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });
  });

  describe('guide validation (EPUB 2)', () => {
    it('should add OPF-031 error for guide reference not in manifest', () => {
      const context = createValidationContext();
      context.version = '2.0';
      const packageDoc = createMinimalPackage({
        version: '2.0',
        manifest: [{ id: 'chapter1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' }],
        spine: [{ idref: 'chapter1', linear: true }],
        metaElements: [],
        guide: [{ type: 'cover', href: 'cover.xhtml' }],
      });
      addFileToContext(context, 'OEBPS/chapter1.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateGuide(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-031')).toBe(true);
    });

    it('should validate valid guide references', () => {
      const context = createValidationContext();
      context.version = '2.0';
      const packageDoc = createMinimalPackage({
        version: '2.0',
        manifest: [
          { id: 'cover', href: 'cover.xhtml', mediaType: 'application/xhtml+xml' },
          { id: 'chapter1', href: 'chapter1.xhtml', mediaType: 'application/xhtml+xml' },
        ],
        spine: [{ idref: 'chapter1', linear: true }],
        metaElements: [],
        guide: [{ type: 'cover', href: 'cover.xhtml' }],
      });
      addFileToContext(context, 'OEBPS/cover.xhtml', '<html></html>');
      addFileToContext(context, 'OEBPS/chapter1.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.buildManifestMaps();
      validatorTest.validateGuide(context, 'OEBPS/content.opf');

      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });
  });

  describe('collections validation (EPUB 3)', () => {
    it('should accept unknown collection role (EPUB 3.3)', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        collections: [{ role: 'unknown-role', links: ['chapter1.xhtml'] }],
      });
      addFileToContext(context, 'OEBPS/nav.xhtml', '<html></html>');
      addFileToContext(context, 'OEBPS/chapter1.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.buildManifestMaps();
      validatorTest.validateCollections(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-071')).toBe(false);
    });

    it('should add OPF-072 error when dictionary collection has no name', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        collections: [{ role: 'dictionary', links: [] }],
      });
      addFileToContext(context, 'OEBPS/nav.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.validateCollections(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-072')).toBe(true);
    });

    it('should add OPF-073 error when collection link references non-existent manifest item', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        collections: [{ role: 'dictionary', name: 'Test', links: ['nonexistent.xhtml'] }],
      });
      addFileToContext(context, 'OEBPS/nav.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.buildManifestMaps();
      validatorTest.validateCollections(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-073')).toBe(true);
    });

    it('should add OPF-074 error when dictionary collection item is not XHTML or SVG', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        manifest: [
          { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: ['nav'] },
          { id: 'entry1', href: 'entry1.png', mediaType: 'image/png' },
        ],
        collections: [{ role: 'dictionary', name: 'Test', links: ['entry1.png'] }],
      });
      addFileToContext(context, 'OEBPS/nav.xhtml', '<html></html>');
      addFileToContext(context, 'OEBPS/entry1.png', 'png');

      validatorTest.packageDoc = packageDoc;
      validatorTest.buildManifestMaps();
      validatorTest.validateCollections(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-074')).toBe(true);
    });

    it('should add OPF-075 error when index collection item is not XHTML', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        manifest: [
          { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: ['nav'] },
          { id: 'index1', href: 'index1.svg', mediaType: 'image/svg+xml' },
        ],
        collections: [{ role: 'index', links: ['index1.svg'] }],
      });
      addFileToContext(context, 'OEBPS/nav.xhtml', '<html></html>');
      addFileToContext(context, 'OEBPS/index1.svg', '<svg></svg>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.buildManifestMaps();
      validatorTest.validateCollections(context, 'OEBPS/content.opf');

      expect(context.messages.some((m) => m.id === 'OPF-075')).toBe(true);
    });

    it('should validate valid collections', () => {
      const context = createValidationContext();
      const packageDoc = createMinimalPackage({
        manifest: [
          { id: 'nav', href: 'nav.xhtml', mediaType: 'application/xhtml+xml', properties: ['nav'] },
          { id: 'entry1', href: 'entry1.xhtml', mediaType: 'application/xhtml+xml' },
        ],
        collections: [{ role: 'dictionary', name: 'Test Dictionary', links: ['entry1.xhtml'] }],
      });
      addFileToContext(context, 'OEBPS/nav.xhtml', '<html></html>');
      addFileToContext(context, 'OEBPS/entry1.xhtml', '<html></html>');

      validatorTest.packageDoc = packageDoc;
      validatorTest.buildManifestMaps();
      validatorTest.validateCollections(context, 'OEBPS/content.opf');

      expect(context.messages.filter((m) => m.severity === 'error')).toHaveLength(0);
    });
  });
});
