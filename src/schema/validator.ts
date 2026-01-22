import type { ValidationMessage } from '../types.js';

/**
 * Result of parsing a libxml2 error message
 */
interface LibxmlErrorParseResult {
  message: string;
  line: number | undefined;
  column: number | undefined;
}

/**
 * Interface for schema validators
 */
export interface SchemaValidator {
  /**
   * Validate XML content against a schema
   *
   * @param xml - The XML content to validate
   * @param schemaPath - Path to the schema file
   * @returns Array of validation messages
   */
  validate(xml: string, schemaPath: string): Promise<ValidationMessage[]>;

  /**
   * Dispose of any resources held by the validator
   */
  dispose(): void;
}

/**
 * Base class for schema validators
 */
export abstract class BaseSchemaValidator implements SchemaValidator {
  protected disposed = false;

  abstract validate(xml: string, schemaPath: string): Promise<ValidationMessage[]>;

  dispose(): void {
    this.disposed = true;
  }

  protected checkDisposed(): void {
    if (this.disposed) {
      throw new Error('Validator has been disposed');
    }
  }

  /**
   * Parse libxml2-wasm error message to extract line and column numbers
   *
   * Error formats:
   * - "Entity: line 10: parser error : message"
   * - "Element '{name}': This element is not expected. Expected is ( {name} )."
   * - "file:10: element name: Schemas validity error : ..."
   *
   * @param error - The error message from libxml2-wasm
   * @returns Parsed message with line and column if available
   */
  protected parseLibxmlError(error: string): LibxmlErrorParseResult {
    // Extract line number from libxml2-wasm error message
    // Format: "Entity: line 10: parser error : message" or "file:10: ..."
    const lineRegex = /(?:Entity:\s*)?(?:file:)?(?:line\s+)?(\d+):/;
    const lineMatch = lineRegex.exec(error);
    const line = lineMatch?.[1] ? Number.parseInt(lineMatch[1], 10) : undefined;

    // Extract column if present (after line number)
    const columnRegex = /line\s+\d+:\s*(\d+):/;
    const columnMatch = columnRegex.exec(error);
    const column = columnMatch?.[1] ? Number.parseInt(columnMatch[1], 10) : undefined;

    // Normalize error message - remove libxml2 prefix
    let message = error;
    if (error.includes('Opening and ending tag mismatch')) {
      message = `Mismatched closing tag: ${error.replace('Opening and ending tag mismatch: ', '')}`;
    } else if (error.includes('mismatch')) {
      message = `Mismatched closing tag: ${error}`;
    } else {
      message = error
        .replace(/^Entity:\s*line\s+\d+:\s*(parser\s+error\s*:)?\s*/, '')
        .replace(/^Schemas validity error:\s*/, '')
        .replace(/^Element .*:\s*/, '');
    }

    return { message, line, column };
  }
}
