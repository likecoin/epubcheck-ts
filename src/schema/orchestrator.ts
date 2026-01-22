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
   *
   * NOTE: RelaxNG validation for XHTML/SVG/NAV is currently disabled due to
   * libxml2-wasm limitations. The schemas use recursive "anything" patterns
   * (common.elem.anything -> common.inner.anything) with interleave/attribute
   * that libxml2 doesn't support ("Found forbidden pattern oneOrMore//interleave//attribute").
   *
   * Java EPUBCheck uses Jing (a more sophisticated RelaxNG validator) that handles these.
   * Content validation still happens via Schematron and custom validators.
   */
  private async validateManifestItems(_schemas: Record<string, string>): Promise<void> {
    // RelaxNG validation disabled - see comment above
    // Content is validated via Schematron (src/schema/schematron.ts) and
    // custom validators (src/content/validator.ts)
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
