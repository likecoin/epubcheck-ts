/**
 * Content document validation using libxml2-wasm for XML parsing
 */

import { XmlDocument, type XmlElement, type XmlNode } from 'libxml2-wasm';
import { CSSValidator } from '../css/validator.js';
import { MessageId, pushMessage } from '../messages/index.js';
import type { ResourceRegistry } from '../references/registry.js';
import { ReferenceType } from '../references/types.js';
import type { ReferenceValidator } from '../references/validator.js';
import type { ValidationContext } from '../types.js';

const DISCOURAGED_ELEMENTS = new Set(['base', 'embed']);

const HTML_ENTITIES = new Set([
  'nbsp',
  'iexcl',
  'cent',
  'pound',
  'curren',
  'yen',
  'brvbar',
  'sect',
  'uml',
  'copy',
  'ordf',
  'laquo',
  'not',
  'shy',
  'reg',
  'macr',
  'deg',
  'plusmn',
  'sup2',
  'sup3',
  'acute',
  'micro',
  'para',
  'middot',
  'cedil',
  'sup1',
  'ordm',
  'raquo',
  'frac14',
  'frac12',
  'frac34',
  'iquest',
  'Agrave',
  'Aacute',
  'Acirc',
  'Atilde',
  'Auml',
  'Aring',
  'AElig',
  'Ccedil',
  'Egrave',
  'Eacute',
  'Ecirc',
  'Euml',
  'Igrave',
  'Iacute',
  'Icirc',
  'Iuml',
  'ETH',
  'Ntilde',
  'Ograve',
  'Oacute',
  'Ocirc',
  'Otilde',
  'Ouml',
  'times',
  'Oslash',
  'Ugrave',
  'Uacute',
  'Ucirc',
  'Uuml',
  'Yacute',
  'THORN',
  'szlig',
  'agrave',
  'aacute',
  'acirc',
  'atilde',
  'auml',
  'aring',
  'aelig',
  'ccedil',
  'egrave',
  'eacute',
  'ecirc',
  'euml',
  'igrave',
  'iacute',
  'icirc',
  'iuml',
  'eth',
  'ntilde',
  'ograve',
  'oacute',
  'ocirc',
  'otilde',
  'ouml',
  'divide',
  'oslash',
  'ugrave',
  'uacute',
  'ucirc',
  'uuml',
  'yacute',
  'thorn',
  'yuml',
]);

export class ContentValidator {
  validate(
    context: ValidationContext,
    registry?: ResourceRegistry,
    refValidator?: ReferenceValidator,
  ): void {
    const packageDoc = context.packageDocument;
    if (!packageDoc) {
      return;
    }

    const opfPath = context.opfPath ?? '';
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/')) : '';

    for (const item of packageDoc.manifest) {
      if (item.mediaType === 'application/xhtml+xml') {
        const fullPath = opfDir ? `${opfDir}/${item.href}` : item.href;
        this.validateXHTMLDocument(context, fullPath, item.id, opfDir, registry, refValidator);
      } else if (item.mediaType === 'text/css' && refValidator) {
        const fullPath = opfDir ? `${opfDir}/${item.href}` : item.href;
        this.validateCSSDocument(context, fullPath, opfDir, refValidator);
      } else if (item.mediaType === 'image/svg+xml' && registry) {
        // Extract IDs from SVG documents for fragment validation
        const fullPath = opfDir ? `${opfDir}/${item.href}` : item.href;
        this.extractSVGIDs(context, fullPath, registry);
      }
    }
  }

  private extractSVGIDs(
    context: ValidationContext,
    path: string,
    registry: ResourceRegistry,
  ): void {
    const svgData = context.files.get(path);
    if (!svgData) {
      return;
    }

    const svgContent = new TextDecoder().decode(svgData);
    let doc: XmlDocument | undefined;

    try {
      doc = XmlDocument.fromString(svgContent);
      // Extract IDs using XPath
      this.extractAndRegisterIDs(path, doc.root, registry);
    } catch (e) {
      pushMessage(context.messages, {
        id: MessageId.RSC_016,
        message: e instanceof Error ? e.message : 'SVG parsing failed',
        location: { path },
      });
    } finally {
      doc?.dispose();
    }
  }

  private validateCSSDocument(
    context: ValidationContext,
    path: string,
    opfDir: string,
    refValidator: ReferenceValidator,
  ): void {
    const cssData = context.files.get(path);
    if (!cssData) {
      return;
    }

    const cssContent = new TextDecoder().decode(cssData);

    // Run CSS validation and get references
    const cssValidator = new CSSValidator();
    const result = cssValidator.validate(context, cssContent, path);

    // Check if CSS has remote resources and report OPF-014 if needed
    const hasRemoteResources = result.references.some(
      (ref) => ref.url.startsWith('http://') || ref.url.startsWith('https://'),
    );
    if (hasRemoteResources) {
      const packageDoc = context.packageDocument;
      if (packageDoc) {
        // Find manifest item by checking if path ends with the href
        const manifestItem = packageDoc.manifest.find(
          (item) => path.endsWith(`/${item.href}`) || path === item.href,
        );
        if (manifestItem && !manifestItem.properties?.includes('remote-resources')) {
          pushMessage(context.messages, {
            id: MessageId.OPF_014,
            message:
              'CSS document references remote resources but manifest item is missing "remote-resources" property',
            location: { path },
          });
        }
      }
    }

    const cssDir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
    for (const ref of result.references) {
      if (ref.type === 'font') {
        if (ref.url.startsWith('http://') || ref.url.startsWith('https://')) {
          refValidator.addReference({
            url: ref.url,
            targetResource: ref.url,
            type: ReferenceType.FONT,
            location: { path },
          });
        } else {
          const resolvedPath = this.resolveRelativePath(cssDir, ref.url, opfDir);
          const hashIndex = resolvedPath.indexOf('#');
          const targetResource = hashIndex >= 0 ? resolvedPath.slice(0, hashIndex) : resolvedPath;

          refValidator.addReference({
            url: ref.url,
            targetResource,
            type: ReferenceType.FONT,
            location: { path },
          });
        }
      } else if (ref.type === 'image') {
        if (ref.url.startsWith('http://') || ref.url.startsWith('https://')) {
          refValidator.addReference({
            url: ref.url,
            targetResource: ref.url,
            type: ReferenceType.IMAGE,
            location: { path },
          });
        } else {
          const resolvedPath = this.resolveRelativePath(cssDir, ref.url, opfDir);
          const hashIndex = resolvedPath.indexOf('#');
          const targetResource = hashIndex >= 0 ? resolvedPath.slice(0, hashIndex) : resolvedPath;

          refValidator.addReference({
            url: ref.url,
            targetResource,
            type: ReferenceType.IMAGE,
            location: { path },
          });
        }
      }
    }

    this.extractCSSImports(path, cssContent, opfDir, refValidator);
  }

  private validateXHTMLDocument(
    context: ValidationContext,
    path: string,
    itemId: string,
    opfDir?: string,
    registry?: ResourceRegistry,
    refValidator?: ReferenceValidator,
  ): void {
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

        // Skip errors for common HTML entities in EPUB 2 files
        // libxml2-wasm doesn't load external DTDs, so HTML entities like &nbsp; are not recognized
        // but they're valid in EPUB 2 (defined in the XHTML 1.1 DTD)
        const entityPattern = /Entity '(\w+)' not defined/;
        const entityExec = entityPattern.exec(error.message);
        const entityName = entityExec?.[1];
        const isKnownHtmlEntity = entityName !== undefined && HTML_ENTITIES.has(entityName);
        const isEpub2 = context.version === '2.0';

        if (!isEpub2 || !isKnownHtmlEntity) {
          const location: { path: string; line?: number; column?: number } = { path };
          if (line !== undefined) {
            location.line = line;
          }
          if (column !== undefined) {
            location.column = column;
          }
          pushMessage(context.messages, {
            id: MessageId.HTM_004,
            message,
            location,
          });
        }
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
        pushMessage(context.messages, {
          id: MessageId.HTM_001,
          message:
            'XHTML document must have html element with xmlns="http://www.w3.org/1999/xhtml"',
          location: { path },
        });
      }

      // Check for head element
      const head = root.get('.//html:head', { html: 'http://www.w3.org/1999/xhtml' });
      if (!head) {
        pushMessage(context.messages, {
          id: MessageId.HTM_002,
          message: 'XHTML document must have a head element',
          location: { path },
        });
      }

      // Check for title element
      const title = root.get('.//html:title', { html: 'http://www.w3.org/1999/xhtml' });
      if (!title) {
        pushMessage(context.messages, {
          id: MessageId.HTM_003,
          message: 'XHTML document must have a title element',
          location: { path },
        });
      }

      // Check for body element
      const body = root.get('.//html:body', { html: 'http://www.w3.org/1999/xhtml' });
      if (!body) {
        pushMessage(context.messages, {
          id: MessageId.HTM_002,
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
          pushMessage(context.messages, {
            id: MessageId.OPF_014,
            message:
              'Content document contains scripts but manifest item is missing "scripted" property',
            location: { path },
          });
        }

        const hasMathML = this.detectMathML(context, path, root);
        if (hasMathML && !manifestItem?.properties?.includes('mathml')) {
          pushMessage(context.messages, {
            id: MessageId.OPF_014,
            message:
              'Content document contains MathML but manifest item is missing "mathml" property',
            location: { path },
          });
        }

        const hasSVG = this.detectSVG(context, path, root);
        if (hasSVG && !manifestItem?.properties?.includes('svg')) {
          pushMessage(context.messages, {
            id: MessageId.OPF_014,
            message: 'Content document contains SVG but manifest item is missing "svg" property',
            location: { path },
          });
        }

        const hasRemoteResources = this.detectRemoteResources(context, path, root);
        if (hasRemoteResources && !manifestItem?.properties?.includes('remote-resources')) {
          pushMessage(context.messages, {
            id: MessageId.OPF_014,
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

      // Validate images
      this.validateImages(context, path, root);

      // Validate epub:type attributes (EPUB 3)
      if (context.version.startsWith('3')) {
        this.validateEpubTypes(context, path, root);
      }

      // Validate stylesheet links
      this.validateStylesheetLinks(context, path, root);

      // Validate viewport meta for fixed-layout
      this.validateViewportMeta(context, path, root, manifestItem);

      // Extract IDs and register with registry
      if (registry) {
        this.extractAndRegisterIDs(path, root, registry);
      }

      // Extract hyperlinks and register with reference validator
      if (refValidator && opfDir !== undefined) {
        this.extractAndRegisterHyperlinks(context, path, root, opfDir, refValidator);
        this.extractAndRegisterStylesheets(path, root, opfDir, refValidator);
        this.extractAndRegisterImages(path, root, opfDir, refValidator);
        this.extractAndRegisterMathMLAltimg(path, root, opfDir, refValidator);
        this.extractAndRegisterScripts(path, root, opfDir, refValidator);
        this.extractAndRegisterCiteAttributes(path, root, opfDir, refValidator);
        this.extractAndRegisterMediaElements(path, root, opfDir, refValidator);
      }
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

      pushMessage(context.messages, {
        id: MessageId.HTM_012,
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
    const navElements = root.find('.//html:nav', { html: 'http://www.w3.org/1999/xhtml' });
    if (navElements.length === 0) {
      pushMessage(context.messages, {
        id: MessageId.NAV_001,
        message: 'Navigation document must have a nav element',
        location: { path },
      });
      return;
    }

    // Find the nav element with epub:type="toc"
    let tocNav: (typeof navElements)[0] | undefined;
    let tocEpubTypeValue = '';
    for (const nav of navElements) {
      if (!('attrs' in nav)) continue;
      const epubTypeAttr = (
        nav.attrs as { name: string; value: string; prefix?: string; namespaceUri?: string }[]
      ).find(
        (attr) =>
          attr.name === 'type' &&
          attr.prefix === 'epub' &&
          attr.namespaceUri === 'http://www.idpf.org/2007/ops',
      );
      if (epubTypeAttr?.value.includes('toc')) {
        tocNav = nav;
        tocEpubTypeValue = epubTypeAttr.value;
        break;
      }
    }

    if (!tocNav) {
      pushMessage(context.messages, {
        id: MessageId.NAV_001,
        message: 'Navigation document nav element must have epub:type="toc"',
        location: { path },
      });
      return;
    }

    const ol = tocNav.get('.//html:ol', { html: 'http://www.w3.org/1999/xhtml' });
    if (!ol) {
      pushMessage(context.messages, {
        id: MessageId.NAV_002,
        message: 'Navigation document toc nav must contain an ol element',
        location: { path },
      });
    }

    this.checkNavRemoteLinks(context, path, root, tocEpubTypeValue);
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
        pushMessage(context.messages, {
          id: MessageId.NAV_010,
          message: `"${navType}" nav must not link to remote resources; found link to "${href}"`,
          location: { path },
        });
      }
    }
  }

  private detectScripts(_context: ValidationContext, _path: string, root: XmlElement): boolean {
    // Check for script elements with JavaScript types
    // Non-JavaScript types like application/ld+json don't require "scripted" property
    const htmlScripts = root.find('.//html:script', { html: 'http://www.w3.org/1999/xhtml' });
    for (const script of htmlScripts) {
      if (this.isScriptType(this.getAttribute(script as XmlElement, 'type'))) {
        return true;
      }
    }

    const svgScripts = root.find('.//svg:script', { svg: 'http://www.w3.org/2000/svg' });
    for (const script of svgScripts) {
      if (this.isScriptType(this.getAttribute(script as XmlElement, 'type'))) {
        return true;
      }
    }

    const form = root.get('.//html:form', { html: 'http://www.w3.org/1999/xhtml' });
    if (form) return true;

    const elementsWithEvents = root.find(
      './/*[@onclick or @onload or @onmouseover or @onmouseout or @onchange or @onsubmit or @onfocus or @onblur]',
    );
    if (elementsWithEvents.length > 0) return true;

    return false;
  }

  /**
   * Check if the script type is a JavaScript type that requires "scripted" property.
   * Per EPUB spec and Java EPUBCheck, only JavaScript types require it.
   * Data block types like application/ld+json, application/json do NOT require it.
   */
  private isScriptType(type: string | null): boolean {
    // No type attribute or empty = defaults to JavaScript
    if (!type || type.trim() === '') return true;

    const jsTypes = new Set([
      'application/javascript',
      'text/javascript',
      'application/ecmascript',
      'application/x-ecmascript',
      'application/x-javascript',
      'text/ecmascript',
      'text/javascript1.0',
      'text/javascript1.1',
      'text/javascript1.2',
      'text/javascript1.3',
      'text/javascript1.4',
      'text/javascript1.5',
      'text/jscript',
      'text/livescript',
      'text/x-ecmascript',
      'text/x-javascript',
      'module', // ES modules
    ]);

    return jsTypes.has(type.toLowerCase());
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

  /**
   * Detect if the content document references remote resources that require
   * the "remote-resources" property in the manifest.
   * Per EPUB spec and Java EPUBCheck behavior:
   * - Remote images, audio, video, fonts REQUIRE the property
   * - Remote hyperlinks (<a href>) do NOT require the property
   * - Remote scripts do NOT require the property (scripted property is used instead)
   * - Remote stylesheets DO require the property
   */
  private detectRemoteResources(
    _context: ValidationContext,
    _path: string,
    root: XmlElement,
  ): boolean {
    const images = root.find('.//html:img[@src]', { html: 'http://www.w3.org/1999/xhtml' });
    for (const img of images) {
      const src = this.getAttribute(img as XmlElement, 'src');
      if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
        return true;
      }
    }

    const audio = root.find('.//html:audio[@src]', { html: 'http://www.w3.org/1999/xhtml' });
    for (const elem of audio) {
      const src = this.getAttribute(elem as XmlElement, 'src');
      if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
        return true;
      }
    }

    const video = root.find('.//html:video[@src]', { html: 'http://www.w3.org/1999/xhtml' });
    for (const elem of video) {
      const src = this.getAttribute(elem as XmlElement, 'src');
      if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
        return true;
      }
    }

    const sources = root.find('.//html:source[@src]', { html: 'http://www.w3.org/1999/xhtml' });
    for (const source of sources) {
      const src = this.getAttribute(source as XmlElement, 'src');
      if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
        return true;
      }
    }

    const linkElements = root.find('.//html:link[@rel and @href]', {
      html: 'http://www.w3.org/1999/xhtml',
    });
    for (const linkElem of linkElements) {
      const rel = this.getAttribute(linkElem as XmlElement, 'rel');
      const href = this.getAttribute(linkElem as XmlElement, 'href');
      if (href && rel?.toLowerCase().includes('stylesheet')) {
        if (href.startsWith('http://') || href.startsWith('https://')) {
          return true;
        }
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
        pushMessage(context.messages, {
          id: MessageId.HTM_055,
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
        pushMessage(context.messages, {
          id: MessageId.ACC_004,
          message: 'Hyperlink has no accessible text content',
          location: { path },
        });
      }
    }

    const images = root.find('.//html:img', { html: 'http://www.w3.org/1999/xhtml' });
    for (const img of images) {
      const altAttr = this.getAttribute(img as XmlElement, 'alt');
      if (altAttr === null) {
        pushMessage(context.messages, {
          id: MessageId.ACC_005,
          message: 'Image is missing alt attribute',
          location: { path },
        });
      }
    }

    const svgLinks = root.find('.//svg:a', {
      svg: 'http://www.w3.org/2000/svg',
      xlink: 'http://www.w3.org/1999/xlink',
    });
    for (const svgLink of svgLinks) {
      const svgElem = svgLink as XmlElement;
      const title = svgElem.get('./svg:title', { svg: 'http://www.w3.org/2000/svg' });
      const ariaLabel = this.getAttribute(svgElem, 'aria-label');
      if (!title && !ariaLabel) {
        pushMessage(context.messages, {
          id: MessageId.ACC_011,
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
        pushMessage(context.messages, {
          id: MessageId.ACC_009,
          message: 'MathML element should have alttext attribute or annotation for accessibility',
          location: { path },
        });
      }
    }
  }

  private validateImages(context: ValidationContext, path: string, root: XmlElement): void {
    const packageDoc = context.packageDocument;
    if (!packageDoc) return;

    const images = root.find('.//html:img[@src]', { html: 'http://www.w3.org/1999/xhtml' });
    for (const img of images) {
      const imgElem = img as XmlElement;
      const srcAttr = this.getAttribute(imgElem, 'src');
      if (!srcAttr) continue;

      const src = srcAttr;
      const opfDir = context.opfPath?.includes('/')
        ? context.opfPath.substring(0, context.opfPath.lastIndexOf('/'))
        : '';

      let fullPath = src;
      if (opfDir && !src.startsWith('http://') && !src.startsWith('https://')) {
        if (src.startsWith('/')) {
          fullPath = src.slice(1);
        } else {
          const parts = opfDir.split('/');
          const relParts = src.split('/');
          for (const part of relParts) {
            if (part === '..') {
              parts.pop();
            } else if (part !== '.') {
              parts.push(part);
            }
          }
          fullPath = parts.join('/');
        }
      }

      if (src.startsWith('http://') || src.startsWith('https://')) {
        continue;
      }

      const manifestItem = packageDoc.manifest.find(
        (item) => fullPath.endsWith(item.href) || item.href.endsWith(fullPath),
      );
      if (!manifestItem) {
        // Skip media type check - missing manifest item is reported by RSC-007/RSC-008
        continue;
      }

      const imageMediaTypes = new Set([
        'image/gif',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/svg+xml',
        'image/webp',
      ]);

      if (!imageMediaTypes.has(manifestItem.mediaType)) {
        pushMessage(context.messages, {
          id: MessageId.OPF_051,
          message: `Image has invalid media type "${manifestItem.mediaType}": ${src}`,
          location: { path },
        });
      }
    }
  }

  private validateEpubTypes(context: ValidationContext, path: string, root: XmlElement): void {
    const epubTypeElements = root.find('.//*[@epub:type]', {
      epub: 'http://www.idpf.org/2007/ops',
    });

    const knownPrefixes = new Set([
      '',
      'http://idpf.org/epub/structure/v1/',
      'http://idpf.org/epub/vocab/structure/',
      'http://www.idpf.org/2007/ops',
    ]);

    for (const elem of epubTypeElements) {
      const elemTyped = elem as XmlElement;
      const epubTypeAttr = elemTyped.attr('epub:type');
      if (!epubTypeAttr?.value) continue;

      const epubTypeValue = epubTypeAttr.value;

      for (const part of epubTypeValue.split(/\s+/)) {
        const prefix = part.includes(':') ? part.substring(0, part.indexOf(':')) : '';

        if (
          !knownPrefixes.has(prefix) &&
          !prefix.startsWith('http://') &&
          !prefix.startsWith('https://')
        ) {
          pushMessage(context.messages, {
            id: MessageId.OPF_088,
            message: `Unknown epub:type prefix "${prefix}": ${epubTypeValue}`,
            location: { path },
          });
        }
      }
    }
  }

  private validateStylesheetLinks(
    context: ValidationContext,
    path: string,
    root: XmlElement,
  ): void {
    const linkElements = root.find('.//html:link[@rel]', { html: 'http://www.w3.org/1999/xhtml' });

    const stylesheetTitles = new Map<string, Set<string>>();

    for (const linkElem of linkElements) {
      const elem = linkElem as XmlElement;
      const relAttr = this.getAttribute(elem, 'rel');
      const titleAttr = this.getAttribute(elem, 'title');
      const hrefAttr = this.getAttribute(elem, 'href');

      if (!relAttr || !hrefAttr) continue;

      const rel = relAttr.toLowerCase();
      const rels = rel.split(/\s+/);

      if (rels.includes('stylesheet')) {
        const isAlternate = rels.includes('alternate');

        if (isAlternate && !titleAttr) {
          pushMessage(context.messages, {
            id: MessageId.CSS_015,
            message: 'Alternate stylesheet must have a title attribute',
            location: { path },
          });
        }

        if (titleAttr) {
          const key = `${titleAttr}:${isAlternate ? 'alt' : 'persistent'}`;
          const expectedRel = isAlternate ? 'alternate' : 'persistent';
          const existing = stylesheetTitles.get(key);

          if (existing) {
            if (!existing.has(expectedRel)) {
              pushMessage(context.messages, {
                id: MessageId.CSS_005,
                message: `Stylesheet with title "${titleAttr}" conflicts with another stylesheet with same title`,
                location: { path },
              });
            }
            existing.add(expectedRel);
          } else {
            stylesheetTitles.set(key, new Set([expectedRel]));
          }
        }
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

  private validateViewportMeta(
    context: ValidationContext,
    path: string,
    root: XmlElement,
    manifestItem: { properties?: string[] } | undefined,
  ): void {
    const isFixedLayout = manifestItem?.properties?.includes('fixed-layout');
    const metaTags = root.find('.//html:meta[@name]', { html: 'http://www.w3.org/1999/xhtml' });

    let hasViewportMeta = false;

    for (const meta of metaTags) {
      const nameAttr = this.getAttribute(meta as XmlElement, 'name');
      if (nameAttr === 'viewport') {
        hasViewportMeta = true;
        const contentAttr = this.getAttribute(meta as XmlElement, 'content');

        if (isFixedLayout) {
          // Fixed-layout viewport validation
          if (!contentAttr) {
            pushMessage(context.messages, {
              id: MessageId.HTM_046,
              message:
                'Viewport meta element should have a content attribute in fixed-layout documents',
              location: { path },
            });
            continue;
          }

          void contentAttr;
        } else {
          // Reflowable document viewport validation (HTM-060b)
          pushMessage(context.messages, {
            id: MessageId.HTM_060b,
            message: `EPUB reading systems must ignore viewport meta elements in reflowable documents; viewport declaration "${contentAttr ?? ''}" will be ignored`,
            location: { path },
          });
        }
      }
    }

    // Only suggest viewport for fixed-layout documents
    if (isFixedLayout && !hasViewportMeta) {
      pushMessage(context.messages, {
        id: MessageId.HTM_049,
        message: 'Fixed-layout document should include a viewport meta element',
        location: { path },
      });
    }
  }

  private extractAndRegisterIDs(path: string, root: XmlElement, registry: ResourceRegistry): void {
    const elementsWithId = root.find('.//*[@id]');
    for (const elem of elementsWithId) {
      const id = this.getAttribute(elem as XmlElement, 'id');
      if (id) {
        registry.registerID(path, id);
      }
    }
  }

  private extractAndRegisterHyperlinks(
    context: ValidationContext,
    path: string,
    root: XmlElement,
    opfDir: string,
    refValidator: ReferenceValidator,
  ): void {
    const docDir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';

    const links = root.find('.//html:a[@href]', { html: 'http://www.w3.org/1999/xhtml' });
    for (const link of links) {
      const href = this.getAttribute(link as XmlElement, 'href');
      if (href === null) continue;
      if (href.trim() === '') {
        pushMessage(context.messages, {
          id: MessageId.HTM_045,
          message: 'Encountered empty href',
          location: { path, line: link.line },
        });
        continue;
      }

      const line = link.line;

      if (href.startsWith('http://') || href.startsWith('https://')) {
        continue;
      }
      if (href.startsWith('mailto:') || href.startsWith('tel:')) {
        continue;
      }
      // Skip EPUB CFI references (e.g., "package.opf#epubcfi(/6/2!/4/2/1:1)")
      if (href.includes('#epubcfi(')) {
        continue;
      }
      if (href.startsWith('#')) {
        const targetResource = path;
        const fragment = href.slice(1);
        refValidator.addReference({
          url: href,
          targetResource,
          fragment,
          type: ReferenceType.HYPERLINK,
          location: { path, line },
        });
        continue;
      }

      const resolvedPath = this.resolveRelativePath(docDir, href, opfDir);
      const hashIndex = resolvedPath.indexOf('#');
      const targetResource = hashIndex >= 0 ? resolvedPath.slice(0, hashIndex) : resolvedPath;
      const fragmentPart = hashIndex >= 0 ? resolvedPath.slice(hashIndex + 1) : undefined;

      const ref: Parameters<typeof refValidator.addReference>[0] = {
        url: href,
        targetResource,
        type: ReferenceType.HYPERLINK,
        location: { path, line },
      };
      if (fragmentPart) {
        ref.fragment = fragmentPart;
      }
      refValidator.addReference(ref);
    }

    const svgLinks = root.find('.//svg:a', {
      svg: 'http://www.w3.org/2000/svg',
      xlink: 'http://www.w3.org/1999/xlink',
    });
    for (const link of svgLinks) {
      const elem = link as XmlElement;
      const href = this.getAttribute(elem, 'xlink:href') ?? this.getAttribute(elem, 'href');
      if (!href) continue;

      const line = link.line;

      if (href.startsWith('http://') || href.startsWith('https://')) {
        continue;
      }
      if (href.startsWith('#')) {
        const targetResource = path;
        const fragment = href.slice(1);
        refValidator.addReference({
          url: href,
          targetResource,
          fragment,
          type: ReferenceType.HYPERLINK,
          location: { path, line },
        });
        continue;
      }

      const resolvedPath = this.resolveRelativePath(docDir, href, opfDir);
      const hashIndex = resolvedPath.indexOf('#');
      const targetResource = hashIndex >= 0 ? resolvedPath.slice(0, hashIndex) : resolvedPath;
      const svgFragment = hashIndex >= 0 ? resolvedPath.slice(hashIndex + 1) : undefined;

      const svgRef: Parameters<typeof refValidator.addReference>[0] = {
        url: href,
        targetResource,
        type: ReferenceType.HYPERLINK,
        location: { path, line },
      };
      if (svgFragment) {
        svgRef.fragment = svgFragment;
      }
      refValidator.addReference(svgRef);
    }
  }

  private extractAndRegisterStylesheets(
    path: string,
    root: XmlElement,
    opfDir: string,
    refValidator: ReferenceValidator,
  ): void {
    const docDir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';

    const linkElements = root.find('.//html:link[@href]', { html: 'http://www.w3.org/1999/xhtml' });
    for (const linkElem of linkElements) {
      const href = this.getAttribute(linkElem as XmlElement, 'href');
      const rel = this.getAttribute(linkElem as XmlElement, 'rel');
      if (!href) continue;

      const line = linkElem.line;
      const isStylesheet = rel?.toLowerCase().includes('stylesheet');
      const type = isStylesheet ? ReferenceType.STYLESHEET : ReferenceType.LINK;

      if (href.startsWith('http://') || href.startsWith('https://')) {
        // Still register remote resources
        refValidator.addReference({
          url: href,
          targetResource: href,
          type,
          location: { path, line },
        });
        continue;
      }

      const resolvedPath = this.resolveRelativePath(docDir, href, opfDir);
      const hashIndex = resolvedPath.indexOf('#');
      const targetResource = hashIndex >= 0 ? resolvedPath.slice(0, hashIndex) : resolvedPath;

      refValidator.addReference({
        url: href,
        targetResource,
        type,
        location: { path, line },
      });
    }
  }

  /**
   * Parse CSS content and extract @import statements
   */
  private extractCSSImports(
    cssPath: string,
    cssContent: string,
    opfDir: string,
    refValidator: ReferenceValidator,
  ): void {
    const cssDir = cssPath.includes('/') ? cssPath.substring(0, cssPath.lastIndexOf('/')) : '';

    // Remove CSS comments first to avoid matching imports inside comments
    const cleanedCSS = cssContent.replace(/\/\*[\s\S]*?\*\//g, '');

    // Simple regex to match @import statements
    // Matches: @import "file.css"; @import 'file.css'; @import url("file.css"); @import url('file.css');
    const importRegex = /@import\s+(?:url\s*\(\s*)?["']([^"']+)["']\s*\)?[^;]*;/gi;

    let match;
    while ((match = importRegex.exec(cleanedCSS)) !== null) {
      const importUrl = match[1];
      if (!importUrl) continue;

      // Calculate line number from regex match position
      const beforeMatch = cleanedCSS.substring(0, match.index);
      const line = beforeMatch.split('\n').length;

      // Skip remote URLs
      if (importUrl.startsWith('http://') || importUrl.startsWith('https://')) {
        refValidator.addReference({
          url: importUrl,
          targetResource: importUrl,
          type: ReferenceType.STYLESHEET,
          location: { path: cssPath, line },
        });
        continue;
      }

      // Resolve relative path
      const resolvedPath = this.resolveRelativePath(cssDir, importUrl, opfDir);

      refValidator.addReference({
        url: importUrl,
        targetResource: resolvedPath,
        type: ReferenceType.STYLESHEET,
        location: { path: cssPath, line },
      });
    }
  }

  private extractAndRegisterImages(
    path: string,
    root: XmlElement,
    opfDir: string,
    refValidator: ReferenceValidator,
  ): void {
    const docDir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';

    const images = root.find('.//html:img[@src]', { html: 'http://www.w3.org/1999/xhtml' });
    for (const img of images) {
      const imgElem = img as XmlElement;
      const src = this.getAttribute(imgElem, 'src');
      if (!src) continue;

      const line = img.line;

      if (src.startsWith('http://') || src.startsWith('https://')) {
        // Still register remote resources
        refValidator.addReference({
          url: src,
          targetResource: src,
          type: ReferenceType.IMAGE,
          location: { path, line },
        });
      } else {
        const resolvedPath = this.resolveRelativePath(docDir, src, opfDir);
        const hashIndex = resolvedPath.indexOf('#');
        const targetResource = hashIndex >= 0 ? resolvedPath.slice(0, hashIndex) : resolvedPath;
        const fragment = hashIndex >= 0 ? resolvedPath.slice(hashIndex + 1) : undefined;
        const ref: Parameters<typeof refValidator.addReference>[0] = {
          url: src,
          targetResource,
          type: ReferenceType.IMAGE,
          location: { path, line },
        };
        if (fragment) {
          ref.fragment = fragment;
        }
        refValidator.addReference(ref);
      }

      // Parse srcset attribute
      const srcset = this.getAttribute(imgElem, 'srcset');
      if (srcset) {
        this.parseSrcset(srcset, docDir, opfDir, path, line, refValidator);
      }
    }

    // Also check for images in SVG - use separate queries to avoid XPath 'or' issues
    let svgImages: unknown[] = [];
    try {
      const svgImagesXlink = root.find('.//svg:image[@xlink:href]', {
        svg: 'http://www.w3.org/2000/svg',
        xlink: 'http://www.w3.org/1999/xlink',
      });
      const svgImagesHref = root.find('.//svg:image[@href]', {
        svg: 'http://www.w3.org/2000/svg',
      });
      svgImages = [...svgImagesXlink, ...svgImagesHref];
    } catch {
      // Fallback: skip SVG image extraction if namespace resolution fails
      svgImages = [];
    }
    for (const svgImg of svgImages) {
      const elem = svgImg as XmlElement;
      const href = this.getAttribute(elem, 'xlink:href') ?? this.getAttribute(elem, 'href');
      if (!href) continue;

      const line = (svgImg as XmlNode).line;

      if (href.startsWith('http://') || href.startsWith('https://')) {
        refValidator.addReference({
          url: href,
          targetResource: href,
          type: ReferenceType.IMAGE,
          location: { path, line },
        });
        continue;
      }

      const resolvedPath = this.resolveRelativePath(docDir, href, opfDir);
      const hashIndex = resolvedPath.indexOf('#');
      const targetResource = hashIndex >= 0 ? resolvedPath.slice(0, hashIndex) : resolvedPath;
      const fragment = hashIndex >= 0 ? resolvedPath.slice(hashIndex + 1) : undefined;
      const svgImgRef: Parameters<typeof refValidator.addReference>[0] = {
        url: href,
        targetResource,
        type: ReferenceType.IMAGE,
        location: { path, line },
      };
      if (fragment) {
        svgImgRef.fragment = fragment;
      }
      refValidator.addReference(svgImgRef);
    }

    // Check for poster images on video elements
    const videos = root.find('.//html:video[@poster]', { html: 'http://www.w3.org/1999/xhtml' });
    for (const video of videos) {
      const poster = this.getAttribute(video as XmlElement, 'poster');
      if (!poster) continue;

      const line = video.line;

      if (poster.startsWith('http://') || poster.startsWith('https://')) {
        refValidator.addReference({
          url: poster,
          targetResource: poster,
          type: ReferenceType.IMAGE,
          location: { path, line },
        });
        continue;
      }

      const resolvedPath = this.resolveRelativePath(docDir, poster, opfDir);
      refValidator.addReference({
        url: poster,
        targetResource: resolvedPath,
        type: ReferenceType.IMAGE,
        location: { path, line },
      });
    }
  }

  private extractAndRegisterMathMLAltimg(
    path: string,
    root: XmlElement,
    opfDir: string,
    refValidator: ReferenceValidator,
  ): void {
    const docDir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';

    const mathElements = root.find('.//math:math[@altimg]', {
      math: 'http://www.w3.org/1998/Math/MathML',
    });
    for (const mathElem of mathElements) {
      const altimg = this.getAttribute(mathElem as XmlElement, 'altimg');
      if (!altimg) continue;

      const line = mathElem.line;

      if (altimg.startsWith('http://') || altimg.startsWith('https://')) {
        refValidator.addReference({
          url: altimg,
          targetResource: altimg,
          type: ReferenceType.IMAGE,
          location: { path, line },
        });
        continue;
      }

      const resolvedPath = this.resolveRelativePath(docDir, altimg, opfDir);
      refValidator.addReference({
        url: altimg,
        targetResource: resolvedPath,
        type: ReferenceType.IMAGE,
        location: { path, line },
      });
    }
  }

  private extractAndRegisterScripts(
    path: string,
    root: XmlElement,
    opfDir: string,
    refValidator: ReferenceValidator,
  ): void {
    const docDir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';

    const scripts = root.find('.//html:script[@src]', { html: 'http://www.w3.org/1999/xhtml' });
    for (const script of scripts) {
      const src = this.getAttribute(script as XmlElement, 'src');
      if (!src) continue;

      const line = script.line;

      if (src.startsWith('http://') || src.startsWith('https://')) {
        refValidator.addReference({
          url: src,
          targetResource: src,
          type: ReferenceType.GENERIC,
          location: { path, line },
        });
        continue;
      }

      const resolvedPath = this.resolveRelativePath(docDir, src, opfDir);
      refValidator.addReference({
        url: src,
        targetResource: resolvedPath,
        type: ReferenceType.GENERIC,
        location: { path, line },
      });
    }
  }

  /**
   * Extract cite attribute references from blockquote, q, ins, del elements
   * These need to be validated as RSC-007 if the referenced resource is missing
   */
  private extractAndRegisterCiteAttributes(
    path: string,
    root: XmlElement,
    opfDir: string,
    refValidator: ReferenceValidator,
  ): void {
    const docDir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';

    // Elements that can have cite attribute: blockquote, q, ins, del
    const citeElements = [
      ...root.find('.//html:blockquote[@cite]', { html: 'http://www.w3.org/1999/xhtml' }),
      ...root.find('.//html:q[@cite]', { html: 'http://www.w3.org/1999/xhtml' }),
      ...root.find('.//html:ins[@cite]', { html: 'http://www.w3.org/1999/xhtml' }),
      ...root.find('.//html:del[@cite]', { html: 'http://www.w3.org/1999/xhtml' }),
    ];

    for (const elem of citeElements) {
      const cite = this.getAttribute(elem as XmlElement, 'cite');
      if (!cite) continue;

      const line = elem.line;

      // Skip remote URLs - cite can reference remote resources
      if (cite.startsWith('http://') || cite.startsWith('https://')) {
        continue;
      }

      // Skip fragment-only references (refers to same document)
      if (cite.startsWith('#')) {
        const targetResource = path;
        const fragment = cite.slice(1);
        refValidator.addReference({
          url: cite,
          targetResource,
          fragment,
          type: ReferenceType.HYPERLINK,
          location: { path, line },
        });
        continue;
      }

      const resolvedPath = this.resolveRelativePath(docDir, cite, opfDir);
      const hashIndex = resolvedPath.indexOf('#');
      const targetResource = hashIndex >= 0 ? resolvedPath.slice(0, hashIndex) : resolvedPath;
      const fragment = hashIndex >= 0 ? resolvedPath.slice(hashIndex + 1) : undefined;

      const ref: Parameters<typeof refValidator.addReference>[0] = {
        url: cite,
        targetResource,
        type: ReferenceType.HYPERLINK,
        location: { path, line },
      };
      if (fragment) {
        ref.fragment = fragment;
      }
      refValidator.addReference(ref);
    }
  }

  private extractAndRegisterMediaElements(
    path: string,
    root: XmlElement,
    opfDir: string,
    refValidator: ReferenceValidator,
  ): void {
    const docDir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';

    // Extract audio elements with src attribute
    const audioElements = root.find('.//html:audio[@src]', {
      html: 'http://www.w3.org/1999/xhtml',
    });
    for (const audio of audioElements) {
      const src = this.getAttribute(audio as XmlElement, 'src');
      if (!src) continue;

      const line = (audio as unknown as { line?: number }).line;

      if (src.startsWith('http://') || src.startsWith('https://')) {
        refValidator.addReference({
          url: src,
          targetResource: src,
          type: ReferenceType.AUDIO,
          location: line !== undefined ? { path, line } : { path },
        });
      } else {
        const resolvedPath = this.resolveRelativePath(docDir, src, opfDir);
        refValidator.addReference({
          url: src,
          targetResource: resolvedPath,
          type: ReferenceType.AUDIO,
          location: line !== undefined ? { path, line } : { path },
        });
      }
    }

    // Extract video elements with src attribute
    const videoElements = root.find('.//html:video[@src]', {
      html: 'http://www.w3.org/1999/xhtml',
    });
    for (const video of videoElements) {
      const src = this.getAttribute(video as XmlElement, 'src');
      if (!src) continue;

      const line = (video as unknown as { line?: number }).line;

      if (src.startsWith('http://') || src.startsWith('https://')) {
        refValidator.addReference({
          url: src,
          targetResource: src,
          type: ReferenceType.VIDEO,
          location: line !== undefined ? { path, line } : { path },
        });
      } else {
        const resolvedPath = this.resolveRelativePath(docDir, src, opfDir);
        refValidator.addReference({
          url: src,
          targetResource: resolvedPath,
          type: ReferenceType.VIDEO,
          location: line !== undefined ? { path, line } : { path },
        });
      }
    }

    // Extract source elements (child of audio/video) with src attribute
    const sourceElements = root.find('.//html:source[@src]', {
      html: 'http://www.w3.org/1999/xhtml',
    });
    for (const source of sourceElements) {
      const src = this.getAttribute(source as XmlElement, 'src');
      if (!src) continue;

      const parent = source.parent as unknown as { name?: string } | undefined;
      const parentName = parent?.name ?? '';
      const isAudioChild = parentName === 'audio';
      const type = isAudioChild ? ReferenceType.AUDIO : ReferenceType.VIDEO;

      const line = (source as unknown as { line?: number }).line;

      if (src.startsWith('http://') || src.startsWith('https://')) {
        refValidator.addReference({
          url: src,
          targetResource: src,
          type,
          location: line !== undefined ? { path, line } : { path },
        });
      } else {
        const resolvedPath = this.resolveRelativePath(docDir, src, opfDir);
        refValidator.addReference({
          url: src,
          targetResource: resolvedPath,
          type,
          location: line !== undefined ? { path, line } : { path },
        });
      }
    }

    // Extract iframe elements with src attribute
    const iframeElements = root.find('.//html:iframe[@src]', {
      html: 'http://www.w3.org/1999/xhtml',
    });
    for (const iframe of iframeElements) {
      const src = this.getAttribute(iframe as XmlElement, 'src');
      if (!src) continue;

      const line = (iframe as unknown as { line?: number }).line;

      if (src.startsWith('http://') || src.startsWith('https://')) {
        refValidator.addReference({
          url: src,
          targetResource: src,
          type: ReferenceType.GENERIC,
          location: line !== undefined ? { path, line } : { path },
        });
      } else {
        const resolvedPath = this.resolveRelativePath(docDir, src, opfDir);
        refValidator.addReference({
          url: src,
          targetResource: resolvedPath,
          type: ReferenceType.GENERIC,
          location: line !== undefined ? { path, line } : { path },
        });
      }
    }

    // Extract track elements with src attribute
    const trackElements = root.find('.//html:track[@src]', {
      html: 'http://www.w3.org/1999/xhtml',
    });
    for (const track of trackElements) {
      const src = this.getAttribute(track as XmlElement, 'src');
      if (!src) continue;

      const line = (track as unknown as { line?: number }).line;

      if (src.startsWith('http://') || src.startsWith('https://')) {
        refValidator.addReference({
          url: src,
          targetResource: src,
          type: ReferenceType.TRACK,
          location: line !== undefined ? { path, line } : { path },
        });
      } else {
        const resolvedPath = this.resolveRelativePath(docDir, src, opfDir);
        refValidator.addReference({
          url: src,
          targetResource: resolvedPath,
          type: ReferenceType.TRACK,
          location: line !== undefined ? { path, line } : { path },
        });
      }
    }
  }

  private parseSrcset(
    srcset: string,
    docDir: string,
    opfDir: string,
    path: string,
    line: number | undefined,
    refValidator: ReferenceValidator,
  ): void {
    // srcset format: "url [descriptor], url [descriptor], ..."
    const entries = srcset.split(',');
    for (const entry of entries) {
      const trimmed = entry.trim();
      if (!trimmed) continue;
      // First token is the URL, rest are descriptors (e.g., "2x", "300w")
      const url = trimmed.split(/\s+/)[0];
      if (!url) continue;

      const location = line !== undefined ? { path, line } : { path };

      if (url.startsWith('http://') || url.startsWith('https://')) {
        refValidator.addReference({
          url,
          targetResource: url,
          type: ReferenceType.IMAGE,
          location,
        });
      } else {
        const resolvedPath = this.resolveRelativePath(docDir, url, opfDir);
        refValidator.addReference({
          url,
          targetResource: resolvedPath,
          type: ReferenceType.IMAGE,
          location,
        });
      }
    }
  }

  private resolveRelativePath(docDir: string, href: string, _opfDir: string): string {
    const hrefWithoutFragment = href.split('#')[0] ?? href;
    const fragment = href.includes('#') ? href.split('#')[1] : '';

    if (hrefWithoutFragment.startsWith('/')) {
      const result = hrefWithoutFragment.slice(1);
      return fragment ? `${result}#${fragment}` : result;
    }

    const parts = docDir ? docDir.split('/') : [];
    const relParts = hrefWithoutFragment.split('/');

    for (const part of relParts) {
      if (part === '..') {
        parts.pop();
      } else if (part !== '.' && part !== '') {
        parts.push(part);
      }
    }

    const result = parts.join('/');
    return fragment ? `${result}#${fragment}` : result;
  }
}
