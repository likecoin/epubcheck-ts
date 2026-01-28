/**
 * Message IDs for EPUB validation errors and warnings
 *
 * These IDs are compatible with the Java EPUBCheck implementation
 * to ensure consistent error reporting.
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
 */
export enum MessageId {
  // Package/Container errors (PKG-001 to PKG-999)
  PKG_001 = 'PKG-001', // Unable to read EPUB file
  PKG_002 = 'PKG-002', // Missing META-INF directory
  PKG_003 = 'PKG-003', // Missing container.xml
  PKG_004 = 'PKG-004', // No rootfile in container.xml
  PKG_005 = 'PKG-005', // Mimetype not first in ZIP
  PKG_006 = 'PKG-006', // Missing mimetype file
  PKG_007 = 'PKG-007', // Invalid mimetype content
  PKG_008 = 'PKG-008', // Mimetype has extra whitespace
  PKG_009 = 'PKG-009', // Mimetype compressed
  PKG_010 = 'PKG-010', // Rootfile not found
  PKG_011 = 'PKG-011', // Filename contains invalid characters
  PKG_012 = 'PKG-012', // Duplicate filename with different case
  PKG_013 = 'PKG-013', // Reserved name in directory
  PKG_014 = 'PKG-014', // Invalid directory name
  PKG_015 = 'PKG-015', // Mixed case filename
  PKG_016 = 'PKG-016', // Reserved filename
  PKG_020 = 'PKG-020', // OPF file not found
  PKG_021 = 'PKG-021', // Unexpected file in META-INF
  PKG_022 = 'PKG-022', // Cannot decrypt encrypted file
  PKG_023 = 'PKG-023', // Encrypted file without encryption.xml
  PKG_024 = 'PKG-024', // Obfuscated resource without encryption.xml
  PKG_025 = 'PKG-025', // Fatal error during validation
  PKG_027 = 'PKG-027', // Reserved path segment

  // OPF errors (OPF-001 to OPF-999)
  OPF_001 = 'OPF-001', // Missing unique identifier
  OPF_002 = 'OPF-002', // Missing title element
  OPF_003 = 'OPF-003', // Missing language element
  OPF_004 = 'OPF-004', // Item not in manifest
  OPF_005 = 'OPF-005', // Manifest item not found
  OPF_006 = 'OPF-006', // Spine item not in manifest
  OPF_007 = 'OPF-007', // Duplicate manifest item ID
  OPF_008 = 'OPF-008', // Duplicate manifest item href
  OPF_009 = 'OPF-009', // Invalid spine toc reference
  OPF_010 = 'OPF-010', // Missing nav document
  OPF_011 = 'OPF-011', // Invalid date format
  OPF_012 = 'OPF-012', // Missing dc:identifier
  OPF_013 = 'OPF-013', // Remote resource not allowed
  OPF_035 = 'OPF-035', // Deprecated OEB 1.0 media type
  OPF_014 = 'OPF-014', // Invalid manifest item media-type
  OPF_097 = 'OPF-097', // Resource not referenced
  OPF_099 = 'OPF-099', // Manifest must not list the package document
  OPF_015 = 'OPF-015', // Invalid guide reference
  OPF_016 = 'OPF-016', // Empty ID attribute
  OPF_017 = 'OPF-017', // Invalid element in metadata
  OPF_030 = 'OPF-030', // Meta property without refines
  OPF_031 = 'OPF-031', // Meta refines missing
  OPF_033 = 'OPF-033', // Link without rel
  OPF_034 = 'OPF-034', // Link with empty rel
  OPF_040 = 'OPF-040', // Duplicated metadata entry
  OPF_043 = 'OPF-043', // Invalid dc:date value
  OPF_045 = 'OPF-045', // Invalid fallback chain
  OPF_048 = 'OPF-048', // Multiple metadata prefixes
  OPF_049 = 'OPF-049', // Invalid prefix definition
  OPF_050 = 'OPF-050', // Ignored prefix
  OPF_051 = 'OPF-051', // Remote resource without property
  OPF_052 = 'OPF-052', // Vocabulary not ignored
  OPF_053 = 'OPF-053', // Unknown prefix
  OPF_054 = 'OPF-054', // Prefix used but not declared
  OPF_060 = 'OPF-060', // Collection manifest item not found
  OPF_071 = 'OPF-071', // Non-unique ID
  OPF_072 = 'OPF-072', // Duplicate ID
  OPF_073 = 'OPF-073', // ID with underscore
  OPF_074 = 'OPF-074', // ID with period
  OPF_075 = 'OPF-075', // ID with hyphen
  OPF_088 = 'OPF-088', // Bound-media not found
  OPF_091 = 'OPF-091', // Fixed-layout metadata
  OPF_092 = 'OPF-092', // Invalid rendition metadata

  // Resource errors (RSC-001 to RSC-999)
  RSC_001 = 'RSC-001', // Could not open resource
  RSC_002 = 'RSC-002', // Resource missing from manifest
  RSC_003 = 'RSC-003', // Resource not found
  RSC_004 = 'RSC-004', // Fragment identifier not found
  RSC_005 = 'RSC-005', // Schema validation error
  RSC_006 = 'RSC-006', // Remote resource referenced
  RSC_007 = 'RSC-007', // Referenced resource not in manifest
  RSC_007w = 'RSC-007w', // LINK reference missing (warning for EPUB 3)
  RSC_008 = 'RSC-008', // Undeclared resource
  RSC_009 = 'RSC-009', // Resource in spine not content document
  RSC_010 = 'RSC-010', // Non-content hyperlink
  RSC_011 = 'RSC-011', // Hyperlink to non-spine
  RSC_012 = 'RSC-012', // Fragment identifier not found
  RSC_013 = 'RSC-013', // Invalid language tag
  RSC_014 = 'RSC-014', // Invalid link relation
  RSC_015 = 'RSC-015', // Resource not reachable
  RSC_016 = 'RSC-016', // Fatal error reading resource
  RSC_017 = 'RSC-017', // Warning for resource
  RSC_018 = 'RSC-018', // Unused resource in package
  RSC_019 = 'RSC-019', // Fallback cycle detected
  RSC_020 = 'RSC-020', // Malformed URL
  RSC_026 = 'RSC-026', // File URL not allowed
  RSC_027 = 'RSC-027', // Absolute path not allowed
  RSC_028 = 'RSC-028', // Parent directory reference
  RSC_029 = 'RSC-029', // Data URL not allowed (EPUB 3)
  RSC_031 = 'RSC-031', // HTTPS required for remote

  // HTML/XHTML errors (HTM-001 to HTM-999)
  HTM_001 = 'HTM-001', // Invalid XHTML
  HTM_002 = 'HTM-002', // Deprecated element
  HTM_003 = 'HTM-003', // Entity not declared
  HTM_004 = 'HTM-004', // External entity
  HTM_005 = 'HTM-005', // Element not allowed
  HTM_006 = 'HTM-006', // Required attribute missing
  HTM_007 = 'HTM-007', // ID not unique
  HTM_008 = 'HTM-008', // Invalid ID value
  HTM_009 = 'HTM-009', // HTML5 element in XHTML
  HTM_010 = 'HTM-010', // Namespace error
  HTM_011 = 'HTM-011', // Text not allowed
  HTM_012 = 'HTM-012', // Missing DOCTYPE
  HTM_013 = 'HTM-013', // Invalid DOCTYPE
  HTM_014 = 'HTM-014', // Invalid content
  HTM_015 = 'HTM-015', // Attribute not allowed
  HTM_016 = 'HTM-016', // Attribute value invalid
  HTM_017 = 'HTM-017', // Heading hierarchy
  HTM_018 = 'HTM-018', // Empty heading
  HTM_019 = 'HTM-019', // Anchors in same file
  HTM_020 = 'HTM-020', // SSML phoneme
  HTM_021 = 'HTM-021', // Invalid hyperlink target
  HTM_022 = 'HTM-022', // HREF value empty
  HTM_023 = 'HTM-023', // External hyperlink
  HTM_024 = 'HTM-024', // Hyperlink to non-document
  HTM_025 = 'HTM-025', // Non-registered attribute
  HTM_026 = 'HTM-026', // SVG font-face-src
  HTM_027 = 'HTM-027', // SVG switch
  HTM_028 = 'HTM-028', // Invalid lang attribute
  HTM_029 = 'HTM-029', // Character reference invalid
  HTM_030 = 'HTM-030', // Unescaped character
  HTM_031 = 'HTM-031', // Attribute duplicate
  HTM_032 = 'HTM-032', // Namespace undeclared
  HTM_033 = 'HTM-033', // Invalid attribute
  HTM_046 = 'HTM-046', // Nav element must be under epub:type
  HTM_047 = 'HTM-047', // Hidden nav element
  HTM_048 = 'HTM-048', // Invalid epub:type on nav
  HTM_049 = 'HTM-049', // Heading level skip
  HTM_055 = 'HTM-055', // Potential heading skip
  HTM_060b = 'HTM-060b', // Unsafe character

  // CSS errors (CSS-001 to CSS-999)
  CSS_001 = 'CSS-001', // CSS parse error
  CSS_002 = 'CSS-002', // Unknown property
  CSS_003 = 'CSS-003', // Invalid property value
  CSS_004 = 'CSS-004', // CSS syntax error
  CSS_005 = 'CSS-005', // @font-face missing src
  CSS_006 = 'CSS-006', // Font not in manifest
  CSS_007 = 'CSS-007', // CSS import
  CSS_008 = 'CSS-008', // CSS encoding
  CSS_009 = 'CSS-009', // Invalid fixed layout CSS
  CSS_010 = 'CSS-010', // CSS property not allowed
  CSS_011 = 'CSS-011', // Viewport dimensions
  CSS_012 = 'CSS-012', // Font-face src format
  CSS_015 = 'CSS-015', // Font property deprecated
  CSS_016 = 'CSS-016', // CSS property vendor specific
  CSS_017 = 'CSS-017', // CSS pseudo element
  CSS_019 = 'CSS-019', // CSS absolute position
  CSS_020 = 'CSS-020', // CSS font embedded
  CSS_021 = 'CSS-021', // CSS unusual font
  CSS_022 = 'CSS-022', // CSS font OpenType
  CSS_023 = 'CSS-023', // Invalid font-face
  CSS_028 = 'CSS-028', // Font reference usage
  CSS_029 = 'CSS-029', // CSS rule ignored
  CSS_030 = 'CSS-030', // CSS declaration ignored

  // Navigation errors (NAV-001 to NAV-999)
  NAV_001 = 'NAV-001', // Invalid nav element
  NAV_002 = 'NAV-002', // Missing toc nav
  NAV_003 = 'NAV-003', // Nav heading order
  NAV_004 = 'NAV-004', // Nav reference external
  NAV_005 = 'NAV-005', // Nav reference invalid
  NAV_006 = 'NAV-006', // Nav structure invalid
  NAV_007 = 'NAV-007', // Nav element not found
  NAV_008 = 'NAV-008', // Nav link text empty
  NAV_009 = 'NAV-009', // Nav nested list
  NAV_010 = 'NAV-010', // Missing page nav in EPUB 3

  // NCX errors (NCX-001 to NCX-999)
  NCX_001 = 'NCX-001', // NCX parse error
  NCX_002 = 'NCX-002', // NCX reference invalid
  NCX_003 = 'NCX-003', // NCX navPoint missing text
  NCX_004 = 'NCX-004', // NCX reference broken
  NCX_005 = 'NCX-005', // NCX required for EPUB 2
  NCX_006 = 'NCX-006', // NCX depth attribute invalid

  // Accessibility errors (ACC-001 to ACC-999)
  ACC_001 = 'ACC-001', // Missing alt text
  ACC_002 = 'ACC-002', // Missing accessibilityFeature
  ACC_003 = 'ACC-003', // Accessibility metadata
  ACC_004 = 'ACC-004', // Page list recommended
  ACC_005 = 'ACC-005', // Missing epub:type
  ACC_006 = 'ACC-006', // Invalid ARIA
  ACC_007 = 'ACC-007', // Page list source
  ACC_008 = 'ACC-008', // Page numbering gaps
  ACC_009 = 'ACC-009', // DC source recommended
  ACC_010 = 'ACC-010', // accessMode recommended
  ACC_011 = 'ACC-011', // accessibilityHazard
  ACC_012 = 'ACC-012', // accessibilitySummary
  ACC_013 = 'ACC-013', // aria-describedby
  ACC_014 = 'ACC-014', // Empty table header
  ACC_015 = 'ACC-015', // Missing table summary
  ACC_016 = 'ACC-016', // Visual adjustments
  ACC_017 = 'ACC-017', // schema.org accessMode

  // Media errors (MED-001 to MED-999)
  MED_001 = 'MED-001', // Invalid media type
  MED_002 = 'MED-002', // Media overlay error
  MED_003 = 'MED-003', // Unsupported audio codec
  MED_004 = 'MED-004', // Unsupported video codec
  MED_005 = 'MED-005', // Core media type required
  MED_006 = 'MED-006', // Media fallback chain
  MED_007 = 'MED-007', // Foreign resource no fallback
  MED_008 = 'MED-008', // Invalid image format
  MED_009 = 'MED-009', // Poster image required
  MED_010 = 'MED-010', // Audio source missing
  MED_011 = 'MED-011', // Video dimensions
  MED_012 = 'MED-012', // Media duration
  MED_013 = 'MED-013', // Invalid cover image
  MED_014 = 'MED-014', // Cover image dimensions
  MED_015 = 'MED-015', // SMIL file not found
  MED_016 = 'MED-016', // Media overlay metadata

  // Scripting errors (SCP-001 to SCP-999)
  SCP_001 = 'SCP-001', // Scripting not allowed
  SCP_002 = 'SCP-002', // Script in spine item
  SCP_003 = 'SCP-003', // Inline script
  SCP_004 = 'SCP-004', // Event handler attribute
  SCP_005 = 'SCP-005', // Script not declared
  SCP_006 = 'SCP-006', // JavaScript URL
  SCP_007 = 'SCP-007', // Container-constrained script
  SCP_008 = 'SCP-008', // Scripted content missing type
  SCP_009 = 'SCP-009', // Script execution error
  SCP_010 = 'SCP-010', // Epubcfi URL
  SCP_011 = 'SCP-011', // Script loading error

  // Internal checker errors (CHK-001 to CHK-999)
  CHK_001 = 'CHK-001', // Internal error
  CHK_002 = 'CHK-002', // Parser error
  CHK_003 = 'CHK-003', // Schema error
  CHK_004 = 'CHK-004', // Resource error
  CHK_005 = 'CHK-005', // Timeout error
  CHK_006 = 'CHK-006', // Memory error
  CHK_007 = 'CHK-007', // Unknown error

  // Schematron errors (SCH-001 to SCH-999)
  SCH_001 = 'SCH-001', // Schematron assertion failed
  SCH_002 = 'SCH-002', // Schematron report failed
}
