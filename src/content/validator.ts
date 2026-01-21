/**
 * Content document validation using libxml2-wasm for XML parsing
 */

import { XmlDocument, type XmlElement } from 'libxml2-wasm';
import type { ValidationContext } from '../types.js';

// Note: Full list of event handlers for reference, but we use XPath for detection
// const SCRIPT_EVENT_HANDLERS = ['onclick', 'onload', 'onmouseover', ...];

const DISCOURAGED_ELEMENTS = new Set(['base', 'embed']);

export class ContentValidator {
  validate(context: ValidationContext): void {
    const packageDoc = context.packageDocument;
    if (!packageDoc) {
      return;
    }

    const opfPath = context.opfPath ?? '';
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : '';

    for (const item of packageDoc.manifest) {
      if (item.mediaType === 'application/xhtml+xml') {
        const fullPath = opfDir ? `${opfDir}/${item.href}` : item.href;
        this.validateXHTMLDocument(context, fullPath, item.id);
      }
    }
  }

  private validateXHTMLDocument(context: ValidationContext, path: string, itemId: string): void {
    const data = context.files.get(path);
    if (!data) {
      return;
    }

    const content = new TextDecoder().decode(data);
    const packageDoc = context.packageDocument;
    if (!packageDoc) {
      return;
    }

    // Check for unescaped ampersands before parsing
    this.checkUnescapedAmpersands(context, path, content);

    // Try to parse with libxml2-wasm to check for well-formedness
    let doc: XmlDocument | null = null;
    try {
      doc = XmlDocument.fromString(content);
    } catch (error) {
      if (error instanceof Error) {
        const { message, line, column } = this.parseLibxmlError(error.message);
        const location: { path: string; line?: number; column?: number } = { path };
        if (line !== undefined) {
          location.line = line;
        }
        if (column !== undefined) {
          location.column = column;
        }
        context.messages.push({
          id: 'HTM-004',
          severity: 'error',
          message,
          location,
        });
      }
      return;
    }

    try {
      const root = doc.root;

      // Check for html element with xmlns
      const nsDecls = root.nsDeclarations;
      const hasXhtmlNamespace =
        nsDecls[''] === 'http://www.w3.org/1999/xhtml' ||
        Object.values(nsDecls).some((uri) => uri === 'http://www.w3.org/1999/xhtml');

      if (!hasXhtmlNamespace) {
        context.messages.push({
          id: 'HTM-001',
          severity: 'error',
          message:
            'XHTML document must have html element with xmlns="http://www.w3.org/1999/xhtml"',
          location: { path },
        });
      }

      // Check for head element
      const head = root.get('.//html:head', { html: 'http://www.w3.org/1999/xhtml' });
      if (!head) {
        context.messages.push({
          id: 'HTM-002',
          severity: 'error',
          message: 'XHTML document must have a head element',
          location: { path },
        });
      }

      // Check for title element
      const title = root.get('.//html:title', { html: 'http://www.w3.org/1999/xhtml' });
      if (!title) {
        context.messages.push({
          id: 'HTM-003',
          severity: 'error',
          message: 'XHTML document must have a title element',
          location: { path },
        });
      }

      // Check for body element
      const body = root.get('.//html:body', { html: 'http://www.w3.org/1999/xhtml' });
      if (!body) {
        context.messages.push({
          id: 'HTM-002',
          severity: 'error',
          message: 'XHTML document must have a body element',
          location: { path },
        });
      }

      // Check if it's a navigation document
      const manifestItem = packageDoc.manifest.find(
        (item: { id: string; properties?: string[] }) => item.id === itemId,
      );
      const isNavItem = manifestItem?.properties?.includes('nav');

      if (isNavItem) {
        this.checkNavDocument(context, path, doc, root);
      }

      // Check for scripts and scripted property (EPUB 3 only)
      if (context.version.startsWith('3')) {
        const hasScripts = this.detectScripts(context, path, root);
        if (hasScripts && !manifestItem?.properties?.includes('scripted')) {
          context.messages.push({
            id: 'OPF-014',
            severity: 'error',
            message: 'Content document contains scripts but manifest item is missing "scripted" property',
            location: { path },
          });
        }
      }

      // Check for discouraged elements
      this.checkDiscouragedElements(context, path, root);
    } finally {
      doc.dispose();
    }
  }

  private parseLibxmlError(error: string): {
    message: string;
    line: number | undefined;
    column: number | undefined;
  } {
    // Extract line number from libxml2-wasm error message
    // Format: "Entity: line 10: parser error : message"
    const lineRegex = /(?:Entity:\s*)?line\s+(\d+):/;
    const lineMatch = lineRegex.exec(error);
    const line = lineMatch?.[1] ? Number.parseInt(lineMatch[1], 10) : undefined;

    // Extract column if present
    const columnRegex = /line\s+\d+:\s*(\d+):/;
    const columnMatch = columnRegex.exec(error);
    const column = columnMatch?.[1] ? Number.parseInt(columnMatch[1], 10) : undefined;

    // Normalize error message
    let message = error;
    if (error.includes('Opening and ending tag mismatch')) {
      message = `Mismatched closing tag: ${error.replace('Opening and ending tag mismatch: ', '')}`;
    } else if (error.includes('mismatch')) {
      message = `Mismatched closing tag: ${error}`;
    } else {
      // Remove libxml2 prefix from other errors
      message = error.replace(/^Entity:\s*line\s+\d+:\s*(parser\s+error\s*:)?\s*/, '');
    }

    return { message, line, column };
  }

  private checkUnescapedAmpersands(
    context: ValidationContext,
    path: string,
    content: string,
  ): void {
    // Find all ampersands that are not part of entity references
    const ampersandRegex = /&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);)/g;
    let match;
    while ((match = ampersandRegex.exec(content)) !== null) {
      // Calculate line number
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      const index = match.index ?? 0;
      const before = content.substring(0, index);
      const line = before.split('\n').length;

      context.messages.push({
        id: 'HTM-012',
        severity: 'error',
        message: 'Unescaped ampersand',
        location: { path, line },
      });
    }
  }

  private checkNavDocument(
    context: ValidationContext,
    path: string,
    doc: XmlDocument,
    root: XmlElement,
  ): void {
    const nav = root.get('.//html:nav', { html: 'http://www.w3.org/1999/xhtml' });
    if (!nav) {
      context.messages.push({
        id: 'NAV-001',
        severity: 'error',
        message: 'Navigation document must have a nav element',
        location: { path },
      });
      return;
    }

    if (!('attrs' in nav)) {
      return;
    }

    const epubTypeAttr = (
      nav.attrs as { name: string; value: string; prefix?: string; namespaceUri?: string }[]
    ).find(
      (attr) =>
        attr.name === 'type' &&
        attr.prefix === 'epub' &&
        attr.namespaceUri === 'http://www.idpf.org/2007/ops',
    );

    if (!epubTypeAttr?.value.includes('toc')) {
      context.messages.push({
        id: 'NAV-001',
        severity: 'error',
        message: 'Navigation document nav element must have epub:type="toc"',
        location: { path },
      });
    }

    // Check for ol element inside nav
    const ol = nav.get('.//html:ol', { html: 'http://www.w3.org/1999/xhtml' });
    if (!ol) {
      context.messages.push({
        id: 'NAV-002',
        severity: 'error',
        message: 'Navigation document toc nav must contain an ol element',
        location: { path },
      });
    }
  }

  private detectScripts(
    _context: ValidationContext,
    _path: string,
    root: XmlElement,
  ): boolean {
    // Check for script elements
    const htmlScript = root.get('.//html:script', { html: 'http://www.w3.org/1999/xhtml' });
    if (htmlScript) return true;

    const svgScript = root.get('.//svg:script', { svg: 'http://www.w3.org/2000/svg' });
    if (svgScript) return true;

    // Check for form elements (require scripted property)
    const form = root.get('.//html:form', { html: 'http://www.w3.org/1999/xhtml' });
    if (form) return true;

    // Check for event handler attributes via XPath
    // This is a simplified check - look for common event handlers
    const elementsWithEvents = root.find(
      './/*[@onclick or @onload or @onmouseover or @onmouseout or @onchange or @onsubmit or @onfocus or @onblur]',
    );
    if (elementsWithEvents.length > 0) return true;

    return false;
  }

  private checkDiscouragedElements(
    context: ValidationContext,
    path: string,
    root: XmlElement,
  ): void {
    for (const elemName of DISCOURAGED_ELEMENTS) {
      const element = root.get(`.//html:${elemName}`, { html: 'http://www.w3.org/1999/xhtml' });
      if (element) {
        context.messages.push({
          id: 'HTM-055',
          severity: 'warning',
          message: `The "${elemName}" element is discouraged in EPUB`,
          location: { path },
        });
      }
    }
  }
}
