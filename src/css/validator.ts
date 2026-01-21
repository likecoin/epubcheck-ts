/**
 * CSS validation using css-tree
 */

import { parse, walk, type CssNode, type Declaration } from 'css-tree';
import type { ValidationContext } from '../types.js';

interface ParseErrorWithLocation {
  formattedMessage: string;
  line?: number;
  column?: number;
}

interface CssLocation {
  start?: { line: number; column: number };
}

/**
 * Validator for CSS stylesheets
 */
export class CSSValidator {
  /**
   * Validate CSS content
   */
  validate(context: ValidationContext, css: string, resourcePath: string): void {
    let ast: CssNode;

    try {
      ast = parse(css, {
        positions: true,
        onParseError: (error) => {
          const err = error as ParseErrorWithLocation;
          const location: { path: string; line?: number; column?: number } = {
            path: resourcePath,
          };
          if (err.line !== undefined) location.line = err.line;
          if (err.column !== undefined) location.column = err.column;

          context.messages.push({
            id: 'CSS-001',
            severity: 'error',
            message: `CSS parse error: ${error.formattedMessage}`,
            location,
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
      return;
    }

    // Walk the AST to check for discouraged properties
    this.checkDiscouragedProperties(context, ast, resourcePath);
  }

  /**
   * Check for discouraged CSS properties in EPUB
   */
  private checkDiscouragedProperties(
    context: ValidationContext,
    ast: CssNode,
    resourcePath: string,
  ): void {
    walk(ast, (node) => {
      if (node.type === 'Declaration') {
        this.checkPositionProperty(context, node, resourcePath);
      }
    });
  }

  /**
   * Check position property for discouraged values
   */
  private checkPositionProperty(
    context: ValidationContext,
    node: Declaration,
    resourcePath: string,
  ): void {
    const property = node.property.toLowerCase();
    if (property !== 'position') return;

    const value = this.getDeclarationValue(node);
    const loc = (node as CssNode & { loc?: CssLocation }).loc;
    const start = loc?.start;
    const location: { path: string; line?: number; column?: number } = { path: resourcePath };
    if (start) {
      location.line = start.line;
      location.column = start.column;
    }

    // CSS-006: position: fixed is discouraged
    if (value === 'fixed') {
      context.messages.push({
        id: 'CSS-006',
        severity: 'warning',
        message: 'CSS property "position: fixed" is discouraged in EPUB',
        location,
      });
    }

    // CSS-019: position: absolute is discouraged
    if (value === 'absolute') {
      context.messages.push({
        id: 'CSS-019',
        severity: 'warning',
        message: 'CSS property "position: absolute" should be used with caution in EPUB',
        location,
      });
    }
  }

  /**
   * Extract the value from a Declaration node
   */
  private getDeclarationValue(node: Declaration): string {
    const value = node.value;
    if (value.type === 'Value') {
      const first = value.children.first;
      if (first?.type === 'Identifier') {
        return first.name.toLowerCase();
      }
    }
    return '';
  }
}
