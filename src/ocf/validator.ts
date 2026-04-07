import { MessageId, pushMessage } from '../messages/index.js';
import type { ValidationContext, ValidationMessage } from '../types.js';
import {
  parseContainerContent,
  validateDuplicateFilenames,
  validateFilenameCharacters,
} from './container.js';
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
        id: MessageId.PKG_001,
        message: `Failed to open EPUB file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      return;
    }

    // Store all files in context (NFC-normalize paths for consistent lookups)
    for (const path of zip.paths) {
      const data = zip.readBinary(path);
      if (data) {
        context.files.set(path.normalize('NFC'), data);
      }
    }

    // Validate mimetype file
    this.validateMimetype(zip, context.messages);

    // Validate container.xml
    this.validateContainer(zip, context);

    // Validate filenames
    this.validateFilenames(zip, context.messages);

    // Check for duplicate filenames (case folding, Unicode normalization)
    this.checkZipDuplicateEntries(zip, context.messages);

    // Check for non-UTF8 filenames
    this.validateUtf8Filenames(zip, context.messages);

    // Validate empty directories
    this.validateEmptyDirectories(zip, context.messages);

    // Parse encryption.xml for obfuscated resources
    this.parseEncryption(zip, context);

    // Validate encryption.xml schema
    this.validateEncryptionXml(context);

    // Validate signatures.xml schema
    this.validateSignaturesXml(context);
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
        id: MessageId.PKG_006,
        message: 'Could not read ZIP header',
        location: { path: 'mimetype' },
      });
      return;
    }

    if (compressionInfo.filename !== 'mimetype') {
      pushMessage(messages, {
        id: MessageId.PKG_006,
        message: 'Mimetype file must be the first file in the ZIP archive',
        location: { path: 'mimetype' },
      });
    }

    if (compressionInfo.extraFieldLength !== 0) {
      pushMessage(messages, {
        id: MessageId.PKG_005,
        message: `Mimetype entry must not have an extra field (found ${String(compressionInfo.extraFieldLength)} bytes)`,
        location: { path: 'mimetype' },
      });
    }

    if (compressionInfo.compressionMethod !== 0) {
      pushMessage(messages, {
        id: MessageId.PKG_006,
        message: 'Mimetype file must be uncompressed',
        location: { path: 'mimetype' },
      });
    }

    if (!zip.has('mimetype')) {
      pushMessage(messages, {
        id: MessageId.PKG_006,
        message: 'Missing mimetype file',
        location: { path: 'mimetype' },
      });
      return;
    }

    const content = zip.readText('mimetype');
    if (content === undefined) {
      pushMessage(messages, {
        id: MessageId.PKG_006,
        message: 'Could not read mimetype file',
        location: { path: 'mimetype' },
      });
      return;
    }

    // PKG-007: mimetype must exactly match "application/epub+zip" (no trimming)
    // This matches Java EPUBCheck behavior - any whitespace/newlines are an error
    if (content !== EPUB_MIMETYPE) {
      pushMessage(messages, {
        id: MessageId.PKG_007,
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
        id: MessageId.RSC_002,
        message: 'Required file META-INF/container.xml was not found',
        location: { path: containerPath },
      });
      return;
    }

    const content = zip.readText(containerPath);
    if (!content) {
      pushMessage(context.messages, {
        id: MessageId.RSC_002,
        message: 'Could not read META-INF/container.xml',
        location: { path: containerPath },
      });
      return;
    }

    parseContainerContent(content, context, (path) => zip.has(path));
  }

  /**
   * Validate filenames for invalid characters
   */
  private validateFilenames(zip: ZipReader, messages: ValidationMessage[]): void {
    for (const path of zip.paths) {
      if (path === 'mimetype') continue;
      if (path.endsWith('/')) continue;
      validateFilenameCharacters(path, messages);
    }
  }

  /**
   * Check for duplicate filenames after Unicode normalization and case folding
   */
  private checkZipDuplicateEntries(zip: ZipReader, messages: ValidationMessage[]): void {
    const seenPaths = new Set<string>();
    const filePaths: string[] = [];

    for (const path of zip.paths) {
      if (path.endsWith('/')) continue;

      // Check for exact duplicate ZIP entries (ZIP-specific, not in shared util)
      if (seenPaths.has(path)) {
        pushMessage(messages, {
          id: MessageId.OPF_060,
          message: `Duplicate ZIP entry: "${path}"`,
          location: { path },
        });
        continue;
      }
      seenPaths.add(path);
      filePaths.push(path);
    }

    validateDuplicateFilenames(filePaths, messages);
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
        id: MessageId.PKG_027,
        message: `Filename is not valid UTF-8: "${filename}" (${reason})`,
        location: { path: filename },
      });
    }
  }

  /**
   * Parse encryption.xml to extract obfuscated resource paths.
   * Stores IDPF font obfuscation URIs in context for PKG-026 validation.
   */
  private parseEncryption(zip: ZipReader, context: ValidationContext): void {
    const encryptionPath = 'META-INF/encryption.xml';
    if (!zip.has(encryptionPath)) return;

    const content = zip.readText(encryptionPath);
    if (!content) return;

    const IDPF_OBFUSCATION = 'http://www.idpf.org/2008/embedding';
    const obfuscated = new Set<string>();

    // Match EncryptedData blocks (with or without namespace prefix)
    const blocks = content.matchAll(
      /<(?:\w+:)?EncryptedData[\s>][\s\S]*?<\/(?:\w+:)?EncryptedData>/g,
    );
    for (const block of blocks) {
      const xml = block[0];
      const algorithmMatch = /Algorithm=["']([^"']+)["']/.exec(xml);
      const uriMatch = /<(?:\w+:)?CipherReference[^>]+URI=["']([^"']+)["']/.exec(xml);
      const algorithm = algorithmMatch?.[1];
      const uri = uriMatch?.[1];
      if (!uri) continue;
      if (algorithm === IDPF_OBFUSCATION) {
        obfuscated.add(uri);
      }
      // RSC-004: Encrypted resource — content will not be checked (matches Java: all algorithms)
      pushMessage(context.messages, {
        id: MessageId.RSC_004,
        message: `File "${uri}" is encrypted, its content will not be checked`,
        location: { path: encryptionPath },
      });
    }

    if (obfuscated.size > 0) {
      context.obfuscatedResources = obfuscated;
    }
  }

  /**
   * Validate encryption.xml structure:
   * - Root element must be "encryption" in OCF namespace
   * - Compression Method must be "0" or "8"
   * - Compression OriginalLength must be a non-negative integer
   * - All Id attributes must be unique
   */
  private extractRootElementName(xml: string): string | null {
    const match = /<(\w+)[\s>]/.exec(xml.replace(/<\?xml[^?]*\?>/, '').trimStart());
    return match?.[1] ?? null;
  }

  private validateEncryptionXml(context: ValidationContext): void {
    const encPath = 'META-INF/encryption.xml';
    const content = context.files.get(encPath);
    if (!content) return;

    const xml = new TextDecoder().decode(content);

    const rootName = this.extractRootElementName(xml);
    if (rootName !== null && rootName !== 'encryption') {
      pushMessage(context.messages, {
        id: MessageId.RSC_005,
        message: `expected element "encryption" but found "${rootName}"`,
        location: { path: encPath },
      });
      return;
    }

    // Check for duplicate Id attributes
    const idPattern = /\bId=["']([^"']+)["']/g;
    const ids = new Map<string, number>();
    let idMatch;
    while ((idMatch = idPattern.exec(xml)) !== null) {
      const id = idMatch[1] ?? '';
      ids.set(id, (ids.get(id) ?? 0) + 1);
    }
    for (const [id, count] of ids) {
      if (count > 1) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: `Duplicate "${id}"`,
          location: { path: encPath },
        });
      }
    }

    // Check Compression attributes
    const compressionPattern = /<(?:\w+:)?Compression\s+([^>]*)\/?>/g;
    let compMatch;
    while ((compMatch = compressionPattern.exec(xml)) !== null) {
      const attrs = compMatch[1] ?? '';
      const methodMatch = /Method=["']([^"']*)["']/.exec(attrs);
      const lengthMatch = /OriginalLength=["']([^"']*)["']/.exec(attrs);

      if (methodMatch) {
        const method = methodMatch[1] ?? '';
        if (method !== '0' && method !== '8') {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: `value of attribute "Method" is invalid; must be "0" or "8"`,
            location: { path: encPath },
          });
        }
      }

      if (lengthMatch) {
        const length = lengthMatch[1] ?? '';
        if (!/^\d+$/.test(length)) {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: `value of attribute "OriginalLength" is invalid; must be a non-negative integer`,
            location: { path: encPath },
          });
        }
      }
    }
  }

  /**
   * Validate signatures.xml structure:
   * - Root element must be "signatures" in OCF namespace
   */
  private validateSignaturesXml(context: ValidationContext): void {
    const sigPath = 'META-INF/signatures.xml';
    const content = context.files.get(sigPath);
    if (!content) return;

    const xml = new TextDecoder().decode(content);

    const rootName = this.extractRootElementName(xml);
    if (rootName !== null && rootName !== 'signatures') {
      pushMessage(context.messages, {
        id: MessageId.RSC_005,
        message: `expected element "signatures" but found "${rootName}"`,
        location: { path: sigPath },
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
            id: MessageId.PKG_014,
            message: `Empty directory found: ${dir}`,
            location: { path: dir },
          });
        }
      }
    }
  }
}
