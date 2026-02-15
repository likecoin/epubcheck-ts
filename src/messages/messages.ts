/**
 * Message Definitions for EPUB validation errors and warnings
 *
 * This file is the single source of truth for all message IDs, severities, and descriptions.
 * IDs are compatible with the Java EPUBCheck implementation for consistent error reporting.
 *
 * Prefix meanings:
 * - ACC: Accessibility
 * - CHK: Internal checker errors
 * - CSS: CSS validation
 * - HTM: HTML/XHTML content
 * - MED: Media (audio, video, images)
 * - NAV: Navigation document
 * - NCX: NCX (EPUB 2 navigation)
 * - OPF: Package document
 * - PKG: Package/container level
 * - RSC: Resources
 * - SCH: Schematron validation
 * - SCP: Scripting
 *
 * Severity levels:
 * - FATAL: Unrecoverable errors that prevent validation
 * - ERROR: Specification violations
 * - WARNING: Best practice violations or potential issues
 * - INFO: Informational messages
 * - USAGE: Feature usage information (off by default)
 * - SUPPRESSED: Disabled by default (can be enabled via customMessages)
 *
 * Reference: Java EPUBCheck DefaultSeverities.java and MessageBundle.properties
 */

import type { EPUBLocation, Severity, ValidationMessage } from '../types.js';

export type MessageSeverity = Severity | 'suppressed';

interface MessageDef {
  readonly id: string;
  readonly severity: MessageSeverity;
  readonly description: string;
}

/**
 * All message definitions with their IDs, severities, and descriptions.
 * Severities match Java EPUBCheck DefaultSeverities.java
 * Descriptions match Java EPUBCheck MessageBundle.properties
 */
const MessageDefs = {
  // Package/Container errors (PKG-*)
  PKG_001: {
    id: 'PKG-001',
    severity: 'warning',
    description: 'Validating against one version but detected another',
  },
  PKG_003: {
    id: 'PKG-003',
    severity: 'error',
    description: 'Unable to read EPUB file header, likely corrupted',
  },
  PKG_004: { id: 'PKG-004', severity: 'fatal', description: 'Corrupted EPUB ZIP header' },
  PKG_005: {
    id: 'PKG-005',
    severity: 'error',
    description: 'Mimetype file has extra field, not permitted',
  },
  PKG_006: {
    id: 'PKG-006',
    severity: 'error',
    description: 'Mimetype file entry missing or not first in archive',
  },
  PKG_007: {
    id: 'PKG-007',
    severity: 'error',
    description: 'Mimetype must contain only "application/epub+zip" and not be compressed',
  },
  PKG_008: { id: 'PKG-008', severity: 'fatal', description: 'Unable to read file' },
  PKG_009: {
    id: 'PKG-009',
    severity: 'error',
    description: 'File name contains characters not allowed in OCF',
  },
  PKG_010: {
    id: 'PKG-010',
    severity: 'warning',
    description: 'File name contains spaces, may cause interoperability issues',
  },
  PKG_011: {
    id: 'PKG-011',
    severity: 'error',
    description: 'File name not allowed to end with "."',
  },
  PKG_012: {
    id: 'PKG-012',
    severity: 'usage',
    description: 'File name contains non-ASCII characters',
  },
  PKG_013: {
    id: 'PKG-013',
    severity: 'error',
    description: 'EPUB file includes multiple OPS renditions',
  },
  PKG_014: {
    id: 'PKG-014',
    severity: 'warning',
    description: 'EPUB contains empty directory',
  },
  PKG_015: { id: 'PKG-015', severity: 'fatal', description: 'Unable to read EPUB contents' },
  PKG_016: {
    id: 'PKG-016',
    severity: 'warning',
    description: 'Use only lowercase for EPUB file extension',
  },
  PKG_017: { id: 'PKG-017', severity: 'warning', description: 'Uncommon EPUB file extension' },
  PKG_018: { id: 'PKG-018', severity: 'fatal', description: 'EPUB file could not be found' },
  PKG_020: { id: 'PKG-020', severity: 'error', description: 'OPF file could not be found' },
  PKG_021: { id: 'PKG-021', severity: 'error', description: 'Corrupted image file encountered' },
  PKG_022: {
    id: 'PKG-022',
    severity: 'warning',
    description: 'Wrong file extension for image',
  },
  PKG_023: {
    id: 'PKG-023',
    severity: 'usage',
    description: 'Validating against version 2.0, default profile used',
  },
  PKG_024: { id: 'PKG-024', severity: 'usage', description: 'Uncommon EPUB file extension' },
  PKG_025: {
    id: 'PKG-025',
    severity: 'error',
    description: 'Publication resource must not be in META-INF directory',
  },
  PKG_026: {
    id: 'PKG-026',
    severity: 'error',
    description: 'Obfuscated resource must be a Font Core Media Type',
  },
  PKG_027: {
    id: 'PKG-027',
    severity: 'fatal',
    description: 'Could not extract EPUB ZIP content, file names not UTF-8',
  },

  // OPF errors (OPF-*)
  OPF_001: {
    id: 'OPF-001',
    severity: 'error',
    description: 'Error parsing EPUB version',
  },
  OPF_002: {
    id: 'OPF-002',
    severity: 'fatal',
    description: 'OPF file was not found in the EPUB',
  },
  OPF_003: {
    id: 'OPF-003',
    severity: 'usage',
    description: 'Item exists in EPUB but not declared in OPF manifest',
  },
  OPF_004: {
    id: 'OPF-004',
    severity: 'warning',
    description: 'Invalid prefix declaration: leading or trailing whitespace',
  },
  OPF_005: {
    id: 'OPF-005',
    severity: 'error',
    description: 'Invalid prefix declaration: URI does not exist',
  },
  OPF_006: {
    id: 'OPF-006',
    severity: 'error',
    description: 'Invalid prefix declaration: URI is not valid',
  },
  OPF_007: {
    id: 'OPF-007',
    severity: 'warning',
    description: 'Re-declaration of reserved prefix',
  },
  OPF_008: { id: 'OPF-008', severity: 'suppressed', description: 'Duplicate entry in ZIP file' },
  OPF_009: { id: 'OPF-009', severity: 'suppressed', description: 'Duplicate manifest item ID' },
  OPF_010: {
    id: 'OPF-010',
    severity: 'error',
    description: 'Error resolving reference',
  },
  OPF_011: {
    id: 'OPF-011',
    severity: 'error',
    description: 'itemref cannot have both page-spread-right and page-spread-left',
  },
  OPF_012: {
    id: 'OPF-012',
    severity: 'error',
    description: 'Item property not defined for media type',
  },
  OPF_013: {
    id: 'OPF-013',
    severity: 'warning',
    description: 'Resource MIME type in content differs from package document',
  },
  OPF_014: {
    id: 'OPF-014',
    severity: 'error',
    description: 'Property should be declared in OPF file',
  },
  OPF_015: {
    id: 'OPF-015',
    severity: 'error',
    description: 'Property should not be declared in OPF file',
  },
  OPF_016: {
    id: 'OPF-016',
    severity: 'error',
    description: 'Rootfile element missing required full-path attribute',
  },
  OPF_017: {
    id: 'OPF-017',
    severity: 'error',
    description: 'Full-path attribute on rootfile must not be empty',
  },
  OPF_018: {
    id: 'OPF-018',
    severity: 'warning',
    description: 'remote-resources property declared but no remote references found',
  },
  OPF_021: {
    id: 'OPF-021',
    severity: 'warning',
    description: 'Use of non-registered URI scheme type in href',
  },
  OPF_025: {
    id: 'OPF-025',
    severity: 'error',
    description: 'Property value list not allowed, only one value permitted',
  },
  OPF_026: { id: 'OPF-026', severity: 'error', description: 'Malformed property value' },
  OPF_027: { id: 'OPF-027', severity: 'error', description: 'Undefined property' },
  OPF_028: { id: 'OPF-028', severity: 'error', description: 'Undeclared prefix' },
  OPF_029: {
    id: 'OPF-029',
    severity: 'error',
    description: 'File does not match media type specified in OPF',
  },
  OPF_030: {
    id: 'OPF-030',
    severity: 'error',
    description: 'Unique-identifier not found',
  },
  OPF_031: {
    id: 'OPF-031',
    severity: 'error',
    description: 'File in guide reference not declared in manifest',
  },
  OPF_032: {
    id: 'OPF-032',
    severity: 'error',
    description: 'Guide references item that is not valid OPS Content Document',
  },
  OPF_033: {
    id: 'OPF-033',
    severity: 'error',
    description: 'Spine contains no linear resources',
  },
  OPF_034: {
    id: 'OPF-034',
    severity: 'error',
    description: 'Spine contains multiple references to same manifest item',
  },
  OPF_035: {
    id: 'OPF-035',
    severity: 'warning',
    description: 'Media type text/html not appropriate for XHTML/OPS',
  },
  OPF_036: {
    id: 'OPF-036',
    severity: 'usage',
    description: 'Video type might not be supported by reading systems',
  },
  OPF_037: { id: 'OPF-037', severity: 'warning', description: 'Deprecated media-type found' },
  OPF_038: {
    id: 'OPF-038',
    severity: 'warning',
    description: 'Media type not appropriate for OEBPS 1.2 context',
  },
  OPF_039: {
    id: 'OPF-039',
    severity: 'warning',
    description: 'Media type not appropriate for OEBPS 1.2 context',
  },
  OPF_040: {
    id: 'OPF-040',
    severity: 'error',
    description: 'Fallback item could not be found',
  },
  OPF_041: {
    id: 'OPF-041',
    severity: 'error',
    description: 'Fallback-style item could not be found',
  },
  OPF_042: {
    id: 'OPF-042',
    severity: 'error',
    description: 'Not a permissible spine media-type',
  },
  OPF_043: {
    id: 'OPF-043',
    severity: 'error',
    description: 'Spine item with non-standard media-type has no fallback',
  },
  OPF_044: {
    id: 'OPF-044',
    severity: 'error',
    description: 'Spine item with non-standard media-type has no content document fallback',
  },
  OPF_045: {
    id: 'OPF-045',
    severity: 'error',
    description: 'Circular reference in fallback chain',
  },
  OPF_046: { id: 'OPF-046', severity: 'suppressed', description: 'Deprecated OPF construct' },
  OPF_047: {
    id: 'OPF-047',
    severity: 'usage',
    description: 'OPF using OEBPS 1.2 syntax for backwards compatibility',
  },
  OPF_048: {
    id: 'OPF-048',
    severity: 'error',
    description: 'Package tag missing required unique-identifier attribute',
  },
  OPF_049: {
    id: 'OPF-049',
    severity: 'error',
    description: 'Item id not found in manifest',
  },
  OPF_050: {
    id: 'OPF-050',
    severity: 'error',
    description: 'TOC attribute references resource with non-NCX mime type',
  },
  OPF_051: {
    id: 'OPF-051',
    severity: 'suppressed',
    description: 'Image dimensions exceed recommended size',
  },
  OPF_052: { id: 'OPF-052', severity: 'error', description: 'Role value is not valid' },
  OPF_053: {
    id: 'OPF-053',
    severity: 'warning',
    description: 'Date value does not follow recommended syntax',
  },
  OPF_054: { id: 'OPF-054', severity: 'error', description: 'Date value is not valid' },
  OPF_055: { id: 'OPF-055', severity: 'warning', description: 'Tag is empty' },
  OPF_056: { id: 'OPF-056', severity: 'suppressed', description: 'Deprecated OPF construct' },
  OPF_057: {
    id: 'OPF-057',
    severity: 'suppressed',
    description: 'Image file length exceeds recommended size',
  },
  OPF_058: { id: 'OPF-058', severity: 'suppressed', description: 'Deprecated OPF construct' },
  OPF_059: { id: 'OPF-059', severity: 'suppressed', description: 'Deprecated OPF construct' },
  OPF_060: {
    id: 'OPF-060',
    severity: 'error',
    description: 'Duplicate entry in ZIP file',
  },
  OPF_062: {
    id: 'OPF-062',
    severity: 'usage',
    description: 'Found Adobe page-map attribute on spine element',
  },
  OPF_063: {
    id: 'OPF-063',
    severity: 'warning',
    description: 'Referenced Adobe page-map item not found in manifest',
  },
  OPF_064: {
    id: 'OPF-064',
    severity: 'info',
    description: 'OPF declares type, validating using profile',
  },
  OPF_065: {
    id: 'OPF-065',
    severity: 'error',
    description: 'Invalid metadata declaration, probably cycle in refines',
  },
  OPF_066: {
    id: 'OPF-066',
    severity: 'error',
    description: 'Missing dc:source or source-of pagination metadata',
  },
  OPF_067: {
    id: 'OPF-067',
    severity: 'error',
    description: 'Resource must not be listed as both link and manifest item',
  },
  OPF_068: { id: 'OPF-068', severity: 'suppressed', description: 'Deprecated OPF construct' },
  OPF_069: { id: 'OPF-069', severity: 'suppressed', description: 'Deprecated OPF construct' },
  OPF_070: {
    id: 'OPF-070',
    severity: 'warning',
    description: 'Custom collection role is an invalid URL',
  },
  OPF_071: {
    id: 'OPF-071',
    severity: 'error',
    description: 'Index collections must only contain XHTML Content Documents',
  },
  OPF_072: { id: 'OPF-072', severity: 'usage', description: 'Metadata element is empty' },
  OPF_073: {
    id: 'OPF-073',
    severity: 'error',
    description: 'External identifiers must not appear in document type declaration',
  },
  OPF_074: {
    id: 'OPF-074',
    severity: 'error',
    description: 'Package resource declared in several manifest items',
  },
  OPF_075: {
    id: 'OPF-075',
    severity: 'error',
    description: 'Preview collections must only point to EPUB Content Documents',
  },
  OPF_076: {
    id: 'OPF-076',
    severity: 'error',
    description: 'Preview collection link URI must not include EPUB CFI',
  },
  OPF_077: {
    id: 'OPF-077',
    severity: 'warning',
    description: 'Data Navigation Document should not be in spine',
  },
  OPF_078: {
    id: 'OPF-078',
    severity: 'error',
    description: 'EPUB Dictionary must contain at least one dictionary content document',
  },
  OPF_079: {
    id: 'OPF-079',
    severity: 'warning',
    description: 'Dictionary content found, should declare dc:type dictionary',
  },
  OPF_080: {
    id: 'OPF-080',
    severity: 'warning',
    description: 'Search Key Map document should have .xml extension',
  },
  OPF_081: {
    id: 'OPF-081',
    severity: 'error',
    description: 'Resource referenced from Dictionary collection not found',
  },
  OPF_082: {
    id: 'OPF-082',
    severity: 'error',
    description: 'Dictionary collection contains more than one Search Key Map',
  },
  OPF_083: {
    id: 'OPF-083',
    severity: 'error',
    description: 'Dictionary collection contains no Search Key Map Document',
  },
  OPF_084: {
    id: 'OPF-084',
    severity: 'error',
    description: 'Dictionary collection contains invalid resource type',
  },
  OPF_085: {
    id: 'OPF-085',
    severity: 'warning',
    description: 'dc:identifier marked as UUID but is invalid UUID',
  },
  OPF_086: {
    id: 'OPF-086',
    severity: 'warning',
    description: 'Property is deprecated',
  },
  OPF_087: {
    id: 'OPF-087',
    severity: 'usage',
    description: 'epub:type value not allowed on this document type',
  },
  OPF_088: {
    id: 'OPF-088',
    severity: 'usage',
    description: 'Unrecognized epub:type value',
  },
  OPF_089: {
    id: 'OPF-089',
    severity: 'error',
    description: 'alternate link rel keyword cannot be paired with other keywords',
  },
  OPF_090: {
    id: 'OPF-090',
    severity: 'usage',
    description: 'Encouraged to use different MIME media type',
  },
  OPF_091: {
    id: 'OPF-091',
    severity: 'error',
    description: 'Item href URL must not have fragment identifier',
  },
  OPF_092: {
    id: 'OPF-092',
    severity: 'error',
    description: 'Language tag is not well-formed',
  },
  OPF_093: {
    id: 'OPF-093',
    severity: 'error',
    description: 'media-type attribute required for linked resources in container',
  },
  OPF_094: {
    id: 'OPF-094',
    severity: 'error',
    description: 'media-type attribute required for this link type',
  },
  OPF_095: {
    id: 'OPF-095',
    severity: 'error',
    description: 'voicing links media-type must be audio MIME type',
  },
  OPF_096: {
    id: 'OPF-096',
    severity: 'error',
    description: 'Non-linear content must be reachable, no hyperlink found',
  },
  OPF_096b: {
    id: 'OPF-096b',
    severity: 'usage',
    description: 'Non-linear content has no hyperlink but scripting is present',
  },
  OPF_097: {
    id: 'OPF-097',
    severity: 'usage',
    description: 'Resource in manifest but no reference found in content documents',
  },
  OPF_098: {
    id: 'OPF-098',
    severity: 'error',
    description: 'href must reference resources, not elements in package document',
  },
  OPF_099: {
    id: 'OPF-099',
    severity: 'error',
    description: 'Manifest must not list the package document',
  },

  // Resource errors (RSC-*)
  RSC_001: { id: 'RSC-001', severity: 'error', description: 'File could not be found' },
  RSC_002: {
    id: 'RSC-002',
    severity: 'fatal',
    description: 'Required META-INF/container.xml could not be found',
  },
  RSC_003: {
    id: 'RSC-003',
    severity: 'error',
    description: 'No rootfile with media type application/oebps-package+xml found',
  },
  RSC_004: {
    id: 'RSC-004',
    severity: 'info',
    description: 'File is encrypted, content will not be checked',
  },
  RSC_005: { id: 'RSC-005', severity: 'error', description: 'Error while parsing file' },
  RSC_006: {
    id: 'RSC-006',
    severity: 'error',
    description: 'Remote resource reference not allowed, must be in EPUB container',
  },
  RSC_007: {
    id: 'RSC-007',
    severity: 'error',
    description: 'Referenced resource could not be found in EPUB',
  },
  RSC_007w: {
    id: 'RSC-007w',
    severity: 'warning',
    description: 'Referenced resource could not be found in EPUB',
  },
  RSC_008: {
    id: 'RSC-008',
    severity: 'error',
    description: 'Referenced resource not declared in OPF manifest',
  },
  RSC_009: {
    id: 'RSC-009',
    severity: 'warning',
    description: 'Non-SVG image resource should not have fragment identifier',
  },
  RSC_010: {
    id: 'RSC-010',
    severity: 'error',
    description: 'Reference to non-standard resource type found',
  },
  RSC_011: {
    id: 'RSC-011',
    severity: 'error',
    description: 'Found reference to resource that is not a spine item',
  },
  RSC_012: {
    id: 'RSC-012',
    severity: 'error',
    description: 'Fragment identifier is not defined',
  },
  RSC_013: {
    id: 'RSC-013',
    severity: 'error',
    description: 'Fragment identifier used in reference to stylesheet',
  },
  RSC_014: {
    id: 'RSC-014',
    severity: 'error',
    description: 'Fragment identifier defines incompatible resource type',
  },
  RSC_015: {
    id: 'RSC-015',
    severity: 'error',
    description: 'Fragment identifier required for svg use tag references',
  },
  RSC_016: { id: 'RSC-016', severity: 'fatal', description: 'Fatal error while parsing file' },
  RSC_017: { id: 'RSC-017', severity: 'warning', description: 'Warning while parsing file' },
  RSC_018: { id: 'RSC-018', severity: 'suppressed', description: 'Unused resource in package' },
  RSC_019: {
    id: 'RSC-019',
    severity: 'warning',
    description: 'EPUBs with Multiple Renditions should have META-INF/metadata.xml',
  },
  RSC_020: { id: 'RSC-020', severity: 'error', description: 'URL is not valid' },
  RSC_021: {
    id: 'RSC-021',
    severity: 'error',
    description: 'Search Key Map must point to Content Documents in spine',
  },
  RSC_022: {
    id: 'RSC-022',
    severity: 'info',
    description: 'Cannot check image details (requires Java 7+)',
  },
  RSC_023: { id: 'RSC-023', severity: 'suppressed', description: 'Informative parsing info' },
  RSC_024: { id: 'RSC-024', severity: 'usage', description: 'Informative parsing warning' },
  RSC_025: { id: 'RSC-025', severity: 'usage', description: 'Informative parsing error' },
  RSC_026: {
    id: 'RSC-026',
    severity: 'error',
    description: 'URL leaks outside container, not valid relative-ocf-URL',
  },
  RSC_027: {
    id: 'RSC-027',
    severity: 'warning',
    description: 'XML document encoded in UTF-16, should be UTF-8',
  },
  RSC_028: {
    id: 'RSC-028',
    severity: 'error',
    description: 'XML documents must be encoded in UTF-8',
  },
  RSC_029: {
    id: 'RSC-029',
    severity: 'error',
    description: 'Data URL is not allowed in this context',
  },
  RSC_030: {
    id: 'RSC-030',
    severity: 'error',
    description: 'File URLs are not allowed in EPUB',
  },
  RSC_031: {
    id: 'RSC-031',
    severity: 'warning',
    description: 'Remote resource references should use HTTPS',
  },
  RSC_032: {
    id: 'RSC-032',
    severity: 'error',
    description: 'Fallback must be provided for foreign resources',
  },
  RSC_033: {
    id: 'RSC-033',
    severity: 'error',
    description: 'Relative URL strings must not have query component',
  },

  // HTML/XHTML errors (HTM-*)
  HTM_001: {
    id: 'HTM-001',
    severity: 'error',
    description: 'XML-based media type must be valid XML 1.0 document',
  },
  HTM_002: {
    id: 'HTM-002',
    severity: 'warning',
    description: 'XML parser does not support xml version verification',
  },
  HTM_003: {
    id: 'HTM-003',
    severity: 'error',
    description: 'External entities not allowed in EPUB v3 documents',
  },
  HTM_004: { id: 'HTM-004', severity: 'error', description: 'Irregular DOCTYPE found' },
  HTM_005: { id: 'HTM-005', severity: 'usage', description: 'External reference found' },
  HTM_006: { id: 'HTM-006', severity: 'suppressed', description: 'Required attribute missing' },
  HTM_007: {
    id: 'HTM-007',
    severity: 'warning',
    description: 'Empty or whitespace-only value of ssml:ph attribute',
  },
  HTM_008: { id: 'HTM-008', severity: 'suppressed', description: 'Invalid ID value' },
  HTM_009: {
    id: 'HTM-009',
    severity: 'error',
    description: 'DOCTYPE is obsolete or irregular, can be removed',
  },
  HTM_010: {
    id: 'HTM-010',
    severity: 'usage',
    description: 'Namespace unusual for epub prefix',
  },
  HTM_011: { id: 'HTM-011', severity: 'error', description: 'Entity is undeclared' },
  HTM_012: { id: 'HTM-012', severity: 'suppressed', description: 'Missing DOCTYPE declaration' },
  HTM_013: { id: 'HTM-013', severity: 'suppressed', description: 'Invalid DOCTYPE' },
  HTM_014: { id: 'HTM-014', severity: 'suppressed', description: 'Invalid content' },
  HTM_015: { id: 'HTM-015', severity: 'suppressed', description: 'Attribute not allowed' },
  HTM_016: { id: 'HTM-016', severity: 'suppressed', description: 'Invalid attribute value' },
  HTM_017: {
    id: 'HTM-017',
    severity: 'suppressed',
    description: 'Heading hierarchy not sequential',
  },
  HTM_018: { id: 'HTM-018', severity: 'suppressed', description: 'Empty heading element' },
  HTM_019: {
    id: 'HTM-019',
    severity: 'suppressed',
    description: 'Anchors linking within same file',
  },
  HTM_020: { id: 'HTM-020', severity: 'suppressed', description: 'SSML phoneme attribute' },
  HTM_021: { id: 'HTM-021', severity: 'suppressed', description: 'Invalid hyperlink target' },
  HTM_022: { id: 'HTM-022', severity: 'suppressed', description: 'Empty href attribute' },
  HTM_023: { id: 'HTM-023', severity: 'suppressed', description: 'External hyperlink' },
  HTM_024: {
    id: 'HTM-024',
    severity: 'suppressed',
    description: 'Hyperlink to non-document resource',
  },
  HTM_025: {
    id: 'HTM-025',
    severity: 'warning',
    description: 'Non-registered URI scheme type in href',
  },
  HTM_027: { id: 'HTM-027', severity: 'suppressed', description: 'SVG switch element' },
  HTM_028: { id: 'HTM-028', severity: 'suppressed', description: 'Invalid lang attribute value' },
  HTM_029: { id: 'HTM-029', severity: 'suppressed', description: 'Invalid character reference' },
  HTM_033: { id: 'HTM-033', severity: 'suppressed', description: 'Invalid attribute for element' },
  HTM_036: { id: 'HTM-036', severity: 'suppressed', description: 'Deprecated HTML construct' },
  HTM_038: { id: 'HTM-038', severity: 'suppressed', description: 'Deprecated HTML construct' },
  HTM_044: {
    id: 'HTM-044',
    severity: 'usage',
    description: 'Namespace URI included but not used',
  },
  HTM_045: { id: 'HTM-045', severity: 'usage', description: 'Encountered empty href' },
  HTM_046: {
    id: 'HTM-046',
    severity: 'error',
    description: 'Fixed layout document has no viewport meta element',
  },
  HTM_047: {
    id: 'HTM-047',
    severity: 'error',
    description: 'Viewport metadata has syntax error',
  },
  HTM_048: {
    id: 'HTM-048',
    severity: 'error',
    description: 'SVG Fixed-Layout must have viewBox attribute on outermost svg',
  },
  HTM_049: { id: 'HTM-049', severity: 'suppressed', description: 'Heading level skip' },
  HTM_050: { id: 'HTM-050', severity: 'suppressed', description: 'Deprecated HTML construct' },
  HTM_051: {
    id: 'HTM-051',
    severity: 'warning',
    description: 'Found Microdata but no RDFa, EDUPUB recommends RDFa Lite',
  },
  HTM_052: {
    id: 'HTM-052',
    severity: 'error',
    description: 'region-based property only allowed in Data Navigation Documents',
  },
  HTM_053: { id: 'HTM-053', severity: 'suppressed', description: 'Deprecated HTML construct' },
  HTM_054: {
    id: 'HTM-054',
    severity: 'error',
    description: 'Custom attribute namespace must not include certain strings',
  },
  HTM_055: {
    id: 'HTM-055',
    severity: 'usage',
    description: 'Element should not be used (discouraged construct)',
  },
  HTM_056: {
    id: 'HTM-056',
    severity: 'error',
    description: 'Viewport metadata missing required dimension',
  },
  HTM_057: {
    id: 'HTM-057',
    severity: 'error',
    description: 'Viewport value must be positive number or device keyword',
  },
  HTM_058: {
    id: 'HTM-058',
    severity: 'error',
    description: 'HTML documents must be UTF-8, but UTF-16 detected',
  },
  HTM_059: {
    id: 'HTM-059',
    severity: 'error',
    description: 'Viewport property must not be defined more than once',
  },
  HTM_060a: {
    id: 'HTM-060a',
    severity: 'usage',
    description: 'Secondary viewport meta in fixed-layout will be ignored',
  },
  HTM_060b: {
    id: 'HTM-060b',
    severity: 'usage',
    description: 'Viewport meta in reflowable documents will be ignored',
  },
  HTM_061: {
    id: 'HTM-061',
    severity: 'error',
    description: 'Invalid custom data attribute',
  },

  // CSS errors (CSS-*)
  CSS_001: {
    id: 'CSS-001',
    severity: 'error',
    description: 'Property must not be included in EPUB Style Sheet',
  },
  CSS_002: { id: 'CSS-002', severity: 'error', description: 'Empty or NULL reference found' },
  CSS_003: {
    id: 'CSS-003',
    severity: 'warning',
    description: 'CSS encoded in UTF-16, should be UTF-8',
  },
  CSS_004: {
    id: 'CSS-004',
    severity: 'error',
    description: 'CSS documents must be encoded in UTF-8',
  },
  CSS_005: {
    id: 'CSS-005',
    severity: 'usage',
    description: 'Conflicting alternate style tags found',
  },
  CSS_006: {
    id: 'CSS-006',
    severity: 'usage',
    description: 'CSS selector specifies fixed position',
  },
  CSS_007: {
    id: 'CSS-007',
    severity: 'info',
    description: 'Font-face reference to non-standard font type',
  },
  CSS_008: {
    id: 'CSS-008',
    severity: 'error',
    description: 'Error occurred while parsing CSS',
  },
  CSS_009: { id: 'CSS-009', severity: 'suppressed', description: 'Invalid CSS for fixed layout' },
  CSS_010: { id: 'CSS-010', severity: 'suppressed', description: 'CSS property not allowed' },
  CSS_011: { id: 'CSS-011', severity: 'suppressed', description: 'Viewport dimensions in CSS' },
  CSS_012: { id: 'CSS-012', severity: 'suppressed', description: 'Invalid font-face src format' },
  CSS_013: { id: 'CSS-013', severity: 'suppressed', description: 'CSS construct suppressed' },
  CSS_015: {
    id: 'CSS-015',
    severity: 'error',
    description: 'Alternative style sheets must have a title',
  },
  CSS_016: { id: 'CSS-016', severity: 'suppressed', description: 'Vendor-specific CSS property' },
  CSS_017: { id: 'CSS-017', severity: 'suppressed', description: 'Non-standard pseudo element' },
  CSS_019: {
    id: 'CSS-019',
    severity: 'warning',
    description: 'CSS font-face declaration has no attributes',
  },
  CSS_020: { id: 'CSS-020', severity: 'suppressed', description: 'Embedded font resource' },
  CSS_021: { id: 'CSS-021', severity: 'suppressed', description: 'Unusual font reference' },
  CSS_022: { id: 'CSS-022', severity: 'suppressed', description: 'OpenType font feature' },
  CSS_023: { id: 'CSS-023', severity: 'suppressed', description: 'Invalid @font-face rule' },
  CSS_024: { id: 'CSS-024', severity: 'suppressed', description: 'CSS construct suppressed' },
  CSS_025: { id: 'CSS-025', severity: 'suppressed', description: 'CSS construct suppressed' },
  CSS_028: { id: 'CSS-028', severity: 'usage', description: 'Use of font-face declaration' },
  CSS_029: {
    id: 'CSS-029',
    severity: 'usage',
    description: 'CSS class found but no property declared in package document',
  },
  CSS_030: {
    id: 'CSS-030',
    severity: 'error',
    description: 'Package declares media overlay styling but no CSS found',
  },

  // Navigation errors (NAV-*)
  NAV_001: {
    id: 'NAV-001',
    severity: 'error',
    description: 'Navigation Document must have a nav element with epub:type="toc"',
  },
  NAV_002: { id: 'NAV-002', severity: 'suppressed', description: 'Missing toc nav element' },
  NAV_003: {
    id: 'NAV-003',
    severity: 'error',
    description: 'Navigation Document must have page list when content has page breaks',
  },
  NAV_004: {
    id: 'NAV-004',
    severity: 'usage',
    description: 'Navigation Document should contain full heading hierarchy in EDUPUB',
  },
  NAV_005: {
    id: 'NAV-005',
    severity: 'usage',
    description: 'Content has audio elements but nav has no listing of audio clips',
  },
  NAV_006: {
    id: 'NAV-006',
    severity: 'usage',
    description: 'Content has figure elements but nav has no listing of figures',
  },
  NAV_007: {
    id: 'NAV-007',
    severity: 'usage',
    description: 'Content has table elements but nav has no listing of tables',
  },
  NAV_008: {
    id: 'NAV-008',
    severity: 'usage',
    description: 'Content has video elements but nav has no listing of video clips',
  },
  NAV_009: {
    id: 'NAV-009',
    severity: 'error',
    description: 'Region-based navigation links must point to Fixed-Layout Documents',
  },
  NAV_010: {
    id: 'NAV-010',
    severity: 'error',
    description: 'Nav must not link to remote resources',
  },
  NAV_011: {
    id: 'NAV-011',
    severity: 'warning',
    description: 'Nav must be in reading order',
  },

  // NCX errors (NCX-*)
  NCX_001: {
    id: 'NCX-001',
    severity: 'error',
    description: 'NCX identifier does not match OPF identifier',
  },
  NCX_002: { id: 'NCX-002', severity: 'suppressed', description: 'Invalid NCX reference' },
  NCX_003: { id: 'NCX-003', severity: 'suppressed', description: 'NavPoint missing text content' },
  NCX_004: {
    id: 'NCX-004',
    severity: 'usage',
    description: 'NCX identifier should not have leading or trailing whitespace',
  },
  NCX_005: { id: 'NCX-005', severity: 'suppressed', description: 'NCX required for EPUB 2' },
  NCX_006: { id: 'NCX-006', severity: 'usage', description: 'Empty text label in NCX document' },

  // Accessibility errors (ACC-*)
  ACC_001: { id: 'ACC-001', severity: 'suppressed', description: 'Image missing alt text' },
  ACC_002: {
    id: 'ACC-002',
    severity: 'suppressed',
    description: 'Missing schema:accessibilityFeature metadata',
  },
  ACC_003: { id: 'ACC-003', severity: 'suppressed', description: 'Missing accessibility metadata' },
  ACC_004: {
    id: 'ACC-004',
    severity: 'suppressed',
    description: 'Html a element must have text',
  },
  ACC_005: {
    id: 'ACC-005',
    severity: 'suppressed',
    description: 'Table heading cells should use th elements',
  },
  ACC_006: {
    id: 'ACC-006',
    severity: 'suppressed',
    description: 'Tables should include thead element',
  },
  ACC_007: {
    id: 'ACC-007',
    severity: 'suppressed',
    description: 'Content Documents do not use epub:type for semantic inflection',
  },
  ACC_008: { id: 'ACC-008', severity: 'suppressed', description: 'Page numbering has gaps' },
  ACC_009: {
    id: 'ACC-009',
    severity: 'usage',
    description: 'MathML should have alttext attribute or annotation-xml child',
  },
  ACC_010: {
    id: 'ACC-010',
    severity: 'suppressed',
    description: 'Missing schema:accessMode metadata',
  },
  ACC_011: {
    id: 'ACC-011',
    severity: 'usage',
    description: 'SVG hyperlink has no accessible name',
  },
  ACC_012: {
    id: 'ACC-012',
    severity: 'suppressed',
    description: 'Table elements should include caption element',
  },
  ACC_013: {
    id: 'ACC-013',
    severity: 'suppressed',
    description: 'Complex image missing aria-describedby',
  },
  ACC_014: { id: 'ACC-014', severity: 'suppressed', description: 'Empty table header cell' },
  ACC_015: {
    id: 'ACC-015',
    severity: 'suppressed',
    description: 'Table missing summary or caption',
  },
  ACC_016: { id: 'ACC-016', severity: 'suppressed', description: 'Visual adjustments not allowed' },
  ACC_017: { id: 'ACC-017', severity: 'suppressed', description: 'Missing schema.org accessMode' },

  // Media errors (MED-*)
  MED_001: { id: 'MED-001', severity: 'suppressed', description: 'Invalid media type' },
  MED_002: { id: 'MED-002', severity: 'suppressed', description: 'Media overlay error' },
  MED_003: {
    id: 'MED-003',
    severity: 'error',
    description: 'Picture img must reference core media type resources',
  },
  MED_004: { id: 'MED-004', severity: 'error', description: 'Image file header may be corrupted' },
  MED_005: {
    id: 'MED-005',
    severity: 'error',
    description: 'Media Overlay audio reference to non-standard audio type',
  },
  MED_006: { id: 'MED-006', severity: 'suppressed', description: 'Invalid media fallback chain' },
  MED_007: {
    id: 'MED-007',
    severity: 'error',
    description: 'Picture source must define type for foreign resources',
  },
  MED_008: {
    id: 'MED-008',
    severity: 'error',
    description: 'clipBegin must not be after clipEnd',
  },
  MED_009: {
    id: 'MED-009',
    severity: 'error',
    description: 'clipBegin must not be same as clipEnd',
  },
  MED_010: {
    id: 'MED-010',
    severity: 'error',
    description: 'Content Document from Media Overlay must specify media-overlay attribute',
  },
  MED_011: {
    id: 'MED-011',
    severity: 'error',
    description: 'Content Document referenced from multiple Media Overlay Documents',
  },
  MED_012: {
    id: 'MED-012',
    severity: 'error',
    description: 'media-overlay attribute does not match Media Overlay ID',
  },
  MED_013: {
    id: 'MED-013',
    severity: 'error',
    description: 'Media Overlay from media-overlay attribute has no reference to Content Document',
  },
  MED_014: {
    id: 'MED-014',
    severity: 'error',
    description: 'Media overlay audio URLs must not have fragment',
  },
  MED_015: {
    id: 'MED-015',
    severity: 'usage',
    description: 'Media overlay text references must be in reading order',
  },
  MED_016: {
    id: 'MED-016',
    severity: 'warning',
    description: 'Media Overlays total duration should be sum of all durations',
  },
  MED_017: {
    id: 'MED-017',
    severity: 'warning',
    description: 'URL fragment should indicate element ID',
  },
  MED_018: {
    id: 'MED-018',
    severity: 'warning',
    description: 'URL fragment should be SVG fragment identifier',
  },

  // Scripting errors (SCP-*)
  SCP_001: { id: 'SCP-001', severity: 'suppressed', description: 'Scripting used in publication' },
  SCP_002: {
    id: 'SCP-002',
    severity: 'suppressed',
    description: 'Script in spine content document',
  },
  SCP_003: { id: 'SCP-003', severity: 'suppressed', description: 'Inline script element' },
  SCP_004: {
    id: 'SCP-004',
    severity: 'suppressed',
    description: 'Event handler attribute detected',
  },
  SCP_005: {
    id: 'SCP-005',
    severity: 'suppressed',
    description: 'Script not declared in manifest',
  },
  SCP_006: { id: 'SCP-006', severity: 'suppressed', description: 'JavaScript URL not allowed' },
  SCP_007: { id: 'SCP-007', severity: 'suppressed', description: 'Container-constrained script' },
  SCP_008: {
    id: 'SCP-008',
    severity: 'suppressed',
    description: 'Scripted content missing properties',
  },
  SCP_009: { id: 'SCP-009', severity: 'suppressed', description: 'Script execution error' },
  SCP_010: { id: 'SCP-010', severity: 'suppressed', description: 'EPUB CFI URL detected' },

  // Informational messages (INF-*)
  INF_001: {
    id: 'INF-001',
    severity: 'info',
    description: 'Rule is under review and severity may change',
  },

  // Internal checker errors (CHK-*)
  CHK_001: {
    id: 'CHK-001',
    severity: 'error',
    description: 'Custom message overrides file not found',
  },
  CHK_002: {
    id: 'CHK-002',
    severity: 'error',
    description: 'Unrecognized custom message id in overrides file',
  },
  CHK_003: {
    id: 'CHK-003',
    severity: 'error',
    description: 'Unrecognized custom message severity in overrides file',
  },
  CHK_004: {
    id: 'CHK-004',
    severity: 'error',
    description: 'Custom message contains too many parameters',
  },
  CHK_005: {
    id: 'CHK-005',
    severity: 'error',
    description: 'Custom suggestion contains too many parameters',
  },
  CHK_006: {
    id: 'CHK-006',
    severity: 'error',
    description: 'Unable to parse custom format parameter',
  },
  CHK_007: {
    id: 'CHK-007',
    severity: 'error',
    description: 'Error processing custom message file',
  },
  CHK_008: {
    id: 'CHK-008',
    severity: 'error',
    description: 'Error processing item, skipping other checks',
  },
} as const satisfies Record<string, MessageDef>;

type MessageDefsType = typeof MessageDefs;
type MessageKey = keyof MessageDefsType;

/**
 * MessageId provides enum-like access to message IDs.
 *
 * @example
 * ```typescript
 * MessageId.PKG_001 // 'PKG-001'
 * MessageId.OPF_010 // 'OPF-010'
 * ```
 */
export const MessageId = Object.fromEntries(
  Object.entries(MessageDefs).map(([key, def]) => [key, def.id]),
) as { readonly [K in MessageKey]: MessageDefsType[K]['id'] };

export type MessageId = MessageDefsType[MessageKey]['id'];

/**
 * Message info structure
 */
export interface MessageInfo {
  id: string;
  severity: MessageSeverity;
  description: string;
}

/**
 * Get message info by ID
 */
export function getMessageInfo(id: string): MessageInfo | undefined {
  const entry = Object.values(MessageDefs).find((def) => def.id === id);
  return entry;
}

/**
 * Get default severity for a message ID
 */
export function getDefaultSeverity(id: string): MessageSeverity {
  const info = getMessageInfo(id);
  return info?.severity ?? 'error';
}

/**
 * Get all message definitions as an array (for iteration/display)
 */
export function getAllMessages(): readonly MessageInfo[] {
  return Object.values(MessageDefs);
}

/**
 * Format message list for console output
 */
export function formatMessageList(): string {
  const lines: string[] = [];
  lines.push('ID\tSEVERITY\tDESCRIPTION');
  lines.push('─'.repeat(80));

  for (const msg of Object.values(MessageDefs)) {
    const severity = msg.severity.toUpperCase();
    lines.push(`${msg.id}\t${severity}\t${msg.description}`);
  }

  return lines.join('\n');
}

/**
 * Options for creating a validation message
 */
export interface CreateMessageOptions {
  /** Message ID from MessageId enum */
  id: MessageId;
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
 * Create a validation message with automatic severity lookup
 *
 * @example
 * ```typescript
 * const msg = createMessage({
 *   id: MessageId.PKG_006,
 *   message: 'Missing mimetype file',
 *   location: { path: 'mimetype' },
 * });
 * if (msg) context.messages.push(msg);
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
 * Create and push a validation message to the messages array.
 * Automatically handles suppressed messages by not pushing them.
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
