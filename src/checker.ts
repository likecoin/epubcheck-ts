import { ContentValidator } from './content/index.js';
import { buildReport } from './core/report.js';
import { MessageId, pushMessage } from './messages/index.js';
import { NCXValidator } from './nav/index.js';
import { OCFValidator } from './ocf/index.js';
import { OPFValidator } from './opf/index.js';
import { isCoreMediaType } from './opf/types.js';
import { ResourceRegistry } from './references/registry.js';
import { resolveManifestHref } from './references/url.js';
import { ReferenceValidator } from './references/validator.js';
import { SchemaValidator } from './schema/orchestrator.js';
import type {
  EPUBVersion,
  EpubCheckOptions,
  EpubCheckResult,
  ValidationContext,
  ValidationMessage,
} from './types.js';

/**
 * Default options for EpubCheck
 */
const DEFAULT_OPTIONS: Required<EpubCheckOptions> = {
  version: '3.3',
  profile: 'default',
  includeUsage: false,
  includeInfo: true,
  maxErrors: 0,
  locale: 'en',
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
  private readonly options: Required<EpubCheckOptions>;

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
   * @returns Validation result
   */
  async check(data: Uint8Array): Promise<EpubCheckResult> {
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

    try {
      // Step 1: Validate OCF container (ZIP structure)
      const ocfValidator = new OCFValidator();
      ocfValidator.validate(context);

      // Stop if fatal errors in OCF
      if (context.messages.some((m) => m.severity === 'fatal')) {
        const elapsedMs = performance.now() - startTime;
        return buildReport(context.messages, context.version, elapsedMs);
      }

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
      }

      // Step 4: Validate content documents (XHTML) and extract references
      const contentValidator = new ContentValidator();
      contentValidator.validate(context, registry, refValidator);

      // Step 5: Validate NCX navigation (EPUB 2 always; EPUB 3 when NCX is present)
      if (context.packageDocument) {
        this.validateNCX(context, registry);
      }

      // Step 6: Run cross-reference validation
      refValidator.validate(context);

      // Step 7: Run schema validations (RelaxNG, XSD, Schematron)
      const schemaValidator = new SchemaValidator(context);
      await schemaValidator.validate();
    } catch (error) {
      // Add fatal error for unexpected exceptions
      pushMessage(context.messages, {
        id: MessageId.PKG_025,
        message: error instanceof Error ? error.message : 'Unknown validation error',
      });
    }

    const elapsedMs = performance.now() - startTime;

    // Filter messages based on options
    const filteredMessages = context.messages.filter((msg) => {
      if (!this.options.includeUsage && msg.severity === 'usage') {
        return false;
      }
      if (!this.options.includeInfo && msg.severity === 'info') {
        return false;
      }
      return true;
    });

    // Build and return result
    return buildReport(filteredMessages, context.version, elapsedMs);
  }

  /**
   * Static method to validate an EPUB file with default options
   *
   * @param data - The EPUB file as a Uint8Array
   * @param options - Optional validation options
   * @returns Validation result
   */
  static async validate(
    data: Uint8Array,
    options: EpubCheckOptions = {},
  ): Promise<EpubCheckResult> {
    const checker = new EpubCheck(options);
    return checker.check(data);
  }

  /**
   * Get the current EPUB version being validated against
   */
  get version(): EPUBVersion {
    return this.options.version;
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
}
