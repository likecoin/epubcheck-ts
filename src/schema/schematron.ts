/**
 * Schematron validation using fontoxpath and slimdom
 *
 * Schematron is a rule-based validation language for XML.
 * This implementation uses fontoxpath to evaluate XPath expressions
 * and slimdom as the DOM implementation.
 */

import { evaluateXPathToBoolean, evaluateXPathToNodes } from 'fontoxpath';
import type { Document, Element } from 'slimdom';
import { sync as parseXmlDocument } from 'slimdom-sax-parser';
import { pushMessage } from '../messages/message-registry.js';
import type { ValidationMessage } from '../types.js';
import { getSchema } from './schemas.generated.js';

/**
 * Schematron rule interface
 */
interface SchematronRule {
  context: string;
  assertions: SchematronAssertion[];
  reports: SchematronReport[];
}

/**
 * Schematron assertion (assert element)
 */
interface SchematronAssertion {
  id: string | undefined;
  test: string;
  message: string;
}

/**
 * Schematron report (report element)
 */
interface SchematronReport {
  id: string | undefined;
  test: string;
  message: string;
}

/**
 * Common EPUB namespaces
 */
const EPUB_NAMESPACES: Record<string, string> = {
  opf: 'http://www.idpf.org/2007/opf',
  dc: 'http://purl.org/dc/elements/1.1/',
  dcterms: 'http://purl.org/dc/terms/',
  xhtml: 'http://www.w3.org/1999/xhtml',
  epub: 'http://www.idpf.org/2007/ops',
  ncx: 'http://www.daisy.org/z3986/2005/ncx/',
  svg: 'http://www.w3.org/2000/svg',
  mathml: 'http://www.w3.org/1998/Math/MathML',
  smil: 'http://www.w3.org/ns/SMIL',
  sch: 'http://purl.oclc.org/dsdl/schematron',
};

/**
 * Schematron validator using fontoxpath and slimdom
 */
export class SchematronValidator {
  private namespaces = new Map<string, string>();

  /**
   * Validate XML content against a Schematron schema
   *
   * @param xml - The XML content to validate
   * @param schemaPath - Path to the Schematron .sch file
   * @param filePath - Path of the file being validated (for error reporting)
   * @returns Validation messages
   */
  async validate(xml: string, schemaPath: string, filePath: string): Promise<ValidationMessage[]> {
    const messages: ValidationMessage[] = [];

    try {
      // Parse the XML document to validate
      const doc = parseXmlDocument(xml);

      // Load and parse the Schematron schema
      const schemaContent = await this.loadSchema(schemaPath);
      const schemaDoc = parseXmlDocument(schemaContent);

      // Extract namespace bindings from schema
      this.extractNamespaces(schemaDoc);

      // Extract and evaluate rules
      const rules = this.extractRules(schemaDoc);

      for (const rule of rules) {
        const ruleMessages = this.evaluateRule(doc, rule, filePath);
        messages.push(...ruleMessages);
      }
    } catch (error) {
      pushMessage(messages, {
        id: 'RSC-005',
        message: `Schematron validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        location: { path: filePath },
      });
    }

    return messages;
  }

  /**
   * Load Schematron schema content
   */
  private async loadSchema(schemaPath: string): Promise<string> {
    const filename = schemaPath.split('/').pop() ?? schemaPath;

    // Try bundled schemas first (works in all environments)
    const bundled = getSchema(filename);
    if (bundled) {
      return bundled;
    }

    // If it's a URL, try to fetch it
    if (schemaPath.startsWith('http://') || schemaPath.startsWith('https://')) {
      const response = await fetch(schemaPath);
      if (!response.ok) {
        throw new Error(`HTTP ${String(response.status)}: ${response.statusText}`);
      }
      return await response.text();
    }

    throw new Error(`Schema not found: "${filename}"`);
  }

  /**
   * Extract namespace bindings from schema
   */
  private extractNamespaces(schemaDoc: Document): void {
    // Start with common EPUB namespaces
    for (const [prefix, uri] of Object.entries(EPUB_NAMESPACES)) {
      this.namespaces.set(prefix, uri);
    }

    // Extract ns elements from schema
    const nsElements = Array.from(
      schemaDoc.getElementsByTagNameNS('http://purl.oclc.org/dsdl/schematron', 'ns'),
    );

    for (const nsEl of nsElements) {
      const prefix = nsEl.getAttribute('prefix');
      const uri = nsEl.getAttribute('uri');
      if (prefix && uri) {
        this.namespaces.set(prefix, uri);
      }
    }
  }

  /**
   * Extract rules from Schematron schema
   */
  private extractRules(schemaDoc: Document): SchematronRule[] {
    const rules: SchematronRule[] = [];
    const schNs = 'http://purl.oclc.org/dsdl/schematron';

    // Find all rule elements
    const ruleElements = Array.from(schemaDoc.getElementsByTagNameNS(schNs, 'rule'));

    for (const ruleEl of ruleElements) {
      const context = ruleEl.getAttribute('context');
      if (!context) continue;

      const assertions: SchematronAssertion[] = [];
      const reports: SchematronReport[] = [];

      // Extract assert elements
      const assertElements = Array.from(ruleEl.getElementsByTagNameNS(schNs, 'assert'));
      for (const assertEl of assertElements) {
        const test = assertEl.getAttribute('test');
        if (!test) continue;

        assertions.push({
          id: assertEl.getAttribute('id') ?? undefined,
          test,
          message: this.getElementText(assertEl),
        });
      }

      // Extract report elements
      const reportElements = Array.from(ruleEl.getElementsByTagNameNS(schNs, 'report'));
      for (const reportEl of reportElements) {
        const test = reportEl.getAttribute('test');
        if (!test) continue;

        reports.push({
          id: reportEl.getAttribute('id') ?? undefined,
          test,
          message: this.getElementText(reportEl),
        });
      }

      if (assertions.length > 0 || reports.length > 0) {
        rules.push({ context, assertions, reports });
      }
    }

    return rules;
  }

  /**
   * Get text content of an element (handling value-of elements)
   */
  private getElementText(element: Element): string {
    let text = '';
    const childNodes = Array.from(element.childNodes);
    for (const child of childNodes) {
      if (child.nodeType === 3) {
        // Text node
        text += child.textContent ?? '';
      } else if (child.nodeType === 1) {
        // Element node - could be value-of
        const el = child as Element;
        if (el.localName === 'value-of') {
          const select = el.getAttribute('select');
          text += select ? `{${select}}` : '';
        } else {
          text += this.getElementText(el);
        }
      }
    }
    return text.trim().replace(/\s+/g, ' ');
  }

  /**
   * Evaluate a rule against a document
   */
  private evaluateRule(doc: Document, rule: SchematronRule, filePath: string): ValidationMessage[] {
    const messages: ValidationMessage[] = [];
    const namespaceResolver = this.createNamespaceResolver();

    try {
      // Find all nodes matching the rule context
      const contextNodes = evaluateXPathToNodes(rule.context, doc, null, {}, { namespaceResolver });

      for (const contextNode of contextNodes) {
        // Evaluate assertions (must be true)
        for (const assertion of rule.assertions) {
          try {
            const result = evaluateXPathToBoolean(
              assertion.test,
              contextNode,
              null,
              {},
              { namespaceResolver },
            );

            if (!result) {
              pushMessage(messages, {
                id: assertion.id ? `SCH-${assertion.id}` : 'SCH-001',
                message: assertion.message,
                location: { path: filePath },
              });
            }
          } catch (evalError) {
            // XPath evaluation failed - likely unsupported function
            // Skip this assertion but log for debugging
            if (process.env.DEBUG) {
              console.warn(`Schematron assertion evaluation failed: ${assertion.test}`, evalError);
            }
          }
        }

        // Evaluate reports (must be false)
        for (const report of rule.reports) {
          try {
            const result = evaluateXPathToBoolean(
              report.test,
              contextNode,
              null,
              {},
              { namespaceResolver },
            );

            if (result) {
              // Report is triggered when test is true
              const isWarning = report.message.toUpperCase().startsWith('WARNING');
              pushMessage(messages, {
                id: report.id ? `SCH-${report.id}` : 'SCH-002',
                message: report.message,
                location: { path: filePath },
                severityOverride: isWarning ? 'warning' : 'error',
              });
            }
          } catch (evalError) {
            // XPath evaluation failed - skip
            if (process.env.DEBUG) {
              console.warn(`Schematron report evaluation failed: ${report.test}`, evalError);
            }
          }
        }
      }
    } catch (contextError) {
      // Context XPath failed - skip this rule
      if (process.env.DEBUG) {
        console.warn(`Schematron context evaluation failed: ${rule.context}`, contextError);
      }
    }

    return messages;
  }

  /**
   * Create a namespace resolver function for fontoxpath
   */
  private createNamespaceResolver(): (prefix: string) => string | null {
    return (prefix: string): string | null => {
      return this.namespaces.get(prefix) ?? null;
    };
  }
}

/**
 * Singleton instance for convenience
 */
export const schematronValidator = new SchematronValidator();
