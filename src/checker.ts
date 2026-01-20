import type {
  EpubCheckOptions,
  EpubCheckResult,
  EPUBVersion,
  ValidationContext,
  ValidationMessage,
} from './types.js';
import { buildReport } from './core/report.js';
import { OCFValidator } from './ocf/index.js';

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
  check(data: Uint8Array): Promise<EpubCheckResult> {
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

      // Step 2: Validate package document (OPF)
      // TODO: Implement OPF validation
      // const opfValidator = new OPFValidator();
      // await opfValidator.validate(context);

      // Step 3: Validate content documents
      // TODO: Implement content validation

      // Step 4: Validate navigation
      // TODO: Implement navigation validation

      // Step 5: Run schema validations (RelaxNG, XSD, Schematron)
      // TODO: Implement schema validation
    } catch (error) {
      // Add fatal error for unexpected exceptions
      context.messages.push({
        id: 'PKG-025',
        severity: 'fatal',
        message: error instanceof Error ? error.message : 'Unknown validation error',
      });
    }

    const elapsedMs = performance.now() - startTime;

    // Build and return result
    return Promise.resolve(buildReport(context.messages, context.version, elapsedMs));
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
}
