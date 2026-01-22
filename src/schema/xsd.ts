import type { ValidationMessage } from '../types.js';
import { getSchema } from './schemas.generated.js';
import { BaseSchemaValidator } from './validator.js';

/**
 * Load schema content by filename
 *
 * First tries to load from bundled schemas (works in all environments),
 * then falls back to fetch for custom schemas provided by URL.
 */
async function loadSchema(schemaPath: string): Promise<string> {
  const filename = schemaPath.split('/').pop() ?? schemaPath;

  // Try bundled schemas first (works in all environments)
  const bundled = getSchema(filename);
  if (bundled) {
    return bundled;
  }

  // If it's a URL, try to fetch it
  if (schemaPath.startsWith('http://') || schemaPath.startsWith('https://')) {
    const response = await fetch(schemaPath);
    if (!response.ok) {
      throw new Error(`Failed to load schema: ${response.statusText}`);
    }
    return await response.text();
  }

  throw new Error(`Schema not found: "${filename}"`);
}

/**
 * XSD schema validator using libxml2-wasm
 */

export class XsdValidator extends BaseSchemaValidator {
  async validate(xml: string, schemaPath: string): Promise<ValidationMessage[]> {
    this.checkDisposed();

    const messages: ValidationMessage[] = [];

    try {
      const { XmlDocument, XsdValidator: LibXsdValidator } = await import('libxml2-wasm');

      const doc = XmlDocument.fromString(xml);

      try {
        const schemaContent = await loadSchema(schemaPath);
        const schemaDoc = XmlDocument.fromString(schemaContent);

        try {
          const validator = LibXsdValidator.fromDoc(schemaDoc);

          try {
            validator.validate(doc);
          } catch (error) {
            const parsed = this.parseLibxmlError(
              error instanceof Error ? error.message : 'XSD validation failed',
            );
            const location: { path: string; line?: number; column?: number } = { path: schemaPath };
            if (parsed.line !== undefined) location.line = parsed.line;
            if (parsed.column !== undefined) location.column = parsed.column;
            messages.push({
              id: 'RSC-005',
              severity: 'error',
              message: parsed.message,
              location,
            });
          } finally {
            validator.dispose();
          }
        } finally {
          schemaDoc.dispose();
        }
      } finally {
        doc.dispose();
      }
    } catch (error) {
      messages.push({
        id: 'RSC-001',
        severity: 'fatal',
        message: `Failed to initialize XSD validator: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return messages;
  }
}
