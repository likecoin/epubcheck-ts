import type { ValidationContext, ValidationMessage } from '../types.js';
import { pushMessage } from '../messages/message-registry.js';
import { ZipReader } from './zip.js';

/**
 * Expected MIME type for EPUB files
 */
const EPUB_MIMETYPE = 'application/epub+zip';

/**
 * Validates the OCF (Open Container Format) structure of an EPUB
 *
 * This includes:
 * - ZIP structure validation
 * - mimetype file validation
 * - META-INF/container.xml validation
 */
export class OCFValidator {
  /**
   * Validate the OCF container
   */
  validate(context: ValidationContext): void {
    // Open the ZIP file
    let zip: ZipReader;
    try {
      zip = ZipReader.open(context.data);
    } catch (error) {
      pushMessage(context.messages, {
        id: 'PKG-001',
        message: `Failed to open EPUB file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      return;
    }

    // Store all files in context
    for (const path of zip.paths) {
      const data = zip.readBinary(path);
      if (data) {
        context.files.set(path, data);
      }
    }

    // Validate mimetype file
    this.validateMimetype(zip, context.messages);

    // Validate container.xml
    this.validateContainer(zip, context);

    // Validate META-INF directory
    this.validateMetaInf(zip, context.messages);

    // Validate filenames
    this.validateFilenames(zip, context.messages);

    // Check for duplicate filenames (case folding, Unicode normalization)
    this.validateDuplicateFilenames(zip, context.messages);

    // Check for non-UTF8 filenames
    this.validateUtf8Filenames(zip, context.messages);

    // Validate empty directories
    this.validateEmptyDirectories(zip, context.messages);
  }

  /**
   * Validate the mimetype file
   *
   * Requirements:
   * - Must exist
   * - Must be first file in ZIP
   * - Must be uncompressed (compression method = 0)
   * - Must have no extra field
   * - Must contain exactly "application/epub+zip"
   */
  private validateMimetype(zip: ZipReader, messages: ValidationMessage[]): void {
    const compressionInfo = zip.getMimetypeCompressionInfo();

    if (compressionInfo === null) {
      pushMessage(messages, {
        id: 'PKG-006',
        message: 'Could not read ZIP header',
        location: { path: 'mimetype' },
      });
      return;
    }

    if (compressionInfo.filename !== 'mimetype') {
      pushMessage(messages, {
        id: 'PKG-006',
        message: 'Mimetype file must be the first file in the ZIP archive',
        location: { path: 'mimetype' },
      });
    }

    if (compressionInfo.extraFieldLength !== 0) {
      pushMessage(messages, {
        id: 'PKG-005',
        message: `Mimetype entry must not have an extra field (found ${String(compressionInfo.extraFieldLength)} bytes)`,
        location: { path: 'mimetype' },
      });
    }

    if (compressionInfo.compressionMethod !== 0) {
      pushMessage(messages, {
        id: 'PKG-006',
        message: 'Mimetype file must be uncompressed',
        location: { path: 'mimetype' },
      });
    }

    if (!zip.has('mimetype')) {
      pushMessage(messages, {
        id: 'PKG-006',
        message: 'Missing mimetype file',
        location: { path: 'mimetype' },
      });
      return;
    }

    const content = zip.readText('mimetype');
    if (content === undefined) {
      pushMessage(messages, {
        id: 'PKG-006',
        message: 'Could not read mimetype file',
        location: { path: 'mimetype' },
      });
      return;
    }

    // PKG-007: mimetype must exactly match "application/epub+zip" (no trimming)
    // This matches Java EPUBCheck behavior - any whitespace/newlines are an error
    if (content !== EPUB_MIMETYPE) {
      pushMessage(messages, {
        id: 'PKG-007',
        message: `Mimetype file must contain exactly "${EPUB_MIMETYPE}"`,
        location: { path: 'mimetype' },
      });
    }
  }

  /**
   * Validate META-INF/container.xml
   */
  private validateContainer(zip: ZipReader, context: ValidationContext): void {
    const containerPath = 'META-INF/container.xml';

    if (!zip.has(containerPath)) {
      pushMessage(context.messages, {
        id: 'RSC-002',
        message: 'Required file META-INF/container.xml was not found',
        location: { path: containerPath },
      });
      return;
    }

    const content = zip.readText(containerPath);
    if (!content) {
      pushMessage(context.messages, {
        id: 'RSC-002',
        message: 'Could not read META-INF/container.xml',
        location: { path: containerPath },
      });
      return;
    }

    // Parse container.xml to extract rootfiles
    // TODO: Use libxml2-wasm for proper XML parsing and validation
    // For now, use a simple regex extraction
    const rootfileMatches = content.matchAll(
      /<rootfile[^>]+full-path=["']([^"']+)["'][^>]*media-type=["']([^"']+)["'][^>]*\/?>/g,
    );

    for (const match of rootfileMatches) {
      const [, path, mediaType] = match;
      if (path && mediaType) {
        context.rootfiles.push({ path, mediaType });

        // Set the first OPF as the main package document
        if (!context.opfPath && mediaType === 'application/oebps-package+xml') {
          context.opfPath = path;
        }
      }
    }

    // Also try alternative attribute order
    const altMatches = content.matchAll(
      /<rootfile[^>]+media-type=["']([^"']+)["'][^>]*full-path=["']([^"']+)["'][^>]*\/?>/g,
    );

    for (const match of altMatches) {
      const [, mediaType, path] = match;
      if (path && mediaType) {
        // Check if already added
        const exists = context.rootfiles.some((r) => r.path === path);
        if (!exists) {
          context.rootfiles.push({ path, mediaType });
          if (!context.opfPath && mediaType === 'application/oebps-package+xml') {
            context.opfPath = path;
          }
        }
      }
    }

    if (context.rootfiles.length === 0) {
      pushMessage(context.messages, {
        id: 'PKG-004',
        message: 'No rootfile found in container.xml',
        location: { path: containerPath },
      });
    }

    // Verify rootfile paths exist
    for (const rootfile of context.rootfiles) {
      if (!zip.has(rootfile.path)) {
        pushMessage(context.messages, {
          id: 'PKG-010',
          message: `Rootfile "${rootfile.path}" not found in EPUB`,
          location: { path: containerPath },
        });
      }
    }
  }

  /**
   * Validate META-INF directory
   *
   * Note: PKG-025 is only reported when a manifest item references a file
   * in META-INF (checked in OPFValidator), not for arbitrary files here.
   * Files like calibre_bookmarks.txt are allowed as long as they're not
   * listed as publication resources in the manifest.
   */
  private validateMetaInf(zip: ZipReader, messages: ValidationMessage[]): void {
    const metaInfFiles = zip.listDirectory('META-INF');
    if (metaInfFiles.length === 0) {
      pushMessage(messages, {
        id: 'PKG-002',
        message: 'Missing META-INF directory',
        location: { path: 'META-INF/' },
      });
    }
    // Note: We don't enforce a strict allowlist of files in META-INF.
    // Java EPUBCheck only reports PKG-025 when manifest items reference META-INF paths.
  }

  /**
   * Validate filenames for invalid characters
   *
   * Per EPUB 3.3 spec and Java EPUBCheck:
   * - PKG-009: Disallowed characters (ASCII special chars, control chars, private use, etc.)
   * - PKG-010: Whitespace characters (warning)
   * - PKG-011: Filename ends with period
   * - PKG-012: Non-ASCII characters (usage info)
   */
  private validateFilenames(zip: ZipReader, messages: ValidationMessage[]): void {
    // Disallowed ASCII characters: " * : < > ? \ |
    const DISALLOWED_ASCII = new Set([0x22, 0x2a, 0x3a, 0x3c, 0x3e, 0x3f, 0x5c, 0x7c]);

    for (const path of zip.paths) {
      if (path === 'mimetype') continue;

      // Skip directory entries (paths ending with /)
      if (path.endsWith('/')) continue;

      const filename = path.includes('/') ? (path.split('/').pop() ?? path) : path;

      if (filename === '' || filename === '.' || filename === '..') {
        pushMessage(messages, {
          id: 'PKG-009',
          message: `Invalid filename: "${path}"`,
          location: { path },
        });
        continue;
      }

      const disallowed: string[] = [];
      let hasSpaces = false;

      for (let i = 0; i < filename.length; i++) {
        const code = filename.charCodeAt(i);

        // Check for disallowed ASCII characters
        if (DISALLOWED_ASCII.has(code)) {
          const char = filename[i] ?? '';
          disallowed.push(`U+${code.toString(16).toUpperCase().padStart(4, '0')} (${char})`);
        }
        // Check for control characters (C0: 0x00-0x1F, DEL: 0x7F, C1: 0x80-0x9F)
        else if (code <= 0x1f || code === 0x7f || (code >= 0x80 && code <= 0x9f)) {
          disallowed.push(`U+${code.toString(16).toUpperCase().padStart(4, '0')} (CONTROL)`);
        }
        // Check for private use area (0xE000-0xF8FF)
        else if (code >= 0xe000 && code <= 0xf8ff) {
          disallowed.push(`U+${code.toString(16).toUpperCase().padStart(4, '0')} (PRIVATE USE)`);
        }
        // Check for specials block (0xFFF0-0xFFFF)
        else if (code >= 0xfff0 && code <= 0xffff) {
          disallowed.push(`U+${code.toString(16).toUpperCase().padStart(4, '0')} (SPECIALS)`);
        }

        // Check for whitespace
        if (code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d) {
          hasSpaces = true;
        }
      }

      // Check if filename ends with period
      if (filename.endsWith('.')) {
        pushMessage(messages, {
          id: 'PKG-011',
          message: `Filename must not end with a period: "${path}"`,
          location: { path },
        });
      }

      // Report disallowed characters (PKG-009)
      if (disallowed.length > 0) {
        pushMessage(messages, {
          id: 'PKG-009',
          message: `Filename "${path}" contains disallowed characters: ${disallowed.join(', ')}`,
          location: { path },
        });
      }

      // Report whitespace (PKG-010 - warning)
      if (hasSpaces) {
        pushMessage(messages, {
          id: 'PKG-010',
          message: `Filename "${path}" contains spaces`,
          location: { path },
          severityOverride: 'warning',
        });
      }
    }
  }

  /**
   * Check for duplicate filenames after Unicode normalization and case folding
   *
   * Per EPUB spec, filenames must be unique after applying:
   * - Unicode Canonical Case Fold Normalization (NFD + case folding)
   *
   * OPF-060: Duplicate filename after normalization
   */
  private validateDuplicateFilenames(zip: ZipReader, messages: ValidationMessage[]): void {
    const seenPaths = new Set<string>(); // exact paths
    const normalizedPaths = new Map<string, string>(); // normalized -> original

    for (const path of zip.paths) {
      // Skip directory entries
      if (path.endsWith('/')) continue;

      // First check for exact duplicate ZIP entries
      if (seenPaths.has(path)) {
        pushMessage(messages, {
          id: 'OPF-060',
          message: `Duplicate ZIP entry: "${path}"`,
          location: { path },
        });
        continue;
      }
      seenPaths.add(path);

      // Apply Unicode Canonical Case Fold Normalization:
      // 1. NFD (Canonical Decomposition)
      // 2. Case folding (using full Unicode case folding)
      const normalized = this.canonicalCaseFold(path);

      const existing = normalizedPaths.get(normalized);
      if (existing !== undefined) {
        pushMessage(messages, {
          id: 'OPF-060',
          message: `Duplicate filename after Unicode normalization: "${path}" conflicts with "${existing}"`,
          location: { path },
        });
      } else {
        normalizedPaths.set(normalized, path);
      }
    }
  }

  /**
   * Apply Unicode Canonical Case Fold Normalization
   *
   * This applies:
   * 1. NFD (Canonical Decomposition) - decomposes combined characters
   * 2. Full Unicode case folding
   *
   * Based on Unicode case folding rules for filename comparison.
   */
  private canonicalCaseFold(str: string): string {
    // NFD normalization first
    let result = str.normalize('NFD');

    // Apply full Unicode case folding
    // This handles special cases like ß -> ss, ﬁ -> fi, etc.
    result = this.unicodeCaseFold(result);

    return result;
  }

  /**
   * Perform Unicode full case folding
   *
   * Handles special Unicode case folding rules beyond simple toLowerCase:
   * - ß (U+00DF) -> ss
   * - ẞ (U+1E9E) -> ss (capital sharp s)
   * - ﬁ (U+FB01) -> fi
   * - ﬂ (U+FB02) -> fl
   * - ﬀ (U+FB00) -> ff
   * - ﬃ (U+FB03) -> ffi
   * - ﬄ (U+FB04) -> ffl
   * - ﬅ (U+FB05) -> st
   * - ﬆ (U+FB06) -> st
   * And other Unicode case folding rules
   */
  private unicodeCaseFold(str: string): string {
    // Common full case folding mappings that toLowerCase doesn't handle
    const caseFoldMap: Record<string, string> = {
      '\u00DF': 'ss', // ß -> ss
      '\u1E9E': 'ss', // ẞ -> ss (capital sharp s)
      '\uFB00': 'ff', // ﬀ -> ff
      '\uFB01': 'fi', // ﬁ -> fi
      '\uFB02': 'fl', // ﬂ -> fl
      '\uFB03': 'ffi', // ﬃ -> ffi
      '\uFB04': 'ffl', // ﬄ -> ffl
      '\uFB05': 'st', // ﬅ -> st
      '\uFB06': 'st', // ﬆ -> st
      '\u0130': 'i\u0307', // İ -> i + combining dot above
    };

    let result = '';
    for (const char of str) {
      const folded = caseFoldMap[char];
      if (folded !== undefined) {
        result += folded;
      } else {
        result += char.toLowerCase();
      }
    }
    return result;
  }

  /**
   * Validate that filenames are encoded as UTF-8
   *
   * PKG-027: Filenames in EPUB ZIP archives must be UTF-8 encoded
   */
  private validateUtf8Filenames(zip: ZipReader, messages: ValidationMessage[]): void {
    const invalidFilenames = zip.getInvalidUtf8Filenames();
    for (const { filename, reason } of invalidFilenames) {
      pushMessage(messages, {
        id: 'PKG-027',
        message: `Filename is not valid UTF-8: "${filename}" (${reason})`,
        location: { path: filename },
      });
    }
  }

  /**
   * Validate empty directories
   */
  private validateEmptyDirectories(zip: ZipReader, messages: ValidationMessage[]): void {
    const directories = new Set<string>();

    for (const path of zip.paths) {
      const parts = path.split('/');
      for (let i = 1; i < parts.length; i++) {
        const dir = parts.slice(0, i).join('/') + '/';
        directories.add(dir);
      }
    }

    for (const dir of directories) {
      if (dir !== 'META-INF/' && dir !== 'OEBPS/' && dir !== 'OPS/') {
        const filesInDir = zip.paths.filter((p) => p.startsWith(dir) && p !== dir);
        if (filesInDir.length === 0) {
          pushMessage(messages, {
            id: 'PKG-014',
            message: `Empty directory found: ${dir}`,
            location: { path: dir },
          });
        }
      }
    }
  }
}
