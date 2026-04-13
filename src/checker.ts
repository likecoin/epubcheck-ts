import { ContentValidator } from './content/index.js';
import { buildReport } from './core/report.js';
import {
  MessageId,
  pushMessage,
  setSeverityOverrides,
  clearSeverityOverrides,
} from './messages/index.js';
import { NCXValidator } from './nav/index.js';
import {
  parseContainerContent,
  validateDuplicateFilenames,
  validateFilenameCharacters,
} from './ocf/container.js';
import { OCFValidator } from './ocf/index.js';
import { OPFValidator } from './opf/index.js';
import { isCoreMediaType } from './opf/types.js';
import { ResourceRegistry } from './references/registry.js';
import { resolveManifestHref } from './references/url.js';
import { ReferenceValidator } from './references/validator.js';
import { SchemaValidator } from './schema/orchestrator.js';
import { SMILValidator } from './smil/validator.js';
import { parseDoctype } from './util/doctype.js';
import type {
  EPUBVersion,
  EpubCheckOptions,
  EpubCheckResult,
  ResolvedEpubCheckOptions,
  ValidationContext,
  ValidationMessage,
} from './types.js';

/**
 * Default options for EpubCheck
 */
const DEFAULT_OPTIONS: ResolvedEpubCheckOptions = {
  version: '3.3',
  profile: 'default',
  includeUsage: false,
  includeInfo: true,
  maxErrors: 0,
  locale: 'en',
  customMessages: new Map(),
};

// OPF-073: DOCTYPE external identifiers are only allowed for a small set of
// legacy XML media types. Source: ../epubcheck DeclarationHandler.
const OPF_073_ALLOWED_DOCTYPES: Record<string, { publicId: string; systemId: string }> = {
  'image/svg+xml': {
    publicId: '-//W3C//DTD SVG 1.1//EN',
    systemId: 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd',
  },
  'application/mathml+xml': {
    publicId: '-//W3C//DTD MathML 3.0//EN',
    systemId: 'http://www.w3.org/Math/DTD/mathml3/mathml3.dtd',
  },
  'application/mathml-content+xml': {
    publicId: '-//W3C//DTD MathML 3.0//EN',
    systemId: 'http://www.w3.org/Math/DTD/mathml3/mathml3.dtd',
  },
  'application/mathml-presentation+xml': {
    publicId: '-//W3C//DTD MathML 3.0//EN',
    systemId: 'http://www.w3.org/Math/DTD/mathml3/mathml3.dtd',
  },
  'application/x-dtbncx+xml': {
    publicId: '-//NISO//DTD ncx 2005-1//EN',
    systemId: 'http://www.daisy.org/z3986/2005/ncx-2005-1.dtd',
  },
};

/**
 * Main EPUB validation class
 *
 * @example
 * ```typescript
 * import { EpubCheck } from 'epubcheck-ts';
 *
 * // Validate from a Uint8Array (works in Node.js and browsers)
 * const result = await EpubCheck.validate(epubData);
 *
 * if (result.valid) {
 *   console.log('EPUB is valid!');
 * } else {
 *   console.log(`Found ${result.errorCount} errors`);
 *   for (const msg of result.messages) {
 *     console.log(`${msg.severity}: ${msg.message}`);
 *   }
 * }
 * ```
 */
export class EpubCheck {
  private readonly options: ResolvedEpubCheckOptions;

  /**
   * Create a new EpubCheck instance with custom options
   */
  constructor(options: EpubCheckOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Validate an EPUB file
   *
   * @param data - The EPUB file as a Uint8Array
   * @param filename - Optional filename, used for file-extension checks (PKG-016/017/024)
   * @returns Validation result
   */
  async check(data: Uint8Array, filename?: string): Promise<EpubCheckResult> {
    const startTime = performance.now();

    // Initialize validation context
    const context: ValidationContext = {
      data,
      options: this.options,
      version: this.options.version,
      messages: [],
      files: new Map(),
      rootfiles: [],
    };

    // Apply custom message severity overrides
    if (this.options.customMessages.size > 0) {
      setSeverityOverrides(this.options.customMessages);
    }

    try {
      // Check filename extension (PKG-016/017/024) before unzipping
      if (filename) {
        this.checkFilenameExtension(context, filename);
      }

      // Step 1: Validate OCF container (ZIP structure)
      const ocfValidator = new OCFValidator();
      ocfValidator.validate(context);

      // Stop if fatal errors in OCF
      if (context.messages.some((m) => m.severity === 'fatal')) {
        const elapsedMs = performance.now() - startTime;
        return buildReport(context.messages, context.version, elapsedMs);
      }

      // Steps 2-7: Shared validation pipeline
      await this.runPipeline(context);
    } catch (error) {
      pushMessage(context.messages, {
        id: MessageId.PKG_025,
        message: error instanceof Error ? error.message : 'Unknown validation error',
      });
    } finally {
      clearSeverityOverrides();
    }

    const elapsedMs = performance.now() - startTime;
    return this.buildFilteredReport(context, elapsedMs);
  }

  /**
   * Validate an expanded EPUB directory (pre-read file map)
   *
   * @param files - Map of relative file paths to their content
   * @returns Validation result
   */
  async checkExpanded(files: Map<string, Uint8Array>): Promise<EpubCheckResult> {
    const startTime = performance.now();

    const context: ValidationContext = {
      data: new Uint8Array(0),
      options: this.options,
      version: this.options.version,
      messages: [],
      files: new Map(),
      rootfiles: [],
    };

    if (this.options.customMessages.size > 0) {
      setSeverityOverrides(this.options.customMessages);
    }

    try {
      // Populate context.files with NFC-normalized paths
      for (const [path, data] of files) {
        context.files.set(path.normalize('NFC'), data);
      }

      // Validate mimetype file content (skip ZIP-specific checks)
      this.validateExpandedMimetype(context);

      // Parse container.xml to find rootfiles and opfPath
      this.parseContainerXml(context);

      // Stop if fatal errors
      if (context.messages.some((m) => m.severity === 'fatal')) {
        const elapsedMs = performance.now() - startTime;
        return buildReport(context.messages, context.version, elapsedMs);
      }

      // Validate filenames
      this.validateExpandedFilenames(context);

      // Run the shared pipeline (Steps 2-7)
      await this.runPipeline(context);
    } catch (error) {
      pushMessage(context.messages, {
        id: MessageId.PKG_025,
        message: error instanceof Error ? error.message : 'Unknown validation error',
      });
    } finally {
      clearSeverityOverrides();
    }

    const elapsedMs = performance.now() - startTime;
    return this.buildFilteredReport(context, elapsedMs);
  }

  /**
   * Validate a single file (OPF, XHTML, etc.) without a full EPUB container
   *
   * @param data - The file content
   * @param filename - The filename (used for path in messages)
   * @returns Validation result
   */
  async checkSingleFile(data: Uint8Array, filename: string): Promise<EpubCheckResult> {
    const startTime = performance.now();
    const mode = this.options.mode;

    const context: ValidationContext = {
      data: new Uint8Array(0),
      options: this.options,
      version: this.options.version,
      messages: [],
      files: new Map(),
      rootfiles: [],
    };

    if (this.options.customMessages.size > 0) {
      setSeverityOverrides(this.options.customMessages);
    }

    try {
      context.files.set(filename, data);

      if (mode === 'opf') {
        context.opfPath = filename;
        const opfValidator = new OPFValidator();
        opfValidator.validate(context);

        const schemaValidator = new SchemaValidator(context);
        await schemaValidator.validate();
      } else if (mode === 'xhtml') {
        const contentValidator = new ContentValidator();
        contentValidator.validateSingleDocument(context, filename);

        const schemaValidator = new SchemaValidator(context);
        await schemaValidator.validate();
      } else if (mode === 'svg') {
        const contentValidator = new ContentValidator();
        contentValidator.validateSingleSVG(context, filename);

        const schemaValidator = new SchemaValidator(context);
        await schemaValidator.validate();
      } else if (mode === 'mo') {
        // Media overlay (SMIL). SchemaValidator is a no-op here
        // since there's no container/opf/manifest, so we skip it.
        const smilValidator = new SMILValidator();
        smilValidator.validate(context, filename);
      }
    } catch (error) {
      pushMessage(context.messages, {
        id: MessageId.PKG_025,
        message: error instanceof Error ? error.message : 'Unknown validation error',
      });
    } finally {
      clearSeverityOverrides();
    }

    const elapsedMs = performance.now() - startTime;
    return this.buildFilteredReport(context, elapsedMs);
  }

  /**
   * Static method to validate an EPUB file with default options
   *
   * @param data - The EPUB file as a Uint8Array
   * @param options - Optional validation options
   * @param filename - Optional filename, used for file-extension checks
   * @returns Validation result
   */
  static async validate(
    data: Uint8Array,
    options: EpubCheckOptions = {},
    filename?: string,
  ): Promise<EpubCheckResult> {
    const checker = new EpubCheck(options);
    return checker.check(data, filename);
  }

  /**
   * Static method to validate an expanded EPUB (pre-read file map)
   */
  static async validateExpanded(
    files: Map<string, Uint8Array>,
    options: EpubCheckOptions = {},
  ): Promise<EpubCheckResult> {
    const checker = new EpubCheck(options);
    return checker.checkExpanded(files);
  }

  /**
   * Static method to validate a single file
   */
  static async validateSingleFile(
    data: Uint8Array,
    filename: string,
    options: EpubCheckOptions = {},
  ): Promise<EpubCheckResult> {
    const checker = new EpubCheck(options);
    return checker.checkSingleFile(data, filename);
  }

  /**
   * Get the current EPUB version being validated against
   */
  get version(): EPUBVersion {
    return this.options.version;
  }

  /**
   * Cross-document feature validation (Pattern B from Java EPUBCheck)
   */
  private validateCrossDocumentFeatures(context: ValidationContext): void {
    const features = context.contentFeatures;
    if (!features || !context.version.startsWith('3')) return;

    const profile = context.options.profile;
    const opfPath = context.opfPath ?? '';

    // EDUPUB-only checks
    if (profile === 'edupub') {
      // NAV-003: Page breaks require page-list nav
      if (features.hasPageBreak && !features.hasPageList) {
        pushMessage(context.messages, {
          id: MessageId.NAV_003,
          message:
            'The Navigation Document must have a page list when content contains page breaks (epub:type="pagebreak")',
          location: { path: opfPath },
        });
      }

      // NAV-005: Audio elements without list of audio clips
      if (features.hasAudio && !features.hasLOA) {
        pushMessage(context.messages, {
          id: MessageId.NAV_005,
          message:
            'Content documents contain "audio" elements but the Navigation Document does not have a listing of audio clips (epub:type="loa")',
          location: { path: opfPath },
        });
      }

      // NAV-006: Figure elements without list of illustrations
      if (features.hasFigure && !features.hasLOI) {
        pushMessage(context.messages, {
          id: MessageId.NAV_006,
          message:
            'Content documents contain "figure" elements but the Navigation Document does not have a listing of figures (epub:type="loi")',
          location: { path: opfPath },
        });
      }

      // NAV-007: Table elements without list of tables
      if (features.hasTable && !features.hasLOT) {
        pushMessage(context.messages, {
          id: MessageId.NAV_007,
          message:
            'Content documents contain "table" elements but the Navigation Document does not have a listing of tables (epub:type="lot")',
          location: { path: opfPath },
        });
      }

      // NAV-008: Video elements without list of video clips
      if (features.hasVideo && !features.hasLOV) {
        pushMessage(context.messages, {
          id: MessageId.NAV_008,
          message:
            'Content documents contain "video" elements but the Navigation Document does not have a listing of video clips (epub:type="lov")',
          location: { path: opfPath },
        });
      }

      // HTM-051: Microdata without RDFa
      if (features.hasMicrodata && !features.hasRDFa) {
        pushMessage(context.messages, {
          id: MessageId.HTM_051,
          message: 'Found Microdata but no RDFa; EDUPUB recommends the use of RDFa Lite',
          location: { path: opfPath },
        });
      }

      // OPF-066: Page list / page breaks require pagination source identification
      // Mirrors ../epubcheck/src/main/java/com/adobe/epubcheck/opf/OPFChecker30.java
      if (features.hasPageBreak || features.hasPageList) {
        const hasSource =
          context.packageDocument?.dcElements.some((dc) => dc.name === 'source') ?? false;
        const hasSourceOf =
          context.packageDocument?.metaElements.some((m) => m.property.trim() === 'source-of') ??
          false;
        if (!hasSource && !hasSourceOf) {
          pushMessage(context.messages, {
            id: MessageId.OPF_066,
            message:
              'Missing "dc:source" or "source-of" pagination metadata. The pagination source must be identified using the "dc:source" and "source-of" properties when the content includes page break markers.',
            location: { path: opfPath },
          });
        }
      }
    }

    // Dictionary content ↔ dc:type checks
    const hasDictType =
      context.packageDocument?.dcElements.some(
        (dc) => dc.name === 'type' && dc.value === 'dictionary',
      ) ?? false;

    if (features.hasDictionary && !hasDictType) {
      pushMessage(context.messages, {
        id: MessageId.OPF_079,
        message:
          'Dictionary content was found (epub:type "dictionary"), the Package Document should declare the dc:type "dictionary"',
        location: { path: opfPath },
      });
    }

    if (profile === 'dict' && hasDictType && !features.hasDictionary) {
      pushMessage(context.messages, {
        id: MessageId.OPF_078,
        message:
          'An EPUB Dictionary must contain at least one Content Document with dictionary content (epub:type "dictionary")',
        location: { path: opfPath },
      });
    }
  }

  /**
   * Validate NCX navigation document (EPUB 2 always, EPUB 3 when NCX present)
   */
  private validateNCX(context: ValidationContext, registry: ResourceRegistry): void {
    if (!context.packageDocument) {
      return;
    }

    const ncxId = context.packageDocument.spineToc;
    if (!ncxId) {
      // For EPUB 3 without toc attribute, check if NCX exists in manifest
      // (NCX toc attribute missing check is handled in OPF validator)
      return;
    }

    // Find NCX manifest item
    const ncxItem = context.packageDocument.manifest.find((item) => item.id === ncxId);
    if (!ncxItem) {
      return;
    }

    const opfPath = context.opfPath ?? '';
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : '';
    const ncxPath = resolveManifestHref(opfDir, ncxItem.href);

    const ncxData = context.files.get(ncxPath);
    if (!ncxData) {
      return;
    }

    const ncxContent = new TextDecoder().decode(ncxData);

    const ncxValidator = new NCXValidator();
    ncxValidator.validate(context, ncxContent, ncxPath, registry);

    // Check if NCX UID matches OPF unique identifier
    if (context.ncxUid && context.packageDocument.uniqueIdentifier) {
      // Find the dc:identifier whose id matches the package unique-identifier attribute
      const uniqueIdRef = context.packageDocument.uniqueIdentifier;
      const matchingIdentifier = context.packageDocument.dcElements.find(
        (dc) => dc.name === 'identifier' && dc.id === uniqueIdRef,
      );

      if (matchingIdentifier) {
        const opfUid = matchingIdentifier.value.trim();
        if (context.ncxUid !== opfUid) {
          pushMessage(context.messages, {
            id: MessageId.NCX_001,
            message: `NCX uid "${context.ncxUid}" does not match OPF unique identifier "${opfUid}"`,
            location: { path: ncxPath },
          });
        }
      }
    }
  }

  /**
   * Add a validation message to the context
   */
  protected addMessage(messages: ValidationMessage[], message: ValidationMessage): void {
    // Check max errors limit
    if (
      this.options.maxErrors > 0 &&
      messages.filter((m) => m.severity === 'error' || m.severity === 'fatal').length >=
        this.options.maxErrors
    ) {
      return;
    }

    // Filter by severity based on options
    if (!this.options.includeUsage && message.severity === 'usage') {
      return;
    }
    if (!this.options.includeInfo && message.severity === 'info') {
      return;
    }

    messages.push(message);
  }

  /**
   * Validate that obfuscated resources are blessed font types (PKG-026)
   */
  private validateObfuscatedResources(context: ValidationContext): void {
    if (!context.obfuscatedResources || !context.packageDocument) return;

    const BLESSED_FONT_TYPES = new Set([
      'font/otf',
      'font/ttf',
      'font/woff',
      'font/woff2',
      'application/font-sfnt',
      'application/font-woff',
      'application/vnd.ms-opentype',
      'application/x-font-ttf',
    ]);

    const opfPath = context.opfPath ?? '';
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : '';

    for (const uri of context.obfuscatedResources) {
      const item = context.packageDocument.manifest.find(
        (m) => resolveManifestHref(opfDir, m.href) === uri,
      );
      if (item && !BLESSED_FONT_TYPES.has(item.mediaType)) {
        pushMessage(context.messages, {
          id: MessageId.PKG_026,
          message: `Obfuscated resource "${uri}" has media-type "${item.mediaType}" which is not a Font Core Media Type`,
          location: { path: uri },
        });
      }
    }
  }

  /**
   * Populate resource registry from package document manifest
   */
  private populateRegistry(context: ValidationContext, registry: ResourceRegistry): void {
    const packageDoc = context.packageDocument;
    if (!packageDoc) return;

    const opfPath = context.opfPath ?? '';
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : '';

    const spineIdrefs = new Set(packageDoc.spine.map((item) => item.idref));
    const manifestById = new Map(packageDoc.manifest.map((item) => [item.id, item]));

    for (const item of packageDoc.manifest) {
      const fullPath = resolveManifestHref(opfDir, item.href);
      const properties = item.properties ?? [];
      registry.registerResource({
        url: fullPath,
        mimeType: item.mediaType,
        inSpine: spineIdrefs.has(item.id),
        hasCoreMediaTypeFallback: this.hasCMTFallback(item.id, manifestById),
        isNav: properties.includes('nav'),
        isCoverImage: properties.includes('cover-image'),
        isNcx: item.mediaType === 'application/x-dtbncx+xml',
        ids: new Set(),
      });
    }
  }

  /**
   * Check if a manifest item has a fallback chain reaching a Core Media Type
   */
  private hasCMTFallback(
    itemId: string,
    manifestById: Map<string, { mediaType: string; fallback?: string }>,
  ): boolean {
    const visited = new Set<string>();
    let currentId: string | undefined = itemId;
    while (currentId) {
      if (visited.has(currentId)) return false; // circular
      visited.add(currentId);
      const item = manifestById.get(currentId);
      if (!item) return false;
      if (isCoreMediaType(item.mediaType)) return true;
      currentId = item.fallback;
    }
    return false;
  }

  /**
   * Shared validation pipeline (Steps 2-7) used by both check() and checkExpanded()
   */
  private async runPipeline(context: ValidationContext): Promise<void> {
    // Step 2: Validate package document (OPF)
    const opfValidator = new OPFValidator();
    opfValidator.validate(context);

    // Step 3: Create resource registry and reference validator
    const registry = new ResourceRegistry();
    const refValidator = new ReferenceValidator(registry, context.version);

    // Populate registry from manifest
    if (context.packageDocument) {
      this.populateRegistry(context, registry);
      this.validateObfuscatedResources(context);
      this.checkExternalIdentifiers(context);
    }

    // Step 4: Validate content documents (XHTML) and extract references
    const contentValidator = new ContentValidator();
    contentValidator.validate(context, registry, refValidator);

    // Step 4.5: Cross-document feature validation
    this.validateCrossDocumentFeatures(context);

    // Step 5: Validate NCX navigation (EPUB 2 always; EPUB 3 when NCX is present)
    if (context.packageDocument) {
      this.validateNCX(context, registry);
    }

    // Step 6: Run cross-reference validation
    refValidator.validate(context);

    // Step 7: Run schema validations (RelaxNG, XSD, Schematron)
    const schemaValidator = new SchemaValidator(context);
    await schemaValidator.validate();
  }

  /**
   * Check DOCTYPE external identifiers (OPF-073).
   *
   * Mirrors Java's DeclarationHandler: external identifiers (PUBLIC/SYSTEM)
   * must not appear in DOCTYPE declarations except for specific media-type
   * combinations (SVG 1.1, MathML 3.0, NCX 2005-1).
   */
  private checkExternalIdentifiers(context: ValidationContext): void {
    if (!context.packageDocument) return;
    // EPUB 3 only — EPUB 2 has distinct DOCTYPE rules (DTBook, OEB 1.2, XHTML 1.1)
    if (context.version === '2.0') return;

    const opfPath = context.opfPath ?? '';
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : '';

    for (const item of context.packageDocument.manifest) {
      const mediaType = item.mediaType;
      if (mediaType === 'application/xhtml+xml') continue;
      if (!mediaType.endsWith('+xml') && mediaType !== 'application/x-dtbncx+xml') continue;

      const fullPath = resolveManifestHref(opfDir, item.href);
      const data = context.files.get(fullPath);
      if (!data) continue;

      const info = parseDoctype(new TextDecoder().decode(data.slice(0, 2048)));
      if (!info) continue;

      const allowed = OPF_073_ALLOWED_DOCTYPES[mediaType];
      if (allowed?.publicId !== info.publicId || allowed.systemId !== info.systemId) {
        pushMessage(context.messages, {
          id: MessageId.OPF_073,
          message: 'External identifiers must not appear in the document type declaration.',
          location: { path: fullPath },
        });
      }
    }
  }

  /**
   * Check file extension for EPUB naming conventions.
   *
   * Mirrors Java's OCFExtensionChecker (src/main/java/com/adobe/epubcheck/ocf/OCFExtensionChecker.java):
   * - PKG-016 (warning): case-variant of "epub" (e.g. ".ePub", ".EPUB")
   * - PKG-017 (EPUB 2) / PKG-024 (EPUB 3): non-epub extension
   */
  private checkFilenameExtension(context: ValidationContext, filename: string): void {
    const dotIdx = filename.lastIndexOf('.');
    if (dotIdx < 0) return;
    const extension = filename.slice(dotIdx + 1);
    if (extension === 'epub') return;

    if (/^[Ee][Pp][Uu][Bb]$/.test(extension)) {
      pushMessage(context.messages, {
        id: MessageId.PKG_016,
        message:
          'For maximum compatibility, use only lowercase characters for the EPUB file extension.',
        location: { path: filename },
      });
    }
    // PKG-017/024 for other extensions could be added here later.
  }

  /**
   * Build a filtered report from validation context
   */
  private buildFilteredReport(context: ValidationContext, elapsedMs: number): EpubCheckResult {
    const filteredMessages = context.messages.filter((msg) => {
      if (!this.options.includeUsage && msg.severity === 'usage') return false;
      if (!this.options.includeInfo && msg.severity === 'info') return false;
      return true;
    });
    return buildReport(filteredMessages, context.version, elapsedMs);
  }

  /**
   * Validate mimetype file content for expanded EPUB (no ZIP-specific checks)
   */
  private validateExpandedMimetype(context: ValidationContext): void {
    const mimetypeData = context.files.get('mimetype');
    if (!mimetypeData) {
      pushMessage(context.messages, {
        id: MessageId.PKG_006,
        message: 'Missing mimetype file',
        location: { path: 'mimetype' },
      });
      return;
    }

    const content = new TextDecoder().decode(mimetypeData);
    if (content !== 'application/epub+zip') {
      pushMessage(context.messages, {
        id: MessageId.PKG_007,
        message: 'Mimetype file must contain exactly "application/epub+zip"',
        location: { path: 'mimetype' },
      });
    }
  }

  /**
   * Parse container.xml from context.files to find rootfiles and opfPath
   */
  private parseContainerXml(context: ValidationContext): void {
    const containerPath = 'META-INF/container.xml';
    const containerData = context.files.get(containerPath);

    if (!containerData) {
      pushMessage(context.messages, {
        id: MessageId.RSC_002,
        message: 'Required file META-INF/container.xml was not found',
        location: { path: containerPath },
      });
      return;
    }

    const content = new TextDecoder().decode(containerData);
    parseContainerContent(
      content,
      context,
      (path) => context.files.has(path),
      (path) => {
        const data = context.files.get(path);
        return data ? new TextDecoder().decode(data) : undefined;
      },
    );
  }

  /**
   * Validate filenames for expanded EPUB
   */
  private validateExpandedFilenames(context: ValidationContext): void {
    const filePaths: string[] = [];
    for (const path of context.files.keys()) {
      if (path === 'mimetype') continue;
      validateFilenameCharacters(path, context.messages);
      filePaths.push(path);
    }
    validateDuplicateFilenames(filePaths, context.messages);
  }
}
