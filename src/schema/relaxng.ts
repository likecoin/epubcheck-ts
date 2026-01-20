import type { ValidationMessage } from '../types.js';
import { BaseSchemaValidator } from './validator.js';

/**
 * Helper functions for loading schemas (static to avoid `this` issues)
 */

/**
 * RelaxNG schema validator using libxml2-wasm
 *
 * Note: libxml2 has deprecated RelaxNG support, so this may need
 * to be replaced in the future.
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
    try {
      const response = await fetch(`/schemas/${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to load schema: ${response.statusText}`);
      }
      return await response.text();
    } catch (fetchError) {
      throw new Error(
        `Could not load bundled schema "${filename}": ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
      );
    }
  }
}

async function loadSchemaFromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load schema: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    throw new Error(
      `Could not load schema from URL "${url}": ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

async function loadSchema(schemaPath: string): Promise<string> {
  if (!schemaPath.startsWith('http://') && !schemaPath.startsWith('https://')) {
    return loadBundledSchema(schemaPath);
  }

  return loadSchemaFromUrl(schemaPath);
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
            messages.push({
              id: 'RSC-005',
              severity: 'error',
              message: error instanceof Error ? error.message : 'RelaxNG validation failed',
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
        message: `Failed to initialize RelaxNG validator: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return messages;
  }
}
