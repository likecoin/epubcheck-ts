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

      if (context.version.startsWith('3')) {
        const hasScripts = this.detectScripts(context, path, root);
        if (hasScripts && !manifestItem?.properties?.includes('scripted')) {
          context.messages.push({
            id: 'OPF-014',
            severity: 'error',
            message:
              'Content document contains scripts but manifest item is missing "scripted" property',
            location: { path },
          });
        }

        const hasMathML = this.detectMathML(context, path, root);
        if (hasMathML && !manifestItem?.properties?.includes('mathml')) {
          context.messages.push({
            id: 'OPF-014',
            severity: 'error',
            message:
              'Content document contains MathML but manifest item is missing "mathml" property',
            location: { path },
          });
        }

        const hasSVG = this.detectSVG(context, path, root);
        if (hasSVG && !manifestItem?.properties?.includes('svg')) {
          context.messages.push({
            id: 'OPF-014',
            severity: 'error',
            message: 'Content document contains SVG but manifest item is missing "svg" property',
            location: { path },
          });
        }

        const hasRemoteResources = this.detectRemoteResources(context, path, root);
        if (hasRemoteResources && !manifestItem?.properties?.includes('remote-resources')) {
          context.messages.push({
            id: 'OPF-014',
            severity: 'error',
            message:
              'Content document references remote resources but manifest item is missing "remote-resources" property',
            location: { path },
          });
        }
      }

      // Check for discouraged elements
      this.checkDiscouragedElements(context, path, root);

      // Check accessibility
      this.checkAccessibility(context, path, root);
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

    const ol = nav.get('.//html:ol', { html: 'http://www.w3.org/1999/xhtml' });
    if (!ol) {
      context.messages.push({
        id: 'NAV-002',
        severity: 'error',
        message: 'Navigation document toc nav must contain an ol element',
        location: { path },
      });
    }

    this.checkNavRemoteLinks(context, path, root, epubTypeAttr?.value ?? '');
  }

  private checkNavRemoteLinks(
    context: ValidationContext,
    path: string,
    root: XmlElement,
    epubTypeValue: string,
  ): void {
    const navTypes = epubTypeValue.split(/\s+/);
    const isToc = navTypes.includes('toc');
    const isLandmarks = navTypes.includes('landmarks');
    const isPageList = navTypes.includes('page-list');

    if (!isToc && !isLandmarks && !isPageList) {
      return;
    }

    const links = root.find('.//html:a[@href]', { html: 'http://www.w3.org/1999/xhtml' });
    for (const link of links) {
      const href = this.getAttribute(link as XmlElement, 'href');
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        const navType = isToc ? 'toc' : isLandmarks ? 'landmarks' : 'page-list';
        context.messages.push({
          id: 'NAV-010',
          severity: 'error',
          message: `"${navType}" nav must not link to remote resources; found link to "${href}"`,
          location: { path },
        });
      }
    }
  }

  private detectScripts(_context: ValidationContext, _path: string, root: XmlElement): boolean {
    // Check for script elements
    const htmlScript = root.get('.//html:script', { html: 'http://www.w3.org/1999/xhtml' });
    if (htmlScript) return true;

    const svgScript = root.get('.//svg:script', { svg: 'http://www.w3.org/2000/svg' });
    if (svgScript) return true;

    const form = root.get('.//html:form', { html: 'http://www.w3.org/1999/xhtml' });
    if (form) return true;

    const elementsWithEvents = root.find(
      './/*[@onclick or @onload or @onmouseover or @onmouseout or @onchange or @onsubmit or @onfocus or @onblur]',
    );
    if (elementsWithEvents.length > 0) return true;

    return false;
  }

  private detectMathML(_context: ValidationContext, _path: string, root: XmlElement): boolean {
    const mathMLElements = root.find('.//math:*', { math: 'http://www.w3.org/1998/Math/MathML' });
    return mathMLElements.length > 0;
  }

  private detectSVG(_context: ValidationContext, _path: string, root: XmlElement): boolean {
    const svgElement = root.get('.//html:svg', { html: 'http://www.w3.org/1999/xhtml' });
    if (svgElement) return true;

    const rootSvg = root.get('.//svg:svg', { svg: 'http://www.w3.org/2000/svg' });
    if (rootSvg) return true;

    return false;
  }

  private detectRemoteResources(
    _context: ValidationContext,
    _path: string,
    root: XmlElement,
  ): boolean {
    const links = root.find('.//html:a[@href]', { html: 'http://www.w3.org/1999/xhtml' });
    for (const link of links) {
      const href = this.getAttribute(link as XmlElement, 'href');
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        return true;
      }
    }

    const images = root.find('.//html:img[@src]', { html: 'http://www.w3.org/1999/xhtml' });
    for (const img of images) {
      const src = this.getAttribute(img as XmlElement, 'src');
      if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
        return true;
      }
    }

    const scripts = root.find('.//html:script[@src]', { html: 'http://www.w3.org/1999/xhtml' });
    for (const script of scripts) {
      const src = this.getAttribute(script as XmlElement, 'src');
      if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
        return true;
      }
    }

    const linkElements = root.find('.//html:link[@href]', { html: 'http://www.w3.org/1999/xhtml' });
    for (const linkElem of linkElements) {
      const href = this.getAttribute(linkElem as XmlElement, 'href');
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        return true;
      }
    }

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

  private checkAccessibility(context: ValidationContext, path: string, root: XmlElement): void {
    const links = root.find('.//html:a', { html: 'http://www.w3.org/1999/xhtml' });
    for (const link of links) {
      if (!this.hasAccessibleContent(link as XmlElement)) {
        context.messages.push({
          id: 'ACC-004',
          severity: 'warning',
          message: 'Hyperlink has no accessible text content',
          location: { path },
        });
      }
    }

    const images = root.find('.//html:img', { html: 'http://www.w3.org/1999/xhtml' });
    for (const img of images) {
      const altAttr = this.getAttribute(img as XmlElement, 'alt');
      if (altAttr === null) {
        context.messages.push({
          id: 'ACC-005',
          severity: 'warning',
          message: 'Image is missing alt attribute',
          location: { path },
        });
      }
    }

    const svgLinks = root.find('.//svg:a', { svg: 'http://www.w3.org/2000/svg' });
    for (const svgLink of svgLinks) {
      const svgElem = svgLink as XmlElement;
      const title = svgElem.get('./svg:title', { svg: 'http://www.w3.org/2000/svg' });
      const ariaLabel = this.getAttribute(svgElem, 'aria-label');
      if (!title && !ariaLabel) {
        context.messages.push({
          id: 'ACC-011',
          severity: 'warning',
          message: 'SVG hyperlink has no accessible name (missing title element or aria-label)',
          location: { path },
        });
      }
    }

    const mathElements = root.find('.//math:math', { math: 'http://www.w3.org/1998/Math/MathML' });
    for (const mathElem of mathElements) {
      const elem = mathElem as XmlElement;
      const alttext = elem.attr('alttext');
      const annotation = elem.get('./math:annotation[@encoding="application/x-tex"]', {
        math: 'http://www.w3.org/1998/Math/MathML',
      });
      const ariaLabel = this.getAttribute(elem, 'aria-label');

      if (!alttext?.value && !annotation && !ariaLabel) {
        context.messages.push({
          id: 'ACC-009',
          severity: 'warning',
          message: 'MathML element should have alttext attribute or annotation for accessibility',
          location: { path },
        });
      }
    }
  }

  private hasAccessibleContent(element: XmlElement): boolean {
    const textContent = element.content;
    if (textContent && textContent.trim().length > 0) {
      return true;
    }

    const ariaLabel = this.getAttribute(element, 'aria-label');
    if (ariaLabel && ariaLabel.trim().length > 0) {
      return true;
    }

    const img = element.get('./html:img[@alt]', { html: 'http://www.w3.org/1999/xhtml' });
    if (img) {
      const alt = this.getAttribute(img as XmlElement, 'alt');
      if (alt && alt.trim().length > 0) {
        return true;
      }
    }

    const title = this.getAttribute(element, 'title');
    if (title && title.trim().length > 0) {
      return true;
    }

    return false;
  }

  private getAttribute(element: XmlElement, name: string): string | null {
    if (!('attrs' in element)) return null;
    const attrs = element.attrs as { name: string; value: string }[];
    const attr = attrs.find((a) => a.name === name);
    return attr?.value ?? null;
  }
}
