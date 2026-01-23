import { strFromU8, unzipSync } from 'fflate';

export interface MimetypeCompressionInfo {
  compressionMethod: number;
  extraFieldLength: number;
  filenameLength: number;
  filename: string;
}

export interface InvalidUtf8Filename {
  /** The filename as decoded (may be garbled) */
  filename: string;
  /** Description of the UTF-8 error */
  reason: string;
}

/**
 * A simple ZIP reader for EPUB files using fflate
 */
export class ZipReader {
  private files: Record<string, Uint8Array>;
  private _paths: string[];
  private _originalOrder: string[];
  private _rawData: Uint8Array;

  private constructor(
    files: Record<string, Uint8Array>,
    originalOrder: string[],
    rawData: Uint8Array,
  ) {
    this.files = files;
    this._originalOrder = originalOrder;
    this._paths = Object.keys(files).sort();
    this._rawData = rawData;
  }

  /**
   * Open a ZIP file from binary data
   */
  static open(data: Uint8Array): ZipReader {
    const files = unzipSync(data);
    const originalOrder = Object.keys(files);
    return new ZipReader(files, originalOrder, data);
  }

  /**
   * Get compression info for the first entry (mimetype) from raw ZIP header
   * ZIP Local File Header format:
   * - Offset 0-3: Signature (0x04034b50)
   * - Offset 4-5: Version needed
   * - Offset 6-7: General purpose bit flag
   * - Offset 8-9: Compression method (0=stored, 8=deflated)
   * - Offset 10-13: Last mod time/date
   * - Offset 14-17: CRC-32
   * - Offset 18-21: Compressed size
   * - Offset 22-25: Uncompressed size
   * - Offset 26-27: Filename length
   * - Offset 28-29: Extra field length
   * - Offset 30+: Filename
   */
  getMimetypeCompressionInfo(): MimetypeCompressionInfo | null {
    const data = this._rawData;
    if (data.length < 30) {
      return null;
    }

    if (data[0] !== 0x50 || data[1] !== 0x4b || data[2] !== 0x03 || data[3] !== 0x04) {
      return null;
    }

    const compressionMethod = (data[8] ?? 0) | ((data[9] ?? 0) << 8);
    const filenameLength = (data[26] ?? 0) | ((data[27] ?? 0) << 8);
    const extraFieldLength = (data[28] ?? 0) | ((data[29] ?? 0) << 8);

    if (data.length < 30 + filenameLength) {
      return null;
    }

    const filenameBytes = data.slice(30, 30 + filenameLength);
    const filename = strFromU8(filenameBytes);

    return {
      compressionMethod,
      extraFieldLength,
      filenameLength,
      filename,
    };
  }

  /**
   * Get all file paths in the ZIP (sorted alphabetically)
   */
  get paths(): string[] {
    return this._paths;
  }

  /**
   * Get file paths in original ZIP order
   */
  get originalOrder(): string[] {
    return this._originalOrder;
  }

  /**
   * Check if a file exists in the ZIP
   */
  has(path: string): boolean {
    return path in this.files;
  }

  /**
   * Read a file as text (UTF-8)
   */
  readText(path: string): string | undefined {
    const data = this.files[path];
    if (!data) {
      return undefined;
    }
    return strFromU8(data);
  }

  /**
   * Read a file as binary data
   */
  readBinary(path: string): Uint8Array | undefined {
    return this.files[path];
  }

  /**
   * Get the size of a file in bytes
   */
  getSize(path: string): number | undefined {
    return this.files[path]?.length;
  }

  /**
   * List files in a directory
   */
  listDirectory(dirPath: string): string[] {
    const prefix = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;
    return this._paths.filter((p) => p.startsWith(prefix));
  }

  /**
   * Check for filenames that are not valid UTF-8 by parsing raw ZIP data
   *
   * ZIP files store filenames as bytes. The EPUB spec requires filenames to be UTF-8.
   * This method parses the ZIP central directory to find filenames with invalid UTF-8.
   *
   * @returns Array of filenames with invalid UTF-8 encoding
   */
  getInvalidUtf8Filenames(): InvalidUtf8Filename[] {
    const invalid: InvalidUtf8Filename[] = [];
    const data = this._rawData;

    // Find the End of Central Directory record
    // Signature: 0x06054b50, located at end of file (may have comment after)
    let eocdOffset = -1;
    for (let i = data.length - 22; i >= 0; i--) {
      if (
        data[i] === 0x50 &&
        data[i + 1] === 0x4b &&
        data[i + 2] === 0x05 &&
        data[i + 3] === 0x06
      ) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset === -1) {
      return invalid; // Can't find EOCD, fflate will handle this error
    }

    // Get offset to start of central directory
    const cdOffset =
      (data[eocdOffset + 16] ?? 0) |
      ((data[eocdOffset + 17] ?? 0) << 8) |
      ((data[eocdOffset + 18] ?? 0) << 16) |
      ((data[eocdOffset + 19] ?? 0) << 24);

    // Parse central directory file headers
    // Signature: 0x02014b50
    let offset = cdOffset;
    while (offset < eocdOffset) {
      if (
        data[offset] !== 0x50 ||
        data[offset + 1] !== 0x4b ||
        data[offset + 2] !== 0x01 ||
        data[offset + 3] !== 0x02
      ) {
        break; // Not a central directory header
      }

      const filenameLength = (data[offset + 28] ?? 0) | ((data[offset + 29] ?? 0) << 8);
      const extraLength = (data[offset + 30] ?? 0) | ((data[offset + 31] ?? 0) << 8);
      const commentLength = (data[offset + 32] ?? 0) | ((data[offset + 33] ?? 0) << 8);

      // Extract raw filename bytes
      const filenameBytes = data.slice(offset + 46, offset + 46 + filenameLength);

      // Check if filename is valid UTF-8
      const utf8Error = this.validateUtf8(filenameBytes);
      if (utf8Error) {
        // Decode filename as best we can for error reporting
        const filename = strFromU8(filenameBytes);
        invalid.push({ filename, reason: utf8Error });
      }

      // Move to next central directory entry
      offset += 46 + filenameLength + extraLength + commentLength;
    }

    return invalid;
  }

  /**
   * Validate that bytes form a valid UTF-8 sequence
   *
   * @returns Error description if invalid, undefined if valid
   */
  private validateUtf8(bytes: Uint8Array): string | undefined {
    let i = 0;
    while (i < bytes.length) {
      const byte = bytes[i] ?? 0;

      if (byte <= 0x7f) {
        // ASCII (0xxxxxxx)
        i++;
      } else if ((byte & 0xe0) === 0xc0) {
        // 2-byte sequence (110xxxxx 10xxxxxx)
        if (byte < 0xc2) {
          return `Overlong encoding at byte ${String(i)}`;
        }
        if (i + 1 >= bytes.length || ((bytes[i + 1] ?? 0) & 0xc0) !== 0x80) {
          return `Invalid continuation byte at position ${String(i + 1)}`;
        }
        i += 2;
      } else if ((byte & 0xf0) === 0xe0) {
        // 3-byte sequence (1110xxxx 10xxxxxx 10xxxxxx)
        if (
          i + 2 >= bytes.length ||
          ((bytes[i + 1] ?? 0) & 0xc0) !== 0x80 ||
          ((bytes[i + 2] ?? 0) & 0xc0) !== 0x80
        ) {
          return `Invalid continuation byte in 3-byte sequence at position ${String(i)}`;
        }
        // Check for overlong encoding
        if (byte === 0xe0 && (bytes[i + 1] ?? 0) < 0xa0) {
          return `Overlong 3-byte encoding at byte ${String(i)}`;
        }
        // Check for surrogate pairs (0xD800-0xDFFF)
        if (byte === 0xed && (bytes[i + 1] ?? 0) >= 0xa0) {
          return `UTF-16 surrogate at byte ${String(i)}`;
        }
        i += 3;
      } else if ((byte & 0xf8) === 0xf0) {
        // 4-byte sequence (11110xxx 10xxxxxx 10xxxxxx 10xxxxxx)
        if (
          i + 3 >= bytes.length ||
          ((bytes[i + 1] ?? 0) & 0xc0) !== 0x80 ||
          ((bytes[i + 2] ?? 0) & 0xc0) !== 0x80 ||
          ((bytes[i + 3] ?? 0) & 0xc0) !== 0x80
        ) {
          return `Invalid continuation byte in 4-byte sequence at position ${String(i)}`;
        }
        // Check for overlong encoding
        if (byte === 0xf0 && (bytes[i + 1] ?? 0) < 0x90) {
          return `Overlong 4-byte encoding at byte ${String(i)}`;
        }
        // Check for code points > U+10FFFF
        if (byte > 0xf4 || (byte === 0xf4 && (bytes[i + 1] ?? 0) > 0x8f)) {
          return `Code point exceeds U+10FFFF at byte ${String(i)}`;
        }
        i += 4;
      } else {
        // Invalid start byte (10xxxxxx or 11111xxx)
        return `Invalid UTF-8 start byte 0x${byte.toString(16).toUpperCase()} at position ${String(i)}`;
      }
    }
    return undefined;
  }
}
