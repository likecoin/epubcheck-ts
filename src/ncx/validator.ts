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
   * Check for uid element and validate it
   */
  private checkUid(context: ValidationContext, root: XmlElement, path: string): void {
    const uidNode = root.get('.//ncx:uid', { ncx: 'http://www.daisy.org/z3986/2005/ncx/' });

    if (!uidNode) {
      context.messages.push({
        id: 'NCX-001',
        severity: 'error',
        message: 'NCX document must have a uid element',
        location: { path },
      });
      return;
    }

    // Get text content from uid element
    let uidText: string | null = null;
    try {
      const uidElement = uidNode as XmlElement;
      uidText = uidElement.toString();
    } catch {
      uidText = null;
    }

    if (!uidText || uidText.trim() === '') {
      context.messages.push({
        id: 'NCX-001',
        severity: 'error',
        message: 'NCX uid element must not be empty',
        location: { path },
      });
      return;
    }

    // Check uid has no extra whitespace
    if (uidText !== uidText.trim()) {
      context.messages.push({
        id: 'NCX-004',
        severity: 'warning',
        message: 'NCX uid element should not contain leading or trailing whitespace',
        location: { path },
      });
    }

    // Store uid in context for comparison with OPF
    context.ncxUid = uidText.trim();
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
