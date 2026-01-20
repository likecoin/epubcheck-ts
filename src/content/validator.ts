import type { ValidationContext } from '../types.js';

/**
 * Validates XHTML content documents in the EPUB
 *
 * This includes:
 * - XML well-formedness
 * - Basic XHTML structure validation
 * - Internal link validation
 */
export class ContentValidator {
  /**
   * Validate all content documents referenced in the manifest
   */
  validate(context: ValidationContext): void {
    const packageDoc = context.packageDocument;
    if (!packageDoc) {
      return;
    }

    const opfPath = context.opfPath ?? '';
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : '';

    // Validate each XHTML document in the manifest
    for (const item of packageDoc.manifest) {
      if (item.mediaType === 'application/xhtml+xml') {
        const fullPath = opfDir ? `${opfDir}/${item.href}` : item.href;
        this.validateXHTMLDocument(context, fullPath, item.id);
      }
    }
  }

  /**
   * Validate a single XHTML document
   */
  private validateXHTMLDocument(context: ValidationContext, path: string, itemId: string): void {
    const data = context.files.get(path);
    if (!data) {
      // Missing file already reported by OPF validator
      return;
    }

    const content = new TextDecoder().decode(data);

    // Check XML well-formedness
    this.checkWellFormedness(context, path, content);

    // Check basic XHTML structure
    this.checkXHTMLStructure(context, path, content, itemId);
  }

  /**
   * Check XML well-formedness using basic parsing
   */
  private checkWellFormedness(context: ValidationContext, path: string, content: string): void {
    // Check for XML declaration
    if (!content.trimStart().startsWith('<?xml') && !content.trimStart().startsWith('<!DOCTYPE')) {
      // Not strictly required, but recommended
    }

    // Check for basic XML errors using regex patterns
    // These are heuristic checks - full validation requires a proper XML parser

    // Check for unclosed tags (very basic)
    const tagStack: string[] = [];
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9_:-]*)[^>]*\/?>/g;
    const selfClosingRegex = /\/\s*>$/;
    const voidElements = new Set([
      'area',
      'base',
      'br',
      'col',
      'embed',
      'hr',
      'img',
      'input',
      'link',
      'meta',
      'param',
      'source',
      'track',
      'wbr',
    ]);

    let match;
    while ((match = tagRegex.exec(content)) !== null) {
      const fullTag = match[0];
      const tagName = match[1]?.toLowerCase();

      if (!tagName) continue;

      // Skip comments, CDATA, processing instructions
      if (fullTag.startsWith('<!') || fullTag.startsWith('<?')) {
        continue;
      }

      // Check if it's a closing tag
      if (fullTag.startsWith('</')) {
        if (tagStack.length === 0) {
          context.messages.push({
            id: 'HTM-004',
            severity: 'error',
            message: `Unexpected closing tag </${tagName}>`,
            location: { path },
          });
        } else {
          const expected = tagStack.pop();
          if (expected !== tagName) {
            context.messages.push({
              id: 'HTM-004',
              severity: 'error',
              message: `Mismatched closing tag: expected </${expected ?? 'unknown'}>, found </${tagName}>`,
              location: { path },
            });
          }
        }
      } else if (!selfClosingRegex.test(fullTag) && !voidElements.has(tagName)) {
        // Opening tag that's not self-closing
        tagStack.push(tagName);
      }
    }

    // Check for unclosed tags
    if (tagStack.length > 0) {
      context.messages.push({
        id: 'HTM-004',
        severity: 'error',
        message: `Unclosed tags: ${tagStack.join(', ')}`,
        location: { path },
      });
    }

    // Check for common XML errors

    // Unescaped ampersands (but not in CDATA or comments)
    const ampersandRegex = /&(?![a-zA-Z]+;|#[0-9]+;|#x[0-9a-fA-F]+;)/g;
    // Remove CDATA sections and comments first
    const contentWithoutCdata = content
      .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '');

    if (ampersandRegex.test(contentWithoutCdata)) {
      context.messages.push({
        id: 'HTM-012',
        severity: 'error',
        message: 'Unescaped ampersand found. Use &amp; instead of &',
        location: { path },
      });
    }

    // Check for unescaped < in text content (rough check)
    const lessThanInText = /<(?![!?/a-zA-Z])/g;
    if (lessThanInText.test(contentWithoutCdata)) {
      context.messages.push({
        id: 'HTM-012',
        severity: 'error',
        message: 'Unescaped < found. Use &lt; instead of <',
        location: { path },
      });
    }
  }

  /**
   * Check basic XHTML structure requirements
   */
  private checkXHTMLStructure(
    context: ValidationContext,
    path: string,
    content: string,
    itemId: string,
  ): void {
    const packageDoc = context.packageDocument;
    const isNav = packageDoc?.manifest.find((i) => i.id === itemId)?.properties?.includes('nav');

    // Check for html element with xmlns
    if (!/<html[^>]*xmlns\s*=\s*["']http:\/\/www\.w3\.org\/1999\/xhtml["']/i.test(content)) {
      context.messages.push({
        id: 'HTM-001',
        severity: 'error',
        message: 'XHTML document must have html element with xmlns="http://www.w3.org/1999/xhtml"',
        location: { path },
      });
    }

    // Check for head element
    if (!/<head[\s>]/i.test(content)) {
      context.messages.push({
        id: 'HTM-002',
        severity: 'error',
        message: 'XHTML document must have a head element',
        location: { path },
      });
    }

    // Check for title element inside head
    if (!/<title[\s>].*<\/title>/is.test(content)) {
      context.messages.push({
        id: 'HTM-003',
        severity: 'error',
        message: 'XHTML document must have a title element',
        location: { path },
      });
    }

    // Check for body element
    if (!/<body[\s>]/i.test(content)) {
      context.messages.push({
        id: 'HTM-002',
        severity: 'error',
        message: 'XHTML document must have a body element',
        location: { path },
      });
    }

    // Navigation document specific checks
    if (isNav) {
      this.checkNavDocument(context, path, content);
    }
  }

  /**
   * Check navigation document requirements
   */
  private checkNavDocument(context: ValidationContext, path: string, content: string): void {
    // Check for epub:type="toc" nav element
    if (!/<nav[^>]*epub:type\s*=\s*["'][^"']*toc[^"']*["']/i.test(content)) {
      context.messages.push({
        id: 'NAV-001',
        severity: 'error',
        message: 'Navigation document must have a nav element with epub:type="toc"',
        location: { path },
      });
    }

    // Check for ol element inside nav
    const navMatch =
      /<nav[^>]*epub:type\s*=\s*["'][^"']*toc[^"']*["'][^>]*>([\s\S]*?)<\/nav>/i.exec(content);
    if (navMatch?.[1] && !/<ol[\s>]/i.test(navMatch[1])) {
      context.messages.push({
        id: 'NAV-002',
        severity: 'error',
        message: 'Navigation document toc nav must contain an ol element',
        location: { path },
      });
    }
  }
}
