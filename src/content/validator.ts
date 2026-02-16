/**
 * Content document validation using libxml2-wasm for XML parsing
 */

import { XmlDocument, type XmlElement, type XmlNode } from 'libxml2-wasm';
import { CSSValidator } from '../css/validator.js';
import { MessageId, pushMessage } from '../messages/index.js';
import { isCoreMediaType } from '../opf/types.js';
import type { ResourceRegistry } from '../references/registry.js';
import { ReferenceType } from '../references/types.js';
import { resolveManifestHref } from '../references/url.js';
import type { ReferenceValidator } from '../references/validator.js';
import type { ValidationContext } from '../types.js';

const DISCOURAGED_ELEMENTS = new Set(['base', 'embed', 'rp']);

const ABSOLUTE_URI_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

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
  private cssWithRemoteResources = new Set<string>();

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

    // Process CSS files first so cssWithRemoteResources is populated before XHTML checks
    if (refValidator) {
      for (const item of packageDoc.manifest) {
        if (item.mediaType === 'text/css') {
          const fullPath = resolveManifestHref(opfDir, item.href);
          this.validateCSSDocument(context, fullPath, opfDir, refValidator);
        }
      }
    }

    for (const item of packageDoc.manifest) {
      if (item.mediaType === 'application/xhtml+xml') {
        const fullPath = resolveManifestHref(opfDir, item.href);
        this.validateXHTMLDocument(context, fullPath, item.id, opfDir, registry, refValidator);
      } else if (item.mediaType === 'image/svg+xml') {
        const fullPath = resolveManifestHref(opfDir, item.href);
        if (registry) {
          this.extractSVGIDs(context, fullPath, registry);
        }
        if (context.version.startsWith('3')) {
          this.validateSVGDocument(context, fullPath, item);
        }
        if (refValidator) {
          this.extractSVGReferences(context, fullPath, opfDir, refValidator);
        }
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

  private validateSVGDocument(
    context: ValidationContext,
    path: string,
    manifestItem: { id: string; properties?: string[] },
  ): void {
    const svgData = context.files.get(path);
    if (!svgData) return;

    const svgContent = new TextDecoder().decode(svgData);
    let doc: XmlDocument | undefined;
    try {
      doc = XmlDocument.fromString(svgContent);
    } catch {
      return;
    }

    try {
      const root = doc.root;
      const hasRemote = this.detectSVGRemoteResources(root);
      if (hasRemote && !manifestItem.properties?.includes('remote-resources')) {
        pushMessage(context.messages, {
          id: MessageId.OPF_014,
          message:
            'SVG document references remote resources but manifest item is missing "remote-resources" property',
          location: { path },
        });
      }
    } finally {
      doc.dispose();
    }
  }

  /**
   * Extract references from SVG documents: font-face-uri, xml-stylesheet PI, @import in style
   */
  private extractSVGReferences(
    context: ValidationContext,
    path: string,
    opfDir: string,
    refValidator: ReferenceValidator,
  ): void {
    const svgData = context.files.get(path);
    if (!svgData) return;

    const svgContent = new TextDecoder().decode(svgData);
    let doc: XmlDocument | undefined;
    try {
      doc = XmlDocument.fromString(svgContent);
    } catch {
      return;
    }

    const docDir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';

    try {
      const root = doc.root;

      // Extract font-face-uri references as FONT type
      try {
        const fontFaceUris = root.find('.//svg:font-face-uri', {
          svg: 'http://www.w3.org/2000/svg',
        });
        for (const uri of fontFaceUris) {
          const href =
            this.getAttribute(uri as XmlElement, 'xlink:href') ??
            this.getAttribute(uri as XmlElement, 'href');
          if (!href) continue;
          if (href.startsWith('http://') || href.startsWith('https://')) {
            refValidator.addReference({
              url: href,
              targetResource: href,
              type: ReferenceType.FONT,
              location: { path, line: uri.line },
            });
          } else {
            const resolvedPath = this.resolveRelativePath(docDir, href, opfDir);
            refValidator.addReference({
              url: href,
              targetResource: resolvedPath,
              type: ReferenceType.FONT,
              location: { path, line: uri.line },
            });
          }
        }
      } catch {
        // empty
      }

      // Extract @import from SVG <style> elements
      try {
        const styles = root.find('.//svg:style', { svg: 'http://www.w3.org/2000/svg' });
        for (const style of styles) {
          const cssContent = (style as XmlElement).content;
          if (cssContent) {
            this.extractCSSImports(path, cssContent, opfDir, refValidator);
          }
        }
      } catch {
        // empty
      }

      // Extract SVG use elements (RSC-015: must have fragment identifier)
      try {
        const svgUseXlink = root.find('.//svg:use[@xlink:href]', {
          svg: 'http://www.w3.org/2000/svg',
          xlink: 'http://www.w3.org/1999/xlink',
        });
        const svgUseHref = root.find('.//svg:use[@href]', {
          svg: 'http://www.w3.org/2000/svg',
        });
        for (const useNode of [...svgUseXlink, ...svgUseHref]) {
          const useElem = useNode as XmlElement;
          const href =
            this.getAttribute(useElem, 'xlink:href') ?? this.getAttribute(useElem, 'href');
          if (href === null) continue;
          if (href.startsWith('http://') || href.startsWith('https://')) continue;

          if (href === '' || !href.includes('#')) {
            pushMessage(context.messages, {
              id: MessageId.RSC_015,
              message: `SVG "use" element requires a fragment identifier, but found "${href}"`,
              location: { path, line: useNode.line },
            });
            continue;
          }

          const resolvedPath = this.resolveRelativePath(docDir, href, opfDir);
          const hashIndex = resolvedPath.indexOf('#');
          const targetResource = hashIndex >= 0 ? resolvedPath.slice(0, hashIndex) : path;
          const fragment = hashIndex >= 0 ? resolvedPath.slice(hashIndex + 1) : undefined;
          const useRef: Parameters<typeof refValidator.addReference>[0] = {
            url: href,
            targetResource,
            type: ReferenceType.SVG_SYMBOL,
            location: { path, line: useNode.line },
          };
          if (fragment) {
            useRef.fragment = fragment;
          }
          refValidator.addReference(useRef);
        }
      } catch {
        // empty
      }
    } finally {
      doc.dispose();
    }

    // Extract xml-stylesheet processing instructions
    this.extractXmlStylesheetPIs(svgContent, path, docDir, opfDir, refValidator);
  }

  /**
   * Extract href from <?xml-stylesheet?> processing instructions
   */
  private extractXmlStylesheetPIs(
    content: string,
    path: string,
    docDir: string,
    opfDir: string,
    refValidator: ReferenceValidator,
  ): void {
    const piRegex = /<\?xml-stylesheet\s+([^?]*)\?>/g;
    let match;
    while ((match = piRegex.exec(content)) !== null) {
      const attrs = match[1];
      if (!attrs) continue;

      // Extract href pseudo-attribute
      const hrefMatch = /href\s*=\s*["']([^"']*)["']/.exec(attrs);
      if (!hrefMatch?.[1]) continue;
      const href = hrefMatch[1];

      const beforeMatch = content.substring(0, match.index);
      const line = beforeMatch.split('\n').length;

      if (href.startsWith('http://') || href.startsWith('https://')) {
        refValidator.addReference({
          url: href,
          targetResource: href,
          type: ReferenceType.STYLESHEET,
          location: { path, line },
        });
      } else {
        const resolvedPath = this.resolveRelativePath(docDir, href, opfDir);
        refValidator.addReference({
          url: href,
          targetResource: resolvedPath,
          type: ReferenceType.STYLESHEET,
          location: { path, line },
        });
      }
    }
  }

  private detectSVGRemoteResources(root: XmlElement): boolean {
    try {
      const fontFaceUris = root.find('.//svg:font-face-uri', {
        svg: 'http://www.w3.org/2000/svg',
      });
      for (const uri of fontFaceUris) {
        const href =
          this.getAttribute(uri as XmlElement, 'xlink:href') ??
          this.getAttribute(uri as XmlElement, 'href');
        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
          return true;
        }
      }
    } catch {
      // empty
    }

    try {
      const images = root.find('.//svg:image', { svg: 'http://www.w3.org/2000/svg' });
      for (const img of images) {
        const href =
          this.getAttribute(img as XmlElement, 'xlink:href') ??
          this.getAttribute(img as XmlElement, 'href');
        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
          return true;
        }
      }
    } catch {
      // empty
    }

    try {
      const styles = root.find('.//svg:style', { svg: 'http://www.w3.org/2000/svg' });
      for (const style of styles) {
        const cssContent = (style as XmlElement).content;
        if (this.cssContainsRemoteUrl(cssContent)) {
          return true;
        }
      }
    } catch {
      // empty
    }

    return false;
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

    // Track CSS files with remote resources for XHTML manifest item checks
    const hasRemoteResources = result.references.some(
      (ref) => ref.url.startsWith('http://') || ref.url.startsWith('https://'),
    );
    if (hasRemoteResources) {
      this.cssWithRemoteResources.add(path);

      // Check the CSS manifest item itself for remote-resources property
      const packageDoc = context.packageDocument;
      if (packageDoc) {
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
          const hashIndex = ref.url.indexOf('#');
          const targetResource = hashIndex >= 0 ? ref.url.slice(0, hashIndex) : ref.url;
          refValidator.addReference({
            url: ref.url,
            targetResource,
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
          const hashIndex = ref.url.indexOf('#');
          const targetResource = hashIndex >= 0 ? ref.url.slice(0, hashIndex) : ref.url;
          refValidator.addReference({
            url: ref.url,
            targetResource,
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
      } else if (ref.type === 'import') {
        const location: { path: string; line?: number } = { path };
        if (ref.line !== undefined) location.line = ref.line;
        if (ref.url.startsWith('http://') || ref.url.startsWith('https://')) {
          refValidator.addReference({
            url: ref.url,
            targetResource: ref.url,
            type: ReferenceType.STYLESHEET,
            location,
          });
        } else {
          const resolvedPath = this.resolveRelativePath(cssDir, ref.url, opfDir);
          refValidator.addReference({
            url: ref.url,
            targetResource: resolvedPath,
            type: ReferenceType.STYLESHEET,
            location,
          });
        }
      }
    }
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

    // Check for XML 1.1 before parsing (libxml2 may reject it)
    const xmlVersionMatch = content.match(/<\?xml\s[^?]*version\s*=\s*["']([^"']+)["']/);
    if (xmlVersionMatch && xmlVersionMatch[1] !== '1.0') {
      pushMessage(context.messages, {
        id: MessageId.HTM_001,
        message: `XML version "${xmlVersionMatch[1]}" is not allowed; must be "1.0"`,
        location: { path },
      });
      return;
    }

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
          // Entity-related errors are fatal (RSC-016) per Java EPUBCheck behavior
          const isEntityError =
            /Entity '/.test(error.message) || /EntityRef:/.test(error.message);
          pushMessage(context.messages, {
            id: isEntityError ? MessageId.RSC_016 : MessageId.HTM_004,
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
          id: MessageId.RSC_017,
          message: 'The "head" element should have a "title" child element',
          location: { path },
        });
      } else {
        const titleText = (title as XmlElement).content?.trim() ?? '';
        if (titleText === '') {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: 'The "title" element must not be empty',
            location: { path, line: title.line },
          });
        }
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
        if (!hasScripts && manifestItem?.properties?.includes('scripted')) {
          pushMessage(context.messages, {
            id: MessageId.OPF_015,
            message: 'The property "scripted" should not be declared in the OPF file',
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
        if (!hasMathML && manifestItem?.properties?.includes('mathml')) {
          pushMessage(context.messages, {
            id: MessageId.OPF_015,
            message: 'The property "mathml" should not be declared in the OPF file',
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
        if (!hasSVG && manifestItem?.properties?.includes('svg')) {
          pushMessage(context.messages, {
            id: MessageId.OPF_015,
            message: 'The property "svg" should not be declared in the OPF file',
            location: { path },
          });
        }

        const hasSwitch = this.detectSwitch(root);
        if (hasSwitch && !manifestItem?.properties?.includes('switch')) {
          pushMessage(context.messages, {
            id: MessageId.OPF_014,
            message:
              'Content document contains epub:switch but manifest item is missing "switch" property',
            location: { path },
          });
        }
        if (!hasSwitch && manifestItem?.properties?.includes('switch')) {
          pushMessage(context.messages, {
            id: MessageId.OPF_015,
            message: 'The property "switch" should not be declared in the OPF file',
            location: { path },
          });
        }

        const hasRemoteResources = this.detectRemoteResources(context, path, root, opfDir);
        if (hasRemoteResources && !manifestItem?.properties?.includes('remote-resources')) {
          pushMessage(context.messages, {
            id: MessageId.OPF_014,
            message:
              'Content document references remote resources but manifest item is missing "remote-resources" property',
            location: { path },
          });
        }
        if (!hasRemoteResources && manifestItem?.properties?.includes('remote-resources')) {
          pushMessage(context.messages, {
            id: MessageId.OPF_018,
            message:
              'The "remote-resources" property was declared in the Package Document, but no reference to remote resources has been found',
            location: { path },
          });
        }
      }

      // Check for discouraged elements
      this.checkDiscouragedElements(context, path, root);

      // Check SSML ph attributes
      this.checkSSMLPh(context, path, root, content);

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
        this.extractAndRegisterHyperlinks(context, path, root, opfDir, refValidator, !!isNavItem);
        this.extractAndRegisterStylesheets(path, root, opfDir, refValidator);
        this.extractAndRegisterImages(context, path, root, opfDir, refValidator, registry);
        this.extractAndRegisterMathMLAltimg(path, root, opfDir, refValidator);
        this.extractAndRegisterScripts(path, root, opfDir, refValidator);
        this.extractAndRegisterCiteAttributes(path, root, opfDir, refValidator);
        this.extractAndRegisterMediaElements(context, path, root, opfDir, refValidator, registry);
        this.extractAndRegisterEmbeddedElements(
          context,
          path,
          root,
          opfDir,
          refValidator,
          registry,
        );
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
    _doc: XmlDocument,
    root: XmlElement,
  ): void {
    const HTML_NS = { html: 'http://www.w3.org/1999/xhtml' };
    const navElements = root.find('.//html:nav', HTML_NS);
    if (navElements.length === 0) {
      pushMessage(context.messages, {
        id: MessageId.NAV_001,
        message: 'Navigation document must have a nav element',
        location: { path },
      });
      return;
    }

    // Helper to get epub:type tokens from a nav element
    const getNavTypes = (nav: XmlElement): string[] => {
      if (!('attrs' in nav)) return [];
      const epubTypeAttr = (
        nav.attrs as { name: string; value: string; prefix?: string; namespaceUri?: string }[]
      ).find(
        (attr) =>
          attr.name === 'type' &&
          attr.prefix === 'epub' &&
          attr.namespaceUri === 'http://www.idpf.org/2007/ops',
      );
      return epubTypeAttr ? epubTypeAttr.value.trim().split(/\s+/) : [];
    };

    // Find the nav element with epub:type="toc"
    let tocNav: (typeof navElements)[0] | undefined;
    let pageListCount = 0;
    let landmarksCount = 0;

    for (const nav of navElements) {
      const types = getNavTypes(nav as XmlElement);
      if (types.includes('toc') && !tocNav) {
        tocNav = nav;
      }
      if (types.includes('page-list')) pageListCount++;
      if (types.includes('landmarks')) landmarksCount++;
    }

    if (!tocNav) {
      pushMessage(context.messages, {
        id: MessageId.NAV_001,
        message: 'Navigation document nav element must have epub:type="toc"',
        location: { path },
      });
      return;
    }

    const ol = tocNav.get('.//html:ol', HTML_NS);
    if (!ol) {
      pushMessage(context.messages, {
        id: MessageId.NAV_002,
        message: 'Navigation document toc nav must contain an ol element',
        location: { path },
      });
    }

    // Check multiple page-list or landmarks nav elements
    if (pageListCount > 1) {
      pushMessage(context.messages, {
        id: MessageId.RSC_005,
        message: 'Multiple occurrences of the "page-list" nav element',
        location: { path },
      });
    }
    if (landmarksCount > 1) {
      pushMessage(context.messages, {
        id: MessageId.RSC_005,
        message: 'Multiple occurrences of the "landmarks" nav element',
        location: { path },
      });
    }

    // Validate each typed nav element
    for (const nav of navElements) {
      const navElem = nav as XmlElement;
      const types = getNavTypes(navElem);
      if (types.length === 0) continue;

      // Non-standard nav types must have heading as first child
      const isStandard =
        types.includes('toc') || types.includes('page-list') || types.includes('landmarks');
      if (!isStandard) {
        this.checkNavFirstChildHeading(context, path, navElem);
      }

      // Check landmarks-specific rules
      if (types.includes('landmarks')) {
        this.checkNavLandmarks(context, path, navElem);
      }

      // Check anchor and span labels within nav ol
      this.checkNavLabels(context, path, navElem);

      // Check nav content model (ol must have li, li must have a/span or ol)
      this.checkNavContentModel(context, path, navElem);
    }

    // Check heading text content in the entire nav document
    this.checkNavHeadingContent(context, path, root);

    // Check hidden attribute values on nav elements
    this.checkNavHiddenAttribute(context, path, root);

    this.checkNavRemoteLinks(context, path, root);

    // Collect TOC nav link targets in order for reading order validation (NAV-011)
    this.collectTocLinks(context, path, tocNav as XmlElement);
  }

  private checkNavFirstChildHeading(
    context: ValidationContext,
    path: string,
    navElem: XmlElement,
  ): void {
    const HTML_NS = { html: 'http://www.w3.org/1999/xhtml' };
    const headingTags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

    // Get first child element of nav
    const children = navElem.find('./html:*', HTML_NS);
    if (children.length === 0) return;

    const firstChild = children[0] as XmlElement;
    const localName = firstChild.name.split(':').pop() ?? firstChild.name;
    if (!headingTags.has(localName)) {
      pushMessage(context.messages, {
        id: MessageId.RSC_005,
        message:
          'nav elements other than "toc", "page-list" and "landmarks" must have a heading as their first child',
        location: { path },
      });
    }
  }

  private checkNavLandmarks(context: ValidationContext, path: string, navElem: XmlElement): void {
    const HTML_NS = { html: 'http://www.w3.org/1999/xhtml' };
    const EPUB_NS = 'http://www.idpf.org/2007/ops';

    const anchors = navElem.find('.//html:ol//html:a', HTML_NS);
    const seenLandmarks: { type: string; href: string }[] = [];

    for (const anchor of anchors) {
      const aElem = anchor as XmlElement;

      // Check for epub:type attribute
      const epubTypeAttr =
        'attrs' in aElem
          ? (
              aElem.attrs as {
                name: string;
                value: string;
                prefix?: string;
                namespaceUri?: string;
              }[]
            ).find((attr) => attr.name === 'type' && attr.namespaceUri === EPUB_NS)
          : undefined;

      if (!epubTypeAttr) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: 'Missing epub:type attribute on anchor inside "landmarks" nav element',
          location: { path },
        });
        continue;
      }

      // Check for duplicate type+href
      const href = this.getAttribute(aElem, 'href');
      const typeTokens = epubTypeAttr.value.toLowerCase().trim().split(/\s+/);
      const normalizedHref = (href ?? '').toLowerCase().trim();

      for (const typeToken of typeTokens) {
        const isDuplicate = seenLandmarks.some(
          (seen) => seen.type === typeToken && seen.href === normalizedHref,
        );
        if (isDuplicate) {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: `Another landmark was found with the same epub:type and same reference to "${normalizedHref}"`,
            location: { path },
          });
        }
        seenLandmarks.push({ type: typeToken, href: normalizedHref });
      }
    }
  }

  private checkNavLabels(context: ValidationContext, path: string, navElem: XmlElement): void {
    const HTML_NS = { html: 'http://www.w3.org/1999/xhtml' };

    // Check anchor labels
    const anchors = navElem.find('.//html:ol//html:a', HTML_NS);
    for (const anchor of anchors) {
      if (!this.hasNavLabelContent(anchor as XmlElement)) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: 'Anchors within nav elements must contain text',
          location: { path },
        });
      }
    }

    // Check span labels
    const spans = navElem.find('.//html:ol//html:span', HTML_NS);
    for (const span of spans) {
      if (!this.hasNavLabelContent(span as XmlElement)) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: 'Spans within nav elements must contain text',
          location: { path },
        });
      }
    }
  }

  private hasNavLabelContent(element: XmlElement): boolean {
    const HTML_NS = { html: 'http://www.w3.org/1999/xhtml' };
    // Check text content
    const textContent = element.content;
    if (textContent && textContent.trim().length > 0) return true;

    // Check img alt attributes
    const imgs = element.find('./html:img[@alt]', HTML_NS);
    for (const img of imgs) {
      const alt = this.getAttribute(img as XmlElement, 'alt');
      if (alt && alt.trim().length > 0) return true;
    }

    // Check aria-label on any descendant or self
    const ariaLabel = this.getAttribute(element, 'aria-label');
    if (ariaLabel && ariaLabel.trim().length > 0) return true;

    const ariaLabelElements = element.find('.//*[@aria-label]');
    for (const el of ariaLabelElements) {
      const label = this.getAttribute(el as XmlElement, 'aria-label');
      if (label && label.trim().length > 0) return true;
    }

    return false;
  }

  private checkNavContentModel(
    context: ValidationContext,
    path: string,
    navElem: XmlElement,
  ): void {
    const HTML_NS = { html: 'http://www.w3.org/1999/xhtml' };
    const headingTags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hgroup']);

    // Check nav direct children: only headings, hgroup, and ol are allowed
    const navChildren = navElem.find('./html:*', HTML_NS);
    for (const child of navChildren) {
      const localName = (child as XmlElement).name.split(':').pop() ?? (child as XmlElement).name;
      if (!headingTags.has(localName) && localName !== 'ol') {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: `element "${localName}" not allowed here; expected element "h1", "h2", "h3", "h4", "h5", "h6", "hgroup" or "ol"`,
          location: { path },
        });
      }
    }

    // Check ol elements have li children
    const olElements = navElem.find('.//html:ol', HTML_NS);
    for (const ol of olElements) {
      const liChildren = (ol as XmlElement).find('./html:li', HTML_NS);
      if (liChildren.length === 0) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: 'element "ol" incomplete; missing required element "li"',
          location: { path },
        });
      }
    }

    // Check li elements content model
    const liElements = navElem.find('.//html:ol//html:li', HTML_NS);
    for (const li of liElements) {
      const liElem = li as XmlElement;
      const hasOl = liElem.get('./html:ol', HTML_NS);
      const hasAnchor = liElem.get('./html:a', HTML_NS);
      const hasSpan = liElem.get('./html:span', HTML_NS);

      if (!hasAnchor && !hasSpan) {
        if (hasOl) {
          // li has ol but no a/span label
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: 'element "ol" not allowed yet; expected element "a" or "span"',
            location: { path },
          });
        } else {
          // leaf li with no link
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: 'element "li" incomplete; missing required element "ol"',
            location: { path },
          });
        }
      } else if (hasSpan && !hasAnchor && !hasOl) {
        // li has span label but no nested ol — span implies a branch node that needs a sublist
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: 'element "li" incomplete; missing required element "ol"',
          location: { path },
        });
      }
    }
  }

  private checkNavHeadingContent(context: ValidationContext, path: string, root: XmlElement): void {
    const HTML_NS = { html: 'http://www.w3.org/1999/xhtml' };
    const headingSelectors = [
      './/html:h1',
      './/html:h2',
      './/html:h3',
      './/html:h4',
      './/html:h5',
      './/html:h6',
    ];

    for (const selector of headingSelectors) {
      const headings = root.find(selector, HTML_NS);
      for (const heading of headings) {
        if (!this.hasNavLabelContent(heading as XmlElement)) {
          pushMessage(context.messages, {
            id: MessageId.RSC_005,
            message: 'Heading elements must contain text',
            location: { path },
          });
        }
      }
    }
  }

  private checkNavHiddenAttribute(
    context: ValidationContext,
    path: string,
    root: XmlElement,
  ): void {
    const hiddenElements = root.find('.//*[@hidden]');
    for (const elem of hiddenElements) {
      const hiddenValue = this.getAttribute(elem as XmlElement, 'hidden');
      if (
        hiddenValue !== null &&
        hiddenValue !== '' &&
        hiddenValue !== 'hidden' &&
        hiddenValue !== 'until-found'
      ) {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: `value of attribute "hidden" is invalid; must be equal to "", "hidden" or "until-found"`,
          location: { path },
        });
      }
    }
  }

  private checkNavRemoteLinks(context: ValidationContext, path: string, root: XmlElement): void {
    const HTML_NS = { html: 'http://www.w3.org/1999/xhtml' };
    const navElements = root.find('.//html:nav', HTML_NS);

    for (const nav of navElements) {
      const navElem = nav as XmlElement;
      const epubTypeAttr =
        'attrs' in navElem
          ? (
              navElem.attrs as {
                name: string;
                value: string;
                prefix?: string;
                namespaceUri?: string;
              }[]
            ).find(
              (attr) =>
                attr.name === 'type' &&
                attr.prefix === 'epub' &&
                attr.namespaceUri === 'http://www.idpf.org/2007/ops',
            )
          : undefined;
      const types = epubTypeAttr ? epubTypeAttr.value.trim().split(/\s+/) : [];
      const isToc = types.includes('toc');
      const isLandmarks = types.includes('landmarks');
      const isPageList = types.includes('page-list');

      if (!isToc && !isLandmarks && !isPageList) continue;

      const navType = isToc ? 'toc' : isLandmarks ? 'landmarks' : 'page-list';
      const links = navElem.find('.//html:a[@href]', HTML_NS);
      for (const link of links) {
        const href = this.getAttribute(link as XmlElement, 'href');
        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
          pushMessage(context.messages, {
            id: MessageId.NAV_010,
            message: `"${navType}" nav must not link to remote resources; found link to "${href}"`,
            location: { path },
          });
        }
      }
    }
  }

  private collectTocLinks(context: ValidationContext, path: string, tocNav: XmlElement): void {
    const HTML_NS = { html: 'http://www.w3.org/1999/xhtml' };
    const docDir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
    const opfDir = context.opfPath?.includes('/')
      ? context.opfPath.substring(0, context.opfPath.lastIndexOf('/'))
      : '';

    const tocAnchors = tocNav.find('.//html:a[@href]', HTML_NS);
    const tocLinks: NonNullable<ValidationContext['tocLinks']> = [];

    for (const anchor of tocAnchors) {
      const href = this.getAttribute(anchor as XmlElement, 'href')?.trim();
      if (!href || href.startsWith('http://') || href.startsWith('https://')) continue;

      let targetResource: string;
      let fragment: string | undefined;

      if (href.startsWith('#')) {
        targetResource = path;
        fragment = href.slice(1);
      } else {
        const resolvedPath = this.resolveRelativePath(docDir, href, opfDir);
        const hashIndex = resolvedPath.indexOf('#');
        targetResource = hashIndex >= 0 ? resolvedPath.slice(0, hashIndex) : resolvedPath;
        fragment = hashIndex >= 0 ? resolvedPath.slice(hashIndex + 1) : undefined;
      }

      const entry: NonNullable<ValidationContext['tocLinks']>[number] = {
        targetResource,
        location: { path, line: anchor.line },
      };
      if (fragment !== undefined) {
        entry.fragment = fragment;
      }
      tocLinks.push(entry);
    }

    context.tocLinks = tocLinks;
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

  private detectSwitch(root: XmlElement): boolean {
    const switchElem = root.get('.//epub:switch', { epub: 'http://www.idpf.org/2007/ops' });
    return !!switchElem;
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
    path: string,
    root: XmlElement,
    opfDir?: string,
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

    const objects = root.find('.//html:object[@data]', { html: 'http://www.w3.org/1999/xhtml' });
    for (const obj of objects) {
      const data = this.getAttribute(obj as XmlElement, 'data');
      if (data && (data.startsWith('http://') || data.startsWith('https://'))) {
        return true;
      }
    }

    const embeds = root.find('.//html:embed[@src]', { html: 'http://www.w3.org/1999/xhtml' });
    for (const embed of embeds) {
      const src = this.getAttribute(embed as XmlElement, 'src');
      if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
        return true;
      }
    }

    const linkElements = root.find('.//html:link[@rel and @href]', {
      html: 'http://www.w3.org/1999/xhtml',
    });
    const docDir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
    for (const linkElem of linkElements) {
      const rel = this.getAttribute(linkElem as XmlElement, 'rel');
      const href = this.getAttribute(linkElem as XmlElement, 'href');
      if (href && rel?.toLowerCase().includes('stylesheet')) {
        if (href.startsWith('http://') || href.startsWith('https://')) {
          return true;
        }
        // Check if locally-linked CSS file contains remote resources
        const resolvedCss = this.resolveRelativePath(docDir, href, opfDir ?? '');
        if (this.cssWithRemoteResources.has(resolvedCss)) {
          return true;
        }
      }
    }

    const styleElements = root.find('.//html:style', { html: 'http://www.w3.org/1999/xhtml' });
    for (const style of styleElements) {
      const cssContent = (style as XmlElement).content;
      if (this.cssContainsRemoteUrl(cssContent)) {
        return true;
      }
    }

    return false;
  }

  private cssContainsRemoteUrl(css: string): boolean {
    const urlRegex = /url\s*\(\s*["']?(https?:\/\/[^"')]+)["']?\s*\)/gi;
    return urlRegex.test(css);
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

  private checkSSMLPh(
    context: ValidationContext,
    path: string,
    root: XmlElement,
    content: string,
  ): void {
    // Use regex since XPath namespace handling for attributes varies across parsers
    const ssmlPhPattern = /\bssml:ph\s*=\s*"([^"]*)"/g;
    let match;
    while ((match = ssmlPhPattern.exec(content)) !== null) {
      if (match[1].trim() === '') {
        const line = content.substring(0, match.index).split('\n').length;
        pushMessage(context.messages, {
          id: MessageId.HTM_007,
          message: 'The ssml:ph attribute value should not be empty',
          location: { path, line },
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
      const xmlElem = elem as XmlElement;
      const id = this.getAttribute(xmlElem, 'id');
      if (id) {
        registry.registerID(path, id);
        const localName = xmlElem.name.includes(':') ? xmlElem.name.split(':').pop() : xmlElem.name;
        if (localName === 'symbol') {
          registry.registerSVGSymbolID(path, id);
        }
      }
    }
  }

  private extractAndRegisterHyperlinks(
    context: ValidationContext,
    path: string,
    root: XmlElement,
    opfDir: string,
    refValidator: ReferenceValidator,
    isNavDocument = false,
  ): void {
    const docDir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';

    // Build a map from anchor line numbers to nav-specific reference types
    // when processing a nav document, to distinguish toc/page-list links from regular hyperlinks
    const navAnchorTypes = new Map<number, ReferenceType>();
    if (isNavDocument) {
      const HTML_NS = { html: 'http://www.w3.org/1999/xhtml' };
      const navElements = root.find('.//html:nav', HTML_NS);
      for (const nav of navElements) {
        const navElem = nav as XmlElement;
        const epubTypeAttr =
          'attrs' in navElem
            ? (
                navElem.attrs as {
                  name: string;
                  value: string;
                  prefix?: string;
                  namespaceUri?: string;
                }[]
              ).find(
                (attr) =>
                  attr.name === 'type' &&
                  attr.prefix === 'epub' &&
                  attr.namespaceUri === 'http://www.idpf.org/2007/ops',
              )
            : undefined;
        const types = epubTypeAttr ? epubTypeAttr.value.trim().split(/\s+/) : [];
        let refType = ReferenceType.HYPERLINK;
        if (types.includes('toc')) refType = ReferenceType.NAV_TOC_LINK;
        else if (types.includes('page-list')) refType = ReferenceType.NAV_PAGELIST_LINK;

        const navAnchors = navElem.find('.//html:a[@href]', HTML_NS);
        for (const a of navAnchors) {
          navAnchorTypes.set(a.line, refType);
        }
      }
    }

    const links = root.find('.//html:a[@href]', { html: 'http://www.w3.org/1999/xhtml' });
    for (const link of links) {
      // Trim whitespace (XML attribute values are whitespace-normalized by parsers)
      const href = this.getAttribute(link as XmlElement, 'href')?.trim() ?? null;
      if (href === null) continue;
      if (href === '') {
        pushMessage(context.messages, {
          id: MessageId.HTM_045,
          message: 'Encountered empty href',
          location: { path, line: link.line },
        });
        continue;
      }

      const line = link.line;
      const refType = isNavDocument
        ? (navAnchorTypes.get(line) ?? ReferenceType.HYPERLINK)
        : ReferenceType.HYPERLINK;

      if (ABSOLUTE_URI_RE.test(href)) {
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
          type: refType,
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
        type: refType,
        location: { path, line },
      };
      if (fragmentPart) {
        ref.fragment = fragmentPart;
      }
      refValidator.addReference(ref);
    }

    // Extract <area href> elements (M1: Java extracts these as hyperlink references)
    const areaLinks = root.find('.//html:area[@href]', { html: 'http://www.w3.org/1999/xhtml' });
    for (const area of areaLinks) {
      const href = this.getAttribute(area as XmlElement, 'href')?.trim();
      if (!href) continue;

      const line = area.line;

      if (ABSOLUTE_URI_RE.test(href)) continue;
      if (href.includes('#epubcfi(')) continue;

      if (href.startsWith('#')) {
        refValidator.addReference({
          url: href,
          targetResource: path,
          fragment: href.slice(1),
          type: ReferenceType.HYPERLINK,
          location: { path, line },
        });
        continue;
      }

      const resolvedAreaPath = this.resolveRelativePath(docDir, href, opfDir);
      const areaHashIndex = resolvedAreaPath.indexOf('#');
      const areaTarget =
        areaHashIndex >= 0 ? resolvedAreaPath.slice(0, areaHashIndex) : resolvedAreaPath;
      const areaFragment =
        areaHashIndex >= 0 ? resolvedAreaPath.slice(areaHashIndex + 1) : undefined;

      const areaRef: Parameters<typeof refValidator.addReference>[0] = {
        url: href,
        targetResource: areaTarget,
        type: ReferenceType.HYPERLINK,
        location: { path, line },
      };
      if (areaFragment) {
        areaRef.fragment = areaFragment;
      }
      refValidator.addReference(areaRef);
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
    // Matches: @import "file.css"; @import 'file.css'; @import url("file.css"); @import url(file.css);
    const importRegex =
      /@import\s+(?:url\s*\(\s*["']?([^"')]+?)["']?\s*\)|["']([^"']+)["'])[^;]*;/gi;

    let match;
    while ((match = importRegex.exec(cleanedCSS)) !== null) {
      const importUrl = match[1] ?? match[2];
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
    context: ValidationContext,
    path: string,
    root: XmlElement,
    opfDir: string,
    refValidator: ReferenceValidator,
    registry?: ResourceRegistry,
  ): void {
    const docDir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
    const ns = { html: 'http://www.w3.org/1999/xhtml' };

    // Pre-compute which picture elements have CMT source siblings for intrinsic fallback
    const pictureHasCMTSource = new Set<number>();
    if (registry) {
      const pictures = root.find('.//html:picture', ns);
      for (const pic of pictures) {
        const picElem = pic as XmlElement;
        const sources = picElem.find('html:source[@src]', ns);
        const sourcesWithSrcset = picElem.find('html:source[@srcset]', ns);
        for (const source of [...sources, ...sourcesWithSrcset]) {
          const srcAttr = this.getAttribute(source as XmlElement, 'src');
          const srcsetAttr = this.getAttribute(source as XmlElement, 'srcset');
          const sourceUrl = srcAttr ?? srcsetAttr?.split(',')[0]?.trim().split(/\s+/)[0];
          if (!sourceUrl || sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://'))
            continue;
          const resolvedSource = this.resolveRelativePath(docDir, sourceUrl, opfDir);
          const resource = registry.getResource(resolvedSource);
          if (resource && isCoreMediaType(resource.mimeType)) {
            pictureHasCMTSource.add(pic.line);
            break;
          }
        }
      }
    }

    const images = root.find('.//html:img[@src]', ns);
    for (const img of images) {
      const imgElem = img as XmlElement;
      const src = this.getAttribute(imgElem, 'src');
      if (!src) continue;

      const line = img.line;

      // Check if this img is inside a picture with CMT source (intrinsic fallback)
      let hasIntrinsicFallback: boolean | undefined;
      if (pictureHasCMTSource.size > 0) {
        try {
          const pictureParent = imgElem.get('ancestor::html:picture', ns);
          if (pictureParent && pictureHasCMTSource.has(pictureParent.line)) {
            hasIntrinsicFallback = true;
          }
        } catch {
          // ancestor axis may not be supported; skip
        }
      }

      if (src.startsWith('http://') || src.startsWith('https://')) {
        const ref: Parameters<typeof refValidator.addReference>[0] = {
          url: src,
          targetResource: src,
          type: ReferenceType.IMAGE,
          location: { path, line },
        };
        if (hasIntrinsicFallback) ref.hasIntrinsicFallback = true;
        refValidator.addReference(ref);
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
        if (hasIntrinsicFallback) ref.hasIntrinsicFallback = true;
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

    // Extract SVG use elements (RSC-015: must have fragment identifier)
    try {
      const svgUseXlink = root.find('.//svg:use[@xlink:href]', {
        svg: 'http://www.w3.org/2000/svg',
        xlink: 'http://www.w3.org/1999/xlink',
      });
      const svgUseHref = root.find('.//svg:use[@href]', {
        svg: 'http://www.w3.org/2000/svg',
      });
      for (const useNode of [...svgUseXlink, ...svgUseHref]) {
        const useElem = useNode as XmlElement;
        const href = this.getAttribute(useElem, 'xlink:href') ?? this.getAttribute(useElem, 'href');
        if (href === null) continue;

        const line = useNode.line;

        if (href.startsWith('http://') || href.startsWith('https://')) continue;

        if (href === '' || !href.includes('#')) {
          pushMessage(context.messages, {
            id: MessageId.RSC_015,
            message: `SVG "use" element requires a fragment identifier, but found "${href}"`,
            location: { path, line },
          });
          continue;
        }

        const resolvedPath = this.resolveRelativePath(docDir, href, opfDir);
        const hashIndex = resolvedPath.indexOf('#');
        const targetResource = hashIndex >= 0 ? resolvedPath.slice(0, hashIndex) : path;
        const fragment = hashIndex >= 0 ? resolvedPath.slice(hashIndex + 1) : undefined;
        const useRef: Parameters<typeof refValidator.addReference>[0] = {
          url: href,
          targetResource,
          type: ReferenceType.SVG_SYMBOL,
          location: { path, line },
        };
        if (fragment) {
          useRef.fragment = fragment;
        }
        refValidator.addReference(useRef);
      }
    } catch {
      // empty
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
          type: ReferenceType.CITE,
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
        type: ReferenceType.CITE,
        location: { path, line },
      };
      if (fragment) {
        ref.fragment = fragment;
      }
      refValidator.addReference(ref);
    }
  }

  private extractAndRegisterMediaElements(
    context: ValidationContext,
    path: string,
    root: XmlElement,
    opfDir: string,
    refValidator: ReferenceValidator,
    registry?: ResourceRegistry,
  ): void {
    const docDir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
    const ns = { html: 'http://www.w3.org/1999/xhtml' };

    // Process audio and video elements together to detect intrinsic source fallback.
    // Per Java EPUBCheck: a media element has intrinsic fallback if any of its
    // sources (src attr or <source> children) resolve to a core media type resource.
    for (const tagName of ['audio', 'video'] as const) {
      const isAudio = tagName === 'audio';
      const refType = isAudio ? ReferenceType.AUDIO : ReferenceType.VIDEO;
      const elements = root.find(`.//html:${tagName}`, ns);

      for (const elem of elements) {
        const mediaElem = elem as XmlElement;
        const pendingRefs: {
          url: string;
          targetResource: string;
          type: ReferenceType;
          line?: number;
        }[] = [];

        // Collect direct src attribute
        const src = this.getAttribute(mediaElem, 'src');
        if (src) {
          const line = elem.line;
          if (src.startsWith('http://') || src.startsWith('https://')) {
            pendingRefs.push({ url: src, targetResource: src, type: refType, line });
          } else {
            const resolvedPath = this.resolveRelativePath(docDir, src, opfDir);
            pendingRefs.push({ url: src, targetResource: resolvedPath, type: refType, line });
          }
        }

        // Collect <source> children
        const sources = mediaElem.find('html:source[@src]', ns);
        for (const source of sources) {
          const sourceElem = source as XmlElement;
          const sourceSrc = this.getAttribute(sourceElem, 'src');
          if (!sourceSrc) continue;
          const line = source.line;
          if (sourceSrc.startsWith('http://') || sourceSrc.startsWith('https://')) {
            pendingRefs.push({ url: sourceSrc, targetResource: sourceSrc, type: refType, line });
          } else {
            const resolvedPath = this.resolveRelativePath(docDir, sourceSrc, opfDir);
            pendingRefs.push({ url: sourceSrc, targetResource: resolvedPath, type: refType, line });
          }
          // OPF-013: Check type attribute mismatch for source in audio/video
          if (registry) {
            this.checkMimeTypeMatch(context, path, docDir, opfDir, sourceElem, 'src', registry);
          }
        }

        // Check if any source resolves to a CMT resource
        let hasIntrinsicFallback = false;
        if (registry && pendingRefs.length > 1) {
          hasIntrinsicFallback = pendingRefs.some((ref) => {
            const resource = registry.getResource(ref.targetResource);
            return resource && isCoreMediaType(resource.mimeType);
          });
        }

        // Register all references with the shared fallback flag
        for (const ref of pendingRefs) {
          const reference: Parameters<typeof refValidator.addReference>[0] = {
            url: ref.url,
            targetResource: ref.targetResource,
            type: ref.type,
            location: ref.line !== undefined ? { path, line: ref.line } : { path },
          };
          if (hasIntrinsicFallback) reference.hasIntrinsicFallback = true;
          refValidator.addReference(reference);
        }
      }
    }

    // Process picture elements for MED-003 and MED-007
    this.extractAndRegisterPictureElements(context, path, root, opfDir, refValidator, registry);

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

  private extractAndRegisterEmbeddedElements(
    context: ValidationContext,
    path: string,
    root: XmlElement,
    opfDir: string,
    refValidator: ReferenceValidator,
    registry?: ResourceRegistry,
  ): void {
    const docDir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
    const ns = { html: 'http://www.w3.org/1999/xhtml' };

    const addRef = (
      src: string,
      type: ReferenceType,
      line?: number,
      hasIntrinsicFallback?: boolean,
    ): void => {
      const location = line !== undefined ? { path, line } : { path };
      if (src.startsWith('http://') || src.startsWith('https://')) {
        const ref: Parameters<typeof refValidator.addReference>[0] = {
          url: src,
          targetResource: src,
          type,
          location,
        };
        if (hasIntrinsicFallback) ref.hasIntrinsicFallback = true;
        refValidator.addReference(ref);
      } else {
        const resolvedPath = this.resolveRelativePath(docDir, src, opfDir);
        const hashIndex = resolvedPath.indexOf('#');
        const targetResource = hashIndex >= 0 ? resolvedPath.slice(0, hashIndex) : resolvedPath;
        const ref: Parameters<typeof refValidator.addReference>[0] = {
          url: src,
          targetResource,
          type,
          location,
        };
        if (hashIndex >= 0) ref.fragment = resolvedPath.slice(hashIndex + 1);
        if (hasIntrinsicFallback) ref.hasIntrinsicFallback = true;
        refValidator.addReference(ref);
      }
    };

    // embed[@src]
    for (const elem of root.find('.//html:embed[@src]', ns)) {
      const embedElem = elem as XmlElement;
      const src = this.getAttribute(embedElem, 'src');
      if (src) addRef(src, ReferenceType.GENERIC, elem.line);
      if (registry) {
        this.checkMimeTypeMatch(context, path, docDir, opfDir, embedElem, 'src', registry);
      }
    }

    // input[@type='image'][@src]
    for (const elem of root.find('.//html:input[@src]', ns)) {
      const type = this.getAttribute(elem as XmlElement, 'type');
      if (type?.toLowerCase() === 'image') {
        const src = this.getAttribute(elem as XmlElement, 'src');
        if (src) addRef(src, ReferenceType.IMAGE, elem.line);
      }
    }

    // object[@data]
    for (const elem of root.find('.//html:object[@data]', ns)) {
      const objElem = elem as XmlElement;
      const data = this.getAttribute(objElem, 'data');
      if (!data) continue;
      // Object has intrinsic fallback if it has palpable child content
      // (non-param, non-hidden child elements)
      const allChildren = objElem.find('html:*', ns);
      const hasFallbackContent = allChildren.some((child) => {
        const c = child as XmlElement;
        return c.name !== 'param' && this.getAttribute(c, 'hidden') === null;
      });
      addRef(data, ReferenceType.GENERIC, elem.line, hasFallbackContent || undefined);
      if (registry) {
        this.checkMimeTypeMatch(context, path, docDir, opfDir, objElem, 'data', registry);
      }
    }
  }

  /**
   * Check if an element's type attribute matches the manifest MIME type (OPF-013)
   */
  private checkMimeTypeMatch(
    context: ValidationContext,
    path: string,
    docDir: string,
    opfDir: string,
    element: XmlElement,
    srcAttr: string,
    registry: ResourceRegistry,
  ): void {
    const typeAttr = this.getAttribute(element, 'type');
    if (!typeAttr) return;

    const src = this.getAttribute(element, srcAttr);
    if (!src || src.startsWith('http://') || src.startsWith('https://')) return;

    const resolvedPath = this.resolveRelativePath(docDir, src, opfDir);
    const hashIndex = resolvedPath.indexOf('#');
    const targetResource = hashIndex >= 0 ? resolvedPath.slice(0, hashIndex) : resolvedPath;
    const resource = registry.getResource(targetResource);
    if (!resource) return;

    // Strip parameters from both type attribute and manifest type before comparison
    const stripParams = (t: string): string => {
      const idx = t.indexOf(';');
      return (idx >= 0 ? t.substring(0, idx) : t).trim();
    };
    const declaredType = stripParams(typeAttr);
    const manifestType = stripParams(resource.mimeType);

    if (declaredType && declaredType !== manifestType) {
      pushMessage(context.messages, {
        id: MessageId.OPF_013,
        message: `Resource "${targetResource}" is declared with MIME type "${declaredType}" in content, but has MIME type "${manifestType}" in the package document`,
        location: { path, line: element.line },
      });
    }
  }

  /**
   * Extract and validate picture elements (MED-003, MED-007, OPF-013)
   */
  private extractAndRegisterPictureElements(
    context: ValidationContext,
    path: string,
    root: XmlElement,
    opfDir: string,
    refValidator: ReferenceValidator,
    registry?: ResourceRegistry,
  ): void {
    const docDir = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
    const ns = { html: 'http://www.w3.org/1999/xhtml' };

    const BLESSED_IMAGE_TYPES = new Set([
      'image/gif',
      'image/jpeg',
      'image/png',
      'image/svg+xml',
      'image/webp',
    ]);

    const pictures = root.find('.//html:picture', ns);
    for (const pic of pictures) {
      const picElem = pic as XmlElement;

      // Check img inside picture (MED-003)
      const imgs = picElem.find('html:img[@src]', ns);
      for (const img of imgs) {
        const imgElem = img as XmlElement;
        const src = this.getAttribute(imgElem, 'src');
        if (!src || src.startsWith('http://') || src.startsWith('https://')) continue;

        if (registry) {
          const resolvedPath = this.resolveRelativePath(docDir, src, opfDir);
          const resource = registry.getResource(resolvedPath);
          if (resource && !BLESSED_IMAGE_TYPES.has(resource.mimeType)) {
            pushMessage(context.messages, {
              id: MessageId.MED_003,
              message: `Image in "picture" element must be a core image type, but found "${resource.mimeType}"`,
              location: { path, line: img.line },
            });
          }
        }

        // Also check srcset
        const srcset = this.getAttribute(imgElem, 'srcset');
        if (srcset && registry) {
          const entries = srcset.split(',');
          for (const entry of entries) {
            const url = entry.trim().split(/\s+/)[0];
            if (!url || url.startsWith('http://') || url.startsWith('https://')) continue;
            const resolvedPath = this.resolveRelativePath(docDir, url, opfDir);
            const resource = registry.getResource(resolvedPath);
            if (resource && !BLESSED_IMAGE_TYPES.has(resource.mimeType)) {
              pushMessage(context.messages, {
                id: MessageId.MED_003,
                message: `Image in "picture" element must be a core image type, but found "${resource.mimeType}"`,
                location: { path, line: img.line },
              });
            }
          }
        }
      }

      // Check source inside picture (MED-007, OPF-013)
      // Sources may use src or srcset attribute
      const sourcesWithSrc = picElem.find('html:source[@src]', ns);
      const sourcesWithSrcset = picElem.find('html:source[@srcset]', ns);
      const allSources = new Set([...sourcesWithSrc, ...sourcesWithSrcset]);
      for (const source of allSources) {
        const sourceElem = source as XmlElement;
        const typeAttr = this.getAttribute(sourceElem, 'type');

        // Get source URL from src or first srcset entry
        const src = this.getAttribute(sourceElem, 'src');
        const srcset = this.getAttribute(sourceElem, 'srcset');
        const sourceUrl = src ?? srcset?.split(',')[0]?.trim().split(/\s+/)[0];
        if (!sourceUrl || sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://'))
          continue;

        if (registry) {
          // OPF-013: Check type mismatch (only if source has type and src attributes)
          if (src) {
            this.checkMimeTypeMatch(context, path, docDir, opfDir, sourceElem, 'src', registry);
          } else if (srcset && typeAttr) {
            // For srcset, manually check the first entry against the type attribute
            const resolvedPath = this.resolveRelativePath(docDir, sourceUrl, opfDir);
            const resource = registry.getResource(resolvedPath);
            if (resource) {
              const stripParams = (t: string): string => {
                const idx = t.indexOf(';');
                return (idx >= 0 ? t.substring(0, idx) : t).trim();
              };
              const declaredType = stripParams(typeAttr);
              const manifestType = stripParams(resource.mimeType);
              if (declaredType && declaredType !== manifestType) {
                pushMessage(context.messages, {
                  id: MessageId.OPF_013,
                  message: `Resource "${resolvedPath}" is declared with MIME type "${declaredType}" in content, but has MIME type "${manifestType}" in the package document`,
                  location: { path, line: source.line },
                });
              }
            }
          }

          // MED-007: source in picture must have type attribute if resource is not blessed image
          const resolvedPath = this.resolveRelativePath(docDir, sourceUrl, opfDir);
          const resource = registry.getResource(resolvedPath);
          if (resource && !BLESSED_IMAGE_TYPES.has(resource.mimeType) && !typeAttr) {
            pushMessage(context.messages, {
              id: MessageId.MED_007,
              message: `Source element in "picture" with foreign resource type "${resource.mimeType}" must declare a "type" attribute`,
              location: { path, line: source.line },
            });
          }
        }
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
    let decoded: string;
    try {
      decoded = decodeURIComponent(href);
    } catch {
      decoded = href;
    }

    const hrefWithoutFragment = decoded.split('#')[0] ?? decoded;
    const fragment = decoded.includes('#') ? decoded.split('#')[1] : '';

    if (hrefWithoutFragment.startsWith('/')) {
      const result = hrefWithoutFragment.slice(1).normalize('NFC');
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

    const result = parts.join('/').normalize('NFC');
    return fragment ? `${result}#${fragment}` : result;
  }
}
