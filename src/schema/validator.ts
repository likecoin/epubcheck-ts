import type { ValidationMessage } from '../types.js';

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
}
