import { pushMessage } from '../messages/message-registry.js';
import type { ValidationMessage } from '../types.js';
import { getSchema, getSchemaNames } from './schemas.generated.js';
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

  throw new Error(
    `Schema not found: "${filename}". Available schemas: ${getSchemaNames().join(', ')}`,
  );
}

/**
 * RelaxNG schema validator using libxml2-wasm
 *
 * Note: libxml2 has deprecated RelaxNG support, so this may need
 * to be replaced in the future.
 */

export class RelaxNGValidator extends BaseSchemaValidator {
  async validate(xml: string, schemaPath: string): Promise<ValidationMessage[]> {
    this.checkDisposed();

    const messages: ValidationMessage[] = [];

    try {
      const libxml2 = await import('libxml2-wasm');
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      const LibRelaxNGValidator = libxml2.RelaxNGValidator;
      const { XmlDocument } = libxml2;

      const doc = XmlDocument.fromString(xml);

      try {
        const schemaContent = await loadSchema(schemaPath);
        const schemaDoc = XmlDocument.fromString(schemaContent);

        try {
          const validator = LibRelaxNGValidator.fromDoc(schemaDoc);

          try {
            validator.validate(doc);
          } catch (error) {
            const parsed = this.parseLibxmlError(
              error instanceof Error ? error.message : 'RelaxNG validation failed',
            );
            const location: { path: string; line?: number; column?: number } = { path: schemaPath };
            if (parsed.line !== undefined) location.line = parsed.line;
            if (parsed.column !== undefined) location.column = parsed.column;
            pushMessage(messages, {
              id: 'RSC-005',
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
      pushMessage(messages, {
        id: 'RSC-001',
        message: `Failed to initialize RelaxNG validator: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return messages;
  }
}
