import type { ValidationContext, ValidationMessage } from '../types.js';
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
      context.messages.push({
        id: 'PKG-001',
        severity: 'fatal',
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
  }

  /**
   * Validate the mimetype file
   *
   * Requirements:
   * - Must exist
   * - Must be first file in ZIP
   * - Must be uncompressed
   * - Must contain exactly "application/epub+zip"
   */
  private validateMimetype(zip: ZipReader, messages: ValidationMessage[]): void {
    // Check if mimetype exists
    if (!zip.has('mimetype')) {
      messages.push({
        id: 'PKG-006',
        severity: 'error',
        message: 'Missing mimetype file',
        location: { path: 'mimetype' },
      });
      return;
    }

    // Check if mimetype is first file
    const originalOrder = zip.originalOrder;
    if (originalOrder.length > 0 && originalOrder[0] !== 'mimetype') {
      messages.push({
        id: 'PKG-005',
        severity: 'error',
        message: 'The mimetype file must be the first file in the ZIP archive',
        location: { path: 'mimetype' },
      });
    }

    // Read and validate content
    const content = zip.readText('mimetype');
    if (content === undefined) {
      messages.push({
        id: 'PKG-006',
        severity: 'error',
        message: 'Could not read mimetype file',
        location: { path: 'mimetype' },
      });
      return;
    }

    // Check content
    const trimmed = content.trim();
    if (trimmed !== EPUB_MIMETYPE) {
      messages.push({
        id: 'PKG-007',
        severity: 'error',
        message: `Mimetype file must contain "${EPUB_MIMETYPE}", found "${trimmed}"`,
        location: { path: 'mimetype' },
      });
    }

    // Check for extra whitespace/newlines
    if (content !== EPUB_MIMETYPE) {
      messages.push({
        id: 'PKG-008',
        severity: 'warning',
        message: 'Mimetype file should not contain leading/trailing whitespace or newlines',
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
      context.messages.push({
        id: 'PKG-003',
        severity: 'fatal',
        message: 'Missing META-INF/container.xml',
        location: { path: containerPath },
      });
      return;
    }

    const content = zip.readText(containerPath);
    if (!content) {
      context.messages.push({
        id: 'PKG-003',
        severity: 'fatal',
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
      context.messages.push({
        id: 'PKG-004',
        severity: 'fatal',
        message: 'No rootfile found in container.xml',
        location: { path: containerPath },
      });
    }

    // Verify rootfile paths exist
    for (const rootfile of context.rootfiles) {
      if (!zip.has(rootfile.path)) {
        context.messages.push({
          id: 'PKG-010',
          severity: 'error',
          message: `Rootfile "${rootfile.path}" not found in EPUB`,
          location: { path: containerPath },
        });
      }
    }
  }

  /**
   * Validate META-INF directory
   */
  private validateMetaInf(zip: ZipReader, messages: ValidationMessage[]): void {
    const metaInfFiles = zip.listDirectory('META-INF');
    if (metaInfFiles.length === 0) {
      messages.push({
        id: 'PKG-002',
        severity: 'error',
        message: 'Missing META-INF directory',
        location: { path: 'META-INF/' },
      });
      return;
    }

    const allowedFiles = new Set(['container.xml', 'encryption.xml', 'signatures.xml', 'metadata.xml']);

    for (const file of metaInfFiles) {
      const filename = file.replace('META-INF/', '');
      if (!allowedFiles.has(filename)) {
        messages.push({
          id: 'PKG-025',
          severity: 'error',
          message: `File not allowed in META-INF directory: ${filename}`,
          location: { path: file },
        });
      }
    }
  }

  /**
   * Validate filenames for invalid characters
   */
  private validateFilenames(zip: ZipReader, messages: ValidationMessage[]): void {
    for (const path of zip.paths) {
      if (path === 'mimetype') continue;

      const filename = path.includes('/') ? path.split('/').pop() ?? path : path;

      if (filename === '' || filename === '.' || filename === '..') {
        messages.push({
          id: 'PKG-009',
          severity: 'error',
          message: `Invalid filename: "${path}"`,
          location: { path },
        });
        continue;
      }

      for (let i = 0; i < filename.length; i++) {
        const code = filename.charCodeAt(i);

        if (code < 32 || code === 127 || (code >= 128 && code <= 159)) {
          messages.push({
            id: 'PKG-010',
            severity: 'error',
            message: `Filename contains control character: "${path}"`,
            location: { path },
          });
          break;
        }
      }

      const specialChars = '<>:"|?*';
      for (const char of specialChars) {
        if (filename.includes(char)) {
          messages.push({
            id: 'PKG-011',
            severity: 'error',
            message: `Filename contains special character: "${path}"`,
            location: { path },
          });
          break;
        }
      }
    }
  }
}
