import type { PackageDocument } from './opf/types.js';

/**
 * Severity levels for validation messages
 */
export type Severity = 'fatal' | 'error' | 'warning' | 'info' | 'usage';

/**
 * Supported EPUB versions
 */
export type EPUBVersion = '2.0' | '3.0' | '3.1' | '3.2' | '3.3';

/**
 * EPUB validation profiles
 */
export type EPUBProfile = 'default' | 'edupub' | 'idx' | 'dict' | 'preview';

/**
 * Location within an EPUB file
 */
export interface EPUBLocation {
  /** Path to the file within the EPUB container */
  path: string;
  /** Line number (1-based), if applicable */
  line?: number;
  /** Column number (1-based), if applicable */
  column?: number;
  /** Additional context about the location */
  context?: string;
}

/**
 * A validation message (error, warning, etc.)
 */
export interface ValidationMessage {
  /** Unique message identifier */
  id: string;
  /** Severity level */
  severity: Severity;
  /** Human-readable message */
  message: string;
  /** Location where the issue was found */
  location?: EPUBLocation;
  /** Suggestion for fixing the issue */
  suggestion?: string;
}

/**
 * Result of EPUB validation
 */
export interface EpubCheckResult {
  /** Whether the EPUB is valid (no errors or fatal errors) */
  valid: boolean;
  /** All validation messages */
  messages: ValidationMessage[];
  /** Count of fatal errors */
  fatalCount: number;
  /** Count of errors */
  errorCount: number;
  /** Count of warnings */
  warningCount: number;
  /** Count of info messages */
  infoCount: number;
  /** Count of usage messages */
  usageCount: number;
  /** Detected EPUB version */
  version?: EPUBVersion | undefined;
  /** Time taken for validation in milliseconds */
  elapsedMs: number;
}

/**
 * Options for EpubCheck
 */
export interface EpubCheckOptions {
  /** EPUB version to validate against (auto-detected if not specified) */
  version?: EPUBVersion;
  /** Validation profile */
  profile?: EPUBProfile;
  /** Whether to include usage messages */
  includeUsage?: boolean;
  /** Whether to include info messages */
  includeInfo?: boolean;
  /** Maximum number of errors before stopping (0 = unlimited) */
  maxErrors?: number;
  /** Locale for messages (e.g., 'en', 'de', 'fr') */
  locale?: string;
}

/**
 * Internal validation context passed through the validation pipeline
 */
export interface ValidationContext {
  /** EPUB file data */
  data: Uint8Array;
  /** Validation options */
  options: Required<EpubCheckOptions>;
  /** Detected EPUB version */
  version: EPUBVersion;
  /** Validation messages collected so far */
  messages: ValidationMessage[];
  /** Files extracted from EPUB container */
  files: Map<string, Uint8Array>;
  /** Rootfiles found in container.xml */
  rootfiles: Rootfile[];
  /** Path to the package document (OPF) */
  opfPath?: string;
  /** Parsed package document */
  packageDocument?: PackageDocument;
  /** NCX UID for validation against OPF identifier */
  ncxUid?: string;
  /** Resources referenced in content but not declared in manifest */
  referencedUndeclaredResources?: Set<string>;
}

/**
 * Rootfile reference from container.xml
 */
export interface Rootfile {
  path: string;
  mediaType: string;
}

/**
 * Interface for schema validators (RelaxNG, XSD, Schematron)
 */
export interface SchemaValidator {
  /** Validate XML content against a schema */
  validate(xml: string, schemaPath: string): ValidationMessage[];
}
