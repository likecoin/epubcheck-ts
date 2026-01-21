import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ValidationMessage } from '../types.js';
import { RelaxNGValidator } from './relaxng.js';
import { XsdValidator } from './xsd.js';

describe('Schema Validation', () => {
  describe('RelaxNGValidator', () => {
    let validator: RelaxNGValidator;

    beforeEach(() => {
      validator = new RelaxNGValidator();
    });

    afterEach(() => {
      validator.dispose();
    });

    it('should validate valid XML against RelaxNG schema', async () => {
      const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

      const messages = await validator.validate(validXml, 'schemas/container.rng');
      expect(messages).toHaveLength(0);
    });

    it('should report error for invalid XML against RelaxNG schema', async () => {
      // Missing required version attribute
      const invalidXml = `<?xml version="1.0" encoding="UTF-8"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

      const messages = await validator.validate(invalidXml, 'schemas/container.rng');
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0]?.id).toBe('RSC-005');
      expect(messages[0]?.severity).toBe('error');
    });

    it('should reject invalid schema path', async () => {
      const xml = '<?xml version="1.0"?><root></root>';

      const messages = await validator.validate(xml, 'nonexistent.rng');
      expect(messages.length).toBeGreaterThan(0);
      expect(
        messages.some((m: ValidationMessage) => m.id === 'RSC-001' || m.id === 'RSC-005'),
      ).toBe(true);
    });

    it('should prevent validation after dispose', async () => {
      const validator2 = new RelaxNGValidator();
      validator2.dispose();
      await expect(validator2.validate('<root/>', 'schemas/container.rng')).rejects.toThrow(
        'Validator has been disposed',
      );
    });
  });

  describe('XsdValidator', () => {
    let validator: XsdValidator;

    beforeEach(() => {
      validator = new XsdValidator();
    });

    afterEach(() => {
      validator.dispose();
    });

    // Note: EPUB uses RelaxNG and Schematron, not XSD schemas.
    // XsdValidator is available but no EPUB schemas use it.

    it('should reject invalid schema path', async () => {
      const xml = '<?xml version="1.0"?><root></root>';

      const messages = await validator.validate(xml, 'nonexistent.xsd');
      expect(messages.length).toBeGreaterThan(0);
      expect(
        messages.some((m: ValidationMessage) => m.id === 'RSC-001' || m.id === 'RSC-005'),
      ).toBe(true);
    });

    it('should prevent validation after dispose', async () => {
      const validator2 = new XsdValidator();
      validator2.dispose();
      await expect(validator2.validate('<root/>', 'schemas/opf.rng')).rejects.toThrow(
        'Validator has been disposed',
      );
    });
  });
});
