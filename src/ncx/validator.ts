/**
 * NCX (Navigation Control XML) validation for EPUB 2.0
 */

import { XmlDocument, type XmlElement } from 'libxml2-wasm';
import { pushMessage } from '../messages/message-registry.js';
import type { ValidationContext } from '../types.js';

/**
 * Validator for EPUB 2 NCX navigation documents
 */
export class NCXValidator {
  validate(context: ValidationContext, ncxContent: string, ncxPath: string): void {
    let doc: XmlDocument | null = null;
    try {
      doc = XmlDocument.fromString(ncxContent);
    } catch (error) {
      if (error instanceof Error) {
        pushMessage(context.messages, {
          id: 'NCX-002',
          message: `NCX document is not well-formed: ${error.message}`,
          location: { path: ncxPath },
        });
      }
      return;
    }

    try {
      const root = doc.root;

      if (root.name !== 'ncx') {
        pushMessage(context.messages, {
          id: 'NCX-001',
          message: 'NCX document must have ncx as root element',
          location: { path: ncxPath },
        });
        return;
      }

      const ns = root.nsDeclarations[''];
      if (ns !== 'http://www.daisy.org/z3986/2005/ncx/') {
        pushMessage(context.messages, {
          id: 'NCX-001',
          message: 'NCX document must use namespace http://www.daisy.org/z3986/2005/ncx/',
          location: { path: ncxPath },
        });
      }

      this.checkUid(context, root, ncxPath);
      this.checkNavMap(context, root, ncxPath);
      this.checkContentSrc(context, root, ncxPath);
    } finally {
      doc.dispose();
    }
  }

  private checkUid(context: ValidationContext, root: XmlElement, path: string): void {
    const uidMeta = root.get('.//ncx:head/ncx:meta[@name="dtb:uid"]', {
      ncx: 'http://www.daisy.org/z3986/2005/ncx/',
    });

    if (!uidMeta) {
      return;
    }

    const uidElement = uidMeta as XmlElement;
    const uidAttr = uidElement.attr('content');
    const uidContent = uidAttr?.value;

    if (!uidContent || uidContent.trim() === '') {
      const line = uidElement.line;
      pushMessage(context.messages, {
        id: 'NCX-003',
        message: 'NCX dtb:uid meta content should not be empty',
        location: { path, line },
      });
      return;
    }

    context.ncxUid = uidContent.trim();
  }

  private checkNavMap(context: ValidationContext, root: XmlElement, path: string): void {
    const navMapNode = root.get('.//ncx:navMap', { ncx: 'http://www.daisy.org/z3986/2005/ncx/' });

    if (!navMapNode) {
      pushMessage(context.messages, {
        id: 'NCX-001',
        message: 'NCX document must have a navMap element',
        location: { path },
      });
    }
  }

  private checkContentSrc(context: ValidationContext, root: XmlElement, ncxPath: string): void {
    const contentElements = root.find('.//ncx:content[@src]', {
      ncx: 'http://www.daisy.org/z3986/2005/ncx/',
    });

    const ncxDir = ncxPath.includes('/') ? ncxPath.substring(0, ncxPath.lastIndexOf('/')) : '';

    for (const contentElem of contentElements) {
      const srcAttr = (contentElem as XmlElement).attr('src');
      const src = srcAttr?.value;
      if (!src) continue;

      const srcBase = src.split('#')[0] ?? src;

      let fullPath = srcBase;
      if (ncxDir) {
        if (srcBase.startsWith('/')) {
          fullPath = srcBase.slice(1);
        } else {
          const parts = ncxDir.split('/');
          const relParts = srcBase.split('/');
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

      if (
        !context.files.has(fullPath) &&
        !srcBase.startsWith('http://') &&
        !srcBase.startsWith('https://')
      ) {
        const line = contentElem.line;
        pushMessage(context.messages, {
          id: 'NCX-006',
          message: `NCX content src references missing file: ${src}`,
          location: { path: ncxPath, line },
        });
      }
    }
  }
}
