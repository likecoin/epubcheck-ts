import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { ZipReader } from './zip.js';

/**
 * Helper to create a test ZIP file
 */
function createTestZip(files: Record<string, string | Uint8Array>): Uint8Array {
  const zipFiles: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(files)) {
    zipFiles[path] = typeof content === 'string' ? strToU8(content) : content;
  }
  return zipSync(zipFiles);
}

describe('ZipReader', () => {
  describe('open', () => {
    it('should open a valid ZIP file', () => {
      const data = createTestZip({
        mimetype: 'application/epub+zip',
        'META-INF/container.xml': '<container/>',
      });

      const zip = ZipReader.open(data);
      expect(zip).toBeInstanceOf(ZipReader);
    });

    it('should throw on invalid ZIP data', () => {
      const invalidData = new Uint8Array([1, 2, 3, 4]);
      expect(() => ZipReader.open(invalidData)).toThrow();
    });
  });

  describe('paths', () => {
    it('should return all file paths sorted', () => {
      const data = createTestZip({
        'zebra.txt': 'z',
        'apple.txt': 'a',
        'META-INF/container.xml': 'c',
      });

      const zip = ZipReader.open(data);
      expect(zip.paths).toEqual(['META-INF/container.xml', 'apple.txt', 'zebra.txt']);
    });
  });

  describe('has', () => {
    it('should return true for existing files', () => {
      const data = createTestZip({
        mimetype: 'application/epub+zip',
      });

      const zip = ZipReader.open(data);
      expect(zip.has('mimetype')).toBe(true);
    });

    it('should return false for non-existing files', () => {
      const data = createTestZip({
        mimetype: 'application/epub+zip',
      });

      const zip = ZipReader.open(data);
      expect(zip.has('nonexistent')).toBe(false);
    });
  });

  describe('readText', () => {
    it('should read file content as UTF-8 text', () => {
      const data = createTestZip({
        'test.txt': 'Hello, World!',
      });

      const zip = ZipReader.open(data);
      expect(zip.readText('test.txt')).toBe('Hello, World!');
    });

    it('should handle UTF-8 characters', () => {
      const data = createTestZip({
        'unicode.txt': 'Hello, 世界! 🌍',
      });

      const zip = ZipReader.open(data);
      expect(zip.readText('unicode.txt')).toBe('Hello, 世界! 🌍');
    });

    it('should return undefined for non-existing files', () => {
      const data = createTestZip({
        'test.txt': 'content',
      });

      const zip = ZipReader.open(data);
      expect(zip.readText('nonexistent')).toBeUndefined();
    });
  });

  describe('readBinary', () => {
    it('should read file content as Uint8Array', () => {
      const binaryContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG header
      const data = createTestZip({
        'image.png': binaryContent,
      });

      const zip = ZipReader.open(data);
      const result = zip.readBinary('image.png');
      expect(result).toBeInstanceOf(Uint8Array);
      expect(result).toEqual(binaryContent);
    });

    it('should return undefined for non-existing files', () => {
      const data = createTestZip({
        'test.txt': 'content',
      });

      const zip = ZipReader.open(data);
      expect(zip.readBinary('nonexistent')).toBeUndefined();
    });
  });

  describe('getSize', () => {
    it('should return file size in bytes', () => {
      const content = 'Hello, World!'; // 13 bytes
      const data = createTestZip({
        'test.txt': content,
      });

      const zip = ZipReader.open(data);
      expect(zip.getSize('test.txt')).toBe(13);
    });

    it('should return undefined for non-existing files', () => {
      const data = createTestZip({
        'test.txt': 'content',
      });

      const zip = ZipReader.open(data);
      expect(zip.getSize('nonexistent')).toBeUndefined();
    });
  });

  describe('listDirectory', () => {
    it('should list files in a directory', () => {
      const data = createTestZip({
        'META-INF/container.xml': 'c',
        'META-INF/encryption.xml': 'e',
        'OEBPS/content.opf': 'o',
        mimetype: 'm',
      });

      const zip = ZipReader.open(data);
      const metaInfFiles = zip.listDirectory('META-INF');
      expect(metaInfFiles).toHaveLength(2);
      expect(metaInfFiles).toContain('META-INF/container.xml');
      expect(metaInfFiles).toContain('META-INF/encryption.xml');
    });

    it('should work with trailing slash', () => {
      const data = createTestZip({
        'META-INF/container.xml': 'c',
      });

      const zip = ZipReader.open(data);
      expect(zip.listDirectory('META-INF/')).toEqual(['META-INF/container.xml']);
    });

    it('should return empty array for non-existing directory', () => {
      const data = createTestZip({
        'test.txt': 'content',
      });

      const zip = ZipReader.open(data);
      expect(zip.listDirectory('nonexistent')).toEqual([]);
    });
  });
});
