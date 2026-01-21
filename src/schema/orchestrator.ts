import type { ValidationContext, ValidationMessage } from '../types.js';
import { RelaxNGValidator } from './relaxng.js';

/**
 * Schema mappings for different EPUB versions and file types
 */
const SCHEMA_MAPPINGS = {
  // EPUB 2.0
  '2.0': {
    container: 'container.rng',
    opf: 'opf20.rng',
    // TODO: Add XHTML 2.0 schemas (NVDL format, more complex)
  },
  // EPUB 3.x (using RNG format with inlined includes)
  '3.0': {
    container: 'ocf-container-30.rng',
    opf: 'package-30.rng',
    nav: 'epub-nav-30.rng',
    xhtml: 'epub-xhtml-30.rng',
    svg: 'epub-svg-30.rng',
  },
  '3.1': {
    container: 'ocf-container-30.rng',
    opf: 'package-30.rng',
    nav: 'epub-nav-30.rng',
    xhtml: 'epub-xhtml-30.rng',
    svg: 'epub-svg-30.rng',
  },
  '3.2': {
    container: 'ocf-container-30.rng',
    opf: 'package-30.rng',
    nav: 'epub-nav-30.rng',
    xhtml: 'epub-xhtml-30.rng',
    svg: 'epub-svg-30.rng',
  },
  '3.3': {
    container: 'ocf-container-30.rng',
    opf: 'package-30.rng',
    nav: 'epub-nav-30.rng',
    xhtml: 'epub-xhtml-30.rng',
    svg: 'epub-svg-30.rng',
  },
} as const;

/**
 * Orchestrates schema validation for different EPUB files
 */
export class SchemaValidator {
  private context: ValidationContext;

  constructor(context: ValidationContext) {
    this.context = context;
  }

  /**
   * Run all schema validations
   */
  async validate(): Promise<void> {
    const version = this.context.version;

    // Get schema mappings for current version (version is guaranteed to be valid by EPUBVersion type)
    const schemas = SCHEMA_MAPPINGS[version as keyof typeof SCHEMA_MAPPINGS];

    // Validate container.xml
    await this.validateContainer(schemas.container);

    // Validate OPF
    if (this.context.opfPath) {
      await this.validateOPF(this.context.opfPath, schemas.opf);
    }

    // Validate manifest items with schema validation
    if (this.context.packageDocument) {
      await this.validateManifestItems(schemas);
    }
  }

  /**
   * Validate container.xml
   */
  private async validateContainer(schemaPath: string): Promise<void> {
    const containerPath = 'META-INF/container.xml';
    const data = this.context.files.get(containerPath);

    if (!data) {
      return;
    }

    const xml = new TextDecoder().decode(data);
    const validator = new RelaxNGValidator();
    const messages = await validator.validate(xml, schemaPath);

    for (const msg of messages) {
      this.addMessage({
        ...msg,
        location: { ...msg.location, path: containerPath },
      });
    }
  }

  /**
   * Validate OPF package document
   */
  private async validateOPF(opfPath: string, schemaPath: string): Promise<void> {
    const data = this.context.files.get(opfPath);

    if (!data) {
      return;
    }

    const xml = new TextDecoder().decode(data);
    const validator = new RelaxNGValidator();
    const messages = await validator.validate(xml, schemaPath);

    for (const msg of messages) {
      this.addMessage({
        ...msg,
        location: { ...msg.location, path: opfPath },
      });
    }
  }

  /**
   * Validate manifest items (XHTML, SVG, etc.)
   */
  private async validateManifestItems(schemas: Record<string, string>): Promise<void> {
    if (!this.context.packageDocument) {
      return;
    }

    for (const item of this.context.packageDocument.manifest) {
      // Skip non-XML files and remote resources
      if (item.href.startsWith('http') || !isXmlMediaType(item.mediaType)) {
        continue;
      }

      const data = this.context.files.get(item.href);
      if (!data) {
        continue;
      }

      const xml = new TextDecoder().decode(data);

      // Determine which schema to use
      let schemaPath: string | undefined;
      if (item.properties?.includes('nav') && schemas.nav) {
        schemaPath = schemas.nav;
      } else if (item.mediaType === 'image/svg+xml' && schemas.svg) {
        schemaPath = schemas.svg;
      } else if (item.mediaType === 'application/xhtml+xml' && schemas.xhtml) {
        schemaPath = schemas.xhtml;
      }

      if (schemaPath) {
        const validator = new RelaxNGValidator();
        const messages = await validator.validate(xml, schemaPath);
        for (const msg of messages) {
          this.addMessage({
            ...msg,
            location: { ...msg.location, path: item.href },
          });
        }
      }
    }
  }

  /**
   * Add a message to the context with proper filtering
   */
  private addMessage(message: ValidationMessage): void {
    const messages = this.context.messages;

    // Check max errors limit
    if (
      this.context.options.maxErrors > 0 &&
      messages.filter((m) => m.severity === 'error' || m.severity === 'fatal').length >=
        this.context.options.maxErrors
    ) {
      return;
    }

    // Filter by severity based on options
    if (!this.context.options.includeUsage && message.severity === 'usage') {
      return;
    }
    if (!this.context.options.includeInfo && message.severity === 'info') {
      return;
    }

    messages.push(message);
  }
}

/**
 * Check if a media type is XML-based
 */
function isXmlMediaType(mediaType: string): boolean {
  return (
    mediaType === 'application/xhtml+xml' ||
    mediaType === 'image/svg+xml' ||
    mediaType === 'application/oebps-package+xml' ||
    mediaType === 'application/x-dtbncx+xml' ||
    mediaType === 'application/xml' ||
    mediaType === 'text/xml'
  );
}
