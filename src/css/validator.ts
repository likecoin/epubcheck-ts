/**
 * CSS validation using css-tree
 */

import { type Atrule, type CssNode, type Declaration, type Url, parse, walk } from 'css-tree';
import { MessageId, pushMessage } from '../messages/index.js';
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
 * Reference found in CSS (for @import, @font-face src, and url() declarations)
 */
export interface CSSReference {
  url: string;
  type: 'import' | 'font' | 'image' | 'resource';
  line?: number | undefined;
  column?: number | undefined;
}

/**
 * Result of CSS validation including extracted references
 */
export interface CSSValidationResult {
  /** References to other resources (imports, fonts) */
  references: CSSReference[];
  /** Font families declared via @font-face */
  fontFamilies: string[];
}

/** Standard EPUB font MIME types */
const BLESSED_FONT_TYPES = new Set([
  'application/font-woff',
  'application/font-woff2',
  'font/woff',
  'font/woff2',
  'font/otf',
  'font/ttf',
  'application/vnd.ms-opentype',
  'application/font-sfnt',
  'application/x-font-ttf',
  'application/x-font-opentype',
  'application/x-font-truetype',
]);

/** Map file extensions to font MIME types */
const FONT_EXTENSION_TO_TYPE: Record<string, string> = {
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf',
};

/**
 * Validator for CSS stylesheets
 */
export class CSSValidator {
  /**
   * Validate CSS content and extract references
   */
  validate(context: ValidationContext, css: string, resourcePath: string): CSSValidationResult {
    const result: CSSValidationResult = {
      references: [],
      fontFamilies: [],
    };

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

          pushMessage(context.messages, {
            id: MessageId.CSS_008,
            message: `CSS parse error: ${error.formattedMessage}`,
            location,
          });
        },
      });
    } catch (error) {
      pushMessage(context.messages, {
        id: MessageId.CSS_008,
        message: `CSS parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        location: { path: resourcePath },
      });
      return result;
    }

    // Walk the AST to check for discouraged properties and collect references
    this.checkDiscouragedProperties(context, ast, resourcePath);
    this.checkAtRules(context, ast, resourcePath, result);
    this.checkMediaOverlayClasses(context, ast, resourcePath);
    this.extractUrlReferences(context, ast, resourcePath, result);

    return result;
  }

  private extractUrlReferences(
    context: ValidationContext,
    ast: CssNode,
    resourcePath: string,
    result: CSSValidationResult,
  ): void {
    walk(ast, (node) => {
      if (node.type === 'Atrule') {
        const atRule = node;
        if (atRule.name === 'font-face') {
          return;
        }
        if (atRule.block) {
          walk(atRule.block, (blockNode) => {
            if (blockNode.type === 'Declaration') {
              this.processDeclarationForUrl(blockNode, resourcePath, result);
            }
          });
        }
      } else if (node.type === 'Rule') {
        const rule = node;
        walk(rule.block, (blockNode) => {
          if (blockNode.type === 'Declaration') {
            this.processDeclarationForUrl(blockNode, resourcePath, result);
          }
        });
      }
    });
  }

  private processDeclarationForUrl(
    declaration: Declaration,
    resourcePath: string,
    result: CSSValidationResult,
  ): void {
    const property = declaration.property.toLowerCase();

    walk(declaration.value, (valueNode) => {
      if (valueNode.type === 'Url') {
        const urlValue = this.extractUrlValue(valueNode);
        if (urlValue && !urlValue.startsWith('data:')) {
          const loc = (valueNode as CssNode & { loc?: CssLocation }).loc;
          const start = loc?.start;
          const location: { path: string; line?: number; column?: number } = {
            path: resourcePath,
          };
          if (start) {
            location.line = start.line;
            location.column = start.column;
          }

          let refType: 'image' | 'font' | 'resource' = 'resource';
          if (property.includes('font')) {
            refType = 'font';
          } else if (
            property.includes('background') ||
            property.includes('list-style') ||
            property.includes('content') ||
            property.includes('border-image') ||
            property.includes('mask')
          ) {
            refType = 'image';
          }

          result.references.push({
            url: urlValue,
            type: refType,
            line: start?.line,
            column: start?.column,
          });
        }
      }
    });
  }

  /**
   * Check for forbidden and discouraged CSS properties in EPUB
   */
  private checkDiscouragedProperties(
    context: ValidationContext,
    ast: CssNode,
    resourcePath: string,
  ): void {
    walk(ast, (node) => {
      if (node.type === 'Declaration') {
        this.checkForbiddenProperties(context, node, resourcePath);
        this.checkPositionProperty(context, node, resourcePath);
      }
    });
  }

  /**
   * Check for forbidden CSS properties (direction, unicode-bidi)
   * These properties must not be used in EPUB content per EPUB spec
   */
  private checkForbiddenProperties(
    context: ValidationContext,
    node: Declaration,
    resourcePath: string,
  ): void {
    const property = node.property.toLowerCase();
    const forbiddenProperties = ['direction', 'unicode-bidi'];

    if (!forbiddenProperties.includes(property)) return;

    const loc = (node as CssNode & { loc?: CssLocation }).loc;
    const start = loc?.start;
    const location: { path: string; line?: number; column?: number } = { path: resourcePath };
    if (start) {
      location.line = start.line;
      location.column = start.column;
    }

    pushMessage(context.messages, {
      id: MessageId.CSS_001,
      message: `CSS property "${property}" must not be included in an EPUB Style Sheet`,
      location,
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
      pushMessage(context.messages, {
        id: MessageId.CSS_006,
        message: 'CSS property "position: fixed" is discouraged in EPUB',
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

  /**
   * Check at-rules (@import, @font-face)
   */
  private checkAtRules(
    context: ValidationContext,
    ast: CssNode,
    resourcePath: string,
    result: CSSValidationResult,
  ): void {
    walk(ast, (node) => {
      if (node.type === 'Atrule') {
        const atRule = node;
        const ruleName = atRule.name.toLowerCase();

        if (ruleName === 'import') {
          this.checkImport(context, atRule, resourcePath, result);
        } else if (ruleName === 'font-face') {
          this.checkFontFace(context, atRule, resourcePath, result);
        }
      }
    });
  }

  /**
   * Check @import at-rule
   */
  private checkImport(
    context: ValidationContext,
    atRule: Atrule,
    resourcePath: string,
    result: CSSValidationResult,
  ): void {
    const loc = (atRule as CssNode & { loc?: CssLocation }).loc;
    const start = loc?.start;
    const location: { path: string; line?: number; column?: number } = { path: resourcePath };
    if (start) {
      location.line = start.line;
      location.column = start.column;
    }

    // Extract URL from @import prelude
    if (!atRule.prelude) {
      pushMessage(context.messages, {
        id: MessageId.CSS_002,
        message: 'Empty @import rule',
        location,
      });
      return;
    }

    let importUrl = '';

    walk(atRule.prelude, (node) => {
      if (importUrl) return;

      if (node.type === 'Url') {
        importUrl = this.extractUrlValue(node);
      } else if (node.type === 'String') {
        importUrl = (node as { value: string }).value;
      }
    });

    if (!importUrl || importUrl.trim() === '') {
      pushMessage(context.messages, {
        id: MessageId.CSS_002,
        message: 'Empty or NULL reference found in @import',
        location,
      });
      return;
    }

    // Add to references for cross-reference validation
    result.references.push({
      url: importUrl,
      type: 'import',
      line: start?.line,
      column: start?.column,
    });
  }

  /**
   * Check @font-face at-rule
   */
  private checkFontFace(
    context: ValidationContext,
    atRule: Atrule,
    resourcePath: string,
    result: CSSValidationResult,
  ): void {
    const loc = (atRule as CssNode & { loc?: CssLocation }).loc;
    const start = loc?.start;
    const location: { path: string; line?: number; column?: number } = { path: resourcePath };
    if (start) {
      location.line = start.line;
      location.column = start.column;
    }

    // Report font-face usage
    if (context.options.includeUsage) {
      pushMessage(context.messages, {
        id: MessageId.CSS_028,
        message: 'Use of @font-face declaration',
        location,
      });
    }

    // Check if @font-face has any declarations
    if (!atRule.block || atRule.block.children.isEmpty) {
      pushMessage(context.messages, {
        id: MessageId.CSS_019,
        message: '@font-face declaration has no attributes',
        location,
      });
      return;
    }

    const state = { hasSrc: false, fontFamily: null as string | null };

    walk(atRule.block, (node) => {
      if (node.type === 'Declaration') {
        const propName = node.property.toLowerCase();

        if (propName === 'font-family') {
          state.fontFamily = this.extractFontFamily(node);
        } else if (propName === 'src') {
          state.hasSrc = true;
          this.checkFontFaceSrc(context, node, resourcePath, result);
        }
      }
    });

    if (state.fontFamily) {
      result.fontFamilies.push(state.fontFamily);
    }

    if (!state.hasSrc) {
      pushMessage(context.messages, {
        id: MessageId.CSS_019,
        message: '@font-face declaration is missing src property',
        location,
      });
    }
  }

  /**
   * Check src property in @font-face
   */
  private checkFontFaceSrc(
    context: ValidationContext,
    decl: Declaration,
    resourcePath: string,
    result: CSSValidationResult,
  ): void {
    const loc = (decl as CssNode & { loc?: CssLocation }).loc;
    const start = loc?.start;
    const location: { path: string; line?: number; column?: number } = { path: resourcePath };
    if (start) {
      location.line = start.line;
      location.column = start.column;
    }

    // Walk through the value to find url() functions
    walk(decl.value, (node) => {
      if (node.type === 'Url') {
        const urlNode = node;
        const urlValue = this.extractUrlValue(urlNode);

        if (!urlValue || urlValue.trim() === '') {
          pushMessage(context.messages, {
            id: MessageId.CSS_002,
            message: 'Empty or NULL reference found in @font-face src',
            location,
          });
          return;
        }

        // Skip data: URLs and fragment-only URLs
        if (urlValue.startsWith('data:') || urlValue.startsWith('#')) {
          return;
        }

        // Add to references for cross-reference validation
        result.references.push({
          url: urlValue,
          type: 'font',
          line: start?.line,
          column: start?.column,
        });

        // Check font MIME type based on extension
        this.checkFontType(context, urlValue, resourcePath, location);
      }
    });
  }

  /**
   * Check if font type is a blessed EPUB font type
   */
  private checkFontType(
    context: ValidationContext,
    fontUrl: string,
    resourcePath: string,
    location: { path: string; line?: number; column?: number },
  ): void {
    // Extract file extension
    const urlPath = fontUrl.split('?')[0] ?? fontUrl; // Remove query string
    const extMatch = /\.[a-zA-Z0-9]+$/.exec(urlPath);
    if (!extMatch) return;

    const ext = extMatch[0].toLowerCase();
    const mimeType = FONT_EXTENSION_TO_TYPE[ext];

    if (mimeType && !BLESSED_FONT_TYPES.has(mimeType)) {
      pushMessage(context.messages, {
        id: MessageId.CSS_007,
        message: `Font-face reference "${fontUrl}" refers to non-standard font type "${mimeType}"`,
        location,
      });
    }

    // Also check if the manifest has this file with a non-standard type
    const packageDoc = context.packageDocument;
    if (packageDoc) {
      // Resolve relative URL
      const cssDir = resourcePath.includes('/')
        ? resourcePath.substring(0, resourcePath.lastIndexOf('/'))
        : '';
      const resolvedPath = this.resolvePath(cssDir, fontUrl);

      const manifestItem = packageDoc.manifest.find((item) => item.href === resolvedPath);
      if (manifestItem && !BLESSED_FONT_TYPES.has(manifestItem.mediaType)) {
        pushMessage(context.messages, {
          id: MessageId.CSS_007,
          message: `Font-face reference "${fontUrl}" has non-standard media type "${manifestItem.mediaType}" in manifest`,
          location,
        });
      }
    }
  }

  /**
   * Extract URL value from Url node
   */
  private extractUrlValue(urlNode: Url): string {
    const value = urlNode.value;
    if (typeof value === 'string') {
      return value;
    }
    return '';
  }

  /**
   * Extract font-family value from declaration
   */
  private extractFontFamily(decl: Declaration): string | null {
    const value = decl.value;
    if (value.type === 'Value') {
      const first = value.children.first;
      if (first?.type === 'String') {
        return (first as { value: string }).value;
      }
      if (first?.type === 'Identifier') {
        return (first as { name: string }).name;
      }
    }
    return null;
  }

  /**
   * Resolve a relative path from a base path
   */
  private resolvePath(basePath: string, relativePath: string): string {
    // Handle absolute paths
    if (relativePath.startsWith('/')) {
      return relativePath.substring(1);
    }

    // Split paths into segments
    const baseSegments = basePath.split('/').filter(Boolean);
    const relativeSegments = relativePath.split('/');

    // Start from base directory
    const resultSegments = [...baseSegments];

    for (const segment of relativeSegments) {
      if (segment === '..') {
        resultSegments.pop();
      } else if (segment !== '.' && segment !== '') {
        resultSegments.push(segment);
      }
    }

    return resultSegments.join('/');
  }

  /**
   * Check for reserved media overlay class names
   */
  private checkMediaOverlayClasses(
    context: ValidationContext,
    ast: CssNode,
    resourcePath: string,
  ): void {
    const reservedClassNames = new Set([
      '-epub-media-overlay-active',
      'media-overlay-active',
      '-epub-media-overlay-playing',
      'media-overlay-playing',
    ]);

    walk(ast, (node) => {
      if (node.type === 'ClassSelector') {
        const className = node.name.toLowerCase();

        if (reservedClassNames.has(className)) {
          const loc = (node as CssNode & { loc?: CssLocation }).loc;
          const start = loc?.start;
          const location: { path: string; line?: number; column?: number } = { path: resourcePath };
          if (start) {
            location.line = start.line;
            location.column = start.column;
          }

          pushMessage(context.messages, {
            id: MessageId.CSS_029,
            message: `Class name "${className}" is reserved for media overlays`,
            location,
          });
        }
      }
    });
  }
}
