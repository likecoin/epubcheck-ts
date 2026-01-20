import type { ValidationMessage } from '../types.js';
import { BaseSchemaValidator } from './validator.js';

/**
 * Helper functions for loading schemas (static to avoid `this` issues)
 */

async function loadBundledSchema(schemaPath: string): Promise<string> {
  const filename = schemaPath.split('/').pop() ?? schemaPath;

  try {
    const { readFileSync } = await import('fs');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const { resolve } = await import('path');
    const { fileURLToPath } = await import('url');

    const currentDir = fileURLToPath(new URL('.', import.meta.url));
    const schemaFilePath = resolve(currentDir, '..', '..', 'schemas', filename);

    const content = readFileSync(schemaFilePath, 'utf-8');
    return content;
  } catch {
    throw new Error(`Could not load bundled schema "${filename}": Failed to fetch schema`);
  }
}

async function loadSchemaFromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load schema: ${response.statusText}`);
    }
    return await response.text();
  } catch {
    throw new Error(`Could not load schema from URL "${url}": Failed to fetch schema`);
  }
}

async function loadSchema(schemaPath: string): Promise<string> {
  if (!schemaPath.startsWith('http://') && !schemaPath.startsWith('https://')) {
    return loadBundledSchema(schemaPath);
  }

  return loadSchemaFromUrl(schemaPath);
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
            messages.push({
              id: 'RSC-005',
              severity: 'error',
              message: error instanceof Error ? error.message : 'XSD validation failed',
              location: { path: schemaPath },
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
