import { describe, expect, it } from 'vitest';
import { EpubCheck } from '../../src/index.js';

/**
 * Integration tests using real EPUB files
 */

describe('Integration Tests - Real EPUB Files', () => {
  describe('Valid EPUB Files', () => {
    it('should validate a valid EPUB 3.0 minimal file', async () => {
      const epubData = await loadEpub('valid/minimal.epub');
      const result = await EpubCheck.validate(epubData);

      expect(result.valid).toBe(true);
      expect(result.errorCount).toBe(0);
    });

    it('should validate a valid EPUB 2.0 file', async () => {
      const epubData = await loadEpub('valid/ocf-minimal-valid.epub');
      const result = await EpubCheck.validate(epubData, { version: '2.0' });

      expect(result.valid).toBe(true);
      expect(result.errorCount).toBe(0);
    });
  });

  describe('Invalid EPUB Files', () => {
    it('should detect missing mimetype file', async () => {
      const epubData = await loadEpub('invalid/ocf/ocf-mimetype-file-missing-error.epub');
      const result = await EpubCheck.validate(epubData);

      expect(result.valid).toBe(false);
      expect(result.errorCount).toBeGreaterThan(0);
      expect(result.messages.some((m) => m.id === 'PKG-006')).toBe(true);
    });

    it('should detect forbidden characters in filename', async () => {
      const epubData = await loadEpub('invalid/ocf/ocf-filename-character-forbidden-error.epub');
      const result = await EpubCheck.validate(epubData);

      expect(result.valid).toBe(false);
      expect(result.errorCount).toBeGreaterThan(0);
    });
  });
});

/**
 * Helper function to load EPUB file from fixtures
 */
async function loadEpub(path: string): Promise<Uint8Array> {
  const fs = await import('node:fs');
  const pathModule = await import('node:path');
  const url = await import('node:url');

  const currentDir = url.fileURLToPath(new URL('.', import.meta.url));
  const filePath = pathModule.resolve(currentDir, '../fixtures', path);

  return new Uint8Array(fs.readFileSync(filePath));
}
