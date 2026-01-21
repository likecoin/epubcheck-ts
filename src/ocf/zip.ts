import { strFromU8, unzipSync } from 'fflate';

export interface MimetypeCompressionInfo {
  compressionMethod: number;
  extraFieldLength: number;
  filenameLength: number;
  filename: string;
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
}
