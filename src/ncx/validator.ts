/**
 * NCX (Navigation Control XML) validation for EPUB 2.0
 */

import { XmlDocument, type XmlElement } from 'libxml2-wasm';
import type { ValidationContext } from '../types.js';

/**
 * Validator for EPUB 2 NCX navigation documents
 */
export class NCXValidator {
  /**
   * Validate NCX document
   */
  validate(context: ValidationContext, ncxContent: string, ncxPath: string): void {
    // Parse NCX with libxml2-wasm for structure validation
    let doc: XmlDocument | null = null;
    try {
      doc = XmlDocument.fromString(ncxContent);
    } catch (error) {
      if (error instanceof Error) {
        context.messages.push({
          id: 'NCX-002',
          severity: 'error',
          message: `NCX document is not well-formed: ${error.message}`,
          location: { path: ncxPath },
        });
      }
      return;
    }

    try {
      const root = doc.root;

      // Check for correct root element and namespace
      if (root.name !== 'ncx') {
        context.messages.push({
          id: 'NCX-001',
          severity: 'error',
          message: 'NCX document must have ncx as root element',
          location: { path: ncxPath },
        });
        return;
      }

      const ns = root.nsDeclarations[''];
      if (ns !== 'http://www.daisy.org/z3986/2005/ncx/') {
        context.messages.push({
          id: 'NCX-001',
          severity: 'error',
          message: 'NCX document must use namespace http://www.daisy.org/z3986/2005/ncx/',
          location: { path: ncxPath },
        });
      }

      // Check for uid element (unique identifier)
      this.checkUid(context, root, ncxPath);

      // Check for navMap element
      this.checkNavMap(context, root, ncxPath);
    } finally {
      doc.dispose();
    }
  }

  /**
   * Check for dtb:uid meta element and validate it
   * Note: dtb:uid is recommended but not strictly required by the NCX spec.
   * The original epubcheck does not report an error if it's missing.
   */
  private checkUid(context: ValidationContext, root: XmlElement, path: string): void {
    // Look for <meta name="dtb:uid" content="..."/> in head
    const uidMeta = root.get('.//ncx:head/ncx:meta[@name="dtb:uid"]', {
      ncx: 'http://www.daisy.org/z3986/2005/ncx/',
    });

    if (!uidMeta) {
      // dtb:uid is recommended but not required - don't report an error
      // to match original epubcheck behavior
      return;
    }

    // Get content attribute
    const uidElement = uidMeta as XmlElement;
    const uidAttr = uidElement.attr('content');
    const uidContent = uidAttr?.value;

    if (!uidContent || uidContent.trim() === '') {
      context.messages.push({
        id: 'NCX-003',
        severity: 'warning',
        message: 'NCX dtb:uid meta content should not be empty',
        location: { path },
      });
      return;
    }

    // Store uid in context for comparison with OPF
    context.ncxUid = uidContent.trim();
  }

  /**
   * Check for navMap element
   */
  private checkNavMap(context: ValidationContext, root: XmlElement, path: string): void {
    const navMapNode = root.get('.//ncx:navMap', { ncx: 'http://www.daisy.org/z3986/2005/ncx/' });

    if (!navMapNode) {
      context.messages.push({
        id: 'NCX-001',
        severity: 'error',
        message: 'NCX document must have a navMap element',
        location: { path },
      });
    }
  }
}
