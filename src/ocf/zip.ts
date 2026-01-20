import { unzipSync, strFromU8 } from 'fflate';

/**
 * A simple ZIP reader for EPUB files using fflate
 */
export class ZipReader {
  private files: Record<string, Uint8Array>;
  private _paths: string[];

  private constructor(files: Record<string, Uint8Array>) {
    this.files = files;
    this._paths = Object.keys(files).sort();
  }

  /**
   * Open a ZIP file from binary data
   */
  static open(data: Uint8Array): ZipReader {
    const files = unzipSync(data);
    return new ZipReader(files);
  }

  /**
   * Get all file paths in the ZIP
   */
  get paths(): string[] {
    return this._paths;
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
