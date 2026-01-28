/**
 * Message Registry - Maps message IDs to their default severities
 *
 * This registry defines the default severity for each message ID,
 * matching the Java EPUBCheck behavior exactly.
 *
 * Severity levels:
 * - FATAL: Unrecoverable errors that prevent validation
 * - ERROR: Specification violations
 * - WARNING: Best practice violations or potential issues
 * - INFO: Informational messages
 * - USAGE: Feature usage information (off by default)
 * - SUPPRESSED: Disabled by default (can be enabled via customMessages)
 *
 * Reference: Java EPUBCheck DefaultSeverities.java
 */

import type { Severity, ValidationMessage, EPUBLocation } from '../types.js';
import { MessageId } from './message-id.js';

export type MessageSeverity = Severity | 'suppressed';

export interface MessageInfo {
  id: string;
  severity: MessageSeverity;
  description: string;
}

/**
 * Registry of all message IDs with their default severities and descriptions
 * Severities match Java EPUBCheck DefaultSeverities.java
 */
export const MESSAGE_REGISTRY: MessageInfo[] = [
  // Package/Container errors (PKG-*) - matches Java DefaultSeverities.java
  { id: MessageId.PKG_001, severity: 'warning', description: 'Unable to read EPUB file' },
  { id: MessageId.PKG_002, severity: 'error', description: 'Missing META-INF directory' },
  { id: MessageId.PKG_003, severity: 'error', description: 'Missing container.xml' },
  { id: MessageId.PKG_004, severity: 'fatal', description: 'No rootfile in container.xml' },
  {
    id: MessageId.PKG_005,
    severity: 'error',
    description: 'Mimetype file must be first entry in archive',
  },
  { id: MessageId.PKG_006, severity: 'error', description: 'Missing mimetype file' },
  { id: MessageId.PKG_007, severity: 'error', description: 'Invalid mimetype content' },
  { id: MessageId.PKG_008, severity: 'fatal', description: 'Mimetype has extra field length' },
  { id: MessageId.PKG_009, severity: 'error', description: 'Mimetype file must be uncompressed' },
  { id: MessageId.PKG_010, severity: 'warning', description: 'Filename contains spaces' },
  { id: MessageId.PKG_011, severity: 'error', description: 'Filename contains invalid characters' },
  { id: MessageId.PKG_012, severity: 'usage', description: 'Non-ASCII filename' },
  { id: MessageId.PKG_013, severity: 'error', description: 'Reserved name in directory' },
  { id: MessageId.PKG_014, severity: 'warning', description: 'Invalid directory name' },
  { id: MessageId.PKG_015, severity: 'fatal', description: 'Mixed case filename' },
  { id: MessageId.PKG_016, severity: 'warning', description: 'Reserved filename' },
  { id: MessageId.PKG_020, severity: 'error', description: 'OPF file not found' },
  { id: MessageId.PKG_021, severity: 'error', description: 'Unexpected file in META-INF' },
  { id: MessageId.PKG_022, severity: 'warning', description: 'Cannot decrypt encrypted file' },
  { id: MessageId.PKG_023, severity: 'usage', description: 'Encrypted file' },
  { id: MessageId.PKG_024, severity: 'usage', description: 'Obfuscated resource' },
  { id: MessageId.PKG_025, severity: 'error', description: 'Error during validation' },
  { id: MessageId.PKG_027, severity: 'fatal', description: 'Reserved path segment' },

  // OPF errors (OPF-*) - matches Java DefaultSeverities.java
  { id: MessageId.OPF_001, severity: 'error', description: 'Invalid EPUB version' },
  { id: MessageId.OPF_002, severity: 'fatal', description: 'Package document parse error' },
  { id: MessageId.OPF_003, severity: 'usage', description: 'Item not in spine' },
  {
    id: MessageId.OPF_004,
    severity: 'warning',
    description: 'Item referenced but not in manifest',
  },
  { id: MessageId.OPF_005, severity: 'error', description: 'Manifest item href not found' },
  {
    id: MessageId.OPF_006,
    severity: 'error',
    description: 'Spine itemref references missing manifest item',
  },
  { id: MessageId.OPF_007, severity: 'warning', description: 'Redirected resource' },
  { id: MessageId.OPF_008, severity: 'suppressed', description: 'Duplicate manifest item href' },
  { id: MessageId.OPF_009, severity: 'suppressed', description: 'Duplicate manifest item ID' },
  { id: MessageId.OPF_010, severity: 'error', description: 'EPUB 3 must have navigation document' },
  { id: MessageId.OPF_011, severity: 'error', description: 'Itemref spine refers to auxiliary' },
  { id: MessageId.OPF_012, severity: 'error', description: 'Unknown property' },
  { id: MessageId.OPF_013, severity: 'warning', description: 'Remote resource not allowed' },
  { id: MessageId.OPF_014, severity: 'error', description: 'Missing required manifest property' },
  { id: MessageId.OPF_015, severity: 'error', description: 'Invalid guide reference type' },
  { id: MessageId.OPF_016, severity: 'error', description: 'Empty ID attribute' },
  { id: MessageId.OPF_017, severity: 'error', description: 'Invalid element in metadata' },
  { id: MessageId.OPF_030, severity: 'error', description: 'Meta property without refines' },
  { id: MessageId.OPF_031, severity: 'error', description: 'Meta refines missing' },
  { id: MessageId.OPF_033, severity: 'error', description: 'Link without rel' },
  { id: MessageId.OPF_034, severity: 'error', description: 'Link with empty rel' },
  { id: MessageId.OPF_040, severity: 'error', description: 'Duplicated metadata entry' },
  { id: MessageId.OPF_043, severity: 'error', description: 'Invalid dc:date value' },
  { id: MessageId.OPF_045, severity: 'error', description: 'Invalid fallback chain' },
  { id: MessageId.OPF_048, severity: 'error', description: 'Multiple metadata prefixes' },
  { id: MessageId.OPF_049, severity: 'error', description: 'Invalid prefix definition' },
  { id: MessageId.OPF_050, severity: 'error', description: 'Ignored prefix' },
  {
    id: MessageId.OPF_051,
    severity: 'suppressed',
    description: 'Remote resource without property',
  },
  { id: MessageId.OPF_052, severity: 'error', description: 'Vocabulary not ignored' },
  { id: MessageId.OPF_053, severity: 'warning', description: 'Unknown prefix' },
  { id: MessageId.OPF_054, severity: 'error', description: 'Prefix used but not declared' },
  { id: MessageId.OPF_060, severity: 'error', description: 'Collection manifest item not found' },
  { id: MessageId.OPF_071, severity: 'error', description: 'Non-unique ID' },
  { id: MessageId.OPF_072, severity: 'usage', description: 'Duplicate ID' },
  { id: MessageId.OPF_073, severity: 'error', description: 'ID with underscore' },
  { id: MessageId.OPF_074, severity: 'error', description: 'ID with period' },
  { id: MessageId.OPF_075, severity: 'error', description: 'ID with hyphen' },
  { id: MessageId.OPF_088, severity: 'usage', description: 'Bound-media not found' },
  { id: MessageId.OPF_091, severity: 'error', description: 'Fixed-layout metadata' },
  { id: MessageId.OPF_092, severity: 'error', description: 'Invalid rendition metadata' },
  { id: MessageId.OPF_035, severity: 'warning', description: 'Deprecated OEB 1.0 media type' },
  { id: MessageId.OPF_097, severity: 'usage', description: 'Resource in manifest not referenced' },
  {
    id: MessageId.OPF_099,
    severity: 'error',
    description: 'Package document must not be listed in manifest',
  },

  // Resource errors (RSC-*) - matches Java DefaultSeverities.java
  { id: MessageId.RSC_001, severity: 'error', description: 'Could not read resource' },
  { id: MessageId.RSC_002, severity: 'fatal', description: 'Required resource missing' },
  { id: MessageId.RSC_003, severity: 'error', description: 'Resource not found' },
  { id: MessageId.RSC_004, severity: 'info', description: 'Fragment identifier not found' },
  { id: MessageId.RSC_005, severity: 'error', description: 'Schema validation error' },
  { id: MessageId.RSC_006, severity: 'error', description: 'Remote resource not allowed' },
  {
    id: MessageId.RSC_007,
    severity: 'error',
    description: 'Referenced resource not declared in manifest',
  },
  {
    id: MessageId.RSC_007w,
    severity: 'warning',
    description: 'LINK reference not declared in manifest',
  },
  { id: MessageId.RSC_008, severity: 'error', description: 'Undeclared resource in package' },
  { id: MessageId.RSC_009, severity: 'warning', description: 'Non-content document in spine' },
  { id: MessageId.RSC_010, severity: 'error', description: 'Hyperlink to non-spine resource' },
  {
    id: MessageId.RSC_011,
    severity: 'error',
    description: 'Hyperlink to resource not in reading order',
  },
  {
    id: MessageId.RSC_012,
    severity: 'error',
    description: 'Fragment identifier not found in target',
  },
  { id: MessageId.RSC_013, severity: 'error', description: 'Invalid language tag' },
  { id: MessageId.RSC_014, severity: 'error', description: 'Invalid link relation' },
  { id: MessageId.RSC_015, severity: 'error', description: 'Resource not reachable' },
  { id: MessageId.RSC_016, severity: 'fatal', description: 'Fatal error reading resource' },
  { id: MessageId.RSC_017, severity: 'warning', description: 'Resource warning' },
  { id: MessageId.RSC_018, severity: 'suppressed', description: 'Unused resource in package' },
  { id: MessageId.RSC_019, severity: 'warning', description: 'Fallback cycle detected' },
  { id: MessageId.RSC_020, severity: 'error', description: 'Malformed URL' },
  { id: MessageId.RSC_026, severity: 'error', description: 'File URL not allowed in EPUB' },
  { id: MessageId.RSC_027, severity: 'warning', description: 'Absolute path not allowed' },
  {
    id: MessageId.RSC_028,
    severity: 'error',
    description: 'Parent directory reference not allowed',
  },
  { id: MessageId.RSC_029, severity: 'error', description: 'Data URL not allowed in EPUB 3' },
  { id: MessageId.RSC_031, severity: 'warning', description: 'Remote resource warning' },

  // HTML/XHTML errors (HTM-*) - matches Java DefaultSeverities.java
  { id: MessageId.HTM_001, severity: 'error', description: 'Invalid XHTML document' },
  { id: MessageId.HTM_002, severity: 'warning', description: 'Deprecated HTML element' },
  { id: MessageId.HTM_003, severity: 'error', description: 'Entity not declared' },
  { id: MessageId.HTM_004, severity: 'error', description: 'External entity reference' },
  { id: MessageId.HTM_005, severity: 'usage', description: 'Element not allowed in this context' },
  { id: MessageId.HTM_006, severity: 'suppressed', description: 'Required attribute missing' },
  { id: MessageId.HTM_007, severity: 'warning', description: 'Duplicate ID' },
  { id: MessageId.HTM_008, severity: 'suppressed', description: 'Invalid ID value' },
  { id: MessageId.HTM_009, severity: 'error', description: 'HTML5 element in EPUB 2 document' },
  { id: MessageId.HTM_010, severity: 'usage', description: 'Namespace error' },
  { id: MessageId.HTM_011, severity: 'error', description: 'Text content not allowed' },
  { id: MessageId.HTM_012, severity: 'suppressed', description: 'Missing DOCTYPE declaration' },
  { id: MessageId.HTM_013, severity: 'suppressed', description: 'Invalid DOCTYPE' },
  { id: MessageId.HTM_014, severity: 'suppressed', description: 'Invalid content' },
  { id: MessageId.HTM_015, severity: 'suppressed', description: 'Attribute not allowed' },
  { id: MessageId.HTM_016, severity: 'suppressed', description: 'Invalid attribute value' },
  {
    id: MessageId.HTM_017,
    severity: 'suppressed',
    description: 'Heading hierarchy not sequential',
  },
  { id: MessageId.HTM_018, severity: 'suppressed', description: 'Empty heading element' },
  {
    id: MessageId.HTM_019,
    severity: 'suppressed',
    description: 'Anchors linking within same file',
  },
  { id: MessageId.HTM_020, severity: 'suppressed', description: 'SSML phoneme attribute' },
  { id: MessageId.HTM_021, severity: 'suppressed', description: 'Invalid hyperlink target' },
  { id: MessageId.HTM_022, severity: 'suppressed', description: 'Empty href attribute' },
  { id: MessageId.HTM_023, severity: 'suppressed', description: 'External hyperlink' },
  {
    id: MessageId.HTM_024,
    severity: 'suppressed',
    description: 'Hyperlink to non-document resource',
  },
  { id: MessageId.HTM_025, severity: 'warning', description: 'Non-registered data attribute' },
  { id: MessageId.HTM_026, severity: 'warning', description: 'SVG font-face-src reference' },
  { id: MessageId.HTM_027, severity: 'suppressed', description: 'SVG switch element' },
  { id: MessageId.HTM_028, severity: 'suppressed', description: 'Invalid lang attribute value' },
  { id: MessageId.HTM_029, severity: 'suppressed', description: 'Invalid character reference' },
  { id: MessageId.HTM_030, severity: 'error', description: 'Unescaped character' },
  { id: MessageId.HTM_031, severity: 'error', description: 'Duplicate attribute' },
  { id: MessageId.HTM_032, severity: 'error', description: 'Namespace not declared' },
  { id: MessageId.HTM_033, severity: 'suppressed', description: 'Invalid attribute for element' },
  { id: MessageId.HTM_046, severity: 'error', description: 'Nav element must be under epub:type' },
  { id: MessageId.HTM_047, severity: 'error', description: 'Hidden nav element' },
  { id: MessageId.HTM_048, severity: 'error', description: 'Invalid epub:type on nav' },
  { id: MessageId.HTM_049, severity: 'suppressed', description: 'Heading level skip' },
  { id: MessageId.HTM_055, severity: 'usage', description: 'Potential heading skip' },
  { id: MessageId.HTM_060b, severity: 'usage', description: 'Unsafe character' },

  // CSS errors (CSS-*) - matches Java DefaultSeverities.java
  { id: MessageId.CSS_001, severity: 'error', description: 'CSS parse error' },
  { id: MessageId.CSS_002, severity: 'error', description: 'CSS error' },
  { id: MessageId.CSS_003, severity: 'warning', description: 'CSS warning' },
  { id: MessageId.CSS_004, severity: 'error', description: 'CSS syntax error' },
  { id: MessageId.CSS_005, severity: 'usage', description: '@font-face declaration' },
  { id: MessageId.CSS_006, severity: 'usage', description: 'CSS position: fixed' },
  { id: MessageId.CSS_007, severity: 'info', description: '@import statement' },
  { id: MessageId.CSS_008, severity: 'error', description: '@charset error' },
  { id: MessageId.CSS_009, severity: 'suppressed', description: 'Invalid CSS for fixed layout' },
  { id: MessageId.CSS_010, severity: 'suppressed', description: 'CSS property not allowed' },
  { id: MessageId.CSS_011, severity: 'suppressed', description: 'Viewport dimensions in CSS' },
  { id: MessageId.CSS_012, severity: 'suppressed', description: 'Invalid font-face src format' },
  { id: MessageId.CSS_015, severity: 'error', description: 'Alternate stylesheet error' },
  { id: MessageId.CSS_016, severity: 'suppressed', description: 'Vendor-specific CSS property' },
  { id: MessageId.CSS_017, severity: 'suppressed', description: 'Non-standard pseudo element' },
  { id: MessageId.CSS_019, severity: 'warning', description: 'Empty @font-face rule' },
  { id: MessageId.CSS_020, severity: 'suppressed', description: 'Embedded font resource' },
  { id: MessageId.CSS_021, severity: 'suppressed', description: 'Unusual font reference' },
  { id: MessageId.CSS_022, severity: 'suppressed', description: 'OpenType font feature' },
  { id: MessageId.CSS_023, severity: 'suppressed', description: 'Invalid @font-face rule' },
  { id: MessageId.CSS_028, severity: 'usage', description: 'Font reference' },
  { id: MessageId.CSS_029, severity: 'usage', description: 'CSS rule ignored' },
  { id: MessageId.CSS_030, severity: 'error', description: 'CSS declaration ignored' },

  // Navigation errors (NAV-*) - matches Java DefaultSeverities.java
  { id: MessageId.NAV_001, severity: 'error', description: 'Invalid nav element type' },
  { id: MessageId.NAV_002, severity: 'suppressed', description: 'Missing toc nav element' },
  { id: MessageId.NAV_003, severity: 'error', description: 'Navigation heading order incorrect' },
  {
    id: MessageId.NAV_004,
    severity: 'usage',
    description: 'Navigation reference to external resource',
  },
  {
    id: MessageId.NAV_005,
    severity: 'usage',
    description: 'Navigation reference target not found',
  },
  { id: MessageId.NAV_006, severity: 'usage', description: 'Invalid navigation structure' },
  { id: MessageId.NAV_007, severity: 'usage', description: 'Navigation element not found' },
  { id: MessageId.NAV_008, severity: 'usage', description: 'Empty navigation link text' },
  { id: MessageId.NAV_009, severity: 'error', description: 'Nested list without heading' },
  { id: MessageId.NAV_010, severity: 'error', description: 'Missing page nav in EPUB 3' },

  // NCX errors (NCX-*) - matches Java DefaultSeverities.java
  { id: MessageId.NCX_001, severity: 'error', description: 'NCX parse error' },
  { id: MessageId.NCX_002, severity: 'suppressed', description: 'Invalid NCX reference' },
  { id: MessageId.NCX_003, severity: 'suppressed', description: 'NavPoint missing text content' },
  { id: MessageId.NCX_004, severity: 'usage', description: 'NCX reference not found' },
  { id: MessageId.NCX_005, severity: 'suppressed', description: 'NCX required for EPUB 2' },
  { id: MessageId.NCX_006, severity: 'usage', description: 'NCX depth attribute invalid' },

  // Accessibility errors (ACC-*) - matches Java DefaultSeverities.java (all SUPPRESSED except ACC-009, ACC-011)
  { id: MessageId.ACC_001, severity: 'suppressed', description: 'Image missing alt text' },
  {
    id: MessageId.ACC_002,
    severity: 'suppressed',
    description: 'Missing schema:accessibilityFeature metadata',
  },
  { id: MessageId.ACC_003, severity: 'suppressed', description: 'Missing accessibility metadata' },
  { id: MessageId.ACC_004, severity: 'suppressed', description: 'Anchor element must have text' },
  { id: MessageId.ACC_005, severity: 'suppressed', description: 'Image missing alt attribute' },
  {
    id: MessageId.ACC_006,
    severity: 'suppressed',
    description: 'Table headers should use th elements',
  },
  { id: MessageId.ACC_007, severity: 'suppressed', description: 'Page list source not identified' },
  { id: MessageId.ACC_008, severity: 'suppressed', description: 'Page numbering has gaps' },
  {
    id: MessageId.ACC_009,
    severity: 'usage',
    description: 'MathML missing alttext or annotation-xml',
  },
  {
    id: MessageId.ACC_010,
    severity: 'suppressed',
    description: 'Missing schema:accessMode metadata',
  },
  { id: MessageId.ACC_011, severity: 'usage', description: 'SVG hyperlink has no accessible name' },
  {
    id: MessageId.ACC_012,
    severity: 'suppressed',
    description: 'Table should include caption element',
  },
  {
    id: MessageId.ACC_013,
    severity: 'suppressed',
    description: 'Complex image missing aria-describedby',
  },
  { id: MessageId.ACC_014, severity: 'suppressed', description: 'Empty table header cell' },
  {
    id: MessageId.ACC_015,
    severity: 'suppressed',
    description: 'Table missing summary or caption',
  },
  { id: MessageId.ACC_016, severity: 'suppressed', description: 'Visual adjustments not allowed' },
  { id: MessageId.ACC_017, severity: 'suppressed', description: 'Missing schema.org accessMode' },

  // Media errors (MED-*) - matches Java DefaultSeverities.java
  { id: MessageId.MED_001, severity: 'suppressed', description: 'Invalid media type' },
  { id: MessageId.MED_002, severity: 'suppressed', description: 'Media overlay error' },
  { id: MessageId.MED_003, severity: 'error', description: 'Audio codec may not be supported' },
  { id: MessageId.MED_004, severity: 'error', description: 'Video codec may not be supported' },
  {
    id: MessageId.MED_005,
    severity: 'error',
    description: 'Non-core media type requires fallback',
  },
  { id: MessageId.MED_006, severity: 'suppressed', description: 'Invalid media fallback chain' },
  { id: MessageId.MED_007, severity: 'error', description: 'Foreign resource without fallback' },
  { id: MessageId.MED_008, severity: 'error', description: 'Invalid image format' },
  { id: MessageId.MED_009, severity: 'error', description: 'Video missing poster' },
  { id: MessageId.MED_010, severity: 'error', description: 'Audio element missing source' },
  { id: MessageId.MED_011, severity: 'error', description: 'Video dimensions not specified' },
  { id: MessageId.MED_012, severity: 'error', description: 'Media duration not specified' },
  { id: MessageId.MED_013, severity: 'error', description: 'Invalid cover image' },
  { id: MessageId.MED_014, severity: 'error', description: 'Cover image dimensions error' },
  { id: MessageId.MED_015, severity: 'usage', description: 'SMIL file not found' },
  { id: MessageId.MED_016, severity: 'warning', description: 'Media overlay metadata' },

  // Scripting errors (SCP-*) - matches Java DefaultSeverities.java (all SUPPRESSED)
  { id: MessageId.SCP_001, severity: 'suppressed', description: 'Scripting used in publication' },
  {
    id: MessageId.SCP_002,
    severity: 'suppressed',
    description: 'Script in spine content document',
  },
  { id: MessageId.SCP_003, severity: 'suppressed', description: 'Inline script element' },
  {
    id: MessageId.SCP_004,
    severity: 'suppressed',
    description: 'Event handler attribute detected',
  },
  { id: MessageId.SCP_005, severity: 'suppressed', description: 'Script not declared in manifest' },
  { id: MessageId.SCP_006, severity: 'suppressed', description: 'JavaScript URL not allowed' },
  { id: MessageId.SCP_007, severity: 'suppressed', description: 'Container-constrained script' },
  {
    id: MessageId.SCP_008,
    severity: 'suppressed',
    description: 'Scripted content missing properties',
  },
  { id: MessageId.SCP_009, severity: 'suppressed', description: 'Script execution error' },
  { id: MessageId.SCP_010, severity: 'suppressed', description: 'EPUB CFI URL detected' },
  { id: MessageId.SCP_011, severity: 'suppressed', description: 'Script loading error' },

  // Schematron errors (SCH-*) - matches Java DefaultSeverities.java
  { id: MessageId.SCH_001, severity: 'error', description: 'Schematron assertion failed' },
  { id: MessageId.SCH_002, severity: 'error', description: 'Schematron report failed' },

  // Internal checker errors (CHK-*) - matches Java DefaultSeverities.java
  { id: MessageId.CHK_001, severity: 'error', description: 'Internal checker error' },
  { id: MessageId.CHK_002, severity: 'error', description: 'XML/HTML parser error' },
  { id: MessageId.CHK_003, severity: 'error', description: 'Schema validation error' },
  { id: MessageId.CHK_004, severity: 'error', description: 'Resource read error' },
  { id: MessageId.CHK_005, severity: 'error', description: 'Validation timeout' },
  { id: MessageId.CHK_006, severity: 'error', description: 'Memory limit exceeded' },
  { id: MessageId.CHK_007, severity: 'error', description: 'Unknown error' },
];

/**
 * Map for quick lookup of message info by ID
 */
export const MESSAGE_MAP = new Map<string, MessageInfo>(
  MESSAGE_REGISTRY.map((info) => [info.id, info]),
);

/**
 * Get default severity for a message ID
 */
export function getDefaultSeverity(id: string): MessageSeverity {
  const info = MESSAGE_MAP.get(id);
  return info?.severity ?? 'error';
}

/**
 * Format message list for console output
 */
export function formatMessageList(): string {
  const lines: string[] = [];
  lines.push('ID\tSEVERITY\tDESCRIPTION');
  lines.push('─'.repeat(80));

  for (const msg of MESSAGE_REGISTRY) {
    const severity = msg.severity.toUpperCase();
    lines.push(`${msg.id}\t${severity}\t${msg.description}`);
  }

  return lines.join('\n');
}

/**
 * Branded type for Schematron message IDs
 * Schematron IDs follow the pattern "SCH-{number}" where the number is the assertion ID
 */
export type SchematronMessageId = `SCH-${string}`;

/**
 * Union type of all valid message ID types
 */
export type ValidMessageId = MessageId | SchematronMessageId;

/**
 * Options for creating a validation message
 */
export interface CreateMessageOptions {
  /** Message ID (from MessageId enum or Schematron message ID) */
  id: ValidMessageId;
  /** Human-readable message */
  message: string;
  /** Location where the issue was found */
  location?: EPUBLocation;
  /** Suggestion for fixing the issue */
  suggestion?: string;
  /** Override the default severity (use sparingly) */
  severityOverride?: Severity;
}

/**
 * Create a validation message with automatic severity lookup from registry
 *
 * @example
 * ```typescript
 * const msg = createMessage({
 *   id: MessageId.PKG_006,
 *   message: 'Missing mimetype file',
 *   location: { path: 'mimetype' },
 * });
 * context.messages.push(msg);
 * ```
 */
export function createMessage(options: CreateMessageOptions): ValidationMessage | null {
  const { id, message, location, suggestion, severityOverride } = options;

  const registeredSeverity = getDefaultSeverity(id);

  // Skip suppressed messages unless severity is overridden
  if (registeredSeverity === 'suppressed' && !severityOverride) {
    return null;
  }

  const severity: Severity = severityOverride ?? (registeredSeverity as Severity);

  const result: ValidationMessage = {
    id,
    severity,
    message,
  };

  if (location) {
    result.location = location;
  }

  if (suggestion) {
    result.suggestion = suggestion;
  }

  return result;
}

/**
 * Create and push a validation message to the messages array
 * Automatically handles suppressed messages by not pushing them
 *
 * @example
 * ```typescript
 * pushMessage(context.messages, {
 *   id: MessageId.PKG_006,
 *   message: 'Missing mimetype file',
 *   location: { path: 'mimetype' },
 * });
 * ```
 */
export function pushMessage(messages: ValidationMessage[], options: CreateMessageOptions): void {
  const msg = createMessage(options);
  if (msg) {
    messages.push(msg);
  }
}
