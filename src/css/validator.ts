/**
 * CSS validation using css-tree
 */

import { parse } from 'css-tree';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { ValidationContext } from '../types.js';

interface ParseErrorWithLocation {
  formattedMessage: string;
  line?: number;
  column?: number;
}

/**
 * Validator for CSS stylesheets
 */
export class CSSValidator {
  /**
   * Validate CSS content
   */
  validate(context: ValidationContext, css: string, resourcePath: string): void {
    try {
      parse(css, {
        positions: true,
        onParseError: (error) => {
          const err = error as ParseErrorWithLocation;
          const loc = { path: resourcePath };

          if (err.line) {
            (loc as { line?: number }).line = err.line;
          }

          if (err.column) {
            (loc as { column?: number }).column = err.column;
          }

          context.messages.push({
            id: 'CSS-001',
            severity: 'error',
            message: `CSS parse error: ${error.formattedMessage}`,
            location: loc,
          });
        },
      });
    } catch (error) {
      context.messages.push({
        id: 'CSS-001',
        severity: 'error',
        message: `CSS parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        location: { path: resourcePath },
      });
    }
  }
}
