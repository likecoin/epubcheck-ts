/**
 * NCX (Navigation Control XML) validation for EPUB 2.0
 */

import { XmlDocument, type XmlElement } from 'libxml2-wasm';
import { MessageId, pushMessage } from '../messages/index.js';
import { resolvePath, tryDecodeUriComponent } from '../opf/validator.js';
import type { ResourceRegistry } from '../references/registry.js';
import { isRemoteURL } from '../references/url.js';
import type { ValidationContext } from '../types.js';

/**
 * Validator for EPUB 2 NCX navigation documents
 */
export class NCXValidator {
  validate(
    context: ValidationContext,
    ncxContent: string,
    ncxPath: string,
    registry?: ResourceRegistry,
  ): void {
    let doc: XmlDocument | null = null;
    try {
      doc = XmlDocument.fromString(ncxContent);
    } catch (error) {
      if (error instanceof Error) {
        pushMessage(context.messages, {
          id: MessageId.NCX_002,
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
          id: MessageId.RSC_005,
          message: 'NCX document must have ncx as root element',
          location: { path: ncxPath },
        });
        return;
      }

      const ns = root.nsDeclarations[''];
      if (ns !== 'http://www.daisy.org/z3986/2005/ncx/') {
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: 'NCX document must use namespace http://www.daisy.org/z3986/2005/ncx/',
          location: { path: ncxPath },
        });
      }

      this.checkUid(context, root, ncxPath);
      this.checkNavMap(context, root, ncxPath);
      this.checkContentSrc(context, root, ncxPath, registry);
      this.checkEmptyLabels(context, root, ncxPath);
      this.checkPageTargets(context, root, ncxPath);
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
        id: MessageId.NCX_006,
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
        id: MessageId.RSC_005,
        message: 'NCX document must have a navMap element',
        location: { path },
      });
    }
  }

  private checkContentSrc(
    context: ValidationContext,
    root: XmlElement,
    ncxPath: string,
    registry?: ResourceRegistry,
  ): void {
    const contentElements = root.find('.//ncx:content[@src]', {
      ncx: 'http://www.daisy.org/z3986/2005/ncx/',
    });

    const opfPath = context.opfPath ?? '';

    for (const contentElem of contentElements) {
      const srcAttr = (contentElem as XmlElement).attr('src');
      const src = srcAttr?.value;
      if (!src) continue;

      const hashIdx = src.indexOf('#');
      const srcBase = hashIdx >= 0 ? src.substring(0, hashIdx) : src;
      const fragment = hashIdx >= 0 ? src.substring(hashIdx + 1) : '';

      const isRemote = isRemoteURL(srcBase);
      const fullPath = isRemote
        ? srcBase
        : resolvePath(ncxPath, tryDecodeUriComponent(srcBase)).normalize('NFC');

      if (!context.files.has(fullPath) && !isRemote) {
        const line = contentElem.line;
        pushMessage(context.messages, {
          id: MessageId.RSC_007,
          message: `NCX content src references missing file: ${src}`,
          location: { path: ncxPath, line },
        });
      } else if (!isRemote) {
        // RSC-010: NCX content src must reference an OPS content document
        const manifestItem = context.packageDocument?.manifest.find((item) => {
          const itemBase = item.href.split('#')[0] ?? item.href;
          return resolvePath(opfPath, itemBase) === fullPath;
        });
        if (manifestItem && !isOPSMediaType(manifestItem.mediaType)) {
          const line = contentElem.line;
          pushMessage(context.messages, {
            id: MessageId.RSC_010,
            message: `NCX content src references a non-OPS resource: ${src}`,
            location: { path: ncxPath, line },
          });
        }
      }
      if (!isRemote && fragment && registry) {
        // RSC-012: Check that fragment identifier exists in the target document
        if (!registry.hasID(fullPath, fragment)) {
          const line = contentElem.line;
          pushMessage(context.messages, {
            id: MessageId.RSC_012,
            message: `Fragment identifier is not defined`,
            location: { path: ncxPath, line },
          });
        }
      }
    }
  }

  /**
   * NCX-006: navLabel/docTitle/docAuthor text with empty content.
   */
  private checkEmptyLabels(context: ValidationContext, root: XmlElement, ncxPath: string): void {
    const ns = { ncx: 'http://www.daisy.org/z3986/2005/ncx/' };
    const labelTextNodes = root.find(
      './/ncx:navLabel/ncx:text | .//ncx:docTitle/ncx:text | .//ncx:docAuthor/ncx:text',
      ns,
    );
    for (const textElem of labelTextNodes) {
      const textValue = (textElem as XmlElement).content.trim();
      if (textValue === '') {
        const line = textElem.line;
        pushMessage(context.messages, {
          id: MessageId.NCX_006,
          message: 'NCX text element should not be empty',
          location: { path: ncxPath, line },
        });
      }
    }
  }

  /**
   * pageTarget@type must be one of "front", "normal", "special".
   * Reported via RSC-005 to mirror Java Schematron output.
   */
  private checkPageTargets(context: ValidationContext, root: XmlElement, ncxPath: string): void {
    const pageTargets = root.find('.//ncx:pageTarget[@type]', {
      ncx: 'http://www.daisy.org/z3986/2005/ncx/',
    });
    for (const pt of pageTargets) {
      const typeValue = (pt as XmlElement).attr('type')?.value;
      if (typeValue && !PAGE_TARGET_TYPES.has(typeValue)) {
        const line = pt.line;
        pushMessage(context.messages, {
          id: MessageId.RSC_005,
          message: `pageTarget type "${typeValue}" must be one of "front", "normal", or "special"`,
          location: { path: ncxPath, line },
        });
      }
    }
  }
}

const PAGE_TARGET_TYPES = new Set(['front', 'normal', 'special']);

const OPS_MEDIA_TYPES = new Set([
  'application/xhtml+xml',
  'application/x-dtbook+xml',
  'image/svg+xml',
  'text/html',
  'text/x-oeb1-document',
]);

function isOPSMediaType(mediaType: string): boolean {
  return OPS_MEDIA_TYPES.has(mediaType);
}
